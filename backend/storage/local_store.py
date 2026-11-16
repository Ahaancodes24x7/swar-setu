"""
Local persistence for every screening request (SQLite, standard library only).

Each assessment row keeps the raw payload, the 64 extracted features, the
covariates, the prediction, the explanation and the exact model id, so that
results are reproducible and real outcomes can later be joined for retraining.
Confirmed diagnoses go into `outcomes` (one row per child, disorder and source).

Children's data: the database file lives outside version control
(backend/data/ is git-ignored). Set SWARSETU_DB_PATH to move it.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB_PATH = os.path.join(BACKEND_DIR, "data", "swarsetu.sqlite3")

SCHEMA = """
CREATE TABLE IF NOT EXISTS assessments (
    id              TEXT PRIMARY KEY,
    created_at      TEXT NOT NULL,
    student_id      TEXT,
    session_id      TEXT,
    disorder_type   TEXT NOT NULL,
    screening_mode  TEXT,
    model_id        TEXT NOT NULL,
    raw_payload     TEXT NOT NULL,
    feature_vector  TEXT NOT NULL,
    covariates      TEXT,
    prediction      TEXT NOT NULL,
    explanation     TEXT,
    remote_sync     TEXT
);
CREATE INDEX IF NOT EXISTS idx_assessments_student ON assessments(student_id, created_at);

CREATE TABLE IF NOT EXISTS outcomes (
    id              TEXT PRIMARY KEY,
    created_at      TEXT NOT NULL,
    assessment_id   TEXT REFERENCES assessments(id),
    student_id      TEXT,
    disorder        TEXT NOT NULL CHECK (disorder IN ('dyslexia', 'dyscalculia', 'dysgraphia')),
    diagnosis       INTEGER NOT NULL CHECK (diagnosis IN (0, 1)),
    source          TEXT NOT NULL,
    notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_outcomes_student ON outcomes(student_id);

CREATE TABLE IF NOT EXISTS student_profiles (
    student_id      TEXT PRIMARY KEY,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    filled_by       TEXT,
    schema_version  INTEGER NOT NULL,
    answers         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_profile_history (
    id              TEXT PRIMARY KEY,
    student_id      TEXT NOT NULL,
    saved_at        TEXT NOT NULL,
    filled_by       TEXT,
    schema_version  INTEGER NOT NULL,
    answers         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profile_history_student ON student_profile_history(student_id, saved_at);

CREATE TABLE IF NOT EXISTS student_access (
    student_id      TEXT PRIMARY KEY,
    name            TEXT,
    grade           TEXT,
    parent_email    TEXT,
    tier            TEXT NOT NULL DEFAULT 'freemium' CHECK (tier IN ('freemium', 'premium')),
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    updated_by      TEXT
);
"""

JSON_COLUMNS = ("raw_payload", "feature_vector", "covariates", "prediction", "explanation", "remote_sync")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _dump(v: Any) -> Optional[str]:
    return None if v is None else json.dumps(v, default=str)


class LocalStore:
    backend = "sqlite"

    def __init__(self, path: Optional[str] = None):
        self.path = path or os.environ.get("SWARSETU_DB_PATH", DEFAULT_DB_PATH)
        os.makedirs(os.path.dirname(os.path.abspath(self.path)), exist_ok=True)
        self._lock = threading.Lock()
        with self._connect() as con:
            con.executescript(SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        con = sqlite3.connect(self.path, timeout=10)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA foreign_keys = ON")
        return con

    def _row(self, r: sqlite3.Row) -> Dict[str, Any]:
        d = dict(r)
        for c in JSON_COLUMNS:
            if d.get(c) is not None:
                d[c] = json.loads(d[c])
        return d

    def save_assessment(self, *, disorder_type: str, model_id: str, raw_payload: Dict, feature_vector: List[float],
                        prediction: Dict, screening_mode: Optional[str] = None, covariates: Optional[Dict] = None,
                        explanation: Optional[Dict] = None, student_id: Optional[str] = None,
                        session_id: Optional[str] = None) -> str:
        aid = str(uuid.uuid4())
        with self._lock, self._connect() as con:
            con.execute(
                "INSERT INTO assessments (id, created_at, student_id, session_id, disorder_type, screening_mode,"
                " model_id, raw_payload, feature_vector, covariates, prediction, explanation)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (aid, _now(), student_id, session_id, disorder_type, screening_mode, model_id, _dump(raw_payload),
                 _dump([float(v) for v in feature_vector]), _dump(covariates), _dump(prediction), _dump(explanation)))
        return aid

    def set_remote_sync(self, assessment_id: str, status: Dict) -> None:
        with self._lock, self._connect() as con:
            con.execute("UPDATE assessments SET remote_sync = ? WHERE id = ?", (_dump(status), assessment_id))

    def get_assessment(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as con:
            r = con.execute("SELECT * FROM assessments WHERE id = ?", (assessment_id,)).fetchone()
            if r is None:
                return None
            out = self._row(r)
            out["outcomes"] = [dict(o) for o in con.execute(
                "SELECT * FROM outcomes WHERE assessment_id = ? ORDER BY created_at", (assessment_id,))]
            return out

    def list_assessments(self, student_id: Optional[str] = None, limit: int = 50, offset: int = 0,
                         include_payload: bool = False) -> List[Dict[str, Any]]:
        cols = "*" if include_payload else ("id, created_at, student_id, session_id, disorder_type, screening_mode,"
                                            " model_id, covariates, prediction")
        q, args = f"SELECT {cols} FROM assessments", []
        if student_id:
            q += " WHERE student_id = ?"
            args.append(student_id)
        q += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        args += [int(limit), int(offset)]
        with self._connect() as con:
            return [self._row(r) for r in con.execute(q, args)]

    def add_outcome(self, *, disorder: str, diagnosis: int, source: str, assessment_id: Optional[str] = None,
                    student_id: Optional[str] = None, notes: Optional[str] = None) -> str:
        disorder = disorder.strip().lower()
        if disorder not in ("dyslexia", "dyscalculia", "dysgraphia"):
            raise ValueError("disorder must be dyslexia, dyscalculia or dysgraphia")
        if int(diagnosis) not in (0, 1):
            raise ValueError("diagnosis must be 0 or 1")
        if not source:
            raise ValueError("source is required (e.g. 'clinical_psychologist')")
        if assessment_id and student_id is None:
            a = self.get_assessment(assessment_id)
            if a is None:
                raise KeyError(assessment_id)
            student_id = a["student_id"]
        oid = str(uuid.uuid4())
        with self._lock, self._connect() as con:
            con.execute("INSERT INTO outcomes (id, created_at, assessment_id, student_id, disorder, diagnosis, source,"
                        " notes) VALUES (?,?,?,?,?,?,?,?)",
                        (oid, _now(), assessment_id, student_id, disorder, int(diagnosis), source, notes))
        return oid

    def list_outcomes(self) -> List[Dict[str, Any]]:
        with self._connect() as con:
            return [dict(r) for r in con.execute("SELECT * FROM outcomes ORDER BY created_at")]

    def labelled_feature_rows(self) -> List[Dict[str, Any]]:
        """Assessments joined with confirmed outcomes, for future retraining on real data."""
        q = ("SELECT a.id, a.student_id, a.disorder_type, a.feature_vector, a.covariates, a.model_id,"
             " o.disorder, o.diagnosis, o.source FROM outcomes o JOIN assessments a ON a.id = o.assessment_id"
             " ORDER BY a.created_at")
        with self._connect() as con:
            return [self._row(r) for r in con.execute(q)]

    # ---- student profiles -------------------------------------------------
    def save_profile(self, student_id: str, answers: Dict[str, Any], schema_version: int,
                     filled_by: Optional[str] = None) -> Dict[str, Any]:
        now = _now()
        with self._lock, self._connect() as con:
            con.execute(
                "INSERT INTO student_profiles (student_id, created_at, updated_at, filled_by, schema_version, answers)"
                " VALUES (?,?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET answers = excluded.answers,"
                " filled_by = excluded.filled_by, schema_version = excluded.schema_version, updated_at = excluded.updated_at",
                (student_id, now, now, filled_by, schema_version, _dump(answers)))
            con.execute("INSERT INTO student_profile_history (id, student_id, saved_at, filled_by, schema_version, answers)"
                        " VALUES (?,?,?,?,?,?)", (str(uuid.uuid4()), student_id, now, filled_by, schema_version, _dump(answers)))
        return self.get_profile(student_id)

    def get_profile(self, student_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as con:
            r = con.execute("SELECT * FROM student_profiles WHERE student_id = ?", (student_id,)).fetchone()
        if r is None:
            return None
        d = dict(r)
        d["answers"] = json.loads(d["answers"])
        return d

    def profile_history(self, student_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        with self._connect() as con:
            rows = con.execute("SELECT id, saved_at, filled_by, schema_version, answers FROM student_profile_history"
                               " WHERE student_id = ? ORDER BY saved_at DESC LIMIT ?", (student_id, int(limit))).fetchall()
        return [{**dict(r), "answers": json.loads(r["answers"])} for r in rows]

    # ---- parent access tiers ----------------------------------------------
    def register_student(self, student_id: str, name: Optional[str] = None, grade: Optional[str] = None,
                         parent_email: Optional[str] = None) -> Dict[str, Any]:
        """Records a student (freemium by default) and refreshes its details; never changes the tier."""
        now = _now()
        with self._lock, self._connect() as con:
            con.execute(
                "INSERT INTO student_access (student_id, name, grade, parent_email, created_at, updated_at)"
                " VALUES (?,?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET name = COALESCE(excluded.name, name),"
                " grade = COALESCE(excluded.grade, grade), parent_email = COALESCE(excluded.parent_email, parent_email)",
                (student_id, name, grade, parent_email, now, now))
        return self.get_access(student_id)

    def get_access(self, student_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as con:
            r = con.execute("SELECT * FROM student_access WHERE student_id = ?", (student_id,)).fetchone()
        return None if r is None else dict(r)

    def set_access(self, student_id: str, tier: str, updated_by: Optional[str] = None) -> Dict[str, Any]:
        now = _now()
        with self._lock, self._connect() as con:
            con.execute(
                "INSERT INTO student_access (student_id, tier, created_at, updated_at, updated_by) VALUES (?,?,?,?,?)"
                " ON CONFLICT(student_id) DO UPDATE SET tier = excluded.tier, updated_by = excluded.updated_by,"
                " updated_at = excluded.updated_at", (student_id, tier, now, now, updated_by))
        return self.get_access(student_id)

    def list_access(self) -> List[Dict[str, Any]]:
        with self._connect() as con:
            rows = con.execute("SELECT * FROM student_access ORDER BY name IS NULL, name, student_id").fetchall()
        return [dict(r) for r in rows]

    def stats(self) -> Dict[str, Any]:
        with self._connect() as con:
            n = con.execute("SELECT COUNT(*) FROM assessments").fetchone()[0]
            k = con.execute("SELECT COUNT(*) FROM outcomes").fetchone()[0]
            by = {r[0]: r[1] for r in con.execute("SELECT disorder_type, COUNT(*) FROM assessments GROUP BY 1")}
            profiles = con.execute("SELECT COUNT(*) FROM student_profiles").fetchone()[0]
        return {"backend": "sqlite", "assessments": n, "outcomes": k, "profiles": profiles, "by_disorder_type": by}


_store = None
_store_lock = threading.Lock()


def get_store():
    """PostgreSQL by default (DATABASE_URL, else an embedded local server);
    SQLite when SWARSETU_DB=sqlite or if PostgreSQL cannot be started."""
    global _store
    with _store_lock:
        if _store is None:
            if os.environ.get("SWARSETU_DB", "postgres").strip().lower() == "sqlite":
                _store = LocalStore()
            else:
                try:
                    from .postgres_store import PostgresStore
                    _store = PostgresStore()
                except Exception as e:
                    import logging
                    logging.getLogger("storage").warning("PostgreSQL unavailable (%s); using SQLite", e)
                    _store = LocalStore()
        return _store
