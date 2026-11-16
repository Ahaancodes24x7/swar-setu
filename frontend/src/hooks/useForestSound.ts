import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "swar_forest_sound";
type Cue = "pop" | "chime" | "rain" | "sun";

const NOTES: Record<Cue, { f: number[]; d: number; type: OscillatorType; gap: number }> = {
  pop: { f: [660, 990], d: 0.09, type: "sine", gap: 0.06 },
  chime: { f: [784, 988, 1319], d: 0.22, type: "triangle", gap: 0.09 },
  rain: { f: [520, 460, 400, 350], d: 0.07, type: "sine", gap: 0.07 },
  sun: { f: [523, 659, 784, 1047], d: 0.16, type: "triangle", gap: 0.08 },
};

/** Tiny synthesised cues (no audio files). Off by default; the choice is remembered per browser. */
export function useForestSound() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, enabled ? "1" : "0");
    } catch {
      /* private mode: just don't remember */
    }
  }, [enabled]);

  useEffect(() => () => void ctx.current?.close(), []);

  const play = useCallback(
    (cue: Cue) => {
      if (!enabled) return;
      try {
        const ac = (ctx.current ??= new AudioContext());
        const n = NOTES[cue];
        const t0 = ac.currentTime + 0.01;
        n.f.forEach((f, i) => {
          const o = ac.createOscillator();
          const g = ac.createGain();
          o.type = n.type;
          o.frequency.value = f;
          const t = t0 + i * n.gap;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
          o.connect(g).connect(ac.destination);
          o.start(t);
          o.stop(t + n.d + 0.02);
        });
      } catch {
        /* audio unavailable */
      }
    },
    [enabled]
  );

  return { enabled, toggle: () => setEnabled((v) => !v), play };
}
