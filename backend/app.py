import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from routes.health import health_bp
from routes.assessment import assessment_bp
from routes.explainability import explainability_bp
from routes.training import training_bp
from routes.reports import reports_bp
from ai.pipeline import run_assessment_ai_pipeline

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/*": {"origins": "*"}})

# Register Route Blueprints
app.register_blueprint(health_bp)
app.register_blueprint(assessment_bp, url_prefix="/api")
app.register_blueprint(explainability_bp, url_prefix="/api")
app.register_blueprint(training_bp, url_prefix="/api")
app.register_blueprint(reports_bp, url_prefix="/api")


@app.route("/api/assess", methods=["POST"])
def assess_direct():
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
        })

    except Exception as e:
        print("SERVER ERROR:", e)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


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
            "version": "2.0.0"
        }), 200


@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Resource not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Internal server error", "details": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
