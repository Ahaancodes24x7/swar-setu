import { expect, it } from "vitest";
import fixtures from "./fixtures/handwriting_fixtures.json";
import { computeStrokeFeatures } from "@/lib/strokeFeatures";
import type { DrawingInput } from "@/lib/dysgraphiaAnalysis";

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
function profileMeans(profile: string) {
  const f = (fixtures as unknown as { profile: string; drawings: DrawingInput[] }[]).filter((x) => x.profile === profile);
  const feats = f.flatMap((x) => computeStrokeFeatures(x.drawings));
  return { smooth: mean(feats.map((s) => s.smoothness)), tremor: mean(feats.map((s) => s.tremor)) };
}

it("backend stroke features are similar for neat writing on pen, touch and mouse", () => {
  const pen = profileMeans("typical"), touch = profileMeans("typical_touch"), mouse = profileMeans("typical_mouse");
  expect(profileMeans("tremor").smooth).toBeLessThan(pen.smooth - 0.2);
  for (const d of [touch, mouse]) {
    expect(Math.abs(d.smooth - pen.smooth)).toBeLessThan(0.08);
    expect(Math.abs(d.tremor - pen.tremor)).toBeLessThan(0.05);
  }
});
