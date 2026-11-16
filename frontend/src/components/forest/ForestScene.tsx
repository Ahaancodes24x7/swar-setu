import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import {
  ArrowRight, BookOpen, Calculator, CalendarDays, Eye, Filter, Hand, Link2, List, Lock, Maximize2, Minus, Pencil, Plus,
  Search, TreePine, Volume2, VolumeX, X, Sprout as SproutIcon, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useForestSound } from "@/hooks/useForestSound";
import { ForestLandscape, WORLD_H, seeded } from "./ForestLandscape";
import { LeafIcon, STAGE_LABELS, STAGE_WIDTH, StudentTree, getTreeStage, type TreeStage } from "./StudentTree";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;
type SingleTest = "dyslexia" | "dyscalculia" | "dysgraphia";

export interface StudentWithStats extends Student {
  testCount: number;
  averageScore: number;
  lastSessionAt?: string | null;
}

interface ForestSceneProps {
  students: StudentWithStats[];
  selectedId: string | null;
  onSelect: (student: Student | null) => void;
  onStartScreening: (student: Student) => void;
  onViewProfile: (student: Student) => void;
  onViewHistory: (student: Student) => void;
  onSingleTest: (test: SingleTest, student: Student) => void;
  onPerception: (student: Student) => void;
  onPlanSession: () => void;
  onOpenParents: () => void;
  onAddStudent: () => void;
  onShowList: () => void;
  parentsConnected: number;
  sunlight?: number;
  rain?: boolean;
  /** stage filter driven from outside too (e.g. the stats strip) */
  stageFilter?: TreeStage[] | null;
  onStageFilterChange?: (stages: TreeStage[] | null) => void;
  className?: string;
}

const ART_H: Record<TreeStage, number> = { seed: 130, sprout: 170, tree: 240, blossom: 240 };
const ROWS = [500, 582]; // ground line of the back and front row
const SKY_CLOUDS = [
  { id: "a", x: 0.08, y: 70, s: 1 },
  { id: "b", x: 0.47, y: 150, s: 0.8 },
  { id: "c", x: 0.74, y: 210, s: 0.7 },
];

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

/** Ground slots, left to right, skipping the stepping-stone path and the pond. */
function slotsFor(w: number) {
  const xs: number[] = [];
  for (let x = 150; x <= w - 380; x += 180) if (Math.abs(x - w / 2) > 105) xs.push(x);
  return xs;
}

function layout(students: StudentWithStats[]) {
  let w = 1500;
  while (slotsFor(w).length < students.length) w += 250;
  const xs = slotsFor(w);
  // spread a small class across the meadow instead of bunching on the left
  const step = students.length ? Math.max(1, Math.floor(xs.length / students.length)) : 1;
  const offset = Math.floor((xs.length - step * (students.length - 1) - 1) / 2);
  return {
    width: w,
    trees: students.map((s, i) => {
      const stage = getTreeStage(s.testCount);
      const row = i % 2 === 0 ? 1 : 0; // alternate front/back so neighbours never overlap
      return {
        student: s,
        stage,
        x: xs[Math.min(xs.length - 1, Math.max(0, offset) + i * step)] + (seeded(s.id, 1) - 0.5) * 24,
        ground: ROWS[row] + (seeded(s.id, 2) - 0.5) * 18,
        sway: 4 + seeded(s.id, 3) * 3,
        delay: -seeded(s.id, 4) * 5,
      };
    }),
  };
}

interface View { z: number; x: number; y: number }

export function ForestScene(props: ForestSceneProps) {
  const {
    students, selectedId, onSelect, parentsConnected, sunlight = 50, rain = false, stageFilter = null, onStageFilterChange, className,
  } = props;
  const night = useIsDark();
  const sound = useForestSound();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 620 });
  const [view, setView] = useState<View>({ z: 1, x: 0, y: 0 });
  const [animate, setAnimate] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [rainingCloud, setRainingCloud] = useState<string | null>(null);
  const [watered, setWatered] = useState<Set<string>>(new Set());
  const [sunny, setSunny] = useState(false);
  const [moreTests, setMoreTests] = useState(false);
  const [hint, setHint] = useState(true);
  const timers = useRef<number[]>([]);
  const exploreIdx = useRef(-1);

  const { width: W, trees } = useMemo(() => layout(students), [students]);
  const H = WORLD_H;

  // ---- view maths -------------------------------------------------------
  const limits = useCallback(
    (w = size.w, h = size.h) => {
      const cover = Math.max(w / W, h / H);
      const all = Math.min(cover, Math.max(w / W, (0.45 * h) / H));
      return { cover, all, min: all, max: Math.max(2.2, cover * 1.8) };
    },
    [W, H, size]
  );

  const clamp = useCallback(
    (v: View): View => {
      const { min, max } = limits();
      const z = Math.min(max, Math.max(min, v.z));
      const ww = W * z;
      const hh = H * z;
      const x = ww <= size.w ? (size.w - ww) / 2 : Math.min(0, Math.max(size.w - ww, v.x));
      const y = hh <= size.h ? size.h - hh : Math.min(0, Math.max(size.h - hh, v.y));
      return { z, x, y };
    },
    [W, H, size, limits]
  );

  const fit = (mode: "cover" | "all") => {
    const { cover, all } = limits();
    const z = mode === "cover" ? cover : all;
    setAnimate(true);
    setView(clamp({ z, x: (size.w - W * z) / 2, y: size.h - H * z }));
  };

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // refit when the box or world size changes
  useEffect(() => {
    const { cover } = limits();
    setView(clamp({ z: cover, x: (size.w - W * cover) / 2, y: size.h - H * cover }));
  }, [size.w, size.h, W]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const zoomBy = useCallback(
    (f: number, cx = size.w / 2, cy = size.h / 2, smooth = true) => {
      setAnimate(smooth);
      setView((v) => {
        const z = v.z * f;
        return clamp({ z, x: cx - ((cx - v.x) / v.z) * z, y: cy - ((cy - v.y) / v.z) * z });
      });
    },
    [size, clamp]
  );

  const focusTree = useCallback(
    (id: string) => {
      const t = trees.find((tr) => tr.student.id === id);
      if (!t) return;
      setAnimate(true);
      setView((v) => {
        const z = Math.max(v.z, limits().cover);
        const narrow = size.w < 640;
        // keep room on the right for the learner card on wide screens
        const sx = narrow ? size.w / 2 : size.w * 0.38;
        const sy = narrow ? size.h * 0.4 : size.h * 0.62;
        return clamp({ z, x: sx - t.x * z, y: sy - (t.ground - ART_H[t.stage] / 2) * z });
      });
    },
    [trees, limits, clamp, size]
  );

  useEffect(() => {
    if (selectedId) focusTree(selectedId);
    setMoreTests(false);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- drag to pan, pinch / ctrl+wheel to zoom ---------------------------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ moved: boolean; pinch?: number; onBackground: boolean }>({ moved: false, onBackground: false });

  const onPointerDown = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest("button, input, a, label, [data-overlay]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { moved: false, onBackground: true };
    setAnimate(false);
  };
  const onPointerMove = (e: RPointerEvent) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (drag.current.pinch) {
        const rect = box.current!.getBoundingClientRect();
        zoomBy(dist / drag.current.pinch, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, false);
      }
      drag.current.pinch = dist;
      drag.current.moved = true;
      return;
    }
    if (!drag.current.moved && Math.abs(dx) + Math.abs(dy) > 2) {
      drag.current.moved = true;
      setDragging(true);
      setHint(false);
    }
    if (drag.current.moved) setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const onPointerUp = (e: RPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    drag.current.pinch = undefined;
    if (pointers.current.size === 0) {
      setDragging(false);
      // a tap on empty ground closes the learner card
      if (!drag.current.moved && drag.current.onBackground) onSelect(null);
    }
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        zoomBy(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top, false);
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        setAnimate(false);
        setView((v) => clamp({ ...v, x: v.x - e.deltaX }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy, clamp]);

  // ---- playful bits -------------------------------------------------------
  const pokeCloud = (id: string) => {
    const c = SKY_CLOUDS.find((k) => k.id === id)!;
    setRainingCloud(id);
    sound.play("rain");
    const cx = c.x * W + 85 * c.s;
    const under = trees.filter((t) => Math.abs(t.x - cx) < 200).map((t) => t.student.id);
    later(() => setWatered(new Set(under)), 450);
    later(() => { setRainingCloud(null); setWatered(new Set()); }, 2600);
  };
  const pokeSun = () => {
    setSunny(true);
    sound.play("sun");
    later(() => setSunny(false), 2000);
  };
  const explore = () => {
    if (!trees.length) return;
    setHint(false);
    exploreIdx.current = (exploreIdx.current + 1) % trees.length;
    onSelect(trees[exploreIdx.current].student);
    sound.play("pop");
  };

  // ---- search & filter ------------------------------------------------------
  const q = query.trim().toLowerCase();
  const matches = (t: (typeof trees)[number]) =>
    (!q || t.student.name.toLowerCase().includes(q)) &&
    (!stageFilter || stageFilter.length === 0 || stageFilter.includes(t.stage === "blossom" ? "tree" : t.stage));
  const filtering = !!q || (stageFilter?.length ?? 0) > 0;
  const firstMatch = filtering ? trees.find(matches) : undefined;
  const toggleStage = (s: TreeStage) => {
    const cur = stageFilter ?? [];
    const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
    onStageFilterChange?.(next.length ? next : null);
  };

  const selected = trees.find((t) => t.student.id === selectedId);
  const activeCloud = SKY_CLOUDS.find((c) => c.id === rainingCloud);

  // learner card position (screen space, follows the tree while panning)
  const narrow = size.w < 640;
  let card: { left: number; top: number; side: "left" | "right" } | null = null;
  if (selected && !narrow) {
    const sx = selected.x * view.z + view.x;
    const sy = (selected.ground - ART_H[selected.stage] * 0.75) * view.z + view.y;
    const half = (STAGE_WIDTH[selected.stage] / 2) * view.z * 0.8;
    const right = sx + half + 304 < size.w - 12;
    card = {
      side: right ? "right" : "left",
      left: right ? sx + half + 14 : Math.max(12, sx - half - 14 - 290),
      top: Math.min(size.h - 330, Math.max(70, sy - 40)),
    };
  }

  const stage = selected?.stage;
  const lastDate = selected?.student.lastSessionAt
    ? new Date(selected.student.lastSessionAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : null;

  const pill =
    "bg-white/95 text-[hsl(152_40%_16%)] shadow-md ring-1 ring-black/5 backdrop-blur transition dark:bg-slate-900/85 dark:text-cream";
  const roundBtn = cn(pill, "grid h-11 w-11 place-items-center rounded-full hover:scale-105 hover:bg-white active:scale-95");

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={box}
        className={cn(
          "forest relative isolate h-[clamp(420px,68svh,720px)] w-full touch-pan-y select-none overflow-hidden rounded-[28px] shadow-[0_20px_50px_-24px_hsl(152_50%_15%/0.55)] ring-1 ring-black/5",
          "bg-gradient-to-b from-[hsl(205_85%_58%)] to-[hsl(200_85%_76%)] dark:from-[hsl(230_55%_12%)] dark:to-[hsl(226_45%_24%)]",
          dragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* ======= world (pans and zooms) ======= */}
        <div
          className={cn("absolute left-0 top-0 origin-top-left will-change-transform", animate && "transition-transform duration-500 ease-out")}
          style={{ width: W, height: H, transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.z})` }}
          onTransitionEnd={(e) => e.target === e.currentTarget && setAnimate(false)}
        >
          <ForestLandscape width={W} night={night} />

          {/* drifting clouds: tap one to water the trees below */}
          {SKY_CLOUDS.map((c) => (
            <div key={c.id} className="forest-cloud absolute" style={{ left: c.x * W, top: c.y, animationDuration: `${40 + c.s * 20}s` }}>
              <button
                type="button"
                onClick={() => pokeCloud(c.id)}
                aria-label="Tap the cloud to water the trees"
                className={cn("block origin-top-left rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber/60", rainingCloud === c.id && "forest-cloud-shake")}
                style={{ scale: String(c.s) }}
              >
                <svg width="170" height="80" viewBox="0 0 170 80" aria-hidden>
                  <g fill={rainingCloud === c.id ? "hsl(210 15% 72%)" : night ? "hsl(220 25% 70% / 0.45)" : "white"}>
                    <ellipse cx="85" cy="56" rx="78" ry="20" />
                    <circle cx="55" cy="42" r="26" />
                    <circle cx="95" cy="34" r="32" />
                    <circle cx="130" cy="48" r="20" />
                  </g>
                </svg>
              </button>
            </div>
          ))}
          {activeCloud && (
            <div className="pointer-events-none absolute" style={{ left: activeCloud.x * W + 20, top: activeCloud.y + 60 * activeCloud.s, width: 150, height: H }} aria-hidden>
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} className="forest-drop absolute top-0 h-5 w-0.5 rounded-full bg-[hsl(205_90%_55%)]" style={{ left: (i * 41) % 140, animationDelay: `${(i % 6) * 0.12}s` }} />
              ))}
            </div>
          )}
          {rain && (
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {Array.from({ length: 30 }, (_, i) => (
                <span key={i} className="forest-drop absolute h-4 w-px rounded-full bg-[hsl(205_90%_60%/0.55)]" style={{ left: `${seeded(`r${i}`) * 100}%`, top: 40 + seeded(`r${i}`, 5) * 200, animationDelay: `${seeded(`r${i}`, 3) * 1.2}s`, animationDuration: "1.5s" }} />
              ))}
            </div>
          )}

          {/* kite and birds */}
          <div className="forest-kite pointer-events-none absolute" style={{ left: W * 0.43, top: 250 }} aria-hidden>
            <svg width="120" height="150" viewBox="0 0 120 150">
              <path d="M60 4 L92 40 L60 84 L28 40 Z" fill="hsl(14 90% 58%)" />
              <path d="M60 4 L92 40 L60 40 Z" fill="hsl(40 98% 60%)" />
              <path d="M60 40 L60 84 L28 40 Z" fill="hsl(40 98% 60%)" />
              <path d="M60 4 V84 M28 40 H92" stroke="hsl(26 50% 30%)" strokeWidth="1.5" />
              <path className="forest-kite-tail" d="M60 84 C 50 100, 72 110, 58 124 S 66 140, 52 148" stroke="hsl(340 80% 60%)" strokeWidth="2.5" fill="none" />
            </svg>
          </div>
          {[0, 1].map((i) => (
            <svg key={i} className="forest-bird pointer-events-none absolute" style={{ top: 200 + i * 40, animationDelay: `${-i * 9}s`, animationDuration: `${28 + i * 6}s` }} width="48" height="22" viewBox="0 0 34 16" aria-hidden>
              <path className="forest-wing" d="M2 10 Q 9 2 17 9 Q 25 2 32 10" stroke={night ? "hsl(40 30% 85%)" : "hsl(26 40% 28%)"} strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </svg>
          ))}

          {/* learners */}
          {trees.map((t) => (
            <div
              key={t.student.id}
              className="absolute"
              style={{ left: t.x, top: t.ground - ART_H[t.stage], transform: "translateX(-50%)", zIndex: Math.round(t.ground) }}
            >
              <StudentTree
                student={t.student}
                testCount={t.student.testCount}
                selected={t.student.id === selectedId}
                dimmed={filtering && !matches(t)}
                watered={watered.has(t.student.id)}
                swayDuration={sunny ? t.sway / 2.5 : t.sway}
                swayDelay={t.delay}
                onSelect={() => {
                  sound.play("pop");
                  onSelect(t.student.id === selectedId ? null : t.student);
                }}
              />
            </div>
          ))}
        </div>

        {/* sunshine wash */}
        {sunny && <div className="pointer-events-none absolute inset-0 animate-fade-in bg-[radial-gradient(circle_at_88%_18%,hsl(45_100%_75%/0.55),transparent_60%)]" aria-hidden />}

        {/* ======= overlays (fixed on screen) ======= */}
        <div data-overlay className="absolute left-3 top-3 z-50 flex items-center gap-2 sm:left-5 sm:top-5">
          <label className={cn(pill, "flex h-11 w-[min(40vw,300px)] sm:w-[300px] items-center gap-2 rounded-full px-4 focus-within:ring-2 focus-within:ring-forest")}>
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && firstMatch) onSelect(firstMatch.student);
                if (e.key === "Escape") setQuery("");
              }}
              placeholder="Find a learner..."
              aria-label="Find a learner"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded-full p-0.5 hover:bg-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={cn(roundBtn, (stageFilter?.length ?? 0) > 0 && "bg-forest text-forest-foreground hover:bg-forest")} aria-label="Filter learners">
                <Filter className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 rounded-2xl">
              <p className="mb-2 text-sm font-semibold">Show learners who are…</p>
              {(Object.keys(STAGE_LABELS) as TreeStage[]).filter((s) => STAGE_LABELS[s].legend).map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm hover:bg-muted">
                  <Checkbox checked={stageFilter?.includes(s) ?? false} onCheckedChange={() => toggleStage(s)} />
                  <LeafIcon color={STAGE_LABELS[s].leaf} className="h-4 w-4" />
                  {STAGE_LABELS[s].label}
                </label>
              ))}
              {(stageFilter?.length ?? 0) > 0 && (
                <button type="button" onClick={() => onStageFilterChange?.(null)} className="mt-2 text-xs font-semibold text-forest underline underline-offset-2 dark:text-leaf">
                  Show everyone
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div data-overlay className="absolute right-3 top-3 z-50 flex flex-col items-end gap-3 sm:right-5 sm:top-5">
          <div className="flex items-center gap-2">
            <div className={cn(pill, "flex rounded-full p-1")}>
              <span className="flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-1.5 text-sm font-semibold text-forest-foreground">
                <TreePine className="h-4 w-4" /> <span className="hidden sm:inline">Forest</span>
              </span>
              <button type="button" onClick={props.onShowList} className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition hover:bg-muted">
                <List className="h-4 w-4" /> <span className="hidden sm:inline">List</span>
              </button>
            </div>
            <div className={cn(pill, "hidden overflow-hidden rounded-full sm:flex")}>
              <button type="button" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out" className="grid h-11 w-11 place-items-center transition hover:bg-muted"><Minus className="h-4 w-4" /></button>
              <span className="my-2.5 w-px bg-border" />
              <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in" className="grid h-11 w-11 place-items-center transition hover:bg-muted"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
          <button type="button" onClick={sound.toggle} aria-label={sound.enabled ? "Mute forest sounds" : "Play forest sounds"} aria-pressed={sound.enabled} className={roundBtn}>
            {sound.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>

        {/* sun (moon at night) */}
        <button
          type="button"
          data-overlay
          onClick={pokeSun}
          aria-label="Tap the sun for sunshine"
          className="group absolute right-[12%] top-[20%] z-30 h-16 w-16 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber/60 sm:right-[8%] sm:top-[16%] sm:h-24 sm:w-24"
          style={{ opacity: Math.max(0.8, sunlight / 100) }}
        >
          <span className={cn("forest-sun-rays absolute -inset-[30%] dark:hidden", sunny && "forest-sun-burst")} aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="absolute left-1/2 top-0 h-[22%] w-1.5 -translate-x-1/2 rounded-full bg-[hsl(42_100%_62%/0.8)]" style={{ transform: `rotate(${i * 30}deg)`, transformOrigin: "50% 227%" }} />
            ))}
          </span>
          <span className="relative block h-full w-full rounded-full transition-transform group-hover:scale-110 dark:hidden" style={{ background: "radial-gradient(circle at 38% 34%, #fff7d1, #ffd24d 45%, #f5a310)", boxShadow: "0 0 50px 10px hsl(44 100% 65% / 0.65)" }} />
          <span className="relative hidden h-full w-full rounded-full bg-cream shadow-[0_0_40px_hsl(40_60%_90%/0.6)] transition-transform group-hover:scale-110 dark:block">
            <span className="absolute left-[22%] top-[22%] h-[18%] w-[18%] rounded-full bg-black/5" />
            <span className="absolute bottom-[26%] right-[26%] h-[13%] w-[13%] rounded-full bg-black/5" />
          </span>
        </button>

        {/* action clouds */}
        <button type="button" data-overlay onClick={props.onPlanSession} className="forest-action-cloud group absolute left-[22%] top-[11%] z-40 hidden lg:block">
          <CloudShape />
          <span className="absolute inset-0 flex flex-col items-center justify-center pt-3 text-[hsl(152_45%_14%)]">
            <CalendarDays className="mb-1 h-6 w-6 transition-transform group-hover:-rotate-6 group-hover:scale-110" />
            <span className="text-lg font-bold">Plan a session +</span>
          </span>
        </button>
        <button type="button" data-overlay onClick={props.onOpenParents} className="forest-action-cloud group absolute left-[55%] top-[8%] z-40 hidden lg:block [animation-delay:-3s]">
          <CloudShape />
          <span className="absolute inset-0 flex flex-col items-center justify-center pt-3 text-[hsl(152_45%_14%)]">
            <Link2 className="mb-1 h-6 w-6 transition-transform group-hover:rotate-12 group-hover:scale-110" />
            <span className="text-base font-bold">Parent connections · {parentsConnected}</span>
            <span className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-2">
              Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </span>
        </button>
        {/* compact versions for tablets and phones */}
        <div data-overlay className="absolute left-3 top-[4.25rem] z-40 flex gap-2 sm:left-5 sm:top-[4.75rem] lg:hidden">
          <button type="button" onClick={props.onPlanSession} className={cn(pill, "flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold hover:bg-white active:scale-95")}>
            <CalendarDays className="h-4 w-4" /> Plan
          </button>
          <button type="button" onClick={props.onOpenParents} className={cn(pill, "flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold hover:bg-white active:scale-95")}>
            <Link2 className="h-4 w-4" /> Parents · {parentsConnected}
          </button>
        </div>

        {/* bottom controls */}
        <button type="button" data-overlay onClick={explore} className={cn(pill, "absolute bottom-3 left-3 z-50 flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold hover:-translate-y-0.5 hover:bg-white active:scale-95 sm:bottom-5 sm:left-5")}>
          <Hand className={cn("h-4 w-4", hint && "forest-hand")} /> Explore your forest
        </button>
        <button type="button" data-overlay onClick={() => fit("all")} className={cn(pill, "absolute bottom-3 right-3 z-50 flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold hover:-translate-y-0.5 hover:bg-white active:scale-95 sm:bottom-5 sm:right-5")}>
          <Maximize2 className="h-4 w-4" /> <span className="hidden sm:inline">Fit to view</span>
        </button>
        {hint && students.length > 0 && !selected && (
          <p className="pointer-events-none absolute bottom-[4.5rem] left-1/2 z-50 hidden -translate-x-1/2 animate-fade-in whitespace-nowrap rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur sm:block">
            Drag to explore · tap a tree, a cloud or the sun
          </p>
        )}

        {/* empty forest */}
        {students.length === 0 && (
          <div data-overlay className="absolute inset-0 z-[55] grid place-items-center p-4">
            <div className="animate-pop-in rounded-3xl bg-[hsl(40_60%_97%/0.95)] px-8 py-6 text-center shadow-xl backdrop-blur dark:bg-slate-900/90">
              <SproutIcon className="mx-auto mb-2 h-10 w-10 text-leaf" />
              <p className="text-xl font-bold">Your forest is waiting</p>
              <p className="mt-1 text-sm text-muted-foreground">Add a learner to plant their first seed.</p>
              <button type="button" onClick={props.onAddStudent} className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 font-semibold text-forest-foreground shadow-md transition hover:brightness-110 active:scale-95">
                <Plus className="h-4 w-4" /> Add student
              </button>
            </div>
          </div>
        )}

        {/* learner card */}
        {selected && stage && (
          <div
            data-overlay
            role="dialog"
            aria-label={`${selected.student.name} actions`}
            className={cn(
              "absolute z-[60] w-[290px] animate-pop-in rounded-3xl border-2 border-[hsl(40_50%_85%)] bg-[hsl(42_70%_97%)] p-5 text-[hsl(152_30%_14%)] shadow-[0_24px_50px_-18px_rgb(0_0_0/0.5)] transition-[left,top] duration-500 ease-out dark:border-slate-700 dark:bg-slate-900 dark:text-cream",
              narrow && "inset-x-3 bottom-3 w-auto"
            )}
            style={card ? { left: card.left, top: card.top } : undefined}
          >
            {card && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-14 h-5 w-5 rotate-45 border-[hsl(40_50%_85%)] bg-[hsl(42_70%_97%)] dark:border-slate-700 dark:bg-slate-900",
                  card.side === "right" ? "-left-[11px] border-b-2 border-l-2" : "-right-[11px] border-r-2 border-t-2"
                )}
              />
            )}
            <button type="button" onClick={() => onSelect(null)} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-black/5 hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 pr-6">
              <LeafIcon color={STAGE_LABELS[stage].leaf} className="h-6 w-6 shrink-0" />
              <h3 className="truncate text-xl font-extrabold">{selected.student.name}</h3>
            </div>
            <p className="mt-0.5 pl-8 text-xs font-medium text-muted-foreground">Grade {selected.student.grade} · {STAGE_LABELS[stage].label}</p>
            <p className="mt-3 flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selected.student.testCount === 0
                ? "No assessments yet"
                : `${selected.student.testCount} session${selected.student.testCount > 1 ? "s" : ""}${lastDate ? ` · last on ${lastDate}` : ""}`}
            </p>
            {selected.student.status === "flagged" && (
              <p className="mt-2 rounded-xl bg-amber/15 px-3 py-2 text-xs font-medium text-[hsl(30_80%_28%)] dark:text-amber">
                Worth a closer look. Open the learning history for details.
              </p>
            )}
            <button
              type="button"
              onClick={() => { sound.play("chime"); props.onStartScreening(selected.student); }}
              className="group mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-forest px-4 py-3 text-base font-bold text-forest-foreground shadow-[0_5px_0_hsl(152_64%_10%)] transition hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_hsl(152_64%_10%)]"
            >
              {stage === "seed" ? "Start first session" : stage === "sprout" ? "Continue screening" : "Start new screening"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <div className="mt-3 flex items-center justify-center gap-4 text-sm font-semibold">
              <button type="button" onClick={() => props.onViewProfile(selected.student)} className="underline underline-offset-4 hover:text-forest dark:hover:text-leaf">View profile</button>
              {selected.student.testCount > 0 && (
                <button type="button" onClick={() => props.onViewHistory(selected.student)} className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-forest dark:hover:text-leaf">
                  <TrendingUp className="h-3.5 w-3.5" /> Learning history
                </button>
              )}
            </div>
            <button type="button" onClick={() => setMoreTests((v) => !v)} aria-expanded={moreTests} className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <Lock className="h-3 w-3" /> {moreTests ? "Hide single tests" : "Single tests (needs your permission)"}
            </button>
            {moreTests && (
              <div className="mt-2 grid animate-fade-in grid-cols-2 gap-2">
                {([
                  ["dyslexia", "Reading", BookOpen],
                  ["dyscalculia", "Math", Calculator],
                  ["dysgraphia", "Writing", Pencil],
                ] as const).map(([test, label, Icon]) => (
                  <button key={test} type="button" onClick={() => props.onSingleTest(test, selected.student)} className="flex items-center justify-center gap-1.5 rounded-xl border bg-white/70 px-2 py-2 text-xs font-semibold transition hover:-translate-y-0.5 hover:border-forest hover:bg-white dark:bg-slate-800">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
                <button type="button" onClick={() => props.onPerception(selected.student)} className="flex items-center justify-center gap-1.5 rounded-xl border bg-white/70 px-2 py-2 text-xs font-semibold transition hover:-translate-y-0.5 hover:border-forest hover:bg-white dark:bg-slate-800">
                  <Eye className="h-3.5 w-3.5" /> Perception
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* legend */}
      <div className="flex flex-col gap-2 px-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {(Object.keys(STAGE_LABELS) as TreeStage[]).filter((s) => STAGE_LABELS[s].legend).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStage(s)}
              aria-pressed={stageFilter?.includes(s) ?? false}
              className={cn(
                "group flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-muted",
                stageFilter?.includes(s) && "bg-forest/10 ring-1 ring-forest/40"
              )}
            >
              <LeafIcon color={STAGE_LABELS[s].leaf} className="h-6 w-6 transition-transform group-hover:-rotate-12 group-hover:scale-110" />
              {STAGE_LABELS[s].label}
            </button>
          ))}
        </div>
        <p className="text-sm italic text-muted-foreground">Growth reflects participation, not ability.</p>
      </div>
    </div>
  );
}

function CloudShape() {
  return (
    <svg width="280" height="136" viewBox="0 0 290 140" className="drop-shadow-[0_10px_14px_rgb(30_60_110/0.18)] transition-transform duration-300 group-hover:scale-[1.06]" aria-hidden>
      <g fill="white">
        <ellipse cx="145" cy="98" rx="132" ry="34" />
        <circle cx="88" cy="74" r="44" />
        <circle cx="150" cy="56" r="54" />
        <circle cx="212" cy="78" r="38" />
      </g>
      <ellipse cx="140" cy="40" rx="40" ry="10" fill="white" opacity="0.6" />
    </svg>
  );
}
