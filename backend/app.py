import sys
import os

# Ensure backend directory is treated as root
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

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