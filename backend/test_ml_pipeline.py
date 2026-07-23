import sys
import os
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai.session_adapter import build_ml_session_data
from ml_models import get_predictor

def verify_ml_pipeline():
    print("==================================================")
    print("VERIFYING END-TO-END ML FEATURE ENGINEERING PIPELINE")
    print("==================================================")

    # Raw frontend assessment payload
    raw_payload = {
        "disorder_type": "dyslexia",
        "student_id": "STU_999",
        "score": 75,
        "percentage": 75.0,
        "assessment_data": {
            "games": {
                "phonics_task": {
                    "task_type": "phoneme_awareness",
                    "correct": 15,
                    "total": 20,
                    "response_times": [1200, 1500, 1100, 1800],
                    "voice_metrics": {
                        "phoneme_score": 0.85
                    }
                },
                "drawing_task": {
                    "task_type": "handwriting_stroke",
                    "correct": 8,
                    "total": 10,
                    "drawing_metrics": {
                        "smoothness": 0.78,
                        "straightness": 0.82,
                        "pressure": 0.65,
                        "tremor": 0.12
                    }
                }
            }
        }
    }

    # 1. Feature extraction
    t0 = time.time()
    session_data = build_ml_session_data(raw_payload, disorder_type="dyslexia")
    t_feature = (time.time() - t0) * 1000
    print(f"[OK] Feature extraction completed in {t_feature:.2f} ms")

    # Verify extracted keys
    assert "games" in session_data, "Missing 'games' key in session data"
    assert "phonics_task" in session_data["games"], "Missing phonics_task in extracted games"
    print(f"  Extracted tasks: {list(session_data['games'].keys())}")

    # 2. Unified Predictor inference
    predictor = get_predictor()

    t1 = time.time()
    dyslexia_pred = predictor.predict_dyslexia(session_data)
    t_dyslexia = (time.time() - t1) * 1000
    print(f"[OK] Dyslexia prediction latency: {t_dyslexia:.2f} ms | Risk Score: {dyslexia_pred.get('risk_score', 0):.4f} | Risk Level: {dyslexia_pred.get('risk_level')}")

    t2 = time.time()
    dyscalculia_pred = predictor.predict_dyscalculia(session_data)
    t_dyscalculia = (time.time() - t2) * 1000
    print(f"[OK] Dyscalculia prediction latency: {t_dyscalculia:.2f} ms | Risk Score: {dyscalculia_pred.get('risk_score', 0):.4f} | Risk Level: {dyscalculia_pred.get('risk_level')}")

    t3 = time.time()
    dysgraphia_pred = predictor.predict_dysgraphia(session_data)
    t_dysgraphia = (time.time() - t3) * 1000
    print(f"[OK] Dysgraphia prediction latency: {t_dysgraphia:.2f} ms | Risk Score: {dysgraphia_pred.get('risk_score', 0):.4f} | Risk Level: {dysgraphia_pred.get('risk_level')}")

    # 3. Comprehensive assessment
    t4 = time.time()
    comp = predictor.comprehensive_assessment({
        "dyslexia": session_data,
        "dyscalculia": session_data,
        "dysgraphia": session_data
    })
    t_comp = (time.time() - t4) * 1000
    print(f"[OK] Comprehensive evaluation latency: {t_comp:.2f} ms | Overall Risk: {comp['comprehensive_summary']['overall_risk_level']}")

    print("==================================================")
    print("ALL ML FEATURE PIPELINE VERIFICATIONS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    verify_ml_pipeline()
