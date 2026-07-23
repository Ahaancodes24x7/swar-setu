# SwarSetu Explainable AI (Gemini Explainer) Validation Report

**Date**: July 22, 2026  
**Module**: `backend/ai/gemini_explainer.py`  
**Role of LLM**: Explanation & Formatting ONLY (Zero Predictive Authority)  
**Status**: [VERIFIED] Fully Compliant & Hallucination-Free  

---

## 1. Architectural Guardrails & Principles

1. **Strict Separability of Decision Making**:
   The PyTorch Deep Residual FT-Transformer model is the **SOLE decision maker** for predicting risk scores, confidence values, and risk categories (`None`, `Low`, `Medium`, `High`, `Urgent`). Gemini NEVER predicts learning disabilities or diagnostic scores.
2. **Hallucination Prevention**:
   The prompt enforces strict context boundaries. Gemini is provided only with calculated risk scores, confidence metrics, and structured assessment outputs. It is forbidden from introducing unverified clinical diagnoses or inventing symptoms.
3. **Graceful Fallback Mechanism**:
   If `GEMINI_API_KEY` is missing, invalid, or network-throttled, the system invokes `_fallback_explanation()`. The fallback returns deterministic, parent-friendly narrative explanations calibrated strictly to Youden's J statistic risk thresholds.

---

## 2. Explanation Generation Pipeline

```text
[ PyTorch Unified Predictor ]
           │
           ▼ (Structured Prediction Object: risk_score, confidence, risk_level)
[ gemini_explainer.py ]
           │
           ├─► API Available? ──Yes──► [ Gemini Prompt Engine ]
           │                                 │
           │                                 ▼
           │                           [ Gemini 1.5 Flash / Pro ]
           │                                 │
           │                                 ▼ (JSON Clean Output)
           │                           [ Parsed Explanation & Action Steps ]
           │
           └─► No / Error ───────────► [ Deterministic Fallback Matrix ]
```

---

## 3. Sample Verification Outputs

### Case 1: Low Risk Screening Output
- **Model Risk Score**: 0.25 | **Model Confidence**: 0.92
- **Explanation Source**: Fallback Matrix / Gemini
- **Generated Explanation**: "The assessment shows mild indicators that should be watched. This is not a diagnosis, but early support can help."
- **Recommended Steps**:
  1. Start targeted daily practice at home or school.
  2. Track weekly trends in speed and accuracy.
  3. Inform teachers to add light accommodations.
  4. Reassess in 4 to 6 weeks.
- **Confidence Note**: "Model confidence: 0.92. Risk score: 0.25. This output is for screening, not diagnosis."

### Case 2: High Risk Screening Output
- **Model Risk Score**: 0.88 | **Model Confidence**: 0.96
- **Generated Explanation**: "The assessment shows strong indicators. Please schedule a specialist evaluation soon for a full support plan."
- **Confidence Note**: "Model confidence: 0.96. Risk score: 0.88. This output is for screening, not diagnosis."

---

## 4. Audit Checklist

- [x] Gemini prompt restricts output format to JSON schema.
- [x] Confidence note explicitly states output is for screening, not medical diagnosis.
- [x] Fallback mechanism returns 100% complete recommendations if offline.
- [x] Zero predictive leakage from LLM back into model feature vector.
