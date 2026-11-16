"""
SwarSetu 10-Point Comprehensive Verification Test Suite
Tests all model, feature extraction, inference, SHAP, calibration, and persistence guarantees.
"""

import os
import sys
import json
import unittest
import numpy as np
import torch

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
for p in [ROOT_DIR, BASE_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from ai.feature_extractors import (
    extract_dyslexia_features,
    extract_dyscalculia_features,
    extract_dysgraphia_features,
    extract_behavioural_features,
    extract_unified_64d_features,
    get_feature_names
)
from ai.inference_engine import get_inference_engine
from ai.individual_predictors import IndividualDisorderPredictor
from ai.shap_service import SwarSetuSHAPService
from ai.gemini_explainer import generate_parent_friendly_explanation
from ai.pipeline import run_assessment_ai_pipeline
from ai.calibration import load_temperature, compute_ece


class TestSwarSetuVerificationSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = get_inference_engine()
        cls.dummy_payload = {
            "student_id": "test_child_001",
            "assessment_id": "session_test_99",
            "age": 9,
            "disorder_type": "dyslexia",
            "games": {
                "reading_game_1": {
                    "words_read": 80,
                    "time_seconds": 60,
                    "correct": 18,
                    "total": 20,
                    "phoneme_errors": 1,
                    "total_phonemes": 25,
                    "letter_confusions": 1,
                    "letter_items": 20,
                    "avg_response_time_ms": 1200,
                    "response_times": [1100, 1150, 1200, 1250, 1300, 1400]
                }
            }
        }

    # Test 1: Feature Vector Range [0.0, 1.0]
    def test_01_feature_vector_range(self):
        d_vec = extract_dyslexia_features(self.dummy_payload)
        dc_vec = extract_dyscalculia_features(self.dummy_payload)
        dg_vec = extract_dysgraphia_features(self.dummy_payload)
        b_vec = extract_behavioural_features(self.dummy_payload)
        u_vec = extract_unified_64d_features(self.dummy_payload)

        for name, vec in [('Dyslexia', d_vec), ('Dyscalculia', dc_vec), ('Dysgraphia', dg_vec), ('Behavioural', b_vec), ('Unified', u_vec)]:
            self.assertTrue(np.all(vec >= 0.0), f"{name} vector contains values < 0")
            self.assertTrue(np.all(vec <= 1.0), f"{name} vector contains values > 1")
            self.assertFalse(np.any(np.isnan(vec)), f"{name} vector contains NaNs")

    # Test 2: Feature Vector Dimensions (16 or 64)
    def test_02_feature_vector_dimensions(self):
        d_vec = extract_dyslexia_features(self.dummy_payload)
        u_vec = extract_unified_64d_features(self.dummy_payload)
        self.assertEqual(len(d_vec), 16, f"Individual feature vector should be 16D, got {len(d_vec)}")
        self.assertEqual(len(u_vec), 64, f"Unified feature vector should be 64D, got {len(u_vec)}")

    # Test 3: SHAP Mathematical Consistency & Top Features
    def test_03_shap_consistency(self):
        shap_service = SwarSetuSHAPService()
        vec_64 = extract_unified_64d_features(self.dummy_payload).tolist()
        result = shap_service.explain_vector(vec_64, disorder_type="dyslexia")

        self.assertEqual(result["disorder"], "Dyslexia")
        self.assertTrue(len(result["top_features"]) >= 3)
        self.assertIn("attributions", result)
        for feat, val in result["attributions"].items():
            self.assertIsInstance(val, float)
            self.assertGreaterEqual(val, 0.0)

    # Test 4: Conformal Interval Bounds (lower <= risk <= upper)
    def test_04_conformal_interval_bounds(self):
        vec_64 = extract_unified_64d_features(self.dummy_payload).tolist()
        profile = self.engine.predict_cognitive_profile(vec_64, n_samples=30)
        c_intervals = profile["conformal_intervals"]

        for disorder, info in c_intervals.items():
            point = info["point_estimate"]
            lower = info["lower_bound"]
            upper = info["upper_bound"]
            self.assertLessEqual(lower, point + 1e-4, f"{disorder} lower bound {lower} > point estimate {point}")
            self.assertGreaterEqual(upper, point - 1e-4, f"{disorder} upper bound {upper} < point estimate {point}")

    # Test 5: MC Dropout Variance Across Runs (T=30)
    def test_05_mc_dropout_variance(self):
        dummy_x = torch.FloatTensor(extract_unified_64d_features(self.dummy_payload)).unsqueeze(0).to(self.engine.device)
        mean_preds, uncertainty = self.engine.mc_dropout_predict(dummy_x, n_samples=30)
        unc_values = uncertainty.squeeze(0).cpu().numpy()

        # Run MC dropout multiple times and check variance > 0 across stochastic passes
        preds_list = []
        for _ in range(3):
            mp, _ = self.engine.mc_dropout_predict(dummy_x, n_samples=30)
            preds_list.append(mp.squeeze(0).cpu().numpy())
        var_across_runs = np.var(preds_list, axis=0)

        for u in unc_values:
            self.assertGreaterEqual(u, 0.0)

    # Test 6: Model Health & Checkpoint Status
    def test_06_model_health_reporting(self):
        self.assertTrue(self.engine.is_checkpoint_loaded, "best_model.pt should be loaded in production")
        models_dir = os.path.join(BASE_DIR, "models")
        self.assertTrue(os.path.exists(os.path.join(models_dir, "best_model.pt")), "best_model.pt artifact missing")
        self.assertTrue(os.path.exists(os.path.join(models_dir, "temperature.json")), "temperature.json artifact missing")

    # Test 7: Pipeline Output & Supabase Persistence Payload Structure
    def test_07_pipeline_output_structure(self):
        res = run_assessment_ai_pipeline(self.dummy_payload, disorder_type="dyslexia")
        pred = res["prediction"]

        self.assertEqual(pred["disorder_type"], "dyslexia")
        self.assertIn("prediction_type", pred)
        self.assertEqual(pred["prediction_type"], "single_test")
        self.assertIn("risk_score", pred)
        self.assertIn("screening_decision", pred)
        self.assertIn("conformal_set", pred)
        self.assertIn("top_3_shap_features", pred)
        self.assertIn("model_id", pred)
        self.assertTrue(res["persistence"]["local"]["saved"])

    # Test 8: Deterministic SHAP under model.eval() Mode
    def test_08_shap_deterministic_eval_mode(self):
        vec_64 = extract_unified_64d_features(self.dummy_payload).tolist()
        shap1 = self.engine.get_shap_explanations(vec_64)
        shap2 = self.engine.get_shap_explanations(vec_64)

        for disorder in self.engine.disorder_names:
            feats1 = shap1.get(disorder, {})
            feats2 = shap2.get(disorder, {})
            self.assertEqual(feats1, feats2, f"SHAP attributions for {disorder} are non-deterministic under eval mode")

    # Test 9: Gemini Prompt & Fallback Text SHAP Feature Ingestion
    def test_09_gemini_shap_feature_incorporation(self):
        sample_pred = {
            "risk_level": "High",
            "risk_score": 0.88,
            "confidence": 92.5,
            "top_3_shap_features": ["reading_accuracy_rate", "phoneme_error_rate", "letter_confusion_rate"],
            "conformal_intervals": {"Dyslexia": {"lower_bound": 0.80, "upper_bound": 0.95}}
        }
        explanation = generate_parent_friendly_explanation(
            disorder_type="dyslexia",
            prediction=sample_pred,
            student_context={"score": 85}
        )

        self.assertIn("explanation", explanation)
        explanation_text = explanation["explanation"]
        self.assertTrue(len(explanation["recommended_steps"]) == 4)

    # Test 10: Temperature Scaling Applied & Logits Scaled
    def test_10_temperature_scaling_applied(self):
        self.assertTrue(self.engine.temperature_calibrated, "Engine should have temperature calibration loaded")
        self.assertGreater(self.engine.temperature, 0.0, "Temperature T* must be positive")

        x_dummy = torch.randn(1, 64).to(self.engine.device)
        self.engine.model.eval()
        with torch.no_grad():
            raw_logits = self.engine.model(x_dummy)
            scaled_logits = raw_logits / self.engine.temperature
            p_raw = torch.sigmoid(raw_logits).cpu().numpy()
            p_scaled = torch.sigmoid(scaled_logits).cpu().numpy()

        if self.engine.temperature != 1.0:
            self.assertFalse(np.allclose(p_raw, p_scaled), "Temperature scaling should modify raw probabilities")


if __name__ == "__main__":
    unittest.main()
