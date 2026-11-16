"""Screening metrics shared by training and evaluation."""

from __future__ import annotations

from typing import Dict

import numpy as np
from sklearn.metrics import average_precision_score, roc_auc_score


def ece_score(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> float:
    bins = np.linspace(0, 1, n_bins + 1)
    idx = np.clip(np.digitize(p, bins[1:-1]), 0, n_bins - 1)
    e = 0.0
    for b in range(n_bins):
        m = idx == b
        if m.any():
            e += m.mean() * abs(p[m].mean() - y[m].mean())
    return float(e)


def threshold_for_sensitivity(y: np.ndarray, p: np.ndarray, target: float) -> float:
    """Largest threshold whose sensitivity on (y, p) is >= target."""
    pos = np.sort(p[y == 1])[::-1]
    if len(pos) == 0:
        return 0.5
    k = int(np.ceil(target * len(pos)))
    return float(pos[min(k, len(pos)) - 1])


def op_metrics(y: np.ndarray, p: np.ndarray, t: float) -> Dict[str, float]:
    pred = p >= t
    tp = int((pred & (y == 1)).sum()); fn = int((~pred & (y == 1)).sum())
    fp = int((pred & (y == 0)).sum()); tn = int((~pred & (y == 0)).sum())
    sens = tp / max(tp + fn, 1); spec = tn / max(tn + fp, 1)
    return {"sens": sens, "spec": spec, "ppv": tp / max(tp + fp, 1), "npv": tn / max(tn + fn, 1),
            "f1": 2 * tp / max(2 * tp + fp + fn, 1), "flag_rate": float(pred.mean()), "thr": float(t)}


def score_metrics(y: np.ndarray, p: np.ndarray) -> Dict[str, float]:
    return {"auroc": float(roc_auc_score(y, p)), "auprc": float(average_precision_score(y, p)),
            "brier": float(np.mean((p - y) ** 2)), "ece": ece_score(y, p)}


def mondrian_quantiles(y: np.ndarray, p: np.ndarray, alpha: float) -> Dict[str, float]:
    """Class-conditional split-conformal quantiles for the LAC score 1 - p(true class)."""
    out = {}
    for cls, s in (("q1", 1 - p[y == 1]), ("q0", p[y == 0])):
        n = len(s)
        level = min(1.0, np.ceil((n + 1) * (1 - alpha)) / max(n, 1))
        out[cls] = float(np.quantile(s, level, method="higher")) if n else 1.0
    return out


def conformal_set(p: np.ndarray, q: Dict[str, float]) -> np.ndarray:
    """Returns (N, 2) boolean array: [contains 0, contains 1]."""
    return np.column_stack([p <= q["q0"], (1 - p) <= q["q1"]])
