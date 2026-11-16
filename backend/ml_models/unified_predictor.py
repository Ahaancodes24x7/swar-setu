"""
Unified ML/DL Model Integration for SwarSetu
Routes all prediction requests directly to the thread-safe PyTorch SwarSetuInferenceEngine
"""

import os
import sys
import logging
from typing import Dict, Any, List

# Add parent path to ensure ai package is importable
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from ai.inference_engine import get_inference_engine
from ai.session_adapter import extract_64d_feature_vector

logger = logging.getLogger("UnifiedDisorderPredictor")


class UnifiedDisorderPredictor:
    """
    Unified interface routing to PyTorch SwarSetuInferenceEngine with MC Dropout.
    Provides backward-compatible methods for Dyslexia, Dyscalculia, and Dysgraphia.
    """

    def __init__(self):
        self.engine = get_inference_engine()
        self.model_version = "2.0 - PyTorch FT-Transformer"

    def predict_dyslexia(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        return self._predict_single_disorder(session_data, "dyslexia")

    def predict_dyscalculia(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        return self._predict_single_disorder(session_data, "dyscalculia")

    def predict_dysgraphia(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        return self._predict_single_disorder(session_data, "dysgraphia")

    def _predict_single_disorder(self, session_data: Dict[str, Any], disorder_type: str) -> Dict[str, Any]:
        try:
            vector = extract_64d_feature_vector(session_data, disorder_type=disorder_type)
            profile = self.engine.predict_cognitive_profile(vector)

            disorder_map = {
                "dyslexia": "Dyslexia",
                "dyscalculia": "Dyscalculia",
                "dysgraphia": "Dysgraphia",
            }
            target_name = disorder_map.get(disorder_type, "Dyslexia")
            pred_data = profile["disorders"].get(target_name, {})

            uncertainty = pred_data.get("uncertainty", 0.1)
            confidence = round((1.0 - uncertainty) * 100, 2)

            return {
                "assessment_type": disorder_type,
                "risk_level": pred_data.get("risk_level", "Low"),
                "risk_score": pred_data.get("risk_score", 0.0),
                "uncertainty": uncertainty,
                "confidence": confidence,
                "recommendations": [pred_data.get("recommendation", "Periodical screening recommended")],
                "full_profile": profile,
                "model_version": self.model_version,
            }
        except Exception as e:
            logger.error(f"Error predicting {disorder_type}: {e}")
            return {
                "assessment_type": disorder_type,
                "risk_level": "Unable to assess",
                "risk_score": 0.0,
                "uncertainty": 0.5,
                "confidence": 0.0,
                "error": str(e),
                "model_version": self.model_version,
            }

    def comprehensive_assessment(self, assessments: Dict[str, Dict]) -> Dict[str, Any]:
        results = {}
        for disorder in ["dyslexia", "dyscalculia", "dysgraphia"]:
            if disorder in assessments:
                results[disorder] = self._predict_single_disorder(assessments[disorder], disorder)

        overall_risk = "Low"
        high_count = sum(1 for r in results.values() if r.get("risk_level") == "High")
        med_count = sum(1 for r in results.values() if r.get("risk_level") == "Medium")
        if high_count >= 1:
            overall_risk = "High"
        elif med_count >= 1:
            overall_risk = "Medium"

        summary = {
            "overall_risk_level": overall_risk,
            "disorder_counts": {"high": high_count, "medium": med_count},
            "model_version": self.model_version,
        }

        return {
            "individual_results": results,
            "overall_risk_level": overall_risk,
            "comprehensive_summary": summary,
            "model_version": self.model_version,
        }

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "version": self.model_version,
            "architecture": "Residual FT-Transformer Classifier (Gorishniy et al. 2021)",
            "loss_function": "Asymmetric Multi-Label Loss (Ben-Baruch et al. 2021)",
            "uncertainty_estimation": "Monte Carlo Dropout (Gal & Ghahramani 2016)",
            "threshold_optimization": "Youden's J Statistic (Saito & Rehmsmeier 2015)",
            "input_dim": 64,
            "target_disorders": ["Dyslexia", "Dyscalculia", "Dysgraphia"],
            "checkpoint_loaded": self.engine.is_checkpoint_loaded,
        }


_predictor = None

def get_predictor() -> UnifiedDisorderPredictor:
    global _predictor
    if _predictor is None:
        _predictor = UnifiedDisorderPredictor()
    return _predictor
