"""Thread-safe serving engine for the LightGBM screening bundle."""

from __future__ import annotations

import logging
import os
import threading
from typing import Any, Dict, List, Optional, Tuple

import lightgbm as lgb
import numpy as np

from .model import (DISORDERS, MODES, Normer, input_names, load_bundle, model_inputs, save_bundle,
                    train_bundle)

logger = logging.getLogger("ScreeningEngine")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_BUNDLE_PATH = os.path.join(BACKEND_DIR, "models", "screening_bundle.json")
SINGLE_MODES = ("dyslexia", "dyscalculia", "dysgraphia")

RECOMMENDATIONS = {
    "High": "Screen positive: refer for a formal specialist assessment. This is a screening result, not a diagnosis.",
    "Medium": "Borderline: provide targeted classroom support and re-screen in 6-8 weeks.",
    "Low": "No screening concern at this time: continue regular teaching and routine screening.",
}
DECISION_TEXT = {
    (False, True): "screen_positive",
    (True, False): "screen_negative",
    (True, True): "uncertain",
    (False, False): "atypical_input",
}


def _feature_names() -> List[str]:
    from ai.feature_extractors import get_feature_names
    return get_feature_names()


def parse_covariates(payload: Dict[str, Any]) -> Tuple[np.ndarray, Dict[str, Any]]:
    """Age (years), home language (1 = Hindi-dominant) and input device (1 = finger).
    Unknown values are NaN and imputed with training means inside the normer."""
    info: Dict[str, Any] = {"imputed": []}
    age = payload.get("student_age", payload.get("age"))
    if age is None and payload.get("grade") is not None:
        digits = "".join(ch for ch in str(payload["grade"]) if ch.isdigit())
        age = int(digits) + 5.5 if digits else None
        info["age_from_grade"] = age is not None
    try:
        age = float(age) if age is not None else np.nan
    except (TypeError, ValueError):
        age = np.nan
    if not (np.isnan(age) or 5 <= age <= 16):
        age = np.nan

    lang = str(payload.get("home_language") or payload.get("language") or "").strip().lower()
    hindi = 1.0 if lang in ("hi", "hindi", "hi-in") else 0.0 if lang in ("en", "english", "en-in", "en-us") else np.nan

    dev = str(payload.get("input_device") or "").strip().lower()
    finger = 1.0 if dev in ("finger", "touch") else 0.0 if dev in ("stylus", "pen", "mouse") else np.nan

    for name, v in zip(("age_years", "home_language", "input_device"), (age, hindi, finger)):
        if np.isnan(v):
            info["imputed"].append(name)
    info.update({"age_years": None if np.isnan(age) else age,
                 "hindi_dominant": None if np.isnan(hindi) else bool(hindi),
                 "finger_input": None if np.isnan(finger) else bool(finger)})
    return np.array([[age, hindi, finger]], dtype=float), info


class ScreeningEngine:
    _instance: Optional["ScreeningEngine"] = None
    _lock = threading.Lock()

    def __init__(self, bundle_path: Optional[str] = None):
        self.bundle_path = bundle_path or os.environ.get("SWARSETU_SCREENING_BUNDLE", DEFAULT_BUNDLE_PATH)
        self.feature_names = _feature_names()
        if not os.path.exists(self.bundle_path):
            logger.warning("No screening bundle at %s; training one on synthetic data", self.bundle_path)
            save_bundle(train_bundle(self.feature_names), self.bundle_path)
        self.bundle = load_bundle(self.bundle_path, expected_feature_names=self.feature_names)
        self.normer = Normer(**self.bundle["normer"])
        self.boosters: Dict[Tuple[str, str], lgb.Booster] = {
            (mode, d): lgb.Booster(model_str=m["booster"])
            for mode, per in self.bundle["models"].items() for d, m in per.items()}
        # optional real-data correction trained on top of the synthetic booster (research_cli.py retrain --save)
        self.residuals: Dict[Tuple[str, str], lgb.Booster] = {
            (mode, d): lgb.Booster(model_str=m["residual_booster"])
            for mode, per in self.bundle["models"].items() for d, m in per.items() if m.get("residual_booster")}
        logger.info("Loaded screening bundle %s (%s)", self.bundle["model_version"], self.bundle_path)

    @classmethod
    def get(cls) -> "ScreeningEngine":
        with cls._lock:
            if cls._instance is None:
                cls._instance = ScreeningEngine()
            return cls._instance

    @classmethod
    def reload(cls) -> "ScreeningEngine":
        with cls._lock:
            cls._instance = ScreeningEngine()
            return cls._instance

    @property
    def model_id(self) -> str:
        return f"{self.bundle['model_family']}@{self.bundle['model_version']}"

    def info(self) -> Dict[str, Any]:
        b = self.bundle
        return {"model_id": self.model_id, "model_family": b["model_family"], "created_at": b["created_at"],
                "sha256": b["sha256"], "operating_points": b["operating_points"], "params": b["params"],
                "training_data": {k: v for k, v in b["training_data"].items() if k != "cohort_summary"},
                "validation_report": b["validation_report"], "bundle_path": self.bundle_path}

    @property
    def uses_questionnaire(self) -> bool:
        return "questionnaire" in self.bundle

    def predict(self, x64: List[float], covariates: np.ndarray, mode: str,
                questionnaire: Optional[np.ndarray] = None) -> Dict[str, Dict[str, Any]]:
        """questionnaire: 6 DSM-5 teacher-questionnaire features (NaN when not filled in)."""
        if mode not in MODES:
            raise ValueError(f"Unknown screening mode '{mode}'")
        X = np.clip(np.asarray(x64, dtype=float).reshape(1, 64), 0.0, 1.0)
        Q = None
        if self.uses_questionnaire:
            Q = np.full((1, 6), np.nan) if questionnaire is None else np.asarray(questionnaire, dtype=float).reshape(1, 6)
        F = model_inputs(X, covariates, self.normer, mode, Q)
        names = input_names(self.feature_names, mode, questionnaire=Q is not None)
        out = {}
        for d, meta in self.bundle["models"][mode].items():
            booster = self.boosters[(mode, d)]
            residual = self.residuals.get((mode, d))
            if residual is None:
                p = float(booster.predict(F)[0])
            else:
                raw = booster.predict(F, raw_score=True)[0] + residual.predict(F, raw_score=True)[0]
                p = float(1 / (1 + np.exp(-raw)))
            contrib = booster.predict(F, pred_contrib=True)[0][:-1]
            refer, monitor, q = meta["refer_threshold"], meta["monitor_threshold"], meta["conformal"]
            level = "High" if p >= refer else "Medium" if p >= monitor else "Low"
            in0, in1 = p <= q["q0"], (1 - p) <= q["q1"]
            order = np.argsort(contrib)[::-1]
            drivers = [(names[i], float(contrib[i])) for i in order if contrib[i] > 0][:5]
            protective = [(names[i], float(contrib[i])) for i in order[::-1] if contrib[i] < 0][:3]
            base = self.bundle["training_data"]["cohort_summary"].get(f"prev_obs_{d}")
            out[d] = {
                "risk_score": round(p, 4),
                "base_rate": None if base is None else round(base, 4),
                "relative_risk": None if not base else round(p / base, 2),
                "risk_level": level,
                "flagged": p >= refer,
                "threshold_used": round(refer, 4),
                "monitor_threshold": round(monitor, 4),
                "screening_decision": DECISION_TEXT[(bool(in0), bool(in1))],
                "conformal_set": [c for c, inc in ((0, in0), (1, in1)) if inc],
                "conformal_coverage_target": 1 - self.bundle["operating_points"]["conformal_alpha"],
                "recommendation": RECOMMENDATIONS[level],
                "top_shap_features": [n for n, _ in drivers[:3]],
                "shap_attributions": {n: round(v, 4) for n, v in drivers},
                "protective_features": {n: round(v, 4) for n, v in protective},
            }
        return out

    def screen(self, payload: Dict[str, Any], disorder_type: str,
               profile_answers: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Extract features from a raw assessment payload and score it.

        profile_answers: the student's stored DSM-5 profile/questionnaire. It supplies age,
        home language and device when the payload lacks them, the teacher-questionnaire
        model inputs, and the DSM-5 criteria A-D summary."""
        from ai.session_adapter import extract_64d_feature_vector
        from .dsm5 import covariates as profile_covariates, criteria_summary, questionnaire_features
        key = (disorder_type or "").strip().lower()
        mode = key if key in SINGLE_MODES else "full"
        merged = dict(payload)
        if profile_answers:
            for k, v in profile_covariates(profile_answers).items():
                if merged.get(k) in (None, "") and v is not None:
                    merged[k] = v
        x64 = extract_64d_feature_vector(merged, disorder_type=key)
        cov, cov_info = parse_covariates(merged)
        q = questionnaire_features(profile_answers) if profile_answers else None
        results = self.predict(x64, cov, mode, q)
        cov_info["profile_used"] = bool(profile_answers)
        cov_info["questionnaire_used"] = q is not None and not np.isnan(q).all()
        # stored with the assessment so it can be re-scored / used for training exactly as seen
        cov_info["questionnaire"] = None if q is None else [None if np.isnan(v) else float(v) for v in np.ravel(q)]
        out = {"mode": mode, "feature_vector": x64, "covariates": cov_info,
               "disorders": results, "model_id": self.model_id}
        if profile_answers:
            out["dsm5"] = criteria_summary(profile_answers, results)
        return out


def get_screening_engine() -> ScreeningEngine:
    return ScreeningEngine.get()
