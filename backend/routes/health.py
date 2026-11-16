from flask import Blueprint, jsonify
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai.pipeline import active_engine

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
@health_bp.route('/api/health', methods=['GET'])
@health_bp.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "SwarSetu AI Backend Engine",
        "version": "3.0.0",
        "engine": active_engine(),
    }), 200


@health_bp.route('/model-info', methods=['GET'])
@health_bp.route('/api/model-info', methods=['GET'])
def model_info():
    try:
        from screening import get_screening_engine
        return jsonify({"success": True, "active_engine": active_engine(),
                        "model_info": get_screening_engine().info()}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@health_bp.route('/model-health', methods=['GET'])
@health_bp.route('/api/model-health', methods=['GET'])
def model_health():
    try:
        from screening import get_screening_engine
        engine = get_screening_engine()
        return jsonify({
            "success": True,
            "active_engine": active_engine(),
            "model_id": engine.model_id,
            "bundle_path": engine.bundle_path,
            "bundle_sha256": engine.bundle["sha256"],
            "model_verified": True,
            "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
            "warning": engine.bundle["training_data"]["warning"],
        }), 200
    except Exception as e:
        return jsonify({"success": False, "model_verified": False, "error": str(e)}), 500
