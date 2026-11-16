"""
Self-hosted handwriting recognition for the dysgraphia legibility measure.

Model: Microsoft TrOCR (handwritten), run locally through transformers.
  GPU -> microsoft/trocr-base-handwritten (fp16)   CPU -> microsoft/trocr-small-handwritten
  Override with HANDWRITING_MODEL.
Legibility = 1 - character error rate between what the model reads and the prompt's
reference text (case- and punctuation-insensitive). Latin script only: Devanagari and
drawings (shapes, figures) are reported as not assessed here.
"""

from __future__ import annotations

import base64
import io
import logging
import os
import re
import threading
import unicodedata
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger("Handwriting")

_model = None
_lock = threading.Lock()
_infer_lock = threading.Lock()


def model_name() -> str:
    import torch
    default = "microsoft/trocr-base-handwritten" if torch.cuda.is_available() else "microsoft/trocr-small-handwritten"
    return os.getenv("HANDWRITING_MODEL", default)


def _load():
    global _model
    with _lock:
        if _model is None:
            import torch
            from huggingface_hub import hf_hub_download
            from tokenizers import ByteLevelBPETokenizer
            from transformers import AutoImageProcessor, VisionEncoderDecoderModel
            name = model_name()
            cuda = torch.cuda.is_available()
            logger.info("Loading handwriting model %s on %s", name, "cuda" if cuda else "cpu")
            # never download inside a request: fetch weights once with `python download_models.py`
            local_only = os.getenv("MODEL_DOWNLOADS", "0") != "1"
            image_processor = AutoImageProcessor.from_pretrained(name, local_files_only=local_only)
            # TrOCR's RoBERTa tokenizer is decoded with the `tokenizers` library directly: the
            # transformers 5.x slow->fast conversion of this tokenizer fails
            tokenizer = ByteLevelBPETokenizer(hf_hub_download(name, "vocab.json", local_files_only=local_only),
                                              hf_hub_download(name, "merges.txt", local_files_only=local_only))
            model = VisionEncoderDecoderModel.from_pretrained(name, dtype=torch.float16 if cuda else torch.float32,
                                                              local_files_only=local_only)
            model.to("cuda" if cuda else "cpu").eval()
            cfg = model.config.decoder
            special = {i for i in (cfg.bos_token_id, cfg.eos_token_id, cfg.pad_token_id,
                                   getattr(model.config, "decoder_start_token_id", None)) if i is not None}
            _model = (image_processor, tokenizer, model, "cuda" if cuda else "cpu", special)
        return _model


def is_latin(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    return bool(letters) and all(unicodedata.name(c, "").startswith("LATIN") for c in letters)


def normalise(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def _levenshtein(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def similarity(recognised: str, reference: str) -> float:
    a, b = normalise(recognised), normalise(reference)
    if not b:
        return 0.0
    return max(0.0, 1.0 - _levenshtein(a, b) / max(len(a), len(b)))


def decode_image(data: str | bytes):
    from PIL import Image
    if isinstance(data, str):
        data = base64.b64decode(data.split(",", 1)[1] if data.startswith("data:") else data)
    img = Image.open(io.BytesIO(data))
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, "white")
        bg.paste(img, mask=img.split()[-1])
        img = bg
    return img.convert("RGB")


def crop_to_ink(img, margin_frac: float = 0.15):
    """Crop to the written strokes with a margin; TrOCR expects a single tight text line."""
    gray = np.asarray(img.convert("L"), dtype=np.uint8)
    ys, xs = np.where(gray < 160)
    if len(xs) == 0:
        return None
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    h = y1 - y0 + 1
    m = int(max(8, margin_frac * h))
    return img.crop((max(0, x0 - m), max(0, y0 - m), min(img.width, x1 + m), min(img.height, y1 + m)))


def recognise(images: List[Any]) -> List[str]:
    import torch
    image_processor, tokenizer, model, device, special = _load()
    pixel_values = image_processor(images=images, return_tensors="pt").pixel_values.to(device, model.dtype)
    with _infer_lock, torch.no_grad():
        ids = model.generate(pixel_values, num_beams=4, max_new_tokens=64)
    return [tokenizer.decode([i for i in seq.tolist() if i not in special]).strip() for seq in ids]


def assess_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """items: [{"image": dataURL/base64, "reference": str, "type": "letter"|"word"|...}]"""
    out: List[Optional[Dict[str, Any]]] = [None] * len(items)
    batch, idx = [], []
    for i, it in enumerate(items):
        ref, kind = str(it.get("reference") or ""), str(it.get("type") or "")
        if kind not in ("letter", "word"):
            out[i] = {"assessed": False, "reason": "drawing (assessed from strokes)"}
            continue
        if not is_latin(ref):
            out[i] = {"assessed": False, "reason": "script not supported by the handwriting model"}
            continue
        try:
            crop = crop_to_ink(decode_image(it["image"]))
        except Exception as e:
            out[i] = {"assessed": False, "reason": f"unreadable image ({type(e).__name__})"}
            continue
        if crop is None:
            out[i] = {"assessed": True, "recognised": "", "score": 0.0, "reason": "blank"}
            continue
        batch.append(crop)
        idx.append(i)
    if batch:
        for i, text in zip(idx, recognise(batch)):
            ref = str(items[i]["reference"])
            out[i] = {"assessed": True, "recognised": text, "score": round(similarity(text, ref), 3)}
    for o, it in zip(out, items):
        o["reference"] = it.get("reference")
        o["model"] = model_name()
    return out  # type: ignore[return-value]
