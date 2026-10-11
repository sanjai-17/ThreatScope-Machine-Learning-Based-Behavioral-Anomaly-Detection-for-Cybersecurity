import joblib
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from app.ml.preprocessor import NetworkDataPreprocessor

class ThreatScopeIsolationForest:
    """
    Isolation Forest Anomaly Detection Wrapper.
    
    Adheres strictly to the project specification:
    - Uses exclusively sklearn.ensemble.IsolationForest.
    - No pretrained or hybrid algorithms.
    - Anomaly score computation:
        anomaly_score = -decision_function(X)
        Threshold 0.0 corresponds to the algorithm's contamination decision boundary.
        anomaly_score > threshold indicates an anomalous record.
    """

    def __init__(
        self,
        n_estimators: int = 100,
        contamination: float = 0.05,
        random_state: int = 42,
        max_samples: Any = "auto",
        default_threshold: float = 0.0
    ):
        self.n_estimators = int(n_estimators)
        self.contamination = float(contamination)
        self.random_state = int(random_state)
        self.max_samples = max_samples if max_samples != "auto" else "auto"
        self.default_threshold = float(default_threshold)
        
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            max_samples=self.max_samples,
            n_jobs=-1
        )
        self.is_trained: bool = False

    def train(self, X_train_scaled: np.ndarray) -> "ThreatScopeIsolationForest":
        """
        Trains Isolation Forest model on scaled numerical feature array.
        """
        if len(X_train_scaled) == 0:
            raise ValueError("Training dataset cannot be empty.")
            
        self.model.fit(X_train_scaled)
        self.is_trained = True
        return self

    def compute_anomaly_scores(self, X_scaled: np.ndarray) -> np.ndarray:
        """
        Calculates continuous anomaly scores:
        Higher value -> higher likelihood of anomalous behavior.
        Formula: -decision_function(X_scaled)
        """
        if not self.is_trained:
            raise RuntimeError("Model must be trained before computing anomaly scores.")
        
        # In scikit-learn, decision_function returns negative values for anomalies.
        # Negating it makes higher numbers = more anomalous, with 0.0 as standard cutoff.
        raw_scores = self.model.decision_function(X_scaled)
        anomaly_scores = -raw_scores
        return anomaly_scores

    def predict(
        self,
        X_scaled: np.ndarray,
        threshold: Optional[float] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predicts binary labels:
        0 = Normal
        1 = Anomalous

        Returns: (binary_predictions, continuous_anomaly_scores)
        """
        scores = self.compute_anomaly_scores(X_scaled)
        cutoff = self.default_threshold if threshold is None else float(threshold)
        binary_preds = (scores > cutoff).astype(int)
        return binary_preds, scores

    def save(self, filepath: Path) -> str:
        """
        Saves trained model artifact via joblib.
        """
        filepath.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, filepath)
        return str(filepath)

    @classmethod
    def load(cls, filepath: Path) -> "ThreatScopeIsolationForest":
        """
        Loads saved model artifact from disk.
        """
        if not filepath.exists():
            raise FileNotFoundError(f"Model artifact not found at {filepath}")
        loaded = joblib.load(filepath)
        if not isinstance(loaded, ThreatScopeIsolationForest):
            raise TypeError("Loaded artifact is not a ThreatScopeIsolationForest instance.")
        return loaded
