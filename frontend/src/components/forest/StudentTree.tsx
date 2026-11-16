import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;

/** Growth follows participation (sessions taken), never scores. */
export type TreeStage = "seed" | "sprout" | "tree" | "blossom";

export const STAGE_LABELS: Record<TreeStage, { label: string; hint: string; leaf: string; legend: boolean }> = {
  seed: { label: "Not started", hint: "no sessions yet", leaf: "hsl(24 85% 55%)", legend: true },
  sprout: { label: "In progress", hint: "1-2 sessions", leaf: "hsl(68 70% 48%)", legend: true },
  tree: { label: "Completed a session", hint: "3+ sessions", leaf: "hsl(130 55% 40%)", legend: true },
  blossom: { label: "Blossoming", hint: "6+ sessions", leaf: "hsl(130 55% 40%)", legend: false },
};

export function getTreeStage(testCount: number): TreeStage {
  if (testCount <= 0) return "seed";
  if (testCount < 3) return "sprout";
  if (testCount < 6) return "tree";
  return "blossom";
}

export const STAGE_WIDTH: Record<TreeStage, number> = { seed: 120, sprout: 150, tree: 230, blossom: 250 };

export function statusLine(stage: TreeStage) {
  return stage === "seed" ? "First session pending" : stage === "sprout" ? "Screening in progress" : "View learning history";
}

/** Small leaf glyph used in the legend and the popover. */
export function LeafIcon({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M4 20C4 10 10 4 21 3c0 11-6 17-17 17Z" fill={color} />
      <path d="M4 20 15 9" stroke="hsl(40 40% 96% / 0.8)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Leaf({ x, y, r, s = 1, c }: { x: number; y: number; r: number; s?: number; c: string }) {
  return (
    <path
      d="M0 0 C 8 -10, 22 -10, 30 0 C 22 10, 8 10, 0 0 Z"
      fill={c}
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
    />
  );
}

/** Seedling in a soil mound: two big leaves and a curl. */
function Seedling() {
  return (
    <svg viewBox="0 0 120 130" className="h-full w-full overflow-visible">
      <ellipse cx="60" cy="122" rx="44" ry="9" fill="hsl(25 45% 22% / 0.35)" />
      <path d="M20 122 Q 60 92 100 122 Z" fill="hsl(25 45% 30%)" />
      <path d="M30 120 Q 60 100 90 120" fill="none" stroke="hsl(25 40% 42%)" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 112 C 58 90, 62 72, 60 54" stroke="hsl(100 45% 32%)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g className="forest-leaf-pair">
        <path d="M60 70 C 40 50, 18 58, 14 44 C 34 34, 56 46, 60 70 Z" fill="hsl(96 60% 45%)" />
        <path d="M60 70 C 40 52, 26 52, 18 46" stroke="hsl(100 50% 32%)" strokeWidth="1.4" fill="none" />
        <path d="M60 62 C 80 40, 104 46, 108 30 C 86 22, 62 36, 60 62 Z" fill="hsl(90 62% 50%)" />
        <path d="M60 62 C 80 42, 94 40, 104 33" stroke="hsl(100 50% 34%)" strokeWidth="1.4" fill="none" />
        <path d="M60 54 C 54 44, 58 34, 66 34 C 68 42, 64 50, 60 54 Z" fill="hsl(85 65% 58%)" />
      </g>
    </svg>
  );
}

/** Young tree: thin trunk, small crown. */
function Sprout() {
  const c = ["hsl(96 55% 40%)", "hsl(90 60% 47%)", "hsl(80 65% 55%)"];
  return (
    <svg viewBox="0 0 150 170" className="h-full w-full overflow-visible">
      <ellipse cx="75" cy="162" rx="50" ry="9" fill="hsl(25 45% 22% / 0.3)" />
      <path d="M70 162 C 72 130, 68 110, 74 86 L 80 86 C 78 110, 82 132, 82 162 Z" fill="hsl(28 45% 34%)" />
      <path d="M76 116 C 64 106, 56 102, 46 104" stroke="hsl(28 45% 34%)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="54" cy="84" r="28" fill={c[0]} />
      <circle cx="98" cy="80" r="28" fill={c[0]} />
      <circle cx="76" cy="58" r="34" fill={c[1]} />
      <circle cx="64" cy="48" r="14" fill={c[2]} opacity="0.75" />
      <circle cx="94" cy="62" r="10" fill={c[2]} opacity="0.6" />
      <Leaf x={40} y={106} r={150} s={0.8} c={c[1]} />
    </svg>
  );
}

/** Grown tree: gnarled trunk, layered crown, optional blossoms. */
function GrownTree({ blossom }: { blossom: boolean }) {
  const shade = ["hsl(110 50% 28%)", "hsl(100 52% 36%)", "hsl(92 58% 44%)", "hsl(82 66% 56%)"];
  const crown = [
    [52, 112, 40], [176, 110, 40], [80, 82, 46], [148, 80, 46], [114, 60, 52], [60, 64, 30], [170, 62, 30], [114, 104, 44],
  ];
  return (
    <svg viewBox="0 0 230 240" className="h-full w-full overflow-visible">
      <ellipse cx="115" cy="230" rx="86" ry="12" fill="hsl(25 45% 22% / 0.3)" />
      {/* roots and trunk */}
      <path
        d="M78 232 C 92 222, 98 206, 100 180 C 100 160, 92 146, 80 132 L 92 128 C 104 140, 110 150, 112 160 C 116 146, 124 136, 140 126 L 150 132 C 134 146, 128 164, 128 184 C 130 206, 136 222, 154 232 Z"
        fill="hsl(26 48% 30%)"
      />
      <path d="M104 220 C 108 196, 106 170, 98 150" stroke="hsl(26 40% 22%)" strokeWidth="3" fill="none" opacity="0.6" />
      <path d="M124 224 C 120 200, 122 176, 132 156" stroke="hsl(30 50% 44%)" strokeWidth="3" fill="none" opacity="0.6" />
      {/* crown: dark layer, mid layer, highlights */}
      {crown.map(([x, y, r], i) => <circle key={`a${i}`} cx={x} cy={y + 6} r={r} fill={shade[0]} />)}
      {crown.map(([x, y, r], i) => <circle key={`b${i}`} cx={x} cy={y} r={r * 0.92} fill={shade[1]} />)}
      {crown.map(([x, y, r], i) => <circle key={`c${i}`} cx={x - r * 0.22} cy={y - r * 0.25} r={r * 0.55} fill={shade[2]} />)}
      {crown.map(([x, y, r], i) => <circle key={`d${i}`} cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.22} fill={shade[3]} opacity="0.8" />)}
      <Leaf x={20} y={128} r={160} c={shade[2]} />
      <Leaf x={210} y={126} r={20} c={shade[2]} />
      {blossom && (
        <g className="forest-blossoms">
          {[[60, 90], [100, 50], [150, 66], [184, 104], [126, 98], [74, 128], [164, 132], [40, 110]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {[0, 72, 144, 216, 288].map((r) => (
                <ellipse key={r} cx="0" cy="-5" rx="3.6" ry="5.8" fill={i % 2 ? "hsl(28 95% 70%)" : "hsl(340 85% 82%)"} transform={`rotate(${r})`} />
              ))}
              <circle r="2.6" fill="hsl(45 100% 60%)" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

const FALLING = [
  { x: -30, r: -60, d: 0 },
  { x: 24, r: 70, d: 0.1 },
  { x: -8, r: 140, d: 0.2 },
  { x: 36, r: -110, d: 0.05 },
  { x: -42, r: 40, d: 0.15 },
];

interface StudentTreeProps {
  student: Student;
  testCount: number;
  selected?: boolean;
  dimmed?: boolean;
  watered?: boolean;
  swayDuration?: number;
  swayDelay?: number;
  onSelect: () => void;
}

export const StudentTree = memo(function StudentTree({
  student,
  testCount,
  selected = false,
  dimmed = false,
  watered = false,
  swayDuration = 5,
  swayDelay = 0,
  onSelect,
}: StudentTreeProps) {
  const stage = getTreeStage(testCount);
  const [bouncing, setBouncing] = useState(false);
  const [burst, setBurst] = useState(0);
  const [grew, setGrew] = useState(false);
  const prev = useRef(stage);

  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(0), 1500);
    return () => clearTimeout(t);
  }, [burst]);

  // celebrate when a tree moves up a stage (e.g. right after a session)
  useEffect(() => {
    if (prev.current === stage) return;
    prev.current = stage;
    setGrew(true);
    const t = window.setTimeout(() => setGrew(false), 1800);
    return () => clearTimeout(t);
  }, [stage]);

  const width = STAGE_WIDTH[stage];
  const firstName = student.name.split(" ")[0];
  const flagged = student.status === "flagged";
  const art = stage === "seed" ? <Seedling /> : stage === "sprout" ? <Sprout /> : <GrownTree blossom={stage === "blossom"} />;

  return (
    <div
      className={cn("relative flex flex-col items-center transition-[opacity,filter] duration-300", dimmed && "opacity-35 saturate-50")}
      style={{ width }}
    >
      <button
        type="button"
        data-tree
        onClick={(e) => {
          e.stopPropagation();
          setBouncing(false);
          requestAnimationFrame(() => setBouncing(true));
          setBurst((n) => n + 1);
          onSelect();
        }}
        aria-label={`${student.name}, grade ${student.grade}: ${STAGE_LABELS[stage].label}, ${testCount} sessions${flagged ? ", worth a closer look" : ""}`}
        aria-pressed={selected}
        className="group relative flex w-full flex-col items-center rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber/70"
      >
        {/* golden ring at the base of the selected tree */}
        <span
          aria-hidden
          className={cn(
            "forest-ring pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%] border-[3px] transition-opacity duration-300",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-60"
          )}
          style={{ width: width * 1.05, height: 46, bottom: 26 }}
        />
        <span
          onAnimationEnd={(e) => e.animationName === "tree-bounce" && setBouncing(false)}
          className={cn(
            "forest-tree relative block",
            bouncing && "forest-tree-bounce",
            watered && "forest-tree-watered",
            grew && "animate-pop-in"
          )}
          style={{
            width,
            height: stage === "seed" ? 130 : stage === "sprout" ? 170 : 240,
            ...(bouncing || watered ? {} : { animationDuration: `${swayDuration}s`, animationDelay: `${swayDelay}s` }),
          }}
        >
          <span className="block h-full w-full transition-transform duration-300 group-hover:scale-[1.04]">{art}</span>
          {burst > 0 &&
            FALLING.map((l, i) => (
              <span
                key={`${burst}-${i}`}
                className="forest-leaf pointer-events-none absolute left-1/2 top-[30%]"
                style={{ ["--lx" as string]: `${l.x}px`, ["--lr" as string]: `${l.r}deg`, animationDelay: `${l.d}s` }}
                aria-hidden
              >
                {stage === "blossom" && i % 2 ? (
                  <span className="block h-3 w-3 rounded-full bg-[hsl(340_85%_82%)]" />
                ) : (
                  <LeafIcon color={i % 2 ? "hsl(90 60% 47%)" : "hsl(110 50% 36%)"} className="h-4 w-4" />
                )}
              </span>
            ))}
          {watered && <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 animate-pop-in text-xl" aria-hidden>✨</span>}
          {grew && (
            <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 animate-pop-in whitespace-nowrap rounded-full bg-forest px-3 py-1 text-xs font-bold text-forest-foreground shadow-lg" aria-hidden>
              Grew! {STAGE_LABELS[stage].label}
            </span>
          )}
        </span>

        {/* wooden name sign */}
        <span className="forest-sign relative -mt-9 inline-flex items-center gap-1.5 rounded-xl border-2 border-[hsl(26_45%_24%)] bg-[linear-gradient(180deg,hsl(32_62%_62%),hsl(28_55%_46%))] px-5 py-1.5 text-lg font-extrabold text-[hsl(26_60%_14%)] shadow-[0_4px_0_hsl(26_45%_24%),0_10px_18px_-6px_rgb(0_0_0/0.45)] [text-shadow:0_1px_0_hsl(36_80%_80%/0.6)]">
          <span aria-hidden className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[hsl(26_45%_24%)]" />
          <span aria-hidden className="absolute right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[hsl(26_45%_24%)]" />
          <span className="max-w-[150px] truncate">{firstName}</span>
          {flagged && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber ring-2 ring-[hsl(36_90%_85%)]" title="Worth a closer look" />}
        </span>
        <span
          className={cn(
            "mt-2 whitespace-nowrap rounded-full px-3 py-0.5 text-[13px] font-semibold shadow-sm transition-colors",
            stage === "seed" ? "bg-[hsl(40_70%_94%)] text-[hsl(24_70%_30%)]" : "bg-white/90 text-[hsl(152_40%_20%)]",
            "group-hover:bg-forest group-hover:text-forest-foreground"
          )}
        >
          {statusLine(stage)}
        </span>
      </button>
    </div>
  );
});
