import sys
import os

<<<<<<< HEAD
# Ensure backend directory is treated as root for imports
=======
# Ensure backend directory is treated as root
>>>>>>> 49401bae22ff6d5beeb384cc388a986441501b76
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

<<<<<<< HEAD
from flask import Flask, jsonify
from flask_cors import CORS

from routes.health import health_bp
from routes.assessment import assessment_bp
from routes.explainability import explainability_bp
from routes.training import training_bp
from routes.reports import reports_bp

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/*": {"origins": "*"}})

# Register Route Blueprints
app.register_blueprint(health_bp)
app.register_blueprint(assessment_bp, url_prefix="/api")
app.register_blueprint(explainability_bp, url_prefix="/api")
app.register_blueprint(training_bp, url_prefix="/api")
app.register_blueprint(reports_bp, url_prefix="/api")

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Resource not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Internal server error", "details": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
=======
from flask import Flask, request, jsonify
from flask_cors import CORS
from ai.pipeline import run_assessment_ai_pipeline

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return {"message": "SwarSetu AI backend running"}


@app.route("/api/assess", methods=["POST"])
def assess():
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


if __name__ == "__main__":
    app.run(debug=True, port=5000)
>>>>>>> 49401bae22ff6d5beeb384cc388a986441501b76
