"""Tests for premium/freemium parent access (admin panel endpoints)."""

import os
import sys
import tempfile

import pytest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

os.environ["GEMINI_API_KEY"] = ""
os.environ["SUPABASE_URL"] = ""

from app import app  # noqa: E402
from routes import access  # noqa: E402
from storage.local_store import LocalStore  # noqa: E402

KEY = "test-admin-key"


@pytest.fixture()
def client(monkeypatch):
    # a throwaway SQLite store so the real screening database is never touched
    store = LocalStore(os.path.join(tempfile.mkdtemp(), "access.sqlite3"))
    monkeypatch.setattr(access, "get_store", lambda: store)
    monkeypatch.setenv("ADMIN_KEY", KEY)
    return app.test_client()


def test_unknown_student_is_freemium(client):
    r = client.get("/api/access/kid-1").get_json()
    assert r["tier"] == "freemium" and r["parent_access"] is False


def test_register_lists_student_without_upgrading(client):
    client.post("/api/access/register", json={"student_id": "kid-1", "name": "Asha", "grade": "3",
                                               "parent_email": "p@x.org"})
    rows = client.get("/api/admin/access", headers={"X-Admin-Key": KEY}).get_json()["students"]
    assert [(s["student_id"], s["name"], s["tier"]) for s in rows] == [("kid-1", "Asha", "freemium")]


def test_admin_can_grant_and_revoke(client):
    h = {"X-Admin-Key": KEY}
    assert client.put("/api/admin/access/kid-1", json={"tier": "premium", "name": "Asha"}, headers=h).status_code == 200
    assert client.get("/api/access/kid-1").get_json()["parent_access"] is True
    # re-registering from the parent dashboard keeps the tier
    client.post("/api/access/register", json={"student_id": "kid-1", "name": "Asha K"})
    assert client.get("/api/access/kid-1").get_json()["tier"] == "premium"
    client.put("/api/admin/access/kid-1", json={"tier": "freemium"}, headers=h)
    assert client.get("/api/access/kid-1").get_json()["parent_access"] is False


def test_admin_endpoints_need_key(client):
    assert client.get("/api/admin/access").status_code == 401
    assert client.put("/api/admin/access/kid-1", json={"tier": "premium"},
                      headers={"X-Admin-Key": "wrong"}).status_code == 401
    assert client.get("/api/access/kid-1").get_json()["tier"] == "freemium"


def test_rejects_bad_tier(client):
    r = client.put("/api/admin/access/kid-1", json={"tier": "gold"}, headers={"X-Admin-Key": KEY})
    assert r.status_code == 400
