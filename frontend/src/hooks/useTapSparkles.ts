import { useEffect } from "react";

const COLORS = ["hsl(var(--amber))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--cream))"];
const CLICKABLE = 'button:not(:disabled), [role="button"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"], a[href]';
const MAX_LIVE = 36; // cap DOM nodes so rapid tapping never piles up work

/** A tiny burst of coloured dots wherever something clickable is tapped.
 *  One delegated listener for the whole app; dots remove themselves after the animation. */
export function useTapSparkles() {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let live = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || live >= MAX_LIVE) return;
      const target = e.target as Element | null;
      if (!target?.closest?.(CLICKABLE)) return;
      const n = 6;
      for (let i = 0; i < n; i++) {
        const dot = document.createElement("span");
        const angle = (Math.PI * 2 * i) / n + Math.random() * 0.6;
        const dist = 18 + Math.random() * 22;
        dot.className = "tap-spark";
        dot.style.left = `${e.clientX}px`;
        dot.style.top = `${e.clientY}px`;
        dot.style.background = COLORS[i % COLORS.length];
        dot.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
        dot.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
        live++;
        dot.addEventListener("animationend", () => {
          dot.remove();
          live--;
        }, { once: true });
        document.body.appendChild(dot);
      }
    };

    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
}
