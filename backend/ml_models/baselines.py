"""
================================================================================
CLASSICAL BASELINE MODELS FOR SLD SCREENING COMPARISON
SwarSetu Research Architecture - Priority 3 Upgrades
================================================================================

This module implements comparison baselines for the research model:
1. Logistic Regression (MultiOutputClassifier)
2. Random Forest Classifier
3. XGBoost Classifier (with sklearn GradientBoosting fallback)
4. Simple MLP Classifier (Multi-Layer Perceptron)

All models adhere to a common multi-label classification interface and
use reproducible random seeds and standardized preprocessing.
"""

import os
import sys
import numpy as np
from typing import Dict, Any, Tuple, Optional, List

from sklearn.preprocessing import StandardScaler
from sklearn.multioutput import MultiOutputClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix
)

# Try importing XGBoost with graceful fallback
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False


class BaseSLDBaseline:
    """Base class for SLD multi-label baseline models."""
    
    def __init__(self, name: str, seed: int = 42):
        self.name = name
        self.seed = seed
        self.scaler = StandardScaler()
        self.model = None

    def fit(self, X: np.ndarray, y: np.ndarray) -> 'BaseSLDBaseline':
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        X_scaled = self.scaler.transform(X)
        preds = self.model.predict(X_scaled)
        if isinstance(preds, list):
            preds = np.column_stack(preds)
        return np.asarray(preds)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        X_scaled = self.scaler.transform(X)
        if hasattr(self.model, "predict_proba"):
            probs_raw = self.model.predict_proba(X_scaled)
            if isinstance(probs_raw, list):
                # MultiOutputClassifier returns list of (N, 2) arrays
                probs = np.column_stack([p[:, 1] for p in probs_raw])
            else:
                probs = probs_raw
            return np.asarray(probs)
        else:
            preds = self.predict(X)
            return preds.astype(float)


class LogisticRegressionBaseline(BaseSLDBaseline):
    """Multi-label Logistic Regression baseline."""
    
    def __init__(self, seed: int = 42, C: float = 1.0, max_iter: int = 1000):
        super().__init__("Logistic Regression", seed=seed)
        base_lr = LogisticRegression(C=C, random_state=seed, max_iter=max_iter, solver='liblinear')
        self.model = MultiOutputClassifier(base_lr)


class RandomForestBaseline(BaseSLDBaseline):
    """Multi-label Random Forest baseline."""
    
    def __init__(self, seed: int = 42, n_estimators: int = 100, max_depth: Optional[int] = 8):
        super().__init__("Random Forest", seed=seed)
        self.model = RandomForestClassifier(
            n_estimators=n_estimators, max_depth=max_depth, random_state=seed, n_jobs=-1
        )


class XGBoostBaseline(BaseSLDBaseline):
    """Multi-label XGBoost baseline (with GradientBoosting fallback)."""
    
    def __init__(self, seed: int = 42, n_estimators: int = 100, max_depth: int = 4):
        if HAS_XGBOOST:
            super().__init__("XGBoost", seed=seed)
            base_xgb = xgb.XGBClassifier(
                n_estimators=n_estimators, max_depth=max_depth, learning_rate=0.1,
                random_state=seed, eval_metric='logloss'
            )
            self.model = MultiOutputClassifier(base_xgb)
        else:
            super().__init__("GradientBoosting (XGBoost Fallback)", seed=seed)
            base_gb = GradientBoostingClassifier(
                n_estimators=n_estimators, max_depth=max_depth, random_state=seed
            )
            self.model = MultiOutputClassifier(base_gb)


class SimpleMLPBaseline(BaseSLDBaseline):
    """Multi-label Simple MLP baseline."""
    
    def __init__(self, seed: int = 42, hidden_layer_sizes: Tuple[int, ...] = (128, 64), max_iter: int = 500):
        super().__init__("Simple MLP", seed=seed)
        self.model = MLPClassifier(
            hidden_layer_sizes=hidden_layer_sizes, activation='relu',
            solver='adam', alpha=1e-4, max_iter=max_iter, random_state=seed, early_stopping=True
        )


def evaluate_model_performance(y_true: np.ndarray, y_prob: np.ndarray,
                               y_pred: np.ndarray, disorder_names: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Computes standard evaluation metrics for multi-label SLD predictions.
    """
    if disorder_names is None:
        disorder_names = ["Dyslexia", "Dyscalculia", "Dysgraphia"]

    n_labels = y_true.shape[1]
    per_label_metrics = {}

    for i in range(n_labels):
        name = disorder_names[i] if i < len(disorder_names) else f"Label_{i}"
        yt = y_true[:, i]
        yp = y_pred[:, i]
        ypr = y_prob[:, i]

        acc = accuracy_score(yt, yp)
        prec = precision_score(yt, yp, zero_division=0)
        rec = recall_score(yt, yp, zero_division=0)
        f1 = f1_score(yt, yp, zero_division=0)

        try:
            roc_auc = roc_auc_score(yt, ypr)
        except Exception:
            roc_auc = 0.5

        try:
            pr_auc = average_precision_score(yt, ypr)
        except Exception:
            pr_auc = 0.5

        cm = confusion_matrix(yt, yp, labels=[0, 1])

        per_label_metrics[name] = {
            "Accuracy": acc,
            "Precision": prec,
            "Recall": rec,
            "F1": f1,
            "ROC-AUC": roc_auc,
            "PR-AUC": pr_auc,
            "ConfusionMatrix": cm.tolist()
        }

    macro_f1 = f1_score(y_true, y_pred, average='macro', zero_division=0)
    weighted_f1 = f1_score(y_true, y_pred, average='weighted', zero_division=0)
    exact_acc = accuracy_score(y_true, y_pred)

    try:
        macro_roc_auc = roc_auc_score(y_true, y_prob, average='macro')
    except Exception:
        macro_roc_auc = np.mean([per_label_metrics[d]["ROC-AUC"] for d in per_label_metrics])

    try:
        macro_pr_auc = average_precision_score(y_true, y_prob, average='macro')
    except Exception:
        macro_pr_auc = np.mean([per_label_metrics[d]["PR-AUC"] for d in per_label_metrics])

    return {
        "per_label": per_label_metrics,
        "Macro F1": macro_f1,
        "Weighted F1": weighted_f1,
        "Exact Match Accuracy": exact_acc,
        "Macro ROC-AUC": macro_roc_auc,
        "Macro PR-AUC": macro_pr_auc
    }
