from flask import Blueprint, jsonify, request

handwriting_bp = Blueprint("handwriting", __name__)

MAX_ITEMS = 20
MAX_IMAGE_CHARS = 4_000_000  # ~3 MB PNG as a data URL


@handwriting_bp.route("/handwriting/legibility", methods=["POST"])
def legibility():
    """Body: {"items": [{"image": "data:image/png;base64,...", "reference": "cat", "type": "word"}]}
    Returns what the self-hosted handwriting model read and a 0-1 similarity to the reference."""
    items = (request.get_json(silent=True) or {}).get("items")
    if not isinstance(items, list) or not items:
        return jsonify({"success": False, "error": "items must be a non-empty list"}), 400
    if len(items) > MAX_ITEMS:
        return jsonify({"success": False, "error": f"at most {MAX_ITEMS} items"}), 400
    if any(not isinstance(i, dict) or len(str(i.get("image", ""))) > MAX_IMAGE_CHARS for i in items):
        return jsonify({"success": False, "error": "each item needs an image under 3 MB"}), 400
    try:
        from ai.handwriting import assess_items
        return jsonify({"success": True, "results": assess_items(items)}), 200
    except Exception as e:
        return jsonify({"success": False, "error": f"handwriting model unavailable: {type(e).__name__}"}), 503
