"""
Feature Extractors Module for SwarSetu
Provides 16-D domain-specific feature extractors and 64-D unified vector assembly.
"""

from typing import Dict, Any, List
import numpy as np

from .dyslexia_features import DyslexiaFeatureExtractor
from .dyscalculia_features import DyscalculiaFeatureExtractor
from .dysgraphia_features import DysgraphiaFeatureExtractor
from .behavioural_features import BehaviouralFeatureExtractor

_dyslexia_extractor = DyslexiaFeatureExtractor()
_dyscalculia_extractor = DyscalculiaFeatureExtractor()
_dysgraphia_extractor = DysgraphiaFeatureExtractor()
_behavioural_extractor = BehaviouralFeatureExtractor()


def extract_dyslexia_features(raw_payload: Dict[str, Any], student_age: int = 9) -> np.ndarray:
    return _dyslexia_extractor.extract(raw_payload, student_age)


def extract_dyscalculia_features(raw_payload: Dict[str, Any], student_age: int = 9) -> np.ndarray:
    return _dyscalculia_extractor.extract(raw_payload, student_age)


def extract_dysgraphia_features(raw_payload: Dict[str, Any], student_age: int = 9) -> np.ndarray:
    return _dysgraphia_extractor.extract(raw_payload, student_age)


def extract_behavioural_features(raw_payload: Dict[str, Any], student_age: int = 9) -> np.ndarray:
    return _behavioural_extractor.extract(raw_payload, student_age)


def extract_unified_64d_features(raw_payload: Dict[str, Any], student_age: int = 9) -> np.ndarray:
    d_feat = extract_dyslexia_features(raw_payload, student_age)
    dc_feat = extract_dyscalculia_features(raw_payload, student_age)
    dg_feat = extract_dysgraphia_features(raw_payload, student_age)
    b_feat = extract_behavioural_features(raw_payload, student_age)
    full_vector = np.concatenate([d_feat, dc_feat, dg_feat, b_feat])
    assert full_vector.shape == (64,), f"Invalid unified vector shape: {full_vector.shape}"
    return full_vector


def get_feature_names(disorder_or_index: Any = None) -> List[str]:
    if disorder_or_index in (0, 'dyslexia', 'Dyslexia'):
        return DyslexiaFeatureExtractor.FEATURE_NAMES
    elif disorder_or_index in (1, 'dyscalculia', 'Dyscalculia'):
        return DyscalculiaFeatureExtractor.FEATURE_NAMES
    elif disorder_or_index in (2, 'dysgraphia', 'Dysgraphia'):
        return DysgraphiaFeatureExtractor.FEATURE_NAMES
    elif disorder_or_index in (3, 'behavioural', 'Behavioural'):
        return BehaviouralFeatureExtractor.FEATURE_NAMES
    
    # Return all 64 feature names
    return (
        DyslexiaFeatureExtractor.FEATURE_NAMES +
        DyscalculiaFeatureExtractor.FEATURE_NAMES +
        DysgraphiaFeatureExtractor.FEATURE_NAMES +
        BehaviouralFeatureExtractor.FEATURE_NAMES
    )
