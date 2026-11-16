from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

from .session_adapter import build_ml_session_data, extract_64d_feature_vector, extract_16d_feature_vector
from .gemini_explainer import generate_parent_friendly_explanation
from .supabase_client import persist_assessment_pipeline_results

logger = logging.getLogger("AssessmentPipeline")

DISORDER_NAMES = {"dyslexia": "Dyslexia", "dyscalculia": "Dyscalculia", "dysgraphia": "Dysgraphia"}
LEVEL_ORDER = {"Low": 0, "Medium": 1, "Elevated": 2, "High": 3}


def active_engine() -> str:
    return os.getenv("SWARSETU_ENGINE", "lightgbm").strip().lower()


def _profile_answers(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Stored DSM-5 student profile for this child (if any)."""
    student_id = payload.get("student_id")
    if not student_id:
        return None
    try:
        from storage import get_store
        profile = get_store().get_profile(str(student_id))
        return profile["answers"] if profile else None
    except Exception as e:
        logger.warning("Profile lookup failed: %s", e)
        return None


def _lightgbm_prediction(payload: Dict[str, Any], disorder_key: str) -> Dict[str, Any]:
    from screening import get_screening_engine
    engine = get_screening_engine()
    res = engine.screen(payload, disorder_key, profile_answers=_profile_answers(payload))
    disorders = res["disorders"]
    if disorder_key in DISORDER_NAMES:
        name = DISORDER_NAMES[disorder_key]
    else:  # comprehensive: headline the highest-risk disorder, keep all three in full_profile
        name = max(disorders, key=lambda d: (LEVEL_ORDER[disorders[d]["risk_level"]], disorders[d]["risk_score"]))
    main = disorders[name]
    overall = max((d["risk_level"] for d in disorders.values()), key=LEVEL_ORDER.get)
    prediction = {
        "disorder_type": disorder_key or "comprehensive",
        "headline_disorder": name,
        "prediction_type": "single_test" if res["mode"] != "full" else "comprehensive",
        "model_id": res["model_id"],
        "risk_level": main["risk_level"],
        "risk_score": main["risk_score"],
        "base_rate": main["base_rate"],
        "relative_risk": main["relative_risk"],
        "flagged": main["flagged"],
        "threshold_used": main["threshold_used"],
        "monitor_threshold": main["monitor_threshold"],
        "screening_decision": main["screening_decision"],
        "conformal_set": main["conformal_set"],
        "conformal_coverage_target": main["conformal_coverage_target"],
        "recommendations": [main["recommendation"]],
        "top_3_shap_features": main["top_shap_features"],
        "shap_attributions": main["shap_attributions"],
        "protective_features": main["protective_features"],
        "covariates": res["covariates"],
        "full_profile": {"disorders": disorders, "overall_risk_level": overall, "mode": res["mode"]},
        "dsm5": res.get("dsm5"),
        "clinical_note": ("Screening result from a model trained on synthetic data; not clinically validated "
                          "and not a diagnosis."),
    }
    return {"prediction": prediction, "feature_vector": res["feature_vector"], "mode": res["mode"],
            "covariates": res["covariates"], "model_id": res["model_id"]}


def _legacy_ft_prediction(payload: Dict[str, Any], disorder_key: str) -> Dict[str, Any]:
    """Previous FT-Transformer engine, kept for comparison (SWARSETU_ENGINE=ft)."""
    from .inference_engine import get_inference_engine
    from .individual_predictors import IndividualDisorderPredictor
    engine = get_inference_engine()
    model_id = f"ft-transformer@{os.path.basename(engine.checkpoint_path or 'none')}"
    if disorder_key in DISORDER_NAMES:
        fv16 = extract_16d_feature_vector(payload, disorder_key)
        r = IndividualDisorderPredictor(disorder_key).predict(fv16, n_mc_samples=30)
        pred = {"disorder_type": disorder_key, "prediction_type": r["prediction_type"], "model_id": model_id,
                "risk_level": r["risk_level"], "risk_score": r["risk_score"], "uncertainty": r["uncertainty"],
                "threshold_used": r["threshold_used"], "recommendations": [r["recommendation"]],
                "top_3_shap_features": r["top_shap_features"], "shap_attributions": r["shap_attributions"],
                "clinical_note": r["clinical_note"]}
        return {"prediction": pred, "feature_vector": r["full_64d_vector"], "mode": disorder_key,
                "covariates": None, "model_id": model_id}
    fv = extract_64d_feature_vector(payload, disorder_type=disorder_key)
    profile = engine.predict_cognitive_profile(fv, n_samples=30)
    name = "Dyslexia"
    spec = profile["disorders"][name]
    pred = {"disorder_type": disorder_key or "comprehensive", "prediction_type": "unified_64d", "model_id": model_id,
            "risk_level": profile["overall_summary"]["overall_risk_level"], "risk_score": spec["risk_score"],
            "uncertainty": spec["uncertainty"], "threshold_used": spec["threshold_used"],
            "recommendations": [spec["recommendation"]], "top_3_shap_features": spec["top_shap_features"],
            "shap_attributions": spec["shap_attributions"], "full_profile": profile}
    return {"prediction": pred, "feature_vector": fv, "mode": "full", "covariates": None, "model_id": model_id}


def run_assessment_ai_pipeline(
    payload: Dict[str, Any],
    disorder_type: str,
    score: float | int | None = None,
    percentage: float | int | None = None,
    auth_header: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Screening pipeline: features -> model -> explanation -> local storage
    (always) -> Supabase sync (only when configured and a student_id is given).
    """
    disorder_key = (disorder_type or "").strip().lower()
    if disorder_key in ("all", "unified"):
        disorder_key = "comprehensive"
    session_data = build_ml_session_data(payload, disorder_type=disorder_key)

    out = (_legacy_ft_prediction if active_engine() == "ft" else _lightgbm_prediction)(payload, disorder_key)
    prediction = out["prediction"]

    cov = out.get("covariates") or {}
    ai_explanation = generate_parent_friendly_explanation(
        disorder_type=prediction.get("headline_disorder", disorder_key or "comprehensive"),
        prediction=prediction,
        student_context={"student_age": cov.get("age_years"), "grade": payload.get("grade"),
                         "score": score, "percentage": percentage},
    )

    from storage import get_store
    store = get_store()
    student_id = payload.get("student_id") or payload.get("user_id")
    session_id = payload.get("session_id") or payload.get("assessment_id")
    assessment_id = None
    try:
        assessment_id = store.save_assessment(
            disorder_type=disorder_key or "comprehensive", model_id=out["model_id"], raw_payload=payload,
            feature_vector=out["feature_vector"], prediction=prediction, screening_mode=out["mode"],
            covariates=out.get("covariates"), explanation=ai_explanation, student_id=student_id,
            session_id=session_id)
    except Exception as e:
        logger.error("Screening store write failed: %s", e)

    # Legacy Supabase REST tables (assessment_results / predictions / reports) are optional
    remote = {"persisted": False, "reason": "disabled (set SUPABASE_SYNC=1 to enable)"}
    if not student_id:
        remote = {"persisted": False, "reason": "missing_student_id"}
    elif os.getenv("SUPABASE_SYNC", "0") == "1":
        remote = persist_assessment_pipeline_results(
            student_id=student_id, session_id=session_id, disorder_type=disorder_key or "comprehensive",
            raw_payload=payload, feature_vector=out["feature_vector"], prediction_data=prediction,
            ai_explanation=ai_explanation, auth_header=auth_header)
    if assessment_id:
        store.set_remote_sync(assessment_id, remote)

    return {
        "assessment_id": assessment_id,
        "prediction": prediction,
        "ai_explanation": ai_explanation,
        "session_data": session_data,
        "feature_vector": out["feature_vector"],
        "persistence": {"local": {"saved": assessment_id is not None, "assessment_id": assessment_id,
                                  "backend": getattr(store, "backend", "unknown")},
                        "supabase": remote},
    }
