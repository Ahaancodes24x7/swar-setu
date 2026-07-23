import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai.gemini_explainer import generate_parent_friendly_explanation

def test_explainability():
    print("==================================================")
    print("VERIFYING EXPLAINABLE AI (GEMINI) INTEGRATION")
    print("==================================================")

    # Test 1: Low risk prediction explanation
    pred_low = {"risk_level": "Low", "risk_score": 0.25, "confidence": 0.92}
    exp_low = generate_parent_friendly_explanation("dyslexia", pred_low, {"student_id": "S001"})
    print(f"[OK] Low Risk Explanation Source: {exp_low['source']}")
    print(f"     Explanation: {exp_low['explanation']}")
    assert "explanation" in exp_low and len(exp_low["recommended_steps"]) == 4

    # Test 2: High risk prediction explanation
    pred_high = {"risk_level": "High", "risk_score": 0.88, "confidence": 0.96}
    exp_high = generate_parent_friendly_explanation("dyscalculia", pred_high, {"student_id": "S002"})
    print(f"[OK] High Risk Explanation Source: {exp_high['source']}")
    print(f"     Confidence Note: {exp_high['confidence_note']}")
    assert "screening" in exp_high["confidence_note"].lower() or "confidence" in exp_high["confidence_note"].lower()

    print("==================================================")
    print("ALL EXPLAINABILITY TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_explainability()
