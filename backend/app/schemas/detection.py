from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class DetectionPredictRequest(BaseModel):
    model_id: Optional[int] = None
    dataset_id: Optional[int] = None  # Uploaded dataset ID
    threshold: Optional[float] = None # Custom anomaly score threshold override

class DetectionRecordResponse(BaseModel):
    id: int
    row_index: int
    anomaly_score: float
    is_anomaly: bool
    status: str  # "Normal" or "Anomalous"
    features: Dict[str, Any]

class DetectionBatchResponse(BaseModel):
    id: int
    model_id: int
    model_version: str
    filename: str
    total_records: int
    normal_count: int
    anomalous_count: int
    anomaly_rate_percent: float
    threshold_used: float
    created_at: Optional[str]
    items_preview: List[DetectionRecordResponse]
    items_count: int

class AnomalyScoreHistogramBin(BaseModel):
    bin_start: float
    bin_end: float
    count: int
    anomaly_count: int
    normal_count: int

class ScoreDistributionResponse(BaseModel):
    batch_id: int
    min_score: float
    max_score: float
    mean_score: float
    threshold: float
    histogram: List[AnomalyScoreHistogramBin]
