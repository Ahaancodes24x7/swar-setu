"""End-to-end check of the research workflow on a simulated cohort:
store screenings -> export -> clinician labels -> import-labels -> evaluate -> retrain --save -> serve."""

import csv
import glob
import json
import os
import sys
import tempfile
from types import SimpleNamespace

import numpy as np
import pytest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

import research_cli  # noqa: E402
from screening.engine import ScreeningEngine, get_screening_engine  # noqa: E402
from screening.synthetic_cohort import dsm5_config, generate_cohort  # noqa: E402
from storage.local_store import LocalStore  # noqa: E402


@pytest.fixture(scope="module")
def workspace():
    tmp = tempfile.mkdtemp()
    store = LocalStore(os.path.join(tmp, "research.sqlite3"))
    research_cli._store = lambda: store
    research_cli.DATA_ROOT = os.path.join(tmp, "data")

    engine = get_screening_engine()
    cohort = generate_cohort(dsm5_config(160), seed=7)
    for i in range(len(cohort["y"])):
        cov = {"age_years": float(cohort["age"][i]), "hindi_dominant": bool(cohort["hindi"][i]),
               "finger_input": bool(cohort["finger"][i]), "imputed": [], "questionnaire": None}
        C = np.array([[cov["age_years"], float(cov["hindi_dominant"]), float(cov["finger_input"])]])
        x = np.clip(cohort["X"][i].astype(float), 0, 1).tolist()
        res = engine.predict(x, C, "full")
        store.save_assessment(disorder_type="comprehensive", model_id=engine.model_id, raw_payload={"sim": i},
                              feature_vector=x, prediction={"full_profile": {"disorders": res}},
                              screening_mode="full", covariates=cov, student_id=f"sim-{i}")
    return SimpleNamespace(tmp=tmp, store=store, cohort=cohort)


def _latest(kind, root):
    return sorted(glob.glob(os.path.join(root, kind, "*")))[-1]


def test_export_and_label_roundtrip(workspace):
    research_cli.cmd_export(None)
    out = _latest("exports", research_cli.DATA_ROOT)
    for f in ("assessments.csv", "raw_payloads.jsonl", "outcomes.csv", "profiles.csv", "labels_template.csv"):
        assert os.path.exists(os.path.join(out, f)), f
    with open(os.path.join(out, "assessments.csv"), encoding="utf8") as f:
        rows = list(csv.DictReader(f))
    assert len(rows) == 160 and rows[0]["dyslexia_risk"] != ""

    # the "clinician" fills the template with the cohort's true labels
    with open(os.path.join(out, "labels_template.csv"), encoding="utf8") as f:
        template = list(csv.DictReader(f))
    filled = os.path.join(workspace.tmp, "labels.csv")
    with open(filled, "w", newline="", encoding="utf8") as f:
        w = csv.DictWriter(f, fieldnames=list(template[0].keys()))
        w.writeheader()
        for row in template:
            i = int(row["student_id"].split("-")[1])
            for j, d in enumerate(research_cli.DISORDERS):
                row[f"{d}_diagnosis"] = int(workspace.cohort["y"][i][[0, 1, 2][j]])
            row["source"] = "clinical_psychologist"
            w.writerow(row)
    research_cli.cmd_import_labels(SimpleNamespace(csv=filled, source=None))
    assert len(workspace.store.list_outcomes()) == 160 * 3
    # importing the same file again adds nothing
    research_cli.cmd_import_labels(SimpleNamespace(csv=filled, source=None))
    assert len(workspace.store.list_outcomes()) == 160 * 3


def test_evaluate_reports_metrics(workspace):
    research_cli.cmd_evaluate(None)
    rep = json.load(open(os.path.join(_latest("evaluations", research_cli.DATA_ROOT), "evaluation.json")))
    for d in research_cli.DISORDERS:
        m = rep["disorders"][d]
        assert m["n"] == 160
        if m["positives"] and m["negatives"]:
            assert 0.5 < m["auroc"] <= 1 and len(m["auroc_ci"]) == 2


def test_retrain_saves_a_servable_bundle(workspace):
    research_cli.cmd_retrain(SimpleNamespace(folds=3, save=True))
    out = _latest("retraining", research_cli.DATA_ROOT)
    rep = json.load(open(os.path.join(out, "retraining.json")))
    trained = [d for d, m in rep["disorders"].items() if not m.get("skipped")]
    assert trained, rep
    for d in trained:
        assert {"A", "B", "C"} <= set(rep["disorders"][d])
    engine = ScreeningEngine(os.path.join(out, "screening_bundle_real.json"))
    assert engine.residuals
    d = trained[0]
    x = np.clip(workspace.cohort["X"][0].astype(float), 0, 1).tolist()
    res = engine.predict(x, np.array([[9.0, 0.0, 0.0]]), d)
    assert 0 <= res[d.capitalize()]["risk_score"] <= 1
