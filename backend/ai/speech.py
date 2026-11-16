"""
Self-hosted speech-to-text (replaces ElevenLabs Scribe).

Model: OpenAI Whisper, run locally through Hugging Face transformers.
  GPU  -> openai/whisper-large-v3-turbo (fp16)   CPU -> openai/whisper-small
  Override with WHISPER_MODEL.
Audio: WAV is decoded with the standard library; WebM/Ogg/MP4 (MediaRecorder) with PyAV.
Output keeps the ElevenLabs response shape the frontend already uses:
  {"text", "language_code", "words": [{"text", "start", "end", "type": "word"}]}
"""

from __future__ import annotations

import io
import logging
import os
import threading
import wave
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger("SpeechToText")

SAMPLE_RATE = 16000
SILENCE_RMS = 0.004          # below this the clip is treated as silence (avoids Whisper hallucinations)
MAX_SECONDS = 180

# app language codes (ISO 639-1 and the ISO 639-3 codes the frontend used for ElevenLabs) -> Whisper names
LANGUAGES = {
    "en": "english", "eng": "english", "hi": "hindi", "hin": "hindi", "bn": "bengali", "ben": "bengali",
    "te": "telugu", "tel": "telugu", "mr": "marathi", "mar": "marathi", "ta": "tamil", "tam": "tamil",
    "gu": "gujarati", "guj": "gujarati", "kn": "kannada", "kan": "kannada", "ml": "malayalam", "mal": "malayalam",
    "pa": "punjabi", "pan": "punjabi", "or": None, "ori": None,  # Odia is not supported by Whisper: auto-detect
}

_pipe = None
_pipe_lock = threading.Lock()
_infer_lock = threading.Lock()


def model_name() -> str:
    import torch
    default = "openai/whisper-large-v3-turbo" if torch.cuda.is_available() else "openai/whisper-small"
    return os.getenv("WHISPER_MODEL", default)


def _pipeline():
    global _pipe
    with _pipe_lock:
        if _pipe is None:
            import torch
            from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
            cuda = torch.cuda.is_available()
            name = model_name()
            dtype = torch.float16 if cuda else torch.float32
            logger.info("Loading speech model %s on %s", name, "cuda" if cuda else "cpu")
            # never download inside a request: fetch weights once with `python download_models.py`
            local_only = os.getenv("MODEL_DOWNLOADS", "0") != "1"
            model = AutoModelForSpeechSeq2Seq.from_pretrained(name, dtype=dtype, local_files_only=local_only)
            model.to("cuda" if cuda else "cpu")
            processor = AutoProcessor.from_pretrained(name, local_files_only=local_only)
            _pipe = pipeline("automatic-speech-recognition", model=model, tokenizer=processor.tokenizer,
                             feature_extractor=processor.feature_extractor, dtype=dtype,
                             device=0 if cuda else -1)
        return _pipe


def decode_audio(data: bytes) -> np.ndarray:
    """Decode an uploaded clip to 16 kHz mono float32 in [-1, 1]."""
    if data[:4] == b"RIFF":
        with wave.open(io.BytesIO(data)) as w:
            sr, ch, width = w.getframerate(), w.getnchannels(), w.getsampwidth()
            raw = w.readframes(w.getnframes())
        dtype = {1: np.uint8, 2: np.int16, 4: np.int32}[width]
        x = np.frombuffer(raw, dtype=dtype).astype(np.float32)
        x = (x - 128) / 128 if width == 1 else x / float(np.iinfo(dtype).max)
        if ch > 1:
            x = x.reshape(-1, ch).mean(1)
        return _resample(x, sr)
    import av
    out: List[np.ndarray] = []
    with av.open(io.BytesIO(data)) as container:
        stream = next(s for s in container.streams if s.type == "audio")
        resampler = av.AudioResampler(format="flt", layout="mono", rate=SAMPLE_RATE)
        for frame in container.decode(stream):
            for f in resampler.resample(frame):
                out.append(f.to_ndarray().reshape(-1))
        for f in resampler.resample(None):
            out.append(f.to_ndarray().reshape(-1))
    return np.concatenate(out).astype(np.float32) if out else np.zeros(0, np.float32)


def _resample(x: np.ndarray, sr: int) -> np.ndarray:
    if sr == SAMPLE_RATE or len(x) == 0:
        return x.astype(np.float32)
    n = int(round(len(x) * SAMPLE_RATE / sr))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def transcribe(audio: np.ndarray, language: Optional[str] = None, word_timestamps: bool = False) -> Dict[str, Any]:
    """Word timestamps cost ~2 s extra on GPU; request them only when timing is analysed."""
    lang_key = (language or "").strip().lower()
    whisper_lang = LANGUAGES.get(lang_key, None)
    audio = audio[: MAX_SECONDS * SAMPLE_RATE]
    duration = len(audio) / SAMPLE_RATE
    base = {"language_code": lang_key or None, "duration_s": round(duration, 2), "model": model_name()}
    if duration < 0.2 or float(np.sqrt(np.mean(audio ** 2))) < SILENCE_RMS:
        return {**base, "text": "", "words": [], "silence": True}

    peak = float(np.max(np.abs(audio)))
    if peak > 0:
        audio = audio / peak * 0.9  # normalise quiet microphones
    kwargs: Dict[str, Any] = {"task": "transcribe"}
    if whisper_lang:
        kwargs["language"] = whisper_lang
    pipe = _pipeline()
    call_kwargs: Dict[str, Any] = {"generate_kwargs": kwargs}
    if duration > 30:  # Whisper's window is 30 s; longer clips are chunked
        call_kwargs.update(chunk_length_s=30, batch_size=4)
    with _infer_lock:
        try:
            r = pipe({"raw": audio, "sampling_rate": SAMPLE_RATE},
                     return_timestamps="word" if word_timestamps else False, **call_kwargs)
        except Exception as e:  # word alignment can fail on very short clips: retry without it
            if not word_timestamps:
                raise
            logger.warning("Word timestamps failed (%s); retrying without", e)
            r = pipe({"raw": audio, "sampling_rate": SAMPLE_RATE}, **call_kwargs)
    words = []
    for c in r.get("chunks") or []:
        start, end = (c.get("timestamp") or (None, None))
        text = (c.get("text") or "").strip()
        if text:
            words.append({"text": text, "start": start, "end": end, "type": "word"})
    return {**base, "text": (r.get("text") or "").strip(), "words": words, "silence": False}


def warm_up() -> str:
    """Load the model and run one tiny inference so the first request is fast."""
    transcribe(np.zeros(SAMPLE_RATE, np.float32) + 0.01 * np.sin(np.linspace(0, 800, SAMPLE_RATE)).astype(np.float32),
               "en", word_timestamps=False)
    return model_name()
