"""
Dyslexia Feature Extractor
Extracts exactly 16 normalized features from reading assessment data.

Research basis:
- Snowling (2000): Phonological deficit theory of dyslexia
- Benfatto et al. (2016): Eye-tracking reading markers
- Hasbrouck & Tindal (2006): Oral reading fluency norms
- DSM-5: Diagnostic criteria for Specific Learning Disorder with impairment in reading

Feature index mapping (positions 0-15 in 64-D vector):
  0:  words_per_minute_normalized
  1:  reading_accuracy_rate
  2:  phoneme_error_rate
  3:  letter_confusion_rate (b/d, p/q errors)
  4:  word_decoding_accuracy (pseudowords)
  5:  reading_speed_variance (consistency)
  6:  first_response_latency_normalized
  7:  self_correction_rate
  8:  reading_fatigue_index (speed degradation)
  9:  visual_orthographic_score
 10:  rapid_naming_speed_normalized
 11:  phonological_awareness_score
 12:  working_memory_reading_proxy
 13:  attention_during_reading
 14:  error_recovery_rate
 15:  comprehension_proxy_score
"""

from typing import Dict, Any, List
import numpy as np


class DyslexiaFeatureExtractor:
    """
    Extracts 16-dimensional Dyslexia feature vector
    from raw reading assessment payload. All outputs in [0.0, 1.0].
    """

    FEATURE_NAMES = [
        'words_per_minute_normalized',
        'reading_accuracy_rate',
        'phoneme_error_rate',
        'letter_confusion_rate',
        'word_decoding_accuracy',
        'reading_speed_variance',
        'first_response_latency_normalized',
        'self_correction_rate',
        'reading_fatigue_index',
        'visual_orthographic_score',
        'rapid_naming_speed_normalized',
        'phonological_awareness_score',
        'working_memory_reading_proxy',
        'attention_during_reading',
        'error_recovery_rate',
        'comprehension_proxy_score'
    ]

    WPM_NORMS = {
        '7-8': {'min': 20, 'expected': 53, 'max': 82},
        '8-9': {'min': 40, 'expected': 78, 'max': 100},
        '9-10': {'min': 60, 'expected': 94, 'max': 122},
        '10-11': {'min': 70, 'expected': 110, 'max': 139},
        '11-12': {'min': 80, 'expected': 127, 'max': 150},
    }

    def extract(self, raw_payload: Dict[str, Any], student_age: int = 9) -> np.ndarray:
        features = np.zeros(16, dtype=np.float32)
        games = self._extract_games(raw_payload)

        features[0] = self._compute_wpm_normalized(games, student_age)
        features[1] = self._compute_reading_accuracy(games)
        features[2] = self._compute_phoneme_error_rate(games)
        features[3] = self._compute_letter_confusion(games)
        features[4] = self._compute_decoding_accuracy(games)
        features[5] = self._compute_speed_variance(games)
        features[6] = self._compute_response_latency(games)
        features[7] = self._compute_self_correction_rate(games)
        features[8] = self._compute_fatigue_index(games)
        features[9] = self._compute_orthographic_score(games)
        features[10] = self._compute_rapid_naming(games)
        features[11] = self._compute_phonological_awareness(games)
        features[12] = self._compute_working_memory(games)
        features[13] = self._compute_attention(games)
        features[14] = self._compute_error_recovery(games)
        features[15] = self._compute_comprehension_proxy(games)

        features = np.clip(features, 0.0, 1.0)
        assert features.shape == (16,), f"Feature shape error: {features.shape}"
        assert not np.any(np.isnan(features)), "NaN detected in dyslexia features"
        return features

    def _extract_games(self, payload: Dict) -> Dict:
        if 'games' in payload and isinstance(payload['games'], dict):
            return payload['games']
        if 'assessment_data' in payload and isinstance(payload['assessment_data'], dict):
            return payload['assessment_data'].get('games', {})
        if 'raw_responses' in payload and isinstance(payload['raw_responses'], dict):
            return payload['raw_responses']
        return {}

    def _compute_wpm_normalized(self, games: Dict, age: int) -> float:
        age_key = self._get_age_key(age)
        norms = self.WPM_NORMS.get(age_key, self.WPM_NORMS['9-10'])
        wpm = 0.0
        for game_data in games.values():
            if isinstance(game_data, dict):
                if 'wpm' in game_data:
                    wpm = float(game_data['wpm'])
                    break
                elif 'words_read' in game_data and 'time_seconds' in game_data:
                    time_min = max(float(game_data['time_seconds']) / 60.0, 0.01)
                    wpm = float(game_data['words_read']) / time_min
                    break
        if wpm == 0.0:
            return 0.5
        normalized = wpm / norms['expected']
        return float(np.clip(normalized, 0.0, 1.0))

    def _compute_reading_accuracy(self, games: Dict) -> float:
        accuracies = []
        for game_data in games.values():
            if isinstance(game_data, dict):
                if 'accuracy' in game_data:
                    accuracies.append(float(game_data['accuracy']))
                elif 'correct' in game_data and 'total' in game_data:
                    total = max(int(game_data['total']), 1)
                    accuracies.append(int(game_data['correct']) / total)
                elif 'correct_count' in game_data and 'total_count' in game_data:
                    total = max(int(game_data['total_count']), 1)
                    accuracies.append(int(game_data['correct_count']) / total)
        return float(np.mean(accuracies)) if accuracies else 0.5

    def _compute_phoneme_error_rate(self, games: Dict) -> float:
        total_errors = 0
        total_items = 0
        for game_data in games.values():
            if isinstance(game_data, dict):
                errors = game_data.get('phoneme_errors', game_data.get('total_errors', 0))
                items = game_data.get('total_phonemes', game_data.get('total_count', 0))
                total_errors += int(errors)
                total_items += int(items)
        if total_items == 0:
            return 0.5
        error_rate = total_errors / total_items
        return float(1.0 - np.clip(error_rate, 0.0, 1.0))

    def _compute_letter_confusion(self, games: Dict) -> float:
        confusions = 0
        total = 0
        for game_data in games.values():
            if isinstance(game_data, dict):
                confusions += int(game_data.get('letter_confusions', 0))
                total += int(game_data.get('letter_items', 10))
        if total == 0:
            return 0.5
        rate = confusions / max(total, 1)
        return float(1.0 - np.clip(rate, 0.0, 1.0))

    def _compute_decoding_accuracy(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict):
                if 'pseudoword_accuracy' in game_data:
                    return float(np.clip(game_data['pseudoword_accuracy'], 0.0, 1.0))
        return 0.5

    def _compute_speed_variance(self, games: Dict) -> float:
        speeds = []
        for game_data in games.values():
            if isinstance(game_data, dict):
                if 'response_times' in game_data and isinstance(game_data['response_times'], list):
                    speeds.extend(game_data['response_times'])
                elif 'avg_response_time_ms' in game_data:
                    speeds.append(float(game_data['avg_response_time_ms']))
        if len(speeds) < 2:
            return 0.5
        cv = np.std(speeds) / (np.mean(speeds) + 1e-10)
        return float(1.0 - np.clip(cv, 0.0, 1.0))

    def _compute_response_latency(self, games: Dict) -> float:
        latencies = []
        for game_data in games.values():
            if isinstance(game_data, dict):
                if 'first_response_ms' in game_data:
                    latencies.append(float(game_data['first_response_ms']))
                elif 'avg_response_time_ms' in game_data:
                    latencies.append(float(game_data['avg_response_time_ms']))
        if not latencies:
            return 0.5
        avg_ms = float(np.mean(latencies))
        normalized = 1.0 - (avg_ms - 500) / (3000 - 500)
        return float(np.clip(normalized, 0.0, 1.0))

    def _compute_self_correction_rate(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict):
                if 'self_corrections' in game_data:
                    corrections = int(game_data['self_corrections'])
                    errors = max(int(game_data.get('total_errors', 1)), 1)
                    return float(np.clip(corrections / errors, 0.0, 1.0))
        return 0.3

    def _compute_fatigue_index(self, games: Dict) -> float:
        times = []
        for game_data in games.values():
            if isinstance(game_data, dict):
                if 'response_times' in game_data and isinstance(game_data['response_times'], list):
                    times.extend(game_data['response_times'])
        if len(times) < 6:
            return 0.5
        third = len(times) // 3
        early_mean = np.mean(times[:third])
        late_mean = np.mean(times[-third:])
        degradation = (late_mean - early_mean) / (early_mean + 1e-10)
        return float(1.0 - np.clip(degradation, 0.0, 1.0))

    def _compute_orthographic_score(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'visual_score' in game_data:
                return float(np.clip(game_data['visual_score'], 0.0, 1.0))
        return 0.5

    def _compute_rapid_naming(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'ran_time_seconds' in game_data:
                t = float(game_data['ran_time_seconds'])
                normalized = 1.0 - (t - 20.0) / (60.0 - 20.0)
                return float(np.clip(normalized, 0.0, 1.0))
        return 0.5

    def _compute_phonological_awareness(self, games: Dict) -> float:
        scores = []
        for game_data in games.values():
            if isinstance(game_data, dict) and 'phonological_score' in game_data:
                scores.append(float(game_data['phonological_score']))
        return float(np.mean(scores)) if scores else 0.5

    def _compute_working_memory(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'memory_score' in game_data:
                return float(np.clip(game_data['memory_score'], 0.0, 1.0))
        return 0.5

    def _compute_attention(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'attention_score' in game_data:
                return float(np.clip(game_data['attention_score'], 0.0, 1.0))
        return 0.5

    def _compute_error_recovery(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'error_recovery' in game_data:
                return float(np.clip(game_data['error_recovery'], 0.0, 1.0))
        return 0.5

    def _compute_comprehension_proxy(self, games: Dict) -> float:
        for game_data in games.values():
            if isinstance(game_data, dict) and 'comprehension_score' in game_data:
                return float(np.clip(game_data['comprehension_score'], 0.0, 1.0))
        return 0.5

    def _get_age_key(self, age: int) -> str:
        if age <= 8:
            return '7-8'
        elif age <= 9:
            return '8-9'
        elif age <= 10:
            return '9-10'
        elif age <= 11:
            return '10-11'
        else:
            return '11-12'
