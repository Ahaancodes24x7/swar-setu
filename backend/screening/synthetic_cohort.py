"""
Realistic synthetic cohort generator for SLD screening evaluation.

Design (liability-threshold model, Falconer 1965; used for comorbid
learning disorders by Pennington 2006 "multiple deficit model"):

  * Five correlated latent abilities per child:
        R  reading / phonological processing
        M  number sense / arithmetic
        W  graphomotor / handwriting
        E  executive function / attention (ADHD-like low tail, NOT a label)
        S  processing speed
  * Each disorder is a thresholded liability built mostly from one latent
    plus diagnostic unreliability, so comorbidity emerges from the latent
    correlations rather than from hand-coded rules.
  * 64 observed features follow the semantics, polarity (higher = better),
    defaults for missing inputs and derived-feature formulas of
    backend/ai/feature_extractors/*. Each feature loads on one or more latents,
    so cross-domain contamination (e.g. reading load in maths word problems)
    is present, as in real batteries.
  * Construct-irrelevant variance: age (development), home language (Hindi-
    dominant children score lower on English phonological items without
    having dyslexia), input device (finger vs stylus; no pressure on finger).
  * Measurement realism: logistic score transform with ceiling/floor,
    binomial item-count discretisation for accuracy scores, reading-speed
    ceiling caused by the extractor's wpm/expected clip, item-level missing
    values replaced by the extractor default, whole skipped modules.
  * Imperfect reference standard: some true cases are missed (false-negative
    labels) and a few typical children carry a positive label.

All values are synthetic. The generator is a stress test of the pipeline,
not a substitute for clinical validation data.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy.stats import norm

LATENTS = ["R", "M", "W", "E", "S"]
DISORDERS = ["Dyslexia", "Dyscalculia", "Dysgraphia"]

# Latent correlation matrix (order R, M, W, E, S). Values follow the typical
# range reported for reading-maths (~0.5) and motor-literacy (~0.3-0.4) links.
LATENT_CORR = np.array([
    [1.00, 0.55, 0.40, 0.35, 0.40],
    [0.55, 1.00, 0.25, 0.35, 0.40],
    [0.40, 0.25, 1.00, 0.30, 0.40],
    [0.35, 0.35, 0.30, 1.00, 0.40],
    [0.40, 0.40, 0.40, 0.40, 1.00],
])

# (name, loadings{latent: lambda}, typical mean on [0,1], missing default,
#  n_items for binomial discretisation (0 = continuous), language-sensitive)
FeatureSpec = Tuple[str, Dict[str, float], float, float, int, bool]

FEATURES: List[FeatureSpec] = [
    # ---- Dyslexia block (0-15) -------------------------------------------
    ("words_per_minute_normalized", {"R": .55, "S": .35}, -1, .5, 0, True),
    ("reading_accuracy_rate", {"R": .65}, .85, .5, 30, True),
    ("phoneme_error_rate", {"R": .70}, .80, .5, 24, True),
    ("letter_confusion_rate", {"R": .45, "E": .15}, .88, .5, 0, False),
    ("word_decoding_accuracy", {"R": .75}, .72, .5, 20, True),
    ("reading_speed_variance", {"R": .30, "E": .30}, .70, .5, 0, False),
    ("first_response_latency_normalized", {"S": .45, "R": .25}, .60, .5, 0, False),
    ("self_correction_rate", {"E": .25, "R": .15}, .35, .3, 0, False),
    ("reading_fatigue_index", {"E": .35, "R": .20}, .75, .5, 0, False),
    ("visual_orthographic_score", {"R": .45, "W": .15}, .70, .5, 0, False),
    ("rapid_naming_speed_normalized", {"R": .45, "S": .40}, .55, .5, 0, True),
    ("phonological_awareness_score", {"R": .70}, .70, .5, 20, True),
    ("working_memory_reading_proxy", {"E": .45, "R": .25, "M": .15}, .60, .5, 0, False),
    ("attention_during_reading", {"E": .60}, .65, .5, 0, False),
    ("error_recovery_rate", {"E": .40, "R": .20}, .60, .5, 0, False),
    ("comprehension_proxy_score", {"R": .50, "E": .25}, .70, .5, 15, True),
    # ---- Dyscalculia block (16-31) ---------------------------------------
    ("subitizing_accuracy", {"M": .45, "S": .20}, .85, .5, 16, False),
    ("symbolic_comparison_speed", {"M": .40, "S": .45}, .60, .5, 0, False),
    ("arithmetic_fact_retrieval", {"M": .55, "S": .35}, .55, .5, 0, False),
    ("spatial_numerical_score", {"M": .45, "W": .15}, .70, .5, 0, False),
    ("calculation_precision", {"M": .70}, .78, .5, 20, False),
    ("math_error_recovery", {"E": .40, "M": .20}, .60, .5, 0, False),
    ("number_line_accuracy", {"M": .60}, .78, .5, 0, False),
    ("counting_strategy_efficiency", {"M": .55}, .60, .5, 0, False),
    ("multi_step_accuracy", {"M": .55, "E": .20, "R": .15}, .65, .5, 12, False),
    ("number_memory_span", {"E": .45, "M": .25}, .70, .5, 7, False),
    ("place_value_score", {"M": .60}, .72, .5, 12, False),
    ("estimation_score", {"M": .50}, .65, .5, 0, False),
    ("procedural_score", {"M": .60}, .70, .5, 12, False),
    ("conceptual_score", {"M": .60}, .68, .5, 12, False),
    ("math_fluency", {}, -1, .5, 0, False),  # derived
    ("problem_comprehension", {"M": .40, "R": .40}, .65, .5, 10, True),
    # ---- Dysgraphia block (32-47) ----------------------------------------
    ("writing_speed", {"W": .45, "S": .35}, .55, .5, 0, False),
    ("pressure_variability", {"W": .40}, .70, .5, 0, False),
    ("stroke_straightness", {"W": .55}, .72, .7, 0, False),
    ("stroke_smoothness", {"W": .60}, .70, .7, 0, False),
    ("tremor_inverse", {"W": .50}, .78, .7, 0, False),
    ("letter_alignment", {"W": .50}, .72, .7, 0, False),
    ("size_consistency", {"W": .50}, .65, .5, 0, False),
    ("writing_fatigue", {"W": .35, "E": .25}, .72, .5, 0, False),
    ("pause_duration", {"W": .35, "R": .30, "S": .20}, .60, .5, 0, False),
    ("pen_lifts", {"W": .45}, .62, .5, 0, False),
    ("baseline_drift", {"W": .45}, .75, .7, 0, False),
    ("direction_reversals", {"W": .40, "R": .25}, .80, .7, 0, False),
    ("motor_control", {}, -1, .5, 0, False),        # derived
    ("writing_fluency", {}, -1, .5, 0, False),      # derived
    ("spatial_awareness", {}, -1, .5, 0, False),    # derived
    ("writing_resilience", {}, -1, .5, 0, False),   # derived
    # ---- Behavioural block (48-63) ---------------------------------------
    ("cognitive_load_resilience", {"E": .50}, .60, .5, 0, False),
    ("sustained_attention_focus", {"E": .65}, .62, .5, 0, False),
    ("self_correction_capability", {"E": .35}, .45, .5, 0, False),
    ("task_completion_efficiency", {"E": .40, "S": .35}, .62, .5, 0, False),
    ("behav_error_recovery_rate", {"E": .45}, .60, .5, 0, False),
    ("processing_pace_consistency", {"S": .40, "E": .30}, .62, .5, 0, False),
    ("metacognitive_monitoring", {"E": .40}, .58, .5, 0, False),
    ("frustration_tolerance_proxy", {"E": .40}, .62, .5, 0, False),
    ("multi_modal_integration", {"E": .30, "R": .20, "M": .20}, .62, .5, 0, False),
    ("instruction_following_precision", {"E": .50, "R": .20}, .68, .5, 0, True),
    ("impulse_control_score", {"E": .60}, .65, .5, 0, False),
    ("response_latency_stability", {"E": .40, "S": .30}, .62, .5, 0, False),
    ("adaptive_strategy_switching", {"E": .50}, .58, .5, 0, False),
    ("persistent_effort_index", {"E": .45}, .64, .5, 0, False),
    ("spatial_working_memory", {"E": .45, "M": .20, "W": .15}, .62, .5, 0, False),
    ("cross_domain_executive_function", {"E": .55, "S": .20}, .60, .5, 0, False),
]
assert len(FEATURES) == 64
FEATURE_NAMES = [f[0] for f in FEATURES]
MISSING_DEFAULTS = np.array([f[3] for f in FEATURES], dtype=np.float32)
BLOCKS = {"Dyslexia": slice(0, 16), "Dyscalculia": slice(16, 32),
          "Dysgraphia": slice(32, 48), "Behavioural": slice(48, 64)}
# Secondary emotional/motivational effect of having any SLD
LD_SECONDARY = {"frustration_tolerance_proxy": -.40, "persistent_effort_index": -.35,
                "cognitive_load_resilience": -.25, "metacognitive_monitoring": -.20}
PRESSURE_IDX = FEATURE_NAMES.index("pressure_variability")
VISION_SENSITIVE = {"words_per_minute_normalized", "reading_accuracy_rate", "letter_confusion_rate",
                    "word_decoding_accuracy", "visual_orthographic_score", "comprehension_proxy_score",
                    "letter_alignment", "baseline_drift", "size_consistency", "number_line_accuracy"}
HEARING_SENSITIVE = {"phoneme_error_rate", "phonological_awareness_score", "word_decoding_accuracy",
                     "rapid_naming_speed_normalized", "number_memory_span"}
QUESTIONNAIRE_DOMAINS = ("reading", "writing", "math")
KINEMATIC_IDX = [FEATURE_NAMES.index(n) for n in
                 ("stroke_straightness", "stroke_smoothness", "tremor_inverse",
                  "letter_alignment", "size_consistency", "baseline_drift")]


@dataclass
class CohortConfig:
    n: int = 6000
    prevalence: Dict[str, float] = field(default_factory=lambda: {
        "Dyslexia": 0.08, "Dyscalculia": 0.06, "Dysgraphia": 0.07})
    diag_reliability: float = 0.90       # loading of liability on its latent
    age_range: Tuple[float, float] = (7.0, 13.0)
    age_probs: Optional[List[float]] = None   # over integer years 7..12
    p_hindi: float = 0.60
    hindi_shift: float = -0.35           # SD shift on English-language items
    p_finger: float = 0.70
    finger_noise: float = 1.5            # kinematic noise multiplier on finger
    age_slope: float = 0.25              # SD gain per year on raw skills
    extra_noise: float = 0.0             # extra session / device noise (SD)
    item_missing: float = 0.08
    module_skip: float = 0.10
    label_fn_rate: float = 0.10          # true cases unlabelled (missed dx)
    label_fp_rate: float = 0.01          # typical children labelled positive
    loading_scale: float = 1.0           # multiplies all feature loadings (signal strength)
    # DSM-5 Criterion D factors and teacher questionnaire (off by default: earlier cohorts unchanged)
    p_language_developing: float = 0.0   # share of Hindi-dominant children still developing English proficiency
    p_language_limited: float = 0.0      # share of Hindi-dominant children with limited English proficiency
    language_developing_shift: float = -0.35
    language_limited_shift: float = -0.70
    p_vision_concern: float = 0.0        # uncorrected vision problem
    p_hearing_concern: float = 0.0       # uncorrected hearing problem
    acuity_shift: float = -0.50
    teacher_accuracy: float = 0.65       # loading of teacher-perceived difficulty on true difficulty
    teacher_halo: float = 0.30           # attention problems colour teacher ratings
    teacher_language_bias: float = 0.40  # language learners are rated as struggling more
    questionnaire_missing: float = 0.10  # profiles without a completed questionnaire


def dsm5_config(n: int = 6000, **overrides) -> CohortConfig:
    """Cohort with DSM-5 Criterion D factors (language proficiency, vision, hearing) switched on."""
    base = dict(n=n, p_language_developing=0.30, p_language_limited=0.10, p_vision_concern=0.05,
                p_hearing_concern=0.03)
    base.update(overrides)
    return CohortConfig(**base)


def site_b_config(n: int = 3000) -> CohortConfig:
    """Distribution-shifted 'external site': younger, more Hindi-dominant,
    mostly finger input, noisier sessions, more missing data, higher prevalence."""
    return CohortConfig(
        n=n,
        prevalence={"Dyslexia": 0.10, "Dyscalculia": 0.08, "Dysgraphia": 0.09},
        age_probs=[0.35, 0.30, 0.15, 0.10, 0.05, 0.05],
        p_hindi=0.85, p_finger=0.95, extra_noise=0.25,
        item_missing=0.15, module_skip=0.20,
    )


def _logit(p: float) -> float:
    return float(np.log(p / (1 - p)))


def generate_cohort(cfg: CohortConfig, seed: int) -> Dict[str, np.ndarray]:
    rng = np.random.default_rng(seed)
    n = cfg.n

    # 1. demographics
    if cfg.age_probs is None:
        age = rng.uniform(*cfg.age_range, size=n)
    else:
        age = rng.choice(np.arange(7, 13), size=n, p=cfg.age_probs) + rng.uniform(0, 1, n)
    hindi = rng.random(n) < cfg.p_hindi
    finger = rng.random(n) < cfg.p_finger

    # 2. latent abilities (age-standardised)
    L = rng.multivariate_normal(np.zeros(5), LATENT_CORR, size=n)
    lat = {k: L[:, i] for i, k in enumerate(LATENTS)}

    # 3. true disorder status via liability threshold
    r = cfg.diag_reliability
    primary = {"Dyslexia": lat["R"], "Dyscalculia": lat["M"],
               "Dysgraphia": 0.85 * lat["W"] + 0.25 * lat["R"]}
    y_true = np.zeros((n, 3), dtype=np.int64)
    for j, d in enumerate(DISORDERS):
        base = primary[d] / np.std(primary[d])
        liability = r * base + np.sqrt(1 - r ** 2) * rng.standard_normal(n)
        y_true[:, j] = (liability < norm.ppf(cfg.prevalence[d])).astype(np.int64)
    any_ld = y_true.max(axis=1) == 1

    # 3b. DSM-5 Criterion D factors (separate RNG so earlier cohorts are unchanged)
    rng_d = np.random.default_rng(seed + 7_000_003)
    u = rng_d.random(n)
    proficiency = np.zeros(n, dtype=np.int64)  # 0 fluent, 1 developing, 2 limited (language of instruction)
    proficiency[hindi & (u < cfg.p_language_limited)] = 2
    proficiency[hindi & (u >= cfg.p_language_limited) & (u < cfg.p_language_limited + cfg.p_language_developing)] = 1
    lang_extra = np.where(proficiency == 2, cfg.language_limited_shift,
                          np.where(proficiency == 1, cfg.language_developing_shift, 0.0))
    vision = rng_d.random(n) < cfg.p_vision_concern
    hearing = rng_d.random(n) < cfg.p_hearing_concern

    # 4. observed features
    X = np.zeros((n, 64), dtype=np.float64)
    expected_wpm_ratio = None
    for j, (name, loads, mean, default, n_items, lang) in enumerate(FEATURES):
        if not loads:
            continue
        loads = {k: v * cfg.loading_scale for k, v in loads.items()}
        comm = sum(v ** 2 for v in loads.values())
        if comm > 0.95:  # keep a unique-variance floor when loadings are scaled up
            loads = {k: v * np.sqrt(0.95 / comm) for k, v in loads.items()}
            comm = 0.95
        z = sum(v * lat[k] for k, v in loads.items())
        z = z + np.sqrt(max(1e-6, 1 - comm)) * rng.standard_normal(n)
        z = z + cfg.extra_noise * rng.standard_normal(n)
        if name in LD_SECONDARY:
            z = z + LD_SECONDARY[name] * any_ld
        if lang:
            z = z + cfg.hindi_shift * hindi + lang_extra
        if name in VISION_SENSITIVE:
            z = z + cfg.acuity_shift * vision
        if name in HEARING_SENSITIVE:
            z = z + cfg.acuity_shift * hearing
        if j in KINEMATIC_IDX:
            z = np.where(finger, z * 1.0 + (cfg.finger_noise - 1) * rng.standard_normal(n) * 0.6, z)
        if name == "words_per_minute_normalized":
            # extractor computes wpm / age-expected wpm and clips at 1.0
            ratio = np.exp(0.30 * z)          # lognormal around the age norm
            X[:, j] = np.clip(ratio, 0, 1)
            expected_wpm_ratio = ratio
            continue
        # raw (not age-normed) skills grow with age
        z = z + cfg.age_slope * (age - 9.5)
        p = 1.0 / (1.0 + np.exp(-(_logit(mean) + 1.0 * z)))
        if n_items:
            p = rng.binomial(n_items, p) / n_items
        X[:, j] = p

    # pressure is not measurable from finger input -> extractor default
    X[finger, PRESSURE_IDX] = MISSING_DEFAULTS[PRESSURE_IDX]

    # derived features exactly as in the extractors
    X[:, 30] = np.clip(0.6 * X[:, 20] + 0.4 * X[:, 18], 0, 1)          # math fluency
    g = 32
    X[:, g + 12] = np.clip(.4 * X[:, g + 4] + .3 * X[:, g + 2] + .3 * X[:, g + 3], 0, 1)
    X[:, g + 13] = np.clip(.5 * X[:, g + 0] + .5 * X[:, g + 3], 0, 1)
    X[:, g + 14] = np.clip(.5 * X[:, g + 5] + .5 * X[:, g + 10], 0, 1)
    X[:, g + 15] = np.clip(.5 * X[:, g + 7] + .5 * X[:, g + 1], 0, 1)

    # 5. missingness -> extractor defaults (indistinguishable from real values)
    item_mask = rng.random((n, 64)) < cfg.item_missing
    X[item_mask] = np.broadcast_to(MISSING_DEFAULTS, (n, 64))[item_mask]
    skipped = np.zeros((n, 3), dtype=bool)
    for b, d in enumerate(DISORDERS):
        skipped[:, b] = rng.random(n) < cfg.module_skip / 3
        sl = BLOCKS[d]
        X[np.ix_(skipped[:, b], np.arange(sl.start, sl.stop))] = MISSING_DEFAULTS[sl]

    # 6. imperfect reference-standard labels
    y_obs = y_true.copy()
    flip_fn = (y_true == 1) & (rng.random((n, 3)) < cfg.label_fn_rate)
    flip_fp = (y_true == 0) & (rng.random((n, 3)) < cfg.label_fp_rate)
    y_obs[flip_fn] = 0
    y_obs[flip_fp] = 1

    # 7. teacher questionnaire: DSM-5 Criterion A symptoms (two 0-3 items per domain) and
    #    Criterion B attainment, perceived through rater noise, a halo from attention problems,
    #    and a bias against children still learning the language of instruction
    rng_q = np.random.default_rng(seed + 9_000_011)
    difficulty = {"reading": -lat["R"], "writing": -(0.85 * lat["W"] + 0.25 * lat["R"]) / np.std(0.85 * lat["W"] + 0.25 * lat["R"]),
                  "math": -lat["M"]}
    lam, halo = cfg.teacher_accuracy, cfg.teacher_halo
    resid = np.sqrt(max(1e-6, 1 - lam ** 2 - halo ** 2))
    q = np.zeros((n, 6))
    q_items = np.zeros((n, 6), dtype=np.int64)
    q_level = np.zeros((n, 3), dtype=np.int64)
    for k, dom in enumerate(QUESTIONNAIRE_DOMAINS):
        perceived = lam * difficulty[dom] + halo * (-lat["E"]) + resid * rng_q.standard_normal(n)
        if dom in ("reading", "writing"):
            perceived = perceived + cfg.teacher_language_bias * (proficiency > 0) + 0.3 * (vision | hearing)
        items = [np.digitize(perceived + 0.5 * rng_q.standard_normal(n), [0.6, 1.3, 2.0]) for _ in range(2)]
        q_items[:, 2 * k], q_items[:, 2 * k + 1] = items
        level = np.digitize(perceived + 0.4 * rng_q.standard_normal(n), [1.0, 1.8])  # 0 at/above, 1 below, 2 well below
        q_level[:, k] = level
        q[:, 2 * k] = (items[0] + items[1]) / 6.0
        q[:, 2 * k + 1] = level / 2.0
    missing_q = rng_q.random(n) < cfg.questionnaire_missing
    q[missing_q] = np.nan

    return {
        "X": X.astype(np.float32), "y": y_obs, "y_true": y_true,
        "age": age, "hindi": hindi, "finger": finger, "skipped": skipped,
        "latent": L,
        "questionnaire": q, "questionnaire_items": q_items, "questionnaire_level": q_level,
        "questionnaire_missing": missing_q, "proficiency": proficiency,
        "vision_concern": vision, "hearing_concern": hearing,
    }


def apply_extra_missingness(X: np.ndarray, rate: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    Xm = X.copy()
    mask = rng.random(X.shape) < rate
    Xm[mask] = np.broadcast_to(MISSING_DEFAULTS, X.shape)[mask]
    return Xm


def describe_cohort(c: Dict[str, np.ndarray]) -> Dict[str, float]:
    y, yt = c["y"], c["y_true"]
    out = {f"prev_obs_{d}": float(y[:, i].mean()) for i, d in enumerate(DISORDERS)}
    out.update({f"prev_true_{d}": float(yt[:, i].mean()) for i, d in enumerate(DISORDERS)})
    for i, a in enumerate(DISORDERS):
        for j, b in enumerate(DISORDERS):
            if i != j and yt[:, i].sum():
                out[f"P({b}|{a})"] = float(yt[yt[:, i] == 1, j].mean())
    out["any_disorder"] = float(yt.max(1).mean())
    # median per-feature Cohen's d within each disorder block (true labels)
    for i, d in enumerate(DISORDERS):
        sl = BLOCKS[d]
        pos, neg = c["X"][yt[:, i] == 1, sl], c["X"][yt[:, i] == 0, sl]
        sd = np.sqrt((pos.var(0) + neg.var(0)) / 2) + 1e-9
        out[f"median_d_{d}"] = float(np.median((neg.mean(0) - pos.mean(0)) / sd))
    return out
