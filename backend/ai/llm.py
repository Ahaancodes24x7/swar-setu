"""Shared Gemini access (google-genai SDK) with model fallback and timeouts."""

from __future__ import annotations

import json
import logging
import os
from typing import Iterator, List, Optional, Tuple

logger = logging.getLogger("LLM")

DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3-flash-preview"]
IMAGE_MODELS = ["gemini-2.5-flash-image"]


class LLMUnavailable(RuntimeError):
    pass


def models() -> List[str]:
    configured = [m.strip() for m in os.getenv("GEMINI_MODEL", "").split(",") if m.strip()]
    return configured + [m for m in DEFAULT_MODELS if m not in configured]


def _client(timeout_s: Optional[float] = None):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise LLMUnavailable("GEMINI_API_KEY not set")
    try:
        from google import genai
        from google.genai import types
    except ImportError as e:
        raise LLMUnavailable("google-genai package not installed") from e
    timeout_ms = int(float(timeout_s or os.getenv("GEMINI_TIMEOUT_S", "25")) * 1000)
    return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=timeout_ms)), types


def _configs(types, system: Optional[str], json_mode: bool, temperature: float):
    base = dict(temperature=temperature, system_instruction=system,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True))
    if json_mode:
        base["response_mime_type"] = "application/json"
    configs = [types.GenerateContentConfig(**base)]
    thinking = os.getenv("GEMINI_THINKING_LEVEL", "low").strip()
    if thinking:  # lower thinking roughly halves latency; retried without it if a model rejects it
        configs.insert(0, types.GenerateContentConfig(**base, thinking_config=types.ThinkingConfig(thinking_level=thinking)))
    return configs


def generate(prompt: str, system: Optional[str] = None, json_mode: bool = False,
             temperature: float = 0.4) -> Tuple[str, str]:
    """Returns (text, model_name). Raises LLMUnavailable if every model fails."""
    client, types = _client()
    configs = _configs(types, system, json_mode, temperature)
    last = ""
    for model in models():
        try:
            try:
                r = client.models.generate_content(model=model, contents=prompt, config=configs[0])
            except Exception as e:
                if len(configs) == 1 or "think" not in str(e).lower():
                    raise
                r = client.models.generate_content(model=model, contents=prompt, config=configs[-1])
            return (r.text or ""), model
        except Exception as e:
            last = f"{model}: {type(e).__name__}: {str(e)[:200]}"
            logger.warning("Gemini call failed (%s)", last)
    raise LLMUnavailable(last)


def generate_json(prompt: str, system: Optional[str] = None, temperature: float = 0.3) -> Tuple[dict, str]:
    text, model = generate(prompt, system=system, json_mode=True, temperature=temperature)
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`").split("\n", 1)[-1]
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start:end + 1] if start >= 0 else text), model


def stream(prompt: str, system: Optional[str] = None, temperature: float = 0.8) -> Iterator[str]:
    """Yields text chunks from the first model that accepts the request.
    Uses a shorter timeout so an overloaded model fails over quickly."""
    client, types = _client(float(os.getenv("GEMINI_STREAM_TIMEOUT_S", "12")))
    configs = _configs(types, system, False, temperature)
    last = ""
    for model in models():
        for cfg in configs:
            try:
                started = False
                for chunk in client.models.generate_content_stream(model=model, contents=prompt, config=cfg):
                    started = True
                    if chunk.text:
                        yield chunk.text
                return
            except Exception as e:
                last = f"{model}: {type(e).__name__}: {str(e)[:200]}"
                logger.warning("Gemini stream failed (%s)", last)
                if started:
                    return
    raise LLMUnavailable(last)


def generate_image(prompt: str) -> Tuple[bytes, str]:
    """Returns (image bytes, mime type)."""
    client, types = _client()
    last = ""
    for model in [m.strip() for m in os.getenv("GEMINI_IMAGE_MODEL", "").split(",") if m.strip()] + IMAGE_MODELS:
        try:
            r = client.models.generate_content(
                model=model, contents=prompt,
                config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]))
            for part in r.candidates[0].content.parts:
                if getattr(part, "inline_data", None) and part.inline_data.data:
                    return part.inline_data.data, part.inline_data.mime_type or "image/png"
            last = f"{model}: no image in response"
        except Exception as e:
            last = f"{model}: {type(e).__name__}: {str(e)[:200]}"
            logger.warning("Gemini image generation failed (%s)", last)
    raise LLMUnavailable(last)
