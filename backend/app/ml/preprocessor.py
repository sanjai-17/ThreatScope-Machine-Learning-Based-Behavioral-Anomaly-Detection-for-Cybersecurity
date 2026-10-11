import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Any, Optional
from sklearn.preprocessing import StandardScaler

class NetworkDataPreprocessor:
    """
    Robust network traffic data preprocessor designed for cybersecurity datasets
    such as CIC-IDS2017, UNSW-NB15, and custom CSV flow captures.
    
    Ensures:
    - Infinite values (+inf, -inf) are sanitized.
    - Missing values are imputed using medians fitted on training data.
    - Constant/zero-variance features are detected and removed.
    - Scaling parameters are fitted on training data only.
    - Fitted state can be saved and reapplied cleanly during testing and live inference.
    """

    def __init__(self):
        self.fitted: bool = False
        self.selected_features: List[str] = []
        self.active_features: List[str] = []
        self.dropped_constant_columns: List[str] = []
        self.impute_medians: Dict[str, float] = {}
        self.scaler: Optional[StandardScaler] = None
        self.metadata: Dict[str, Any] = {}

    def fit(self, df: pd.DataFrame, feature_cols: List[str]) -> "NetworkDataPreprocessor":
        """
        Fits preprocessing parameters (medians, constant columns, scaler) on training data only.
        """
        if not feature_cols:
            raise ValueError("Feature columns list cannot be empty.")

        # Ensure all requested feature columns exist in DataFrame
        missing_cols = [c for c in feature_cols if c not in df.columns]
        if missing_cols:
            raise ValueError(f"Requested features not found in dataset: {missing_cols}")

        self.selected_features = list(feature_cols)
        X = df[self.selected_features].copy()

        # Step 1: Convert to numeric, replace infinities with NaN
        for col in self.selected_features:
            X[col] = pd.to_numeric(X[col], errors="coerce")
            X[col] = X[col].replace([np.inf, -np.inf], np.nan)

        # Step 2: Compute medians for imputation from training data
        self.impute_medians = {}
        for col in self.selected_features:
            col_median = X[col].median()
            if pd.isna(col_median):
                col_median = 0.0
            self.impute_medians[col] = float(col_median)
            X[col] = X[col].fillna(self.impute_medians[col])

        # Step 3: Identify constant / zero-variance features
        self.dropped_constant_columns = []
        self.active_features = []
        for col in self.selected_features:
            # Check standard deviation or unique value count
            if X[col].nunique() <= 1 or np.isclose(X[col].std(ddof=0), 0.0):
                self.dropped_constant_columns.append(col)
            else:
                self.active_features.append(col)

        if not self.active_features:
            raise ValueError("All selected features have zero variance or are constant. Cannot train model.")

        # Step 4: Fit scaler on active features
        self.scaler = StandardScaler()
        self.scaler.fit(X[self.active_features].values)

        self.fitted = True
        self.metadata = {
            "selected_features_count": len(self.selected_features),
            "active_features_count": len(self.active_features),
            "dropped_constant_columns": self.dropped_constant_columns,
            "scaler_type": "StandardScaler",
        }
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """
        Transforms new data (validation, test, or prediction) using fitted parameters.
        Prevents data leakage by strictly using fitted training statistics.
        """
        if not self.fitted:
            raise RuntimeError("Preprocessor must be fitted before calling transform.")

        missing_cols = [c for c in self.selected_features if c not in df.columns]
        if missing_cols:
            raise ValueError(f"Data missing required features: {missing_cols}")

        X = df[self.selected_features].copy()

        for col in self.selected_features:
            X[col] = pd.to_numeric(X[col], errors="coerce")
            X[col] = X[col].replace([np.inf, -np.inf], np.nan)
            # Impute using fitted training medians
            X[col] = X[col].fillna(self.impute_medians.get(col, 0.0))

        # Select only active features identified during fit
        X_active = X[self.active_features].values

        # Scale using fitted scaler
        X_scaled = self.scaler.transform(X_active)

        # Final sanity check: ensure no NaN or Inf remains
        if not np.all(np.isfinite(X_scaled)):
            X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=1.0, neginf=-1.0)

        return X_scaled

    def fit_transform(self, df: pd.DataFrame, feature_cols: List[str]) -> np.ndarray:
        return self.fit(df, feature_cols).transform(df)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "fitted": self.fitted,
            "selected_features": self.selected_features,
            "active_features": self.active_features,
            "dropped_constant_columns": self.dropped_constant_columns,
            "impute_medians": self.impute_medians,
            "metadata": self.metadata,
        }
