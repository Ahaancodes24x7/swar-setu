"""
DSM-5 specific learning disorder (SLD) framework: the student profile / teacher
questionnaire, its validation, the features it contributes to the screening model,
and a criteria A-D summary.

DSM-5 SLD (APA 2013) requires:
  A  >= 1 of six symptoms, persisting >= 6 months despite targeted intervention
  B  skills substantially and quantifiably below those expected for age, interfering
     with academic performance
  C  onset during school-age years
  D  not better accounted for by intellectual disability, uncorrected visual or
     auditory acuity, other mental or neurological disorders, psychosocial adversity,
     lack of proficiency in the language of academic instruction, or inadequate
     educational instruction
Specifiers: reading (word reading accuracy, reading rate/fluency, comprehension),
written expression (spelling, grammar/punctuation, clarity/organisation),
mathematics (number sense, arithmetic facts, calculation, reasoning).

This is a screening aid. It never states that a child meets DSM-5 criteria: only a
qualified professional can diagnose.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

SCHEMA_VERSION = 1
FREQ = [{"value": 0, "label": "Never"}, {"value": 1, "label": "Sometimes"},
        {"value": 2, "label": "Often"}, {"value": 3, "label": "Very often"}]
LEVEL = [{"value": "above", "label": "Above grade level"}, {"value": "at", "label": "At grade level"},
         {"value": "below", "label": "Below grade level"}, {"value": "well_below", "label": "Well below grade level"}]
ACUITY = [{"value": "normal", "label": "Checked, normal"}, {"value": "corrected", "label": "Corrected (glasses / aid)"},
          {"value": "concern", "label": "Concern, not yet checked or corrected"}, {"value": "unknown", "label": "Not known"}]
YNU = [{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}, {"value": "unsure", "label": "Not sure"}]

# Each question: key, label, type, options, required, dsm5 reference, help text
QUESTIONNAIRE: List[Dict[str, Any]] = [
    {
        "id": "details", "title": "Student details",
        "description": "Used to compare the child with others of the same age and language background.",
        "questions": [
            {"key": "date_of_birth", "label": "Date of birth", "type": "date", "required": True},
            {"key": "gender", "label": "Gender", "type": "select", "required": False,
             "options": [{"value": "female", "label": "Female"}, {"value": "male", "label": "Male"},
                         {"value": "other", "label": "Other / prefer not to say"}]},
            {"key": "home_language", "label": "Main language spoken at home", "type": "select", "required": True,
             "options": [{"value": c, "label": l} for c, l in (("hi", "Hindi"), ("en", "English"), ("bn", "Bengali"),
                         ("te", "Telugu"), ("mr", "Marathi"), ("ta", "Tamil"), ("gu", "Gujarati"), ("kn", "Kannada"),
                         ("ml", "Malayalam"), ("pa", "Punjabi"), ("or", "Odia"), ("other", "Other"))]},
            {"key": "instruction_language", "label": "Language of instruction at school", "type": "select", "required": True,
             "options": [{"value": "en", "label": "English"}, {"value": "hi", "label": "Hindi"},
                         {"value": "regional", "label": "Regional language"}, {"value": "bilingual", "label": "Bilingual"}]},
            {"key": "input_device", "label": "How will the child do the tests?", "type": "select", "required": True,
             "options": [{"value": "finger", "label": "Finger on a touch screen"}, {"value": "stylus", "label": "Stylus / pen"},
                         {"value": "mouse", "label": "Mouse or touchpad"}]},
            {"key": "handedness", "label": "Writing hand", "type": "select", "required": False,
             "options": [{"value": "right", "label": "Right"}, {"value": "left", "label": "Left"}, {"value": "unsure", "label": "Not sure"}]},
            {"key": "years_in_school", "label": "Years of formal schooling completed", "type": "number", "min": 0, "max": 14, "required": False},
            {"key": "attendance", "label": "School attendance", "type": "select", "required": False,
             "options": [{"value": "regular", "label": "Regular"}, {"value": "irregular", "label": "Irregular / frequent absences"}]},
        ],
    },
    {
        "id": "criterion_a", "title": "Learning difficulties observed (DSM-5 Criterion A)",
        "description": "How often have you noticed the following in the last 6 months?",
        "questions": [
            {"key": "a1_word_reading", "label": "Reads words inaccurately or slowly and with effort (guesses words, struggles to sound them out)",
             "type": "frequency", "options": FREQ, "required": True, "domain": "reading", "dsm5": "A1"},
            {"key": "a2_reading_comprehension", "label": "Has difficulty understanding the meaning of what is read",
             "type": "frequency", "options": FREQ, "required": True, "domain": "reading", "dsm5": "A2"},
            {"key": "a3_spelling", "label": "Has difficulty with spelling (adds, leaves out or swaps letters)",
             "type": "frequency", "options": FREQ, "required": True, "domain": "writing", "dsm5": "A3"},
            {"key": "a4_written_expression", "label": "Written work has many grammar or punctuation errors, or ideas are unclear or poorly organised",
             "type": "frequency", "options": FREQ, "required": True, "domain": "writing", "dsm5": "A4"},
            {"key": "a5_number_sense", "label": "Has difficulty with number sense, number facts or calculation",
             "type": "frequency", "options": FREQ, "required": True, "domain": "math", "dsm5": "A5"},
            {"key": "a6_math_reasoning", "label": "Has difficulty with mathematical reasoning (applying concepts to solve problems)",
             "type": "frequency", "options": FREQ, "required": True, "domain": "math", "dsm5": "A6"},
            {"key": "a_duration_6m", "label": "Have these difficulties lasted at least 6 months?", "type": "select", "options": YNU, "required": True, "dsm5": "A"},
            {"key": "a_intervention", "label": "Has the child received targeted extra help for these difficulties?", "type": "select", "required": True, "dsm5": "A",
             "options": [{"value": "none", "label": "No targeted help yet"}, {"value": "some", "label": "Some help, less than 6 months"},
                         {"value": "sustained", "label": "Sustained help for 6 months or more"}]},
            {"key": "a_intervention_response", "label": "If help was given, did the difficulties persist?", "type": "select", "required": False, "dsm5": "A",
             "options": [{"value": "persisted", "label": "Yes, difficulties persisted"}, {"value": "improved", "label": "No, the child caught up"},
                         {"value": "na", "label": "No help given yet"}]},
        ],
    },
    {
        "id": "criterion_b", "title": "Current attainment (DSM-5 Criterion B)",
        "description": "Compared with what is expected for the child's age and grade.",
        "questions": [
            {"key": "b_reading_level", "label": "Reading", "type": "select", "options": LEVEL, "required": True, "domain": "reading", "dsm5": "B"},
            {"key": "b_writing_level", "label": "Writing (spelling and composition)", "type": "select", "options": LEVEL, "required": True, "domain": "writing", "dsm5": "B"},
            {"key": "b_math_level", "label": "Mathematics", "type": "select", "options": LEVEL, "required": True, "domain": "math", "dsm5": "B"},
            {"key": "b_interference", "label": "Do these difficulties interfere with school work or daily activities?", "type": "select", "options": YNU, "required": True, "dsm5": "B"},
        ],
    },
    {
        "id": "criterion_c", "title": "Onset (DSM-5 Criterion C)",
        "questions": [
            {"key": "c_onset_school_age", "label": "Did the difficulties begin during the school years?", "type": "select", "options": YNU, "required": True, "dsm5": "C"},
        ],
    },
    {
        "id": "criterion_d", "title": "Other explanations to rule out (DSM-5 Criterion D)",
        "description": "Difficulties explained by these factors are not a specific learning disorder; they need their own support first.",
        "questions": [
            {"key": "d_vision", "label": "Vision", "type": "select", "options": ACUITY, "required": True, "dsm5": "D"},
            {"key": "d_hearing", "label": "Hearing", "type": "select", "options": ACUITY, "required": True, "dsm5": "D"},
            {"key": "d_language_proficiency", "label": "Proficiency in the language of instruction", "type": "select", "required": True, "dsm5": "D",
             "options": [{"value": "fluent", "label": "Fluent"}, {"value": "developing", "label": "Developing"}, {"value": "limited", "label": "Limited"}]},
            {"key": "d_inadequate_instruction", "label": "Has schooling been interrupted or very limited (e.g. long gaps, frequent school changes)?", "type": "select", "options": YNU, "required": True, "dsm5": "D"},
            {"key": "d_intellectual_concern", "label": "Is there a known or suspected intellectual disability or global developmental delay?", "type": "select", "options": YNU, "required": True, "dsm5": "D"},
            {"key": "d_neurological", "label": "Known neurological or medical condition affecting learning (e.g. epilepsy, cerebral palsy)?", "type": "select", "options": YNU, "required": True, "dsm5": "D"},
            {"key": "d_psychosocial", "label": "Significant psychosocial adversity (e.g. major family stress, displacement)?", "type": "select", "options": YNU, "required": True, "dsm5": "D"},
            {"key": "d_attention", "label": "Marked attention or hyperactivity difficulties in most settings?", "type": "select", "options": YNU, "required": False, "dsm5": "D",
             "help": "ADHD often co-occurs with SLD; it does not exclude it, but should be assessed too."},
        ],
    },
    {
        "id": "history", "title": "Background (optional)",
        "questions": [
            {"key": "h_speech_delay", "label": "Late talking or speech/language delay in early childhood", "type": "select", "options": YNU, "required": False},
            {"key": "h_family_history", "label": "Family members with reading, writing or maths difficulties", "type": "select", "options": YNU, "required": False},
            {"key": "h_prior_assessment", "label": "Any previous assessment or diagnosis (describe)", "type": "text", "required": False},
            {"key": "notes", "label": "Other observations", "type": "text", "required": False},
        ],
    },
]

QUESTIONS = {q["key"]: q for s in QUESTIONNAIRE for q in s["questions"]}
SYMPTOMS = {"reading": ["a1_word_reading", "a2_reading_comprehension"],
            "writing": ["a3_spelling", "a4_written_expression"],
            "math": ["a5_number_sense", "a6_math_reasoning"]}
LEVEL_SCORE = {"above": 0, "at": 0, "below": 1, "well_below": 2}
DOMAIN_TO_DISORDER = {"reading": "Dyslexia", "writing": "Dysgraphia", "math": "Dyscalculia"}
DISORDER_TO_DOMAIN = {v: k for k, v in DOMAIN_TO_DISORDER.items()}

# questionnaire features used by the screening model (per domain)
QUESTIONNAIRE_FEATURES = [f"q_{d}_{k}" for d in ("reading", "writing", "math") for k in ("symptoms", "level")]


def schema() -> Dict[str, Any]:
    return {"schema_version": SCHEMA_VERSION, "sections": QUESTIONNAIRE,
            "disclaimer": "Screening questionnaire based on DSM-5 criteria for specific learning disorder. "
                          "It supports, but cannot replace, assessment by a qualified professional."}


def validate(answers: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """Returns (clean answers, list of problems). Unknown keys are dropped."""
    clean, problems = {}, []
    for key, q in QUESTIONS.items():
        v = answers.get(key)
        if v in (None, ""):
            continue
        t = q["type"]
        if t in ("select", "frequency"):
            allowed = {o["value"] for o in q["options"]}
            if t == "frequency":
                try:
                    v = int(v)
                except (TypeError, ValueError):
                    problems.append(f"{key}: must be 0-3"); continue
            if v not in allowed:
                problems.append(f"{key}: invalid value"); continue
        elif t == "number":
            try:
                v = float(v)
            except (TypeError, ValueError):
                problems.append(f"{key}: must be a number"); continue
            if not (q.get("min", -1e9) <= v <= q.get("max", 1e9)):
                problems.append(f"{key}: out of range"); continue
        elif t == "date":
            try:
                d = datetime.strptime(str(v)[:10], "%Y-%m-%d").date()
            except ValueError:
                problems.append(f"{key}: use YYYY-MM-DD"); continue
            if not (date(1990, 1, 1) <= d <= date.today()):
                problems.append(f"{key}: implausible date"); continue
            v = d.isoformat()
        elif t == "text":
            v = str(v)[:2000]
        clean[key] = v
    return clean, problems


def completeness(answers: Dict[str, Any]) -> Dict[str, Any]:
    required = [k for k, q in QUESTIONS.items() if q.get("required")]
    missing = [k for k in required if answers.get(k) in (None, "")]
    return {"required": len(required), "answered": len(required) - len(missing), "missing": missing,
            "complete": not missing}


def age_years(answers: Dict[str, Any], on: Optional[date] = None) -> Optional[float]:
    dob = answers.get("date_of_birth")
    if not dob:
        return None
    d = datetime.strptime(dob, "%Y-%m-%d").date()
    on = on or date.today()
    return round((on - d).days / 365.25, 2)


def covariates(answers: Dict[str, Any]) -> Dict[str, Any]:
    """Age, home language and input device in the form the screening engine expects."""
    lang = answers.get("home_language")
    return {"student_age": age_years(answers),
            "home_language": None if lang in (None, "other") else lang,
            "input_device": answers.get("input_device")}


def questionnaire_features(answers: Dict[str, Any]) -> np.ndarray:
    """Per-domain teacher-reported symptom score (0-1) and attainment gap (0-1); NaN if unanswered."""
    out = []
    for domain, keys in SYMPTOMS.items():
        vals = [answers.get(k) for k in keys if answers.get(k) is not None]
        out.append(np.mean(vals) / 3.0 if vals else np.nan)
        lvl = answers.get(f"b_{domain}_level")
        out.append(LEVEL_SCORE[lvl] / 2.0 if lvl in LEVEL_SCORE else np.nan)
    return np.array(out, dtype=float)


ALL_DOMAINS = ["reading", "writing", "math"]


def exclusion_flags(answers: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Criterion D factors with the learning domains each one could better account for.

    DSM-5 asks whether difficulties are *better accounted for* by another factor, so a
    factor only affects the domains it plausibly explains (e.g. limited proficiency in the
    language of instruction explains reading and writing difficulties, not number sense)."""
    flags = []
    def add(key, domains, message):
        flags.append({"key": key, "domains": domains, "message": message})
    if answers.get("d_vision") == "concern":
        add("vision", ["reading", "writing"], "Vision concern: arrange an eye test before interpreting reading or writing results.")
    if answers.get("d_hearing") == "concern":
        add("hearing", ["reading", "writing"], "Hearing concern: arrange a hearing check before interpreting reading, spelling or phonological results.")
    if answers.get("d_language_proficiency") in ("limited", "developing"):
        add("language", ["reading", "writing"], "The child is still developing proficiency in the language of instruction: "
            "reading and writing difficulties may reflect language learning rather than a learning disorder.")
    if answers.get("d_inadequate_instruction") == "yes":
        add("instruction", ALL_DOMAINS, "Interrupted or limited schooling: provide structured teaching first and re-screen.")
    if answers.get("d_intellectual_concern") == "yes":
        add("intellectual", ALL_DOMAINS, "Suspected intellectual disability or global delay: refer for a full developmental assessment.")
    if answers.get("d_neurological") == "yes":
        add("neurological", ALL_DOMAINS, "Known neurological or medical condition: interpret results with the child's clinician.")
    if answers.get("d_psychosocial") == "yes":
        add("psychosocial", ALL_DOMAINS, "Psychosocial adversity: consider its impact and provide support alongside screening.")
    if answers.get("attendance") == "irregular":
        add("attendance", ALL_DOMAINS, "Irregular attendance can explain gaps in attainment.")
    return flags


def criteria_summary(answers: Dict[str, Any], screen_by_disorder: Optional[Dict[str, Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Per-domain DSM-5 A-D picture combining the questionnaire with test screening results.

    screen_by_disorder: {"Dyslexia": {"flagged": bool, "risk_level": ...}, ...} from the screening engine.
    """
    screen_by_disorder = screen_by_disorder or {}
    flags = exclusion_flags(answers)
    duration = answers.get("a_duration_6m")
    intervention = answers.get("a_intervention")
    response = answers.get("a_intervention_response")
    onset = answers.get("c_onset_school_age")
    interference = answers.get("b_interference")
    domains = {}
    for domain, keys in SYMPTOMS.items():
        disorder = DOMAIN_TO_DISORDER[domain]
        symptoms = [k for k in keys if (answers.get(k) or 0) >= 2]
        level = answers.get(f"b_{domain}_level")
        screen = screen_by_disorder.get(disorder) or {}
        a_met = bool(symptoms) and duration == "yes" and not (intervention == "sustained" and response == "improved")
        b_teacher = level in ("below", "well_below") and interference == "yes"
        b_test = bool(screen.get("flagged"))
        c_met = onset == "yes"
        domain_flags = [f for f in flags if domain in f["domains"]]
        d_clear = not domain_flags
        if a_met and (b_teacher or b_test) and c_met and d_clear:
            status, text = "consistent", ("Teacher report and screening are consistent with DSM-5 criteria for a specific "
                                          "learning disorder in this area. Refer for a formal assessment.")
        elif (symptoms or b_test or b_teacher) and domain_flags:
            status, text = "exclusion_review", ("Difficulties are present, but other factors (see flags) could explain them. "
                                                "Address these first, then re-screen.")
        elif symptoms or b_test or b_teacher:
            missing = []
            if not a_met:
                missing.append("persistence for 6 months despite targeted help" if symptoms else "teacher-observed symptoms")
            if not (b_teacher or b_test):
                missing.append("attainment below age expectations")
            if not c_met:
                missing.append("onset in the school years")
            status, text = "partial", "Some indicators present; not yet established: " + ", ".join(missing) + ". Monitor and provide support."
        else:
            status, text = "not_indicated", "No indicators of a learning disorder in this area."
        domains[disorder] = {
            "status": status, "summary": text,
            "criterion_a": {"met": a_met, "symptoms": [QUESTIONS[k]["dsm5"] for k in symptoms], "duration_6m": duration,
                            "intervention": intervention, "response": response},
            "criterion_b": {"teacher_reported_below": b_teacher, "screen_flagged": b_test, "teacher_level": level},
            "criterion_c": {"met": c_met, "answer": onset},
            "criterion_d": {"clear": d_clear, "factors": [f["key"] for f in domain_flags]},
        }
    return {"schema_version": SCHEMA_VERSION, "domains": domains, "exclusion_flags": flags,
            "criterion_d_clear": not flags, "completeness": completeness(answers),
            "disclaimer": "Screening summary only. A diagnosis of specific learning disorder requires a "
                          "comprehensive assessment by a qualified professional."}
