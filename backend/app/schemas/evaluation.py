from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ModelEvaluateRequest(BaseModel):
    model_id: Optional[int] = None  # None uses active model
    test_dataset_id: int
    target_column: str
    label_mapping: Dict[str, str]   # Raw label value -> "Normal" or "Attack"
    threshold: Optional[float] = None  # If None, use model default threshold (0.0)

class EvaluationMetricsResponse(BaseModel):
    id: int
    model_id: int
    model_version: str
    test_dataset_id: Optional[int]
    dataset_name: Optional[str]
    total_evaluated: int
    normal_count: int
    attack_count: int
    true_positives: int
    true_negatives: int
    false_positives: int
    false_negatives: int
    confusion_matrix: List[List[int]]
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    false_positive_rate: float
    threshold_used: float
    threshold_type: str
    label_mapping: Dict[str, str]
    evaluated_at: Optional[str]

class AdaptiveExperimentRequest(BaseModel):
    model_id: Optional[int] = None
    validation_dataset_id: int
    test_dataset_id: int
    target_column: str
    label_mapping: Dict[str, str]
    target_recall: float = Field(default=0.85, ge=0.5, le=1.0)
    optimization_metric: str = Field(default="f1", pattern="^(f1|precision_at_recall|fpr_min)$")

class ThresholdComparisonResult(BaseModel):
    metric_name: str
    fixed_value: float
    adaptive_value: float
    difference: float
    improvement: bool

class AdaptiveExperimentResponse(BaseModel):
    model_id: int
    model_version: str
    validation_rows: int
    test_rows: int
    fixed_threshold: float
    adaptive_threshold: float
    optimization_objective: str
    fixed_metrics: EvaluationMetricsResponse
    adaptive_metrics: EvaluationMetricsResponse
    comparisons: List[ThresholdComparisonResult]
    analysis_summary: str
