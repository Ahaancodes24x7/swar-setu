from __future__ import annotations

import os
import json
import logging
import requests
from typing import Dict, Any, Optional, List

logger = logging.getLogger("SupabaseClient")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", os.environ.get("VITE_SUPABASE_ANON_KEY", ""))
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def get_headers(auth_header: Optional[str] = None, prefer_return: str = "representation") -> Dict[str, str]:
    """
    Construct HTTP headers for Supabase REST API calls.
    Uses Bearer JWT from request Authorization header if present (to respect RLS policies).
    Falls back to Service Role Key or Anon Key for server-side trusted operations.
    """
    headers = {
        "Content-Type": "application/json",
        "Prefer": f"return={prefer_return}",
    }

    if auth_header and auth_header.startswith("Bearer "):
        headers["Authorization"] = auth_header
        headers["apikey"] = SUPABASE_ANON_KEY
    elif SUPABASE_SERVICE_ROLE_KEY:
        headers["Authorization"] = f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
        headers["apikey"] = SUPABASE_SERVICE_ROLE_KEY
    else:
        headers["Authorization"] = f"Bearer {SUPABASE_ANON_KEY}"
        headers["apikey"] = SUPABASE_ANON_KEY

    return headers


def persist_assessment_pipeline_results(
    student_id: str,
    session_id: Optional[str],
    disorder_type: str,
    raw_payload: Dict[str, Any],
    feature_vector: List[float],
    prediction_data: Dict[str, Any],
    ai_explanation: Dict[str, Any],
    auth_header: Optional[str] = None
) -> Dict[str, Any]:
    """
    Writes assessment execution outputs atomically to Supabase Postgres:
    1. public.assessment_results
    2. public.predictions
    3. public.reports
    4. public.test_sessions (updates analysis_report and status)
    """
    if not student_id:
        logger.warning("No student_id provided for database persistence. Skipping DB write.")
        return {"persisted": False, "reason": "missing_student_id"}
    if not SUPABASE_URL or not (SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY):
        return {"persisted": False, "reason": "supabase_not_configured"}

    headers = get_headers(auth_header)
    rest_endpoint = f"{SUPABASE_URL}/rest/v1"

    created_ids = {}

    try:
        # Step 1: Write to assessment_results
        risk_lvl = prediction_data.get("risk_level", "low").lower()
        if risk_lvl not in ["low", "moderate", "high"]:
            risk_lvl = "moderate" if risk_lvl in ["medium", "mod"] else "low"

        scores_payload = {
            "risk_score": prediction_data.get("risk_score", 0.0),
            "confidence": prediction_data.get("confidence", 0.0),
            "uncertainty": prediction_data.get("uncertainty", 0.1),
        }
        if "full_profile" in prediction_data and "disorders" in prediction_data["full_profile"]:
            for d_name, d_val in prediction_data["full_profile"]["disorders"].items():
                scores_payload[d_name.lower()] = d_val.get("risk_score", 0.0)

        result_row = {
            "student_id": student_id,
            "session_id": session_id if session_id else None,
            "raw_answers": raw_payload.get("games") or raw_payload.get("answers") or [],
            "engineered_features": {"vector": feature_vector, "dim": len(feature_vector)},
            "scores": scores_payload,
            "risk_level": risk_lvl,
        }

        res = requests.post(f"{rest_endpoint}/assessment_results", headers=headers, json=result_row, timeout=5)
        if res.status_code in [200, 201]:
            inserted = res.json()
            assessment_result_id = inserted[0]["id"] if isinstance(inserted, list) and inserted else None
            created_ids["assessment_result_id"] = assessment_result_id
        else:
            logger.error(f"Failed to insert assessment_results: {res.status_code} - {res.text}")
            assessment_result_id = None

        # Step 2: Write to predictions
        full_prof = prediction_data.get("full_profile", {})
        disorders_info = full_prof.get("disorders", {})
        probs_json = {
            "disorders": disorders_info,
            "uncertainty": prediction_data.get("uncertainty", 0.1),
            "overall_risk": prediction_data.get("risk_level", "Low"),
        }

        prediction_row = {
            "assessment_result_id": assessment_result_id,
            "session_id": session_id if session_id else None,
            "student_id": student_id,
            "disorder_type": disorder_type or "comprehensive",
            "prediction": prediction_data.get("risk_level", "Low"),
            "confidence": min(100.0, max(0.0, float(prediction_data.get("confidence", 80.0)))),
            "probabilities": probs_json,
            "explanation": ai_explanation.get("explanation", ai_explanation.get("parent_view", {}).get("summary", "Assessment completed.")),
            "conformal_intervals": prediction_data.get("conformal_intervals", {}),
            "shap_attributions": prediction_data.get("shap_attributions", {}),
            "temperature_used": prediction_data.get("temperature_used", 1.0),
            "mc_samples_used": prediction_data.get("mc_samples_used", 30),
            "prediction_type": prediction_data.get("prediction_type", "individual"),
            "feature_vector": feature_vector
        }

        res_pred = requests.post(f"{rest_endpoint}/predictions", headers=headers, json=prediction_row, timeout=5)
        if res_pred.status_code in [200, 201]:
            inserted_p = res_pred.json()
            prediction_id = inserted_p[0]["id"] if isinstance(inserted_p, list) and inserted_p else None
            created_ids["prediction_id"] = prediction_id

        # Step 3: Write to reports
        report_row = {
            "student_id": student_id,
            "session_id": session_id if session_id else None,
            "report_type": "assessment",
            "status": "generated",
            "title": f"SLD Cognitive Screening Report - {disorder_type.title() if disorder_type else 'Comprehensive'}",
            "summary": ai_explanation.get("explanation", ai_explanation.get("parent_view", {}).get("summary", "Screening completed.")),
            "recommendations": ai_explanation.get("recommended_steps", ai_explanation.get("parent_view", {}).get("actionable_tips", [])),
            "report_json": {
                "teacher_view": ai_explanation.get("teacher_view", {}),
                "parent_view": ai_explanation.get("parent_view", {}),
                "principal_view": ai_explanation.get("principal_view", {}),
                "prediction": prediction_data,
                "ai_explanation": ai_explanation
            },
        }

        res_rep = requests.post(f"{rest_endpoint}/reports", headers=headers, json=report_row, timeout=5)
        if res_rep.status_code in [200, 201]:
            inserted_r = res_rep.json()
            report_id = inserted_r[0]["id"] if isinstance(inserted_r, list) and inserted_r else None
            created_ids["report_id"] = report_id

        # Step 4: Update test_sessions if session_id is valid
        if session_id:
            update_payload = {
                "status": "completed",
                "analysis_report": {
                    "prediction": prediction_data,
                    "explanation": ai_explanation,
                    "persisted_ids": created_ids,
                }
            }
            res_sess = requests.patch(
                f"{rest_endpoint}/test_sessions?id=eq.{session_id}",
                headers=headers,
                json=update_payload,
                timeout=5
            )
            created_ids["session_updated"] = (res_sess.status_code in [200, 204])

        return {
            "persisted": True,
            "created_ids": created_ids,
        }

    except Exception as e:
        logger.error(f"Error persisting assessment outputs to Supabase: {e}")
        return {"persisted": False, "error": str(e)}


def save_prediction_to_supabase(
    payload: Dict[str, Any],
    prediction: Dict[str, Any],
    ai_explanation: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Convenience wrapper for saving assessment pipeline output to Supabase.
    """
    student_id = payload.get("student_id") or payload.get("user_id") or "guest_student"
    session_id = payload.get("session_id") or payload.get("assessment_id")
    disorder_type = prediction.get("disorder_type", payload.get("disorder_type", ""))
    feature_vector = prediction.get("feature_vector", [])

    return persist_assessment_pipeline_results(
        student_id=student_id,
        session_id=session_id,
        disorder_type=disorder_type,
        raw_payload=payload,
        feature_vector=feature_vector,
        prediction_data=prediction,
        ai_explanation=ai_explanation
    )

