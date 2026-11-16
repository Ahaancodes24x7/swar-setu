"""Tests for the DSM-5 student profile: questionnaire validation, criteria A-D summary,
profile storage/API, and the screening engine's use of the profile."""

import os
import sys
import tempfile
import uuid
from datetime import date

import numpy as np
import pytest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

_TMP = tempfile.mkdtemp()
os.environ.setdefault("SWARSETU_DB_PATH", os.path.join(_TMP, "test.sqlite3"))
os.environ["GEMINI_API_KEY"] = ""
os.environ["SUPABASE_URL"] = ""

from app import app  # noqa: E402
from screening import dsm5  # noqa: E402
from screening.engine import get_screening_engine  # noqa: E402


def dob(age_years: float) -> str:
    today = date.today()
    return date(today.year - int(age_years), max(1, today.month - 1) if today.month > 1 else 1, 1).isoformat()


def profile(**over):
    """A complete profile for a 9-year-old fluent English reader with reading difficulties."""
    a = {
        "date_of_birth": dob(9), "home_language": "en", "instruction_language": "en", "input_device": "stylus",
        "a1_word_reading": 3, "a2_reading_comprehension": 2, "a3_spelling": 1, "a4_written_expression": 0,
        "a5_number_sense": 0, "a6_math_reasoning": 0,
        "a_duration_6m": "yes", "a_intervention": "sustained", "a_intervention_response": "persisted",
        "b_reading_level": "well_below", "b_writing_level": "at", "b_math_level": "at", "b_interference": "yes",
        "c_onset_school_age": "yes",
        "d_vision": "normal", "d_hearing": "normal", "d_language_proficiency": "fluent",
        "d_inadequate_instruction": "no", "d_intellectual_concern": "no", "d_neurological": "no", "d_psychosocial": "no",
    }
    a.update(over)
    return a


# ---------------------------------------------------------------- questionnaire logic

def test_validate_accepts_complete_profile_and_reports_completeness():
    clean, problems = dsm5.validate(profile())
    assert problems == []
    c = dsm5.completeness(clean)
    assert c["complete"] and c["missing"] == []
    assert 8.5 < dsm5.age_years(clean) < 9.6


def test_validate_rejects_bad_values_and_ignores_unknown_keys():
    clean, problems = dsm5.validate(profile(a1_word_reading=7, d_vision="blurry", unknown_field="x"))
    assert any("a1_word_reading" in p for p in problems)
    assert any("d_vision" in p for p in problems)
    assert "unknown_field" not in clean


def test_partial_profile_lists_missing_required():
    clean, problems = dsm5.validate({"date_of_birth": dob(8), "home_language": "hi"})
    assert problems == []
    c = dsm5.completeness(clean)
    assert not c["complete"] and "c_onset_school_age" in c["missing"]


def test_covariates_and_questionnaire_features():
    a = profile(home_language="hi")
    cov = dsm5.covariates(a)
    assert cov["home_language"] == "hi" and cov["input_device"] == "stylus"
    assert 8.5 < cov["student_age"] < 9.6
    q = dsm5.questionnaire_features(a)
    assert q.shape == (6,)
    assert q[0] == pytest.approx((3 + 2) / 2 / 3)        # reading symptoms
    assert q[1] == pytest.approx(1.0)                    # reading level: well below
    assert np.isnan(dsm5.questionnaire_features({})).all()


def test_criteria_consistent_when_all_criteria_met():
    s = dsm5.criteria_summary(profile(), {"Dyslexia": {"flagged": True}})
    d = s["domains"]["Dyslexia"]
    assert d["status"] == "consistent"
    assert d["criterion_a"]["met"] and d["criterion_c"]["met"] and d["criterion_d"]["clear"]
    assert s["domains"]["Dyscalculia"]["status"] == "not_indicated"


def test_criterion_a_not_met_if_child_caught_up_with_help():
    s = dsm5.criteria_summary(profile(a_intervention_response="improved"), {"Dyslexia": {"flagged": True}})
    assert s["domains"]["Dyslexia"]["status"] == "partial"
    assert not s["domains"]["Dyslexia"]["criterion_a"]["met"]


def test_criterion_d_is_domain_specific():
    # limited language proficiency can explain reading difficulty, not maths difficulty
    a = profile(d_language_proficiency="limited", a5_number_sense=3, b_math_level="well_below")
    s = dsm5.criteria_summary(a, {"Dyslexia": {"flagged": True}, "Dyscalculia": {"flagged": True}})
    assert s["domains"]["Dyslexia"]["status"] == "exclusion_review"
    assert s["domains"]["Dyscalculia"]["status"] == "consistent"
    assert [f["key"] for f in s["exclusion_flags"]] == ["language"]


def test_global_exclusions_apply_to_all_domains():
    flags = dsm5.exclusion_flags(profile(d_intellectual_concern="yes"))
    assert flags[0]["domains"] == ["reading", "writing", "math"]


# ---------------------------------------------------------------- API + storage

@pytest.fixture(scope="module")
def client():
    return app.test_client()


def test_questionnaire_schema_endpoint(client):
    r = client.get("/api/dsm5/questionnaire")
    assert r.status_code == 200
    body = r.get_json()
    ids = [s["id"] for s in body["sections"]]
    assert ids[:2] == ["details", "criterion_a"] and "criterion_d" in ids
    assert "professional" in body["disclaimer"]


def test_profile_round_trip_and_history(client):
    sid = f"test-{uuid.uuid4()}"
    assert client.get(f"/api/students/{sid}/profile").status_code == 404
    r = client.put(f"/api/students/{sid}/profile", json={"answers": {"date_of_birth": dob(8), "home_language": "hi"}, "filled_by": "t@x.org"})
    assert r.status_code == 200 and not r.get_json()["completeness"]["complete"]
    r = client.put(f"/api/students/{sid}/profile", json={"answers": profile(d_hearing="concern")})
    body = r.get_json()
    assert body["completeness"]["complete"]
    assert [f["key"] for f in body["exclusion_flags"]] == ["hearing"]
    got = client.get(f"/api/students/{sid}/profile").get_json()
    assert got["profile"]["answers"]["d_hearing"] == "concern"
    hist = client.get(f"/api/students/{sid}/profile/history").get_json()["history"]
    assert len(hist) == 2


def test_profile_rejects_invalid_answers(client):
    sid = f"test-{uuid.uuid4()}"
    r = client.put(f"/api/students/{sid}/profile", json={"answers": profile(b_reading_level="terrible")})
    assert r.status_code == 400 and r.get_json()["problems"]
    assert client.put(f"/api/students/{sid}/profile", json={"answers": "nope"}).status_code == 400


def test_assessment_uses_stored_profile(client):
    sid = f"test-{uuid.uuid4()}"
    client.put(f"/api/students/{sid}/profile", json={"answers": profile(d_vision="concern")})
    payload = {"disorder_type": "dyslexia", "student_id": sid,
               "games": {"oral_reading": {"wpm": 35, "words_read": 40, "time_seconds": 60, "accuracy": 0.8},
                         "reading_fluency": {"accuracy": 0.5, "phonological_score": 0.4, "pseudoword_accuracy": 0.35,
                                             "comprehension_score": 0.4}}}
    r = client.post("/api/assess", json=payload)
    assert r.status_code == 200, r.get_json()
    pred = r.get_json()["prediction"]
    assert pred["covariates"]["profile_used"] is True
    # age / language / device came from the profile, not imputed
    assert "student_age" not in (pred["covariates"].get("imputed") or [])
    dys = pred["dsm5"]["domains"]["Dyslexia"]
    assert dys["status"] in ("exclusion_review", "partial")
    assert "vision" in dys["criterion_d"]["factors"]
    s = client.get(f"/api/students/{sid}/dsm5-summary").get_json()
    assert s["success"] and "Dyslexia" in s["summary"]["domains"]


def test_assessment_without_profile_has_no_dsm5_block(client):
    payload = {"disorder_type": "dyslexia", "student_id": f"test-{uuid.uuid4()}", "student_age": 9,
               "games": {"reading_fluency": {"accuracy": 0.9, "wpm": 100}}}
    pred = client.post("/api/assess", json=payload).get_json()["prediction"]
    assert pred["covariates"]["profile_used"] is False
    assert not pred.get("dsm5")


# ---------------------------------------------------------------- engine

def test_engine_questionnaire_shifts_risk_in_expected_direction():
    eng = get_screening_engine()
    assert eng.uses_questionnaire
    payload = {"games": {"reading_fluency": {"accuracy": 0.7, "wpm": 70, "phonological_score": 0.6,
                                             "pseudoword_accuracy": 0.6, "comprehension_score": 0.6}}}
    worried = eng.screen(dict(payload), "dyslexia", profile())
    fine = eng.screen(dict(payload), "dyslexia", profile(a1_word_reading=0, a2_reading_comprehension=0, b_reading_level="at"))
    p = lambda r: r["disorders"]["Dyslexia"]["risk_score"]
    assert p(worried) > p(fine)
    assert worried["covariates"]["questionnaire_used"] and "dsm5" in worried
