"""
Dyscalculia Feature Extractor
Extracts exactly 16 normalized features from mathematical reasoning assessment data.

Research basis:
- Butterworth (2010): Deficit in core capacity for processing numerical magnitudes
- Dehaene (2011): Triple-code model of numerical cognition & approximate number system
- Geary (2004): Cognitive mechanisms in mathematical learning disabilities
- DSM-5: Diagnostic criteria for Specific Learning Disorder with impairment in mathematics

Feature index mapping (positions 16-31 in 64-D vector):
 16:  subitizing_accuracy (< 4 items rapid perception)
 17:  symbolic_comparison_speed (digit magnitude comparison)
 18:  arithmetic_retrieval_time (math fact retrieval)
 19:  spatial_numerical_score (spatial number line representation)
 20:  calculation_precision (arithmetic error rate)
 21:  error_recovery_rate (self-correction in math multi-steps)
 22:  number_line_accuracy (estimation error on 0-100 scale)
 23:  counting_strategy_efficiency (min counting strategy vs count-all)
 24:  multi_step_accuracy (breakdown pattern in complex problems)
 25:  number_memory_span (working memory for digits)
 26:  place_value_accuracy (base-10 positional understanding)
 27:  estimation_accuracy (exact vs approximate calculation bias)
 28:  procedural_accuracy (carry/borrow algorithmic steps)
 29:  conceptual_understanding (symbol-quantity mapping)
 30:  math_fluency_score (speed + accuracy composite)
 31:  problem_comprehension (word problem breakdown)
"""

from typing import Dict, Any, List
import numpy as np


class DyscalculiaFeatureExtractor:
    """
    Extracts 16-dimensional Dyscalculia feature vector
    from raw math assessment payload. All outputs normalized to [0.0, 1.0].
    """

    FEATURE_NAMES = [
        'subitizing_accuracy',
        'symbolic_comparison_speed',
        'arithmetic_retrieval_time',
        'spatial_numerical_score',
        'calculation_precision',
        'error_recovery_rate',
        'number_line_accuracy',
        'counting_strategy_efficiency',
        'multi_step_accuracy',
        'number_memory_span',
        'place_value_accuracy',
        'estimation_accuracy',
        'procedural_accuracy',
        'conceptual_understanding',
        'math_fluency_score',
        'problem_comprehension'
    ]

    def extract(self, raw_payload: Dict[str, Any], student_age: int = 9) -> np.ndarray:
        features = np.zeros(16, dtype=np.float32)
        games = self._extract_games(raw_payload)

        features[0] = self._compute_subitizing(games)
        features[1] = self._compute_symbolic_speed(games)
        features[2] = self._compute_arithmetic_retrieval(games)
        features[3] = self._compute_spatial_numerical(games)
        features[4] = self._compute_calculation_precision(games)
        features[5] = self._compute_error_recovery(games)
        features[6] = self._compute_number_line(games)
        features[7] = self._compute_counting_strategy(games)
        features[8] = self._compute_multi_step(games)
        features[9] = self._compute_number_memory(games)
        features[10] = self._compute_place_value(games)
        features[11] = self._compute_estimation(games)
        features[12] = self._compute_procedural(games)
        features[13] = self._compute_conceptual(games)
        features[14] = self._compute_math_fluency(games)
        features[15] = self._compute_problem_comprehension(games)

        features = np.clip(features, 0.0, 1.0)
        assert features.shape == (16,), f"Feature shape error: {features.shape}"
        assert not np.any(np.isnan(features)), "NaN detected in dyscalculia features"
        return features

    def _extract_games(self, payload: Dict) -> Dict:
        if 'games' in payload and isinstance(payload['games'], dict):
            return payload['games']
        if 'assessment_data' in payload and isinstance(payload['assessment_data'], dict):
            return payload['assessment_data'].get('games', {})
        if 'raw_responses' in payload and isinstance(payload['raw_responses'], dict):
            return payload['raw_responses']
        return {}

    def _compute_subitizing(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'subitizing_accuracy' in game_data:
                return float(np.clip(game_data['subitizing_accuracy'], 0.0, 1.0))
        return self._avg_accuracy(games)

    def _compute_symbolic_speed(self, games: Dict) -> float:
        times = []
        for game_data in games.values():
            if isinstance(game_data, dict):
                if 'comparison_rt_ms' in game_data:
                    times.append(float(game_data['comparison_rt_ms']))
                elif 'avg_response_time_ms' in game_data:
                    times.append(float(game_data['avg_response_time_ms']))
        if not times:
            return 0.5
        avg_rt = float(np.mean(times))
        return float(np.clip(1.0 - (avg_rt - 400) / (2500 - 400), 0.0, 1.0))

    def _compute_arithmetic_retrieval(self, games: Dict) -> float:
        times = []
        for game_data in games.values():
            if isinstance(game_data, dict) and 'avg_response_time_ms' in game_data:
                times.append(float(game_data['avg_response_time_ms']))
        if not times:
            return 0.5
        avg_rt = float(np.mean(times))
        return float(np.clip(1.0 - (avg_rt - 800) / (4000 - 800), 0.0, 1.0))

    def _compute_spatial_numerical(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'spatial_score' in game_data:
                return float(np.clip(game_data['spatial_score'], 0.0, 1.0))
        return self._avg_accuracy(games)

    def _compute_calculation_precision(self, games: Dict) -> float:
        return self._avg_accuracy(games)

    def _compute_error_recovery(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'error_recovery' in game_data:
                return float(np.clip(game_data['error_recovery'], 0.0, 1.0))
        return 0.5

    def _compute_number_line(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'number_line_error' in game_data:
                err = float(game_data['number_line_error'])
                return float(np.clip(1.0 - err, 0.0, 1.0))
        return 0.5

    def _compute_counting_strategy(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'strategy_efficiency' in game_data:
                return float(np.clip(game_data['strategy_efficiency'], 0.0, 1.0))
        return 0.5

    def _compute_multi_step(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'multi_step_accuracy' in game_data:
                return float(np.clip(game_data['multi_step_accuracy'], 0.0, 1.0))
        return self._avg_accuracy(games)

    def _compute_number_memory(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'digit_span' in game_data:
                span = float(game_data['digit_span'])
                return float(np.clip(span / 7.0, 0.0, 1.0))
        return 0.5

    def _compute_place_value(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'place_value_score' in game_data:
                return float(np.clip(game_data['place_value_score'], 0.0, 1.0))
        return self._avg_accuracy(games)

    # the DSM-5 dyscalculia test sends *_accuracy; older clients sent *_score
    def _compute_estimation(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict):
                for key in ('estimation_score', 'estimation_accuracy'):
                    if key in game_data:
                        return float(np.clip(game_data[key], 0.0, 1.0))
        return 0.5

    def _compute_procedural(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict):
                for key in ('procedural_score', 'procedural_accuracy'):
                    if key in game_data:
                        return float(np.clip(game_data[key], 0.0, 1.0))
        return self._avg_accuracy(games)

    def _compute_conceptual(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'conceptual_score' in game_data:
                return float(np.clip(game_data['conceptual_score'], 0.0, 1.0))
        return self._avg_accuracy(games)

    def _compute_math_fluency(self, games: Dict) -> float:
        acc = self._avg_accuracy(games)
        retrieval = self._compute_arithmetic_retrieval(games)
        return float(np.clip(0.6 * acc + 0.4 * retrieval, 0.0, 1.0))

    def _compute_problem_comprehension(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'comprehension_score' in game_data:
                return float(np.clip(game_data['comprehension_score'], 0.0, 1.0))
        return 0.5

    def _avg_accuracy(self, games: Dict) -> float:
        accs = []
        for game_data in games.values():
            if isinstance(game_data, dict):
                if 'accuracy' in game_data:
                    accs.append(float(game_data['accuracy']))
                elif 'correct_count' in game_data and 'total_count' in game_data:
                    tot = max(int(game_data['total_count']), 1)
                    accs.append(int(game_data['correct_count']) / tot)
        return float(np.mean(accs)) if accs else 0.5
