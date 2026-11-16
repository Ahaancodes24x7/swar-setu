import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, X } from "lucide-react";
import heroPath from "@/assets/hero-path.webp";

type Skill = "read" | "write" | "understand";

// positions on the artwork, as % of its width/height
const HOTSPOTS: { id: Skill; n: string; label: string; blurb: string; x: number; y: number; side: "left" | "right" }[] = [
  { id: "read", n: "01", label: "Read", blurb: "Sounds, words and short stories, read aloud at the child's own pace.", x: 14.3, y: 78.4, side: "left" },
  { id: "write", n: "02", label: "Write", blurb: "Letters traced on screen, so handwriting patterns show up early.", x: 23.4, y: 36.2, side: "left" },
  { id: "understand", n: "03", label: "Understand", blurb: "Numbers, patterns and memory games that feel like play.", x: 67.4, y: 21.4, side: "right" },
];
const MARBLE = { x: 59.9, y: 72.1, size: 8.8 };

const EDGE_FADE =
  "[mask-image:linear-gradient(to_right,transparent,black_14%,black_92%,transparent),linear-gradient(to_bottom,transparent,black_6%,black_90%,transparent)] [mask-composite:intersect] [-webkit-mask-composite:source-in]";

/** The hero artwork: tilts toward the pointer, light sweeps along the path, the marble drops in,
 *  rocks, and spins when poked (keep poking), and the Read/Write/Understand dots open a short note. */
export function HeroPath() {
  const wrap = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const [bouncing, setBouncing] = useState(false);
  const [pokes, setPokes] = useState(0);
  const [open, setOpen] = useState<Skill | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        if (art.current) art.current.style.transform = `perspective(1200px) rotateY(${px * 6}deg) rotateX(${-py * 5}deg) translate3d(${px * -10}px, ${py * -8}px, 0)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      if (art.current) art.current.style.transform = "";
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // close the note on Escape or a tap elsewhere
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.("[data-hotspot]")) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const poke = () => {
    setBouncing(false);
    requestAnimationFrame(() => setBouncing(true));
    setPokes((p) => p + 1);
  };

  const marbleMotion = bouncing ? "marble-bounce" : pokes > 0 ? "marble-rocking" : "marble-idle";

  return (
    <div ref={wrap} className="art-float relative w-full">
      <div ref={art} className="relative transition-transform duration-300 ease-out will-change-transform">
        <img
          src={heroPath}
          alt="A winding paper path running through an arch, with an amber marble rolling along it"
          width={1011}
          height={810}
          fetchPriority="high"
          className={`block w-full h-auto select-none ${EDGE_FADE}`}
          draggable={false}
        />

        {/* light sweeping along the path */}
        <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${EDGE_FADE}`}>
          <div className="path-sheen absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent mix-blend-soft-light" />
        </div>

        {HOTSPOTS.map((h) => (
          <div
            key={h.id}
            data-hotspot
            className={`absolute ${open === h.id ? "z-20" : "z-10"}`}
            style={h.side === "left"
              ? { left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-6px, -50%)" }
              : { right: `${100 - h.x}%`, top: `${h.y}%`, transform: "translate(6px, -50%)" }}
          >
            <button
              type="button"
              onClick={() => setOpen((o) => (o === h.id ? null : h.id))}
              aria-expanded={open === h.id}
              className={`group flex items-center gap-2 text-hero-foreground focus-visible:outline-none ${h.side === "right" ? "flex-row-reverse" : ""}`}
            >
              <span className="relative grid h-3 w-3 place-items-center">
                <span className="hotspot-ping absolute inset-0 rounded-full bg-accent" />
                <span className="relative h-3 w-3 rounded-full bg-hero-foreground ring-4 ring-accent/40 transition-transform group-hover:scale-125" />
              </span>
              <span className={`h-px bg-hero-foreground/70 transition-all group-hover:bg-accent ${open === h.id ? "w-12 bg-accent" : "w-6 sm:w-10 group-hover:w-12"}`} />
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs sm:text-sm backdrop-blur-sm transition-colors group-focus-visible:ring-2 group-focus-visible:ring-accent ${open === h.id ? "bg-accent text-accent-foreground" : "bg-hero/40 group-hover:bg-accent group-hover:text-accent-foreground"}`}>
                <span className="opacity-70 mr-1.5">{h.n}</span>
                <span className="font-semibold">{h.label}</span>
              </span>
            </button>

            {open === h.id && (
              <div
                role="dialog"
                aria-label={h.label}
                className={`animate-pop-in absolute top-full mt-3 w-60 rounded-2xl bg-cream p-4 text-hero shadow-lg ${h.side === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{h.n} · {h.label}</p>
                  <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="rounded-full p-0.5 hover:bg-hero/10">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-hero/80">{h.blurb}</p>
                <Link to="/login" className="group/link mt-3 inline-flex items-center gap-1 text-sm font-semibold underline decoration-amber decoration-2 underline-offset-4">
                  Try it <ArrowUpRight className="h-4 w-4 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                </Link>
              </div>
            )}
          </div>
        ))}

        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${MARBLE.x}%`, top: `${MARBLE.y}%`, width: `${MARBLE.size}%`, aspectRatio: "1" }}
        >
          <span aria-hidden className="marble-glow pointer-events-none absolute left-1/2 top-[70%] h-[70%] w-[180%] rounded-full bg-[radial-gradient(closest-side,hsl(36_100%_60%/0.75),transparent)]" />
          <button
            type="button"
            onClick={poke}
            aria-label="Poke the marble"
            className="relative block h-full w-full rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span
              onAnimationEnd={(e) => e.animationName === "marble-bounce" && setBouncing(false)}
              className={`block h-full w-full rounded-full shadow-[0_10px_24px_-6px_rgba(224,123,0,0.7)] ${marbleMotion}`}
              style={{ background: "radial-gradient(circle at 34% 30%, #fff8e1 0 7%, #ffc94d 16%, #f29a0d 46%, #b85a00 82%, #7a3800 100%)" }}
            />
          </button>
        </div>
        {pokes >= 3 && (
          <span
            key={pokes}
            className="animate-pop-in pointer-events-none absolute -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-warm"
            style={{ left: `${MARBLE.x}%`, top: `${MARBLE.y - 17}%` }}
          >
            {pokes >= 10 ? "Marble master! 🏆" : pokes >= 6 ? `${pokes} bounces! 🤩` : "Boing! ✨"}
          </span>
        )}
      </div>
    </div>
  );
}
