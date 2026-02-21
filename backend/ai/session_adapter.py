from __future__ import annotations

from typing import Any, Dict, List, Tuple


def build_ml_session_data(payload: Dict[str, Any], disorder_type: str | None = None) -> Dict[str, Any]:
    """
    Convert incoming frontend payload into the ML-ready shape expected by models:
    {
      "games": {
        "<game_name>": {...normalized game metrics...}
      }
    }
    """
    disorder = (disorder_type or payload.get("disorder_type") or "").strip().lower()
    raw_games = _extract_raw_games(payload)

    games: Dict[str, Dict[str, Any]] = {}
    for idx, (game_name, raw) in enumerate(raw_games):
        normalized_name = game_name or f"game_{idx + 1}"
        games[normalized_name] = _adapt_game(raw, normalized_name, disorder)

    if not games:
        games["default_task"] = _default_game(disorder)

    return {"games": games}


def _extract_raw_games(payload: Dict[str, Any]) -> List[Tuple[str, Dict[str, Any]]]:
    containers = [
        payload.get("games"),
        (payload.get("assessment_data") or {}).get("games"),
        payload.get("tests"),
        payload.get("sections"),
        payload.get("tasks"),
        payload.get("results"),
    ]

    for container in containers:
        if isinstance(container, dict):
            return [
                (str(key), value if isinstance(value, dict) else {"value": value})
                for key, value in container.items()
            ]

        if isinstance(container, list):
            parsed: List[Tuple[str, Dict[str, Any]]] = []
            for idx, item in enumerate(container):
                if isinstance(item, dict):
                    name = str(item.get("name") or item.get("id") or f"game_{idx + 1}")
                    parsed.append((name, item))
            if parsed:
                return parsed

    return []


def _adapt_game(raw: Dict[str, Any], game_name: str, disorder: str) -> Dict[str, Any]:
    answers = raw.get("answers") or raw.get("responses") or []
    correct, total = _extract_correct_total(raw, answers)
    response_times = _extract_response_times(raw)
    errors = _extract_errors(raw, answers, total, correct)

    avg_rt = int(sum(response_times) / len(response_times)) if response_times else 2000
    speed = _to_float(raw.get("speed"), default=0.0)
    if speed <= 0 and avg_rt > 0:
        speed = round(60000.0 / avg_rt, 3)

    game: Dict[str, Any] = {
        "name": game_name,
        "task_type": str(raw.get("task_type") or raw.get("type") or disorder or "general"),
        "type": str(raw.get("type") or raw.get("task_type") or game_name),
        "difficulty": str(raw.get("difficulty") or "medium"),
        "correct": correct,
        "total": total,
        "correct_count": correct,
        "total_count": total,
        "response_times": response_times,
        "avg_response_time_ms": avg_rt,
        "errors": errors,
        "total_errors": len(errors),
        "speed": speed,
        "duration_ms": _to_int(raw.get("duration_ms") or raw.get("duration") or raw.get("time"), default=0),
        "operation": raw.get("operation"),
        "complexity": raw.get("complexity"),
        "complexity_level": _to_int(raw.get("complexity_level"), default=0),
        "requires_planning": bool(raw.get("requires_planning", False)),
        "self_corrections": _to_int(raw.get("self_corrections"), default=0),
        "conceptual_errors": _to_int(raw.get("conceptual_errors"), default=0),
        "error_types": raw.get("error_types") if isinstance(raw.get("error_types"), list) else [],
        "error_sequence": raw.get("error_sequence") if isinstance(raw.get("error_sequence"), list) else [],
        "error_recovery": _to_float(raw.get("error_recovery"), default=0.5),
        "cognitive_load": _to_float(raw.get("cognitive_load"), default=0.5),
        "visual_processing_score": _to_float(raw.get("visual_processing_score"), default=0.5),
    }

    drawing = raw.get("drawing_metrics") if isinstance(raw.get("drawing_metrics"), dict) else {}
    voice = raw.get("voice_metrics") if isinstance(raw.get("voice_metrics"), dict) else {}

    strokes = raw.get("strokes") if isinstance(raw.get("strokes"), list) else drawing.get("strokes", [])
    if not strokes and drawing:
        strokes = [
            {
                "smoothness": _to_float(drawing.get("smoothness"), 0.5),
                "straightness": _to_float(drawing.get("straightness"), 0.5),
                "pressure": _to_float(drawing.get("pressure"), 0.5),
                "tremor": _to_float(drawing.get("tremor"), 0.5),
            }
        ]
    game["strokes"] = strokes

    phoneme_score = _to_float(voice.get("phoneme_score"), default=None)
    if phoneme_score is not None:
        game["phoneme_awareness_score"] = phoneme_score
        if "phoneme" not in game["task_type"].lower():
            game["task_type"] = f"{game['task_type']}_phoneme"

    return game


def _extract_correct_total(raw: Dict[str, Any], answers: Any) -> Tuple[int, int]:
    explicit_correct = raw.get("correct", raw.get("correct_count"))
    explicit_total = raw.get("total", raw.get("total_count"))
    if explicit_correct is not None and explicit_total is not None:
        return _to_int(explicit_correct, 0), max(1, _to_int(explicit_total, 1))

    if isinstance(answers, list) and answers:
        total = len(answers)
        correct = 0
        for answer in answers:
            if not isinstance(answer, dict):
                continue
            if answer.get("is_correct") is True or answer.get("correct") is True:
                correct += 1
            elif "score" in answer and _to_float(answer.get("score"), 0.0) >= 1.0:
                correct += 1
        return correct, total

    percentage = _to_float(raw.get("percentage"), default=None)
    if percentage is not None:
        clipped = max(0.0, min(100.0, percentage))
        return int(clipped), 100

    score = _to_float(raw.get("score"), default=0.0)
    if score > 0:
        val = int(score)
        return val, max(1, val)

    return 0, 1


def _extract_response_times(raw: Dict[str, Any]) -> List[int]:
    candidates = [
        raw.get("response_times"),
        raw.get("responseTimes"),
        raw.get("timings"),
    ]
    for candidate in candidates:
        if isinstance(candidate, list) and candidate:
            parsed = [_to_int(value, 0) for value in candidate if _to_int(value, 0) > 0]
            if parsed:
                return parsed

    avg = _to_int(raw.get("avg_response_time_ms") or raw.get("avg_rt") or raw.get("response_time"), default=0)
    if avg > 0:
        return [avg]

    return [2000]


def _extract_errors(raw: Dict[str, Any], answers: Any, total: int, correct: int) -> List[Any]:
    if isinstance(raw.get("errors"), list):
        return raw["errors"]

    error_count = raw.get("error_count")
    if error_count is not None:
        return ["error"] * max(0, _to_int(error_count, default=0))

    if isinstance(answers, list):
        inferred = []
        for answer in answers:
            if not isinstance(answer, dict):
                continue
            if answer.get("is_correct") is False or answer.get("correct") is False:
                inferred.append(answer.get("error_type") or "incorrect")
        if inferred:
            return inferred

    inferred_count = max(0, total - correct)
    return ["incorrect"] * inferred_count


def _default_game(disorder: str) -> Dict[str, Any]:
    return {
        "task_type": disorder or "general",
        "correct": 0,
        "total": 1,
        "correct_count": 0,
        "total_count": 1,
        "response_times": [2000],
        "errors": [],
        "total_errors": 0,
        "avg_response_time_ms": 2000,
        "speed": 0.0,
        "strokes": [],
    }


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except Exception:
        return default


def _to_float(value: Any, default: float | None = 0.0) -> float | None:
    if value is None:
        return default
    try:
        return float(value)
    except Exception:
        return default
