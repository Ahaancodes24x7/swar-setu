// Dysgraphia screening analysis.
//
// Each drawing is analysed on its own and the results are combined. Strokes are resampled
// relative to the writer's letter height, so scores do not depend on the device's pointer
// sampling rate or screen size (the previous version mostly measured the device).
//
// Domains (0-100, higher = better):
//   legibility   - does the writing match the prompt? (self-hosted handwriting model for
//                  letters/words, geometry checks for simple shapes)
//   motorControl - jitter: how much the pen path exceeds its smoothed version (tremor)
//   fluency      - mid-stroke halts, long pauses, writing speed (device-aware)
//   spatial      - baseline slope and scatter of letter bottoms/tops (word prompts)
//
// Thresholds are provisional: they were set so that neat synthetic handwriting on pen, touch
// and mouse scores well and simulated tremor, stop-start writing, uneven sizing and malformed
// letters score low. They need norms from real children before clinical use.

export interface StrokePoint {
  x: number;
  y: number;
  time: number;
  pressure?: number; // recorded for stylus input only
}

export interface StrokeData {
  points: StrokePoint[];
  width: number;
}

export type InputDevice = "pen" | "touch" | "mouse" | "unknown";
export type DrawingType = "letter" | "word" | "shape" | "figure";

export interface DrawingInput {
  strokes: StrokeData[];
  canvasWidth: number;
  canvasHeight: number;
  totalTime: number;
  type: DrawingType;
  reference?: string;
  prompt?: string;
}

/** Result of the backend handwriting model for one drawing (see /api/handwriting/legibility). */
export interface LegibilityResult {
  assessed: boolean;
  recognised?: string;
  score?: number; // 0-1
  reason?: string;
}

export interface DrawingAnalysis {
  type: DrawingType;
  reference?: string;
  prompt?: string;
  letterHeightPx: number;
  jitterIndex: number;
  speedHps: number;          // letter-heights per second while the pen is down
  haltRate: number;          // mid-stroke halts per 10 letter-heights of path
  halts: number;
  pathLetterHeights: number;
  medianPauseMs: number;
  longPauses: number;        // pen-up pauses > 2 s
  baselineSlope?: number;    // |rise/run| of letter bottoms (word prompts)
  lineScatter?: number;      // scatter of letter bottoms/tops in letter heights (word prompts)
  legibility?: number;       // 0-100 when assessed
  recognised?: string;
  legibilityNote?: string;
}

export interface DysgraphiaMetrics {
  strokeCount: number;
  totalTime: number;
  jitterIndex: number;
  writingSpeed: number;
  haltRate: number;
  medianPauseMs: number;
  longPauseCount: number;
  baselineSlope: number | null;
  lineScatter: number | null;
  device: InputDevice;
}

export interface DysgraphiaAnalysisResult {
  overallScore: number;
  riskLevel: "low" | "moderate" | "high";
  metrics: DysgraphiaMetrics;
  domainScores: {
    legibility: number | null;
    motorControl: number;
    writingFluency: number;
    spatialAwareness: number | null;
  };
  drawings: DrawingAnalysis[];
  flaggedConditions: string[];
  notes: string[];
  summary: string;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// thresholds: value giving 100 ("good") and value giving 0 ("bad")
// ---------------------------------------------------------------------------
export const THRESHOLDS = {
  jitter: { good: 0.088, bad: 0.13 },
  haltRate: { good: 0.4, bad: 3.0 },
  longPauseShare: { good: 0.0, bad: 0.5 },
  pauseMs: {
    pen: { good: 600, bad: 1600 },
    touch: { good: 700, bad: 1800 },
    mouse: { good: 1100, bad: 2600 },
    unknown: { good: 700, bad: 1800 },
  } as Record<InputDevice, { good: number; bad: number }>,
  speed: {
    pen: { good: 4.0, bad: 1.5 },
    touch: { good: 3.5, bad: 1.2 },
    mouse: { good: 2.5, bad: 0.8 },
    unknown: { good: 3.5, bad: 1.2 },
  } as Record<InputDevice, { good: number; bad: number }>,
  baselineSlope: { good: 0.04, bad: 0.25 },
  lineScatter: { good: 0.1, bad: 0.4 },
  shape: { good: 0.85, bad: 0.4 },
};

const WEIGHTS = { legibility: 0.4, motorControl: 0.2, writingFluency: 0.25, spatialAwareness: 0.15 };

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
export function scale(value: number, t: { good: number; bad: number }): number {
  const frac = (value - t.bad) / (t.good - t.bad);
  return Math.round(clamp(frac * 100));
}
const median = (v: number[]) => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

// ---------------------------------------------------------------------------
// geometry helpers
// ---------------------------------------------------------------------------

function strokeBox(s: StrokeData) {
  const xs = s.points.map((p) => p.x), ys = s.points.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Typical letter height of a drawing: median height of the substantial strokes. */
export function letterHeight(strokes: StrokeData[]): number {
  const boxes = strokes.map(strokeBox);
  const extents = boxes.map((b) => Math.max(b.maxY - b.minY, (b.maxX - b.minX) * 0.5));
  const maxE = Math.max(...extents, 1);
  const big = extents.filter((e) => e >= 0.3 * maxE);
  return Math.max(8, median(big));
}

/** Resample a stroke at a fixed arc-length step, interpolating timestamps. */
export function resample(points: StrokePoint[], step: number): StrokePoint[] {
  const pts = points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y || p.time !== points[i - 1].time);
  if (pts.length < 2) return pts;
  const out: StrokePoint[] = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg === 0) continue;
    let d = step - carry;
    while (d <= seg) {
      const f = d / seg;
      out.push({ x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y), time: a.time + f * (b.time - a.time) });
      d += step;
    }
    carry = seg - (d - step);
  }
  const last = pts[pts.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

export function gaussianSmooth(points: StrokePoint[], sigma: number): StrokePoint[] {
  const r = Math.ceil(sigma * 2.5);
  const w = Array.from({ length: 2 * r + 1 }, (_, k) => Math.exp(-((k - r) ** 2) / (2 * sigma * sigma)));
  return points.map((p, i) => {
    let sx = 0, sy = 0, sw = 0;
    for (let k = -r; k <= r; k++) {
      const q = points[Math.min(points.length - 1, Math.max(0, i + k))];
      sx += q.x * w[k + r]; sy += q.y * w[k + r]; sw += w[k + r];
    }
    return { ...p, x: sx / sw, y: sy / sw };
  });
}

function pathLength(points: StrokePoint[]): number {
  let L = 0;
  for (let i = 1; i < points.length; i++) L += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return L;
}

/** Mid-stroke halts: smoothed speed below 15% of the stroke's median for >= 120 ms (ends excluded). */
function countHalts(points: StrokePoint[]): number {
  if (points.length < 4) return 0;
  const t0 = points[0].time, t1 = points[points.length - 1].time;
  if (t1 - t0 < 300) return 0;
  const dt = 20;
  const pos: { x: number; y: number }[] = [];
  let j = 0;
  for (let t = t0; t <= t1; t += dt) {
    while (j < points.length - 2 && points[j + 1].time < t) j++;
    const a = points[j], b = points[j + 1];
    const f = b.time > a.time ? (t - a.time) / (b.time - a.time) : 0;
    pos.push({ x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y) });
  }
  // average position over ~100 ms so sub-pixel pointer jitter during a stop does not look like motion
  const sm = pos.map((_, i) => {
    const w = pos.slice(Math.max(0, i - 2), i + 3);
    return { x: mean(w.map((q) => q.x)), y: mean(w.map((q) => q.y)) };
  });
  const vs = sm.slice(1).map((p, i) => Math.hypot(p.x - sm[i].x, p.y - sm[i].y) / dt);
  const ref = median(vs.filter((x) => x > 0));
  if (ref <= 0) return 0;
  const edge = Math.ceil(80 / dt);
  let halts = 0, run = 0;
  for (let i = edge; i < vs.length - edge; i++) {
    if (vs[i] < 0.15 * ref) run++;
    else { if (run * dt >= 120) halts++; run = 0; }
  }
  return halts;
}

/** Theil-Sen slope of y on x. */
function robustSlope(xs: number[], ys: number[]): number {
  const slopes: number[] = [];
  for (let i = 0; i < xs.length; i++)
    for (let k = i + 1; k < xs.length; k++)
      if (Math.abs(xs[k] - xs[i]) > 1e-6) slopes.push((ys[k] - ys[i]) / (xs[k] - xs[i]));
  return median(slopes);
}

/** Douglas-Peucker vertex count of a closed outline. */
function cornerCount(points: StrokePoint[], eps: number): number {
  const dp = (pts: StrokePoint[]): StrokePoint[] => {
    if (pts.length < 3) return pts;
    const a = pts[0], b = pts[pts.length - 1];
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1e-9;
    let idx = 0, dmax = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((b.y - a.y) * pts[i].x - (b.x - a.x) * pts[i].y + b.x * a.y - b.y * a.x) / L;
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax <= eps) return [a, b];
    return [...dp(pts.slice(0, idx + 1)).slice(0, -1), ...dp(pts.slice(idx))];
  };
  // split the loop at the point farthest from the start so a closed shape is not degenerate
  let far = 0, dfar = 0;
  points.forEach((p, i) => { const d = Math.hypot(p.x - points[0].x, p.y - points[0].y); if (d > dfar) { dfar = d; far = i; } });
  const v = [...dp(points.slice(0, far + 1)).slice(0, -1), ...dp(points.slice(far))];
  const closed = Math.hypot(v[0].x - v[v.length - 1].x, v[0].y - v[v.length - 1].y) < eps * 2;
  return closed ? v.length - 1 : v.length;
}

/** Geometric correctness of simple shapes (circle / triangle / square / rectangle), 0-1. */
export function shapeAccuracy(strokes: StrokeData[], reference: string): number | undefined {
  const pts = strokes.flatMap((s) => s.points);
  if (pts.length < 8) return 0;
  const ref = reference.toLowerCase();
  const kind = /○|circle|गोला/.test(ref) ? "circle" : /△|triangle|त्रिभुज/.test(ref) ? "triangle"
    : /□|square/.test(ref) ? "square" : /▭|rectangle/.test(ref) ? "rectangle" : null;
  if (!kind) return undefined;
  const cx = mean(pts.map((p) => p.x)), cy = mean(pts.map((p) => p.y));
  const radii = pts.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const rMean = mean(radii) || 1;
  const L = strokes.reduce((s, st) => s + pathLength(st.points), 0);
  const gap = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
  const closure = clamp(1 - gap / (0.25 * L + 1e-9), 0, 1);
  if (kind === "circle") {
    const roundness = clamp(1 - Math.sqrt(mean(radii.map((r) => (r - rMean) ** 2))) / rMean / 0.35, 0, 1);
    return 0.5 * roundness + 0.5 * closure;
  }
  const smooth = gaussianSmooth(resample(pts, Math.max(2, rMean * 0.05)), 2);
  const corners = cornerCount(smooth, rMean * 0.15);
  const want = kind === "triangle" ? 3 : 4;
  const cornerScore = clamp(1 - Math.abs(corners - want) / want, 0, 1);
  let aspectScore = 1;
  if (kind === "square") {
    const b = { w: Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)), h: Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y)) };
    aspectScore = clamp(1 - Math.abs(Math.log((b.w + 1) / (b.h + 1))) / 0.7, 0, 1);
  }
  return 0.5 * cornerScore + 0.3 * closure + 0.2 * aspectScore;
}

// ---------------------------------------------------------------------------
// per-drawing analysis
// ---------------------------------------------------------------------------

export function analyzeDrawing(d: DrawingInput, legibility?: LegibilityResult): DrawingAnalysis | null {
  const strokes = d.strokes
    .map((s) => ({ ...s, points: [...s.points].sort((a, b) => a.time - b.time) }))
    .filter((s) => s.points.length > 1);
  if (!strokes.length) return null;

  const H = letterHeight(strokes);
  let rawLen = 0, smoothLen = 0, penDownMs = 0, halts = 0;
  for (const s of strokes) {
    // 1 px resample + light smoothing removes pixel quantisation (device sampling-rate effects);
    // the jitter scale is then set by the stroke's own size, so small letters are not penalised
    const b = strokeBox(s);
    const Hs = Math.max(8, b.maxY - b.minY, (b.maxX - b.minX) * 0.5);
    const fine = gaussianSmooth(resample(s.points, 1), 1.5);
    const rs = resample(fine, Math.max(1, 0.03 * Hs));
    penDownMs += s.points[s.points.length - 1].time - s.points[0].time;
    halts += countHalts(s.points); // timing from the original samples
    if (rs.length < 8) continue;
    const light = gaussianSmooth(rs, 1);
    rawLen += pathLength(light);
    smoothLen += pathLength(gaussianSmooth(rs, 4));
  }
  const jitterIndex = smoothLen > 0 ? Math.max(0, rawLen / smoothLen - 1) : 0;
  const pathH = rawLen / H;
  const pauses = strokes.slice(1).map((s, i) => s.points[0].time - strokes[i].points[strokes[i].points.length - 1].time)
    .filter((p) => p >= 0);

  const out: DrawingAnalysis = {
    type: d.type,
    reference: d.reference,
    prompt: d.prompt,
    letterHeightPx: Math.round(H),
    jitterIndex: Number(jitterIndex.toFixed(4)),
    speedHps: penDownMs > 0 ? Number((pathH / (penDownMs / 1000)).toFixed(3)) : 0,
    haltRate: pathH > 0 ? Number(((halts / pathH) * 10).toFixed(3)) : 0,
    halts,
    pathLetterHeights: Number(pathH.toFixed(2)),
    medianPauseMs: Math.round(median(pauses)),
    longPauses: pauses.filter((p) => p > 2000).length,
  };

  // line alignment for word prompts: bottoms of x-height/ascender strokes, tops of x-height strokes
  if (d.type === "word" && strokes.length >= 3) {
    const boxes = strokes.map(strokeBox).filter((b) => b.maxY - b.minY >= 0.3 * H);
    if (boxes.length >= 3) {
      const bottoms = boxes.map((b) => b.maxY), tops = boxes.map((b) => b.minY);
      const bMed = median(bottoms);
      const onLine = boxes.filter((b) => b.maxY <= bMed + 0.35 * H); // drop descenders
      const xs = onLine.map((b) => (b.minX + b.maxX) / 2), ys = onLine.map((b) => b.maxY);
      const slope = onLine.length >= 3 ? robustSlope(xs, ys) : 0;
      const resid = ys.map((y, i) => y - slope * xs[i]);
      const rMed = median(resid);
      const tMed = median(tops);
      const xTops = boxes.filter((b) => b.minY >= tMed - 0.35 * H).map((b) => b.minY); // drop ascenders
      const tDev = xTops.map((t) => Math.abs(t - median(xTops)));
      out.baselineSlope = Number(Math.abs(slope).toFixed(4));
      out.lineScatter = Number(((median(resid.map((r) => Math.abs(r - rMed))) + median(tDev)) / H).toFixed(4));
    }
  }

  // legibility
  if (legibility?.assessed && typeof legibility.score === "number") {
    out.legibility = Math.round(legibility.score * 100);
    out.recognised = legibility.recognised;
  } else if (d.type === "shape" && d.reference) {
    const acc = shapeAccuracy(strokes, d.reference);
    if (acc !== undefined) out.legibility = scale(acc, THRESHOLDS.shape);
  } else if (legibility && !legibility.assessed) {
    out.legibilityNote = legibility.reason;
  }
  return out;
}

// ---------------------------------------------------------------------------
// combined analysis
// ---------------------------------------------------------------------------

export function analyzeDysgraphia(
  drawings: DrawingInput[],
  opts: { studentName: string; gradeNum: number; device?: InputDevice; legibility?: (LegibilityResult | undefined)[] },
): DysgraphiaAnalysisResult {
  const device = opts.device ?? "unknown";
  const per = drawings
    .map((d, i) => analyzeDrawing(d, opts.legibility?.[i]))
    .filter((x): x is DrawingAnalysis => x !== null);
  const writing = per.filter((p) => p.type === "letter" || p.type === "word");
  const timed = writing.length ? writing : per;

  const jitter = median(per.map((p) => p.jitterIndex));
  const speed = median(timed.map((p) => p.speedHps));
  // pooled over all writing: halts are sparse, so a per-drawing median would hide them
  const totalPath = timed.reduce((s, p) => s + p.pathLetterHeights, 0);
  const haltRate = totalPath > 0 ? (timed.reduce((s, p) => s + p.halts, 0) / totalPath) * 10 : 0;
  const medianPause = median(timed.map((p) => p.medianPauseMs).filter((x) => x > 0));
  const longPauses = timed.reduce((s, p) => s + p.longPauses, 0);
  const strokeCount = drawings.reduce((s, d) => s + d.strokes.length, 0);
  const longPauseShare = strokeCount > drawings.length ? longPauses / Math.max(1, strokeCount - drawings.length) : 0;
  const slopes = per.map((p) => p.baselineSlope).filter((x): x is number => x !== undefined);
  const scatters = per.map((p) => p.lineScatter).filter((x): x is number => x !== undefined);
  const legibilities = per.map((p) => p.legibility).filter((x): x is number => x !== undefined);

  const motorControl = scale(jitter, THRESHOLDS.jitter);
  const writingFluency = Math.round(mean([
    scale(haltRate, THRESHOLDS.haltRate),
    Math.min(scale(medianPause, THRESHOLDS.pauseMs[device]), scale(longPauseShare, THRESHOLDS.longPauseShare)),
    scale(speed, THRESHOLDS.speed[device]),
  ]));
  const spatialAwareness = slopes.length
    ? Math.round(mean([scale(median(slopes), THRESHOLDS.baselineSlope), scale(median(scatters), THRESHOLDS.lineScatter)]))
    : null;
  const legibility = legibilities.length ? Math.round(mean(legibilities)) : null;

  const notes: string[] = [];
  const fluencyWeight = device === "mouse" ? WEIGHTS.writingFluency / 2 : WEIGHTS.writingFluency;
  if (device === "mouse") notes.push("Written with a mouse or touchpad: speed and fluency are less reliable. Use a stylus or finger on a touch screen for screening.");
  if (legibility === null) notes.push("Legibility was not assessed (handwriting model unavailable or unsupported script).");
  const parts: [number | null, number][] = [
    [legibility, WEIGHTS.legibility], [motorControl, WEIGHTS.motorControl],
    [writingFluency, fluencyWeight], [spatialAwareness, WEIGHTS.spatialAwareness],
  ];
  const used = parts.filter(([v]) => v !== null) as [number, number][];
  const overallScore = Math.round(used.reduce((s, [v, w]) => s + v * w, 0) / used.reduce((s, [, w]) => s + w, 0));

  const flaggedConditions: string[] = [];
  if (legibility !== null && legibility < 60) flaggedConditions.push("Letters or words hard to read");
  if (motorControl < 60) flaggedConditions.push("Shaky or irregular pen control");
  if (writingFluency < 60 && device !== "mouse") flaggedConditions.push("Slow or stop-start writing");
  if (spatialAwareness !== null && spatialAwareness < 60) flaggedConditions.push("Uneven letter size or line alignment");

  const domains = [legibility, motorControl, device === "mouse" ? null : writingFluency, spatialAwareness]
    .filter((v): v is number => v !== null);
  const weak = domains.filter((v) => v < 60).length;
  const veryWeak = domains.filter((v) => v < 35).length;
  const riskLevel: "low" | "moderate" | "high" =
    overallScore < 50 || veryWeak >= 1 || weak >= 2 || (legibility !== null && legibility < 50) ? "high"
    : overallScore < 75 || weak === 1 || (legibility !== null && legibility < 75) ? "moderate" : "low";

  const name = opts.studentName || "The student";
  const summary = riskLevel === "low"
    ? `${name}'s handwriting was clear and well controlled for Grade ${opts.gradeNum} (score ${overallScore}/100${legibility !== null ? `, legibility ${legibility}%` : ""}).`
    : riskLevel === "moderate"
    ? `${name} showed some handwriting difficulties (score ${overallScore}/100): ${flaggedConditions.join(", ").toLowerCase() || "borderline results in one area"}. Targeted practice and a re-screen are suggested.`
    : `${name} showed marked handwriting difficulties (score ${overallScore}/100): ${flaggedConditions.join(", ").toLowerCase()}. A specialist (e.g. occupational therapist) assessment is recommended.`;

  const recommendations: string[] = [];
  if (flaggedConditions.includes("Letters or words hard to read")) recommendations.push("Practise letter formation with guided tracing and model letters", "Check letter reversals and spelling with the teacher");
  if (flaggedConditions.includes("Shaky or irregular pen control")) recommendations.push("Fine-motor activities: clay, beading, tracing large shapes", "Consider an occupational therapy assessment");
  if (flaggedConditions.includes("Slow or stop-start writing")) recommendations.push("Short daily writing practice to build automaticity", "Allow extra time for written work");
  if (flaggedConditions.includes("Uneven letter size or line alignment")) recommendations.push("Use lined or squared paper to guide size and alignment");
  if (!recommendations.length) recommendations.push("Continue regular writing practice", "Re-screen next term");

  return {
    overallScore,
    riskLevel,
    metrics: {
      strokeCount,
      totalTime: drawings.reduce((s, d) => s + d.totalTime, 0),
      jitterIndex: Number(jitter.toFixed(4)),
      writingSpeed: Number(speed.toFixed(2)),
      haltRate: Number(haltRate.toFixed(2)),
      medianPauseMs: Math.round(medianPause),
      longPauseCount: longPauses,
      baselineSlope: slopes.length ? Number(median(slopes).toFixed(3)) : null,
      lineScatter: scatters.length ? Number(median(scatters).toFixed(3)) : null,
      device,
    },
    domainScores: { legibility, motorControl, writingFluency, spatialAwareness },
    drawings: per,
    flaggedConditions,
    notes,
    summary,
    recommendations,
  };
}
