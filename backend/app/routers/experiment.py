import json
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
import joblib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dataset import DatasetMetadata
from app.models.model_record import TrainedModel
from app.schemas.evaluation import (
    AdaptiveExperimentRequest,
    AdaptiveExperimentResponse,
    ThresholdComparisonResult,
    EvaluationMetricsResponse,
)
from app.ml.isolation_forest import ThreatScopeIsolationForest
from app.ml.preprocessor import NetworkDataPreprocessor
from app.ml.adaptive_threshold import run_adaptive_threshold_experiment

router = APIRouter(prefix="/api/experiment", tags=["Experiment"])

@router.post("/adaptive-threshold", response_model=AdaptiveExperimentResponse)
def execute_adaptive_threshold_experiment(
    req: AdaptiveExperimentRequest,
    db: Session = Depends(get_db)
):
    """
    Executes the Adaptive Threshold Selection Experiment:
    1. Selects an optimal threshold on the VALIDATION dataset only according to objective.
    2. Freezes the selected threshold.
    3. Evaluates both Fixed (0.0) and Adaptive thresholds on the separate TEST dataset.
    4. Compares Accuracy, Precision, Recall, F1, and FPR to assess empirical performance.
    """
    # 1. Fetch Model
    if req.model_id:
        model_rec = db.query(TrainedModel).filter(TrainedModel.id == req.model_id).first()
    else:
        model_rec = db.query(TrainedModel).filter(TrainedModel.is_active == True).first()

    if not model_rec:
        raise HTTPException(status_code=400, detail="No active trained model available for experiment.")

    # 2. Fetch Validation & Test Datasets
    val_dataset = db.query(DatasetMetadata).filter(DatasetMetadata.id == req.validation_dataset_id).first()
    test_dataset = db.query(DatasetMetadata).filter(DatasetMetadata.id == req.test_dataset_id).first()

    if not val_dataset or not test_dataset:
        raise HTTPException(status_code=404, detail="Validation or Test dataset not found.")

    val_path = Path(val_dataset.file_path)
    test_path = Path(test_dataset.file_path)

    if not val_path.exists() or not test_path.exists():
        raise HTTPException(status_code=404, detail="Dataset files missing from disk.")

    df_val = pd.read_csv(val_path, low_memory=False)
    df_test = pd.read_csv(test_path, low_memory=False)

    if req.target_column not in df_val.columns or req.target_column not in df_test.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Target column '{req.target_column}' missing from validation or test dataset."
        )

    # 3. Load artifacts
    model_art_path = Path(model_rec.model_artifact_path)
    prep_art_path = Path(model_rec.preprocessor_artifact_path)

    if not model_art_path.exists() or not prep_art_path.exists():
        raise HTTPException(status_code=500, detail="Model artifact files missing on server.")

    model: ThreatScopeIsolationForest = ThreatScopeIsolationForest.load(model_art_path)
    preprocessor: NetworkDataPreprocessor = joblib.load(prep_art_path)

    # 4. Run Experiment
    try:
        exp_result = run_adaptive_threshold_experiment(
            model=model,
            preprocessor=preprocessor,
            val_df=df_val,
            test_df=df_test,
            target_column=req.target_column,
            label_mapping=req.label_mapping,
            objective=req.optimization_metric,
            target_recall=req.target_recall,
            fixed_threshold=0.0
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Adaptive threshold experiment failed: {str(e)}")

    fixed_m = exp_result["fixed_metrics"]
    ada_m = exp_result["adaptive_metrics"]

    fixed_resp = EvaluationMetricsResponse(
        id=0,
        model_id=model_rec.id,
        model_version=model_rec.version_tag,
        test_dataset_id=test_dataset.id,
        dataset_name=test_dataset.filename,
        total_evaluated=fixed_m["total_evaluated"],
        normal_count=fixed_m["normal_count"],
        attack_count=fixed_m["attack_count"],
        true_positives=fixed_m["true_positives"],
        true_negatives=fixed_m["true_negatives"],
        false_positives=fixed_m["false_positives"],
        false_negatives=fixed_m["false_negatives"],
        confusion_matrix=fixed_m["confusion_matrix"],
        accuracy=fixed_m["accuracy"],
        precision=fixed_m["precision"],
        recall=fixed_m["recall"],
        f1_score=fixed_m["f1_score"],
        false_positive_rate=fixed_m["false_positive_rate"],
        threshold_used=fixed_m["threshold_used"],
        threshold_type="fixed",
        label_mapping=req.label_mapping,
        evaluated_at=None
    )

    ada_resp = EvaluationMetricsResponse(
        id=0,
        model_id=model_rec.id,
        model_version=model_rec.version_tag,
        test_dataset_id=test_dataset.id,
        dataset_name=test_dataset.filename,
        total_evaluated=ada_m["total_evaluated"],
        normal_count=ada_m["normal_count"],
        attack_count=ada_m["attack_count"],
        true_positives=ada_m["true_positives"],
        true_negatives=ada_m["true_negatives"],
        false_positives=ada_m["false_positives"],
        false_negatives=ada_m["false_negatives"],
        confusion_matrix=ada_m["confusion_matrix"],
        accuracy=ada_m["accuracy"],
        precision=ada_m["precision"],
        recall=ada_m["recall"],
        f1_score=ada_m["f1_score"],
        false_positive_rate=ada_m["false_positive_rate"],
        threshold_used=ada_m["threshold_used"],
        threshold_type="adaptive",
        label_mapping=req.label_mapping,
        evaluated_at=None
    )

    comp_items = [
        ThresholdComparisonResult(
            metric_name=c["metric_name"],
            fixed_value=c["fixed_value"],
            adaptive_value=c["adaptive_value"],
            difference=c["difference"],
            improvement=c["improvement"]
        )
        for c in exp_result["comparisons"]
    ]

    return AdaptiveExperimentResponse(
        model_id=model_rec.id,
        model_version=model_rec.version_tag,
        validation_rows=exp_result["validation_rows"],
        test_rows=exp_result["test_rows"],
        fixed_threshold=exp_result["fixed_threshold"],
        adaptive_threshold=exp_result["adaptive_threshold"],
        optimization_objective=exp_result["optimization_objective"],
        fixed_metrics=fixed_resp,
        adaptive_metrics=ada_resp,
        comparisons=comp_items,
        analysis_summary=exp_result["analysis_summary"]
    )
