import numpy as np
from typing import Dict, Any, List

def calculate_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray
) -> Dict[str, Any]:
    """
    Calculates exact cybersecurity evaluation metrics:
    - Normal = 0 (Negative class)
    - Attack / Anomaly = 1 (Positive class)

    Metrics:
    - TP: Actual attacks correctly identified as anomalous (y_true == 1 and y_pred == 1)
    - TN: Actual normal records correctly identified as normal (y_true == 0 and y_pred == 0)
    - FP: Normal records incorrectly flagged as anomalous (y_true == 0 and y_pred == 1)
    - FN: Actual attacks incorrectly identified as normal (y_true == 1 and y_pred == 0)
    - Accuracy = (TP + TN) / (TP + TN + FP + FN) * 100
    - Precision = TP / (TP + FP)
    - Recall = TP / (TP + FN)
    - F1-Score = 2 * (Precision * Recall) / (Precision + Recall)
    - False Positive Rate = FP / (FP + TN)
    """
    y_true = np.asarray(y_true).astype(int)
    y_pred = np.asarray(y_pred).astype(int)

    if len(y_true) != len(y_pred):
        raise ValueError(f"Length mismatch: y_true ({len(y_true)}) != y_pred ({len(y_pred)})")

    total = len(y_true)
    if total == 0:
        return {
            "total_evaluated": 0,
            "normal_count": 0,
            "attack_count": 0,
            "true_positives": 0,
            "true_negatives": 0,
            "false_positives": 0,
            "false_negatives": 0,
            "accuracy": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "f1_score": 0.0,
            "false_positive_rate": 0.0,
            "confusion_matrix": [[0, 0], [0, 0]],
        }

    # Binary counts
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))

    normal_count = int(np.sum(y_true == 0))
    attack_count = int(np.sum(y_true == 1))

    # Formula Calculations
    denom_total = tp + tn + fp + fn
    accuracy = ((tp + tn) / denom_total * 100.0) if denom_total > 0 else 0.0

    denom_prec = tp + fp
    precision = (tp / denom_prec) if denom_prec > 0 else 0.0

    denom_rec = tp + fn
    recall = (tp / denom_rec) if denom_rec > 0 else 0.0

    denom_f1 = precision + recall
    f1_score = (2.0 * (precision * recall) / denom_f1) if denom_f1 > 0 else 0.0

    denom_fpr = fp + tn
    false_positive_rate = (fp / denom_fpr) if denom_fpr > 0 else 0.0

    # Confusion matrix structure:
    # [[TN, FP],
    #  [FN, TP]]
    confusion_matrix: List[List[int]] = [
        [tn, fp],
        [fn, tp]
    ]

    return {
        "total_evaluated": total,
        "normal_count": normal_count,
        "attack_count": attack_count,
        "true_positives": tp,
        "true_negatives": tn,
        "false_positives": fp,
        "false_negatives": fn,
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1_score), 4),
        "false_positive_rate": round(float(false_positive_rate), 4),
        "confusion_matrix": confusion_matrix,
    }
