"""Premium/freemium parent access per student, managed from the admin panel.

Reads are public (the parent dashboard asks whether its child is premium); changing a
tier needs the X-Admin-Key header to match ADMIN_KEY from .env.
"""

import hmac
import os

from flask import Blueprint, jsonify, request

from storage import get_store

access_bp = Blueprint("access", __name__)

TIERS = ("freemium", "premium")


def _clean(value, limit=200):
    if value is None:
        return None
    value = str(value).strip()
    return value[:limit] or None


def _is_admin() -> bool:
    expected = os.environ.get("ADMIN_KEY", "")
    given = request.headers.get("X-Admin-Key", "")
    return bool(expected) and hmac.compare_digest(given.encode(), expected.encode())


def _forbidden():
    if not os.environ.get("ADMIN_KEY"):
        return jsonify({"success": False, "error": "ADMIN_KEY is not set on the server"}), 503
    return jsonify({"success": False, "error": "Invalid admin key"}), 401


@access_bp.route("/access/<student_id>", methods=["GET"])
def get_access(student_id):
    row = get_store().get_access(student_id)
    tier = row["tier"] if row else "freemium"
    return jsonify({"success": True, "student_id": student_id, "tier": tier, "parent_access": tier == "premium"}), 200


@access_bp.route("/access/register", methods=["POST"])
def register():
    """Body: {"student_id", "name", "grade", "parent_email"}. Makes the student show up in the
    admin panel (as freemium if new). Never changes an existing tier."""
    body = request.get_json(silent=True) or {}
    student_id = _clean(body.get("student_id"), 100)
    if not student_id:
        return jsonify({"success": False, "error": "student_id is required"}), 400
    row = get_store().register_student(student_id, _clean(body.get("name")), _clean(body.get("grade"), 20),
                                       _clean(body.get("parent_email")))
    return jsonify({"success": True, "tier": row["tier"], "parent_access": row["tier"] == "premium"}), 200


@access_bp.route("/admin/access", methods=["GET"])
def list_access():
    if not _is_admin():
        return _forbidden()
    return jsonify({"success": True, "students": get_store().list_access()}), 200


@access_bp.route("/admin/access/<student_id>", methods=["PUT"])
def set_access(student_id):
    """Body: {"tier": "premium" | "freemium", "name"?, "grade"?, "parent_email"?}."""
    if not _is_admin():
        return _forbidden()
    body = request.get_json(silent=True) or {}
    tier = body.get("tier")
    if tier not in TIERS:
        return jsonify({"success": False, "error": f"tier must be one of {TIERS}"}), 400
    store = get_store()
    store.register_student(student_id, _clean(body.get("name")), _clean(body.get("grade"), 20),
                           _clean(body.get("parent_email")))
    row = store.set_access(student_id, tier, "admin")
    return jsonify({"success": True, "student": row}), 200
