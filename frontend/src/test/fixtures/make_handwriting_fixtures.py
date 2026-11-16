"""
Synthetic handwriting for testing the dysgraphia analysis (frontend/src/lib/dysgraphiaAnalysis.ts).

Letters come from the single-stroke Hershey 'futural' font and are traced like a pointer
device would record them: speed follows the two-thirds power law (slower on curves),
samples arrive at 60 Hz, coordinates are quantised to whole pixels, pen-up pauses separate
strokes. Each impaired profile adds one deficit on top of the typical writer.

    python make_handwriting_fixtures.py   ->  handwriting_fixtures.json (+ PNG renders)

Synthetic data: useful to check that measures move in the right direction and that a
well-formed sample scores well; not a substitute for norms from real children.
"""

import json
import os

import numpy as np
from HersheyFonts import HersheyFonts

HERE = os.path.dirname(os.path.abspath(__file__))
CANVAS_W, CANVAS_H = 600, 300
HZ = 60

PROFILES = {
    #               speed px/s  jitter  tremor amp/Hz  stops/s  pause ms (mean, sd)  size sd  drift  distort
    "typical":     dict(speed=220, jitter=0.3, tremor=(0.0, 0), stops=0.0, pause=(220, 70), size_sd=0.05, drift=0.0, distort=0.0),
    # neat writing on a high-rate touch/pen screen (144 Hz) with natural pauses between letters
    "typical_touch": dict(speed=150, jitter=0.3, tremor=(0.0, 0), stops=0.0, pause=(550, 200), size_sd=0.06, drift=0.0, distort=0.0, hz=144),
    # neat writing with a mouse or touchpad: slow, careful, longer pauses, 125 Hz events
    "typical_mouse": dict(speed=90, jitter=0.5, tremor=(0.0, 0), stops=0.4, pause=(800, 300), size_sd=0.06, drift=0.0, distort=0.0, hz=125),
    "tremor":      dict(speed=200, jitter=0.4, tremor=(2.2, 9), stops=0.0, pause=(250, 80), size_sd=0.06, drift=0.0, distort=0.0),
    "dysfluent":   dict(speed=90, jitter=0.4, tremor=(0.0, 0), stops=1.6, pause=(1100, 400), size_sd=0.06, drift=0.0, distort=0.0),
    "spatial":     dict(speed=210, jitter=0.3, tremor=(0.0, 0), stops=0.0, pause=(250, 80), size_sd=0.35, drift=0.22, distort=0.0),
    "illegible":   dict(speed=200, jitter=0.4, tremor=(0.6, 7), stops=0.3, pause=(400, 150), size_sd=0.2, drift=0.08, distort=0.45),
}
PROMPTS = [("letter", "A"), ("letter", "b"), ("word", "cat"), ("word", "school"), ("word", "friend")]


def resample_polyline(pts, step=0.5):
    pts = np.asarray(pts, float)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    if s[-1] == 0:
        return pts[:1], np.zeros(1)
    t = np.arange(0, s[-1], step)
    return np.column_stack([np.interp(t, s, pts[:, 0]), np.interp(t, s, pts[:, 1])]), t


def trace(path, cfg, rng, t0):
    """Sample a pen trajectory along a dense path; returns list of points and end time."""
    dense, s = resample_polyline(path)
    if len(dense) < 3:
        return [{"x": float(round(dense[0, 0])), "y": float(round(dense[0, 1])), "time": t0}], t0 + 30
    d1 = np.gradient(dense, axis=0)
    d2 = np.gradient(d1, axis=0)
    curv = np.abs(d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / (np.linalg.norm(d1, axis=1) ** 3 + 1e-9)
    curv = np.convolve(curv, np.ones(15) / 15, mode="same")
    v = cfg["speed"] * np.clip((curv * 20 + 1e-3) ** (-1 / 3), 0.35, 1.6)  # two-thirds power law
    v[:8] *= np.linspace(0.3, 1, 8)
    v[-8:] *= np.linspace(1, 0.3, 8)
    dt = np.diff(s) / v[1:]
    times = t0 + np.concatenate([[0], np.cumsum(dt)]) * 1000
    if cfg["stops"] > 0:  # stop-start writing: insert brief halts inside the stroke
        n_stops = rng.poisson(cfg["stops"] * (times[-1] - times[0]) / 1000)
        for at in rng.choice(len(times), size=min(n_stops, len(times) - 1), replace=False) if n_stops else []:
            times[at:] += rng.uniform(150, 400)
    sample_t = np.arange(times[0], times[-1], 1000 / cfg.get("hz", HZ))
    xs = np.interp(sample_t, times, dense[:, 0])
    ys = np.interp(sample_t, times, dense[:, 1])
    amp, hz = cfg["tremor"]
    if amp:
        phase = rng.uniform(0, 2 * np.pi)
        xs += amp * np.sin(2 * np.pi * hz * sample_t / 1000 + phase)
        ys += amp * np.cos(2 * np.pi * hz * sample_t / 1000 + phase * 1.3)
    xs += rng.normal(0, cfg["jitter"], len(xs))
    ys += rng.normal(0, cfg["jitter"], len(ys))
    pts = [{"x": float(round(x)), "y": float(round(y)), "time": float(round(t, 1))} for x, y, t in zip(xs, ys, sample_t)]
    return pts, float(sample_t[-1])


def glyph_strokes(font, ch):
    return [np.asarray(s, float) for s in font.strokes_for_text(ch)]


def write_text(text, cfg, rng, height=60):
    font = HersheyFonts()
    font.load_default_font("futural")
    font.normalize_rendering(height)
    strokes, t = [], 0.0
    x_cursor, baseline = 40.0, 190.0
    for i, ch in enumerate(text):
        if ch == " ":
            x_cursor += height * 0.5
            continue
        scale = max(0.4, rng.normal(1, cfg["size_sd"]))
        glyph = glyph_strokes(font, ch)
        if not glyph:
            continue
        allp = np.vstack(glyph)
        w = allp[:, 0].max() - allp[:, 0].min()
        drift = cfg["drift"] * (x_cursor - 40)
        for g in glyph:
            p = g.copy()
            p[:, 0] = (p[:, 0] - allp[:, 0].min()) * scale + x_cursor
            p[:, 1] = baseline + drift - p[:, 1] * scale
            if cfg["distort"]:
                p += rng.normal(0, cfg["distort"] * height * 0.12, size=(1, 2))   # misplaced strokes
                p += rng.normal(0, cfg["distort"] * 2.5, size=p.shape)            # malformed curves
            if len(strokes):
                t += max(60, rng.normal(*cfg["pause"]))
            pts, t = trace(p, cfg, rng, t)
            if len(pts) > 1:
                strokes.append({"points": pts, "width": 3})
        x_cursor += w * scale + height * rng.uniform(0.12, 0.22) * (1 + cfg["distort"])
    return strokes, t


def render_png(strokes, path):
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (CANVAS_W, CANVAS_H), "white")
    d = ImageDraw.Draw(img)
    for s in strokes:
        xy = [(p["x"], p["y"]) for p in s["points"]]
        if len(xy) > 1:
            d.line(xy, fill=(26, 26, 46), width=3, joint="curve")
    img.save(path)


def main():
    rng = np.random.default_rng(7)
    out = []
    png_dir = os.path.join(HERE, "handwriting_png")
    os.makedirs(png_dir, exist_ok=True)
    for profile, cfg in PROFILES.items():
        for rep in range(3):
            drawings = []
            for ptype, ref in PROMPTS:
                strokes, total = write_text(ref, cfg, rng)
                name = f"{profile}_{rep}_{ref}.png"
                render_png(strokes, os.path.join(png_dir, name))
                drawings.append({"type": ptype, "reference": ref, "strokes": strokes, "canvasWidth": CANVAS_W,
                                 "canvasHeight": CANVAS_H, "totalTime": total + 1500, "png": name})
            device = "touch" if profile == "typical_touch" else "mouse" if profile == "typical_mouse" else "pen"
            out.append({"profile": profile, "rep": rep, "device": device, "drawings": drawings})
    with open(os.path.join(HERE, "handwriting_fixtures.json"), "w") as f:
        json.dump(out, f)
    print(f"wrote {len(out)} writers x {len(PROMPTS)} drawings")


if __name__ == "__main__":
    main()
