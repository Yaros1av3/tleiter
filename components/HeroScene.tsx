"use client";

/*
 * Иллюстрированные фоны для страниц мероприятий.
 * Нарисованы простыми фигурами (SVG) — без картинок и смайликов,
 * поэтому всегда чёткие и лёгкие. Смотрят «в угол» справа и снизу,
 * чтобы не мешать заголовку.
 */

type Dot = [number, number, number];

const STARS: Dot[] = [
  [30, 24, 1.6], [78, 60, 1.1], [128, 18, 1.4], [176, 44, 1], [232, 20, 1.7],
  [270, 58, 1.2], [318, 26, 1.5], [362, 52, 1.1], [388, 14, 1.3], [54, 108, 1],
  [206, 96, 1.2], [296, 104, 1], [350, 92, 1.4], [14, 66, 1], [150, 84, 0.9],
];

const SNOW: Dot[] = [
  [22, 40, 2.4], [60, 120, 1.8], [96, 30, 2], [134, 96, 2.6], [170, 150, 1.8],
  [210, 52, 2.2], [248, 128, 2.4], [284, 36, 1.8], [322, 108, 2.6], [356, 70, 2],
  [384, 150, 2.2], [44, 190, 2], [118, 170, 1.6], [196, 196, 2.2], [262, 176, 1.8],
  [336, 186, 2.4], [376, 28, 1.6], [10, 150, 1.8], [150, 60, 1.4], [300, 150, 1.4],
];

function Tree({ x, base, h, fill }: { x: number; base: number; h: number; fill: string }) {
  const w = h * 0.55;

  return (
    <g>
      <rect x={x - w * 0.07} y={base - h * 0.08} width={w * 0.14} height={h * 0.1} fill="#4a2f1b" />
      <polygon points={`${x},${base - h} ${x - w * 0.34},${base - h * 0.55} ${x + w * 0.34},${base - h * 0.55}`} fill={fill} />
      <polygon points={`${x},${base - h * 0.78} ${x - w * 0.42},${base - h * 0.3} ${x + w * 0.42},${base - h * 0.3}`} fill={fill} />
      <polygon points={`${x},${base - h * 0.5} ${x - w * 0.5},${base - h * 0.06} ${x + w * 0.5},${base - h * 0.06}`} fill={fill} />
    </g>
  );
}

function Star5({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`;
  }).join(" ");

  return <polygon points={pts} fill={fill} />;
}

function Scene({ scene }: { scene: string }) {
  switch (scene) {
    case "christmas":
      return (
        <>
          {STARS.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#ffe9a8" opacity={0.85} />
          ))}
          <circle cx={332} cy={52} r={34} fill="#ffe9a8" opacity={0.12} />
          <circle cx={332} cy={52} r={20} fill="#ffe9a8" opacity={0.2} />
          <Star5 cx={332} cy={52} r={13} fill="#ffd45e" />
          {SNOW.map(([x, y, r], i) => (
            <circle key={`s${i}`} cx={x} cy={y} r={r} fill="#fff" opacity={0.75} />
          ))}
          <path d="M0 214 Q 80 196 160 210 T 320 204 T 400 212 L400 240 L0 240Z" fill="#fff" opacity={0.92} />
          <Tree x={296} base={216} h={96} fill="#0c4a37" />
          <Tree x={352} base={220} h={132} fill="#0a3d2d" />
          <Star5 cx={352} cy={86} r={8} fill="#ffd45e" />
          <Tree x={246} base={222} h={62} fill="#116148" />
          <Tree x={382} base={226} h={70} fill="#116148" />
          {[[330, 150, "#ff6b5e"], [342, 172, "#ffd45e"], [362, 160, "#8fd3ff"], [348, 190, "#ff6b5e"], [372, 182, "#ffd45e"]].map(
            ([x, y, c], i) => (
              <circle key={`b${i}`} cx={x as number} cy={y as number} r={3.4} fill={c as string} />
            ),
          )}
        </>
      );

    case "winter":
      return (
        <>
          <circle cx={330} cy={50} r={28} fill="#fff" opacity={0.25} />
          <circle cx={330} cy={50} r={16} fill="#fff" opacity={0.55} />
          {SNOW.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r + 0.4} fill="#fff" opacity={0.8} />
          ))}
          <polygon points="150,240 240,110 330,240" fill="#a9c9f1" opacity={0.55} />
          <polygon points="240,110 215,148 240,142 262,150" fill="#fff" opacity={0.9} />
          <polygon points="250,240 340,92 430,240" fill="#dcebff" opacity={0.75} />
          <polygon points="340,92 313,134 340,126 364,136" fill="#fff" />
          <path d="M0 220 Q 100 204 200 218 T 400 214 L400 240 L0 240Z" fill="#fff" opacity={0.95} />
        </>
      );

    case "camp":
      return (
        <>
          <circle cx={300} cy={150} r={46} fill="#ffe08a" opacity={0.35} />
          <circle cx={300} cy={150} r={30} fill="#ffd45e" opacity={0.9} />
          <path d="M0 196 Q 90 160 180 190 T 400 176 L400 240 L0 240Z" fill="#3f5b34" opacity={0.85} />
          <path d="M0 220 Q 120 190 230 214 T 400 206 L400 240 L0 240Z" fill="#2c4426" />
          <polygon points="300,150 342,226 258,226" fill="#f5efe0" />
          <polygon points="300,150 316,226 284,226" fill="#c9553a" />
          <line x1={300} y1={146} x2={300} y2={132} stroke="#f5efe0" strokeWidth={2} />
          <Tree x={376} base={232} h={90} fill="#223b1f" />
          <Tree x={224} base={234} h={64} fill="#223b1f" />
          <Tree x={354} base={236} h={56} fill="#2d4c28" />
        </>
      );

    case "party":
      return (
        <>
          {Array.from({ length: 34 }, (_, i) => {
            const x = (i * 47 + 23) % 400;
            const y = (i * 71 + 11) % 200;
            const colors = ["#ffe066", "#ffffff", "#ff8fb1", "#7ee0ff", "#b8f28b"];
            const color = colors[i % colors.length];
            const rot = (i * 37) % 180;

            return i % 3 === 0 ? (
              <circle key={i} cx={x} cy={y} r={3 + (i % 3)} fill={color} opacity={0.85} />
            ) : (
              <rect
                key={i}
                x={x}
                y={y}
                width={4 + (i % 4)}
                height={9 + (i % 5)}
                rx={1.5}
                fill={color}
                opacity={0.85}
                transform={`rotate(${rot} ${x} ${y})`}
              />
            );
          })}
          <path d="M0 40 Q 100 90 200 40 T 400 60" fill="none" stroke="#fff" strokeWidth={2} opacity={0.35} />
          <path d="M0 70 Q 100 120 200 70 T 400 90" fill="none" stroke="#ffe066" strokeWidth={2} opacity={0.45} />
        </>
      );

    case "sea":
      return (
        <>
          <circle cx={324} cy={58} r={40} fill="#fff" opacity={0.18} />
          <circle cx={324} cy={58} r={24} fill="#fff7c2" opacity={0.95} />
          <path d="M0 176 Q 50 160 100 176 T 200 176 T 300 176 T 400 176 L400 240 L0 240Z" fill="#ffffff" opacity={0.22} />
          <path d="M0 196 Q 50 180 100 196 T 200 196 T 300 196 T 400 196 L400 240 L0 240Z" fill="#ffffff" opacity={0.3} />
          <path d="M0 216 Q 50 200 100 216 T 200 216 T 300 216 T 400 216 L400 240 L0 240Z" fill="#ffffff" opacity={0.45} />
        </>
      );

    case "sun":
      return (
        <>
          <circle cx={330} cy={64} r={64} fill="#fff" opacity={0.12} />
          <circle cx={330} cy={64} r={40} fill="#fff" opacity={0.2} />
          <circle cx={330} cy={64} r={24} fill="#fff7c2" />
          <path d="M0 214 Q 100 190 200 208 T 400 200 L400 240 L0 240Z" fill="#fff" opacity={0.25} />
        </>
      );

    case "clouds":
      return (
        <>
          {[[300, 56, 1], [90, 150, 0.8], [350, 170, 0.7]].map(([x, y, s], i) => (
            <g key={i} fill="#fff" opacity={0.85} transform={`translate(${x} ${y}) scale(${s})`}>
              <circle cx={0} cy={0} r={22} />
              <circle cx={26} cy={6} r={18} />
              <circle cx={-26} cy={8} r={16} />
              <rect x={-40} y={6} width={82} height={20} rx={10} />
            </g>
          ))}
        </>
      );

    case "forest":
      return (
        <>
          <path d="M0 196 Q 100 170 200 192 T 400 184 L400 240 L0 240Z" fill="#fff" opacity={0.15} />
          <Tree x={380} base={236} h={118} fill="#0f5d4a" />
          <Tree x={330} base={240} h={82} fill="#177a60" />
          <Tree x={270} base={240} h={60} fill="#0f5d4a" />
          <Tree x={30} base={244} h={70} fill="#177a60" />
        </>
      );

    case "sunset":
      return (
        <>
          <circle cx={300} cy={190} r={70} fill="#fff7c2" opacity={0.35} />
          <circle cx={300} cy={190} r={44} fill="#ffe08a" opacity={0.95} />
          <path d="M0 206 Q 90 182 180 204 T 400 196 L400 240 L0 240Z" fill="#7a2a5a" opacity={0.55} />
          <path d="M0 224 Q 120 204 240 222 T 400 216 L400 240 L0 240Z" fill="#5b1f45" opacity={0.75} />
        </>
      );

    case "stars":
      return (
        <>
          {STARS.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r + 0.3} fill="#fff" opacity={0.85} />
          ))}
          <circle cx={326} cy={62} r={30} fill="#fff" opacity={0.12} />
          <path
            d="M326 36 A 26 26 0 1 0 352 70 A 21 21 0 1 1 326 36Z"
            fill="#fff4c7"
          />
        </>
      );

    default:
      return null;
  }
}

export default function HeroScene({ scene }: { scene?: string }) {
  if (!scene) return null;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <Scene scene={scene} />
    </svg>
  );
}