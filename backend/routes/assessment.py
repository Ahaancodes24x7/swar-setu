from flask import Blueprint, request, jsonify
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai.pipeline import run_assessment_ai_pipeline
from storage import get_store

assessment_bp = Blueprint('assessment', __name__)


def _run(data, disorder_type):
    return run_assessment_ai_pipeline(
        payload=data,
        disorder_type=disorder_type,
        score=data.get("score"),
        percentage=data.get("percentage"),
        auth_header=request.headers.get("Authorization"),
    )


@assessment_bp.route('/assess', methods=['POST'])
def assess():
    """Single-test (dyslexia / dyscalculia / dysgraphia) or comprehensive screening."""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "error": "No JSON payload provided"}), 400
        result = _run(data, data.get("disorder_type", ""))
        return jsonify({
            "success": True,
            "assessment_id": result["assessment_id"],
            "prediction": result["prediction"],
            "explanation": result["ai_explanation"],
            "session_data": result["session_data"],
            "persistence": result["persistence"],
        }), 200
    except Exception as e:
        print("ASSESSMENT ERROR:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


@assessment_bp.route('/predict', methods=['POST'])
def predict():
    """Same pipeline as /assess, kept for older clients (returns `result`)."""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "error": "No JSON payload provided"}), 400
        result = _run(data, data.get("disorder_type") or "comprehensive")
        return jsonify({
            "success": True,
            "assessment_id": result["assessment_id"],
            "result": result["prediction"],
            "explanation": result["ai_explanation"],
            "persistence": result["persistence"],
        }), 200
    except Exception as e:
        print("PREDICTION ERROR:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


@assessment_bp.route('/unified-profile', methods=['POST'])
def unified_profile():
    """Comprehensive profile once all three assessments have been completed."""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "error": "No JSON payload provided"}), 400

        completed_assessments = data.get("completed_assessments", {})
        required = {"dyslexia", "dyscalculia", "dysgraphia"}
        completed_types = {k.strip().lower() for k in completed_assessments.keys()}
        missing = required - completed_types
        if missing:
            return jsonify({
                "success": False,
                "unified_profile_ready": False,
                "completed_count": len(completed_types),
                "total_required": 3,
                "missing_assessments": sorted(missing),
                "message": f"Unified Cognitive Profile requires all 3 completed assessments. Missing: {', '.join(sorted(missing))}."
            }), 400

        combined = {k: data[k] for k in ("student_id", "session_id", "student_age", "age", "grade",
                                         "home_language", "input_device") if k in data}
        combined["games"] = {}
        for dis_k, dis_val in completed_assessments.items():
            if isinstance(dis_val, dict):
                combined["games"].update(dis_val.get("games") or dis_val.get("results") or {dis_k: dis_val})

        result = _run(combined, "comprehensive")
        return jsonify({
            "success": True,
            "unified_profile_ready": True,
            "student_id": data.get("student_id"),
            "assessment_id": result["assessment_id"],
            "unified_report": result["prediction"],
            "explanation": result["ai_explanation"],
            "persistence": result["persistence"],
            "visibility": ["teacher", "guardian", "principal"]
        }), 200
    except Exception as e:
        print("UNIFIED PROFILE ERROR:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# Stored inputs and outcomes
# ---------------------------------------------------------------------------

@assessment_bp.route('/assessments', methods=['GET'])
def list_assessments():
    try:
        rows = get_store().list_assessments(
            student_id=request.args.get("student_id"),
            limit=min(int(request.args.get("limit", 50)), 500),
            offset=int(request.args.get("offset", 0)),
            include_payload=request.args.get("include_payload") == "true",
        )
        return jsonify({"success": True, "count": len(rows), "assessments": rows}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@assessment_bp.route('/assessments/stats', methods=['GET'])
def assessment_stats():
    return jsonify({"success": True, **get_store().stats()}), 200


@assessment_bp.route('/assessments/<assessment_id>', methods=['GET'])
def get_assessment(assessment_id):
    row = get_store().get_assessment(assessment_id)
    if row is None:
        return jsonify({"success": False, "error": "Assessment not found"}), 404
    return jsonify({"success": True, "assessment": row}), 200


@assessment_bp.route('/assessments/<assessment_id>/outcome', methods=['POST'])
def add_outcome(assessment_id):
    """Record a confirmed diagnosis from a qualified professional for later model retraining.
    Body: {"disorder": "dyslexia", "diagnosis": 1, "source": "clinical_psychologist", "notes": "..."}"""
    data = request.get_json(silent=True) or {}
    try:
        oid = get_store().add_outcome(
            assessment_id=assessment_id, disorder=str(data.get("disorder", "")),
            diagnosis=int(data.get("diagnosis", -1)), source=str(data.get("source", "")), notes=data.get("notes"))
        return jsonify({"success": True, "outcome_id": oid}), 201
    except KeyError:
        return jsonify({"success": False, "error": "Assessment not found"}), 404
    except (ValueError, TypeError) as e:
        return jsonify({"success": False, "error": str(e)}), 400
