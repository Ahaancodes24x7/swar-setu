import { memo } from "react";

export const WORLD_H = 720;

/** Stable pseudo-random number in [0, 1) from a string. */
export function seeded(key: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** Closed ridge path: a smooth skyline at height `base` with gentle bumps, filled down to the bottom. */
function ridge(w: number, base: number, amp: number, period: number, seed: string, bottom = WORLD_H) {
  const step = 40;
  const pts: string[] = [];
  const p1 = seeded(seed, 1) * 6.28;
  const p2 = seeded(seed, 2) * 6.28;
  for (let x = -step; x <= w + step; x += step) {
    const y =
      base -
      amp * (0.6 * Math.sin(x / period + p1) + 0.4 * Math.sin(x / (period * 0.43) + p2)) -
      amp * 0.25 * Math.sin(x / (period * 0.17) + p1 * 2);
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return `M${-step},${bottom} L${pts.join(" L")} L${w + step},${bottom} Z`;
}

function Flower({ x, y, c, s = 1 }: { x: number; y: number; c: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C -1 10, 1 16, 0 22" stroke="hsl(110 45% 32%)" strokeWidth="1.6" fill="none" />
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="0" cy="-5" rx="3.2" ry="5.2" fill={c} transform={`rotate(${r})`} />
      ))}
      <circle r="2.6" fill="hsl(45 100% 60%)" />
    </g>
  );
}

function Bush({ x, y, s = 1, hue = 105 }: { x: number; y: number; s?: number; hue?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="4" rx="46" ry="8" fill="hsl(110 40% 25% / 0.25)" />
      <circle cx="-24" cy="-6" r="20" fill={`hsl(${hue} 48% 34%)`} />
      <circle cx="18" cy="-8" r="22" fill={`hsl(${hue} 48% 36%)`} />
      <circle cx="-2" cy="-20" r="24" fill={`hsl(${hue} 52% 42%)`} />
      <circle cx="-10" cy="-26" r="10" fill={`hsl(${hue - 10} 60% 55% / 0.7)`} />
      <circle cx="14" cy="-20" r="8" fill={`hsl(${hue - 10} 60% 58% / 0.6)`} />
    </g>
  );
}

/** Distant tree line: soft round crowns along a hill. */
function TreeLine({ w, y, seed, hue, light }: { w: number; y: number; seed: string; hue: number; light: number }) {
  const n = Math.ceil(w / 34);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = i * 34 + seeded(seed + i) * 20;
        const r = 14 + seeded(seed + i, 3) * 16;
        const yy = y + Math.sin(i * 0.7) * 10 + seeded(seed + i, 5) * 8;
        return <circle key={i} cx={x} cy={yy} r={r} fill={`hsl(${hue} 42% ${light + seeded(seed + i, 7) * 8}%)`} />;
      })}
    </g>
  );
}

/** Painted meadow world: sky, mountains, hills, stepping-stone path, pond with a waterfall, flowers. */
export const ForestLandscape = memo(function ForestLandscape({ width, night }: { width: number; night: boolean }) {
  const w = width;
  const H = WORLD_H;
  // stepping stones wind from bottom-centre up into the meadow
  const stones = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    const x = w * 0.5 + Math.sin(t * 3.2 + 0.6) * w * 0.07 - t * w * 0.02;
    const y = H - 8 - t * 230;
    const s = 1 - t * 0.68;
    return { x, y, rx: 46 * s, ry: 15 * s };
  });
  const pondX = w - 210;
  const flowerColors = ["hsl(0 0% 100%)", "hsl(28 95% 58%)", "hsl(340 80% 72%)", "hsl(48 100% 62%)", "hsl(14 90% 60%)"];
  const flowers = Array.from({ length: Math.ceil(w / 38) }, (_, i) => ({
    x: seeded(`f${i}`) * w,
    y: H - 20 - seeded(`f${i}`, 2) * 120,
    c: flowerColors[i % flowerColors.length],
    s: 0.7 + seeded(`f${i}`, 4) * 0.6,
  }))
    .filter((f) => f.x < w - 400 || f.y > 610)
    .sort((a, b) => a.y - b.y);

  return (
    <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} className="absolute inset-0 block" aria-hidden>
      <defs>
        <linearGradient id="fl-sky" x1="0" y1="0" x2="0" y2="1">
          {night ? (
            <>
              <stop offset="0" stopColor="hsl(230 55% 12%)" />
              <stop offset="0.55" stopColor="hsl(226 45% 24%)" />
              <stop offset="1" stopColor="hsl(200 35% 32%)" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="hsl(205 85% 58%)" />
              <stop offset="0.5" stopColor="hsl(200 85% 76%)" />
              <stop offset="1" stopColor="hsl(55 70% 88%)" />
            </>
          )}
        </linearGradient>
        <linearGradient id="fl-meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "hsl(120 30% 24%)" : "hsl(95 58% 52%)"} />
          <stop offset="1" stopColor={night ? "hsl(130 35% 14%)" : "hsl(105 55% 34%)"} />
        </linearGradient>
        <linearGradient id="fl-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(190 85% 72%)" />
          <stop offset="1" stopColor="hsl(200 80% 50%)" />
        </linearGradient>
        <radialGradient id="fl-haze" cx="0.85" cy="0.12" r="0.7">
          <stop offset="0" stopColor={night ? "hsl(220 60% 80% / 0.18)" : "hsl(50 100% 85% / 0.75)"} />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width={w} height={H} fill="url(#fl-sky)" />
      <rect width={w} height={H} fill="url(#fl-haze)" />

      {/* far mountains, hazy blue */}
      <path d={ridge(w, 360, 60, 160, "m1")} fill={night ? "hsl(222 30% 30%)" : "hsl(200 35% 66%)"} />
      <path d={ridge(w, 392, 46, 120, "m2")} fill={night ? "hsl(200 25% 26%)" : "hsl(170 30% 56%)"} />
      <TreeLine w={w} y={405} seed="tl1" hue={140} light={night ? 18 : 36} />
      {/* rolling hills */}
      <path d={ridge(w, 430, 30, 200, "h1")} fill={night ? "hsl(130 28% 22%)" : "hsl(110 45% 46%)"} />
      <TreeLine w={w} y={440} seed="tl2" hue={120} light={night ? 16 : 32} />
      <path d={ridge(w, 462, 20, 260, "h2")} fill="url(#fl-meadow)" />

      {/* pond and waterfall on the right */}
      <g>
        <path d={`M${pondX + 120} 380 q 18 -6 40 2 l 6 150 q -24 10 -52 0 z`} fill="hsl(25 18% 48%)" />
        <rect className="forest-waterfall" x={pondX + 128} y={386} width={30} height={150} rx={8} fill="url(#fl-water)" opacity={0.92} />
        <ellipse cx={pondX + 90} cy={560} rx={150} ry={34} fill="url(#fl-water)" opacity={0.95} />
        <ellipse className="forest-ripple" cx={pondX + 140} cy={552} rx={30} ry={6} fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="2" />
        <ellipse cx={pondX + 40} cy={566} rx={36} ry={5} fill="white" opacity="0.3" />
        <ellipse cx={pondX - 20} cy={568} rx={30} ry={14} fill="hsl(25 12% 60%)" />
        <ellipse cx={pondX + 200} cy={570} rx={34} ry={16} fill="hsl(25 12% 56%)" />
      </g>

      {/* stepping-stone path */}
      {stones.map((s, i) => (
        <g key={i}>
          <ellipse cx={s.x} cy={s.y + 3} rx={s.rx} ry={s.ry} fill="hsl(30 20% 30% / 0.35)" />
          <ellipse cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill={night ? "hsl(35 15% 50%)" : "hsl(38 30% 80%)"} />
          <ellipse cx={s.x - s.rx * 0.2} cy={s.y - s.ry * 0.25} rx={s.rx * 0.55} ry={s.ry * 0.4} fill="white" opacity="0.25" />
        </g>
      ))}

      {/* bushes along the edges */}
      <Bush x={60} y={H - 24} s={1.5} />
      <Bush x={w - 70} y={H - 20} s={1.4} hue={112} />
      {Array.from({ length: Math.ceil(w / 420) }, (_, i) => (
        <Bush key={i} x={260 + i * 420 + seeded(`b${i}`) * 80} y={505 + seeded(`b${i}`, 2) * 30} s={0.55 + seeded(`b${i}`, 3) * 0.3} hue={100 + seeded(`b${i}`, 4) * 20} />
      ))}

      {/* flowers in the grass */}
      {flowers.map((f, i) => (
        <Flower key={i} x={f.x} y={f.y} c={f.c} s={f.s} />
      ))}
    </svg>
  );
});
