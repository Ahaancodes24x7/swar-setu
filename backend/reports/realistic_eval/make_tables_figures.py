"""Aggregate all_results.json into tables (Markdown + LaTeX) and figures."""

from __future__ import annotations

import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import roc_curve

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, "results")
FIG = os.path.join(RES, "figures")
os.makedirs(FIG, exist_ok=True)
D = ["Dyslexia", "Dyscalculia", "Dysgraphia"]

# reference palette (dataviz skill), slots 1-3 + neutral for context series
C1, C2, C3, GREY = "#2a78d6", "#eb6834", "#1baf7a", "#8a8984"
INK, INK2 = "#0b0b0b", "#52514e"
plt.rcParams.update({"font.family": "serif", "font.size": 8, "axes.edgecolor": INK2,
                     "axes.labelcolor": INK, "xtick.color": INK2, "ytick.color": INK2,
                     "axes.spines.top": False, "axes.spines.right": False,
                     "axes.grid": True, "grid.color": "#e6e5e0", "grid.linewidth": 0.5,
                     "legend.frameon": False, "savefig.dpi": 300})

with open(os.path.join(RES, "all_results.json")) as f:
    R = json.load(f)
runs = R["runs"]
models = list(runs[0]["models"].keys())


def agg(fn):
    v = np.array([fn(r) for r in runs], dtype=float)
    return np.nanmean(v), np.nanstd(v)


def ms(m, s, d=3):
    return f"{m:.{d}f} +/- {s:.{d}f}"


out = {}

# ---- Table: main comparison (macro over disorders) ------------------------
rows = []
for m in models:
    g = lambda key, split="test": agg(lambda r: np.mean([r["models"][m][split][d][key] for d in D]))
    rows.append({"model": m, "auroc": g("auroc"), "auprc": g("auprc"), "brier": g("brier"), "ece": g("ece"),
                 "sens": g("op_sens"), "spec": g("op_spec"), "ppv": g("op_ppv"), "npv": g("op_npv"),
                 "ext_auroc": g("auroc", "external"), "ext_sens": g("op_sens", "external"),
                 "ext_spec": g("op_spec", "external"),
                 "true_auroc": agg(lambda r: np.mean([r["models"][m]["test_true_labels_auroc"][d] for d in D]))})
out["main"] = rows

# ---- Table: per disorder for key models -----------------------------------
key_models = ["Logistic Regression", "LR + demographics", "XGBoost", "FT-Transformer (ASL+Dice)",
              "FT-Transformer (BCE)", "D1 Deployed FT (as served)", "D3 Deployed single-test (0.5 fill)"]
per = {m: {d: {k: agg(lambda r: r["models"][m]["test"][d][k]) for k in
               ("auroc", "auprc", "op_sens", "op_spec", "op_ppv", "op_npv")} for d in D} for m in key_models}
out["per_disorder"] = per

# ---- Deployed operating point (its own thresholds) ------------------------
dep = {m: {d: {k: agg(lambda r: r["models"][m]["test"][d][f"dep_{k}"]) for k in ("sens", "spec", "flag_rate")}
           for d in D} for m in models if m.startswith(("D1", "D2", "D3"))}
out["deployed_operating_point"] = dep

# ---- single-test scenario ----------------------------------------------
st = {d: {k: {mm: agg(lambda r: r["single_test"][d][k][mm]) for mm in ("auroc", "auprc", "op_spec")}
          for k in runs[0]["single_test"][d]} for d in D}
for d in D:
    st[d]["D3 Deployed single-test (0.5 fill)"] = {
        "auroc": agg(lambda r: r["models"]["D3 Deployed single-test (0.5 fill)"]["test"][d]["auroc"]),
        "auprc": agg(lambda r: r["models"]["D3 Deployed single-test (0.5 fill)"]["test"][d]["auprc"]),
        "op_spec": agg(lambda r: r["models"]["D3 Deployed single-test (0.5 fill)"]["test"][d]["op_spec"])}
out["single_test"] = st

# ---- fairness: language FPR/TPR at operating point -----------------------
fair = {}
for m in ["Logistic Regression", "LR + demographics", "FT-Transformer (ASL+Dice)", "XGBoost"]:
    fair[m] = {}
    for d in D:
        sg = lambda grp, k: agg(lambda r: r["models"][m]["subgroups"][d][grp][k])
        fair[m][d] = {"fpr_en": sg("English-dominant", "fpr"), "fpr_hi": sg("Hindi-dominant", "fpr"),
                      "tpr_en": sg("English-dominant", "tpr"), "tpr_hi": sg("Hindi-dominant", "tpr"),
                      "fpr_7_8": sg("Age 7-8", "fpr"), "fpr_11_12": sg("Age 11-12", "fpr")}
out["fairness"] = fair

# ---- uncertainty / conformal / calibration -------------------------------
out["mc_dropout"] = {d: {k: agg(lambda r: r["mc_dropout_uncertainty"][d][k]) for k in runs[0]["mc_dropout_uncertainty"][d]} for d in D}
out["conformal_lac"] = {d: {k: agg(lambda r: r["conformal_lac_ft_ts"][d][k]) for k in runs[0]["conformal_lac_ft_ts"][d]} for d in D}
out["deployed_interval"] = {d: {k: agg(lambda r: r["deployed_fixed_interval_coverage"][d][k]) for k in ("coverage", "coverage_pos")} for d in D}
out["temperature"] = agg(lambda r: r["ft_training"]["asl"]["temperature"])
out["ft_epochs"] = {l: agg(lambda r: r["ft_training"][l]["epochs"]) for l in ("asl", "bce")}
out["missing"] = {m: {k: agg(lambda r: r["models"][m]["missing_macro_auroc"][k]) for k in runs[0]["models"][m]["missing_macro_auroc"]}
                  for m in models if "missing_macro_auroc" in runs[0]["models"][m]}
out["cohort"] = {k: agg(lambda r: r["cohort"][k]) for k in runs[0]["cohort"]}
out["external"] = {k: agg(lambda r: r["external"][k]) for k in runs[0]["external"]}
out["deployed_score_stats_seed0"] = runs[0]["deployed_score_stats"]
out["lr_top_features_seed0"] = runs[0]["lr_top_features"]
out["latency"] = R["latency_deployed_profile"]
out["original_generator"] = R["original_generator"]

with open(os.path.join(RES, "summary.json"), "w") as f:
    json.dump(out, f, indent=1, default=lambda x: list(x) if isinstance(x, tuple) else float(x))

# ---- markdown table ----------------------------------------------------------
lines = ["| Model | AUROC | AUPRC | Brier | ECE | Sens@op | Spec@op | PPV@op | Ext. AUROC | Ext. Sens | Ext. Spec |",
         "|---|---|---|---|---|---|---|---|---|---|---|"]
for r in rows:
    lines.append("| " + " | ".join([r["model"]] + [ms(*r[k]) for k in
                 ("auroc", "auprc", "brier", "ece", "sens", "spec", "ppv", "ext_auroc", "ext_sens", "ext_spec")]) + " |")
with open(os.path.join(RES, "table_main.md"), "w", encoding="utf8") as f:
    f.write("\n".join(lines))
print("\n".join(lines))

# ---- figures ---------------------------------------------------------------
z = np.load(os.path.join(RES, "seed0_predictions.npz"))
yte = z["y_test"]
series = [("LR + demographics", C1, "-"), ("FT-Transformer (ASL+Dice)", C2, "-"),
          ("D1 Deployed FT (as served)", C3, "-"), ("D4 Legacy *_nn_model (random weights)", GREY, "--")]
labels = {"LR + demographics": "LR + demographics", "FT-Transformer (ASL+Dice)": "FT-Transformer (retrained)",
          "D1 Deployed FT (as served)": "Deployed FT (as served)",
          "D4 Legacy *_nn_model (random weights)": "Legacy random-weight NN"}
fig, axes = plt.subplots(1, 3, figsize=(7.16, 2.4), sharey=True)
for j, (ax, d) in enumerate(zip(axes, D)):
    ax.plot([0, 1], [0, 1], color="#c9c8c2", lw=0.8)
    for m, c, ls in series:
        fpr, tpr, _ = roc_curve(yte[:, j], z[f"test::{m}"][:, j])
        ax.plot(fpr, tpr, color=c, lw=1.5, ls=ls, label=labels[m])
    ax.set_title(d, fontsize=9, color=INK); ax.set_xlabel("False positive rate")
    ax.set_xlim(0, 1); ax.set_ylim(0, 1.01)
axes[0].set_ylabel("True positive rate")
axes[0].legend(loc="lower right", fontsize=6.5)
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_roc.png")); plt.close(fig)

# calibration (reliability) for dyslexia, pooled over disorders
def rel(y, p, nb=10):
    b = np.linspace(0, 1, nb + 1); idx = np.clip(np.digitize(p, b[1:-1]), 0, nb - 1)
    xs, ys = [], []
    for i in range(nb):
        m = idx == i
        if m.sum() >= 10:
            xs.append(p[m].mean()); ys.append(y[m].mean())
    return xs, ys
fig, ax = plt.subplots(figsize=(3.5, 2.6))
ax.plot([0, 1], [0, 1], color="#c9c8c2", lw=0.8)
for m, c, lab in (("Logistic Regression", C1, "LR (class-weighted)"),
                  ("FT-Transformer (ASL+Dice)", C2, "FT (ASL+Dice)"),
                  ("FT-Transformer (BCE)", C3, "FT (BCE)"),
                  ("D1 Deployed FT (as served)", GREY, "Deployed FT")):
    xs, ys = rel(yte.ravel(), z[f"test::{m}"].ravel())
    ax.plot(xs, ys, color=c, lw=1.5, marker="o", ms=3, label=lab)
ax.set_xlabel("Mean predicted probability"); ax.set_ylabel("Observed frequency")
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.legend(fontsize=6.5, loc="upper left")
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_calibration.png")); plt.close(fig)

# missing-data robustness
fig, ax = plt.subplots(figsize=(3.5, 2.4))
for m, c, lab in (("Logistic Regression", C1, "LR"), ("FT-Transformer (ASL+Dice)", C2, "FT-Transformer"),
                  ("XGBoost", C3, "XGBoost"), ("D1 Deployed FT (as served)", GREY, "Deployed FT")):
    ks = sorted(out["missing"][m], key=float)
    mu = [out["missing"][m][k][0] for k in ks]; sd = [out["missing"][m][k][1] for k in ks]
    x = [100 * float(k) for k in ks]
    ax.plot(x, mu, color=c, lw=1.5, marker="o", ms=3, label=lab)
    ax.fill_between(x, np.array(mu) - sd, np.array(mu) + sd, color=c, alpha=0.12, lw=0)
ax.set_xlabel("Additional items missing at test time (%)"); ax.set_ylabel("Macro AUROC")
ax.legend(fontsize=6.5, ncol=2, loc="lower left")
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_missing.png")); plt.close(fig)

# fairness: FPR by language
fig, axes = plt.subplots(1, 2, figsize=(3.5, 2.3), sharey=True)
for ax, m, title in ((axes[0], "FT-Transformer (ASL+Dice)", "FT-Transformer"), (axes[1], "LR + demographics", "LR + demographics")):
    x = np.arange(3); w = 0.36
    en = [fair[m][d]["fpr_en"][0] for d in D]; hi = [fair[m][d]["fpr_hi"][0] for d in D]
    ax.bar(x - w / 2 - 0.01, en, w, color=C1, label="English-dominant")
    ax.bar(x + w / 2 + 0.01, hi, w, color=C2, label="Hindi-dominant")
    ax.set_xticks(x); ax.set_xticklabels(["DLX", "DCL", "DGR"]); ax.set_title(title, fontsize=8, color=INK)
axes[0].set_ylabel("False positive rate @ sens 0.85")
h, l = axes[0].get_legend_handles_labels()
fig.legend(h, l, fontsize=6.5, loc="upper center", ncol=2)
fig.tight_layout(rect=(0, 0, 1, 0.9)); fig.savefig(os.path.join(FIG, "fig_fairness.png")); plt.close(fig)
print("figures ->", FIG)
