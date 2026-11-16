"""
Post-Hoc Temperature Calibration Module for SwarSetu ML Models
Research: Guo et al. (2017) "On Calibration of Modern Neural Networks" ICML

Calibrates unnormalized model logits by learning a optimal scalar T* > 0.
Prevents overconfident predictions from uncalibrated multi-label classifiers.
"""

import os
import json
import logging
from typing import Dict, Tuple, Union, Optional
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

logger = logging.getLogger("SwarSetuCalibration")


class TemperatureScaler(nn.Module):
    """
    Learns a single temperature parameter T* > 0 on validation set
    to scale raw network logits before sigmoid activation:
    p_calibrated = sigmoid(logits / T*)
    """

    def __init__(self, init_temperature: float = 1.5):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * init_temperature)

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        """Scales logits by temperature."""
        temperature = self.temperature.clamp(min=0.01, max=10.0)
        return logits / temperature

    def fit(self, val_logits: torch.Tensor, val_targets: torch.Tensor, max_iter: int = 100, lr: float = 0.01) -> float:
        """
        Fit temperature T* by minimizing Binary Cross Entropy on validation set logits.
        """
        if not isinstance(val_logits, torch.Tensor):
            val_logits = torch.tensor(val_logits, dtype=torch.float32)
        else:
            val_logits = val_logits.float()

        if not isinstance(val_targets, torch.Tensor):
            val_targets = torch.tensor(val_targets, dtype=torch.float32)
        else:
            val_targets = val_targets.float()

        device = val_logits.device
        self.to(device)

        bce_loss = nn.BCEWithLogitsLoss()
        optimizer = optim.LBFGS([self.temperature], lr=lr, max_iter=max_iter)

        def eval_loss():
            optimizer.zero_grad()
            scaled_logits = self.forward(val_logits)
            loss = bce_loss(scaled_logits, val_targets)
            loss.backward()
            return loss

        optimizer.step(eval_loss)
        t_opt = float(self.temperature.detach().clamp(min=0.01, max=10.0).cpu().item())
        logger.info(f"[CALIBRATION] Optimal temperature learned: T* = {t_opt:.4f}")
        return t_opt


def compute_ece(probs: np.ndarray, targets: np.ndarray, n_bins: int = 10) -> float:
    """
    Computes Expected Calibration Error (ECE).
    Research: Naeini et al. (2015) "Obtaining Well-Calibrated Probabilities Using Bayesian Binning into Quantiles"
    """
    probs = np.clip(probs, 0.0, 1.0)
    targets = np.clip(targets, 0.0, 1.0)
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        
        in_bin = (probs >= bin_lower) & (probs < bin_upper if i < n_bins - 1 else probs <= bin_upper)
        prop_in_bin = np.mean(in_bin)

        if prop_in_bin > 0:
            avg_confidence_in_bin = np.mean(probs[in_bin])
            avg_accuracy_in_bin = np.mean(targets[in_bin])
            ece += np.abs(avg_confidence_in_bin - avg_accuracy_in_bin) * prop_in_bin

    return float(ece)


def save_temperature(t_value: float, ece_before: float, ece_after: float, save_path: str) -> None:
    """Save learned temperature T* and calibration metrics to JSON."""
    os.makedirs(os.path.dirname(os.path.abspath(save_path)), exist_ok=True)
    payload = {
        "temperature": round(float(t_value), 4),
        "ece_uncalibrated": round(float(ece_before), 4),
        "ece_calibrated": round(float(ece_after), 4),
        "method": "Binary Cross Entropy LBFGS Temperature Scaling",
        "reference": "Guo et al. (2017) ICML"
    }
    with open(save_path, "w") as f:
        json.dump(payload, f, indent=2)
    logger.info(f"[CALIBRATION] Temperature parameters written to {save_path}")


def load_temperature(load_path: str) -> float:
    """Load T* parameter from JSON, defaulting to 1.0 if missing/invalid."""
    if os.path.exists(load_path):
        try:
            with open(load_path, "r") as f:
                data = json.load(f)
                return float(data.get("temperature", 1.0))
        except Exception as e:
            logger.warning(f"Failed to read temperature from {load_path}: {e}")
    return 1.0
