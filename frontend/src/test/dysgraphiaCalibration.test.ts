// Regression test for the dysgraphia analysis on synthetic handwriting
// (fixtures: src/test/fixtures/make_handwriting_fixtures.py).
import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/handwriting_fixtures.json";
import { analyzeDysgraphia, shapeAccuracy, type DrawingInput, type InputDevice } from "@/lib/dysgraphiaAnalysis";

type Fixture = { profile: string; device: InputDevice; drawings: DrawingInput[] };
const all = fixtures as unknown as Fixture[];
const run = (f: Fixture) => analyzeDysgraphia(f.drawings, { studentName: "Child", gradeNum: 3, device: f.device });

describe("dysgraphia analysis", () => {
  it("scores neat handwriting highly on pen, touch and mouse (device-invariant)", () => {
    for (const f of all.filter((x) => x.profile.startsWith("typical"))) {
      const r = run(f);
      expect(r.riskLevel, f.profile).toBe("low");
      expect(r.overallScore, f.profile).toBeGreaterThanOrEqual(90);
    }
  });

  it("flags tremor, stop-start writing and uneven layout", () => {
    for (const f of all.filter((x) => ["tremor", "dysfluent", "spatial"].includes(x.profile))) {
      expect(run(f).riskLevel, f.profile).not.toBe("low");
    }
  });

  it("puts the right domain lowest for each deficit", () => {
    const avg = (p: string, k: "motorControl" | "writingFluency" | "spatialAwareness") => {
      const v = all.filter((x) => x.profile === p).map((f) => run(f).domainScores[k] as number);
      return v.reduce((a, b) => a + b, 0) / v.length;
    };
    expect(avg("tremor", "motorControl")).toBeLessThan(avg("typical", "motorControl") - 40);
    expect(avg("dysfluent", "writingFluency")).toBeLessThan(avg("typical", "writingFluency") - 30);
    expect(avg("spatial", "spatialAwareness")).toBeLessThan(avg("typical", "spatialAwareness") - 50);
  });

  it("uses legibility from the handwriting model when provided", () => {
    const f = all.find((x) => x.profile === "typical")!;
    const bad = analyzeDysgraphia(f.drawings, { studentName: "C", gradeNum: 3, device: "pen",
      legibility: f.drawings.map(() => ({ assessed: true, score: 0.2, recognised: "xx" })) });
    expect(bad.domainScores.legibility).toBe(20);
    expect(bad.riskLevel).toBe("high");
  });

  it("recognises well-drawn simple shapes", () => {
    const circle = Array.from({ length: 80 }, (_, i) => ({ x: 100 + 50 * Math.cos((i / 79) * 2 * Math.PI), y: 100 + 50 * Math.sin((i / 79) * 2 * Math.PI), time: i * 16 }));
    const square = [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]].flatMap(([x, y], k, arr) => k === 0 ? [] :
      Array.from({ length: 20 }, (_, i) => ({ x: arr[k - 1][0] + (x - arr[k - 1][0]) * i / 20, y: arr[k - 1][1] + (y - arr[k - 1][1]) * i / 20, time: (k * 20 + i) * 16 })));
    expect(shapeAccuracy([{ points: circle, width: 3 }], "○")!).toBeGreaterThan(0.85);
    expect(shapeAccuracy([{ points: square, width: 3 }], "□")!).toBeGreaterThan(0.85);
    expect(shapeAccuracy([{ points: circle, width: 3 }], "□")!).toBeLessThan(0.7);
  });
});
