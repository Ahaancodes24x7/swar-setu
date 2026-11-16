// Prints the per-profile table used in the paper (full scorer incl. model legibility).
import { it } from "vitest";
import fixtures from "./fixtures/handwriting_fixtures.json";
import legibility from "./fixtures/handwriting_legibility.json";
import { analyzeDysgraphia, type DrawingInput, type InputDevice } from "@/lib/dysgraphiaAnalysis";

it("paper table", () => {
  const rows: Record<string, string[]> = {};
  (fixtures as unknown as { profile: string; device: InputDevice; drawings: DrawingInput[] }[]).forEach((f, i) => {
    const r = analyzeDysgraphia(f.drawings, { studentName: "C", gradeNum: 3, device: f.device, legibility: (legibility as any)[i] });
    const d = r.domainScores;
    (rows[f.profile] ||= []).push(`${r.overallScore}/${r.riskLevel[0]} L${d.legibility} M${d.motorControl} F${d.writingFluency} S${d.spatialAwareness}`);
  });
  for (const [p, v] of Object.entries(rows)) console.log("ROW", p.padEnd(14), v.join(" | "));
});
