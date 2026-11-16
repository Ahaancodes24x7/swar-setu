"""Student profiles and the DSM-5 teacher/operator questionnaire."""

from flask import Blueprint, jsonify, request

from screening import dsm5
from storage import get_store

students_bp = Blueprint("students", __name__)


def _profile_payload(student_id: str, profile):
    answers = profile["answers"] if profile else {}
    return {
        "student_id": student_id,
        "profile": profile,
        "completeness": dsm5.completeness(answers),
        "age_years": dsm5.age_years(answers) if answers else None,
        "exclusion_flags": dsm5.exclusion_flags(answers),
    }


@students_bp.route("/dsm5/questionnaire", methods=["GET"])
def questionnaire_schema():
    return jsonify({"success": True, **dsm5.schema()}), 200


@students_bp.route("/students/<student_id>/profile", methods=["GET"])
def get_profile(student_id):
    profile = get_store().get_profile(student_id)
    if profile is None:
        return jsonify({"success": False, "error": "No profile yet", **_profile_payload(student_id, None)}), 404
    return jsonify({"success": True, **_profile_payload(student_id, profile)}), 200


@students_bp.route("/students/<student_id>/profile", methods=["PUT", "POST"])
def save_profile(student_id):
    """Body: {"answers": {...}, "filled_by": "teacher@school.org"}. Unknown keys are ignored;
    invalid values are rejected. Partial profiles are allowed (completeness is reported)."""
    body = request.get_json(silent=True) or {}
    answers = body.get("answers")
    if not isinstance(answers, dict):
        return jsonify({"success": False, "error": "answers must be an object"}), 400
    clean, problems = dsm5.validate(answers)
    if problems:
        return jsonify({"success": False, "error": "Invalid answers", "problems": problems}), 400
    filled_by = body.get("filled_by")
    profile = get_store().save_profile(student_id, clean, dsm5.SCHEMA_VERSION,
                                       str(filled_by)[:200] if filled_by else None)
    return jsonify({"success": True, **_profile_payload(student_id, profile)}), 200


@students_bp.route("/students/<student_id>/profile/history", methods=["GET"])
def profile_history(student_id):
    return jsonify({"success": True, "history": get_store().profile_history(student_id)}), 200


@students_bp.route("/students/<student_id>/dsm5-summary", methods=["GET"])
def dsm5_summary(student_id):
    """DSM-5 criteria A-D picture from the profile plus the latest screening result per disorder."""
    store = get_store()
    profile = store.get_profile(student_id)
    if profile is None:
        return jsonify({"success": False, "error": "Complete the student profile first"}), 404
    latest = {}
    for row in store.list_assessments(student_id=student_id, limit=100):
        disorders = ((row.get("prediction") or {}).get("full_profile") or {}).get("disorders") or {}
        for name, res in disorders.items():
            latest.setdefault(name, {**res, "assessment_id": row["id"], "screened_at": row["created_at"]})
    summary = dsm5.criteria_summary(profile["answers"], latest)
    return jsonify({"success": True, "student_id": student_id, "summary": summary, "latest_screening": latest}), 200
