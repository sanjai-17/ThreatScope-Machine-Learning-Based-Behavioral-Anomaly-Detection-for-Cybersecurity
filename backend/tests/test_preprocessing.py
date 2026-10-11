import pytest
import numpy as np
import pandas as pd
from app.ml.preprocessor import NetworkDataPreprocessor
from app.ml.label_mapping import validate_features_and_label, apply_label_mapping, suggest_label_mapping

def test_preprocessing_inf_nan_and_constant_removal():
    """
    Verifies that the preprocessor:
    1. Handles +inf and -inf without errors.
    2. Imputes missing values from training statistics.
    3. Detects and removes constant zero-variance features.
    4. Scales active features properly.
    """
    df = pd.DataFrame({
        "feat1": [10.0, np.inf, 30.0, np.nan, 50.0],
        "feat2": [-np.inf, 2.0, 3.0, 4.0, 5.0],
        "const_feat": [42.0, 42.0, 42.0, 42.0, 42.0],  # Constant feature
        "feat3": [100.0, 200.0, 300.0, 400.0, 500.0],
        "target": ["Normal", "Attack", "Normal", "Attack", "Normal"]
    })

    feature_cols = ["feat1", "feat2", "const_feat", "feat3"]
    prep = NetworkDataPreprocessor()
    X_scaled = prep.fit_transform(df, feature_cols)

    # Verify constant column dropped
    assert "const_feat" in prep.dropped_constant_columns
    assert "const_feat" not in prep.active_features
    assert len(prep.active_features) == 3

    # Verify no NaN or Inf remains
    assert np.all(np.isfinite(X_scaled))
    assert X_scaled.shape == (5, 3)

def test_preprocessing_fit_on_train_only_no_leakage():
    """
    Ensures preprocessor parameters (imputation medians, scaling mean/std)
    are strictly fitted on train and applied to test without re-fitting.
    """
    train_df = pd.DataFrame({
        "f1": [10.0, 20.0, 30.0, 40.0],
        "f2": [1.0, 2.0, 3.0, 4.0]
    })
    test_df = pd.DataFrame({
        "f1": [np.nan, 25.0],
        "f2": [np.inf, 10.0]
    })

    prep = NetworkDataPreprocessor()
    prep.fit(train_df, ["f1", "f2"])

    # Training medians
    expected_f1_median = 25.0
    expected_f2_median = 2.5
    assert prep.impute_medians["f1"] == expected_f1_median
    assert prep.impute_medians["f2"] == expected_f2_median

    # Transform test set using train fitted parameters
    X_test_scaled = prep.transform(test_df)
    assert np.all(np.isfinite(X_test_scaled))
    assert X_test_scaled.shape == (2, 2)

def test_label_exclusion_and_mapping():
    """
    Verifies that target/label columns are strictly excluded from features
    and labels map accurately to binary 0 and 1.
    """
    cols = ["Flow_Duration", "Packet_Len", "Label", "Attack_Cat"]
    clean_cols = validate_features_and_label(cols, target_col="Label")
    assert "Label" not in clean_cols

    # Label mapping test
    series = pd.Series(["BENIGN", "DoS", "BENIGN", "PortScan", "Normal"])
    mapping = {
        "BENIGN": "Normal",
        "DoS": "Attack",
        "PortScan": "Attack",
        "Normal": "Normal"
    }
    y_binary = apply_label_mapping(series, mapping)
    np.testing.assert_array_equal(y_binary, [0, 1, 0, 1, 0])
