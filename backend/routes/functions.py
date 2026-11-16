"""
Flask ports of the Supabase edge functions (supabase/functions/*), served at the
same paths (/functions/v1/<name>) so the frontend only changes its base URL.

LLM calls go straight to Gemini (GEMINI_API_KEY) instead of the Lovable AI gateway.
Speech-to-text runs on the self-hosted Whisper model (ai/speech.py).
Gemini's default safety filters stay on.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re

import requests
from flask import Blueprint, Response, jsonify, request, stream_with_context

from ai.llm import LLMUnavailable, generate, generate_image, generate_json, stream

logger = logging.getLogger("EdgeFunctions")
functions_bp = Blueprint("functions", __name__)

MAX_AUDIO_BYTES = 25 * 1024 * 1024


def _error(message: str, status: int = 500, **extra):
    return jsonify({"error": message, **extra}), status


# ---------------------------------------------------------------------------
# saathi-chat: streaming chatbot (SSE in OpenAI delta format, as before)
# ---------------------------------------------------------------------------

SAATHI_SYSTEM = """You are "Saathi" (साथी), a friendly, encouraging, and patient AI learning companion. Your name means "companion" or "friend" in Hindi.

Your role:
- Help children and parents with learning support
- Generate grade-appropriate practice questions (reading, math, writing)
- Provide emotional support and reassurance to parents
- Explain concepts in simple, child-friendly language
- Be extremely encouraging and celebrate small wins
- Keep responses short, engaging, and interactive, with a few emojis
- Never make anyone feel bad about mistakes - frame them as learning opportunities
- Never diagnose; suggest a qualified professional when parents ask about diagnosis

Current context:
- User name: {name}
- User role: {role} (student or parent)
- Grade level: {grade}
- Preferred language: {language}

FOR STUDENTS (Grade {grade}): short grade-appropriate reading, number and writing/phoneme practice
(3-5 questions per session) with immediate positive feedback.
FOR PARENTS: reassurance, simple explanations of learning differences, practical home-support tips,
and when to seek professional help."""


@functions_bp.route("/saathi-chat", methods=["POST"])
def saathi_chat():
    body = request.get_json(silent=True) or {}
    messages = body.get("messages") or []
    system = SAATHI_SYSTEM.format(name=body.get("studentName") or "Friend", role=body.get("userRole") or "student",
                                  grade=body.get("userGrade") or "3", language=body.get("language") or "English")
    convo = "\n".join(f"{'Student/Parent' if m.get('role') == 'user' else 'Saathi'}: {m.get('content', '')}"
                      for m in messages if isinstance(m, dict))
    chunks = stream(f"Conversation:\n{convo}\nSaathi:", system=system, temperature=0.8)
    try:
        first = next(chunks)
    except StopIteration:
        first = ""
    except LLMUnavailable as e:
        logger.error("saathi-chat unavailable: %s", e)
        return _error("Saathi is having trouble thinking. Please try again!")

    def sse():
        try:
            for text in ([first] if first else []):
                yield f"data: {json.dumps({'choices': [{'delta': {'content': text}}]})}\n\n"
            for text in chunks:
                yield f"data: {json.dumps({'choices': [{'delta': {'content': text}}]})}\n\n"
        except LLMUnavailable as e:
            logger.error("saathi-chat stream ended early: %s", e)
        yield "data: [DONE]\n\n"

    return Response(stream_with_context(sse()), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------------------------------------------------------------------------
# Speech-to-text (self-hosted Whisper)
# ---------------------------------------------------------------------------

def _transcribe(audio, language_code: str, word_timestamps: bool = False) -> dict:
    from ai.speech import decode_audio, transcribe
    data = audio.read(MAX_AUDIO_BYTES + 1)
    if len(data) > MAX_AUDIO_BYTES:
        raise ValueError("Audio file too large (max 25 MB)")
    return transcribe(decode_audio(data), language_code, word_timestamps=word_timestamps)


@functions_bp.route("/transcribe", methods=["POST"])
def transcribe_audio():
    """multipart/form-data: audio=<file>, language=<en|hi|eng|hin|...>, words=1 for word timestamps"""
    audio = request.files.get("audio")
    if not audio:
        return _error("No audio file provided", 400)
    try:
        return jsonify(_transcribe(audio, request.form.get("language") or "en",
                                   word_timestamps=request.form.get("words") == "1"))
    except ValueError as e:
        return _error(str(e), 400)
    except OSError as e:  # model weights not in the local cache
        logger.error("speech model unavailable: %s", e)
        return _error("Speech model not installed on the server (run backend/download_models.py)", 503)
    except Exception as e:
        logger.exception("transcription failed")
        return _error(f"Speech-to-text failed: {type(e).__name__}")


def _levenshtein(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _word_accuracy(expected: str, actual: str) -> int:
    exp, act = expected.lower().split(), actual.lower().split()
    if not exp:
        return 0
    total = 0.0
    for e in exp:
        total += max((1 - _levenshtein(e, a) / max(len(e), len(a)) for a in act), default=0.0)
    return round(100 * total / len(exp))


@functions_bp.route("/analyze-voice-practice", methods=["POST"])
def analyze_voice_practice():
    audio = request.files.get("audio")
    if not audio:
        return _error("No audio file provided", 400)
    prompt_text = request.form.get("prompt_text") or ""
    language = request.form.get("language") or "en"
    try:
        t = _transcribe(audio, language, word_timestamps=True)  # hesitation analysis needs word timing
    except ValueError as e:
        return _error(str(e), 400)
    except Exception as e:
        logger.exception("transcription failed")
        return _error(f"Speech-to-text failed: {type(e).__name__}")

    spoken = t.get("text", "")
    words = [w for w in t.get("words", []) if w.get("type", "word") == "word"]
    accuracy = _word_accuracy(prompt_text, spoken)
    hesitations, pause_ms, prev_end = 0, 0.0, 0.0
    for w in words:
        start, end = w.get("start") or 0, w.get("end") or 0
        if prev_end > 0 and start - prev_end > 0.5:
            hesitations += 1
            pause_ms += (start - prev_end) * 1000
        prev_end = end
    fluency = 100 - 5 * hesitations - (15 if len(words) < 0.8 * len(prompt_text.split()) else 0)
    fluency = max(0, min(100, fluency))

    try:
        feedback, _ = generate(
            f'The child was asked to read: "{prompt_text}"\nThey said: "{spoken}"\n'
            f"Accuracy: {accuracy}%\nFluency: {fluency}%\nHesitations: {hesitations}\n\nProvide brief feedback.",
            system="You are Saathi, a friendly learning assistant for children. Give brief, encouraging feedback "
                   "(2-3 sentences max) on their reading practice, with one helpful tip if needed, simple words "
                   "and one emoji.", temperature=0.6)
    except LLMUnavailable:
        feedback = ("Excellent reading! You pronounced the words really well! 🌟" if accuracy >= 90 else
                    "Good effort! Keep practicing and you'll get even better! 📚" if accuracy >= 70 else
                    "Nice try! Let's practice a bit more together. You're improving! 💪" if accuracy >= 50 else
                    "That's okay! Reading takes practice. Let's try again slowly. 🤗")
    return jsonify({"transcription": spoken, "pronunciation_score": accuracy, "fluency_score": fluency,
                    "hesitation_count": hesitations, "pause_duration_ms": round(pause_ms),
                    "accuracy_score": accuracy, "feedback": feedback.strip()})


# ---------------------------------------------------------------------------
# Speech analysis and perception (Gemini)
# ---------------------------------------------------------------------------

VOICE_SYSTEM = """You are an expert speech-language pathologist AI analysing speech for possible learning-difficulty
INDICATORS (never diagnoses). Be conservative and evidence-based.
Dyslexia indicators: phoneme substitutions (b/d, p/b, t/d), omissions, sequencing errors, consonant-cluster difficulty.
Dyscalculia indicators: number transcoding errors (21/12, 6/9), place-value confusion, verbal miscounting.
Return a JSON object: {"overallScore": 0-100, "phonemeErrorRate": 0-100, "pronunciationConsistency": 0-100,
"prosodicScore": 0-100, "temporalScore": 0-100, "errorPatternDensity": 0-100,
"errors": [{"type": "substitution|omission|insertion|transposition", "expected": "", "actual": "", "position": 0}],
"flaggedConditions": [], "riskLevel": "low|moderate|high", "summary": "2-3 sentences", "recommendations": []}"""


@functions_bp.route("/analyze-voice", methods=["POST"])
def analyze_voice():
    b = request.get_json(silent=True) or {}
    prompt = (f"Analyse this speech sample for a {b.get('grade')} student.\nTest type: {b.get('testType')}\n"
              f"Language: {b.get('language')}\n\nExpected text: \"{b.get('expectedText', '')}\"\n"
              f"Actual transcription: \"{b.get('transcription', '')}\"")
    try:
        analysis, _ = generate_json(prompt, system=VOICE_SYSTEM, temperature=0.3)
        return jsonify(analysis)
    except (LLMUnavailable, ValueError) as e:
        logger.error("analyze-voice failed: %s", e)
        # no invented scores: tell the client the analysis is unavailable
        return _error("Voice analysis is temporarily unavailable", 503)


PERCEPTION_DEFAULT_KEYS = ("emotionalPolarity", "detailLevel", "perspectiveType", "consistency", "trends", "summary")


@functions_bp.route("/analyze-perception", methods=["POST"])
def analyze_perception():
    b = request.get_json(silent=True) or {}
    responses = b.get("responses") or []
    summary = "\n".join(f"Q{i + 1} ({r.get('questionType')}): \"{r.get('response')}\" (response time: {r.get('responseTime')}s)"
                        for i, r in enumerate(responses) if isinstance(r, dict))
    prompt = f"""Analyse these perception test responses from a Grade {b.get('gradeLevel')} student.
Give a gentle, non-diagnostic description of their perception patterns.

Responses:
{summary}

Return JSON: {{"emotionalPolarity": "positive|neutral|negative|mixed", "detailLevel": "low|medium|high",
"perspectiveType": "concrete|abstract|empathetic|analytical", "consistency": 0-100,
"trends": {{"emotional": "one sentence", "cognitive": "one sentence"}}, "summary": "1-2 gentle sentences for parents/teachers"}}
Use non-judgemental language and no medical or psychological labels."""
    try:
        analysis, _ = generate_json(prompt, system="You are a gentle educational psychologist assistant. "
                                    "Describe patterns without diagnosis, in encouraging language.", temperature=0.3)
        return jsonify(analysis)
    except (LLMUnavailable, ValueError) as e:
        logger.error("analyze-perception failed: %s", e)
        return _error("Perception analysis is temporarily unavailable", 503)


@functions_bp.route("/generate-perception-image", methods=["POST"])
def generate_perception_image():
    prompt = (request.get_json(silent=True) or {}).get("prompt")
    if not prompt or not isinstance(prompt, str):
        return _error("Missing prompt", 400)
    full = (f"Create a child-friendly, illustrated scene: {prompt}.\nStyle: colourful cartoon illustration, warm and "
            "inviting, suitable for children aged 6-16.\nNo text or words in the image. Not emotionally extreme "
            "unless the prompt requires ambiguity. Output a single image.")
    try:
        data, mime = generate_image(full)
    except LLMUnavailable as e:
        logger.error("generate-perception-image failed: %s", e)
        return _error("Image generation failed")
    return jsonify({"imageUrl": f"data:{mime};base64,{base64.b64encode(data).decode()}"})


# ---------------------------------------------------------------------------
# verify-parent-email (Supabase service role lookup, as before)
# ---------------------------------------------------------------------------

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@functions_bp.route("/verify-parent-email", methods=["POST"])
def verify_parent_email():
    email = ((request.get_json(silent=True) or {}).get("email") or "").strip()
    if not email or not EMAIL_RE.match(email):
        return _error("Email is required", 400, isLinked=False)
    url, key = os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        return _error("Supabase is not configured on the backend", 500, isLinked=False)
    try:
        r = requests.get(f"{url}/rest/v1/students",
                         params={"select": "id,name", "parent_email": f"ilike.{email}", "limit": "1"},
                         headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=15)
        r.raise_for_status()
        rows = r.json()
    except Exception as e:
        logger.error("verify-parent-email query failed: %s", e)
        return _error("Could not verify email", 500, isLinked=False)
    if not rows:
        return jsonify({"isLinked": False, "message": "This email is not linked to any student"})
    return jsonify({"isLinked": True, "studentName": rows[0]["name"], "studentId": rows[0]["id"]})
