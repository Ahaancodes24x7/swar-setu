/**
 * DSM-5 screening protocol.
 *
 * By default every screening session runs all three DSM-5 tests (reading, mathematics,
 * written expression) so the comprehensive model sees the whole 64-feature profile and
 * comorbidity is not missed. A single test is only run when the teacher explicitly permits
 * it and records why; that permission is stored with the session.
 */
import type { AssessmentPayload } from "@/api/ai";

export type DisorderTest = "dyslexia" | "dyscalculia" | "dysgraphia";

/** Order in which the full battery is given. */
export const BATTERY: DisorderTest[] = ["dyslexia", "dyscalculia", "dysgraphia"];

export const TEST_LABELS: Record<DisorderTest, string> = {
  dyslexia: "Reading test (dyslexia)",
  dyscalculia: "Math test (dyscalculia)",
  dysgraphia: "Writing test (dysgraphia)",
};

export const SINGLE_TEST_REASONS = [
  "Follow-up re-screen of one domain after a full screening",
  "Child could not complete the full session (fatigue, time, attendance)",
  "Requested by a specialist or school psychologist",
  "Other (see note)",
] as const;

export type ScreeningMode = "full" | "single";

export interface ScreeningProtocol {
  mode: ScreeningMode;
  battery_id: string;
  /** 1-based position of this test in the session */
  step: number;
  total_steps: number;
  /** single-test sessions only: who permitted it and why */
  permitted_by?: string;
  permission_reason?: string;
}

export function newBatteryId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `battery-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function protocolFor(
  mode: ScreeningMode, batteryId: string, step: number, permittedBy?: string, reason?: string,
): ScreeningProtocol {
  const p: ScreeningProtocol = { mode, battery_id: batteryId, step, total_steps: mode === "full" ? BATTERY.length : 1 };
  if (mode === "single") {
    p.permitted_by = permittedBy;
    p.permission_reason = reason;
  }
  return p;
}

const COVARIATE_KEYS = ["student_age", "grade", "home_language", "input_device"] as const;

/**
 * Request body for POST /api/unified-profile once all three tests are done.
 * Throws if any test of the battery is missing, so a partial battery can never be
 * scored as a comprehensive screen.
 */
export function buildUnifiedRequest(
  payloads: Partial<Record<DisorderTest, AssessmentPayload>>, studentId: string,
): Record<string, unknown> {
  const missing = BATTERY.filter((t) => !payloads[t]);
  if (missing.length) throw new Error(`Full screening incomplete: missing ${missing.join(", ")}`);
  const body: Record<string, unknown> = {
    student_id: studentId,
    completed_assessments: Object.fromEntries(BATTERY.map((t) => [t, { games: payloads[t]!.games }])),
  };
  // covariates: first test that reports each one (device comes from the writing test)
  for (const key of COVARIATE_KEYS) {
    for (const t of [...BATTERY].reverse()) {
      const v = payloads[t]?.[key];
      if (v !== undefined && v !== null && v !== "") { body[key] = v; break; }
    }
  }
  const bank = BATTERY.map((t) => payloads[t]?.item_bank).find(Boolean);
  if (bank) body.item_bank = bank;
  return body;
}
