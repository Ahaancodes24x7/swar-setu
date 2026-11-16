from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple
import numpy as np


try:
    from ai.feature_extractors import (
        extract_dyslexia_features,
        extract_dyscalculia_features,
        extract_dysgraphia_features,
        extract_unified_64d_features
    )
except ImportError:
    from backend.ai.feature_extractors import (
        extract_dyslexia_features,
        extract_dyscalculia_features,
        extract_dysgraphia_features,
        extract_unified_64d_features
    )


def extract_16d_feature_vector(payload: Dict[str, Any], disorder_type: str) -> List[float]:
    """
    Extracts 16-D feature vector for a specific single disorder screening.
    """
    dt = (disorder_type or "").strip().lower()
    student_age = payload.get("student_age", payload.get("age", 9))
    if "calc" in dt:
        vec = extract_dyscalculia_features(payload, student_age=student_age)
    elif "graph" in dt:
        vec = extract_dysgraphia_features(payload, student_age=student_age)
    else:
        vec = extract_dyslexia_features(payload, student_age=student_age)
    return vec.tolist()


def extract_64d_feature_vector(payload: Dict[str, Any], disorder_type: str | None = None) -> List[float]:
    """
    Maps incoming raw frontend task/game metrics into the exact 64-dimensional
    normalized feature vector expected by the PyTorch ResidualTransformerClassifier model.
    """
    student_age = payload.get("student_age", payload.get("age", 9))
    try:
        vec = extract_unified_64d_features(payload, student_age=student_age)
        return vec.tolist()
    except Exception:
        pass

    session_data = build_ml_session_data(payload, disorder_type=disorder_type)
    games = session_data.get("games", {})
    vector = [0.5] * 64

    # Extract all game statistics
    accuracies = []
    response_times = []
    speeds = []
    error_counts = []
    phoneme_scores = []
    drawing_tremors = []
    drawing_pressures = []
    drawing_straightness = []
    drawing_smoothness = []
    self_corrections = []
    cognitive_loads = []
    visual_scores = []

    for game_name, game in games.items():
        corr = game.get("correct_count", 0)
        tot = max(1, game.get("total_count", 1))
        accuracies.append(corr / tot)

        rt = game.get("avg_response_time_ms", 2000)
        if rt > 0:
            response_times.append(rt)

        sp = game.get("speed", 0.0)
        if sp > 0:
            speeds.append(sp)

        error_counts.append(game.get("total_errors", 0))

        if "phoneme_awareness_score" in game:
            phoneme_scores.append(game["phoneme_awareness_score"])

        if game.get("strokes"):
            for st in game["strokes"]:
                if isinstance(st, dict):
                    drawing_tremors.append(st.get("tremor", 0.5))
                    drawing_pressures.append(st.get("pressure", 0.5))
                    drawing_straightness.append(st.get("straightness", 0.5))
                    drawing_smoothness.append(st.get("smoothness", 0.5))

        self_corrections.append(game.get("self_corrections", 0))
        cognitive_loads.append(game.get("cognitive_load", 0.5))
        visual_scores.append(game.get("visual_processing_score", 0.5))

    # Summary statistics
    avg_acc = float(np.mean(accuracies)) if accuracies else 0.5
    avg_rt = float(np.mean(response_times)) if response_times else 2000.0
    rt_std = float(np.std(response_times)) if len(response_times) > 1 else 300.0
    avg_speed = float(np.mean(speeds)) if speeds else 25.0
    tot_errors = sum(error_counts)
    avg_phoneme = float(np.mean(phoneme_scores)) if phoneme_scores else avg_acc
    avg_tremor = float(np.mean(drawing_tremors)) if drawing_tremors else 0.3
    avg_pressure = float(np.mean(drawing_pressures)) if drawing_pressures else 0.5
    avg_straight = float(np.mean(drawing_straightness)) if drawing_straightness else 0.7
    avg_smooth = float(np.mean(drawing_smoothness)) if drawing_smoothness else 0.7
    avg_cog_load = float(np.mean(cognitive_loads)) if cognitive_loads else 0.5
    avg_vis_score = float(np.mean(visual_scores)) if visual_scores else 0.5
    tot_self_corr = sum(self_corrections)

    # Normalize response time, speed, and cognitive load to [0, 1]
    norm_rt = max(0.0, min(1.0, avg_rt / 10000.0))
    norm_speed = max(0.0, min(1.0, avg_speed / 150.0))
    norm_rt_var = max(0.0, min(1.0, rt_std / 3000.0))
    norm_errors = max(0.0, min(1.0, tot_errors / 20.0))
    norm_cog_load = max(0.0, min(1.0, float(avg_cog_load)))

    # --- GROUP 1: DYSLEXIA FEATURES (0..15) ---
    vector[0] = norm_speed                       # Reading speed WPM
    vector[1] = avg_acc                          # Reading accuracy
    vector[2] = avg_phoneme                      # Phonological awareness
    vector[3] = max(0.0, 1.0 - norm_errors)      # Word decoding accuracy
    vector[4] = max(0.0, 1.0 - norm_rt_var)      # Reading fluency consistency
    vector[5] = avg_vis_score                    # Visual-orthographic score
    vector[6] = max(0.0, min(1.0, 1.0 - (tot_errors * 0.05))) # Letter confusion inverse
    vector[7] = max(0.0, min(1.0, avg_acc * 0.9 + avg_phoneme * 0.1))
    vector[8] = max(0.0, min(1.0, 1.0 - norm_rt))
    vector[9] = max(0.0, min(1.0, avg_phoneme * 0.8 + 0.1))
    vector[10] = max(0.0, min(1.0, avg_acc * 0.85 + 0.1))
    vector[11] = max(0.0, min(1.0, 1.0 - norm_errors * 0.7))
    vector[12] = max(0.0, min(1.0, norm_speed * 0.7 + avg_acc * 0.3))
    vector[13] = max(0.0, min(1.0, avg_vis_score * 0.8 + 0.1))
    vector[14] = max(0.0, min(1.0, avg_acc * 0.75 + 0.15))
    vector[15] = max(0.0, min(1.0, 1.0 - norm_cog_load * 0.5))

    # --- GROUP 2: DYSCALCULIA FEATURES (16..31) ---
    vector[16] = avg_acc                         # Number sense accuracy
    vector[17] = max(0.0, min(1.0, 1.0 - norm_rt)) # Math retrieval speed
    vector[18] = max(0.0, min(1.0, 1.0 - norm_errors * 0.8)) # Calculation precision
    vector[19] = avg_vis_score                   # Spatial-numerical processing
    vector[20] = max(0.0, min(1.0, 1.0 - norm_rt_var * 0.8)) # Quantitative estimation fluency
    vector[21] = max(0.0, min(1.0, avg_acc * 0.8 + 0.1))
    vector[22] = max(0.0, min(1.0, 1.0 - norm_errors * 0.6))
    vector[23] = max(0.0, min(1.0, norm_speed * 0.6 + avg_acc * 0.4))
    vector[24] = max(0.0, min(1.0, avg_vis_score * 0.9))
    vector[25] = max(0.0, min(1.0, avg_acc * 0.7 + 0.2))
    vector[26] = max(0.0, min(1.0, 1.0 - norm_rt * 0.7))
    vector[27] = max(0.0, min(1.0, avg_acc * 0.95))
    vector[28] = max(0.0, min(1.0, 1.0 - norm_errors * 0.5))
    vector[29] = max(0.0, min(1.0, norm_speed * 0.5 + avg_acc * 0.5))
    vector[30] = max(0.0, min(1.0, avg_vis_score * 0.7 + 0.2))
    vector[31] = max(0.0, min(1.0, 1.0 - norm_cog_load * 0.4))

    # --- GROUP 3: DYSGRAPHIA FEATURES (32..47) ---
    vector[32] = max(0.0, min(1.0, 1.0 - avg_tremor)) # Fine motor control (stroke tremor inverse)
    vector[33] = avg_straight                    # Stroke straightness & alignment
    vector[34] = avg_smooth                      # Kinematic smoothness
    vector[35] = max(0.0, min(1.0, avg_pressure)) # Pen pressure regulation
    vector[36] = max(0.0, min(1.0, norm_speed * 0.8 + 0.1)) # Graphomotor execution speed
    vector[37] = max(0.0, min(1.0, 1.0 - norm_errors * 0.7)) # Spatial handwriting layout
    vector[38] = max(0.0, min(1.0, avg_straight * 0.8 + avg_smooth * 0.2))
    vector[39] = max(0.0, min(1.0, (1.0 - avg_tremor) * 0.8 + 0.1))
    vector[40] = max(0.0, min(1.0, avg_smooth * 0.9))
    vector[41] = max(0.0, min(1.0, avg_straight * 0.7 + 0.2))
    vector[42] = max(0.0, min(1.0, (1.0 - avg_tremor) * 0.7 + avg_smooth * 0.3))
    vector[43] = max(0.0, min(1.0, norm_speed * 0.7 + 0.15))
    vector[44] = max(0.0, min(1.0, avg_straight * 0.85))
    vector[45] = max(0.0, min(1.0, avg_smooth * 0.8 + 0.1))
    vector[46] = max(0.0, min(1.0, (1.0 - avg_tremor) * 0.9))
    vector[47] = max(0.0, min(1.0, 1.0 - norm_cog_load * 0.3))

    # --- GROUP 4: GENERAL BEHAVIORAL FEATURES (48..63) ---
    vector[48] = max(0.0, min(1.0, 1.0 - norm_cog_load)) # Cognitive load resilience
    vector[49] = max(0.0, min(1.0, 1.0 - norm_rt_var))  # Sustained attention & focus
    vector[50] = max(0.0, min(1.0, tot_self_corr / 10.0)) # Self-correction capability
    vector[51] = max(0.0, min(1.0, avg_acc * 0.6 + (1.0 - norm_rt) * 0.4)) # Task completion efficiency
    vector[52] = max(0.0, min(1.0, 1.0 - norm_errors * 0.5)) # Error recovery rate
    vector[53] = max(0.0, min(1.0, norm_speed * 0.5 + 0.25)) # Processing pace consistency
    vector[54] = max(0.0, min(1.0, avg_vis_score * 0.8 + 0.1))
    vector[55] = max(0.0, min(1.0, (1.0 - norm_cog_load) * 0.8 + 0.1))
    vector[56] = max(0.0, min(1.0, 1.0 - norm_rt_var * 0.5))
    vector[57] = max(0.0, min(1.0, avg_acc * 0.8 + 0.1))
    vector[58] = max(0.0, min(1.0, 1.0 - norm_errors * 0.4))
    vector[59] = max(0.0, min(1.0, norm_speed * 0.4 + 0.3))
    vector[60] = max(0.0, min(1.0, (1.0 - norm_cog_load) * 0.7 + 0.2))
    vector[61] = max(0.0, min(1.0, 1.0 - norm_rt_var * 0.6))
    vector[62] = max(0.0, min(1.0, avg_acc * 0.75 + 0.15))
    vector[63] = max(0.0, min(1.0, 0.5 + (avg_acc - 0.5) * 0.5))

    # Validate vector before returning
    return validate_64d_vector(vector)


def validate_64d_vector(vector: List[float]) -> List[float]:
    """
    Strict validation of the 64-dimensional feature vector.
    Raises ValueError if length != 64 or if any element falls outside [0.0, 1.0].
    """
    if not isinstance(vector, list) and not isinstance(vector, np.ndarray):
        raise ValueError(f"Feature vector must be a list or 1D array, got {type(vector)}")

    vector_list = [float(v) for v in vector]

    if len(vector_list) != 64:
        raise ValueError(f"Feature vector validation failed: expected exactly 64 elements, got {len(vector_list)}")

    out_of_bounds = []
    for idx, val in enumerate(vector_list):
        if val < 0.0 or val > 1.0:
            out_of_bounds.append((idx, val))

    if out_of_bounds:
        raise ValueError(
            f"Feature vector validation failed: {len(out_of_bounds)} element(s) outside normalized interval [0.0, 1.0]. "
            f"First invalid entries: {out_of_bounds[:3]}"
        )

    return vector_list


def build_ml_session_data(payload: Dict[str, Any], disorder_type: str | None = None) -> Dict[str, Any]:
    """
    Convert incoming frontend payload into normalized ML session structure.
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
