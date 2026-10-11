import pytest
import numpy as np
from app.ml.metrics import calculate_metrics

def test_manual_known_evaluation_metrics():
    """
    Verifies evaluation metrics using a small, manually constructed test case
    with known exact ground-truth values:
    
    Ground Truth y_true: [1, 1, 1, 0, 0, 0, 0, 1, 0, 1] (5 Attacks, 5 Normal)
    Predictions  y_pred: [1, 1, 0, 0, 0, 1, 0, 1, 0, 0] 
    
    Breakdown:
    Index 0: true=1, pred=1 -> TP
    Index 1: true=1, pred=1 -> TP
    Index 2: true=1, pred=0 -> FN (Missed attack)
    Index 3: true=0, pred=0 -> TN
    Index 4: true=0, pred=0 -> TN
    Index 5: true=0, pred=1 -> FP (False alarm)
    Index 6: true=0, pred=0 -> TN
    Index 7: true=1, pred=1 -> TP
    Index 8: true=0, pred=0 -> TN
    Index 9: true=1, pred=0 -> FN (Missed attack)
    
    Expected Counts:
    Total = 10
    TP = 3
    TN = 4
    FP = 1
    FN = 2
    
    Expected Calculations:
    Accuracy = (TP + TN) / Total * 100 = (3 + 4) / 10 * 100 = 70.0%
    Precision = TP / (TP + FP) = 3 / (3 + 1) = 3 / 4 = 0.75
    Recall = TP / (TP + FN) = 3 / (3 + 2) = 3 / 5 = 0.60
    F1-Score = 2 * (0.75 * 0.60) / (0.75 + 0.60) = 0.90 / 1.35 = 0.6667
    False-Positive Rate = FP / (FP + TN) = 1 / (1 + 4) = 1 / 5 = 0.20
    
    Confusion Matrix:
    [[TN, FP],
     [FN, TP]] -> [[4, 1], [2, 3]]
    """
    y_true = np.array([1, 1, 1, 0, 0, 0, 0, 1, 0, 1])
    y_pred = np.array([1, 1, 0, 0, 0, 1, 0, 1, 0, 0])

    metrics = calculate_metrics(y_true, y_pred)

    assert metrics["total_evaluated"] == 10
    assert metrics["true_positives"] == 3
    assert metrics["true_negatives"] == 4
    assert metrics["false_positives"] == 1
    assert metrics["false_negatives"] == 2
    assert metrics["normal_count"] == 5
    assert metrics["attack_count"] == 5

    assert pytest.approx(metrics["accuracy"], 0.01) == 70.0
    assert pytest.approx(metrics["precision"], 0.01) == 0.75
    assert pytest.approx(metrics["recall"], 0.01) == 0.60
    assert pytest.approx(metrics["f1_score"], 0.001) == 0.6667
    assert pytest.approx(metrics["false_positive_rate"], 0.01) == 0.20

    # Test exact confusion matrix ordering
    cm = metrics["confusion_matrix"]
    assert cm[0][0] == 4  # TN
    assert cm[0][1] == 1  # FP
    assert cm[1][0] == 2  # FN
    assert cm[1][1] == 3  # TP

def test_division_by_zero_handling():
    """
    Tests edge cases where denominators are zero:
    1. No predicted anomalies (TP + FP = 0)
    2. No actual attacks (TP + FN = 0)
    3. Empty evaluation array
    """
    # Case 1: All predicted normal (0)
    y_true = np.array([0, 0, 1, 1])
    y_pred = np.array([0, 0, 0, 0])
    m1 = calculate_metrics(y_true, y_pred)
    assert m1["true_positives"] == 0
    assert m1["false_positives"] == 0
    assert m1["precision"] == 0.0  # Zero division avoided
    assert m1["recall"] == 0.0
    assert m1["f1_score"] == 0.0
    assert m1["false_positive_rate"] == 0.0
    assert m1["accuracy"] == 50.0

    # Case 2: All actual normal (0) with zero false positives
    y_true_all_normal = np.array([0, 0, 0])
    y_pred_all_normal = np.array([0, 0, 0])
    m2 = calculate_metrics(y_true_all_normal, y_pred_all_normal)
    assert m2["accuracy"] == 100.0
    assert m2["false_positive_rate"] == 0.0
    assert m2["precision"] == 0.0

    # Case 3: Empty inputs
    m_empty = calculate_metrics(np.array([]), np.array([]))
    assert m_empty["total_evaluated"] == 0
    assert m_empty["accuracy"] == 0.0
