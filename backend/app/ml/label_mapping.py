import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional, Any

NORMAL_KEYWORDS = {
    "benign", "normal", "0", 0, "0.0", "non-attack", "ok", "clean", "good", "background"
}

def is_likely_normal(label_val: Any) -> bool:
    s = str(label_val).strip().lower()
    return s in NORMAL_KEYWORDS or "benign" in s or "normal" in s

def suggest_label_mapping(unique_values: List[Any]) -> Dict[str, str]:
    """
    Analyzes unique label values and auto-suggests mapping to 'Normal' or 'Attack'.
    User can inspect and override this mapping through the API/UI.
    """
    mapping: Dict[str, str] = {}
    for val in unique_values:
        val_str = str(val).strip()
        if is_likely_normal(val):
            mapping[val_str] = "Normal"
        else:
            mapping[val_str] = "Attack"
    return mapping

def apply_label_mapping(
    series: pd.Series,
    mapping: Dict[str, str]
) -> np.ndarray:
    """
    Applies user-confirmed label mapping to convert dataset labels into binary targets:
    0 = Normal (Negative class)
    1 = Attack (Positive class)
    """
    # Normalize mapping keys to stripped strings
    norm_mapping = {str(k).strip(): str(v).strip().capitalize() for k, v in mapping.items()}

    s_str = series.astype(str).str.strip()

    # Check for unmapped labels
    unmapped = set(s_str.unique()) - set(norm_mapping.keys())
    if unmapped:
        raise ValueError(
            f"Dataset contains labels not defined in the label mapping: {list(unmapped)[:10]}. "
            f"Please configure explicit mapping for all target labels."
        )

    # Convert to binary
    binary_targets = np.zeros(len(s_str), dtype=int)
    for idx, val in enumerate(s_str):
        mapped = norm_mapping.get(val, "Normal")
        if mapped == "Attack":
            binary_targets[idx] = 1
        elif mapped == "Normal":
            binary_targets[idx] = 0
        else:
            raise ValueError(f"Mapping target must be 'Normal' or 'Attack', got '{mapped}' for '{val}'")

    return binary_targets

def validate_features_and_label(feature_cols: List[str], target_col: Optional[str]) -> List[str]:
    """
    Guarantees target column, attack categories, or label derivatives are strictly
    excluded from the model's input feature list.
    """
    cleaned_features = list(feature_cols)
    if target_col and target_col in cleaned_features:
        cleaned_features.remove(target_col)

    # Common leaky column names in intrusion detection datasets
    forbidden_substrings = ["label", "attack_cat", "target", "class", "ground_truth"]
    filtered_features = []
    for col in cleaned_features:
        col_lower = col.strip().lower()
        if target_col and col_lower == target_col.strip().lower():
            continue
        filtered_features.append(col)

    return filtered_features
