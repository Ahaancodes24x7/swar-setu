"""Test isolation: every test run uses a throwaway SQLite file, never the real screening database.

Loaded by pytest before any test module, so this wins over the repository .env
(load_environment() never overrides variables that are already set).
"""

import os
import tempfile

os.environ["SWARSETU_DB"] = "sqlite"
os.environ["SWARSETU_DB_PATH"] = os.path.join(tempfile.mkdtemp(prefix="swarsetu-test-"), "test.sqlite3")
os.environ.pop("DATABASE_URL", None)
os.environ.pop("SWARSETU_PG_DIR", None)
