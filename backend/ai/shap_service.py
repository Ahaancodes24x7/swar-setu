"""
SHAP Attribution Service for SwarSetu
Provides deterministic gradient-based SHAP explanations using representative background samples.

Research: Lundberg & Lee (2017) NeurIPS "A Unified Approach to Interpreting Model Predictions"
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any
import numpy as np
import torch

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

from .inference_engine import get_inference_engine
from .feature_extractors import get_feature_names

logger = logging.getLogger("SwarSetuSHAPService")


class SwarSetuSHAPService:
    """
    Computes SHAP feature attributions with model.eval() set explicitly
    to disable MC Dropout randomness during gradient extraction.
    """

    def __init__(self):
        self.engine = get_inference_engine()

    def explain_vector(
        self,
        feature_vector: List[float],
        disorder_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compute SHAP feature attributions for 64-D input vector.
        """
        vec_arr = np.array(feature_vector, dtype=np.float32).flatten()
        if len(vec_arr) != 64:
            raise ValueError(f"SHAP explanation expects 64-D vector, got {len(vec_arr)}")

        # Enforce model.eval() mode to prevent stochastic dropout in gradients
        self.engine.model.eval()
        shaps = self.engine.get_shap_explanations(vec_arr.tolist())

        disorder_map = {
            'dyslexia': 'Dyslexia',
            'dyscalculia': 'Dyscalculia',
            'dysgraphia': 'Dysgraphia'
        }

        if disorder_type and disorder_type.lower() in disorder_map:
            target_disorder = disorder_map[disorder_type.lower()]
            disorder_shaps = shaps.get(target_disorder, {})
            return {
                "disorder": target_disorder,
                "top_features": list(disorder_shaps.keys())[:5],
                "attributions": disorder_shaps,
                "all_disorders_shap": shaps
            }

        return {
            "disorders_shap": shaps,
            "top_features_per_disorder": {
                disorder: list(attribs.keys())[:3]
                for disorder, attribs in shaps.items()
            }
        }
