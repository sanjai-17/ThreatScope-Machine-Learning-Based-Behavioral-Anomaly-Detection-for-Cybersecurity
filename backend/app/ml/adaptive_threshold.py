import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List, Optional
from app.ml.metrics import calculate_metrics
from app.ml.isolation_forest import ThreatScopeIsolationForest
from app.ml.preprocessor import NetworkDataPreprocessor
from app.ml.label_mapping import apply_label_mapping

def find_adaptive_threshold_validation(
    val_scores: np.ndarray,
    y_val: np.ndarray,
    objective: str = "f1",
    target_recall: float = 0.85
) -> Tuple[float, str]:
    """
    Selects an anomaly score threshold using VALIDATION data only.
    The selected threshold is frozen before applying to the test set.

    Objectives:
    - 'f1': Maximizes F1-score on the validation dataset.
    - 'precision_at_recall': Maximizes precision on validation data while satisfying recall >= target_recall.
    - 'fpr_min': Minimizes false positive rate on validation data while satisfying recall >= target_recall.
    """
    # Grid of candidate thresholds across validation score quantiles
    quantiles = np.linspace(0.01, 0.99, 100)
    candidate_thresholds = np.quantile(val_scores, quantiles)
    # Include 0.0 standard reference
    candidate_thresholds = np.unique(np.concatenate(([0.0], candidate_thresholds)))

    best_thresh = 0.0
    best_score = -1.0
    rationale = ""

    if objective == "f1":
        for th in candidate_thresholds:
            preds = (val_scores > th).astype(int)
            m = calculate_metrics(y_val, preds)
            if m["f1_score"] > best_score:
                best_score = m["f1_score"]
                best_thresh = float(th)
        rationale = f"Selected threshold {best_thresh:.4f} maximizing validation F1-score ({best_score:.4f})"

    elif objective == "precision_at_recall":
        eligible_candidates = []
        for th in candidate_thresholds:
            preds = (val_scores > th).astype(int)
            m = calculate_metrics(y_val, preds)
            if m["recall"] >= target_recall:
                eligible_candidates.append((th, m["precision"], m["recall"]))

        if eligible_candidates:
            # Sort by highest precision
            eligible_candidates.sort(key=lambda x: x[1], reverse=True)
            best_thresh = float(eligible_candidates[0][0])
            rationale = (
                f"Selected threshold {best_thresh:.4f} achieving highest validation precision "
                f"({eligible_candidates[0][1]:.4f}) with validation recall {eligible_candidates[0][2]:.4f} >= {target_recall}"
            )
        else:
            # Fallback to threshold that gets closest to target recall
            best_diff = float("inf")
            for th in candidate_thresholds:
                preds = (val_scores > th).astype(int)
                m = calculate_metrics(y_val, preds)
                diff = abs(m["recall"] - target_recall)
                if diff < best_diff:
                    best_diff = diff
                    best_thresh = float(th)
            rationale = f"Fallback threshold {best_thresh:.4f} closest to target recall {target_recall}"

    elif objective == "fpr_min":
        eligible_candidates = []
        for th in candidate_thresholds:
            preds = (val_scores > th).astype(int)
            m = calculate_metrics(y_val, preds)
            if m["recall"] >= target_recall:
                eligible_candidates.append((th, m["false_positive_rate"], m["recall"]))

        if eligible_candidates:
            # Sort by lowest FPR
            eligible_candidates.sort(key=lambda x: x[1])
            best_thresh = float(eligible_candidates[0][0])
            rationale = (
                f"Selected threshold {best_thresh:.4f} minimizing validation FPR "
                f"({eligible_candidates[0][1]:.4f}) with validation recall {eligible_candidates[0][2]:.4f} >= {target_recall}"
            )
        else:
            best_thresh = 0.0
            rationale = "Fallback to default 0.0 threshold as target recall could not be met on validation set"

    else:
        best_thresh = 0.0
        rationale = "Default fixed threshold (0.0)"

    return best_thresh, rationale

def run_adaptive_threshold_experiment(
    model: ThreatScopeIsolationForest,
    preprocessor: NetworkDataPreprocessor,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    target_column: str,
    label_mapping: Dict[str, str],
    objective: str = "f1",
    target_recall: float = 0.85,
    fixed_threshold: float = 0.0
) -> Dict[str, Any]:
    """
    Executes the adaptive threshold research experiment:
    1. Preprocesses validation data (using training preprocessor).
    2. Computes validation anomaly scores.
    3. Searches for best threshold on validation data ONLY according to objective.
    4. Freezes the selected adaptive threshold.
    5. Preprocesses test data (using training preprocessor).
    6. Computes test anomaly scores.
    7. Evaluates both Fixed and Adaptive thresholds on the exact same test dataset.
    8. Calculates metric differences and generates comparison report.
    """
    # Prepare Validation Data
    y_val = apply_label_mapping(val_df[target_column], label_mapping)
    X_val_scaled = preprocessor.transform(val_df)
    val_scores = model.compute_anomaly_scores(X_val_scaled)

    # 1. Select threshold on validation set ONLY (no test leakage)
    adaptive_thresh, rationale = find_adaptive_threshold_validation(
        val_scores=val_scores,
        y_val=y_val,
        objective=objective,
        target_recall=target_recall
    )

    # Prepare Test Data
    y_test = apply_label_mapping(test_df[target_column], label_mapping)
    X_test_scaled = preprocessor.transform(test_df)
    test_scores = model.compute_anomaly_scores(X_test_scaled)

    # 2. Evaluate Fixed Threshold on Held-Out Test Data
    fixed_preds = (test_scores > fixed_threshold).astype(int)
    fixed_metrics = calculate_metrics(y_test, fixed_preds)
    fixed_metrics["threshold_used"] = fixed_threshold
    fixed_metrics["threshold_type"] = "fixed"

    # 3. Evaluate Adaptive Threshold on Same Held-Out Test Data
    adaptive_preds = (test_scores > adaptive_thresh).astype(int)
    adaptive_metrics = calculate_metrics(y_test, adaptive_preds)
    adaptive_metrics["threshold_used"] = adaptive_thresh
    adaptive_metrics["threshold_type"] = "adaptive"

    # 4. Compare Metrics
    metrics_to_compare = [
        ("accuracy", "Accuracy (%)", True),
        ("precision", "Precision", True),
        ("recall", "Recall", True),
        ("f1_score", "F1-Score", True),
        ("false_positive_rate", "False-Positive Rate", False),  # Lower FPR is better
    ]

    comparisons = []
    for key, name, higher_is_better in metrics_to_compare:
        fix_val = float(fixed_metrics[key])
        ada_val = float(adaptive_metrics[key])
        diff = round(ada_val - fix_val, 4)
        if higher_is_better:
            improved = diff > 0
        else:
            improved = diff < 0

        comparisons.append({
            "metric_name": name,
            "metric_key": key,
            "fixed_value": fix_val,
            "adaptive_value": ada_val,
            "difference": diff,
            "improvement": improved
        })

    # Summary
    summary = (
        f"Validation-derived threshold: {adaptive_thresh:.4f} vs fixed threshold: {fixed_threshold:.4f}. "
        f"Validation objective: {objective}. {rationale}. "
        f"On held-out test data ({len(y_test)} records), Accuracy shifted by {adaptive_metrics['accuracy'] - fixed_metrics['accuracy']:+.2f}%, "
        f"F1-score shifted by {adaptive_metrics['f1_score'] - fixed_metrics['f1_score']:+.4f}, and "
        f"FPR shifted by {adaptive_metrics['false_positive_rate'] - fixed_metrics['false_positive_rate']:+.4f}."
    )

    return {
        "validation_rows": len(y_val),
        "test_rows": len(y_test),
        "fixed_threshold": fixed_threshold,
        "adaptive_threshold": adaptive_thresh,
        "optimization_objective": objective,
        "rationale": rationale,
        "fixed_metrics": fixed_metrics,
        "adaptive_metrics": adaptive_metrics,
        "comparisons": comparisons,
        "analysis_summary": summary
    }
