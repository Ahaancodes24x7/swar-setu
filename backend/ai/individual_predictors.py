"""
Individual Disorder Predictors for SwarSetu
Runs inference for a single disorder using only the relevant 16-D feature group.

Research mitigation:
Non-tested feature slots are filled with 0.5 (neutral midpoint) rather than 0.0
to keep input vectors within training distribution while masking uncompleted tests.
"""

from typing import Dict, Any, Tuple
import numpy as np
import torch

from .inference_engine import get_inference_engine
from .feature_extractors import get_feature_names


class IndividualDisorderPredictor:
    """
    Predictor for single disorder screening (16-D feature vector).
    Uses 0.5 neutral midpoint filling for non-tested feature groups.
    """

    def __init__(self, disorder_type: str):
        self.disorder_type = (disorder_type or "").strip().lower()
        disorder_map = {
            'dyslexia': (0, slice(0, 16)),
            'dyscalculia': (1, slice(16, 32)),
            'dysgraphia': (2, slice(32, 48)),
        }
        if self.disorder_type not in disorder_map:
            raise ValueError(f"Unknown disorder type '{disorder_type}'. Expected one of {list(disorder_map.keys())}")

        self.disorder_index, self.feature_slice = disorder_map[self.disorder_type]
        self.disorder_name = ['Dyslexia', 'Dyscalculia', 'Dysgraphia'][self.disorder_index]
        self.engine = get_inference_engine()

    def predict(self, feature_16d: np.ndarray, n_mc_samples: int = 30) -> Dict[str, Any]:
        """
        Predict risk for single disorder using 16-D feature vector.
        0.5 neutral midpoint fill applied to remaining 48 positions.
        """
        feat_arr = np.array(feature_16d, dtype=np.float32).flatten()
        if len(feat_arr) != 16:
            raise ValueError(f"Expected 16 features for {self.disorder_name}, got {len(feat_arr)}")

        feat_arr = np.clip(feat_arr, 0.0, 1.0)

        # 0.5 Neutral Midpoint Fill for 64D vector
        full_vector = np.full(64, 0.5, dtype=np.float32)
        full_vector[self.feature_slice] = feat_arr

        x_tensor = torch.tensor(full_vector, dtype=torch.float32).unsqueeze(0).to(self.engine.device)

        # Run MC Dropout with T=30
        mean_preds, uncertainty = self.engine.mc_dropout_predict(x_tensor, n_samples=n_mc_samples)
        mean_preds_np = mean_preds.squeeze(0).cpu().numpy()
        uncertainty_np = uncertainty.squeeze(0).cpu().numpy()

        risk_score = float(mean_preds_np[self.disorder_index])
        unc = float(uncertainty_np[self.disorder_index])
        threshold = float(self.engine.optimal_thresholds[self.disorder_index] if self.disorder_index < len(self.engine.optimal_thresholds) else 0.5)

        # Conformal interval
        conformal_res = self.engine.conformal_wrapper.predict_with_interval(mean_preds_np)
        c_bounds = conformal_res.get(self.disorder_name, {})

        # SHAP / Gradient importances for 16D features
        shap_res = self.engine.get_shap_explanations(full_vector.tolist())
        disorder_shaps = shap_res.get(self.disorder_name, {})

        flagged = risk_score >= threshold
        if risk_score >= threshold:
            risk_level = "High"
        elif risk_score >= threshold * 0.7:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        return {
            "disorder": self.disorder_name,
            "assessment_type": self.disorder_type,
            "prediction_type": "individual_0.5fill",
            "risk_score": round(risk_score, 4),
            "uncertainty": round(unc, 4),
            "threshold_used": round(threshold, 4),
            "flagged": flagged,
            "risk_level": risk_level,
            "confidence": round((1.0 - unc) * 100, 2),
            "mc_samples_used": n_mc_samples,
            "temperature_used": round(self.engine.temperature, 4),
            "conformal_interval": c_bounds,
            "top_shap_features": list(disorder_shaps.keys())[:3],
            "shap_attributions": disorder_shaps,
            "recommendation": self._get_recommendation(risk_score, unc, threshold),
            "clinical_note": (
                f"Single-test screening for {self.disorder_name}. "
                "Non-tested feature groups filled with 0.5 neutral midpoint. "
                "Comprehensive comorbidity evaluation requires completing all 3 assessments."
            ),
            "16d_feature_vector": feat_arr.tolist(),
            "full_64d_vector": full_vector.tolist()
        }

    def _get_recommendation(self, score: float, unc: float, threshold: float) -> str:
        if unc > 0.20:
            return "UNCERTAIN: High prediction variance. Retesting recommended."
        if score >= threshold:
            return f"HIGH RISK: {self.disorder_name} screening positive. Formal specialist diagnostic assessment strongly recommended."
        if score >= threshold * 0.7:
            return f"MODERATE RISK: Mild indicators detected for {self.disorder_name}. Progress monitoring advised."
        return f"LOW RISK: Scores within normal limits for {self.disorder_name}."
