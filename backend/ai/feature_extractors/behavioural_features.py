"""
Behavioural Feature Extractor
Extracts 16 cross-domain behavioural, cognitive load, and executive function features.

Research basis:
- Sweller (1988): Cognitive load theory
- Miyake et al. (2000): Executive functions framework (shifting, updating, inhibition)
- Willcutt et al. (2005): Comorbidity and executive function deficits in SLD/ADHD

Feature index mapping (positions 48-63 in 64-D vector):
 48:  cognitive_load_resilience (performance stability under high load)
 49:  sustained_attention_focus (response time variance inverse)
 50:  self_correction_capability (spontaneous error editing)
 51:  task_completion_efficiency (speed + accuracy composite)
 52:  error_recovery_rate (post-error response time & accuracy)
 53:  processing_pace_consistency (pacing variance across sessions)
 54:  metacognitive_monitoring (confidence alignment with correctness)
 55:  frustration_tolerance_proxy (performance drop after consecutive errors)
 56:  multi_modal_integration (audio-visual-motor coordination)
 57:  instruction_following_precision (rule compliance rate)
 58:  impulse_control_score (premature response avoidance)
 59:  response_latency_stability (coefficient of variation of RT)
 60:  adaptive_strategy_switching (flexibility when difficulty increases)
 61:  persistent_effort_index (completion rate of challenging items)
 62:  spatial_working_memory (n-back or visual memory proxy)
 63:  cross_domain_executive_function (overall cognitive control index)
"""

from typing import Dict, Any, List
import numpy as np


class BehaviouralFeatureExtractor:
    """
    Extracts 16-dimensional Behavioural feature vector
    from raw assessment payload across all task types.
    All outputs normalized to [0.0, 1.0].
    """

    FEATURE_NAMES = [
        'cognitive_load_resilience',
        'sustained_attention_focus',
        'self_correction_capability',
        'task_completion_efficiency',
        'error_recovery_rate',
        'processing_pace_consistency',
        'metacognitive_monitoring',
        'frustration_tolerance_proxy',
        'multi_modal_integration',
        'instruction_following_precision',
        'impulse_control_score',
        'response_latency_stability',
        'adaptive_strategy_switching',
        'persistent_effort_index',
        'spatial_working_memory',
        'cross_domain_executive_function'
    ]

    def extract(self, raw_payload: Dict[str, Any], student_age: int = 9) -> np.ndarray:
        features = np.zeros(16, dtype=np.float32)
        games = self._extract_games(raw_payload)

        acc = self._avg_acc(games)
        rt_std = self._rt_std(games)
        cog_load = self._cog_load(games)

        features[0] = float(np.clip(1.0 - cog_load, 0.0, 1.0))
        features[1] = float(np.clip(1.0 - rt_std / 3000.0, 0.0, 1.0))
        features[2] = float(np.clip(self._sum_key(games, 'self_corrections') / 10.0, 0.0, 1.0))
        features[3] = float(np.clip(acc * 0.7 + features[1] * 0.3, 0.0, 1.0))
        features[4] = float(np.clip(self._mean_key(games, 'error_recovery', default=0.5), 0.0, 1.0))
        features[5] = float(np.clip(1.0 - rt_std / 2500.0, 0.0, 1.0))
        features[6] = float(np.clip(self._mean_key(games, 'confidence_accuracy', default=acc), 0.0, 1.0))
        features[7] = float(np.clip(self._mean_key(games, 'frustration_tolerance', default=0.6), 0.0, 1.0))
        features[8] = float(np.clip(self._mean_key(games, 'integration_score', default=0.5), 0.0, 1.0))
        features[9] = float(np.clip(acc, 0.0, 1.0))
        features[10] = float(np.clip(1.0 - self._sum_key(games, 'premature_clicks') / 15.0, 0.0, 1.0))
        features[11] = features[1]
        features[12] = float(np.clip(self._mean_key(games, 'adaptability', default=0.5), 0.0, 1.0))
        features[13] = float(np.clip(acc * 0.8 + 0.2, 0.0, 1.0))
        features[14] = float(np.clip(self._mean_key(games, 'spatial_memory', default=0.5), 0.0, 1.0))
        features[15] = float(np.clip(np.mean([features[0], features[1], features[2], features[10]]), 0.0, 1.0))

        features = np.clip(features, 0.0, 1.0)
        assert features.shape == (16,), f"Feature shape error: {features.shape}"
        assert not np.any(np.isnan(features)), "NaN detected in behavioural features"
        return features

    def _extract_games(self, payload: Dict) -> Dict:
        if 'games' in payload and isinstance(payload['games'], dict):
            return payload['games']
        if 'assessment_data' in payload and isinstance(payload['assessment_data'], dict):
            return payload['assessment_data'].get('games', {})
        if 'raw_responses' in payload and isinstance(payload['raw_responses'], dict):
            return payload['raw_responses']
        return {}

    def _avg_acc(self, games: Dict) -> float:
        accs = []
        for g in games.values():
            if isinstance(g, dict):
                if 'accuracy' in g:
                    accs.append(float(g['accuracy']))
                elif 'correct_count' in g and 'total_count' in g:
                    tot = max(int(g['total_count']), 1)
                    accs.append(int(g['correct_count']) / tot)
        return float(np.mean(accs)) if accs else 0.5

    def _rt_std(self, games: Dict) -> float:
        rts = []
        for g in games.values():
            if isinstance(g, dict):
                if 'response_times' in g and isinstance(g['response_times'], list):
                    rts.extend(g['response_times'])
                elif 'avg_response_time_ms' in g:
                    rts.append(float(g['avg_response_time_ms']))
        return float(np.std(rts)) if len(rts) > 1 else 300.0

    def _cog_load(self, games: Dict) -> float:
        loads = []
        for g in games.values():
            if isinstance(g, dict) and 'cognitive_load' in g:
                loads.append(float(g['cognitive_load']))
        return float(np.mean(loads)) if loads else 0.5

    def _sum_key(self, games: Dict, key: str) -> float:
        tot = 0.0
        for g in games.values():
            if isinstance(g, dict) and key in g:
                tot += float(g[key])
        return tot

    def _mean_key(self, games: Dict, key: str, default: float = 0.5) -> float:
        vals = []
        for g in games.values():
            if isinstance(g, dict) and key in g:
                vals.append(float(g[key]))
        return float(np.mean(vals)) if vals else default
