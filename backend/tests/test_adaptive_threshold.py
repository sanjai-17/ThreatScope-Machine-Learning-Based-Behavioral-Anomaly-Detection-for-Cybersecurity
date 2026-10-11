import pytest
import numpy as np
import pandas as pd
from app.ml.isolation_forest import ThreatScopeIsolationForest
from app.ml.preprocessor import NetworkDataPreprocessor
from app.ml.adaptive_threshold import (
    find_adaptive_threshold_validation,
    run_adaptive_threshold_experiment
)

def test_adaptive_threshold_selection_validation_only():
    """
    Verifies that the adaptive threshold is tuned on validation scores only
    and respects specified objectives (e.g. F1 maximization).
    """
    rng = np.random.default_rng(42)
    # Synthetic validation scores: normals around -0.1, attacks around +0.25
    val_normal_scores = rng.normal(-0.1, 0.05, 100)
    val_attack_scores = rng.normal(0.25, 0.05, 50)
    val_scores = np.concatenate([val_normal_scores, val_attack_scores])
    y_val = np.array([0] * 100 + [1] * 50)

    # 1. Optimize F1
    best_th_f1, desc_f1 = find_adaptive_threshold_validation(val_scores, y_val, objective="f1")
    assert -0.05 < best_th_f1 < 0.20
    assert "F1-score" in desc_f1

    # 2. Precision at Recall
    best_th_prec, desc_prec = find_adaptive_threshold_validation(
        val_scores, y_val, objective="precision_at_recall", target_recall=0.80
    )
    assert isinstance(best_th_prec, float)

def test_run_adaptive_experiment_comparison():
    """
    Ensures that running the experiment produces both fixed and adaptive metrics
    evaluated on the exact same test dataset without data leakage.
    """
    rng = np.random.default_rng(42)
    # Train data
    df_train = pd.DataFrame({
        "featA": rng.normal(0, 1, 100),
        "featB": rng.normal(0, 1, 100),
        "Label": ["Normal"] * 100
    })
    # Validation data
    df_val = pd.DataFrame({
        "featA": np.concatenate([rng.normal(0, 1, 50), rng.normal(4, 1, 20)]),
        "featB": np.concatenate([rng.normal(0, 1, 50), rng.normal(4, 1, 20)]),
        "Label": ["Normal"] * 50 + ["Attack"] * 20
    })
    # Test data
    df_test = pd.DataFrame({
        "featA": np.concatenate([rng.normal(0, 1, 50), rng.normal(4, 1, 25)]),
        "featB": np.concatenate([rng.normal(0, 1, 50), rng.normal(4, 1, 25)]),
        "Label": ["Normal"] * 50 + ["Attack"] * 25
    })

    prep = NetworkDataPreprocessor().fit(df_train, ["featA", "featB"])
    X_train_scaled = prep.transform(df_train)

    model = ThreatScopeIsolationForest(n_estimators=30, random_state=42).train(X_train_scaled)

    mapping = {"Normal": "Normal", "Attack": "Attack"}
    res = run_adaptive_threshold_experiment(
        model=model,
        preprocessor=prep,
        val_df=df_val,
        test_df=df_test,
        target_column="Label",
        label_mapping=mapping,
        objective="f1"
    )

    assert "fixed_metrics" in res
    assert "adaptive_metrics" in res
    assert "comparisons" in res
    assert res["test_rows"] == 75
    assert len(res["comparisons"]) == 5
