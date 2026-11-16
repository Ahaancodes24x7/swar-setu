"""
Re-evaluation with the DSM-5 student profile.

Cohorts include DSM-5 Criterion D factors (children still learning the language of
instruction, uncorrected vision / hearing problems) and a teacher questionnaire
(Criterion A symptom ratings, Criterion B attainment). Compares:
  tests only | tests + questionnaire | questionnaire only | LR + demographics (tests)
and the effect of the DSM-5 exclusion rule (Criterion D -> "address first, re-screen")
on referrals and on false positives among language learners.

Outputs -> results/dsm5_evaluation.json
"""

from __future__ import annotations

import json
import os
import sys
import warnings
from dataclasses import replace

import numpy as np

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(os.path.dirname(HERE))
sys.path[:0] = [HERE, BACKEND]

import lightgbm as lgb
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

from screening.metrics import ece_score, op_metrics, score_metrics, threshold_for_sensitivity
from screening.model import LGBM_PARAMS, Normer, _split, covariates_of, model_inputs
from screening.synthetic_cohort import DISORDERS, dsm5_config, generate_cohort, site_b_config

RES = os.path.join(HERE, "results")
SEEDS = [0, 1, 2, 3, 4]
N_BOOT = 1000
MODELS = ["Tests + questionnaire", "Tests only", "Questionnaire only", "LR + demographics (tests)"]
Q_COLS = {0: [0, 1], 1: [4, 5], 2: [2, 3]}  # disorder index -> questionnaire columns (reading, math, writing)


def site_b_dsm5(n=3000):
    b = site_b_config(n)
    return replace(b, p_language_developing=0.35, p_language_limited=0.15, p_vision_concern=0.08, p_hearing_concern=0.05)


def fit_all(c, e, seed):
    X, y, C, Q = c["X"].astype(float), c["y"], covariates_of(c), c["questionnaire"]
    Xe, Ce, Qe = e["X"].astype(float), covariates_of(e), e["questionnaire"]
    tr, va, te = _split(y, seed)
    normer = Normer().fit(X[tr], C[tr], typical=y[tr].max(1) == 0)
    out = {m: {} for m in MODELS}
    out["Tests + questionnaire (no questionnaire at test)"] = {}

    def lgbm(F, Fe, j, Fte_override=None):
        clf = lgb.LGBMClassifier(**LGBM_PARAMS, random_state=seed).fit(F[tr], y[tr, j])
        r = {"va": clf.predict_proba(F[va])[:, 1], "te": clf.predict_proba(F[te])[:, 1], "ex": clf.predict_proba(Fe)[:, 1]}
        if Fte_override is not None:
            r["te_noq"] = clf.predict_proba(Fte_override)[:, 1]
        return r

    Ftq, Fetq = model_inputs(X, C, normer, "full", Q), model_inputs(Xe, Ce, normer, "full", Qe)
    Fnoq = model_inputs(X[te], C[te], normer, "full", np.full((len(te), 6), np.nan))
    Ft, Fet = model_inputs(X, C, normer, "full"), model_inputs(Xe, Ce, normer, "full")
    sc = StandardScaler().fit(X[tr])
    D = np.hstack([sc.transform(X), (C - [9.5, .6, .7]) / [1.7, .5, .5]])
    De = np.hstack([sc.transform(Xe), (Ce - [9.5, .6, .7]) / [1.7, .5, .5]])
    preds = {m: np.zeros((3, 3), dtype=object) for m in MODELS}
    P = {m: {k: np.zeros((len(idx), 3)) for k, idx in (("va", va), ("te", te), ("ex", np.arange(len(Xe))))} for m in MODELS}
    P["Tests + questionnaire (no questionnaire at test)"] = {"va": None, "te": np.zeros((len(te), 3))}
    for j in range(3):
        r = lgbm(Ftq, Fetq, j, Fnoq)
        for k in ("va", "te", "ex"):
            P["Tests + questionnaire"][k][:, j] = r[k]
        P["Tests + questionnaire (no questionnaire at test)"]["te"][:, j] = r["te_noq"]
        r = lgbm(Ft, Fet, j)
        for k in ("va", "te", "ex"):
            P["Tests only"][k][:, j] = r[k]
        Fq = np.hstack([Q[:, Q_COLS[j]], C])
        Fqe = np.hstack([Qe[:, Q_COLS[j]], Ce])
        r = lgbm(Fq, Fqe, j)
        for k in ("va", "te", "ex"):
            P["Questionnaire only"][k][:, j] = r[k]
        lr = LogisticRegression(C=0.5, max_iter=3000, class_weight="balanced").fit(D[tr], y[tr, j])
        P["LR + demographics (tests)"]["va"][:, j] = lr.predict_proba(D[va])[:, 1]
        P["LR + demographics (tests)"]["te"][:, j] = lr.predict_proba(D[te])[:, 1]
        P["LR + demographics (tests)"]["ex"][:, j] = lr.predict_proba(De)[:, 1]
    P["Tests + questionnaire (no questionnaire at test)"]["va"] = P["Tests + questionnaire"]["va"]
    return P, (tr, va, te)


def summarise(P, y, yva, yte, yex, groups):
    out = {}
    for m, p in P.items():
        r = {k: [] for k in ("auroc", "auprc", "ece", "sens", "spec", "ppv", "ext_auroc", "fpr_fluent", "fpr_learner",
                             "fpr_acuity")}
        for j in range(3):
            s = score_metrics(yte[:, j], p["te"][:, j])
            t = threshold_for_sensitivity(yva[:, j], p["va"][:, j], 0.85)
            o = op_metrics(yte[:, j], p["te"][:, j], t)
            for k in ("auroc", "auprc", "ece"):
                r[k].append(s[k])
            for k in ("sens", "spec", "ppv"):
                r[k].append(o[k])
            if "ex" in p:
                r["ext_auroc"].append(roc_auc_score(yex[:, j], p["ex"][:, j]))
            flag = p["te"][:, j] >= t
            neg = yte[:, j] == 0
            r["fpr_fluent"].append(flag[neg & groups["fluent"]].mean())
            r["fpr_learner"].append(flag[neg & groups["learner"]].mean())
            r["fpr_acuity"].append(flag[neg & groups["acuity"]].mean())
        out[m] = {k: float(np.mean(v)) for k, v in r.items() if v}
    return out


def dsm5_rule(p_va, p_te, yva, yte, excluded, teacher_symptom):
    """Referral with and without the DSM-5 rules, for the tests + questionnaire model.
    exclusion rule: flagged children with a Criterion D factor -> 'address first' instead of 'refer'."""
    res = {"no_rule": [], "exclusion_rule": [], "excluded_true_cases": [], "excluded_false_positives": []}
    for j in range(3):
        t = threshold_for_sensitivity(yva[:, j], p_va[:, j], 0.85)
        flag = p_te[:, j] >= t
        y = yte[:, j]
        # domain-specific Criterion D: language/vision/hearing explain reading and writing, not maths
        ex = excluded if j != 1 else np.zeros_like(excluded)
        refer = flag & ~ex
        for name, f in (("no_rule", flag), ("exclusion_rule", refer)):
            res[name].append(op_metrics(y, f.astype(float), 0.5) | {"refer_rate": float(f.mean())})
        res["excluded_true_cases"].append(float((flag & ex & (y == 1)).sum() / max((flag & (y == 1)).sum(), 1)))
        res["excluded_false_positives"].append(float((flag & ex & (y == 0)).sum() / max((flag & (y == 0)).sum(), 1)))
    agg = lambda L: {k: float(np.mean([d[k] for d in L])) for k in L[0]}
    return {"no_rule": agg(res["no_rule"]), "exclusion_rule": agg(res["exclusion_rule"]),
            "share_of_true_positives_routed_to_exclusion_review": float(np.mean(res["excluded_true_cases"])),
            "share_of_false_positives_routed_to_exclusion_review": float(np.mean(res["excluded_false_positives"]))}


def main():
    per_seed, rules, boots = [], [], {"Tests only": [], "Questionnaire only": [], "LR + demographics (tests)": []}
    rng = np.random.default_rng(0)
    for seed in SEEDS:
        c = generate_cohort(dsm5_config(6000), seed=1000 + seed)
        e = generate_cohort(site_b_dsm5(3000), seed=2000 + seed)
        P, (tr, va, te) = fit_all(c, e, seed)
        y, yva, yte, yex = c["y"], c["y"][va], c["y"][te], e["y"]
        prof = c["proficiency"][te]
        acuity = c["vision_concern"][te] | c["hearing_concern"][te]
        groups = {"fluent": prof == 0, "learner": prof > 0, "acuity": acuity}
        per_seed.append(summarise(P, y, yva, yte, yex, groups))
        excluded = (prof > 0) | acuity  # Criterion D factors recorded in the profile
        rules.append(dsm5_rule(P["Tests + questionnaire"]["va"], P["Tests + questionnaire"]["te"], yva, yte, excluded, None))
        # paired bootstrap: tests + questionnaire minus each model (macro AUROC)
        for _ in range(N_BOOT):
            idx = rng.integers(0, len(te), len(te))
            base = np.mean([roc_auc_score(yte[idx, j], P["Tests + questionnaire"]["te"][idx, j]) for j in range(3)])
            for m in boots:
                boots[m].append((seed, base - np.mean([roc_auc_score(yte[idx, j], P[m]["te"][idx, j]) for j in range(3)])))
        print(f"seed {seed}: " + " | ".join(f"{m}={per_seed[-1][m]['auroc']:.3f}" for m in per_seed[-1]), flush=True)

    models = list(per_seed[0])
    agg = {m: {k: (float(np.mean([s[m][k] for s in per_seed])), float(np.std([s[m][k] for s in per_seed])))
               for k in per_seed[0][m]} for m in models}
    # bootstrap: average across seeds within each replicate index
    diffs = {}
    for m, v in boots.items():
        arr = np.array([d for _, d in v]).reshape(len(SEEDS), N_BOOT).mean(0)
        diffs[m] = {"diff": [float(arr.mean()), float(np.percentile(arr, 2.5)), float(np.percentile(arr, 97.5))],
                    "p_le_0": float((arr <= 0).mean())}
    rule = {k: ({kk: float(np.mean([r[k][kk] for r in rules])) for kk in rules[0][k]} if isinstance(rules[0][k], dict)
                else float(np.mean([r[k] for r in rules]))) for k in rules[0]}
    out = {"seeds": SEEDS, "models": agg, "bootstrap_tests_plus_questionnaire_minus": diffs, "dsm5_exclusion_rule": rule}
    with open(os.path.join(RES, "dsm5_evaluation.json"), "w") as f:
        json.dump(out, f, indent=1)
    print(json.dumps({"models": {m: {k: round(v[0], 3) for k, v in d.items()} for m, d in agg.items()},
                      "bootstrap": diffs, "rule": rule}, indent=1))


if __name__ == "__main__":
    main()
