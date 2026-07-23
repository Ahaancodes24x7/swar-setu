from flask import Blueprint, request, jsonify
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai.gemini_explainer import generate_parent_friendly_explanation

explainability_bp = Blueprint('explainability', __name__)

@explainability_bp.route('/explainability', methods=['POST'])
def explain():
    """Generates clinical & parent-friendly AI explanations for disorder predictions"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No JSON payload provided"
            }), 400

        disorder_type = data.get("disorder_type", "general")
        prediction = data.get("prediction", {})
        student_context = data.get("student_context", {})

        explanation = generate_parent_friendly_explanation(
            disorder_type=disorder_type,
            prediction=prediction,
            student_context=student_context
        )

        return jsonify({
            "success": True,
            "explanation": explanation
        }), 200

    except Exception as e:
        print("EXPLAINABILITY ERROR:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
