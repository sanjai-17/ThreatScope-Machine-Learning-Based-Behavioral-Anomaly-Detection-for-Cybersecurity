from app.routers.datasets import router as datasets_router
from app.routers.models import router as models_router
from app.routers.evaluations import router as evaluations_router
from app.routers.detections import router as detections_router
from app.routers.experiment import router as experiment_router

__all__ = [
    "datasets_router",
    "models_router",
    "evaluations_router",
    "detections_router",
    "experiment_router"
]
