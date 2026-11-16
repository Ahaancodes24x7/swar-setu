"""Self-hosted speech-to-text and handwriting models (skipped when weights are not installed)."""

import base64
import io
import os
import sys
import wave

import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
FIXTURES = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "frontend", "src", "test", "fixtures", "handwriting_png")


def _cached(repo: str) -> bool:
    try:
        from huggingface_hub import try_to_load_from_cache
        return isinstance(try_to_load_from_cache(repo, "config.json"), str)
    except Exception:
        return False


def _wav(samples: np.ndarray, rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes((np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes())
    return buf.getvalue()


def test_decode_wav_resamples_to_16k():
    from ai.speech import decode_audio
    x = decode_audio(_wav(np.sin(np.linspace(0, 2000, 44100)) * 0.3, rate=44100))
    assert abs(len(x) - 16000) <= 1 and x.dtype == np.float32


def test_silence_returns_empty_without_model():
    from ai.speech import transcribe
    r = transcribe(np.zeros(16000, np.float32), "en")
    assert r["text"] == "" and r["silence"] is True


def test_similarity_and_script_detection():
    from ai.handwriting import is_latin, similarity
    assert similarity("c a t", "cat") == 1.0 and similarity("cot", "cat") == pytest.approx(2 / 3)
    assert similarity("school", "friend") == 0.0
    assert is_latin("cat") and not is_latin("माँ")


def test_unsupported_items_are_not_scored():
    from ai.handwriting import assess_items
    r = assess_items([{"image": "", "reference": "माँ", "type": "word"}, {"image": "", "reference": "○", "type": "shape"}])
    assert [x["assessed"] for x in r] == [False, False]


@pytest.mark.skipif(not _cached("microsoft/trocr-base-handwritten") and not _cached("microsoft/trocr-small-handwritten"),
                    reason="handwriting model not installed (run download_models.py)")
def test_handwriting_model_reads_neat_writing_and_rejects_wrong_word():
    from ai.handwriting import assess_items
    img = "data:image/png;base64," + base64.b64encode(open(os.path.join(FIXTURES, "typical_0_school.png"), "rb").read()).decode()
    right, wrong = assess_items([{"image": img, "reference": "school", "type": "word"},
                                 {"image": img, "reference": "friend", "type": "word"}])
    assert right["score"] >= 0.8 and wrong["score"] <= 0.3


@pytest.mark.skipif(not _cached("openai/whisper-large-v3-turbo") and not _cached("openai/whisper-small"),
                    reason="speech model not installed (run download_models.py)")
def test_transcribe_endpoint_tone_is_not_hallucinated_as_long_text():
    os.environ.setdefault("SUPABASE_URL", "")
    from app import app
    tone = 0.2 * np.sin(2 * np.pi * 440 * np.arange(16000) / 16000)
    res = app.test_client().post("/functions/v1/transcribe", data={"audio": (io.BytesIO(_wav(tone)), "t.wav"), "language": "en"},
                                 content_type="multipart/form-data")
    assert res.status_code == 200
    assert len(res.get_json()["text"].split()) <= 3
