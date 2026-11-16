"""Download the self-hosted model weights (run once per machine / deployment).

    python download_models.py            # models for this machine (GPU -> larger, CPU -> smaller)
    python download_models.py --all      # both GPU and CPU variants
"""
import os
import sys

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")  # plain HTTP: resumable and reliable on slow links

from huggingface_hub import snapshot_download

PATTERNS = ["*.json", "*.safetensors", "*.txt", "*.model", "merges.txt", "vocab*", "tokenizer*"]


def main():
    import torch
    gpu = torch.cuda.is_available()
    speech = {os.getenv("WHISPER_MODEL") or ("openai/whisper-large-v3-turbo" if gpu else "openai/whisper-small")}
    hand = {os.getenv("HANDWRITING_MODEL") or ("microsoft/trocr-base-handwritten" if gpu else "microsoft/trocr-small-handwritten")}
    if "--all" in sys.argv:
        speech |= {"openai/whisper-large-v3-turbo", "openai/whisper-small"}
        hand |= {"microsoft/trocr-base-handwritten", "microsoft/trocr-small-handwritten"}
    for repo in sorted(speech | hand):
        print(f"downloading {repo} ...", flush=True)
        snapshot_download(repo, allow_patterns=PATTERNS)
        print(f"  done: {repo}", flush=True)


if __name__ == "__main__":
    main()
