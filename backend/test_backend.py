import sys
import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app

def run_tests():
    print("==================================================")
    print("RUNNING SWARSETU BACKEND INTEGRATION TEST SUITE")
    print("==================================================")

    client = app.test_client()

    # 1. Health check
    res = client.get('/health')
    print(f"GET /health -> Status: {res.status_code}, Data: {res.get_json()}")
    assert res.status_code == 200, "Health check failed"

    # 2. Model info
    res = client.get('/api/model-info')
    print(f"GET /api/model-info -> Status: {res.status_code}")
    assert res.status_code == 200, "Model info failed"

    # 3. Assessment
    payload = {
        "disorder_type": "dyslexia",
        "student_id": "test-student-123",
        "score": 85,
        "percentage": 85.0,
        "responses": [{"prompt": "cat", "user_input": "kat", "correct": False}]
    }
    res = client.post('/api/assess', data=json.dumps(payload), content_type='application/json')
    print(f"POST /api/assess -> Status: {res.status_code}, Keys: {list(res.get_json().keys())}")
    assert res.status_code == 200, "Assess endpoint failed"

    # 4. Predict
    res = client.post('/api/predict', data=json.dumps(payload), content_type='application/json')
    print(f"POST /api/predict -> Status: {res.status_code}, Keys: {list(res.get_json().keys())}")
    assert res.status_code == 200, "Predict endpoint failed"

    # 5. Explainability
    explain_payload = {
        "disorder_type": "dyslexia",
        "prediction": {"risk_level": "Medium", "score": 0.65},
        "student_context": {"student_id": "test-123"}
    }
    res = client.post('/api/explainability', data=json.dumps(explain_payload), content_type='application/json')
    print(f"POST /api/explainability -> Status: {res.status_code}")
    assert res.status_code == 200, "Explainability failed"

    # 6. Training status
    res = client.get('/api/train')
    print(f"GET /api/train -> Status: {res.status_code}")
    assert res.status_code == 200, "Train status failed"

    # 7. Reports
    report_payload = {
        "student_name": "Aarav Sharma",
        "assessment_type": "Dyslexia Screening",
        "risk_level": "Low",
        "scores": {"phoneme": 90, "fluency": 85}
    }
    res = client.post('/api/reports', data=json.dumps(report_payload), content_type='application/json')
    print(f"POST /api/reports -> Status: {res.status_code}")
    assert res.status_code == 200, "Reports failed"

    print("==================================================")
    print("ALL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
