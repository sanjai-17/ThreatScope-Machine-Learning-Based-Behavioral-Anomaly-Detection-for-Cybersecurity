import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import UPLOADS_DIR, PREVIEW_ROWS_COUNT, SAMPLE_DATA_DIR
from app.models.dataset import DatasetMetadata
from app.schemas.dataset import (
    DatasetUploadResponse,
    DatasetProfileResponse,
    DatasetPreviewResponse,
    LabelValueCount,
)
from app.utils.file_security import validate_and_save_upload
from app.utils.dataset_generator import populate_sample_datasets
from app.ml.label_mapping import suggest_label_mapping

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

def profile_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    """Computes comprehensive profile: dtypes, missing, infs, duplicates."""
    total_rows, total_cols = df.shape
    cols = list(df.columns)
    
    dtypes = {c: str(df[c].dtype) for c in cols}
    missing = {c: int(df[c].isna().sum()) for c in cols}
    
    # Check infinite counts for numeric columns
    inf_counts = {}
    for c in cols:
        if pd.api.types.is_numeric_dtype(df[c]):
            inf_counts[c] = int(np.isinf(pd.to_numeric(df[c], errors="coerce")).sum())
        else:
            inf_counts[c] = 0

    duplicate_rows = int(df.duplicated().sum())
    
    # Clean preview records for JSON serialization (convert NaN/Inf to None/null)
    preview_df = df.head(PREVIEW_ROWS_COUNT).copy()
    preview_records = json.loads(
        preview_df.replace([np.inf, -np.inf], None).fillna(None).to_json(orient="records")
    )

    return {
        "total_rows": total_rows,
        "total_columns": total_cols,
        "columns": cols,
        "dtypes": dtypes,
        "missing_counts": missing,
        "infinite_counts": inf_counts,
        "duplicate_rows": duplicate_rows,
        "preview": preview_records,
    }

@router.post("/upload", response_model=DatasetUploadResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads a network traffic CSV dataset, performs initial validation,
    profiles records, and saves metadata into SQLite.
    """
    file_path, file_size = validate_and_save_upload(file, UPLOADS_DIR)

    try:
        df = pd.read_csv(file_path, low_memory=False)
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if df.empty or len(df.columns) == 0:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=400, detail="Uploaded CSV dataset is empty.")

    stats = profile_dataframe(df)

    record = DatasetMetadata(
        filename=file.filename or file_path.name,
        file_path=str(file_path),
        file_size_bytes=file_size,
        total_rows=stats["total_rows"],
        total_columns=stats["total_columns"],
        columns_json=json.dumps(stats["columns"]),
        dtypes_json=json.dumps(stats["dtypes"]),
        missing_count_json=json.dumps(stats["missing_counts"]),
        infinite_count_json=json.dumps(stats["infinite_counts"]),
        duplicate_rows=stats["duplicate_rows"],
        preview_json=json.dumps(stats["preview"]),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return record.to_dict()

@router.get("", response_model=List[DatasetUploadResponse])
def list_datasets(db: Session = Depends(get_db)):
    """List all registered datasets."""
    datasets = db.query(DatasetMetadata).order_by(DatasetMetadata.uploaded_at.desc()).all()
    return [d.to_dict() for d in datasets]

@router.get("/{dataset_id}", response_model=DatasetUploadResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Get single dataset metadata."""
    d = db.query(DatasetMetadata).filter(DatasetMetadata.id == dataset_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return d.to_dict()

@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
def get_dataset_preview(
    dataset_id: int,
    limit: int = Query(default=20, ge=5, le=100),
    db: Session = Depends(get_db)
):
    """Returns preview records for a dataset."""
    d = db.query(DatasetMetadata).filter(DatasetMetadata.id == dataset_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    path = Path(d.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Dataset file missing from disk.")

    df = pd.read_csv(path, nrows=limit, low_memory=False)
    records = json.loads(df.replace([np.inf, -np.inf], None).fillna(None).to_json(orient="records"))

    return {
        "id": d.id,
        "filename": d.filename,
        "total_rows": d.total_rows,
        "columns": json.loads(d.columns_json),
        "records": records,
    }

@router.get("/{dataset_id}/profile", response_model=DatasetProfileResponse)
def get_dataset_profile(dataset_id: int, db: Session = Depends(get_db)):
    """
    Computes and returns descriptive statistics, candidate label columns,
    and suggested numerical features for modeling.
    """
    d = db.query(DatasetMetadata).filter(DatasetMetadata.id == dataset_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    path = Path(d.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Dataset file missing from disk.")

    df = pd.read_csv(path, low_memory=False)
    cols = list(df.columns)

    summary_stats = {}
    suggested_features = []
    potential_label_cols = []

    for c in cols:
        col_series = df[c]
        is_num = pd.api.types.is_numeric_dtype(col_series)
        n_unique = col_series.nunique()
        c_lower = str(c).strip().lower()

        # Check if potential label column
        if "label" in c_lower or "attack" in c_lower or "class" in c_lower or "target" in c_lower or n_unique <= 10:
            potential_label_cols.append(c)

        if is_num:
            # Check variance
            clean_num = col_series.replace([np.inf, -np.inf], np.nan).dropna()
            std_val = float(clean_num.std()) if len(clean_num) > 1 else 0.0
            mean_val = float(clean_num.mean()) if len(clean_num) > 0 else 0.0
            min_val = float(clean_num.min()) if len(clean_num) > 0 else 0.0
            max_val = float(clean_num.max()) if len(clean_num) > 0 else 0.0

            summary_stats[c] = {
                "mean": round(mean_val, 2),
                "std": round(std_val, 2),
                "min": round(min_val, 2),
                "max": round(max_val, 2),
                "unique_values": n_unique
            }

            if std_val > 0.0 and n_unique > 1 and "label" not in c_lower and "target" not in c_lower:
                suggested_features.append(c)
        else:
            summary_stats[c] = {
                "unique_values": n_unique,
                "top_value": str(col_series.mode()[0]) if len(col_series.dropna()) > 0 else None
            }

    return {
        "id": d.id,
        "filename": d.filename,
        "total_rows": d.total_rows,
        "total_columns": d.total_columns,
        "columns": cols,
        "dtypes": json.loads(d.dtypes_json),
        "missing_counts": json.loads(d.missing_count_json),
        "infinite_counts": json.loads(d.infinite_count_json),
        "duplicate_rows": d.duplicate_rows,
        "summary_stats": summary_stats,
        "suggested_features": suggested_features,
        "potential_label_columns": potential_label_cols,
    }

@router.get("/{dataset_id}/label-values", response_model=List[LabelValueCount])
def get_label_values(
    dataset_id: int,
    column: str = Query(..., description="Target label column name"),
    db: Session = Depends(get_db)
):
    """
    Returns unique values and suggested mapping for the specified target column.
    """
    d = db.query(DatasetMetadata).filter(DatasetMetadata.id == dataset_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    path = Path(d.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Dataset file missing from disk.")

    df = pd.read_csv(path, usecols=[column], low_memory=False)
    val_counts = df[column].value_counts().to_dict()
    unique_vals = list(val_counts.keys())
    suggested = suggest_label_mapping(unique_vals)

    results = []
    for val, count in val_counts.items():
        val_str = str(val).strip()
        results.append(LabelValueCount(
            label=val_str,
            count=int(count),
            suggested_mapping=suggested.get(val_str, "Attack")
        ))
    return results

@router.post("/generate-sample")
def generate_sample_datasets_endpoint(db: Session = Depends(get_db)):
    """
    Populates standard synthetic cybersecurity test sets
    (CIC-IDS2017 & UNSW-NB15 flow formatted) and registers them automatically.
    """
    populate_sample_datasets(SAMPLE_DATA_DIR)

    files = [
        ("cicids_sample_train.csv", "CIC-IDS2017 Sample Training Dataset"),
        ("cicids_sample_val.csv", "CIC-IDS2017 Sample Validation Dataset"),
        ("cicids_sample_test.csv", "CIC-IDS2017 Sample Held-Out Test Dataset"),
        ("unsw_sample_detect.csv", "UNSW-NB15 Live Flow Capture Dataset"),
    ]

    registered = []
    for fname, label in files:
        fpath = SAMPLE_DATA_DIR / fname
        if not fpath.exists():
            continue

        existing = db.query(DatasetMetadata).filter(DatasetMetadata.filename == fname).first()
        if existing:
            registered.append(existing.to_dict())
            continue

        df = pd.read_csv(fpath)
        stats = profile_dataframe(df)

        meta = DatasetMetadata(
            filename=fname,
            file_path=str(fpath),
            file_size_bytes=fpath.stat().st_size,
            total_rows=stats["total_rows"],
            total_columns=stats["total_columns"],
            columns_json=json.dumps(stats["columns"]),
            dtypes_json=json.dumps(stats["dtypes"]),
            missing_count_json=json.dumps(stats["missing_counts"]),
            infinite_count_json=json.dumps(stats["infinite_counts"]),
            duplicate_rows=stats["duplicate_rows"],
            preview_json=json.dumps(stats["preview"]),
        )
        db.add(meta)
        db.commit()
        db.refresh(meta)
        registered.append(meta.to_dict())

    return {"message": "Sample datasets generated and registered successfully.", "datasets": registered}
