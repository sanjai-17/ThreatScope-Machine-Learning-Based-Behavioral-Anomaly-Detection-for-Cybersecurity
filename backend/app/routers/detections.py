import io
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import joblib
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import UPLOADS_DIR
from app.models.dataset import DatasetMetadata
from app.models.model_record import TrainedModel
from app.models.detection import DetectionBatch, DetectionItem
from app.schemas.detection import (
    DetectionPredictRequest,
    DetectionBatchResponse,
    DetectionRecordResponse,
    ScoreDistributionResponse,
    AnomalyScoreHistogramBin
)
from app.utils.file_security import validate_and_save_upload
from app.ml.isolation_forest import ThreatScopeIsolationForest
from app.ml.preprocessor import NetworkDataPreprocessor

router = APIRouter(prefix="/api/detection", tags=["Detection"])

@router.post("/predict", response_model=DetectionBatchResponse)
async def predict_anomalies(
    dataset_id: Optional[int] = Query(None),
    threshold: Optional[float] = Query(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Executes anomaly detection on uploaded CSV or existing dataset.
    Uses active Isolation Forest model and its saved preprocessor.
    """
    # 1. Fetch Active Model
    model_rec = db.query(TrainedModel).filter(TrainedModel.is_active == True).first()
    if not model_rec:
        raise HTTPException(status_code=400, detail="No active trained model available for anomaly detection.")

    # 2. Get DataFrame
    if file is not None:
        file_path, _ = validate_and_save_upload(file, UPLOADS_DIR)
        filename = file.filename or file_path.name
        df = pd.read_csv(file_path, low_memory=False)
    elif dataset_id is not None:
        d = db.query(DatasetMetadata).filter(DatasetMetadata.id == dataset_id).first()
        if not d:
            raise HTTPException(status_code=404, detail="Selected dataset not found.")
        file_path = Path(d.file_path)
        filename = d.filename
        df = pd.read_csv(file_path, low_memory=False)
    else:
        raise HTTPException(status_code=400, detail="Must provide either a file upload or a dataset_id.")

    # 3. Load artifacts
    model_path = Path(model_rec.model_artifact_path)
    prep_path = Path(model_rec.preprocessor_artifact_path)
    if not model_path.exists() or not prep_path.exists():
        raise HTTPException(status_code=500, detail="Model artifact files not found.")

    model: ThreatScopeIsolationForest = ThreatScopeIsolationForest.load(model_path)
    preprocessor: NetworkDataPreprocessor = joblib.load(prep_path)

    # 4. Transform features
    try:
        X_scaled = preprocessor.transform(df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Data transformation failed: {str(e)}")

    # 5. Predict
    cutoff = float(threshold) if threshold is not None else 0.0
    binary_preds, anomaly_scores = model.predict(X_scaled, threshold=cutoff)

    normal_count = int(np.sum(binary_preds == 0))
    anomalous_count = int(np.sum(binary_preds == 1))

    # 6. Save Detection Batch
    batch = DetectionBatch(
        model_id=model_rec.id,
        filename=filename,
        total_records=len(df),
        normal_count=normal_count,
        anomalous_count=anomalous_count,
        threshold_used=cutoff,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Save Items in DB (limit storing full feature dictionaries for large sets to avoid DB bloat)
    features_list = json.loads(model_rec.features_json)
    items_to_create = []
    preview_items = []

    for i in range(len(df)):
        is_anom = bool(binary_preds[i] == 1)
        score_val = float(anomaly_scores[i])
        
        # Extract features for row
        row_feat = {f: (float(df.iloc[i][f]) if pd.notna(df.iloc[i][f]) else None) for f in features_list if f in df.columns}
        
        item = DetectionItem(
            batch_id=batch.id,
            row_index=i,
            anomaly_score=score_val,
            is_anomaly=is_anom,
            features_json=json.dumps(row_feat),
        )
        items_to_create.append(item)

        if i < 50:
            preview_items.append(DetectionRecordResponse(
                id=i,
                row_index=i,
                anomaly_score=round(score_val, 5),
                is_anomaly=is_anom,
                status="Anomalous" if is_anom else "Normal",
                features=row_feat
            ))

    db.bulk_save_objects(items_to_create)
    db.commit()

    rate = (anomalous_count / len(df) * 100.0) if len(df) > 0 else 0.0

    return DetectionBatchResponse(
        id=batch.id,
        model_id=model_rec.id,
        model_version=model_rec.version_tag,
        filename=batch.filename,
        total_records=batch.total_records,
        normal_count=batch.normal_count,
        anomalous_count=batch.anomalous_count,
        anomaly_rate_percent=round(rate, 2),
        threshold_used=batch.threshold_used,
        created_at=batch.created_at.isoformat() if batch.created_at else None,
        items_preview=preview_items,
        items_count=len(df)
    )

@router.get("/history", response_model=List[DetectionBatchResponse])
def get_detection_history(db: Session = Depends(get_db)):
    """Returns past detection batch runs."""
    batches = db.query(DetectionBatch).order_by(DetectionBatch.created_at.desc()).all()
    results = []
    for b in batches:
        rate = (b.anomalous_count / b.total_records * 100.0) if b.total_records > 0 else 0.0
        results.append(DetectionBatchResponse(
            id=b.id,
            model_id=b.model_id,
            model_version=b.model.version_tag if b.model else "Unknown",
            filename=b.filename,
            total_records=b.total_records,
            normal_count=b.normal_count,
            anomalous_count=b.anomalous_count,
            anomaly_rate_percent=round(rate, 2),
            threshold_used=b.threshold_used,
            created_at=b.created_at.isoformat() if b.created_at else None,
            items_preview=[],
            items_count=b.total_records
        ))
    return results

@router.get("/batch/{batch_id}/items")
def get_batch_items(
    batch_id: int,
    status_filter: Optional[str] = Query(None, description="'Normal', 'Anomalous', or None"),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort_by: str = Query("row_index", pattern="^(row_index|anomaly_score)$"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """Paginated, filterable, and sortable detection items for the interactive dashboard."""
    q = db.query(DetectionItem).filter(DetectionItem.batch_id == batch_id)

    if status_filter:
        if status_filter.lower() == "anomalous":
            q = q.filter(DetectionItem.is_anomaly == True)
        elif status_filter.lower() == "normal":
            q = q.filter(DetectionItem.is_anomaly == False)

    total_filtered = q.count()

    # Sort
    col = DetectionItem.row_index if sort_by == "row_index" else DetectionItem.anomaly_score
    if sort_dir.lower() == "desc":
        q = q.order_by(col.desc())
    else:
        q = q.order_by(col.asc())

    items = q.offset(skip).limit(limit).all()

    return {
        "batch_id": batch_id,
        "total_filtered": total_filtered,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": it.id,
                "row_index": it.row_index,
                "anomaly_score": round(it.anomaly_score, 5),
                "is_anomaly": it.is_anomaly,
                "status": "Anomalous" if it.is_anomaly else "Normal",
                "features": json.loads(it.features_json)
            }
            for it in items
        ]
    }

@router.get("/batch/{batch_id}/distribution", response_model=ScoreDistributionResponse)
def get_score_distribution(batch_id: int, db: Session = Depends(get_db)):
    """Computes anomaly score histogram distribution for Recharts."""
    batch = db.query(DetectionBatch).filter(DetectionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found.")

    scores = [it.anomaly_score for it in db.query(DetectionItem.anomaly_score).filter(DetectionItem.batch_id == batch_id).all()]
    if not scores:
        return ScoreDistributionResponse(
            batch_id=batch_id,
            min_score=0.0,
            max_score=0.0,
            mean_score=0.0,
            threshold=batch.threshold_used,
            histogram=[]
        )

    scores_arr = np.array(scores)
    min_s = float(scores_arr.min())
    max_s = float(scores_arr.max())
    mean_s = float(scores_arr.mean())

    # Build 15 histogram bins
    n_bins = 15
    counts, bin_edges = np.histogram(scores_arr, bins=n_bins)

    hist_bins = []
    for i in range(len(counts)):
        b_start = float(bin_edges[i])
        b_end = float(bin_edges[i + 1])
        mask = (scores_arr >= b_start) & (scores_arr <= b_end if i == len(counts) - 1 else scores_arr < b_end)
        bin_anom = int(np.sum(mask & (scores_arr > batch.threshold_used)))
        bin_norm = int(counts[i] - bin_anom)
        hist_bins.append(AnomalyScoreHistogramBin(
            bin_start=round(b_start, 4),
            bin_end=round(b_end, 4),
            count=int(counts[i]),
            anomaly_count=bin_anom,
            normal_count=bin_norm
        ))

    return ScoreDistributionResponse(
        batch_id=batch_id,
        min_score=round(min_s, 5),
        max_score=round(max_s, 5),
        mean_score=round(mean_s, 5),
        threshold=round(batch.threshold_used, 5),
        histogram=hist_bins
    )

@router.get("/batch/{batch_id}/export")
def export_batch_csv(batch_id: int, db: Session = Depends(get_db)):
    """Streams full detection predictions with features, scores, and status as a CSV file."""
    batch = db.query(DetectionBatch).filter(DetectionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found.")

    items = db.query(DetectionItem).filter(DetectionItem.batch_id == batch_id).order_by(DetectionItem.row_index.asc()).all()

    # Build CSV rows
    records = []
    for it in items:
        row = {
            "record_id": it.row_index,
            "status": "Anomalous" if it.is_anomaly else "Normal",
            "anomaly_score": round(it.anomaly_score, 6),
            "threshold_used": batch.threshold_used,
            "model_version": batch.model.version_tag if batch.model else "Unknown",
        }
        # Add input features
        feat_dict = json.loads(it.features_json)
        row.update(feat_dict)
        records.append(row)

    df_export = pd.DataFrame(records)
    stream = io.StringIO()
    df_export.to_csv(stream, index=False)
    stream.seek(0)

    filename = f"threatscope_detections_batch_{batch_id}.csv"
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
