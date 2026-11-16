"""
Evaluate every SwarSetu screening model on realistic synthetic cohorts.

Models
  Deployed (zero-shot, artefacts loaded exactly as the Flask backend loads them)
    D1  FT-Transformer as served: raw [0,1] inputs, MC-dropout T=30,
        temperature.json, thresholds.json
    D2  same checkpoint, inputs standardised with models/feature_scaler.json
    D3  IndividualDisorderPredictor path (single test, 0.5 neutral fill)
    D4  legacy ml_models/*_nn_model.py "neural" predictors
  Retrained on the realistic training split (corrected protocol: deep-copied
  best state, per-epoch warm-up, val-selected operating point)
    Logistic regression, LR + demographic covariates, random forest, XGBoost,
    LightGBM, sklearn MLP, FT-Transformer (ASL + Dice, as proposed),
    FT-Transformer (BCE), FT-Transformer + temperature scaling

Outputs -> backend/reports/realistic_eval/results/
"""

from __future__ import annotations

import copy
import json
import os
import sys
import time
import warnings
from typing import Dict, List, Tuple

import numpy as np

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(os.path.dirname(HERE))
ROOT = os.path.dirname(BACKEND)
for p in (HERE, BACKEND, ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import builtins  # silence set_all_seeds prints from unified_predictor
_print = builtins.print

import torch
import torch.nn as nn
from scipy.stats import norm
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
import lightgbm as lgb
import xgboost as xgb

from realistic_generator import (BLOCKS, DISORDERS, FEATURE_NAMES, CohortConfig,
                                 apply_extra_missingness, describe_cohort,
                                 generate_cohort, site_b_config)

import unified_predictor as up
from ai.calibration import TemperatureScaler

OUT = os.path.join(HERE, "results")
os.makedirs(OUT, exist_ok=True)
DEV = torch.device("cuda" if torch.cuda.is_available() else "cpu")
SEEDS = [int(s) for s in os.environ.get("EVAL_SEEDS", "0,1,2,3,4").split(",")]
N_COHORT = int(os.environ.get("EVAL_N", "6000"))
TARGET_SENS = 0.85
MISSING_RATES = [0.0, 0.1, 0.2, 0.3, 0.4]


def log(*a):
    _print(*a, flush=True)


# --------------------------------------------------------------------------
# metrics
# --------------------------------------------------------------------------

def ece_score(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> float:
    bins = np.linspace(0, 1, n_bins + 1)
    idx = np.clip(np.digitize(p, bins[1:-1]), 0, n_bins - 1)
    e = 0.0
    for b in range(n_bins):
        m = idx == b
        if m.any():
            e += m.mean() * abs(p[m].mean() - y[m].mean())
    return float(e)


def threshold_for_sensitivity(y: np.ndarray, p: np.ndarray, target: float) -> float:
    """Largest threshold whose sensitivity on (y, p) is >= target."""
    pos = np.sort(p[y == 1])[::-1]
    if len(pos) == 0:
        return 0.5
    k = int(np.ceil(target * len(pos)))
    return float(pos[min(k, len(pos)) - 1])


def op_metrics(y: np.ndarray, p: np.ndarray, t: float) -> Dict[str, float]:
    pred = p >= t
    tp = int(((pred == 1) & (y == 1)).sum()); fn = int(((pred == 0) & (y == 1)).sum())
    fp = int(((pred == 1) & (y == 0)).sum()); tn = int(((pred == 0) & (y == 0)).sum())
    sens = tp / max(tp + fn, 1); spec = tn / max(tn + fp, 1)
    ppv = tp / max(tp + fp, 1); npv = tn / max(tn + fn, 1)
    f1 = 2 * tp / max(2 * tp + fp + fn, 1)
    return {"sens": sens, "spec": spec, "ppv": ppv, "npv": npv, "f1": f1,
            "bal_acc": (sens + spec) / 2, "flag_rate": float(pred.mean()), "thr": float(t)}


def score_metrics(y: np.ndarray, p: np.ndarray) -> Dict[str, float]:
    if len(np.unique(y)) < 2:
        return {"auroc": float("nan"), "auprc": float("nan"), "brier": float("nan"), "ece": float("nan")}
    return {"auroc": float(roc_auc_score(y, p)), "auprc": float(average_precision_score(y, p)),
            "brier": float(np.mean((p - y) ** 2)), "ece": ece_score(y, p)}


def evaluate(y_val, p_val, y_test, p_test, fixed_thr=None) -> Dict[str, Dict]:
    res = {}
    for j, d in enumerate(DISORDERS):
        r = score_metrics(y_test[:, j], p_test[:, j])
        t = threshold_for_sensitivity(y_val[:, j], p_val[:, j], TARGET_SENS)
        r.update({f"op_{k}": v for k, v in op_metrics(y_test[:, j], p_test[:, j], t).items()})
        if fixed_thr is not None:
            r.update({f"dep_{k}": v for k, v in op_metrics(y_test[:, j], p_test[:, j], fixed_thr[j]).items()})
        res[d] = r
    return res


# --------------------------------------------------------------------------
# retrained classical baselines
# --------------------------------------------------------------------------

def fit_per_label(make, Xtr, ytr):
    return [make(j).fit(Xtr, ytr[:, j]) for j in range(3)]


def proba(models, X):
    return np.column_stack([m.predict_proba(X)[:, 1] for m in models])


def classical_models(seed: int):
    def pw(y):
        return (len(y) - y.sum()) / max(y.sum(), 1)
    return {
        "Logistic Regression": lambda ytr: (lambda j: LogisticRegression(C=0.5, max_iter=2000, class_weight="balanced")),
        "Random Forest": lambda ytr: (lambda j: RandomForestClassifier(
            n_estimators=500, min_samples_leaf=3, class_weight="balanced_subsample", n_jobs=-1, random_state=seed)),
        "XGBoost": lambda ytr: (lambda j: xgb.XGBClassifier(
            n_estimators=400, max_depth=3, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=pw(ytr[:, j]), eval_metric="logloss", random_state=seed, verbosity=0)),
        "LightGBM": lambda ytr: (lambda j: lgb.LGBMClassifier(
            n_estimators=400, num_leaves=15, learning_rate=0.03, subsample=0.8, subsample_freq=1,
            colsample_bytree=0.8, is_unbalance=True, random_state=seed, verbose=-1)),
        "MLP (sklearn)": lambda ytr: (lambda j: MLPClassifier(
            hidden_layer_sizes=(128, 64), alpha=1e-2, learning_rate_init=1e-3, max_iter=200, random_state=seed)),
    }


# --------------------------------------------------------------------------
# FT-Transformer (repository architecture) with corrected training protocol
# --------------------------------------------------------------------------

def train_ft(Xtr, ytr, Xva, yva, loss: str, seed: int, max_epochs=150, patience=25):
    builtins.print = lambda *a, **k: None
    up.set_all_seeds(seed)
    builtins.print = _print
    cfg = copy.deepcopy(up.CONFIG)
    model = up.ResidualTransformerClassifier(cfg).to(DEV)
    if loss == "asl":
        lc = cfg["loss"]
        loss_fn = up.AsymmetricLoss(gamma_pos=lc["gamma_pos"], gamma_neg=lc["gamma_neg"],
                                    clip_margin=lc["clip_margin"], label_smoothing=lc["label_smoothing"],
                                    dice_weight=lc["dice_weight"])
    else:
        loss_fn = nn.BCEWithLogitsLoss()
    tc = cfg["training"]
    opt = torch.optim.AdamW(model.parameters(), lr=tc["learning_rate"], weight_decay=tc["weight_decay"])
    warm = tc["warmup_epochs"]
    sched = torch.optim.lr_scheduler.LambdaLR(
        opt, lambda e: (e + 1) / warm if e < warm else 0.5 * (1 + np.cos(np.pi * (e - warm) / (max_epochs - warm))))
    Xt = torch.tensor(Xtr, dtype=torch.float32, device=DEV); Yt = torch.tensor(ytr, dtype=torch.float32, device=DEV)
    Xv = torch.tensor(Xva, dtype=torch.float32, device=DEV); Yv = torch.tensor(yva, dtype=torch.float32, device=DEV)
    g = torch.Generator(device="cpu").manual_seed(seed)
    best, best_state, bad, epochs_run = np.inf, None, 0, 0
    for ep in range(max_epochs):
        model.train()
        perm = torch.randperm(len(Xt), generator=g)
        for i in range(0, len(Xt), tc["batch_size"]):
            b = perm[i:i + tc["batch_size"]]
            opt.zero_grad()
            l = loss_fn(model(Xt[b]), Yt[b])
            l.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), tc["gradient_clip_norm"])
            opt.step()
        sched.step()
        model.eval()
        with torch.no_grad():
            vl = float(loss_fn(model(Xv), Yv))
        epochs_run = ep + 1
        if vl < best - 1e-5:
            best, bad = vl, 0
            best_state = copy.deepcopy(model.state_dict())
        else:
            bad += 1
            if bad >= patience:
                break
    model.load_state_dict(best_state)
    model.eval()
    return model, epochs_run


@torch.no_grad()
def ft_logits(model, X):
    model.eval()
    return model(torch.tensor(X, dtype=torch.float32, device=DEV)).float().cpu().numpy()


@torch.no_grad()
def mc_dropout(model, X, T=30):
    model.eval()
    for m in model.modules():
        if isinstance(m, nn.Dropout):
            m.train()
    x = torch.tensor(X, dtype=torch.float32, device=DEV)
    ps = torch.stack([torch.sigmoid(model(x)) for _ in range(T)]).cpu().numpy()
    model.eval()
    return ps.mean(0), ps.std(0)


def sigmoid(z):
    return 1 / (1 + np.exp(-z))


# --------------------------------------------------------------------------
# deployed models
# --------------------------------------------------------------------------

class Deployed:
    def __init__(self):
        builtins.print = lambda *a, **k: None
        from ai.inference_engine import get_inference_engine
        self.engine = get_inference_engine()
        builtins.print = _print
        with open(os.path.join(BACKEND, "models", "feature_scaler.json")) as f:
            s = json.load(f)
        self.mu, self.sd = np.array(s["mean"]), np.array(s["scale"])
        self.thr = [float(t) for t in self.engine.optimal_thresholds]
        log(f"[deployed] checkpoint={self.engine.checkpoint_path} T={self.engine.temperature:.4f} thr={np.round(self.thr, 4)}")

    def mc(self, X):
        x = torch.tensor(X, dtype=torch.float32, device=self.engine.device)
        builtins.print = lambda *a, **k: None
        m, s = self.engine.mc_dropout_predict(x, n_samples=30)
        builtins.print = _print
        return m.cpu().numpy(), s.cpu().numpy()

    def served(self, X):            # D1: exactly as predict_cognitive_profile
        return self.mc(np.clip(X, 0, 1))[0]

    def scaled(self, X, mu=None, sd=None):   # D2
        mu = self.mu if mu is None else mu
        sd = self.sd if sd is None else sd
        return self.mc((X - mu) / sd)[0]

    def individual(self, X):        # D3: 0.5 fill per disorder
        out = np.zeros((len(X), 3))
        for j, d in enumerate(DISORDERS):
            Xf = np.full_like(X, 0.5)
            Xf[:, BLOCKS[d]] = X[:, BLOCKS[d]]
            out[:, j] = self.mc(np.clip(Xf, 0, 1))[0][:, j]
        return out


def legacy_scores(X):
    from ml_models.dyslexia_nn_model import DyslexiaDeepLearning
    from ml_models.dyscalculia_nn_model import DyscalculiaDeepLearning
    from ml_models.dysgraphia_nn_model import DysgraphiaDeepLearning
    st = np.random.get_state()
    ms = [DyslexiaDeepLearning(), DyscalculiaDeepLearning(), DysgraphiaDeepLearning()]
    out = np.zeros((len(X), 3))
    for j, (m, d) in enumerate(zip(ms, DISORDERS)):
        blk = X[:, BLOCKS[d]]
        out[:, j] = [m._neural_forward_pass(row) for row in blk]
    np.random.set_state(st)
    return out


# --------------------------------------------------------------------------
# analyses
# --------------------------------------------------------------------------

def subgroup_rates(y, p, thr, groups: Dict[str, np.ndarray]):
    out = {}
    for j, d in enumerate(DISORDERS):
        out[d] = {}
        for gname, mask in groups.items():
            yy, pp = y[mask, j], p[mask, j] >= thr[j]
            out[d][gname] = {"tpr": float(pp[yy == 1].mean()) if (yy == 1).any() else float("nan"),
                             "fpr": float(pp[yy == 0].mean()) if (yy == 0).any() else float("nan"),
                             "n": int(mask.sum()), "n_pos": int(yy.sum())}
    return out


def conformal_lac(yv, pv, yt, pt, alpha=0.10):
    res = {}
    for j, d in enumerate(DISORDERS):
        s = np.where(yv[:, j] == 1, 1 - pv[:, j], pv[:, j])
        n = len(s)
        q = np.quantile(s, min(1.0, np.ceil((n + 1) * (1 - alpha)) / n), method="higher")
        inc1 = (1 - pt[:, j]) <= q
        inc0 = pt[:, j] <= q
        cover = np.where(yt[:, j] == 1, inc1, inc0)
        size = inc1.astype(int) + inc0.astype(int)
        res[d] = {"qhat": float(q), "coverage": float(cover.mean()),
                  "coverage_pos": float(cover[yt[:, j] == 1].mean()),
                  "avg_set_size": float(size.mean()), "ambiguous_rate": float((size == 2).mean()),
                  "empty_rate": float((size == 0).mean())}
    return res


def deployed_interval_coverage(yt, pt, qhat=(0.08, 0.09, 0.07)):
    return {d: {"coverage": float((np.abs(yt[:, j] - pt[:, j]) <= qhat[j]).mean()),
                "coverage_pos": float((np.abs(yt[yt[:, j] == 1, j] - pt[yt[:, j] == 1, j]) <= qhat[j]).mean())}
            for j, d in enumerate(DISORDERS)}


def stratified_split(y, seed):
    key = y[:, 0] * 4 + y[:, 1] * 2 + y[:, 2]
    s1 = StratifiedShuffleSplit(n_splits=1, test_size=0.4, random_state=seed)
    tr, rest = next(s1.split(np.zeros(len(y)), key))
    s2 = StratifiedShuffleSplit(n_splits=1, test_size=0.5, random_state=seed)
    va, te = next(s2.split(np.zeros(len(rest)), key[rest]))
    return tr, rest[va], rest[te]


def run_seed(seed: int, dep: Deployed) -> Dict:
    t0 = time.time()
    cohort = generate_cohort(CohortConfig(n=N_COHORT), seed=1000 + seed)
    ext = generate_cohort(site_b_config(3000), seed=2000 + seed)
    X, y = cohort["X"], cohort["y"]
    tr, va, te = stratified_split(y, seed)
    Xtr, Xva, Xte, Xex = X[tr], X[va], X[te], ext["X"]
    ytr, yva, yte, yex = y[tr], y[va], y[te], ext["y"]
    sc = StandardScaler().fit(Xtr)
    Ztr, Zva, Zte, Zex = (sc.transform(a) for a in (Xtr, Xva, Xte, Xex))
    R: Dict = {"seed": seed, "cohort": describe_cohort(cohort), "external": describe_cohort(ext),
               "n_train": len(tr), "n_val": len(va), "n_test": len(te), "models": {}}

    def demog(c, idx):
        return np.column_stack([(c["age"][idx] - 9.5) / 1.7, c["hindi"][idx], c["finger"][idx]])

    preds: Dict[str, Dict[str, np.ndarray]] = {}

    # --- classical ---------------------------------------------------------
    for name, maker in classical_models(seed).items():
        ms = fit_per_label(maker(ytr), Ztr, ytr)
        preds[name] = {"val": proba(ms, Zva), "test": proba(ms, Zte), "ext": proba(ms, Zex),
                       "miss": {r: proba(ms, sc.transform(apply_extra_missingness(Xte, r, seed + 7))) for r in MISSING_RATES}}
        if name == "Logistic Regression":
            R["lr_top_features"] = {
                d: [FEATURE_NAMES[i] for i in np.argsort(ms[j].coef_[0])[:6]] for j, d in enumerate(DISORDERS)}
            lr_models = ms
    # LR + demographic covariates (age, language, device)
    Dtr = np.hstack([Ztr, demog(cohort, tr)]); Dva = np.hstack([Zva, demog(cohort, va)])
    Dte = np.hstack([Zte, demog(cohort, te)]); Dex = np.hstack([Zex, demog(ext, np.arange(len(Xex)))])
    ms = fit_per_label(lambda j: LogisticRegression(C=0.5, max_iter=2000, class_weight="balanced"), Dtr, ytr)
    preds["LR + demographics"] = {"val": proba(ms, Dva), "test": proba(ms, Dte), "ext": proba(ms, Dex)}

    # --- FT-Transformer variants --------------------------------------------
    ft_info = {}
    for loss in ("asl", "bce"):
        t1 = time.time()
        model, ep = train_ft(Ztr, ytr, Zva, yva, loss, seed)
        lv, lt, le = ft_logits(model, Zva), ft_logits(model, Zte), ft_logits(model, Zex)
        name = "FT-Transformer (ASL+Dice)" if loss == "asl" else "FT-Transformer (BCE)"
        preds[name] = {"val": sigmoid(lv), "test": sigmoid(lt), "ext": sigmoid(le),
                       "miss": {r: sigmoid(ft_logits(model, sc.transform(apply_extra_missingness(Xte, r, seed + 7))))
                                for r in MISSING_RATES}}
        ft_info[loss] = {"epochs": ep, "train_s": round(time.time() - t1, 1)}
        if loss == "asl":
            ts = TemperatureScaler()
            T = ts.fit(torch.tensor(lv), torch.tensor(yva, dtype=torch.float32))
            preds["FT-Transformer (ASL+Dice) + TS"] = {"val": sigmoid(lv / T), "test": sigmoid(lt / T),
                                                      "ext": sigmoid(le / T)}
            ft_info["asl"]["temperature"] = T
            # MC-dropout uncertainty as an error detector
            mc_mean, mc_std = mc_dropout(model, Zte)
            thr = [threshold_for_sensitivity(yva[:, j], preds[name]["val"][:, j], TARGET_SENS) for j in range(3)]
            unc = {}
            for j, d in enumerate(DISORDERS):
                err = ((mc_mean[:, j] >= thr[j]).astype(int) != yte[:, j]).astype(int)
                unc[d] = {"auroc_std_detects_error": float(roc_auc_score(err, mc_std[:, j])) if 0 < err.sum() < len(err) else float("nan"),
                          "mean_std": float(mc_std[:, j].mean()),
                          "frac_std_gt_0.2": float((mc_std[:, j] > 0.2).mean())}
            R["mc_dropout_uncertainty"] = unc
            R["conformal_lac_ft_ts"] = conformal_lac(yva, preds["FT-Transformer (ASL+Dice) + TS"]["val"],
                                                     yte, preds["FT-Transformer (ASL+Dice) + TS"]["test"])
            # single-test scenario: only one block observed, rest 0.5 (as the app does)
            single = {}
            for j, d in enumerate(DISORDERS):
                Xs_te = np.full_like(Xte, 0.5); Xs_te[:, BLOCKS[d]] = Xte[:, BLOCKS[d]]
                Xs_va = np.full_like(Xva, 0.5); Xs_va[:, BLOCKS[d]] = Xva[:, BLOCKS[d]]
                p_ft_te = sigmoid(ft_logits(model, sc.transform(Xs_te)))[:, j]
                p_ft_va = sigmoid(ft_logits(model, sc.transform(Xs_va)))[:, j]
                sl = BLOCKS[d]
                lr16 = LogisticRegression(C=0.5, max_iter=2000, class_weight="balanced").fit(Ztr[:, sl], ytr[:, j])
                p16_te, p16_va = lr16.predict_proba(Zte[:, sl])[:, 1], lr16.predict_proba(Zva[:, sl])[:, 1]
                single[d] = {}
                for nm, pv_, pt_ in (("FT (64-D model, 0.5 fill)", p_ft_va, p_ft_te),
                                     ("LR trained on 16-D block", p16_va, p16_te)):
                    t_ = threshold_for_sensitivity(yva[:, j], pv_, TARGET_SENS)
                    single[d][nm] = {**score_metrics(yte[:, j], pt_), **{f"op_{k}": v for k, v in op_metrics(yte[:, j], pt_, t_).items()}}
            R["single_test"] = single
    R["ft_training"] = ft_info

    # --- deployed (zero-shot) -----------------------------------------------
    t1 = time.time()
    preds["D1 Deployed FT (as served)"] = {"val": dep.served(Xva), "test": dep.served(Xte), "ext": dep.served(Xex),
                                           "miss": {r: dep.served(apply_extra_missingness(Xte, r, seed + 7)) for r in MISSING_RATES}}
    preds["D2 Deployed FT + saved scaler"] = {"val": dep.scaled(Xva), "test": dep.scaled(Xte), "ext": dep.scaled(Xex)}
    preds["D2b Deployed FT + cohort scaler"] = {"val": dep.scaled(Xva, sc.mean_, sc.scale_),
                                               "test": dep.scaled(Xte, sc.mean_, sc.scale_),
                                               "ext": dep.scaled(Xex, sc.mean_, sc.scale_)}
    d3_va, d3_te = dep.individual(Xva), dep.individual(Xte)
    preds["D3 Deployed single-test (0.5 fill)"] = {"val": d3_va, "test": d3_te, "ext": dep.individual(Xex)}
    preds["D4 Legacy *_nn_model (random weights)"] = {"val": legacy_scores(Xva), "test": legacy_scores(Xte),
                                                      "ext": legacy_scores(Xex)}
    R["deployed_eval_s"] = round(time.time() - t1, 1)
    R["deployed_fixed_interval_coverage"] = deployed_interval_coverage(yte, preds["D1 Deployed FT (as served)"]["test"])
    R["deployed_score_stats"] = {
        k: {"mean": np.round(preds[k]["test"].mean(0), 4).tolist(), "std": np.round(preds[k]["test"].std(0), 4).tolist(),
            "min": np.round(preds[k]["test"].min(0), 4).tolist(), "max": np.round(preds[k]["test"].max(0), 4).tolist()}
        for k in preds if k.startswith("D")}

    # --- metrics --------------------------------------------------------------
    for name, P in preds.items():
        fixed = dep.thr if name.startswith(("D1", "D2", "D3")) else None
        m = {"test": evaluate(yva, P["val"], yte, P["test"], fixed),
             "external": evaluate(yva, P["val"], yex, P["ext"], fixed)}
        if "miss" in P:
            m["missing_macro_auroc"] = {str(r): float(np.mean([roc_auc_score(yte[:, j], P["miss"][r][:, j]) for j in range(3)]))
                                        for r in MISSING_RATES}
        thr = [threshold_for_sensitivity(yva[:, j], P["val"][:, j], TARGET_SENS) for j in range(3)]
        idx_te = te
        groups = {"English-dominant": ~cohort["hindi"][idx_te], "Hindi-dominant": cohort["hindi"][idx_te],
                  "Age 7-8": cohort["age"][idx_te] < 9, "Age 9-10": (cohort["age"][idx_te] >= 9) & (cohort["age"][idx_te] < 11),
                  "Age 11-12": cohort["age"][idx_te] >= 11}
        m["subgroups"] = subgroup_rates(yte, P["test"], thr, groups)
        # metrics against latent true status (label-noise-free)
        m["test_true_labels_auroc"] = {d: float(roc_auc_score(cohort["y_true"][te, j], P["test"][:, j])) for j, d in enumerate(DISORDERS)}
        R["models"][name] = m

    # ROC data for figures (seed 0 only)
    if seed == SEEDS[0]:
        np.savez_compressed(os.path.join(OUT, "seed0_predictions.npz"), y_test=yte, y_ext=yex,
                            **{f"test::{k}": v["test"] for k, v in preds.items()},
                            **{f"ext::{k}": v["ext"] for k, v in preds.items()},
                            **{f"val::{k}": v["val"] for k, v in preds.items()}, y_val=yva)
    R["runtime_s"] = round(time.time() - t0, 1)
    return R


def latency_probe(dep: Deployed, n=20):
    rng = np.random.default_rng(0)
    vec = rng.uniform(0.3, 0.9, 64).tolist()
    builtins.print = lambda *a, **k: None
    dep.engine.predict_cognitive_profile(vec)  # warm-up
    ts = []
    for _ in range(n):
        t = time.perf_counter(); dep.engine.predict_cognitive_profile(vec); ts.append(time.perf_counter() - t)
    builtins.print = _print
    return {"median_ms": float(np.median(ts) * 1000), "p95_ms": float(np.percentile(ts, 95) * 1000)}


def original_generator_check(seed: int) -> Dict:
    """Repository generator: reproduce its easy benchmark with plain LR."""
    builtins.print = lambda *a, **k: None
    Xo, yo, meta = up.SLDSyntheticDataGenerator(up.CONFIG, seed=seed).generate()
    builtins.print = _print
    Xtr, ytr, Xte, yte = Xo[:1000], yo[:1000], Xo[1000:], yo[1000:]
    sc = StandardScaler().fit(Xtr)
    ms = fit_per_label(lambda j: LogisticRegression(C=0.5, max_iter=2000), sc.transform(Xtr), ytr)
    p = proba(ms, sc.transform(Xte))
    d = {}
    for j, nm in enumerate(DISORDERS):
        sl = slice(16 * j, 16 * j + 16)
        pos, neg = Xo[yo[:, j] == 1][:, sl], Xo[yo[:, j] == 0][:, sl]
        d[nm] = {"prevalence": float(yo[:, j].mean()),
                 "median_cohens_d": float(np.median((neg.mean(0) - pos.mean(0)) / np.sqrt((pos.var(0) + neg.var(0)) / 2))),
                 "lr_test_auroc": float(roc_auc_score(yte[:, j], p[:, j]))}
    return d


def main():
    log(f"device={DEV} seeds={SEEDS} n={N_COHORT}")
    dep = Deployed()
    allr = {"config": {"seeds": SEEDS, "n_cohort": N_COHORT, "target_sensitivity": TARGET_SENS,
                       "missing_rates": MISSING_RATES},
            "latency_deployed_profile": latency_probe(dep),
            "original_generator": original_generator_check(42), "runs": []}
    log("latency", allr["latency_deployed_profile"])
    log("original generator", json.dumps(allr["original_generator"]))
    for s in SEEDS:
        r = run_seed(s, dep)
        allr["runs"].append(r)
        log(f"seed {s} done in {r['runtime_s']}s; FT epochs {r['ft_training']}")
        for k, v in r["models"].items():
            log(f"   {k:42s} macroAUROC={np.mean([v['test'][d]['auroc'] for d in DISORDERS]):.3f} "
                f"ext={np.mean([v['external'][d]['auroc'] for d in DISORDERS]):.3f}")
        with open(os.path.join(OUT, "all_results.json"), "w") as f:
            json.dump(allr, f, indent=1, default=float)
    log("saved", os.path.join(OUT, "all_results.json"))


if __name__ == "__main__":
    main()
