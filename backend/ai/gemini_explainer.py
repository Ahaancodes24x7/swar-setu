from __future__ import annotations

import json
import os
from typing import Any, Dict


def generate_parent_friendly_explanation(
    disorder_type: str,
    prediction: Dict[str, Any],
    student_context: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    risk_level = str(prediction.get("risk_level", "Unknown"))
    risk_score = prediction.get("risk_score", 0)
    confidence = prediction.get("confidence", 0)

    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    if not api_key:
        return _fallback_explanation(disorder_type, risk_level, risk_score, confidence)

    prompt = _build_prompt(disorder_type, risk_level, risk_score, confidence, student_context)

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        text = (getattr(response, "text", "") or "").strip()
        parsed = json.loads(_strip_code_fences(text))

        return {
            "source": "gemini",
            "explanation": str(parsed.get("explanation", "")),
            "recommended_steps": parsed.get("recommended_steps", []),
            "confidence_note": str(parsed.get("confidence_note", "")),
        }
    except Exception:
        return _fallback_explanation(disorder_type, risk_level, risk_score, confidence)


def _build_prompt(
    disorder_type: str,
    risk_level: str,
    risk_score: Any,
    confidence: Any,
    student_context: Dict[str, Any] | None,
) -> str:
    context_json = json.dumps(student_context or {}, ensure_ascii=True)
    return f"""
Return ONLY valid JSON (no markdown) with keys:
- explanation: string, 2 to 4 short parent-friendly sentences
- recommended_steps: string array with exactly 4 practical steps
- confidence_note: one sentence clarifying this is a screening output

Context:
disorder_type={disorder_type}
risk_level={risk_level}
risk_score={risk_score}
confidence={confidence}
student_context={context_json}
"""


def _fallback_explanation(disorder_type: str, risk_level: str, risk_score: Any, confidence: Any) -> Dict[str, Any]:
    message_by_level = {
        "None": "Current assessment signals do not show clear risk indicators. Continue normal support and periodic monitoring.",
        "Low": "The assessment shows mild indicators that should be watched. This is not a diagnosis, but early support can help.",
        "Medium": "The assessment shows notable indicators. A professional screening is recommended to confirm learning needs.",
        "High": "The assessment shows strong indicators. Please schedule a specialist evaluation soon for a full support plan.",
    }
    steps_by_level = {
        "None": [
            "Continue current learning routine.",
            "Track progress every few weeks.",
            "Maintain practice in foundational skills.",
            "Repeat assessment in the next term.",
        ],
        "Low": [
            "Start targeted daily practice at home or school.",
            "Track weekly trends in speed and accuracy.",
            "Inform teachers to add light accommodations.",
            "Reassess in 4 to 6 weeks.",
        ],
        "Medium": [
            "Book a specialist screening.",
            "Begin structured intervention sessions.",
            "Apply classroom accommodations consistently.",
            "Review progress every 2 to 4 weeks.",
        ],
        "High": [
            "Schedule comprehensive specialist evaluation immediately.",
            "Initiate formal school support procedures.",
            "Use intensive structured interventions.",
            "Hold frequent teacher-parent progress reviews.",
        ],
    }

    return {
        "source": "fallback",
        "explanation": message_by_level.get(risk_level, message_by_level["Low"]),
        "recommended_steps": steps_by_level.get(risk_level, steps_by_level["Low"]),
        "confidence_note": f"Model confidence: {confidence}. Risk score: {risk_score}. This output is for screening, not diagnosis.",
        "meta": {
            "disorder_type": disorder_type,
            "risk_level": risk_level,
        },
    }


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if "\n" in stripped:
            stripped = stripped.split("\n", 1)[1]
    if stripped.endswith("```"):
        stripped = stripped[:-3]
    return stripped.strip()
