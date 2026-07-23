from __future__ import annotations

from typing import Any, Dict

from .session_adapter import build_ml_session_data
from .gemini_explainer import generate_parent_friendly_explanation
from ml_models import get_predictor

def run_assessment_ai_pipeline(
    payload: Dict[str, Any],
    disorder_type: str,
    score: float | int | None = None,
    percentage: float | int | None = None,
) -> Dict[str, Any]:
    """
    End-to-end AI integration for Flask route usage.
    Returns: {prediction, ai_explanation, session_data}
    """
    session_data = build_ml_session_data(payload, disorder_type=disorder_type)
    predictor = get_predictor()

    disorder_key = (disorder_type or "").strip().lower()
    predictor_dispatch = {
        "dyslexia": predictor.predict_dyslexia,
        "dyscalculia": predictor.predict_dyscalculia,
        "dysgraphia": predictor.predict_dysgraphia,
    }

    if disorder_key not in predictor_dispatch:
        raise ValueError(f"Unsupported disorder_type: {disorder_type}")

    prediction = predictor_dispatch[disorder_key](session_data)
    ai_explanation = generate_parent_friendly_explanation(
        disorder_type=disorder_key,
        prediction=prediction,
        student_context={
            "score": score,
            "percentage": percentage,
            "student_id": payload.get("student_id"),
            "assessment_id": payload.get("assessment_id"),
        },
    )

    return {
        "prediction": prediction,
        "ai_explanation": ai_explanation,
        "session_data": session_data,
    }
