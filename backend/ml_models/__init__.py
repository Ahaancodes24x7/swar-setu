"""
Legacy model package.

The production screening model lives in backend/screening (LightGBM bundle).
UnifiedDisorderPredictor wraps the older FT-Transformer engine and is kept for
comparison only. The former *_nn_model.py predictors used untrained random
weights and are no longer exported.
"""

from ml_models.unified_predictor import (
    UnifiedDisorderPredictor,
    get_predictor
)

__version__ = "3.0"

__all__ = [
    'UnifiedDisorderPredictor',
    'get_predictor',
]
