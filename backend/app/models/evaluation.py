import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class EvaluationRecord(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("trained_models.id"), nullable=False, index=True)
    test_dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    dataset_name = Column(String(255), nullable=True)
    
    total_evaluated = Column(Integer, nullable=False, default=0)
    normal_count = Column(Integer, nullable=False, default=0)
    attack_count = Column(Integer, nullable=False, default=0)
    
    true_positives = Column(Integer, nullable=False, default=0)
    true_negatives = Column(Integer, nullable=False, default=0)
    false_positives = Column(Integer, nullable=False, default=0)
    false_negatives = Column(Integer, nullable=False, default=0)
    
    accuracy = Column(Float, nullable=False, default=0.0)             # percentage (0.0 to 100.0)
    precision = Column(Float, nullable=False, default=0.0)            # 0.0 to 1.0
    recall = Column(Float, nullable=False, default=0.0)               # 0.0 to 1.0
    f1_score = Column(Float, nullable=False, default=0.0)             # 0.0 to 1.0
    false_positive_rate = Column(Float, nullable=False, default=0.0)  # 0.0 to 1.0
    
    threshold_used = Column(Float, nullable=False, default=0.0)
    threshold_type = Column(String(32), default="fixed")  # 'fixed' or 'adaptive'
    label_mapping_json = Column(Text, nullable=False, default="{}")
    evaluated_at = Column(DateTime, default=datetime.utcnow)

    model = relationship("TrainedModel", back_populates="evaluations")

    def to_dict(self):
        return {
            "id": self.id,
            "model_id": self.model_id,
            "test_dataset_id": self.test_dataset_id,
            "dataset_name": self.dataset_name,
            "total_evaluated": self.total_evaluated,
            "normal_count": self.normal_count,
            "attack_count": self.attack_count,
            "true_positives": self.true_positives,
            "true_negatives": self.true_negatives,
            "false_positives": self.false_positives,
            "false_negatives": self.false_negatives,
            "confusion_matrix": [
                [self.true_negatives, self.false_positives],
                [self.false_negatives, self.true_positives]
            ],
            "accuracy": round(self.accuracy, 2),
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "f1_score": round(self.f1_score, 4),
            "false_positive_rate": round(self.false_positive_rate, 4),
            "threshold_used": round(self.threshold_used, 5),
            "threshold_type": self.threshold_type,
            "label_mapping": json.loads(self.label_mapping_json),
            "evaluated_at": self.evaluated_at.isoformat() if self.evaluated_at else None,
        }
