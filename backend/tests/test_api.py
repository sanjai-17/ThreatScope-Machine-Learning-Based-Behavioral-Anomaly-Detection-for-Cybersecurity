import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_api_health():
    with TestClient(app) as client:
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"

def test_api_root():
    with TestClient(app) as client:
        res = client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["project"] == "ThreatScope"
        assert data["algorithm"] == "Isolation Forest"

def test_model_status_endpoint():
    with TestClient(app) as client:
        res = client.get("/api/model/status")
        assert res.status_code == 200
        data = res.json()
        assert "has_active_model" in data

def test_generate_sample_datasets():
    with TestClient(app) as client:
        res = client.post("/api/datasets/generate-sample")
        assert res.status_code == 200
        data = res.json()
        assert "datasets" in data
        assert len(data["datasets"]) >= 3
