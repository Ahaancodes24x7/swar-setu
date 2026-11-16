// Per-stroke handwriting measurements sent to the screening backend.
// Every value is computed from the recorded pointer samples; a field that cannot be
// measured (e.g. pressure without a stylus, pause before the first stroke) is omitted so
// the backend treats it as missing instead of receiving an invented number.
//
// Field names follow backend/ai/feature_extractors/dysgraphia_features.py.
// Normalisation constants are provisional and should be recalibrated on real data.

import { THRESHOLDS, gaussianSmooth, resample, type StrokeData } from "./dysgraphiaAnalysis";

export interface DrawingStrokes {
  strokes: StrokeData[];
  canvasWidth: number;
  canvasHeight: number;
}

export interface StrokeFeatures {
  speed: number;               // 0-1: path length per second relative to canvas diagonal
  straightness: number;        // 0-1: chord length / path length
  smoothness: number;          // 0-1: from the jitter index (same measure as the on-screen analysis)
  tremor: number;              // 0-1: jitter beyond the typical range (0 = none)
  direction_reversals: number; // count of turns sharper than 150 degrees
  height: number;              // px: bounding-box height (size consistency)
  spatial_alignment: number;   // 1 if the stroke bottom sits on the drawing's baseline band, else 0
  pen_lifts: number;           // pen lifts in the drawing this stroke belongs to
  pause_ms?: number;           // gap since the previous stroke ended
  baseline_drift?: number;     // 0-1: |slope| of stroke bottoms across the drawing
  pressure?: number;           // 0-1: mean stylus pressure (stylus input only)
}

const SPEED_FULL_SCALE = 1.5; // canvas diagonals per second mapped to speed 1.0

function angle(ax: number, ay: number, bx: number, by: number): number {
  const d = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
  return Math.abs(d);
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function strokeGeometry(stroke: StrokeData) {
  // 1 px resample + light smoothing removes pixel quantisation, so the measures below do not
  // depend on the device's pointer sampling rate (same preprocessing as dysgraphiaAnalysis.ts)
  const raw = [...stroke.points].sort((a, b) => a.time - b.time);
  const rx = raw.map((p) => p.x), ry = raw.map((p) => p.y);
  const size = Math.max(8, Math.max(...ry) - Math.min(...ry), (Math.max(...rx) - Math.min(...rx)) * 0.5);
  const pts = raw.length >= 4 ? resample(gaussianSmooth(resample(raw, 1), 1.5), Math.max(1, 0.03 * size)) : raw;
  let path = 0;
  let turnSum = 0;
  let turns = 0;
  let sharp = 0;
  let reversals = 0;
  for (let i = 1; i < pts.length; i++) {
    path += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (i >= 2) {
      const ax = pts[i - 1].x - pts[i - 2].x, ay = pts[i - 1].y - pts[i - 2].y;
      const bx = pts[i].x - pts[i - 1].x, by = pts[i].y - pts[i - 1].y;
      if (Math.hypot(ax, ay) > 0.5 && Math.hypot(bx, by) > 0.5) {
        const a = angle(ax, ay, bx, by);
        turnSum += a;
        turns++;
        if (a > Math.PI / 2) sharp++;
        if (a > (150 * Math.PI) / 180) reversals++;
      }
    }
  }
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const chord = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
  const duration = Math.max(1, pts[pts.length - 1].time - pts[0].time);
  const pressures = raw.map((p) => p.pressure).filter((p): p is number => typeof p === "number");
  // jitter index: how much the lightly smoothed path exceeds the heavily smoothed one
  const lenOf = (q: typeof pts) => q.slice(1).reduce((a, b, i) => a + Math.hypot(b.x - q[i].x, b.y - q[i].y), 0);
  const heavy = pts.length >= 8 ? lenOf(gaussianSmooth(pts, 4)) : 0;
  const jitter = heavy > 0 ? Math.max(0, lenOf(gaussianSmooth(pts, 1)) / heavy - 1) : 0;
  return {
    jitter,
    path, chord, duration, turns, sharp, reversals,
    meanTurn: turns ? turnSum / turns : 0,
    minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys),
    start: pts[0].time, end: pts[pts.length - 1].time,
    pressure: pressures.length ? pressures.reduce((a, b) => a + b, 0) / pressures.length : undefined,
  };
}

export function computeStrokeFeatures(drawings: DrawingStrokes[]): StrokeFeatures[] {
  const out: StrokeFeatures[] = [];
  for (const drawing of drawings) {
    const strokes = drawing.strokes.filter((s) => s.points.length > 1);
    if (!strokes.length) continue;
    const diag = Math.hypot(drawing.canvasWidth, drawing.canvasHeight) || 1;
    const geo = strokes.map(strokeGeometry);

    // baseline: stroke bottoms vs stroke centres across the drawing
    const bottoms = geo.map((g) => g.maxY);
    const centres = geo.map((g) => (g.minX + g.maxX) / 2);
    const baseline = median(bottoms);
    const band = 0.1 * drawing.canvasHeight;
    let drift: number | undefined;
    if (geo.length >= 3) {
      const mx = centres.reduce((a, b) => a + b, 0) / centres.length;
      const my = bottoms.reduce((a, b) => a + b, 0) / bottoms.length;
      let sxy = 0, sxx = 0;
      centres.forEach((x, i) => { sxy += (x - mx) * (bottoms[i] - my); sxx += (x - mx) ** 2; });
      drift = sxx > 0 ? Math.min(1, Math.abs(sxy / sxx)) : undefined;
    }

    geo.forEach((g, i) => {
      const f: StrokeFeatures = {
        speed: Math.min(1, g.path / diag / (g.duration / 1000) / SPEED_FULL_SCALE),
        straightness: g.path > 0 ? Math.min(1, g.chord / g.path) : 1,
        smoothness: Math.max(0, Math.min(1, (THRESHOLDS.jitter.bad - g.jitter) / (THRESHOLDS.jitter.bad - THRESHOLDS.jitter.good))),
        tremor: Math.max(0, Math.min(1, (g.jitter - THRESHOLDS.jitter.good) / 0.1)),
        direction_reversals: g.reversals,
        height: Math.max(1, g.maxY - g.minY),
        spatial_alignment: Math.abs(g.maxY - baseline) <= band ? 1 : 0,
        pen_lifts: strokes.length,
      };
      if (i > 0) f.pause_ms = Math.max(0, g.start - geo[i - 1].end);
      if (drift !== undefined) f.baseline_drift = drift;
      if (g.pressure !== undefined) f.pressure = g.pressure;
      out.push(f);
    });
  }
  return out;
}
