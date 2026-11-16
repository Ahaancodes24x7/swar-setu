"""
PostgreSQL persistence for screening requests (same interface as LocalStore).

Connection:
  DATABASE_URL set   -> that server (e.g. the Supabase Postgres connection string)
  otherwise          -> an embedded local PostgreSQL 16 under backend/data/postgres
                        (pgserver package; no Docker or admin rights needed)
"""

from __future__ import annotations

import json
import logging
import os
import socket
import subprocess
import threading
import uuid
from typing import Any, Dict, List, Optional

import psycopg2
import psycopg2.extras
import psycopg2.pool

logger = logging.getLogger("PostgresStore")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_PG_DIR = os.path.join(BACKEND_DIR, "data", "postgres")
SCHEMA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")

_embedded_server = None


def _recover_unclean_cluster(path: str) -> None:
    """Finish crash recovery before pgserver starts the cluster.

    After an unclean exit, PostgreSQL fsyncs every file in the data directory during
    recovery. pgserver keeps its server log inside that directory, and on Windows the
    open log file fails with a sharing violation that recovery retries indefinitely,
    so pgserver's 10 s start times out. Recovering once with the log elsewhere avoids it.
    """
    if not os.path.exists(os.path.join(path, "PG_VERSION")):
        return
    import pgserver
    bin_dir = os.path.join(os.path.dirname(pgserver.__file__), "pginstall", "bin")
    exe = ".exe" if os.name == "nt" else ""
    pg_ctl = os.path.join(bin_dir, "pg_ctl" + exe)
    state = ""
    out = subprocess.run([os.path.join(bin_dir, "pg_controldata" + exe), "-D", path],
                         capture_output=True, text=True).stdout
    for line in out.splitlines():
        if line.startswith("Database cluster state:"):
            state = line.split(":", 1)[1].strip()
    running = subprocess.run([pg_ctl, "status", "-D", path], capture_output=True).returncode == 0
    ready = False
    if running:
        try:
            with open(os.path.join(path, "postmaster.pid"), encoding="utf8") as f:
                ready = f.read().split("\n")[7].strip() == "ready"  # line 8: ready/starting/stopping
        except (OSError, IndexError):
            pass
    if ready or (not running and state.startswith("shut down")):
        return
    logger.warning("Embedded PostgreSQL was not shut down cleanly (state: %s); recovering", state or "unknown")
    if running:
        subprocess.run([pg_ctl, "stop", "-D", path, "-m", "immediate", "-w"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = path.rstrip("/\\") + ".recovery.log"
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    # DEVNULL, not pipes: the postmaster inherits pg_ctl's handles and would hold a pipe open.
    quiet = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL, "check": True}
    subprocess.run([pg_ctl, "start", "-D", path, "-w", "-t", "300", "-l", log,
                    "-o", f"-h 127.0.0.1 -p {port}"], **quiet)
    subprocess.run([pg_ctl, "stop", "-D", path, "-m", "fast", "-w"], **quiet)
    logger.info("Embedded PostgreSQL recovery complete")


def embedded_database_url(pg_dir: Optional[str] = None) -> str:
    """Start (or reuse) the embedded PostgreSQL server and return its connection URL."""
    global _embedded_server
    if _embedded_server is None:
        import pgserver
        path = pg_dir or os.environ.get("SWARSETU_PG_DIR", DEFAULT_PG_DIR)
        os.makedirs(path, exist_ok=True)
        _recover_unclean_cluster(path)
        _embedded_server = pgserver.get_server(path, cleanup_mode=None)
        logger.info("Embedded PostgreSQL running from %s", path)
    return _embedded_server.get_uri()


def _jsonb(v: Any) -> Optional[psycopg2.extras.Json]:
    return None if v is None else psycopg2.extras.Json(json.loads(json.dumps(v, default=str)))


class PostgresStore:
    backend = "postgres"

    def __init__(self, dsn: Optional[str] = None):
        self.dsn = dsn or os.environ.get("DATABASE_URL") or embedded_database_url()
        self.embedded = not (dsn or os.environ.get("DATABASE_URL"))
        self._pool = psycopg2.pool.ThreadedConnectionPool(1, 8, self.dsn)
        self._lock = threading.Lock()
        with open(SCHEMA_PATH, encoding="utf8") as f:
            ddl = f.read()
        with self._conn() as (con, cur):
            cur.execute(ddl)

    class _Conn:
        def __init__(self, store):
            self.store = store

        def __enter__(self):
            self.con = self.store._pool.getconn()
            self.cur = self.con.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            return self.con, self.cur

        def __exit__(self, exc_type, *_):
            if exc_type:
                self.con.rollback()
            else:
                self.con.commit()
            self.cur.close()
            self.store._pool.putconn(self.con)

    def _conn(self):
        return PostgresStore._Conn(self)

    @staticmethod
    def _row(r: Dict[str, Any]) -> Dict[str, Any]:
        d = dict(r)
        for k in ("id", "assessment_id"):
            if d.get(k) is not None:
                d[k] = str(d[k])
        if d.get("created_at") is not None:
            d["created_at"] = d["created_at"].isoformat()
        return d

    def save_assessment(self, *, disorder_type: str, model_id: str, raw_payload: Dict, feature_vector: List[float],
                        prediction: Dict, screening_mode: Optional[str] = None, covariates: Optional[Dict] = None,
                        explanation: Optional[Dict] = None, student_id: Optional[str] = None,
                        session_id: Optional[str] = None) -> str:
        aid = str(uuid.uuid4())
        with self._conn() as (_, cur):
            cur.execute(
                "INSERT INTO screening_assessments (id, student_id, session_id, disorder_type, screening_mode, model_id,"
                " raw_payload, feature_vector, covariates, prediction, explanation)"
                " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (aid, student_id, session_id, disorder_type, screening_mode, model_id, _jsonb(raw_payload),
                 _jsonb([float(v) for v in feature_vector]), _jsonb(covariates), _jsonb(prediction), _jsonb(explanation)))
        return aid

    def set_remote_sync(self, assessment_id: str, status: Dict) -> None:
        with self._conn() as (_, cur):
            cur.execute("UPDATE screening_assessments SET remote_sync = %s WHERE id = %s", (_jsonb(status), assessment_id))

    def get_assessment(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        try:
            uuid.UUID(str(assessment_id))
        except ValueError:
            return None
        with self._conn() as (_, cur):
            cur.execute("SELECT * FROM screening_assessments WHERE id = %s", (assessment_id,))
            r = cur.fetchone()
            if r is None:
                return None
            out = self._row(r)
            cur.execute("SELECT * FROM screening_outcomes WHERE assessment_id = %s ORDER BY created_at", (assessment_id,))
            out["outcomes"] = [self._row(o) for o in cur.fetchall()]
            return out

    def list_assessments(self, student_id: Optional[str] = None, limit: int = 50, offset: int = 0,
                         include_payload: bool = False) -> List[Dict[str, Any]]:
        cols = "*" if include_payload else ("id, created_at, student_id, session_id, disorder_type, screening_mode,"
                                            " model_id, covariates, prediction")
        q, args = f"SELECT {cols} FROM screening_assessments", []
        if student_id:
            q += " WHERE student_id = %s"
            args.append(student_id)
        q += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        args += [int(limit), int(offset)]
        with self._conn() as (_, cur):
            cur.execute(q, args)
            return [self._row(r) for r in cur.fetchall()]

    def add_outcome(self, *, disorder: str, diagnosis: int, source: str, assessment_id: Optional[str] = None,
                    student_id: Optional[str] = None, notes: Optional[str] = None) -> str:
        disorder = disorder.strip().lower()
        if disorder not in ("dyslexia", "dyscalculia", "dysgraphia"):
            raise ValueError("disorder must be dyslexia, dyscalculia or dysgraphia")
        if int(diagnosis) not in (0, 1):
            raise ValueError("diagnosis must be 0 or 1")
        if not source:
            raise ValueError("source is required (e.g. 'clinical_psychologist')")
        if assessment_id:
            a = self.get_assessment(assessment_id)
            if a is None:
                raise KeyError(assessment_id)
            student_id = student_id or a["student_id"]
        oid = str(uuid.uuid4())
        with self._conn() as (_, cur):
            cur.execute("INSERT INTO screening_outcomes (id, assessment_id, student_id, disorder, diagnosis, source, notes)"
                        " VALUES (%s,%s,%s,%s,%s,%s,%s)",
                        (oid, assessment_id, student_id, disorder, int(diagnosis), source, notes))
        return oid

    def list_outcomes(self) -> List[Dict[str, Any]]:
        with self._conn() as (_, cur):
            cur.execute("SELECT * FROM screening_outcomes ORDER BY created_at")
            return [self._row(r) for r in cur.fetchall()]

    def labelled_feature_rows(self) -> List[Dict[str, Any]]:
        q = ("SELECT a.id, a.student_id, a.disorder_type, a.feature_vector, a.covariates, a.model_id,"
             " o.disorder, o.diagnosis, o.source FROM screening_outcomes o"
             " JOIN screening_assessments a ON a.id = o.assessment_id ORDER BY a.created_at")
        with self._conn() as (_, cur):
            cur.execute(q)
            return [self._row(r) for r in cur.fetchall()]

    # ---- student profiles -------------------------------------------------
    def save_profile(self, student_id: str, answers: Dict[str, Any], schema_version: int,
                     filled_by: Optional[str] = None) -> Dict[str, Any]:
        with self._conn() as (_, cur):
            cur.execute(
                "INSERT INTO student_profiles (student_id, filled_by, schema_version, answers) VALUES (%s,%s,%s,%s)"
                " ON CONFLICT (student_id) DO UPDATE SET answers = EXCLUDED.answers, filled_by = EXCLUDED.filled_by,"
                " schema_version = EXCLUDED.schema_version, updated_at = now()",
                (student_id, filled_by, schema_version, _jsonb(answers)))
            cur.execute("INSERT INTO student_profile_history (id, student_id, filled_by, schema_version, answers)"
                        " VALUES (%s,%s,%s,%s,%s)", (str(uuid.uuid4()), student_id, filled_by, schema_version, _jsonb(answers)))
        return self.get_profile(student_id)

    def get_profile(self, student_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as (_, cur):
            cur.execute("SELECT * FROM student_profiles WHERE student_id = %s", (student_id,))
            r = cur.fetchone()
        if r is None:
            return None
        d = dict(r)
        for k in ("created_at", "updated_at"):
            d[k] = d[k].isoformat()
        return d

    def profile_history(self, student_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        with self._conn() as (_, cur):
            cur.execute("SELECT id, saved_at, filled_by, schema_version, answers FROM student_profile_history"
                        " WHERE student_id = %s ORDER BY saved_at DESC LIMIT %s", (student_id, int(limit)))
            rows = cur.fetchall()
        return [{**dict(r), "id": str(r["id"]), "saved_at": r["saved_at"].isoformat()} for r in rows]

    # ---- parent access tiers ----------------------------------------------
    @staticmethod
    def _access_row(r) -> Dict[str, Any]:
        d = dict(r)
        for k in ("created_at", "updated_at"):
            d[k] = d[k].isoformat()
        return d

    def register_student(self, student_id: str, name: Optional[str] = None, grade: Optional[str] = None,
                         parent_email: Optional[str] = None) -> Dict[str, Any]:
        """Records a student (freemium by default) and refreshes its details; never changes the tier."""
        with self._conn() as (_, cur):
            cur.execute(
                "INSERT INTO student_access (student_id, name, grade, parent_email) VALUES (%s,%s,%s,%s)"
                " ON CONFLICT (student_id) DO UPDATE SET name = COALESCE(EXCLUDED.name, student_access.name),"
                " grade = COALESCE(EXCLUDED.grade, student_access.grade),"
                " parent_email = COALESCE(EXCLUDED.parent_email, student_access.parent_email)",
                (student_id, name, grade, parent_email))
        return self.get_access(student_id)

    def get_access(self, student_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as (_, cur):
            cur.execute("SELECT * FROM student_access WHERE student_id = %s", (student_id,))
            r = cur.fetchone()
        return None if r is None else self._access_row(r)

    def set_access(self, student_id: str, tier: str, updated_by: Optional[str] = None) -> Dict[str, Any]:
        with self._conn() as (_, cur):
            cur.execute(
                "INSERT INTO student_access (student_id, tier, updated_by) VALUES (%s,%s,%s)"
                " ON CONFLICT (student_id) DO UPDATE SET tier = EXCLUDED.tier, updated_by = EXCLUDED.updated_by,"
                " updated_at = now()", (student_id, tier, updated_by))
        return self.get_access(student_id)

    def list_access(self) -> List[Dict[str, Any]]:
        with self._conn() as (_, cur):
            cur.execute("SELECT * FROM student_access ORDER BY name NULLS LAST, student_id")
            return [self._access_row(r) for r in cur.fetchall()]

    def stats(self) -> Dict[str, Any]:
        with self._conn() as (_, cur):
            cur.execute("SELECT COUNT(*) AS n FROM screening_assessments")
            n = cur.fetchone()["n"]
            cur.execute("SELECT COUNT(*) AS n FROM screening_outcomes")
            k = cur.fetchone()["n"]
            cur.execute("SELECT disorder_type, COUNT(*) AS n FROM screening_assessments GROUP BY 1")
            by = {r["disorder_type"]: r["n"] for r in cur.fetchall()}
            cur.execute("SELECT COUNT(*) AS n FROM student_profiles")
            profiles = cur.fetchone()["n"]
        return {"backend": "postgres", "embedded": self.embedded, "assessments": n, "outcomes": k,
                "profiles": profiles, "by_disorder_type": by}
