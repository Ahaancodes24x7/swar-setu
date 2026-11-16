// Student profiles and the DSM-5 teacher/operator questionnaire (backend: routes/students.py).

const API_BASE_URL = import.meta.env.VITE_AI_API_BASE_URL || window.location.origin;

export type QuestionType = "date" | "select" | "frequency" | "number" | "text";

export interface QuestionOption {
  value: string | number;
  label: string;
}

export interface Question {
  key: string;
  label: string;
  type: QuestionType;
  required?: boolean;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  help?: string;
  dsm5?: string;
  domain?: "reading" | "writing" | "math";
}

export interface QuestionnaireSection {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface QuestionnaireSchema {
  schema_version: number;
  sections: QuestionnaireSection[];
  disclaimer: string;
}

export type ProfileAnswers = Record<string, string | number>;

export interface ExclusionFlag {
  key: string;
  domains: string[];
  message: string;
}

export interface StudentProfileResponse {
  success: boolean;
  student_id: string;
  profile: { answers: ProfileAnswers; updated_at: string; filled_by?: string | null } | null;
  completeness: { required: number; answered: number; missing: string[]; complete: boolean };
  age_years: number | null;
  exclusion_flags: ExclusionFlag[];
  error?: string;
  problems?: string[];
}

export interface Dsm5DomainSummary {
  status: "consistent" | "exclusion_review" | "partial" | "not_indicated";
  summary: string;
  criterion_a: { met: boolean; symptoms: string[]; duration_6m?: string; intervention?: string; response?: string };
  criterion_b: { teacher_reported_below: boolean; screen_flagged: boolean; teacher_level?: string };
  criterion_c: { met: boolean; answer?: string };
  criterion_d: { clear: boolean; factors: string[] };
}

export interface Dsm5Summary {
  schema_version?: number;
  /** keyed by disorder: "Dyslexia" | "Dyscalculia" | "Dysgraphia" */
  domains: Record<string, Dsm5DomainSummary>;
  exclusion_flags: ExclusionFlag[];
  criterion_d_clear?: boolean;
  completeness: StudentProfileResponse["completeness"];
  disclaimer: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 404) {
    const detail = Array.isArray(data?.problems) ? `: ${data.problems.join("; ")}` : "";
    throw new Error((data?.error || `Request failed (${res.status})`) + detail);
  }
  return data as T;
}

export const getQuestionnaire = () => call<QuestionnaireSchema & { success: boolean }>("/api/dsm5/questionnaire");

export const getStudentProfile = (studentId: string) =>
  call<StudentProfileResponse>(`/api/students/${encodeURIComponent(studentId)}/profile`);

export const saveStudentProfile = (studentId: string, answers: ProfileAnswers, filledBy?: string) =>
  call<StudentProfileResponse>(`/api/students/${encodeURIComponent(studentId)}/profile`, {
    method: "PUT",
    body: JSON.stringify({ answers, filled_by: filledBy }),
  });

export const getDsm5Summary = (studentId: string) =>
  call<{ success: boolean; summary?: Dsm5Summary; error?: string }>(
    `/api/students/${encodeURIComponent(studentId)}/dsm5-summary`,
  );
