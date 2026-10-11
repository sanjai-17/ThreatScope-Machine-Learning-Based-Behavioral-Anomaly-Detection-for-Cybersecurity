import json
from pathlib import Path
from typing import List, Optional
import pandas as pd
import joblib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dataset import DatasetMetadata
from app.models.model_record import TrainedModel
from app.models.evaluation import EvaluationRecord
from app.schemas.evaluation import (
    ModelEvaluateRequest,
    EvaluationMetricsResponse,
)
from app.ml.isolation_forest import ThreatScopeIsolationForest
from app.ml.preprocessor import NetworkDataPreprocessor
from app.ml.label_mapping import apply_label_mapping
from app.ml.metrics import calculate_metrics

router = APIRouter(prefix="/api/evaluation", tags=["Evaluation"])

@router.post("", response_model=EvaluationMetricsResponse)
@router.post("/run", response_model=EvaluationMetricsResponse)
def evaluate_model(
    req: ModelEvaluateRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluates the trained Isolation Forest on a held-out, labeled test dataset.
    Calculates actual accuracy, precision, recall, F1, FPR, and confusion matrix.
    Prevents leakage by applying the training preprocessor without re-fitting.
    """
    # 1. Fetch Model
    if req.model_id:
        model_rec = db.query(TrainedModel).filter(TrainedModel.id == req.model_id).first()
    else:
        model_rec = db.query(TrainedModel).filter(TrainedModel.is_active == True).first()

    if not model_rec:
        raise HTTPException(status_code=400, detail="No active trained model available for evaluation.")

    # 2. Fetch Test Dataset
    dataset = db.query(DatasetMetadata).filter(DatasetMetadata.id == req.test_dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Test dataset not found.")

    test_path = Path(dataset.file_path)
    if not test_path.exists():
        raise HTTPException(status_code=404, detail="Test dataset file missing from disk.")

    df_test = pd.read_csv(test_path, low_memory=False)

    if req.target_column not in df_test.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Target column '{req.target_column}' not found in test dataset columns."
        )

    # 3. Apply explicit label mapping: Normal (0) vs Attack (1)
    try:
        y_true = apply_label_mapping(df_test[req.target_column], req.label_mapping)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Label mapping failed: {str(e)}")

    # 4. Load artifacts: model and preprocessor
    model_art_path = Path(model_rec.model_artifact_path)
    prep_art_path = Path(model_rec.preprocessor_artifact_path)

    if not model_art_path.exists() or not prep_art_path.exists():
        raise HTTPException(status_code=500, detail="Saved model or preprocessor artifact files missing.")

    model: ThreatScopeIsolationForest = ThreatScopeIsolationForest.load(model_art_path)
    preprocessor: NetworkDataPreprocessor = joblib.load(prep_art_path)

    # 5. Transform test features (using fitted preprocessor parameters only)
    try:
        X_test_scaled = preprocessor.transform(df_test)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Test data preprocessing failed: {str(e)}"
        )

    # 6. Predict using Isolation Forest anomaly scores
    cutoff = float(req.threshold) if req.threshold is not None else 0.0
    binary_preds, scores = model.predict(X_test_scaled, threshold=cutoff)

    # 7. Calculate real, un-fabricated metrics
    metrics = calculate_metrics(y_true, binary_preds)

    # 8. Save Evaluation Record
    eval_record = EvaluationRecord(
        model_id=model_rec.id,
        test_dataset_id=dataset.id,
        dataset_name=dataset.filename,
        total_evaluated=metrics["total_evaluated"],
        normal_count=metrics["normal_count"],
        attack_count=metrics["attack_count"],
        true_positives=metrics["true_positives"],
        true_negatives=metrics["true_negatives"],
        false_positives=metrics["false_positives"],
        false_negatives=metrics["false_negatives"],
        accuracy=metrics["accuracy"],
        precision=metrics["precision"],
        recall=metrics["recall"],
        f1_score=metrics["f1_score"],
        false_positive_rate=metrics["false_positive_rate"],
        threshold_used=cutoff,
        threshold_type="custom" if req.threshold is not None else "fixed",
        label_mapping_json=json.dumps(req.label_mapping),
    )
    db.add(eval_record)
    db.commit()
    db.refresh(eval_record)

    resp = eval_record.to_dict()
    resp["model_version"] = model_rec.version_tag
    return resp

@router.get("/latest", response_model=Optional[EvaluationMetricsResponse])
def get_latest_evaluation(db: Session = Depends(get_db)):
    """Returns the most recent verified model evaluation report."""
    eval_rec = db.query(EvaluationRecord).order_by(EvaluationRecord.evaluated_at.desc()).first()
    if not eval_rec:
        return None
    resp = eval_rec.to_dict()
    resp["model_version"] = eval_rec.model.version_tag if eval_rec.model else "Unknown"
    return resp

@router.get("/confusion-matrix")
def get_latest_confusion_matrix(db: Session = Depends(get_db)):
    """Returns confusion matrix and category counts for the latest evaluation."""
    eval_rec = db.query(EvaluationRecord).order_by(EvaluationRecord.evaluated_at.desc()).first()
    if not eval_rec:
        raise HTTPException(status_code=404, detail="No evaluations recorded yet.")

    return {
        "evaluation_id": eval_rec.id,
        "model_version": eval_rec.model.version_tag if eval_rec.model else "Unknown",
        "confusion_matrix": [
            [eval_rec.true_negatives, eval_rec.false_positives],
            [eval_rec.false_negatives, eval_rec.true_positives]
        ],
        "true_negatives": eval_rec.true_negatives,
        "false_positives": eval_rec.false_positives,
        "false_negatives": eval_rec.false_negatives,
        "true_positives": eval_rec.true_positives,
        "accuracy": eval_rec.accuracy,
        "evaluated_at": eval_rec.evaluated_at.isoformat() if eval_rec.evaluated_at else None,
    }

@router.get("/history", response_model=List[EvaluationMetricsResponse])
def get_evaluation_history(
    model_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Returns list of evaluation runs, optionally filtered by model."""
    q = db.query(EvaluationRecord)
    if model_id:
        q = q.filter(EvaluationRecord.model_id == model_id)
    evals = q.order_by(EvaluationRecord.evaluated_at.desc()).all()

    results = []
    for e in evals:
        d = e.to_dict()
        d["model_version"] = e.model.version_tag if e.model else "Unknown"
        results.append(d)
    return results
