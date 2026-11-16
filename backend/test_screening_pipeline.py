"""Tests for the LightGBM screening pipeline, local storage and the explainer fallback."""

import json
import os
import sys
import tempfile

import numpy as np
import pytest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

# isolate side effects: temporary database, no Gemini / Supabase network calls
_TMP = tempfile.mkdtemp()
os.environ["SWARSETU_DB_PATH"] = os.path.join(_TMP, "test.sqlite3")
os.environ["GEMINI_API_KEY"] = ""
os.environ["SUPABASE_URL"] = ""

from app import app  # noqa: E402
from screening.engine import ScreeningEngine, parse_covariates  # noqa: E402
from screening.model import bundle_hash, load_bundle  # noqa: E402


def reading_payload(level: float, **extra):
    g = {"wpm": 30 + 90 * level, "accuracy": 0.4 + 0.58 * level, "phoneme_errors": int(20 * (1 - level)),
         "total_phonemes": 24, "pseudoword_accuracy": 0.3 + 0.65 * level, "phonological_score": 0.3 + 0.65 * level,
         "ran_time_seconds": 60 - 38 * level, "first_response_ms": 3000 - 2300 * level,
         "comprehension_score": 0.35 + 0.6 * level, "attention_score": 0.4 + 0.5 * level,
         "memory_score": 0.4 + 0.5 * level, "visual_score": 0.4 + 0.5 * level}
    return {"disorder_type": "dyslexia", "student_id": "test_student", "student_age": 9,
            "games": {"reading": g}, **extra}


@pytest.fixture(scope="module")
def client():
    return app.test_client()


@pytest.fixture(scope="module")
def engine():
    return ScreeningEngine.get()


def test_bundle_integrity(engine):
    b = engine.bundle
    assert b["sha256"] == bundle_hash(b)
    assert set(b["models"]) == {"full", "dyslexia", "dyscalculia", "dysgraphia"}
    for per in b["models"].values():
        for m in per.values():
            assert 0 < m["monitor_threshold"] <= m["refer_threshold"] < 1


def test_tampered_bundle_rejected(engine):
    tampered = dict(engine.bundle)
    tampered["models"] = json.loads(json.dumps(engine.bundle["models"]))
    tampered["models"]["full"]["Dyslexia"]["refer_threshold"] = 0.99
    path = os.path.join(_TMP, "tampered.json")
    with open(path, "w") as f:
        json.dump(tampered, f)
    with pytest.raises(ValueError, match="checksum"):
        load_bundle(path)


def test_risk_increases_with_impairment_end_to_end(client):
    scores, levels = {}, {}
    for lvl in (0.05, 0.5, 0.95):
        js = client.post("/api/assess", json=reading_payload(lvl)).get_json()
        assert js["success"], js
        scores[lvl], levels[lvl] = js["prediction"]["risk_score"], js["prediction"]["risk_level"]
    assert scores[0.05] > scores[0.5] > scores[0.95]
    assert levels[0.05] == "High" and levels[0.95] == "Low"


def test_all_tiers_reachable(engine):
    seen = set()
    for v in np.linspace(0.02, 0.98, 25):
        x = [v] * 64
        seen.add(engine.predict(x, np.array([[9.0, 0.0, 0.0]]), "full")["Dyslexia"]["risk_level"])
    assert seen == {"Low", "Medium", "High"}


def test_covariate_parsing():
    c, info = parse_covariates({"grade": "Grade 3", "home_language": "hi", "input_device": "stylus"})
    assert c[0, 0] == pytest.approx(8.5) and c[0, 1] == 1.0 and c[0, 2] == 0.0
    c, info = parse_covariates({})
    assert np.isnan(c).all() and set(info["imputed"]) == {"age_years", "home_language", "input_device"}


def test_comprehensive_returns_all_three(client):
    js = client.post("/api/assess", json={**reading_payload(0.5), "disorder_type": "comprehensive"}).get_json()
    assert set(js["prediction"]["full_profile"]["disorders"]) == {"Dyslexia", "Dyscalculia", "Dysgraphia"}


def test_inputs_are_stored_and_outcomes_recorded(client):
    payload = reading_payload(0.3, session_id="sess-1")
    js = client.post("/api/assess", json=payload).get_json()
    aid = js["assessment_id"]
    assert aid and js["persistence"]["local"]["saved"]

    rec = client.get(f"/api/assessments/{aid}").get_json()["assessment"]
    assert rec["raw_payload"] == payload
    assert len(rec["feature_vector"]) == 64
    assert rec["model_id"].startswith("lightgbm-normed@")
    assert rec["prediction"]["risk_score"] == js["prediction"]["risk_score"]
    assert rec["remote_sync"]["persisted"] is False

    listed = client.get("/api/assessments?student_id=test_student").get_json()
    assert any(a["id"] == aid for a in listed["assessments"])

    ok = client.post(f"/api/assessments/{aid}/outcome",
                     json={"disorder": "dyslexia", "diagnosis": 1, "source": "clinical_psychologist"})
    assert ok.status_code == 201
    bad = client.post(f"/api/assessments/{aid}/outcome", json={"disorder": "adhd", "diagnosis": 1, "source": "x"})
    assert bad.status_code == 400
    missing = client.post("/api/assessments/nope/outcome", json={"disorder": "dyslexia", "diagnosis": 0, "source": "x"})
    assert missing.status_code == 404
    assert client.get(f"/api/assessments/{aid}").get_json()["assessment"]["outcomes"][0]["diagnosis"] == 1


def test_explainer_fallback_without_key(client):
    js = client.post("/api/assess", json=reading_payload(0.1)).get_json()
    exp = js["explanation"]
    assert exp["source"] == "fallback" and "GEMINI_API_KEY" in exp["fallback_reason"]
    assert "not a diagnosis" in exp["confidence_note"]


def test_model_info_and_fairness_report(client):
    info = client.get("/api/model-info").get_json()
    assert info["success"] and info["active_engine"] == "lightgbm"
    fr = client.get("/api/fairness-report").get_json()
    assert fr["success"] and "Dyslexia" in fr["fairness_report"]["full"]
