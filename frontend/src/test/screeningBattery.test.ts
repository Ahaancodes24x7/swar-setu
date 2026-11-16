import { describe, expect, it } from "vitest";
import type { AssessmentPayload } from "@/api/ai";
import { BATTERY, buildUnifiedRequest, protocolFor } from "@/lib/screeningBattery";

const payload = (disorder_type: AssessmentPayload["disorder_type"], games: Record<string, unknown>,
  extra: Partial<AssessmentPayload> = {}): AssessmentPayload => ({ disorder_type, games, ...extra });

describe("DSM-5 screening battery", () => {
  it("runs all three DSM-5 tests in a fixed order", () => {
    expect(BATTERY).toEqual(["dyslexia", "dyscalculia", "dysgraphia"]);
  });

  it("refuses to build a comprehensive request from a partial battery", () => {
    expect(() => buildUnifiedRequest({ dyslexia: payload("dyslexia", { reading_fluency: {} }) }, "s1"))
      .toThrow(/missing dyscalculia, dysgraphia/);
  });

  it("merges the three tests' games and covariates for the comprehensive model", () => {
    const body = buildUnifiedRequest({
      dyslexia: payload("dyslexia", { oral_reading: { wpm: 60 }, reading_fluency: { accuracy: 0.8 } }, { grade: 3 }),
      dyscalculia: payload("dyscalculia", { arithmetic: { accuracy: 0.7 } }, { grade: 3 }),
      dysgraphia: payload("dysgraphia", { handwriting: { stroke_count: 12 } }, { grade: 3, input_device: "finger" }),
    }, "s1");
    expect(body.student_id).toBe("s1");
    expect(Object.keys(body.completed_assessments as object)).toEqual(BATTERY);
    expect(body.grade).toBe(3);
    expect(body.input_device).toBe("finger");
  });

  it("records teacher permission only for single-test sessions", () => {
    expect(protocolFor("full", "b", 2)).toEqual({ mode: "full", battery_id: "b", step: 2, total_steps: 3 });
    expect(protocolFor("single", "b", 1, "teacher-1", "Follow-up")).toMatchObject(
      { mode: "single", total_steps: 1, permitted_by: "teacher-1", permission_reason: "Follow-up" });
  });
});
