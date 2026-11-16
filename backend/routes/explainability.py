from flask import Blueprint, request, jsonify
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai.gemini_explainer import generate_parent_friendly_explanation
from ai.session_adapter import extract_64d_feature_vector
from screening import get_screening_engine, parse_covariates

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


@explainability_bp.route('/explain/shap', methods=['GET', 'POST'])
def shap_explanation():
    """TreeSHAP contributions (log-odds) from the LightGBM screening models."""
    try:
        data = (request.get_json(silent=True) or {}) if request.method == 'POST' else {}
        mode = (data.get("disorder_type") or "comprehensive").strip().lower()
        mode = mode if mode in ("dyslexia", "dyscalculia", "dysgraphia") else "full"
        vector = data.get("feature_vector") or (extract_64d_feature_vector(data) if data else [0.5] * 64)
        cov, _ = parse_covariates(data)
        res = get_screening_engine().predict(vector, cov, mode)
        return jsonify({
            "success": True,
            "method": "TreeSHAP (Lundberg et al. 2020) on LightGBM log-odds",
            "shap_attributions": {d: r["shap_attributions"] for d, r in res.items()},
            "protective_features": {d: r["protective_features"] for d, r in res.items()},
            "top_features": {d: r["top_shap_features"] for d, r in res.items()},
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@explainability_bp.route('/fairness-report', methods=['GET'])
def fairness_report():
    """Subgroup error rates of the deployed models on their held-out (synthetic) test split."""
    try:
        engine = get_screening_engine()
        keys = ("fpr_english", "fpr_hindi", "tpr_english", "tpr_hindi", "fpr_age_7_8", "fpr_age_11_12")
        report = {mode: {d: {k: round(m[k], 4) for k in keys} for d, m in per.items()}
                  for mode, per in engine.bundle["validation_report"].items()}
        return jsonify({
            "success": True,
            "model_id": engine.model_id,
            "operating_point": "refer threshold (sensitivity >= 0.85 on validation)",
            "data": "held-out split of the synthetic training cohort; not real-world fairness evidence",
            "fairness_report": report,
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
