from flask import Blueprint, request, jsonify
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai.pipeline import run_assessment_ai_pipeline
from ml_models import get_predictor
from ai.session_adapter import build_ml_session_data

assessment_bp = Blueprint('assessment', __name__)

@assessment_bp.route('/assess', methods=['POST'])
def assess():
    """End-to-end assessment processing endpoint for individual SLD screening"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No JSON payload provided"
            }), 400

        disorder_type = data.get("disorder_type", "")
        score = data.get("score")
        percentage = data.get("percentage")

        result = run_assessment_ai_pipeline(
            payload=data,
            disorder_type=disorder_type,
            score=score,
            percentage=percentage
        )

        return jsonify({
            "success": True,
            "prediction": result.get("prediction"),
            "explanation": result.get("ai_explanation"),
            "session_data": result.get("session_data")
        }), 200

    except Exception as e:
        print("ASSESSMENT ERROR:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@assessment_bp.route('/predict', methods=['POST'])
def predict():
    """Direct AI model prediction endpoint for single disorder screening"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No JSON payload provided"
            }), 400

        predictor = get_predictor()
        disorder_type = (data.get("disorder_type") or "").strip().lower()

        if disorder_type in ["dyslexia", "dyscalculia", "dysgraphia"]:
            session_data = build_ml_session_data(data, disorder_type=disorder_type)
            if disorder_type == "dyslexia":
                result = predictor.predict_dyslexia(session_data)
            elif disorder_type == "dyscalculia":
                result = predictor.predict_dyscalculia(session_data)
            else:
                result = predictor.predict_dysgraphia(session_data)
        elif disorder_type == "comprehensive":
            assessments = data.get("assessments", {})
            result = predictor.comprehensive_assessment(assessments)
        else:
            return jsonify({
                "success": False,
                "error": f"Invalid disorder_type: '{disorder_type}'. Must be dyslexia, dyscalculia, dysgraphia, or comprehensive."
            }), 400

        return jsonify({
            "success": True,
            "result": result
        }), 200

    except Exception as e:
        print("PREDICTION ERROR:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@assessment_bp.route('/unified-profile', methods=['POST'])
def unified_profile():
    """
    Generates Unified Cognitive Profile ONLY when ALL THREE assessments
    (dyslexia, dyscalculia, dysgraphia) have been completed for a student.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON payload provided"}), 400

        student_id = data.get("student_id")
        completed_assessments = data.get("completed_assessments", {})

        required_disorders = {"dyslexia", "dyscalculia", "dysgraphia"}
        completed_types = {k.strip().lower() for k in completed_assessments.keys()}
        missing = required_disorders - completed_types

        if missing:
            return jsonify({
                "success": False,
                "unified_profile_ready": False,
                "completed_count": len(completed_types),
                "total_required": 3,
                "missing_assessments": list(missing),
                "message": f"Unified Cognitive Profile requires all 3 completed assessments. Missing: {', '.join(missing)}. Individual reports remain available."
            }), 400

        predictor = get_predictor()
        formatted_assessments = {}
        for disorder in required_disorders:
            raw_session = completed_assessments[disorder]
            formatted_assessments[disorder] = build_ml_session_data(raw_session, disorder_type=disorder)

        unified_report = predictor.comprehensive_assessment(formatted_assessments)

        return jsonify({
            "success": True,
            "unified_profile_ready": True,
            "student_id": student_id,
            "unified_report": unified_report,
            "visibility": ["teacher", "guardian", "principal"]
        }), 200

    except Exception as e:
        print("UNIFIED PROFILE ERROR:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500
