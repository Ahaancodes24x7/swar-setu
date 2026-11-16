"""
Dysgraphia Feature Extractor
Extracts exactly 16 normalized features from motor & handwriting assessment data.

Research basis:
- Rosenblum et al. (2003): Computerized handwriting evaluation parameters
- Danna & Velay (2015): Kinematic dysgraphia markers in handwriting tasks
- Smits-Engelsman et al. (2001): Fine motor control metrics in children
- DSM-5: Diagnostic criteria for Specific Learning Disorder with impairment in written expression

Feature index mapping (positions 32-47 in 64-D vector):
 32:  graphomotor_speed (drawing/writing stroke velocity)
 33:  pen_pressure_variance (stylus pressure regulation)
 34:  stroke_straightness (linear path variance)
 35:  kinematic_smoothness (jerk minimization metric)
 36:  tremor_count_normalized (high-frequency directional reversals)
 37:  spatial_alignment (baseline adherence)
 38:  letter_size_variance (amplitude consistency across sample)
 39:  writing_fatigue_index (velocity degradation over task)
 40:  inter_stroke_pause (pause duration between pen strokes)
 41:  pen_lift_frequency (lifts per letter unit)
 42:  baseline_drift (vertical angle drift of writing line)
 43:  stroke_direction_errors (reversals in formation path)
 44:  motor_control_composite (fine motor dexterity score)
 45:  writing_fluency_composite (speed + smoothness composite)
 46:  spatial_awareness_composite (margins + letter spacing)
 47:  graphomotor_resilience (motor stamina under cognitive load)
"""

from typing import Dict, Any, List
import numpy as np


class DysgraphiaFeatureExtractor:
    """
    Extracts 16-dimensional Dysgraphia feature vector
    from raw motor/writing assessment payload. All outputs normalized to [0.0, 1.0].
    """

    FEATURE_NAMES = [
        'graphomotor_speed',
        'pen_pressure_variance',
        'stroke_straightness',
        'kinematic_smoothness',
        'tremor_count_normalized',
        'spatial_alignment',
        'letter_size_variance',
        'writing_fatigue_index',
        'inter_stroke_pause',
        'pen_lift_frequency',
        'baseline_drift',
        'stroke_direction_errors',
        'motor_control_composite',
        'writing_fluency_composite',
        'spatial_awareness_composite',
        'graphomotor_resilience'
    ]

    def extract(self, raw_payload: Dict[str, Any], student_age: int = 9) -> np.ndarray:
        features = np.zeros(16, dtype=np.float32)
        games = self._extract_games(raw_payload)
        strokes = self._extract_strokes(raw_payload, games)

        features[0] = self._compute_speed(strokes, games)
        features[1] = self._compute_pressure_var(strokes)
        features[2] = self._compute_straightness(strokes)
        features[3] = self._compute_smoothness(strokes)
        features[4] = self._compute_tremor(strokes)
        features[5] = self._compute_alignment(strokes)
        features[6] = self._compute_size_variance(strokes)
        features[7] = self._compute_fatigue(strokes)
        features[8] = self._compute_pause_duration(strokes)
        features[9] = self._compute_pen_lifts(strokes)
        features[10] = self._compute_baseline_drift(strokes)
        features[11] = self._compute_direction_reversals(strokes)
        features[12] = self._compute_motor_control(features)
        features[13] = self._compute_writing_fluency(features)
        features[14] = self._compute_spatial_awareness(features)
        features[15] = self._compute_resilience(features)

        features = np.clip(features, 0.0, 1.0)
        assert features.shape == (16,), f"Feature shape error: {features.shape}"
        assert not np.any(np.isnan(features)), "NaN detected in dysgraphia features"
        return features

    def _extract_games(self, payload: Dict) -> Dict:
        if 'games' in payload and isinstance(payload['games'], dict):
            return payload['games']
        if 'assessment_data' in payload and isinstance(payload['assessment_data'], dict):
            return payload['assessment_data'].get('games', {})
        if 'raw_responses' in payload and isinstance(payload['raw_responses'], dict):
            return payload['raw_responses']
        return {}

    def _extract_strokes(self, payload: Dict, games: Dict) -> List[Dict]:
        strokes = []
        if 'strokes' in payload and isinstance(payload['strokes'], list):
            strokes.extend(payload['strokes'])
        for game_data in games.values():
            if isinstance(game_data, dict) and 'strokes' in game_data and isinstance(game_data['strokes'], list):
                strokes.extend(game_data['strokes'])
        return strokes

    def _compute_speed(self, strokes: List[Dict], games: Dict) -> float:
        speeds = [st.get('speed', 0.5) for st in strokes if isinstance(st, dict)]
        if speeds:
            return float(np.clip(np.mean(speeds), 0.0, 1.0))
        for game_data in games.values():
            if isinstance(game_data, dict) and 'speed' in game_data:
                return float(np.clip(game_data['speed'] / 150.0, 0.0, 1.0))
        return 0.5

    def _compute_pressure_var(self, strokes: List[Dict]) -> float:
        pressures = [st['pressure'] for st in strokes if isinstance(st, dict) and st.get('pressure') is not None]
        if len(pressures) < 2:
            return 0.5
        var = float(np.var(pressures))
        return float(1.0 - np.clip(var * 4.0, 0.0, 1.0))

    def _compute_straightness(self, strokes: List[Dict]) -> float:
        vals = [st.get('straightness', 0.7) for st in strokes if isinstance(st, dict)]
        return float(np.clip(np.mean(vals), 0.0, 1.0)) if vals else 0.7

    def _compute_smoothness(self, strokes: List[Dict]) -> float:
        vals = [st.get('smoothness', 0.7) for st in strokes if isinstance(st, dict)]
        return float(np.clip(np.mean(vals), 0.0, 1.0)) if vals else 0.7

    def _compute_tremor(self, strokes: List[Dict]) -> float:
        tremors = [st.get('tremor', 0.3) for st in strokes if isinstance(st, dict)]
        if not tremors:
            return 0.7
        avg_tremor = float(np.mean(tremors))
        return float(1.0 - np.clip(avg_tremor, 0.0, 1.0))

    def _compute_alignment(self, strokes: List[Dict]) -> float:
        vals = [st.get('spatial_alignment', 0.7) for st in strokes if isinstance(st, dict)]
        return float(np.clip(np.mean(vals), 0.0, 1.0)) if vals else 0.7

    def _compute_size_variance(self, strokes: List[Dict]) -> float:
        sizes = [st.get('height', st.get('length', 1.0)) for st in strokes if isinstance(st, dict)]
        if len(sizes) < 2:
            return 0.5
        cv = np.std(sizes) / (np.mean(sizes) + 1e-10)
        return float(1.0 - np.clip(cv, 0.0, 1.0))

    def _compute_fatigue(self, strokes: List[Dict]) -> float:
        speeds = [st.get('speed', 0.5) for st in strokes if isinstance(st, dict)]
        if len(speeds) < 6:
            return 0.5
        third = len(speeds) // 3
        early = np.mean(speeds[:third])
        late = np.mean(speeds[-third:])
        degradation = (early - late) / (early + 1e-10)
        return float(1.0 - np.clip(degradation, 0.0, 1.0))

    def _compute_pause_duration(self, strokes: List[Dict]) -> float:
        pauses = [st['pause_ms'] for st in strokes if isinstance(st, dict) and st.get('pause_ms') is not None]
        if not pauses:
            return 0.5
        avg_p = float(np.mean(pauses))
        return float(1.0 - np.clip((avg_p - 100) / (1000 - 100), 0.0, 1.0))

    def _compute_pen_lifts(self, strokes: List[Dict]) -> float:
        lifts = [st.get('pen_lifts', 2) for st in strokes if isinstance(st, dict)]
        if not lifts:
            return 0.5
        avg_lifts = float(np.mean(lifts))
        return float(1.0 - np.clip((avg_lifts - 1) / 5.0, 0.0, 1.0))

    def _compute_baseline_drift(self, strokes: List[Dict]) -> float:
        drifts = [st['baseline_drift'] for st in strokes if isinstance(st, dict) and st.get('baseline_drift') is not None]
        if not drifts:
            return 0.7
        avg_drift = float(np.mean(drifts))
        return float(1.0 - np.clip(avg_drift * 2.0, 0.0, 1.0))

    def _compute_direction_reversals(self, strokes: List[Dict]) -> float:
        reversals = [st.get('direction_reversals', 0) for st in strokes if isinstance(st, dict)]
        if not reversals:
            return 0.7
        tot = float(np.sum(reversals))
        return float(1.0 - np.clip(tot / 10.0, 0.0, 1.0))

    def _compute_motor_control(self, f: np.ndarray) -> float:
        return float(np.clip(0.4 * f[4] + 0.3 * f[2] + 0.3 * f[3], 0.0, 1.0))

    def _compute_writing_fluency(self, f: np.ndarray) -> float:
        return float(np.clip(0.5 * f[0] + 0.5 * f[3], 0.0, 1.0))

    def _compute_spatial_awareness(self, f: np.ndarray) -> float:
        return float(np.clip(0.5 * f[5] + 0.5 * f[10], 0.0, 1.0))

    def _compute_resilience(self, f: np.ndarray) -> float:
        return float(np.clip(0.5 * f[7] + 0.5 * f[1], 0.0, 1.0))
