"""
(1) Generator sensitivity analysis: does the model ranking survive changes to the
    synthetic-data assumptions? One factor at a time around the baseline cohort.
(2) Paired bootstrap 95% confidence intervals on the main setting (5 seeds):
    per-model macro AUROC / sensitivity / specificity / PPV, and the AUROC
    difference between the production LightGBM pipeline and every other model.

Outputs -> results/sensitivity_bootstrap.json, results/figures/fig_sensitivity.png
"""

from __future__ import annotations

import builtins
import copy
import json
import os
import sys
import time
import warnings
from dataclasses import replace

import numpy as np

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(os.path.dirname(HERE))
sys.path[:0] = [HERE, BACKEND]

import lightgbm as lgb
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.stats import kendalltau
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

from screening.metrics import op_metrics, threshold_for_sensitivity
from screening.model import LGBM_PARAMS, Normer, _split, covariates_of, model_inputs
from screening.synthetic_cohort import DISORDERS, CohortConfig, generate_cohort
from evaluate_all_models import ft_logits, sigmoid, train_ft
import xgboost as xgb

RES = os.path.join(HERE, "results")
FIG = os.path.join(RES, "figures")
N = 6000
N_BOOT = 1000
MODELS = ["LightGBM pipeline", "LR + demographics", "Logistic regression", "Random forest", "XGBoost",
          "FT-Transformer (ASL+Dice)", "FT-Transformer (BCE)"]

BASE = CohortConfig(n=N)
GRID = {
    "signal strength (loading scale)": [("0.70", dict(loading_scale=0.70)), ("0.85", dict(loading_scale=0.85)),
                                        ("1.00", {}), ("1.15", dict(loading_scale=1.15))],
    "missed diagnoses (label FN rate)": [("0%", dict(label_fn_rate=0.0)), ("10%", {}), ("20%", dict(label_fn_rate=0.20))],
    "diagnostic reliability r": [("0.80", dict(diag_reliability=0.80)), ("0.90", {}), ("0.97", dict(diag_reliability=0.97))],
    "missing items": [("0%", dict(item_missing=0.0, module_skip=0.0)), ("8%", {}),
                      ("20%", dict(item_missing=0.20, module_skip=0.20))],
    "home-language shift (SD)": [("0", dict(hindi_shift=0.0)), ("-0.35", {}), ("-0.70", dict(hindi_shift=-0.70))],
    "age slope (SD/year)": [("0", dict(age_slope=0.0)), ("0.25", {}), ("0.50", dict(age_slope=0.50))],
    "prevalence": [("x0.5", dict(prevalence={"Dyslexia": .04, "Dyscalculia": .03, "Dysgraphia": .035})), ("x1", {}),
                   ("x1.5", dict(prevalence={"Dyslexia": .12, "Dyscalculia": .09, "Dysgraphia": .105}))],
}


def fit_predict_all(cohort, seed, with_ft=True):
    """Train every model on the cohort's train split; return validation and test probabilities."""
    X, y, C = cohort["X"].astype(float), cohort["y"], covariates_of(cohort)
    tr, va, te = _split(y, seed)
    preds = {}
    normer = Normer().fit(X[tr], C[tr], typical=y[tr].max(1) == 0)
    F = model_inputs(X, C, normer, "full")
    preds["LightGBM pipeline"] = np.stack([
        lgb.LGBMClassifier(**LGBM_PARAMS, random_state=seed).fit(F[tr], y[tr, j]).predict_proba(F)[:, 1]
        for j in range(3)], 1)
    sc = StandardScaler().fit(X[tr])
    Z = sc.transform(X)
    D = np.hstack([Z, (C - [9.5, .6, .7]) / [1.7, .5, .5]])
    lr = lambda: LogisticRegression(C=0.5, max_iter=3000, class_weight="balanced")
    preds["LR + demographics"] = np.stack([lr().fit(D[tr], y[tr, j]).predict_proba(D)[:, 1] for j in range(3)], 1)
    preds["Logistic regression"] = np.stack([lr().fit(Z[tr], y[tr, j]).predict_proba(Z)[:, 1] for j in range(3)], 1)
    preds["Random forest"] = np.stack([RandomForestClassifier(
        n_estimators=500, min_samples_leaf=3, class_weight="balanced_subsample", n_jobs=-1, random_state=seed)
        .fit(Z[tr], y[tr, j]).predict_proba(Z)[:, 1] for j in range(3)], 1)
    preds["XGBoost"] = np.stack([xgb.XGBClassifier(
        n_estimators=400, max_depth=3, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=(len(tr) - y[tr, j].sum()) / max(y[tr, j].sum(), 1), eval_metric="logloss",
        random_state=seed, verbosity=0).fit(Z[tr], y[tr, j]).predict_proba(Z)[:, 1] for j in range(3)], 1)
    if with_ft:
        for loss, name in (("asl", "FT-Transformer (ASL+Dice)"), ("bce", "FT-Transformer (BCE)")):
            builtins_print = builtins.print
            model, _ = train_ft(Z[tr], y[tr], Z[va], y[va], loss, seed)
            builtins.print = builtins_print
            preds[name] = sigmoid(ft_logits(model, Z))
    return {m: {"va": p[va], "te": p[te]} for m, p in preds.items()}, y[va], y[te]


def macro_auc(y, p, idx=None):
    if idx is not None:
        y, p = y[idx], p[idx]
    return float(np.mean([roc_auc_score(y[:, j], p[:, j]) for j in range(3)]))


# --------------------------------------------------------------------------
def sensitivity():
    rows = []
    for factor, levels in GRID.items():
        for label, kw in levels:
            cfg = replace(BASE, **kw)
            aucs = {m: [] for m in MODELS}
            for seed in (0, 1, 2):
                cohort = generate_cohort(cfg, seed=5000 + seed)
                P, yva, yte = fit_predict_all(cohort, seed)
                for m in MODELS:
                    aucs[m].append(macro_auc(yte, P[m]["te"]))
            row = {"factor": factor, "level": label, "baseline": not kw,
                   **{m: (float(np.mean(v)), float(np.std(v))) for m, v in aucs.items()}}
            ranking = sorted(MODELS, key=lambda m: -row[m][0])
            row["ranking"] = ranking
            rows.append(row)
            print(f"[sens] {factor:34s} {label:6s} best={ranking[0]:26s} "
                  + " ".join(f"{m.split()[0][:4]}={row[m][0]:.3f}" for m in MODELS), flush=True)
    base_rank = [r for r in rows if r["baseline"]][0]["ranking"]
    taus = [kendalltau([base_rank.index(m) for m in MODELS], [r["ranking"].index(m) for m in MODELS])[0] for r in rows]
    summary = {
        "configs": len(rows),
        "lightgbm_best_or_within_0.005": int(sum(r["LightGBM pipeline"][0] >= max(r[m][0] for m in MODELS) - 0.005 for r in rows)),
        "lightgbm_beats_ft_asl": int(sum(r["LightGBM pipeline"][0] > r["FT-Transformer (ASL+Dice)"][0] for r in rows)),
        "lightgbm_beats_ft_bce": int(sum(r["LightGBM pipeline"][0] > r["FT-Transformer (BCE)"][0] for r in rows)),
        "lr_demog_beats_lr": int(sum(r["LR + demographics"][0] > r["Logistic regression"][0] for r in rows)),
        "min_kendall_tau_vs_baseline_ranking": float(np.nanmin(taus)),
        "mean_kendall_tau_vs_baseline_ranking": float(np.nanmean(taus)),
    }
    return rows, summary


# --------------------------------------------------------------------------
def bootstrap():
    per_seed = []
    for seed in range(5):
        cohort = generate_cohort(CohortConfig(n=N), seed=1000 + seed)
        P, yva, yte = fit_predict_all(cohort, seed)
        per_seed.append((P, yva, yte))
        print(f"[boot] seed {seed} models trained", flush=True)

    rng = np.random.default_rng(0)
    stats = {m: {"auroc": [], "sens": [], "spec": [], "ppv": []} for m in MODELS}
    diffs = {m: [] for m in MODELS if m != "LightGBM pipeline"}
    thr = [{m: [threshold_for_sensitivity(yva[:, j], P[m]["va"][:, j], 0.85) for j in range(3)] for m in MODELS}
           for P, yva, _ in per_seed]
    for b in range(N_BOOT):
        idxs = [rng.integers(0, len(yte), len(yte)) for _, _, yte in per_seed]
        rep = {m: {"auroc": [], "sens": [], "spec": [], "ppv": []} for m in MODELS}
        for s, ((P, _, yte), idx) in enumerate(zip(per_seed, idxs)):
            for m in MODELS:
                rep[m]["auroc"].append(macro_auc(yte, P[m]["te"], idx))
                ops = [op_metrics(yte[idx, j], P[m]["te"][idx, j], thr[s][m][j]) for j in range(3)]
                for k in ("sens", "spec", "ppv"):
                    rep[m][k].append(np.mean([o[k] for o in ops]))
        for m in MODELS:
            for k in rep[m]:
                stats[m][k].append(np.mean(rep[m][k]))
        for m in diffs:
            diffs[m].append(np.mean(rep["LightGBM pipeline"]["auroc"]) - np.mean(rep[m]["auroc"]))
    ci = lambda v: (float(np.mean(v)), float(np.percentile(v, 2.5)), float(np.percentile(v, 97.5)))
    return ({m: {k: ci(v) for k, v in d.items()} for m, d in stats.items()},
            {m: {"diff": ci(v), "p_le_0": float(np.mean(np.array(v) <= 0))} for m, v in diffs.items()})


def figure(rows):
    factors = list(GRID)
    fig, axes = plt.subplots(2, 4, figsize=(7.16, 3.8), sharey=True)
    colors = {"LightGBM pipeline": "#2a78d6", "LR + demographics": "#eb6834", "FT-Transformer (ASL+Dice)": "#8a8984",
              "Random forest": "#1baf7a"}
    for ax, f in zip(axes.ravel(), factors):
        rs = [r for r in rows if r["factor"] == f]
        x = np.arange(len(rs))
        for m, c in colors.items():
            ax.errorbar(x, [r[m][0] for r in rs], yerr=[r[m][1] for r in rs], color=c, lw=1.4, marker="o", ms=3,
                        capsize=2, label=m)
        ax.set_xticks(x); ax.set_xticklabels([r["level"] for r in rs], fontsize=6)
        ax.set_title(f, fontsize=6.5)
    axes.ravel()[-1].axis("off")
    h, l = axes.ravel()[0].get_legend_handles_labels()
    axes.ravel()[-1].legend(h, l, fontsize=6.5, loc="center", frameon=False)
    for ax in axes[:, 0]:
        ax.set_ylabel("Macro AUROC", fontsize=7)
    fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_sensitivity.png"), dpi=300); plt.close(fig)


def main():
    t0 = time.time()
    plt.rcParams.update({"font.family": "serif", "font.size": 7, "axes.spines.top": False,
                         "axes.spines.right": False, "axes.grid": True, "grid.color": "#e6e5e0"})
    boot_stats, boot_diffs = bootstrap()
    print(json.dumps(boot_diffs, indent=1), flush=True)
    rows, summary = sensitivity()
    figure(rows)
    out = {"bootstrap": {"n_boot": N_BOOT, "seeds": 5, "per_model": boot_stats, "lightgbm_minus_model_auroc": boot_diffs},
           "sensitivity": {"rows": rows, "summary": summary}, "runtime_s": round(time.time() - t0, 1)}
    with open(os.path.join(RES, "sensitivity_bootstrap.json"), "w") as f:
        json.dump(out, f, indent=1)
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
