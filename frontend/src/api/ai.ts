import type { Dsm5Summary } from "@/api/students";

const API_BASE_URL = import.meta.env.VITE_AI_API_BASE_URL || window.location.origin;

export interface AssessmentPayload {
  disorder_type: 'dyslexia' | 'dyscalculia' | 'dysgraphia' | 'comprehensive';
  student_id?: string;
  user_id?: string;
  session_id?: string;
  assessment_id?: string;
  score?: number;
  percentage?: number;
  games: Record<string, any>;
  // Optional covariates: the screening model adjusts for age, home language and input device.
  // When omitted they are imputed and listed in prediction.covariates.imputed.
  student_age?: number;
  grade?: string | number;
  home_language?: "hi" | "en" | string;
  input_device?: "finger" | "stylus" | "mouse" | string;
  /** which question bank produced the responses (items changed difficulty between versions) */
  item_bank?: string;
  timing_data?: {
    start_time: string;
    end_time: string;
    total_duration_seconds: number;
  };
}

export interface ConformalInterval {
  lower_bound: number;
  upper_bound: number;
  point_estimate?: number;
  confidence_level?: number;
}

export interface DisorderPrediction {
  disorder_type?: string;
  risk_score: number;
  uncertainty: number;
  threshold_used: number;
  flagged?: boolean;
  risk_level: string;
  confidence?: number;
  recommendations?: string[];
  recommendation?: string;
  top_3_shap_features?: string[];
  shap_attributions?: Record<string, number>;
}

export type ScreeningDecision = "screen_positive" | "screen_negative" | "uncertain" | "atypical_input";

export interface AIPredictionResult {
  success: boolean;
  assessment_id?: string | null;
  prediction: {
    disorder_type: string;
    headline_disorder?: string;
    prediction_type?: string;
    model_id?: string;
    risk_level: string;
    risk_score: number;
    base_rate?: number | null;
    relative_risk?: number | null;
    flagged?: boolean;
    monitor_threshold?: number;
    screening_decision?: ScreeningDecision;
    conformal_set?: number[];
    protective_features?: Record<string, number>;
    covariates?: Record<string, any>;
    // DSM-5 criteria A-D picture; present when the student has a stored profile/questionnaire
    dsm5?: Dsm5Summary | null;
    // legacy FT-Transformer engine only
    uncertainty?: number;
    confidence?: number;
    threshold_used?: number;
    temperature_used?: number;
    mc_samples_used?: number;
    recommendations?: string[];
    top_3_shap_features?: string[];
    shap_attributions?: Record<string, number>;
    conformal_intervals?: Record<string, ConformalInterval>;
    fairness_status?: string;
    clinical_note?: string;
    full_profile?: Record<string, any>;
  };
  explanation: {
    source?: string;
    explanation?: string;
    recommended_steps?: string[];
    confidence_note?: string;
    meta?: Record<string, any>;
  };
  session_data?: Record<string, any>;
  persistence?: Record<string, any>;
  feature_vector?: number[];
  error?: string;
}

export async function getAIPrediction(payload: AssessmentPayload, jwtToken?: string): Promise<AIPredictionResult | null> {
  try {
    const isUnified = payload.disorder_type === 'comprehensive';
    const endpoint = isUnified
      ? `${API_BASE_URL}/api/assess`
      : `${API_BASE_URL}/api/assess`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (jwtToken) {
      headers["Authorization"] = `Bearer ${jwtToken}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data: AIPredictionResult = await res.json();
    return data;
  } catch (err) {
    console.error("AI API error:", err);
    return null;
  }
}
/** Comprehensive DSM-5 screen from all three tests (POST /api/unified-profile, full 64-feature model).
 *  `body` comes from buildUnifiedRequest(). Returns the result in the same shape as getAIPrediction. */
export async function getUnifiedProfile(body: Record<string, unknown>): Promise<AIPredictionResult | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/unified-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
    return {
      success: true,
      assessment_id: data.assessment_id,
      prediction: data.unified_report,
      explanation: data.explanation || {},
      persistence: data.persistence,
    };
  } catch (err) {
    console.error("Unified profile API error:", err);
    return null;
  }
}

export interface LegibilityItem {
  image: string;      // canvas PNG data URL
  reference: string;  // the letter/word the child was asked to write
  type: string;       // "letter" | "word" | "shape" | "figure"
}

/** Reads each handwriting sample with the backend's self-hosted handwriting model.
 *  Returns one entry per item; entries are undefined if the model could not be reached. */
export async function assessLegibility(items: LegibilityItem[]): Promise<({ assessed: boolean; recognised?: string; score?: number; reason?: string } | undefined)[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/handwriting/legibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);
    return data.results;
  } catch (err) {
    console.warn("Legibility check unavailable:", err);
    return items.map(() => undefined);
  }
}
