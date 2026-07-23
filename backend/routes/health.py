from flask import Blueprint, jsonify
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ml_models import get_predictor

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
@health_bp.route('/api/health', methods=['GET'])
@health_bp.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "SwarSetu AI Backend Engine",
        "version": "2.0.0",
        "framework": "Flask Engine with PyTorch ML Pipelines"
    }), 200

@health_bp.route('/model-info', methods=['GET'])
@health_bp.route('/api/model-info', methods=['GET'])
def model_info():
    try:
        predictor = get_predictor()
        info = predictor.get_model_info()
        return jsonify({
            "success": True,
            "model_info": info
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
