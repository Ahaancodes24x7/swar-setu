"""
Production LightGBM screening pipeline vs other models, and its dynamics.

Uses the same cohorts/splits as evaluate_all_models.py (seeds 0-4, n=6000,
external Site B n=3000) and the production code in backend/screening.

Outputs -> results/lightgbm_dynamics.json, results/figures/fig_lgbm_*.png
"""

from __future__ import annotations

import json
import os
import sys
import time
import warnings

import numpy as np

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(os.path.dirname(HERE))
sys.path[:0] = [HERE, BACKEND]

import lightgbm as lgb
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

from screening.metrics import (ece_score, op_metrics, score_metrics, threshold_for_sensitivity,
                               mondrian_quantiles, conformal_set)
from screening.model import LGBM_PARAMS, Normer, covariates_of, model_inputs, input_names, _split
from screening.synthetic_cohort import (DISORDERS, CohortConfig, apply_extra_missingness, generate_cohort,
                                        site_b_config)
from ai.feature_extractors import get_feature_names

RES = os.path.join(HERE, "results")
FIG = os.path.join(RES, "figures")
os.makedirs(FIG, exist_ok=True)
SEEDS = [0, 1, 2, 3, 4]
SIZES = [250, 500, 1000, 2000, 4000, 8000, 16000]
C1, C2, C3, C4, GREY = "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#8a8984"
plt.rcParams.update({"font.family": "serif", "font.size": 8, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.grid": True, "grid.color": "#e6e5e0", "grid.linewidth": 0.5, "legend.frameon": False,
                     "savefig.dpi": 300})


def fit_lgbm(F_tr, y_tr, F_va=None, y_va=None, seed=0):
    clf = lgb.LGBMClassifier(**LGBM_PARAMS, random_state=seed)
    if F_va is None:
        return clf.fit(F_tr, y_tr)
    return clf.fit(F_tr, y_tr, eval_set=[(F_tr, y_tr), (F_va, y_va)], eval_names=["train", "val"],
                   eval_metric=["binary_logloss", "auc"])


def lgbm_pipeline_probs(X, C, y, idx, seed, mode="full", record_curves=False, cov_override=None):
    """Production pipeline: normer on typical training children + LightGBM per disorder."""
    tr, va = idx["tr"], idx["va"]
    normer = Normer().fit(X[tr], C[tr], typical=y[tr].max(1) == 0)
    feats = lambda Xs, Cs: model_inputs(Xs, Cs, normer, mode)
    out = {k: np.zeros((len(v[0]), 3)) for k, v in idx["eval"].items()}
    curves, models = {}, []
    for j in range(3):
        clf = fit_lgbm(feats(X[tr], C[tr]), y[tr, j], feats(X[va], C[va]), y[va, j], seed) if record_curves \
            else fit_lgbm(feats(X[tr], C[tr]), y[tr, j], seed=seed)
        models.append(clf)
        for k, (Xs, Cs) in idx["eval"].items():
            Cs = Cs if cov_override is None else cov_override(Cs)
            out[k][:, j] = clf.predict_proba(feats(Xs, Cs))[:, 1]
        if record_curves:
            curves[DISORDERS[j]] = {s: {m: list(map(float, v)) for m, v in d.items()}
                                    for s, d in clf.evals_result_.items()}
    return out, curves, models, normer


def summarise(yva, pva, yte, pte, yex=None, pex=None):
    r = {"auroc": [], "auprc": [], "brier": [], "ece": [], "sens": [], "spec": [], "ppv": [], "npv": [],
         "ext_auroc": [], "ext_spec": [], "cov_pos": [], "cov_neg": []}
    for j in range(3):
        s = score_metrics(yte[:, j], pte[:, j])
        t = threshold_for_sensitivity(yva[:, j], pva[:, j], 0.85)
        o = op_metrics(yte[:, j], pte[:, j], t)
        q = mondrian_quantiles(yva[:, j], pva[:, j], 0.10)
        cs = conformal_set(pte[:, j], q)
        cov = np.where(yte[:, j] == 1, cs[:, 1], cs[:, 0])
        for k in ("auroc", "auprc", "brier", "ece"):
            r[k].append(s[k])
        for k in ("sens", "spec", "ppv", "npv"):
            r[k].append(o[k])
        r["cov_pos"].append(cov[yte[:, j] == 1].mean()); r["cov_neg"].append(cov[yte[:, j] == 0].mean())
        if yex is not None:
            r["ext_auroc"].append(roc_auc_score(yex[:, j], pex[:, j]))
            r["ext_spec"].append(op_metrics(yex[:, j], pex[:, j], t)["spec"])
    return {k: float(np.mean(v)) for k, v in r.items() if v}


def comparison_and_dynamics():
    rows, curves_all, imp_all, cov_effect, miss = {}, [], [], [], {}
    for seed in SEEDS:
        c = generate_cohort(CohortConfig(n=6000), seed=1000 + seed)
        e = generate_cohort(site_b_config(3000), seed=2000 + seed)
        X, y, C = c["X"].astype(float), c["y"], covariates_of(c)
        Xe, ye, Ce = e["X"].astype(float), e["y"], covariates_of(e)
        tr, va, te = _split(y, seed)
        idx = {"tr": tr, "va": va, "eval": {"va": (X[va], C[va]), "te": (X[te], C[te]), "ex": (Xe, Ce)}}
        P, curves, models, normer = lgbm_pipeline_probs(X, C, y, idx, seed, record_curves=True)
        rows.setdefault("LightGBM pipeline (production)", []).append(summarise(y[va], P["va"], y[te], P["te"], ye, P["ex"]))
        curves_all.append(curves)
        names = input_names(get_feature_names(), "full")
        imp_all.append({DISORDERS[j]: dict(zip(names, models[j].booster_.feature_importance("gain").tolist()))
                        for j in range(3)})
        # covariates unknown at inference (frontend sends none)
        nan_cov = lambda Cs: np.full_like(Cs, np.nan)
        Pn, *_ = lgbm_pipeline_probs(X, C, y, idx, seed, cov_override=nan_cov)
        rows.setdefault("LightGBM pipeline, covariates unknown", []).append(
            summarise(y[va], Pn["va"], y[te], Pn["te"], ye, Pn["ex"]))
        # single-test models
        for d in ("dyslexia", "dyscalculia", "dysgraphia"):
            j = DISORDERS.index(d.capitalize())
            Ps, *_ = lgbm_pipeline_probs(X, C, y, idx, seed, mode=d)
            cov_effect.append({"seed": seed, "disorder": d, "single_auroc": float(roc_auc_score(y[te, j], Ps["te"][:, j])),
                               "full_auroc": float(roc_auc_score(y[te, j], P["te"][:, j]))})
        # missing-data degradation
        for r in (0.0, 0.1, 0.2, 0.3, 0.4):
            Xm = apply_extra_missingness(X[te].astype(np.float32), r, seed + 7).astype(float)
            Pm, *_ = lgbm_pipeline_probs(X, C, y, {**idx, "eval": {"te": (Xm, C[te])}}, seed)
            miss.setdefault(str(r), []).append(float(np.mean([roc_auc_score(y[te, j], Pm["te"][:, j]) for j in range(3)])))
        print(f"seed {seed}: production LightGBM macro AUROC {rows['LightGBM pipeline (production)'][-1]['auroc']:.3f}", flush=True)

    agg = {m: {k: (float(np.mean([r[k] for r in v])), float(np.std([r[k] for r in v]))) for k in v[0]} for m, v in rows.items()}
    return agg, curves_all, imp_all, cov_effect, {k: (float(np.mean(v)), float(np.std(v))) for k, v in miss.items()}


def learning_curves():
    from evaluate_all_models import train_ft, ft_logits, sigmoid
    big = {s: generate_cohort(CohortConfig(n=26000), seed=3000 + s) for s in SEEDS[:3]}
    out = {}
    for s, c in big.items():
        X, y, C = c["X"].astype(float), c["y"], covariates_of(c)
        te = np.arange(20000, 26000); va = np.arange(16000, 20000)
        for n in SIZES:
            tr = np.arange(n)
            idx = {"tr": tr, "va": va, "eval": {"va": (X[va], C[va]), "te": (X[te], C[te])}}
            P, *_ = lgbm_pipeline_probs(X, C, y, idx, s)
            out.setdefault("LightGBM pipeline", {}).setdefault(n, []).append(np.mean([roc_auc_score(y[te, j], P["te"][:, j]) for j in range(3)]))
            sc = StandardScaler().fit(X[tr])
            D = lambda ii: np.hstack([sc.transform(X[ii]), (C[ii] - [9.5, .6, .7]) / [1.7, .5, .5]])
            p = np.column_stack([LogisticRegression(C=0.5, max_iter=3000, class_weight="balanced").fit(D(tr), y[tr, j]).predict_proba(D(te))[:, 1] for j in range(3)])
            out.setdefault("LR + demographics", {}).setdefault(n, []).append(np.mean([roc_auc_score(y[te, j], p[:, j]) for j in range(3)]))
            p = np.column_stack([RandomForestClassifier(n_estimators=300, min_samples_leaf=5, class_weight="balanced_subsample", n_jobs=-1, random_state=s)
                                 .fit(sc.transform(X[tr]), y[tr, j]).predict_proba(sc.transform(X[te]))[:, 1] for j in range(3)])
            out.setdefault("Random forest (raw)", {}).setdefault(n, []).append(np.mean([roc_auc_score(y[te, j], p[:, j]) for j in range(3)]))
            if y[tr].sum(0).min() >= 5:
                model, _ = train_ft(sc.transform(X[tr]), y[tr], sc.transform(X[va]), y[va], "asl", s)
                p = sigmoid(ft_logits(model, sc.transform(X[te])))
                out.setdefault("FT-Transformer (ASL+Dice)", {}).setdefault(n, []).append(np.mean([roc_auc_score(y[te, j], p[:, j]) for j in range(3)]))
            print(f"  learning curve seed {s} n={n} done", flush=True)
    return {m: {str(n): (float(np.mean(v)), float(np.std(v))) for n, v in d.items()} for m, d in out.items()}


def figures(curves_all, lc, miss, imp_all):
    # boosting dynamics (seed 0)
    fig, axes = plt.subplots(1, 2, figsize=(7.16, 2.4))
    for d, col in zip(DISORDERS, (C1, C2, C3)):
        cv = curves_all[0][d]
        it = np.arange(1, len(cv["val"]["binary_logloss"]) + 1)
        axes[0].plot(it, cv["train"]["binary_logloss"], color=col, lw=1, ls="--")
        axes[0].plot(it, cv["val"]["binary_logloss"], color=col, lw=1.5, label=d)
        axes[1].plot(it, cv["val"]["auc"], color=col, lw=1.5, label=d)
    axes[0].set_xlabel("Boosting iteration"); axes[0].set_ylabel("Log-loss (solid val, dashed train)")
    axes[1].set_xlabel("Boosting iteration"); axes[1].set_ylabel("Validation AUROC")
    axes[0].legend(fontsize=6.5)
    fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_lgbm_boosting.png")); plt.close(fig)

    # learning curves
    fig, ax = plt.subplots(figsize=(3.5, 2.5))
    for (m, col) in (("LightGBM pipeline", C1), ("LR + demographics", C2), ("Random forest (raw)", C3),
                     ("FT-Transformer (ASL+Dice)", GREY)):
        if m not in lc:
            continue
        ns = sorted(lc[m], key=int)
        mu = np.array([lc[m][n][0] for n in ns]); sd = np.array([lc[m][n][1] for n in ns])
        x = [int(n) for n in ns]
        ax.plot(x, mu, color=col, lw=1.5, marker="o", ms=3, label=m)
        ax.fill_between(x, mu - sd, mu + sd, color=col, alpha=0.12, lw=0)
    ax.set_xscale("log"); ax.set_xlabel("Training children (log scale)"); ax.set_ylabel("Macro AUROC (test)")
    ax.legend(fontsize=6.3, loc="lower right")
    fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_lgbm_learning_curve.png")); plt.close(fig)

    # importance (mean gain over seeds, top 10 per disorder)
    fig, axes = plt.subplots(1, 3, figsize=(7.16, 2.6))
    for ax, d in zip(axes, DISORDERS):
        names = list(imp_all[0][d])
        g = np.mean([[imp[d][n] for n in names] for imp in imp_all], axis=0)
        g = g / g.sum()
        top = np.argsort(g)[::-1][:8][::-1]
        ax.barh([names[i].replace("_normalized", "").replace("_", " ")[:28] for i in top], g[top], color=C1)
        ax.set_title(d, fontsize=8); ax.tick_params(axis="y", labelsize=5.5); ax.set_xlabel("Share of gain")
    fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_lgbm_importance.png")); plt.close(fig)


def main():
    t0 = time.time()
    agg, curves_all, imp_all, cov_effect, miss = comparison_and_dynamics()
    lc = learning_curves()
    figures(curves_all, lc, miss, imp_all)
    best_iter = {d: float(np.mean([np.argmin(c[d]["val"]["binary_logloss"]) + 1 for c in curves_all])) for d in DISORDERS}
    single = {d: {k: float(np.mean([r[k] for r in cov_effect if r["disorder"] == d])) for k in ("single_auroc", "full_auroc")}
              for d in ("dyslexia", "dyscalculia", "dysgraphia")}
    out = {"comparison": agg, "missing_macro_auroc": miss, "learning_curves": lc,
           "best_iteration_by_val_logloss": best_iter, "single_vs_full_auroc": single,
           "runtime_s": round(time.time() - t0, 1)}
    with open(os.path.join(RES, "lightgbm_dynamics.json"), "w") as f:
        json.dump(out, f, indent=1)
    print(json.dumps({k: v for k, v in out.items() if k != "learning_curves"}, indent=1))
    print(json.dumps(lc, indent=1))


if __name__ == "__main__":
    main()
