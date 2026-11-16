"""Environment loading. Import and call load_environment() before other backend modules."""

import os

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)


def load_environment() -> None:
    """Load backend/.env, then the repository-root .env. Real environment variables win."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    for path in (os.path.join(BACKEND_DIR, ".env"), os.path.join(ROOT_DIR, ".env")):
        if os.path.exists(path):
            load_dotenv(path, override=False)
