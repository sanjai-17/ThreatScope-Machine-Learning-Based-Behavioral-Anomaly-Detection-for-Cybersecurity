import pytest
import numpy as np
from pathlib import Path
from app.ml.isolation_forest import ThreatScopeIsolationForest

def test_isolation_forest_training_and_scoring(tmp_path):
    """
    Verifies that:
    1. Isolation Forest trains from scratch.
    2. Continuous anomaly scores are produced (-decision_function).
    3. Binary predictions respect threshold.
    4. Model artifact saves and loads cleanly with identical predictions.
    """
    rng = np.random.default_rng(42)
    # 200 normal training samples
    X_train = rng.normal(loc=0.0, scale=1.0, size=(200, 4))

    # Anomaly test sample (far from distribution)
    X_test_normal = rng.normal(loc=0.0, scale=1.0, size=(10, 4))
    X_test_anomalous = rng.normal(loc=15.0, scale=1.0, size=(5, 4))
    X_test = np.vstack([X_test_normal, X_test_anomalous])

    model = ThreatScopeIsolationForest(
        n_estimators=50,
        contamination=0.05,
        random_state=42
    )
    model.train(X_train)
    assert model.is_trained is True

    # Scores
    scores = model.compute_anomaly_scores(X_test)
    assert len(scores) == 15
    # Anomalous points should have significantly higher anomaly scores than normal points
    normal_mean_score = np.mean(scores[:10])
    anom_mean_score = np.mean(scores[10:])
    assert anom_mean_score > normal_mean_score

    # Binary predictions
    preds, scores_pred = model.predict(X_test, threshold=0.0)
    assert len(preds) == 15
    # The extreme anomalous samples must be flagged
    assert np.all(preds[10:] == 1)

    # Persistence test
    art_path = tmp_path / "test_if_model.joblib"
    model.save(art_path)
    assert art_path.exists()

    loaded_model = ThreatScopeIsolationForest.load(art_path)
    loaded_preds, loaded_scores = loaded_model.predict(X_test, threshold=0.0)

    np.testing.assert_array_equal(preds, loaded_preds)
    np.testing.assert_allclose(scores, loaded_scores, rtol=1e-5)
