import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import joblib

from app.database import get_db
from app.config import MODELS_DIR
from app.models.dataset import DatasetMetadata
from app.models.model_record import TrainedModel
from app.models.evaluation import EvaluationRecord
from app.models.detection import DetectionBatch
from app.schemas.model import (
    ModelTrainRequest,
    ModelTrainResponse,
    ModelStatusResponse,
)
from app.ml.preprocessor import NetworkDataPreprocessor
from app.ml.isolation_forest import ThreatScopeIsolationForest
from app.ml.label_mapping import validate_features_and_label

router = APIRouter(prefix="/api/model", tags=["Model"])

@router.post("/train", response_model=ModelTrainResponse)
def train_model(
    req: ModelTrainRequest,
    db: Session = Depends(get_db)
):
    """
    Trains a new Isolation Forest model from scratch on the uploaded dataset.
    Exclusively uses sklearn Isolation Forest.
    Saves the trained model artifact, fitted preprocessor, and training metadata.
    """
    dataset = db.query(DatasetMetadata).filter(DatasetMetadata.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Selected training dataset not found.")

    data_path = Path(dataset.file_path)
    if not data_path.exists():
        raise HTTPException(status_code=404, detail="Dataset file missing from disk.")

    df = pd.read_csv(data_path, low_memory=False)

    # Validate and exclude target/label from features
    selected_features = validate_features_and_label(req.features, req.target_column)
    if not selected_features:
        raise HTTPException(status_code=400, detail="No valid feature columns provided for training.")

    missing_cols = [c for c in selected_features if c not in df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Columns missing from dataset: {missing_cols}")

    start_time = datetime.utcnow()
    t0 = time.time()

    # Preprocessing: Fit on training data only
    preprocessor = NetworkDataPreprocessor()
    try:
        X_train_scaled = preprocessor.fit_transform(df, selected_features)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Data preprocessing failed: {str(e)}")

    # Initialize Isolation Forest
    model = ThreatScopeIsolationForest(
        n_estimators=req.n_estimators,
        contamination=req.contamination,
        random_state=req.random_state,
        max_samples=req.max_samples
    )

    try:
        model.train(X_train_scaled)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Isolation Forest training failed: {str(e)}")

    t1 = time.time()
    end_time = datetime.utcnow()
    duration = t1 - t0

    # Generate version tag
    if req.version_tag:
        version_tag = req.version_tag.strip()
    else:
        existing_count = db.query(TrainedModel).count()
        version_tag = f"ThreatScope-IF-v{existing_count + 1}"

    # Verify version tag uniqueness
    duplicate_tag = db.query(TrainedModel).filter(TrainedModel.version_tag == version_tag).first()
    if duplicate_tag:
        version_tag = f"{version_tag}-{int(time.time())}"

    # Save artifacts (.joblib)
    model_artifact_file = MODELS_DIR / f"{version_tag}_model.joblib"
    preprocessor_artifact_file = MODELS_DIR / f"{version_tag}_preprocessor.joblib"

    model.save(model_artifact_file)
    joblib.dump(preprocessor, preprocessor_artifact_file)

    # Deactivate previous active models
    db.query(TrainedModel).update({TrainedModel.is_active: False})

    trained_record = TrainedModel(
        version_tag=version_tag,
        is_active=True,
        algorithm="IsolationForest",
        dataset_id=dataset.id,
        dataset_name=dataset.filename,
        features_json=json.dumps(selected_features),
        target_column=req.target_column,
        n_estimators=req.n_estimators,
        contamination=req.contamination,
        random_state=req.random_state,
        max_samples=str(req.max_samples),
        model_artifact_path=str(model_artifact_file),
        preprocessor_artifact_path=str(preprocessor_artifact_file),
        training_rows=len(X_train_scaled),
        removed_rows_preprocessing=len(df) - len(X_train_scaled),
        training_start_time=start_time,
        training_end_time=end_time,
        training_duration_seconds=duration,
        preprocessing_meta_json=json.dumps(preprocessor.metadata),
    )
    db.add(trained_record)
    db.commit()
    db.refresh(trained_record)

    return trained_record.to_dict()

@router.get("/status", response_model=ModelStatusResponse)
def get_model_status(db: Session = Depends(get_db)):
    """Returns current active model and system metrics."""
    active_model = db.query(TrainedModel).filter(TrainedModel.is_active == True).first()
    total_models = db.query(TrainedModel).count()
    total_evals = db.query(EvaluationRecord).count()
    total_detections = db.query(DetectionBatch).count()

    return {
        "has_active_model": active_model is not None,
        "active_model": active_model.to_dict() if active_model else None,
        "total_models": total_models,
        "total_evaluations": total_evals,
        "total_detections": total_detections,
    }

@router.get("/history", response_model=List[ModelTrainResponse])
def get_model_history(db: Session = Depends(get_db)):
    """Returns all trained model versions."""
    models = db.query(TrainedModel).order_by(TrainedModel.created_at.desc()).all()
    return [m.to_dict() for m in models]

@router.post("/{model_id}/activate", response_model=ModelTrainResponse)
def activate_model(model_id: int, db: Session = Depends(get_db)):
    """Activates a specific model version for evaluation and detection."""
    model = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found.")

    db.query(TrainedModel).update({TrainedModel.is_active: False})
    model.is_active = True
    db.commit()
    db.refresh(model)
    return model.to_dict()
