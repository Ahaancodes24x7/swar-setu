import sys
import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app

def test_gating():
    print("==================================================")
    print("VERIFYING UNIFIED COGNITIVE PROFILE 3-ASSESSMENT GATING")
    print("==================================================")

    client = app.test_client()

    # Test Case 1: Partial completion (Only 2 completed)
    partial_payload = {
        "student_id": "STU_001",
        "completed_assessments": {
            "dyslexia": {"score": 80, "total": 100},
            "dyscalculia": {"score": 75, "total": 100}
        }
    }
    res_partial = client.post('/api/unified-profile', data=json.dumps(partial_payload), content_type='application/json')
    print(f"[OK] 2 Assessments Submission Status: {res_partial.status_code}")
    assert res_partial.status_code == 400
    data_partial = res_partial.get_json()
    assert data_partial["unified_profile_ready"] is False
    assert "dysgraphia" in data_partial["missing_assessments"]
    print(f"     Gating message: {data_partial['message']}")

    # Test Case 2: Complete submission (All 3 completed)
    complete_payload = {
        "student_id": "STU_001",
        "completed_assessments": {
            "dyslexia": {"score": 80, "total": 100},
            "dyscalculia": {"score": 75, "total": 100},
            "dysgraphia": {"score": 85, "total": 100}
        }
    }
    res_complete = client.post('/api/unified-profile', data=json.dumps(complete_payload), content_type='application/json')
    print(f"[OK] 3 Assessments Submission Status: {res_complete.status_code}")
    assert res_complete.status_code == 200
    data_complete = res_complete.get_json()
    assert data_complete["unified_profile_ready"] is True
    profile = data_complete["unified_report"]["full_profile"]
    assert set(profile["disorders"]) == {"Dyslexia", "Dyscalculia", "Dysgraphia"}
    print(f"     Overall Risk Level: {profile['overall_risk_level']}")

    print("==================================================")
    print("ALL UNIFIED GATING TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_gating()
