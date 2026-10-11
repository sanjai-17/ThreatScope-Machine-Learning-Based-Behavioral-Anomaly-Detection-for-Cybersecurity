from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ModelTrainRequest(BaseModel):
    dataset_id: int
    features: List[str]
    target_column: Optional[str] = None
    version_tag: Optional[str] = None
    n_estimators: int = Field(default=100, ge=10, le=1000)
    contamination: float = Field(default=0.05, gt=0.0, le=0.5)
    random_state: int = Field(default=42)
    max_samples: str = Field(default="auto")
    train_split_ratio: float = Field(default=0.8, gt=0.1, lt=1.0)

class PreprocessingSummary(BaseModel):
    initial_rows: int
    cleaned_rows: int
    removed_rows: int
    dropped_constant_columns: List[str]
    handled_infinite_count: int
    handled_missing_count: int
    scaler_type: str

class ModelTrainResponse(BaseModel):
    id: int
    version_tag: str
    is_active: bool
    algorithm: str
    dataset_id: Optional[int]
    dataset_name: Optional[str]
    features: List[str]
    feature_count: int
    target_column: Optional[str]
    n_estimators: int
    contamination: float
    random_state: int
    max_samples: str
    training_rows: int
    removed_rows_preprocessing: int
    training_start_time: Optional[str]
    training_end_time: Optional[str]
    training_duration_seconds: float
    preprocessing_meta: Dict[str, Any]
    created_at: Optional[str]

class ModelStatusResponse(BaseModel):
    has_active_model: bool
    active_model: Optional[ModelTrainResponse] = None
    total_models: int
    total_evaluations: int
    total_detections: int
