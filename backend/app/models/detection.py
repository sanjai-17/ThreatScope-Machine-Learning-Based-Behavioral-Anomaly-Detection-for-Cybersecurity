import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class DetectionBatch(Base):
    __tablename__ = "detection_batches"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("trained_models.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    total_records = Column(Integer, nullable=False, default=0)
    normal_count = Column(Integer, nullable=False, default=0)
    anomalous_count = Column(Integer, nullable=False, default=0)
    threshold_used = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    model = relationship("TrainedModel", back_populates="detection_batches")
    items = relationship("DetectionItem", back_populates="batch", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "model_id": self.model_id,
            "filename": self.filename,
            "total_records": self.total_records,
            "normal_count": self.normal_count,
            "anomalous_count": self.anomalous_count,
            "threshold_used": round(self.threshold_used, 5),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class DetectionItem(Base):
    __tablename__ = "detection_items"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("detection_batches.id"), nullable=False, index=True)
    row_index = Column(Integer, nullable=False)
    anomaly_score = Column(Float, nullable=False)
    is_anomaly = Column(Boolean, nullable=False)
    features_json = Column(Text, nullable=False, default="{}")

    batch = relationship("DetectionBatch", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "batch_id": self.batch_id,
            "row_index": self.row_index,
            "anomaly_score": round(self.anomaly_score, 5),
            "is_anomaly": self.is_anomaly,
            "features": json.loads(self.features_json),
        }
