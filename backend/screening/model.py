"""
LightGBM screening model for dyslexia, dyscalculia and dysgraphia.

Pipeline (see backend/reports/realistic_eval for the comparison that chose it):
  1. 64 extractor features + covariates (age, home language, input device)
  2. regression-based norming: each feature is residualised on age, age^2,
     language and device using typically-developing training children, the way
     psychometric test norms are built
  3. missing-input indicators (extractor default values)
  4. one LightGBM classifier per disorder and mode:
        full          -> all 64 normed features (comprehensive screen)
        <disorder>    -> that disorder's 16-feature block (single-test screen)
  5. operating points chosen on held-out validation data
        refer   : sensitivity >= 0.85
        monitor : sensitivity >= 0.95
  6. class-conditional (Mondrian) split-conformal quantiles, alpha = 0.10

Everything is stored in one JSON bundle (no pickle) with a SHA-256 checksum, so
model, thresholds and preprocessing can never come from different runs.
"""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

import lightgbm as lgb
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import StratifiedShuffleSplit

from .metrics import (conformal_set, mondrian_quantiles, op_metrics, score_metrics,
                      threshold_for_sensitivity)
from .dsm5 import SCHEMA_VERSION as DSM5_SCHEMA_VERSION
from .synthetic_cohort import (BLOCKS, DISORDERS, MISSING_DEFAULTS, CohortConfig, dsm5_config,
                               describe_cohort, generate_cohort)

SCHEMA_VERSION = 2  # v2: DSM-5 teacher questionnaire inputs
MODEL_FAMILY = "lightgbm-normed"
COVARIATES = ["age_years", "hindi_dominant", "finger_input"]
MODES = {"full": slice(0, 64), "dyslexia": BLOCKS["Dyslexia"],
         "dyscalculia": BLOCKS["Dyscalculia"], "dysgraphia": BLOCKS["Dysgraphia"]}
REFER_SENSITIVITY = 0.85
MONITOR_SENSITIVITY = 0.95
CONFORMAL_ALPHA = 0.10
LGBM_PARAMS = dict(n_estimators=300, num_leaves=7, learning_rate=0.03, subsample=0.8, subsample_freq=1,
                   colsample_bytree=0.7, min_child_samples=30, reg_lambda=1.0, verbose=-1)


class Normer:
    """Residualise features on covariates using typically-developing children."""

    def __init__(self, coef=None, intercept=None, sd=None, cov_means=None):
        self.coef = None if coef is None else np.asarray(coef, dtype=float)
        self.intercept = None if intercept is None else np.asarray(intercept, dtype=float)
        self.sd = None if sd is None else np.asarray(sd, dtype=float)
        self.cov_means = None if cov_means is None else np.asarray(cov_means, dtype=float)

    @staticmethod
    def design(C: np.ndarray) -> np.ndarray:
        a = C[:, 0] - 9.5
        return np.column_stack([a, a ** 2, C[:, 1], C[:, 2]])

    def fit(self, X: np.ndarray, C: np.ndarray, typical: np.ndarray) -> "Normer":
        self.cov_means = np.nanmean(C, axis=0)
        Ci = self.impute(C)
        lr = LinearRegression().fit(self.design(Ci[typical]), X[typical])
        self.coef, self.intercept = lr.coef_, lr.intercept_
        self.sd = (X[typical] - self._predict(Ci[typical])).std(0) + 1e-6
        return self

    def impute(self, C: np.ndarray) -> np.ndarray:
        C = np.array(C, dtype=float, copy=True)
        nan = np.isnan(C)
        C[nan] = np.broadcast_to(self.cov_means, C.shape)[nan]
        return C

    def _predict(self, C: np.ndarray) -> np.ndarray:
        return self.design(C) @ self.coef.T + self.intercept

    def transform(self, X: np.ndarray, C: np.ndarray) -> np.ndarray:
        return (X - self._predict(self.impute(C))) / self.sd

    def to_dict(self) -> Dict:
        return {"coef": self.coef.tolist(), "intercept": self.intercept.tolist(),
                "sd": self.sd.tolist(), "cov_means": self.cov_means.tolist()}


def missing_indicators(X: np.ndarray) -> np.ndarray:
    return np.isclose(X, MISSING_DEFAULTS[None, :]).astype(float)


# DSM-5 teacher questionnaire columns used by each mode (order: reading, writing, math x symptoms, level)
QUESTIONNAIRE_COLUMNS = {"full": [0, 1, 2, 3, 4, 5], "dyslexia": [0, 1], "dysgraphia": [2, 3], "dyscalculia": [4, 5]}
QUESTIONNAIRE_NAMES = ["teacher:reading_symptoms", "teacher:reading_level", "teacher:writing_symptoms",
                       "teacher:writing_level", "teacher:math_symptoms", "teacher:math_level"]


def model_inputs(X: np.ndarray, C: np.ndarray, normer: Normer, mode: str, Q: Optional[np.ndarray] = None) -> np.ndarray:
    """Normed task features + missing-input indicators (+ teacher questionnaire when Q is given;
    NaN questionnaire values mean "not filled in" and are handled natively by LightGBM)."""
    sl = MODES[mode]
    parts = [normer.transform(X, C)[:, sl], missing_indicators(X)[:, sl]]
    if Q is not None:
        parts.append(np.asarray(Q, dtype=float).reshape(len(X), 6)[:, QUESTIONNAIRE_COLUMNS[mode]])
    return np.hstack(parts)


def input_names(feature_names: List[str], mode: str, questionnaire: bool = False) -> List[str]:
    sl = MODES[mode]
    names = feature_names[sl]
    out = list(names) + [f"missing:{n}" for n in names]
    if questionnaire:
        out += [QUESTIONNAIRE_NAMES[i] for i in QUESTIONNAIRE_COLUMNS[mode]]
    return out


def _split(y: np.ndarray, seed: int):
    key = y[:, 0] * 4 + y[:, 1] * 2 + y[:, 2]
    tr, rest = next(StratifiedShuffleSplit(1, test_size=0.4, random_state=seed).split(np.zeros(len(y)), key))
    va, te = next(StratifiedShuffleSplit(1, test_size=0.5, random_state=seed).split(np.zeros(len(rest)), key[rest]))
    return tr, rest[va], rest[te]


def covariates_of(cohort: Dict[str, np.ndarray]) -> np.ndarray:
    return np.column_stack([cohort["age"], cohort["hindi"], cohort["finger"]]).astype(float)


def train_bundle(feature_names: List[str], n: int = 20000, seed: int = 0,
                 covariate_missing_rate: float = 0.15) -> Dict:
    """Train all screening models on a realistic synthetic cohort (with DSM-5 Criterion D factors
    and the teacher questionnaire) and return the bundle dict."""
    cohort = generate_cohort(dsm5_config(n), seed=seed)
    Q = cohort["questionnaire"]
    X, y = cohort["X"].astype(float), cohort["y"]
    C = covariates_of(cohort)
    # the frontend does not always send covariates: train with some unknown
    rng = np.random.default_rng(seed + 1)
    C[rng.random(C.shape) < covariate_missing_rate] = np.nan
    tr, va, te = _split(y, seed)
    normer = Normer().fit(X[tr], C[tr], typical=y[tr].max(1) == 0)

    models: Dict[str, Dict] = {}
    report: Dict[str, Dict] = {}
    for mode in MODES:
        F = model_inputs(X, C, normer, mode, Q)
        disorders = range(3) if mode == "full" else [DISORDERS.index(mode.capitalize())]
        models[mode], report[mode] = {}, {}
        for j in disorders:
            d = DISORDERS[j]
            clf = lgb.LGBMClassifier(**LGBM_PARAMS, random_state=seed).fit(F[tr], y[tr, j])
            pv, pt = clf.predict_proba(F[va])[:, 1], clf.predict_proba(F[te])[:, 1]
            refer = threshold_for_sensitivity(y[va, j], pv, REFER_SENSITIVITY)
            monitor = min(refer, threshold_for_sensitivity(y[va, j], pv, MONITOR_SENSITIVITY))
            q = mondrian_quantiles(y[va, j], pv, CONFORMAL_ALPHA)
            cs = conformal_set(pt, q)
            covered = np.where(y[te, j] == 1, cs[:, 1], cs[:, 0])
            hindi = cohort["hindi"][te]
            age = cohort["age"][te]
            flag = pt >= refer
            neg, pos = y[te, j] == 0, y[te, j] == 1
            models[mode][d] = {"booster": clf.booster_.model_to_string(), "refer_threshold": refer,
                               "monitor_threshold": monitor, "conformal": q}
            report[mode][d] = {
                **score_metrics(y[te, j], pt), **{f"refer_{k}": v for k, v in op_metrics(y[te, j], pt, refer).items()},
                "conformal_coverage_pos": float(covered[pos].mean()), "conformal_coverage_neg": float(covered[neg].mean()),
                "conformal_ambiguous_rate": float(cs.all(1).mean()),
                "fpr_english": float(flag[neg & ~hindi].mean()), "fpr_hindi": float(flag[neg & hindi].mean()),
                "tpr_english": float(flag[pos & ~hindi].mean()), "tpr_hindi": float(flag[pos & hindi].mean()),
                "fpr_age_7_8": float(flag[neg & (age < 9)].mean()), "fpr_age_11_12": float(flag[neg & (age >= 11)].mean()),
                # children still learning the language of instruction (DSM-5 Criterion D)
                "fpr_language_learner": float(flag[neg & (cohort["proficiency"][te] > 0)].mean()),
                "fpr_fluent": float(flag[neg & (cohort["proficiency"][te] == 0)].mean()),
            }

    bundle = {
        "schema_version": SCHEMA_VERSION,
        "model_family": MODEL_FAMILY,
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "feature_names": list(feature_names),
        "covariates": COVARIATES,
        "questionnaire": {"columns": QUESTIONNAIRE_NAMES, "schema_version": DSM5_SCHEMA_VERSION},
        "missing_defaults": MISSING_DEFAULTS.tolist(),
        "normer": normer.to_dict(),
        "params": LGBM_PARAMS,
        "operating_points": {"refer_sensitivity": REFER_SENSITIVITY, "monitor_sensitivity": MONITOR_SENSITIVITY,
                             "conformal_alpha": CONFORMAL_ALPHA},
        "training_data": {"source": "synthetic liability-threshold cohort (backend/screening/synthetic_cohort.py)",
                          "n": n, "seed": seed, "split": "60/20/20 stratified",
                          "covariate_missing_rate": covariate_missing_rate,
                          "cohort_summary": describe_cohort(cohort),
                          "warning": "Trained on synthetic data only. Not clinically validated."},
        "validation_report": report,
        "models": models,
    }
    bundle["sha256"] = bundle_hash(bundle)
    return bundle


def bundle_hash(bundle: Dict) -> str:
    body = {k: v for k, v in bundle.items() if k != "sha256"}
    return hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()


def save_bundle(bundle: Dict, path: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf8") as f:
        json.dump(bundle, f)
    os.replace(tmp, path)


def load_bundle(path: str, expected_feature_names: Optional[List[str]] = None) -> Dict:
    with open(path, encoding="utf8") as f:
        bundle = json.load(f)
    if bundle.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"Unsupported bundle schema {bundle.get('schema_version')}")
    if bundle.get("sha256") != bundle_hash(bundle):
        raise ValueError("Screening bundle checksum mismatch (file corrupted or edited)")
    if expected_feature_names is not None and bundle["feature_names"] != list(expected_feature_names):
        raise ValueError("Screening bundle feature names do not match the feature extractors")
    return bundle
