import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config import load_environment

load_environment()

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from routes.health import health_bp
from routes.assessment import assessment_bp
from routes.explainability import explainability_bp
from routes.training import training_bp
from routes.reports import reports_bp
from routes.functions import functions_bp
from routes.handwriting import handwriting_bp
from routes.students import students_bp
from routes.access import access_bp

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/*": {"origins": "*"}})

# Register Route Blueprints
app.register_blueprint(health_bp)
app.register_blueprint(assessment_bp, url_prefix="/api")
app.register_blueprint(explainability_bp, url_prefix="/api")
app.register_blueprint(training_bp, url_prefix="/api")
app.register_blueprint(reports_bp, url_prefix="/api")
app.register_blueprint(handwriting_bp, url_prefix="/api")
app.register_blueprint(students_bp, url_prefix="/api")
app.register_blueprint(access_bp, url_prefix="/api")
# Supabase edge-function ports (same paths as Supabase)
app.register_blueprint(functions_bp, url_prefix="/functions/v1")


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    elif os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    else:
        return jsonify({
            "status": "healthy",
            "service": "SwarSetu AI Backend Engine",
            "version": "3.0.0"
        }), 200


@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Resource not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Internal server error", "details": str(e)}), 500


if __name__ == "__main__":
    try:
        from ai.pipeline import active_engine
        from screening import get_screening_engine
        engine = get_screening_engine()
        print(f"[STARTUP CHECK] Active engine: {active_engine()} | screening bundle {engine.model_id}")
        print(f"[STARTUP CHECK] Gemini key configured: {bool(os.getenv('GEMINI_API_KEY'))}")
        from storage import get_store
        stats = get_store().stats()
        print(f"[STARTUP CHECK] Screening store: {stats['backend']}"
              f"{' (embedded)' if stats.get('embedded') else ''}, {stats['assessments']} assessments stored")
    except Exception as e:
        print(f"[STARTUP WARNING] Screening engine failed to load: {e}")

    if os.environ.get("WARM_MODELS", "1") == "1":
        import threading

        def _warm():
            for label, loader in (("speech", "ai.speech:warm_up"), ("handwriting", "ai.handwriting:_load")):
                try:
                    mod, fn = loader.split(":")
                    getattr(__import__(mod, fromlist=[fn]), fn)()
                    print(f"[STARTUP CHECK] {label} model ready")
                except Exception as e:  # missing weights: run download_models.py
                    print(f"[STARTUP WARNING] {label} model not loaded: {type(e).__name__}: {str(e)[:120]}")

        threading.Thread(target=_warm, daemon=True).start()

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
