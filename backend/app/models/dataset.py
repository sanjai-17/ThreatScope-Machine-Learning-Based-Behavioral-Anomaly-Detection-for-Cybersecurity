import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database import Base

class DatasetMetadata(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False, default=0)
    total_rows = Column(Integer, nullable=False, default=0)
    total_columns = Column(Integer, nullable=False, default=0)
    columns_json = Column(Text, nullable=False, default="[]")
    dtypes_json = Column(Text, nullable=False, default="{}")
    missing_count_json = Column(Text, nullable=False, default="{}")
    infinite_count_json = Column(Text, nullable=False, default="{}")
    duplicate_rows = Column(Integer, nullable=False, default=0)
    preview_json = Column(Text, nullable=False, default="[]")
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "file_size_bytes": self.file_size_bytes,
            "total_rows": self.total_rows,
            "total_columns": self.total_columns,
            "columns": json.loads(self.columns_json),
            "dtypes": json.loads(self.dtypes_json),
            "missing_counts": json.loads(self.missing_count_json),
            "infinite_counts": json.loads(self.infinite_count_json),
            "duplicate_rows": self.duplicate_rows,
            "preview": json.loads(self.preview_json),
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }
