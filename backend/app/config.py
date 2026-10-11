import os
from pathlib import Path

# Paths configuration
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

DATA_DIR = PROJECT_ROOT / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
MODELS_DIR = DATA_DIR / "models"
SAMPLE_DATA_DIR = PROJECT_ROOT / "sample_data"
DB_PATH = DATA_DIR / "threatscope.db"

# Ensure directories exist
for p in [DATA_DIR, UPLOADS_DIR, MODELS_DIR, SAMPLE_DATA_DIR]:
    p.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

# Upload Limits & Defaults
MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024  # 100MB
DEFAULT_RANDOM_STATE = 42
DEFAULT_N_ESTIMATORS = 100
DEFAULT_CONTAMINATION = 0.05
PREVIEW_ROWS_COUNT = 20
