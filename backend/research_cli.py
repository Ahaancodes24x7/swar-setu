"""Research data tools: export the collected screenings, load clinician diagnoses, and
evaluate / retrain the screening models on real children.

    python research_cli.py export                       # CSVs + labels template -> SwarSetuData/exports/<time>/
    python research_cli.py import-labels labels.csv     # clinician diagnoses (0/1) back into the store
    python research_cli.py evaluate                     # metrics of the served model on labelled children
    python research_cli.py retrain [--save]             # cross-validated real-data retraining (synthetic -> real)

Every command reads the same store the app writes to (PostgreSQL / SQLite fallback).
Results are written next to the data (outside OneDrive), never into the repository.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from config import load_environment  # noqa: E402

load_environment()

import numpy as np  # noqa: E402

DISORDERS = ("dyslexia", "dyscalculia", "dysgraphia")
DATA_ROOT = os.environ.get("SWARSETU_DATA_DIR", os.path.join(os.path.expanduser("~"), "SwarSetuData"))
# below this many positives and negatives a metric is reported but flagged as unreliable
MIN_PER_CLASS = 10


def _store():
    from storage import get_store
    return get_store()


def _out_dir(kind: str) -> str:
    path = os.path.join(DATA_ROOT, kind, datetime.now().strftime("%Y%m%d-%H%M%S"))
    os.makedirs(path, exist_ok=True)
    return path


def _all_assessments() -> List[Dict[str, Any]]:
    store, rows, offset = _store(), [], 0
    while True:
        page = store.list_assessments(limit=500, offset=offset, include_payload=True)
        rows += page
        if len(page) < 500:
            return rows
        offset += 500


def _disorder_results(row: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Per-disorder served result, keyed by lowercase disorder name."""
    pred = row.get("prediction") or {}
    found = (pred.get("full_profile") or {}).get("disorders") or {}
    return {k.lower(): v for k, v in found.items()}


def _latest_labels() -> Dict[Tuple[str, str], Dict[str, Any]]:
    """(assessment_id, disorder) -> most recent recorded diagnosis."""
    labels = {}
    for o in _store().list_outcomes():
        if o.get("assessment_id"):
            labels[(str(o["assessment_id"]), o["disorder"])] = o
    return labels


# ---------------------------------------------------------------------------
# export
# ---------------------------------------------------------------------------

def cmd_export(_args) -> None:
    from ai.feature_extractors import get_feature_names
    names = get_feature_names()
    rows = _all_assessments()
    labels = _latest_labels()
    out = _out_dir("exports")

    with open(os.path.join(out, "assessments.csv"), "w", newline="", encoding="utf8") as f:
        w = csv.writer(f)
        head = ["assessment_id", "created_at", "student_id", "session_id", "disorder_type", "screening_mode", "model_id",
                "age_years", "hindi_dominant", "finger_input", "imputed_covariates", "questionnaire_used"]
        for d in DISORDERS:
            head += [f"{d}_risk", f"{d}_threshold", f"{d}_flagged", f"{d}_decision", f"{d}_diagnosis", f"{d}_dx_source"]
        w.writerow(head + [f"f:{n}" for n in names])
        for r in rows:
            cov = r.get("covariates") or {}
            res = _disorder_results(r)
            line = [r["id"], r["created_at"], r.get("student_id"), r.get("session_id"), r.get("disorder_type"),
                    r.get("screening_mode"), r.get("model_id"), cov.get("age_years"), cov.get("hindi_dominant"),
                    cov.get("finger_input"), ";".join(cov.get("imputed") or []), cov.get("questionnaire_used")]
            for d in DISORDERS:
                v = res.get(d) or {}
                lab = labels.get((r["id"], d)) or {}
                line += [v.get("risk_score"), v.get("threshold_used"), v.get("flagged"), v.get("screening_decision"),
                         lab.get("diagnosis"), lab.get("source")]
            w.writerow(line + list(r.get("feature_vector") or [None] * len(names)))

    with open(os.path.join(out, "raw_payloads.jsonl"), "w", encoding="utf8") as f:
        for r in rows:
            f.write(json.dumps({"assessment_id": r["id"], "created_at": r["created_at"], "student_id": r.get("student_id"),
                                "disorder_type": r.get("disorder_type"), "raw_payload": r.get("raw_payload"),
                                "covariates": r.get("covariates")}, default=str) + "\n")

    with open(os.path.join(out, "outcomes.csv"), "w", newline="", encoding="utf8") as f:
        w = csv.writer(f)
        w.writerow(["outcome_id", "created_at", "assessment_id", "student_id", "disorder", "diagnosis", "source", "notes"])
        for o in _store().list_outcomes():
            w.writerow([o["id"], o["created_at"], o.get("assessment_id"), o.get("student_id"), o["disorder"],
                        o["diagnosis"], o["source"], o.get("notes")])

    # profiles (DSM-5 questionnaire) for every student that was screened
    store = _store()
    students = sorted({r.get("student_id") for r in rows if r.get("student_id")})
    profiles = {s: store.get_profile(s) for s in students}
    keys = sorted({k for p in profiles.values() if p for k in p["answers"]})
    with open(os.path.join(out, "profiles.csv"), "w", newline="", encoding="utf8") as f:
        w = csv.writer(f)
        w.writerow(["student_id", "updated_at", "filled_by", "schema_version"] + keys)
        for s, p in profiles.items():
            if p:
                w.writerow([s, p["updated_at"], p.get("filled_by"), p["schema_version"]] +
                           [json.dumps(p["answers"].get(k)) if isinstance(p["answers"].get(k), (list, dict)) else p["answers"].get(k) for k in keys])

    # template for the clinician: one row per screening, fill 0/1 per disorder that was assessed
    with open(os.path.join(out, "labels_template.csv"), "w", newline="", encoding="utf8") as f:
        w = csv.writer(f)
        w.writerow(["assessment_id", "student_id", "screened_on", "disorder_type"] + [f"{d}_diagnosis" for d in DISORDERS]
                   + ["source", "notes"])
        for r in rows:
            w.writerow([r["id"], r.get("student_id"), str(r["created_at"])[:10], r.get("disorder_type")]
                       + [(labels.get((r["id"], d)) or {}).get("diagnosis", "") for d in DISORDERS] + ["", ""])

    print(f"Exported {len(rows)} screenings, {len(students)} students -> {out}")
    print("  assessments.csv     one row per screening: covariates, served risk per disorder, labels, 64 features")
    print("  raw_payloads.jsonl  exactly what each test sent (for re-extracting features)")
    print("  profiles.csv        DSM-5 teacher questionnaire answers")
    print("  outcomes.csv        recorded diagnoses")
    print("  labels_template.csv give to the clinician; fill 0/1 and run import-labels")


# ---------------------------------------------------------------------------
# import-labels
# ---------------------------------------------------------------------------

def cmd_import_labels(args) -> None:
    store = _store()
    existing = {(str(o.get("assessment_id")), o["disorder"], o["source"]): o for o in store.list_outcomes()}
    added = skipped = 0
    problems = []
    with open(args.csv, newline="", encoding="utf-8-sig") as f:
        for n, row in enumerate(csv.DictReader(f), start=2):
            aid = (row.get("assessment_id") or "").strip()
            source = (row.get("source") or args.source or "").strip()
            for d in DISORDERS:
                raw = (row.get(f"{d}_diagnosis") or "").strip()
                if raw == "":
                    continue
                if raw not in ("0", "1"):
                    problems.append(f"line {n}: {d}_diagnosis must be 0 or 1, got {raw!r}")
                    continue
                if not source:
                    problems.append(f"line {n}: no source (who made the diagnosis); use the column or --source")
                    continue
                prev = existing.get((aid, d, source))
                if prev and int(prev["diagnosis"]) == int(raw):
                    skipped += 1
                    continue
                try:
                    store.add_outcome(assessment_id=aid, disorder=d, diagnosis=int(raw), source=source,
                                      notes=(row.get("notes") or None))
                    added += 1
                except KeyError:
                    problems.append(f"line {n}: unknown assessment_id {aid}")
                except ValueError as e:
                    problems.append(f"line {n}: {e}")
    print(f"Added {added} diagnoses, {skipped} already recorded.")
    for p in problems:
        print("  !", p)


# ---------------------------------------------------------------------------
# metrics with confidence intervals
# ---------------------------------------------------------------------------

def _wilson(k: int, n: int, z: float = 1.96) -> Optional[List[float]]:
    if n == 0:
        return None
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(max(0.0, c - h), 4), round(min(1.0, c + h), 4)]


def _bootstrap_auc(y: np.ndarray, p: np.ndarray, reps: int = 2000, seed: int = 0) -> Optional[List[float]]:
    from sklearn.metrics import roc_auc_score
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(reps):
        i = rng.integers(0, len(y), len(y))
        if 0 < y[i].sum() < len(i):
            vals.append(roc_auc_score(y[i], p[i]))
    return [round(float(np.percentile(vals, 2.5)), 4), round(float(np.percentile(vals, 97.5)), 4)] if vals else None


def _metrics(y: np.ndarray, p: np.ndarray, thr: np.ndarray) -> Dict[str, Any]:
    from screening.metrics import ece_score
    from sklearn.metrics import average_precision_score, roc_auc_score
    pos, neg = int(y.sum()), int(len(y) - y.sum())
    flag = p >= thr
    tp, fn = int((flag & (y == 1)).sum()), int((~flag & (y == 1)).sum())
    fp, tn = int((flag & (y == 0)).sum()), int((~flag & (y == 0)).sum())
    out: Dict[str, Any] = {
        "n": int(len(y)), "positives": pos, "negatives": neg, "prevalence": round(pos / len(y), 4),
        "reliable": pos >= MIN_PER_CLASS and neg >= MIN_PER_CLASS,
        "confusion": {"tp": tp, "fn": fn, "fp": fp, "tn": tn},
        "sensitivity": round(tp / pos, 4) if pos else None, "sensitivity_ci": _wilson(tp, pos),
        "specificity": round(tn / neg, 4) if neg else None, "specificity_ci": _wilson(tn, neg),
        "ppv": round(tp / (tp + fp), 4) if tp + fp else None, "ppv_ci": _wilson(tp, tp + fp),
        "npv": round(tn / (tn + fn), 4) if tn + fn else None, "npv_ci": _wilson(tn, tn + fn),
        "brier": round(float(np.mean((p - y) ** 2)), 4), "ece": round(ece_score(y, p), 4),
    }
    if pos and neg:
        out.update({"auroc": round(float(roc_auc_score(y, p)), 4), "auroc_ci": _bootstrap_auc(y, p),
                    "auprc": round(float(average_precision_score(y, p)), 4)})
    return out


def _labelled(min_rows: int = 1):
    """Per disorder: list of (row, served result, label) for screenings with a recorded diagnosis."""
    rows, labels = _all_assessments(), _latest_labels()
    per: Dict[str, List[Tuple[Dict, Dict, int]]] = {d: [] for d in DISORDERS}
    for r in rows:
        res = _disorder_results(r)
        for d in DISORDERS:
            lab = labels.get((r["id"], d))
            if lab is not None and d in res:
                per[d].append((r, res[d], int(lab["diagnosis"])))
    return per, len(rows)


def _write_report(out: str, name: str, payload: Dict[str, Any], lines: List[str]) -> None:
    with open(os.path.join(out, f"{name}.json"), "w", encoding="utf8") as f:
        json.dump(payload, f, indent=1, default=str)
    with open(os.path.join(out, f"{name}.md"), "w", encoding="utf8") as f:
        f.write("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"\nSaved -> {out}")


def _fmt(v, ci=None) -> str:
    if v is None:
        return "–"
    return f"{v:.3f}" + (f" ({ci[0]:.3f}–{ci[1]:.3f})" if ci else "")


# ---------------------------------------------------------------------------
# evaluate: the served model, exactly as it scored each child
# ---------------------------------------------------------------------------

def cmd_evaluate(_args) -> None:
    per, total = _labelled()
    out = _out_dir("evaluations")
    report: Dict[str, Any] = {"generated_at": datetime.now().isoformat(), "screenings_total": total, "disorders": {}}
    lines = [f"# Screening model on real children ({datetime.now():%Y-%m-%d})", "",
             f"Screenings stored: {total}. Scores are the risks the app showed at screening time (no re-scoring).", "",
             "| Disorder | n (pos) | AUROC (95% CI) | Sensitivity (95% CI) | Specificity (95% CI) | PPV | NPV | Brier |",
             "|---|---|---|---|---|---|---|---|"]
    for d in DISORDERS:
        items = per[d]
        if not items:
            lines.append(f"| {d} | 0 | – | – | – | – | – | – |")
            continue
        y = np.array([lab for _, _, lab in items], dtype=int)
        p = np.array([float(res["risk_score"]) for _, res, _ in items])
        thr = np.array([float(res["threshold_used"]) for _, res, _ in items])
        m = _metrics(y, p, thr)
        # subgroup false-positive rates (fairness), where covariates are known
        hindi = np.array([(r.get("covariates") or {}).get("hindi_dominant") for r, _, _ in items], dtype=object)
        sub = {}
        for name, mask in (("hindi_dominant", hindi == True), ("english_dominant", hindi == False)):  # noqa: E712
            neg = mask & (y == 0)
            if neg.any():
                sub[f"fpr_{name}"] = {"n_neg": int(neg.sum()), "fpr": round(float((p[neg] >= thr[neg]).mean()), 4)}
        m["subgroups"] = sub
        m["models"] = sorted({r.get("model_id") for r, _, _ in items})
        report["disorders"][d] = m
        star = "" if m["reliable"] else " *"
        lines.append(f"| {d}{star} | {m['n']} ({m['positives']}) | {_fmt(m.get('auroc'), m.get('auroc_ci'))} | "
                     f"{_fmt(m['sensitivity'], m['sensitivity_ci'])} | {_fmt(m['specificity'], m['specificity_ci'])} | "
                     f"{_fmt(m['ppv'])} | {_fmt(m['npv'])} | {_fmt(m['brier'])} |")
    from screening.model import REFER_SENSITIVITY
    lines += ["", f"\\* fewer than {MIN_PER_CLASS} positives or negatives: treat as preliminary.",
              f"Operating point: the served refer threshold (targets {REFER_SENSITIVITY:.0%} sensitivity on the synthetic validation set)."]
    if not any(per.values()):
        lines += ["", "No diagnoses recorded yet. Run `export`, have the clinician fill labels_template.csv, then `import-labels`."]
    _write_report(out, "evaluation", report, lines)


# ---------------------------------------------------------------------------
# retrain: cross-validated comparison of synthetic-only, real-only and synthetic->real models
# ---------------------------------------------------------------------------

def _design(items, engine, mode: str) -> np.ndarray:
    from screening.model import model_inputs
    X = np.array([r["feature_vector"] for r, _, _ in items], dtype=float)
    C = np.array([[(r.get("covariates") or {}).get("age_years"),
                   (r.get("covariates") or {}).get("hindi_dominant"),
                   (r.get("covariates") or {}).get("finger_input")] for r, _, _ in items], dtype=object)
    C = np.array([[np.nan if v is None else float(v) for v in row] for row in C], dtype=float)
    Q = None
    if engine.uses_questionnaire:
        Q = np.array([[np.nan if v is None else v for v in ((r.get("covariates") or {}).get("questionnaire") or [None] * 6)]
                      for r, _, _ in items], dtype=float)
    return model_inputs(np.clip(X, 0, 1), C, engine.normer, mode, Q)


def cmd_retrain(args) -> None:
    import lightgbm as lgb
    from sklearn.model_selection import StratifiedKFold
    from screening.engine import get_screening_engine
    from screening.metrics import threshold_for_sensitivity
    from screening.model import LGBM_PARAMS, REFER_SENSITIVITY, bundle_hash, save_bundle

    engine = get_screening_engine()
    per, total = _labelled()
    out = _out_dir("retraining")
    small = dict(objective="binary", learning_rate=0.03, num_leaves=4, min_data_in_leaf=5, feature_fraction=0.8,
                 bagging_fraction=0.8, bagging_freq=1, lambda_l2=1.0, verbose=-1)
    report: Dict[str, Any] = {"generated_at": datetime.now().isoformat(), "base_model": engine.model_id, "disorders": {}}
    lines = [f"# Real-data retraining, {args.folds}-fold cross-validation ({datetime.now():%Y-%m-%d})", "",
             "A = served synthetic model; B = trained on real children only; C = synthetic model fine-tuned on real children.",
             "Thresholds for B and C are chosen inside each training fold for the same target sensitivity.", "",
             "| Disorder | n (pos) | A AUROC | B AUROC | C AUROC | A sens/spec | C sens/spec |", "|---|---|---|---|---|---|---|"]
    final_models = {}
    for d in DISORDERS:
        items = per[d]
        y = np.array([lab for _, _, lab in items], dtype=int)
        pos, neg = int(y.sum()), int(len(y) - y.sum())
        if min(pos, neg) < max(args.folds, MIN_PER_CLASS):
            lines.append(f"| {d} | {len(y)} ({pos}) | need ≥{max(args.folds, MIN_PER_CLASS)} diagnosed and ≥{max(args.folds, MIN_PER_CLASS)} not diagnosed | | | | |")
            report["disorders"][d] = {"skipped": True, "n": len(y), "positives": pos}
            continue
        F = _design(items, engine, d)
        base = engine.boosters[(d, d.capitalize())]
        base_thr = engine.bundle["models"][d][d.capitalize()]["refer_threshold"]
        oof = {k: np.zeros(len(y)) for k in "ABC"}
        thr = {k: np.zeros(len(y)) for k in "ABC"}
        for tr, te in StratifiedKFold(args.folds, shuffle=True, random_state=0).split(F, y):
            oof["A"][te] = base.predict(F[te])
            thr["A"][te] = base_thr
            b = lgb.train(small, lgb.Dataset(F[tr], y[tr]), num_boost_round=120)
            c = lgb.train(small, lgb.Dataset(F[tr], y[tr], init_score=base.predict(F[tr], raw_score=True)),
                          num_boost_round=60)
            for k, mdl, raw_base in (("B", b, None), ("C", c, base)):
                def prob(Z, mdl=mdl, raw_base=raw_base):
                    raw = mdl.predict(Z, raw_score=True) + (raw_base.predict(Z, raw_score=True) if raw_base else 0)
                    return 1 / (1 + np.exp(-raw))
                oof[k][te] = prob(F[te])
                thr[k][te] = threshold_for_sensitivity(y[tr], prob(F[tr]), REFER_SENSITIVITY)
        m = {k: _metrics(y, oof[k], thr[k]) for k in "ABC"}
        report["disorders"][d] = m
        lines.append(f"| {d} | {len(y)} ({pos}) | {_fmt(m['A'].get('auroc'), m['A'].get('auroc_ci'))} | "
                     f"{_fmt(m['B'].get('auroc'), m['B'].get('auroc_ci'))} | {_fmt(m['C'].get('auroc'), m['C'].get('auroc_ci'))} | "
                     f"{_fmt(m['A']['sensitivity'])}/{_fmt(m['A']['specificity'])} | {_fmt(m['C']['sensitivity'])}/{_fmt(m['C']['specificity'])} |")
        if args.save:
            # C trained on all real children, merged into one booster on top of the synthetic one
            c_all = lgb.train(small, lgb.Dataset(F, y, init_score=base.predict(F, raw_score=True)), num_boost_round=60)
            p_all = 1 / (1 + np.exp(-(c_all.predict(F, raw_score=True) + base.predict(F, raw_score=True))))
            final_models[d] = {"residual_booster": c_all.model_to_string(),
                               "refer_threshold": threshold_for_sensitivity(y, p_all, REFER_SENSITIVITY), "n": len(y)}

    if args.save and final_models:
        bundle = json.loads(json.dumps(engine.bundle))
        for d, fm in final_models.items():
            bundle["models"][d][d.capitalize()].update(
                {"residual_booster": fm["residual_booster"], "refer_threshold": fm["refer_threshold"]})
        bundle["model_version"] = datetime.now().strftime("%Y%m%d%H%M%S") + "-real"
        bundle["training_data"]["real_finetune"] = {d: {"n": fm["n"], "base_model": engine.model_id} for d, fm in final_models.items()}
        bundle["sha256"] = bundle_hash(bundle)
        path = os.path.join(out, "screening_bundle_real.json")
        save_bundle(bundle, path)
        lines += ["", f"Saved fine-tuned bundle (single-test models for {', '.join(final_models)}) -> {path}",
                  "It is NOT active. To serve it, set SWARSETU_SCREENING_BUNDLE to that path and restart the backend."]
    _write_report(out, "retraining", report, lines)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("export").set_defaults(fn=cmd_export)
    p = sub.add_parser("import-labels")
    p.add_argument("csv")
    p.add_argument("--source", help="who made the diagnoses, when the CSV has no source column")
    p.set_defaults(fn=cmd_import_labels)
    sub.add_parser("evaluate").set_defaults(fn=cmd_evaluate)
    p = sub.add_parser("retrain")
    p.add_argument("--folds", type=int, default=5)
    p.add_argument("--save", action="store_true", help="also write a fine-tuned bundle (not activated)")
    p.set_defaults(fn=cmd_retrain)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
