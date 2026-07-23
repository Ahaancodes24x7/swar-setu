from flask import Blueprint, request, jsonify
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/reports', methods=['POST'])
def generate_report():
    """Generates structured screening reports for student assessment sessions"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No JSON payload provided"
            }), 400

        student_name = data.get("student_name", "Student")
        assessment_type = data.get("assessment_type", "Comprehensive SLD Screening")
        risk_level = data.get("risk_level", "Low")
        scores = data.get("scores", {})

        report_summary = {
            "title": f"SwarSetu Neurodevelopmental Screening Report - {student_name}",
            "student_name": student_name,
            "assessment_type": assessment_type,
            "overall_risk_level": risk_level,
            "scores": scores,
            "recommendations": [
                "Schedule periodic progress monitoring every 6-8 weeks",
                "Utilize visual & phonics assistive resources on SwarSetu learning portal",
                "Consult educator for tailored classroom accommodations"
            ],
            "generated_by": "SwarSetu AI Clinical Core v2.0"
        }

        return jsonify({
            "success": True,
            "report": report_summary
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
