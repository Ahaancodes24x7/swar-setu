"""
Candidate model improvements, evaluated on the same realistic cohorts and splits
as evaluate_all_models.py. Results -> results/model_improvements.json
"""

from __future__ import annotations

import json
import os
import sys
import warnings

import numpy as np

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import lightgbm as lgb
from sklearn.decomposition import FactorAnalysis
from sklearn.ensemble import RandomForestClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import SplineTransformer, StandardScaler

from evaluate_all_models import (TARGET_SENS, ece_score, op_metrics, stratified_split,
                                 threshold_for_sensitivity)
from realistic_generator import (BLOCKS, DISORDERS, MISSING_DEFAULTS, CohortConfig,
                                 generate_cohort, site_b_config)

SEEDS = [0, 1, 2, 3, 4]


def demog(c, idx=None):
    idx = np.arange(len(c["X"])) if idx is None else idx
    return np.column_stack([(c["age"][idx] - 9.5) / 1.7, c["hindi"][idx], c["finger"][idx]]).astype(float)


def miss_ind(X):
    return (np.isclose(X, MISSING_DEFAULTS[None, :])).astype(float)


class Normer:
    """Regression-based norming: residualise each feature on age, age^2, language,
    device using typically-developing training children (how test norms are built)."""

    def fit(self, X, D, y):
        typ = y.max(1) == 0
        self.m = LinearRegression().fit(self._d(D[typ]), X[typ])
        self.sd = (X[typ] - self.m.predict(self._d(D[typ]))).std(0) + 1e-6
        return self

    @staticmethod
    def _d(D):
        return np.column_stack([D, D[:, 0] ** 2])

    def transform(self, X, D):
        return (X - self.m.predict(self._d(D))) / self.sd


def per_label(make, Xtr, ytr, *Xs):
    ms = [make().fit(Xtr, ytr[:, j]) for j in range(3)]
    return [np.column_stack([m.predict_proba(X)[:, 1] for m in ms]) for X in Xs]


def lr(cw="balanced"):
    return lambda: LogisticRegression(C=0.5, max_iter=3000, class_weight=cw)


def run(seed):
    c = generate_cohort(CohortConfig(n=6000), seed=1000 + seed)
    e = generate_cohort(site_b_config(3000), seed=2000 + seed)
    X, y = c["X"], c["y"]
    tr, va, te = stratified_split(y, seed)
    D, De = demog(c), demog(e)
    sets = {"tr": (X[tr], D[tr]), "va": (X[va], D[va]), "te": (X[te], D[te]), "ex": (e["X"], De)}
    ytr, yva, yte, yex = y[tr], y[va], y[te], e["y"]

    def feats(kind):
        out = {}
        if kind == "norm":
            nm = Normer().fit(X[tr], D[tr], ytr)
        if kind == "factor":
            nm = Normer().fit(X[tr], D[tr], ytr)
            fas = {}
            for d, sl in BLOCKS.items():
                fas[d] = FactorAnalysis(n_components=2, random_state=seed).fit(nm.transform(X[tr], D[tr])[:, sl])
        for k, (Xk, Dk) in sets.items():
            if kind == "raw":
                F = Xk
            elif kind == "raw+demog":
                F = np.hstack([Xk, Dk])
            elif kind == "raw+demog+miss":
                F = np.hstack([Xk, Dk, miss_ind(Xk)])
            elif kind == "norm":
                F = np.hstack([nm.transform(Xk, Dk), miss_ind(Xk)])
            elif kind == "factor":
                Z = nm.transform(Xk, Dk)
                F = np.hstack([fas[d].transform(Z[:, sl]) for d, sl in BLOCKS.items()])
            out[k] = F
        sc = StandardScaler().fit(out["tr"])
        return {k: sc.transform(v) for k, v in out.items()}

    F = {k: feats(k) for k in ("raw", "raw+demog", "raw+demog+miss", "norm", "factor")}
    P = {}

    def add(name, kind, make):
        f = F[kind]
        P[name] = dict(zip(("va", "te", "ex"), per_label(make, f["tr"], ytr, f["va"], f["te"], f["ex"])))

    add("LR (raw 64-D)", "raw", lr())
    add("LR + demographics", "raw+demog", lr())
    add("LR + demographics + missing indicators", "raw+demog+miss", lr())
    add("LR on age/language-normed features", "norm", lr())
    add("Psychometric factors (8) + LR", "factor", lr())
    spl = lambda: __import__("sklearn.pipeline", fromlist=["make_pipeline"]).make_pipeline(
        SplineTransformer(n_knots=4, degree=3), LogisticRegression(C=0.1, max_iter=4000, class_weight="balanced"))
    add("Spline GAM-LR (normed)", "norm", spl)
    add("Random forest (normed)", "norm", lambda: RandomForestClassifier(
        n_estimators=500, min_samples_leaf=5, class_weight="balanced_subsample", n_jobs=-1, random_state=seed))
    add("LightGBM (normed)", "norm", lambda: lgb.LGBMClassifier(
        n_estimators=300, num_leaves=7, learning_rate=0.03, subsample=0.8, subsample_freq=1, colsample_bytree=0.7,
        min_child_samples=30, reg_lambda=1.0, random_state=seed, verbose=-1))
    P["Ensemble (normed LR + RF + LGBM, rank-avg)"] = {
        s: np.mean([P[m][s].argsort(0).argsort(0) / len(P[m][s]) for m in
                    ("LR on age/language-normed features", "Random forest (normed)", "LightGBM (normed)")], 0)
        for s in ("va", "te", "ex")}
    # calibrated version of the best simple model: unweighted LR + isotonic on val
    f = F["norm"]
    pv, pt, pe = per_label(lr(None), f["tr"], ytr, f["va"], f["te"], f["ex"])
    cal = [IsotonicRegression(out_of_bounds="clip").fit(pv[:, j], yva[:, j]) for j in range(3)]
    P["LR normed, unweighted + isotonic"] = {s: np.column_stack([cal[j].predict(p[:, j]) for j in range(3)])
                                            for s, p in (("va", pv), ("te", pt), ("ex", pe))}

    res = {}
    hindi = c["hindi"][te]
    young = c["age"][te] < 9
    for name, p in P.items():
        r = {"auroc": [], "auprc": [], "ece": [], "spec": [], "ppv": [], "sens": [],
             "ext_auroc": [], "ext_spec": [], "fpr_gap_lang": [], "fpr_gap_age": []}
        for j in range(3):
            t = threshold_for_sensitivity(yva[:, j], p["va"][:, j], TARGET_SENS)
            om, oe = op_metrics(yte[:, j], p["te"][:, j], t), op_metrics(yex[:, j], p["ex"][:, j], t)
            r["auroc"].append(roc_auc_score(yte[:, j], p["te"][:, j]))
            from sklearn.metrics import average_precision_score
            r["auprc"].append(average_precision_score(yte[:, j], p["te"][:, j]))
            r["ece"].append(ece_score(yte[:, j], p["te"][:, j]))
            r["spec"].append(om["spec"]); r["ppv"].append(om["ppv"]); r["sens"].append(om["sens"])
            r["ext_auroc"].append(roc_auc_score(yex[:, j], p["ex"][:, j])); r["ext_spec"].append(oe["spec"])
            fl = p["te"][:, j] >= t; neg = yte[:, j] == 0
            r["fpr_gap_lang"].append(abs(fl[neg & hindi].mean() - fl[neg & ~hindi].mean()))
            r["fpr_gap_age"].append(abs(fl[neg & young].mean() - fl[neg & (c["age"][te] >= 11)].mean()))
        res[name] = {k: float(np.mean(v)) for k, v in r.items()}
    return res


def main():
    runs = [run(s) for s in SEEDS]
    names = list(runs[0])
    summ = {n: {k: (float(np.mean([r[n][k] for r in runs])), float(np.std([r[n][k] for r in runs])))
                for k in runs[0][n]} for n in names}
    with open(os.path.join(HERE, "results", "model_improvements.json"), "w") as f:
        json.dump(summ, f, indent=1)
    cols = ["auroc", "auprc", "ece", "spec", "ppv", "ext_auroc", "ext_spec", "fpr_gap_lang", "fpr_gap_age"]
    print(f"{'model':46s}" + "".join(f"{c:>13s}" for c in cols))
    for n in names:
        print(f"{n:46s}" + "".join(f"{summ[n][c][0]:7.3f}±{summ[n][c][1]:.3f}" for c in cols))


if __name__ == "__main__":
    main()
