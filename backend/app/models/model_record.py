import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class TrainedModel(Base):
    __tablename__ = "trained_models"

    id = Column(Integer, primary_key=True, index=True)
    version_tag = Column(String(64), nullable=False, unique=True, index=True)
    is_active = Column(Boolean, default=True)
    algorithm = Column(String(64), default="IsolationForest", nullable=False)
    
    # Dataset and feature info
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    dataset_name = Column(String(255), nullable=True)
    features_json = Column(Text, nullable=False, default="[]")
    target_column = Column(String(128), nullable=True)
    
    # Hyperparameters
    n_estimators = Column(Integer, default=100)
    contamination = Column(Float, default=0.05)
    random_state = Column(Integer, default=42)
    max_samples = Column(String(32), default="auto")
    
    # Artifact paths
    model_artifact_path = Column(String(512), nullable=False)
    preprocessor_artifact_path = Column(String(512), nullable=False)
    
    # Training statistics
    training_rows = Column(Integer, default=0)
    removed_rows_preprocessing = Column(Integer, default=0)
    training_start_time = Column(DateTime, nullable=True)
    training_end_time = Column(DateTime, nullable=True)
    training_duration_seconds = Column(Float, default=0.0)
    
    # Preprocessing metadata
    preprocessing_meta_json = Column(Text, default="{}")
    
    created_at = Column(DateTime, default=datetime.utcnow)

    evaluations = relationship("EvaluationRecord", back_populates="model", cascade="all, delete-orphan")
    detection_batches = relationship("DetectionBatch", back_populates="model", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "version_tag": self.version_tag,
            "is_active": self.is_active,
            "algorithm": self.algorithm,
            "dataset_id": self.dataset_id,
            "dataset_name": self.dataset_name,
            "features": json.loads(self.features_json),
            "feature_count": len(json.loads(self.features_json)),
            "target_column": self.target_column,
            "n_estimators": self.n_estimators,
            "contamination": self.contamination,
            "random_state": self.random_state,
            "max_samples": self.max_samples,
            "training_rows": self.training_rows,
            "removed_rows_preprocessing": self.removed_rows_preprocessing,
            "training_start_time": self.training_start_time.isoformat() if self.training_start_time else None,
            "training_end_time": self.training_end_time.isoformat() if self.training_end_time else None,
            "training_duration_seconds": round(self.training_duration_seconds, 3) if self.training_duration_seconds else 0.0,
            "preprocessing_meta": json.loads(self.preprocessing_meta_json),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
