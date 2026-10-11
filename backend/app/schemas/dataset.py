from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class DatasetUploadResponse(BaseModel):
    id: int
    filename: str
    file_size_bytes: int
    total_rows: int
    total_columns: int
    columns: List[str]
    dtypes: Dict[str, str]
    missing_counts: Dict[str, int]
    infinite_counts: Dict[str, int]
    duplicate_rows: int
    preview: List[Dict[str, Any]]
    uploaded_at: Optional[str] = None

class DatasetProfileResponse(BaseModel):
    id: int
    filename: str
    total_rows: int
    total_columns: int
    columns: List[str]
    dtypes: Dict[str, str]
    missing_counts: Dict[str, int]
    infinite_counts: Dict[str, int]
    duplicate_rows: int
    summary_stats: Dict[str, Dict[str, Any]]
    suggested_features: List[str]
    potential_label_columns: List[str]

class DatasetPreviewResponse(BaseModel):
    id: int
    filename: str
    total_rows: int
    columns: List[str]
    records: List[Dict[str, Any]]

class LabelValueCount(BaseModel):
    label: str
    count: int
    suggested_mapping: str  # "Normal" or "Attack"
