"""
Regression checks for the defects found in the SwarSetu screening models.

Section A re-checks the 17 audit findings against the current code and artefacts.
Each finding reports whether the CODE is fixed and, where it depends on stored
artefacts, whether the ARTEFACT is still stale (the legacy FT-Transformer is
opt-in via SWARSETU_ENGINE=ft and has not been retrained).
Section B checks the production LightGBM path.

Results -> results/defect_checks.json
"""

from __future__ import annotations

import builtins
import inspect
import json
import os
import sys
import tempfile
import warnings

import numpy as np

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(os.path.dirname(HERE))
ROOT = os.path.dirname(BACKEND)
for p in (BACKEND, ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
# keep the checks offline and side-effect free
os.environ["GEMINI_API_KEY"] = ""
os.environ["SUPABASE_URL"] = ""
os.environ.setdefault("SWARSETU_DB_PATH", os.path.join(tempfile.mkdtemp(), "checks.sqlite3"))

_print = builtins.print
import torch

RESULTS = []


def check(cid, title, scope, open_now: bool, evidence: str, severity: str):
    status = "OPEN" if open_now else "FIXED"
    RESULTS.append({"id": cid, "title": title, "scope": scope, "status": status, "severity": severity,
                    "evidence": evidence})
    _print(f"[{status:5s}] {cid:4s} ({severity}, {scope}) {title}\n              {evidence}")


def quiet(fn, *a, **k):
    builtins.print = lambda *x, **y: None
    try:
        return fn(*a, **k)
    finally:
        builtins.print = _print


def src(path):
    with open(os.path.join(ROOT, path), encoding="utf8") as f:
        return f.read()


import unified_predictor as up
from ai.inference_engine import get_inference_engine

engine = quiet(get_inference_engine)
train_src = src("unified_predictor.py")
LEGACY, ART, PROD = "legacy FT code", "legacy FT artefact", "production"

_print("=" * 100 + "\nA. AUDIT FINDINGS (legacy FT-Transformer engine is opt-in; production uses LightGBM)\n" + "=" * 100)

check("C1", "Serving skips the training-time feature standardisation", LEGACY,
      not ("self.standardize(" in inspect.getsource(engine.mc_dropout_predict) and engine.feature_mean is not None),
      "mc_dropout_predict now standardises with the stored scaler", "critical")

ck = torch.load(engine.checkpoint_path, map_location="cpu", weights_only=False)
check("C2", "Checkpoint, thresholds, temperature and scaler come from different runs", ART,
      not engine.artifacts_consistent,
      f"checkpoint keys {sorted(ck.keys())}; training script now stores thresholds, temperature and scaler in the "
      "checkpoint, but the FT model has not been retrained", "critical")

with open(os.path.join(BACKEND, "models", "temperature.json")) as f:
    tj = json.load(f)
check("C3a", "Temperature scaling kept even when it worsens ECE", LEGACY,
      "did not reduce ECE" not in train_src, "training keeps T=1 unless ECE improves", "high")
check("C3b", "Deployed temperature.json worsens calibration", ART, tj["ece_calibrated"] > tj["ece_uncalibrated"],
      f"ECE {tj['ece_uncalibrated']} -> {tj['ece_calibrated']} (stale until FT retrain)", "high")

ind_src = src("backend/ai/individual_predictors.py") + inspect.getsource(engine.predict_cognitive_profile)
check("C4", "'High' risk tier unreachable (threshold * 1.1 > 1)", LEGACY, "threshold * 1.1" in ind_src,
      "tiers are now High >= threshold, Medium >= 0.7 * threshold", "high")

check("C5", "Early stopping restores the last epoch (live state_dict reference)", LEGACY,
      "copy.deepcopy(self.model.state_dict())" not in train_src
      or "copy.deepcopy(model.state_dict())" not in src("backend/routes/training.py"),
      "both trainers deep-copy the best weights", "high")

check("C6", "Warm-up counted in batches but stepped per epoch", LEGACY,
      "total_iters=warmup_epochs * len(train_loader)" in train_src, "warm-up and milestone now in epochs", "medium")

check("C7", "Thresholds fitted on untempered probabilities but applied to tempered ones", LEGACY,
      "val_logits / t_opt" not in train_src, "thresholds are refitted on tempered validation probabilities", "high")

from ai.inference_engine import ConformalWrapper
check("C8", "'90% guaranteed' conformal intervals use hard-coded q_hat", LEGACY,
      np.allclose(ConformalWrapper().q_hat, [0.08, 0.09, 0.07]),
      "legacy engine only; production uses class-conditional split conformal fitted on validation data", "high")

check("C9", "Fairness status hard-coded / audit on fabricated predictions", LEGACY,
      '"fairness_status": "ACCEPTABLE"' in inspect.getsource(engine.predict_cognitive_profile)
      or "run_synthetic_fairness_audit" in src("backend/routes/explainability.py"),
      "/api/fairness-report now reports measured held-out subgroup error rates", "high")

import ml_models
check("C10", "Random-weight legacy predictors exported", LEGACY,
      any(n.endswith("DeepLearning") for n in getattr(ml_models, "__all__", [])),
      "no longer exported or used; files remain for reference", "high")

check("C11", "SHAP call reseeds global RNGs", LEGACY,
      "set_all_seeds(42)" in inspect.getsource(engine.get_shap_explanations),
      "SHAP now seeds inside a forked RNG", "low")

pb = inspect.getsource(up.SLDInferenceEngine.predict_batch)
check("C12", "predict_batch standardises twice", LEGACY,
      "self.scaler.transform(feature_matrix)" in pb and "predict_single(feature_matrix" in pb, "single transform", "medium")

bg = np.load(os.path.join(BACKEND, "models", "shap_background.npy"))
check("C13", "SHAP background stored in raw space", ART, bg.min() >= 0 and bg.max() <= 1.0 + 1e-6,
      "training now saves the background in model-input space; stored file is stale until FT retrain", "medium")

Xo, yo, _ = quiet(up.SLDSyntheticDataGenerator(up.CONFIG, seed=42).generate)
check("C14", "Legacy training generator mis-specified (d~1.5, prevalence 16-21%)", LEGACY, True,
      "still used by the legacy FT trainer; production trains on backend/screening/synthetic_cohort.py", "high")

check("C16", "Unit tests fail on CUDA (non-leaf grad tensors)", LEGACY,
      "requires_grad=True).to(self.device)" in src("backend/test_ml_upgrades.py"), "tensors created on device", "low")
check("C17", "Old benchmark thresholds every model at 0.5", "historical report", True,
      "reports/run_paper_experiments.py left as a record; superseded by realistic_eval/", "medium")

_print("\n" + "=" * 100 + "\nB. PRODUCTION LIGHTGBM PATH\n" + "=" * 100)

from screening import get_screening_engine
from screening.model import bundle_hash
from app import app

se = get_screening_engine()
check("P1", "Single verified artefact bundle (model, normer, thresholds, conformal)", PROD,
      se.bundle["sha256"] != bundle_hash(se.bundle), f"{se.model_id}, sha256 {se.bundle['sha256'][:12]}...", "critical")

client = app.test_client()


def payload(level):
    g = {"wpm": 30 + 90 * level, "accuracy": 0.4 + 0.58 * level, "phoneme_errors": int(20 * (1 - level)),
         "total_phonemes": 24, "pseudoword_accuracy": 0.3 + 0.65 * level, "phonological_score": 0.3 + 0.65 * level,
         "ran_time_seconds": 60 - 38 * level, "first_response_ms": 3000 - 2300 * level,
         "comprehension_score": 0.35 + 0.6 * level, "attention_score": 0.4 + 0.5 * level,
         "memory_score": 0.4 + 0.5 * level, "visual_score": 0.4 + 0.5 * level}
    return {"disorder_type": "dyslexia", "student_id": "probe", "student_age": 9, "games": {"reading": g}}


res = {lvl: quiet(client.post, "/api/assess", json=payload(lvl)).get_json() for lvl in (0.05, 0.5, 0.95)}
sc = {k: v["prediction"]["risk_score"] for k, v in res.items()}
lv = {k: v["prediction"]["risk_level"] for k, v in res.items()}
check("C15", "End-to-end: impaired reader must score higher risk than a strong reader", PROD,
      not (sc[0.05] > sc[0.5] > sc[0.95] and lv[0.05] != lv[0.95]),
      f"risk weak/mid/strong = {sc[0.05]}/{sc[0.5]}/{sc[0.95]}; levels {lv[0.05]}/{lv[0.5]}/{lv[0.95]}", "critical")

tiers = {se.predict([v] * 64, np.array([[9.0, 0.0, 0.0]]), "full")["Dyslexia"]["risk_level"] for v in np.linspace(.02, .98, 25)}
check("P2", "All risk tiers reachable", PROD, tiers != {"Low", "Medium", "High"}, f"observed tiers {sorted(tiers)}", "high")

rep = se.bundle["validation_report"]
cov = min(min(m["conformal_coverage_pos"], m["conformal_coverage_neg"]) for per in rep.values() for m in per.values())
ece = max(m["ece"] for per in rep.values() for m in per.values())
check("P3", "Conformal coverage >= 0.88 for BOTH classes on held-out data", PROD, cov < 0.88,
      f"minimum class-conditional coverage {cov:.3f} (target 0.90)", "high")
check("P4", "Calibrated probabilities (held-out ECE <= 0.03)", PROD, ece > 0.03, f"max ECE {ece:.4f}", "high")
saved = all(v.get("persistence", {}).get("local", {}).get("saved") for v in res.values())
check("P5", "Every screening input is stored locally", PROD, not saved,
      f"assessment ids {[v.get('assessment_id', '')[:8] for v in res.values()]}", "high")
exp = res[0.05]["explanation"]
check("P6", "Explainer reports why it fell back instead of failing silently", PROD,
      exp["source"] == "fallback" and not exp.get("fallback_reason"), f"source={exp['source']}, reason={exp.get('fallback_reason')}",
      "medium")

os.makedirs(os.path.join(HERE, "results"), exist_ok=True)
with open(os.path.join(HERE, "results", "defect_checks.json"), "w") as f:
    json.dump(RESULTS, f, indent=1)
open_items = [r for r in RESULTS if r["status"] == "OPEN"]
_print(f"\n{len(RESULTS) - len(open_items)}/{len(RESULTS)} fixed; open: " +
       ", ".join(f"{r['id']} ({r['scope']})" for r in open_items))
