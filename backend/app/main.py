from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import engine, Base, SessionLocal
from app.config import SAMPLE_DATA_DIR
from app.utils.dataset_generator import populate_sample_datasets
from app.routers import (
    datasets_router,
    models_router,
    evaluations_router,
    detections_router,
    experiment_router,
)

# Ensure database tables exist on module load
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    Base.metadata.create_all(bind=engine)
    # Ensure sample datasets exist for immediate user evaluation
    try:
        populate_sample_datasets(SAMPLE_DATA_DIR)
    except Exception as e:
        print(f"Warning initializing sample datasets: {e}")
    yield

app = FastAPI(
    title="ThreatScope API",
    description="Machine Learning-Based Behavioral Anomaly Detection for Cybersecurity using Isolation Forest",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(datasets_router)
app.include_router(models_router)
app.include_router(evaluations_router)
app.include_router(detections_router)
app.include_router(experiment_router)

@app.get("/")
def read_root():
    return {
        "project": "ThreatScope",
        "description": "Behavioral Anomaly Detection for Cybersecurity",
        "algorithm": "Isolation Forest",
        "status": "operational",
        "docs": "/docs"
    }

@app.get("/api/health")
def check_health():
    return {
        "status": "healthy",
        "service": "ThreatScope ML Backend",
        "version": "1.0.0"
    }
