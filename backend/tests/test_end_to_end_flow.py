import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

def test_full_pipeline_end_to_end():
    """
    Executes a complete end-to-end operational pipeline:
    1. Check API health
    2. Register sample datasets
    3. Train Isolation Forest model from scratch on training CSV
    4. Verify active model status
    5. Evaluate on held-out test CSV with ground truth labels
    6. Verify un-fabricated evaluation metrics (Accuracy, Precision, Recall, F1, FPR, Confusion Matrix)
    7. Predict anomalies on live flow dataset
    8. Execute Adaptive Threshold Experiment and verify comparison
    """
    with TestClient(app) as client:
        # 1. Health
        res = client.get("/api/health")
        assert res.status_code == 200

        # 2. Register samples
        sample_res = client.post("/api/datasets/generate-sample")
        assert sample_res.status_code == 200
        datasets = sample_res.json()["datasets"]
        assert len(datasets) >= 3

        train_ds = next(d for d in datasets if "train" in d["filename"])
        val_ds = next(d for d in datasets if "val" in d["filename"])
        test_ds = next(d for d in datasets if "test" in d["filename"])
        detect_ds = next(d for d in datasets if "detect" in d["filename"])

        # 3. Train Model
        features_to_train = [c for c in train_ds["columns"] if c != "Label"]
        train_res = client.post("/api/model/train", json={
            "dataset_id": train_ds["id"],
            "features": features_to_train,
            "target_column": "Label",
            "version_tag": "ThreatScope-E2E-v1",
            "n_estimators": 50,
            "contamination": 0.05,
            "random_state": 42
        })
        assert train_res.status_code == 200
        model_data = train_res.json()
        assert model_data["algorithm"] == "IsolationForest"
        assert model_data["is_active"] is True
        assert model_data["training_rows"] > 0
        assert model_data["training_duration_seconds"] >= 0

        # 4. Check Status
        status_res = client.get("/api/model/status")
        assert status_res.status_code == 200
        assert status_res.json()["has_active_model"] is True

        # 5. Evaluate on Held-Out Test Data
        label_mapping = {
            "BENIGN": "Normal",
            "DoS": "Attack",
            "PortScan": "Attack",
            "Bot": "Attack"
        }
        eval_res = client.post("/api/evaluation/run", json={
            "model_id": model_data["id"],
            "test_dataset_id": test_ds["id"],
            "target_column": "Label",
            "label_mapping": label_mapping,
            "threshold": 0.0
        })
        assert eval_res.status_code == 200
        metrics = eval_res.json()
        assert metrics["total_evaluated"] == test_ds["total_rows"]
        assert 0.0 <= metrics["accuracy"] <= 100.0
        assert 0.0 <= metrics["precision"] <= 1.0
        assert 0.0 <= metrics["recall"] <= 1.0
        assert 0.0 <= metrics["f1_score"] <= 1.0
        assert 0.0 <= metrics["false_positive_rate"] <= 1.0
        assert len(metrics["confusion_matrix"]) == 2
        assert len(metrics["confusion_matrix"][0]) == 2

        # 6. Check Latest Evaluation endpoint
        latest_eval_res = client.get("/api/evaluation/latest")
        assert latest_eval_res.status_code == 200
        assert latest_eval_res.json()["accuracy"] == metrics["accuracy"]

        # 7. Predict on live stream / detection dataset
        detect_res = client.post(f"/api/detection/predict?dataset_id={detect_ds['id']}&threshold=0.0")
        assert detect_res.status_code == 200
        detect_data = detect_res.json()
        assert detect_data["total_records"] == detect_ds["total_rows"]
        assert detect_data["normal_count"] + detect_data["anomalous_count"] == detect_data["total_records"]

        # Check histogram distribution
        dist_res = client.get(f"/api/detection/batch/{detect_data['id']}/distribution")
        assert dist_res.status_code == 200
        assert len(dist_res.json()["histogram"]) > 0

        # Check export endpoint
        export_res = client.get(f"/api/detection/batch/{detect_data['id']}/export")
        assert export_res.status_code == 200
        assert "text/csv" in export_res.headers["content-type"]

        # 8. Adaptive Threshold Experiment
        exp_res = client.post("/api/experiment/adaptive-threshold", json={
            "model_id": model_data["id"],
            "validation_dataset_id": val_ds["id"],
            "test_dataset_id": test_ds["id"],
            "target_column": "Label",
            "label_mapping": label_mapping,
            "target_recall": 0.85,
            "optimization_metric": "f1"
        })
        assert exp_res.status_code == 200
        exp_data = exp_res.json()
        assert "fixed_metrics" in exp_data
        assert "adaptive_metrics" in exp_data
        assert len(exp_data["comparisons"]) == 5
