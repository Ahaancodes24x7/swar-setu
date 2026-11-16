from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

from .llm import LLMUnavailable, generate_json

logger = logging.getLogger("GeminiExplainer")

FEATURE_GLOSSARY = {
    "word_decoding_accuracy": "reading made-up words (decoding)",
    "phonological_awareness_score": "hearing and working with sounds in words",
    "rapid_naming_speed_normalized": "how quickly familiar items are named",
    "words_per_minute_normalized": "reading speed",
    "reading_accuracy_rate": "reading accuracy",
    "phoneme_error_rate": "sound errors while reading",
    "arithmetic_retrieval_time": "recalling basic number facts",
    "calculation_precision": "accuracy in calculations",
    "number_line_accuracy": "placing numbers on a number line",
    "counting_strategy_efficiency": "counting strategies",
    "multi_step_accuracy": "multi-step maths problems",
    "kinematic_smoothness": "smoothness of pen strokes",
    "motor_control_composite": "fine motor control while writing",
    "letter_size_variance": "consistency of letter size",
    "spatial_alignment": "keeping writing on the line",
}


def generate_parent_friendly_explanation(
    disorder_type: str,
    prediction: Dict[str, Any],
    student_context: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    shap_features = prediction.get("top_3_shap_features", prediction.get("top_shap_features", []))
    prompt = _build_prompt(disorder_type, prediction, student_context)
    try:
        parsed, model_name = generate_json(prompt, temperature=0.4)
    except LLMUnavailable as e:
        return _fallback_explanation(disorder_type, prediction, reason=str(e))
    except (ValueError, KeyError) as e:  # malformed JSON
        return _fallback_explanation(disorder_type, prediction, reason=f"unparseable response: {e}")
    steps = parsed.get("recommended_steps", [])
    return {
        "source": "gemini",
        "model": model_name,
        "explanation": str(parsed.get("explanation", "")),
        "recommended_steps": [str(x) for x in steps][:4] if isinstance(steps, list) else [],
        "confidence_note": str(parsed.get("confidence_note", "")),
        "shap_context_used": bool(shap_features),
    }


def _plain(features: List[str]) -> List[str]:
    return [FEATURE_GLOSSARY.get(f, f.replace("missing:", "missing ").replace("_", " ")) for f in features]


def _build_prompt(disorder_type: str, prediction: Dict[str, Any], student_context: Dict[str, Any] | None) -> str:
    ctx = student_context or {}
    # never send identifiers to the LLM
    safe_ctx = {k: ctx[k] for k in ("student_age", "grade", "score", "percentage") if ctx.get(k) is not None}
    facts = {
        "disorder_screened": disorder_type,
        "risk_level": prediction.get("risk_level"),
        "risk_probability": prediction.get("risk_score"),
        "referral_threshold": prediction.get("threshold_used"),
        "screening_decision": prediction.get("screening_decision"),
        "main_areas_of_difficulty": _plain(prediction.get("top_3_shap_features", [])),
        "areas_of_strength": _plain(list((prediction.get("protective_features") or {}).keys())[:3]),
        "dsm5_screening_status": ((prediction.get("dsm5") or {}).get("domains") or {})
            .get(prediction.get("headline_disorder") or "", {}).get("status"),
        "other_factors_to_check_first": [f["message"] for f in (prediction.get("dsm5") or {}).get("exclusion_flags", [])],
        "child": safe_ctx,
    }
    return f"""You explain results of a school learning-difficulty SCREENING (not a diagnosis) to parents.
Return ONLY a JSON object with keys:
- "explanation": 2-4 short, warm, plain-language sentences. Mention the main areas of difficulty and one strength if given.
  Never say the child "has" a disorder; say the screening "suggests" or "does not suggest" difficulties.
- "recommended_steps": exactly 4 practical home/school steps suited to the risk level.
- "confidence_note": one sentence. If screening_decision is "uncertain", say the result is borderline and a re-screen is
  advisable; otherwise say how confident the screen is in plain words. Always state it is a screening, not a diagnosis.
If "other_factors_to_check_first" is not empty, gently say these should be checked first, because they can
cause similar difficulties. Do not invent numbers that are not in the facts.

Facts:
{json.dumps(facts, ensure_ascii=True, default=str)}
"""


def _fallback_explanation(disorder_type: str, prediction: Dict[str, Any], reason: str = "") -> Dict[str, Any]:
    risk_level = str(prediction.get("risk_level", "Low"))
    shap_features = prediction.get("top_3_shap_features", prediction.get("top_shap_features", [])) or []
    areas = _plain(shap_features[:3])
    feature_str = f" The areas that most influenced this result were: {', '.join(areas)}." if areas else ""

    message_by_level = {
        "Low": f"This screening does not suggest difficulties with {disorder_type} at this time.{feature_str} Continue regular learning and routine screening.",
        "Medium": f"This screening shows some signs that may relate to {disorder_type}.{feature_str} Targeted support and a re-screen in a few weeks are advisable.",
        "High": f"This screening suggests possible difficulties related to {disorder_type}.{feature_str} A specialist assessment is recommended to understand your child's needs.",
    }
    message_by_level["Elevated"] = message_by_level["High"]
    steps_by_level = {
        "Low": ["Continue the current learning routine.", "Read or practise together for 10-15 minutes daily.",
                "Share progress with the teacher each term.", "Repeat the screening next term."],
        "Medium": ["Start short daily practice on the highlighted skills.", "Ask the teacher for small classroom supports.",
                   "Track progress weekly.", "Re-screen in 6-8 weeks."],
        "High": ["Book an assessment with a qualified specialist.", "Share this screening report with the school.",
                 "Begin structured, multisensory practice on the highlighted skills.",
                 "Hold regular teacher-parent check-ins."],
    }
    steps_by_level["Elevated"] = steps_by_level["High"]

    decision = prediction.get("screening_decision")
    certainty = (" The result is borderline, so a re-screen is advisable." if decision == "uncertain" else "")
    return {
        "source": "fallback",
        "fallback_reason": reason,
        "explanation": message_by_level.get(risk_level, message_by_level["Low"]),
        "recommended_steps": steps_by_level.get(risk_level, steps_by_level["Low"]),
        "confidence_note": f"This is a screening result, not a diagnosis.{certainty}",
        "meta": {"disorder_type": disorder_type, "risk_level": risk_level, "top_shap_features": shap_features},
    }
