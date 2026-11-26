"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Award, BookOpen, ChevronDown, Compass, Crown, Flame, Shield, Sprout, Star, Trophy, Zap } from "lucide-react";

import {
  ACHIEVEMENTS,
  addDays,
  computeStats,
  levelOf,
  verseOfDay,
  weekStart,
  type Achievement,
  type Lang,
  type Level,
} from "@/lib/teensProgress";

const TX = {
  de: {
    series: "Serie",
    weeks: (n: number) => (n === 1 ? "Unterricht in Folge" : "Unterrichte in Folge"),
    startHint: "Trag dich für den Unterricht ein und starte deine Serie.",
    broken: "Die Serie ist unterbrochen. Starte eine neue.",
    best: "Rekord",
    lessons: "Unterrichte",
    level: "Level",
    toNext: "bis",
    maxLevel: "Höchstes Level",
    last7: "Letzte Wochen",
    achievements: "Erfolge",
    tapBadge: "Tippe auf ein Symbol, dann siehst du, wie du es bekommst.",
    verse: "Vers des Tages",
    unlocked: "Neuer Erfolg",
    levelUp: "Neues Level",
  },
  ru: {
    series: "Серия",
    weeks: (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "урок подряд" : "урока подряд"),
    startHint: "Отметься на уроке и начни свою серию.",
    broken: "Серия прервалась. Начни новую.",
    best: "Рекорд",
    lessons: "Уроков",
    level: "Уровень",
    toNext: "до",
    maxLevel: "Высший уровень",
    last7: "Последние недели",
    achievements: "Достижения",
    tapBadge: "Нажми на значок, и увидишь, как его получить.",
    verse: "Стих дня",
    unlocked: "Новое достижение",
    levelUp: "Новый уровень",
  },
} as const;

function LevelIcon({ icon, size = 18 }: { icon: Level["icon"]; size?: number }) {
  const map = { sprout: Sprout, compass: Compass, book: BookOpen, shield: Shield, flame: Flame, star: Star, crown: Crown };
  const Icon = map[icon];
  return <Icon size={size} strokeWidth={2.2} />;
}

function AchIcon({ icon, size = 22 }: { icon: Achievement["icon"]; size?: number }) {
  const map = { sprout: Sprout, flame: Flame, zap: Zap, book: BookOpen, star: Star, crown: Crown, shield: Shield, trophy: Trophy };
  const Icon = map[icon];
  return <Icon size={size} strokeWidth={2.2} />;
}

/* число плавно «набегает» */
function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
}

/* ---------- стили анимаций ---------- */

export function TeensAnimStyles() {
  return (
    <style>{`
      @keyframes tp-flame { 0%,100% { transform: scale(1) rotate(-3deg); } 50% { transform: scale(1.12) rotate(3deg); } }
      @keyframes tp-glow { 0%,100% { opacity: .35; transform: scale(1); } 50% { opacity: .7; transform: scale(1.25); } }
      @keyframes tp-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      @keyframes tp-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes tp-shine { 0% { transform: translateX(-120%) skewX(-18deg); } 60%,100% { transform: translateX(260%) skewX(-18deg); } }
      @keyframes tp-pop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
      @keyframes tp-ring { 0% { box-shadow: 0 0 0 0 rgba(255,201,60,.65); } 100% { box-shadow: 0 0 0 10px rgba(255,201,60,0); } }
      @keyframes tp-drop { 0% { transform: translateY(-20px); opacity: 0; } 12% { opacity: 1; } 100% { transform: translateY(0); opacity: 1; } }
      @keyframes tp-confetti {
        0% { transform: translate(0,0) rotate(0); opacity: 1; }
        100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
      }
      .tp-flame { animation: tp-flame 1.4s ease-in-out infinite; transform-origin: 50% 80%; }
      .tp-glow { animation: tp-glow 2.2s ease-in-out infinite; }
      .tp-float { animation: tp-float 3.2s ease-in-out infinite; }
      .tp-up { opacity: 0; animation: tp-up .55s cubic-bezier(.2,.8,.2,1) forwards; }
      .tp-pop { animation: tp-pop .5s cubic-bezier(.2,.9,.3,1.3) both; }
      .tp-ring { animation: tp-ring 1.8s ease-out infinite; }
      .tp-shine::after { content: ""; position: absolute; inset: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent); animation: tp-shine 4.5s ease-in-out infinite; pointer-events: none; }
      .tp-drop { animation: tp-drop .45s cubic-bezier(.2,.9,.3,1.2) both; }
      .tp-confetti { position: absolute; left: 50%; top: 40%; width: 9px; height: 14px; border-radius: 2px; animation: tp-confetti 1.7s cubic-bezier(.15,.7,.3,1) forwards; }
      @media (prefers-reduced-motion: reduce) {
        .tp-flame, .tp-glow, .tp-float, .tp-ring, .tp-shine::after { animation: none !important; }
        .tp-up, .tp-pop, .tp-drop { animation: none !important; opacity: 1 !important; }
        .tp-confetti { display: none; }
      }
    `}</style>
  );
}

/* ---------- карточка прогресса ---------- */

export function ProgressCard({ lang, history, lessonDates, today }: { lang: Lang; history: string[]; lessonDates: string[]; today: string }) {
  const t = TX[lang];
  const stats = useMemo(() => computeStats(history, lessonDates, today), [history, lessonDates, today]);
  const level = levelOf(stats.xp);
  const streakShown = useCountUp(stats.streak);
  const totalShown = useCountUp(stats.total);
  const [barReady, setBarReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setBarReady(true), 150);
    return () => window.clearTimeout(id);
  }, []);

  // 7 недель: 5 прошлых, текущая и следующая
  const weeks = useMemo(() => {
    const current = weekStart(today);
    const marked = new Set(history.map(weekStart));
    return Array.from({ length: 7 }, (_, i) => {
      const monday = addDays(current, (i - 5) * 7);
      return { monday, done: marked.has(monday), current: monday === current };
    });
  }, [history, today]);

  const hot = stats.streak > 0;

  return (
    <section className="tp-up tp-shine relative mt-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#1b2431] via-[#243044] to-[#1b2431] p-5 text-white shadow-[0_14px_34px_rgba(27,36,49,0.22)]">
      <div className="flex items-center gap-4">
        <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center">
          {hot && <span className="tp-glow absolute inset-0 rounded-full bg-[#ff8a3c] blur-xl" />}
          <span
            className={
              "relative flex h-[68px] w-[68px] items-center justify-center rounded-full " +
              (hot ? "bg-gradient-to-b from-[#ffc93c] to-[#ff7a2f] text-white" : "bg-white/10 text-white/40")
            }
          >
            <Flame size={36} strokeWidth={2.2} className={hot ? "tp-flame" : ""} fill={hot ? "currentColor" : "none"} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">{t.series}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-[40px] font-extrabold leading-none tracking-[-0.03em] text-[#ffc93c]">{streakShown}</span>
            <span className="text-[14px] font-bold text-white/85">{t.weeks(stats.streak)}</span>
          </p>
          {stats.total === 0 ? (
            <p className="mt-1 text-[12px] leading-4 text-white/60">{t.startHint}</p>
          ) : !hot ? (
            <p className="mt-1 text-[12px] leading-4 text-white/60">{t.broken}</p>
          ) : null}
        </div>
      </div>

      {/* недели */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{t.last7}</p>
        <div className="flex items-center justify-between">
          {weeks.map((w, i) => (
            <span
              key={w.monday}
              style={{ animationDelay: `${200 + i * 70}ms` }}
              className={
                "tp-pop flex h-[34px] w-[34px] items-center justify-center rounded-full text-[11px] font-extrabold " +
                (w.done
                  ? "bg-[#ffc93c] text-[#1b2431]"
                  : w.current
                    ? "tp-ring border-2 border-[#ffc93c] text-[#ffc93c]"
                    : "bg-white/10 text-white/30")
              }
            >
              {w.done ? <Flame size={16} fill="currentColor" /> : ""}
            </span>
          ))}
        </div>
      </div>

      {/* уровень */}
      <div className="mt-5 rounded-2xl bg-white/8 p-3.5">
        <div className="flex items-center gap-3">
          <span className="tp-float flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffc93c] text-[#1b2431]">
            <LevelIcon icon={level.current.icon} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
              {t.level} {level.index + 1}
            </p>
            <p className="text-[16px] font-extrabold leading-tight">{lang === "ru" ? level.current.ru : level.current.de}</p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-extrabold leading-none text-[#ffc93c]">{totalShown}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">{t.lessons}</p>
          </div>
        </div>

        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/12">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ffc93c] to-[#ff9d3c] transition-[width] duration-[1200ms] ease-out"
            style={{ width: `${Math.round((barReady ? level.progress : 0) * 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-white/55">
          <span>{stats.xp} XP</span>
          <span>
            {level.next
              ? `${t.toNext} ${lang === "ru" ? level.next.ru : level.next.de}: ${level.next.xp - stats.xp} XP`
              : t.maxLevel}
          </span>
        </div>
        {stats.best > 0 && (
          <p className="mt-1 text-[11px] font-semibold text-white/45">
            {t.best}: {stats.best}
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------- достижения ---------- */

export function AchievementsCard({ lang, history, lessonDates, today }: { lang: Lang; history: string[]; lessonDates: string[]; today: string }) {
  const t = TX[lang];
  const stats = useMemo(() => computeStats(history, lessonDates, today), [history, lessonDates, today]);
  const doneCount = ACHIEVEMENTS.filter((a) => a.done(stats)).length;
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const pickedAch = ACHIEVEMENTS.find((a) => a.id === picked) ?? null;

  return (
    <section className="tp-up mt-4 rounded-[22px] border border-[#e9e3d3] bg-white p-4" style={{ animationDelay: "120ms" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2 text-[15px] font-extrabold">
          <Award size={17} className="text-[#9a6b00]" />
          {t.achievements}
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-[#fff4d1] px-2.5 py-0.5 text-[12px] font-extrabold text-[#9a6b00]">
            {doneCount}/{ACHIEVEMENTS.length}
          </span>
          <ChevronDown size={18} className={"text-[#9a9585] transition-transform " + (open ? "rotate-180" : "")} />
        </span>
      </button>

      {!open && (
        <div className="mt-3 flex gap-1.5">
          {ACHIEVEMENTS.map((a) => (
            <span
              key={a.id}
              className={
                "flex h-8 w-8 items-center justify-center rounded-lg " +
                (a.done(stats) ? "bg-gradient-to-b from-[#ffc93c] to-[#ff9d3c] text-[#1b2431]" : "bg-[#f0ede3] text-[#c9c2a8]")
              }
            >
              <AchIcon icon={a.icon} size={15} />
            </span>
          ))}
        </div>
      )}

      {open && (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {ACHIEVEMENTS.map((a, i) => {
              const done = a.done(stats);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setPicked(a.id)}
                  className="tp-up flex flex-col items-center text-center active:scale-95"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span
                    className={
                      "flex h-[52px] w-[52px] items-center justify-center rounded-2xl transition " +
                      (done
                        ? "bg-gradient-to-b from-[#ffc93c] to-[#ff9d3c] text-[#1b2431] shadow-[0_6px_14px_rgba(255,157,60,0.35)]"
                        : "bg-[#f0ede3] text-[#c9c2a8]") +
                      (picked === a.id ? " ring-2 ring-[#1b2431]" : "")
                    }
                  >
                    <AchIcon icon={a.icon} />
                  </span>
                  <span className={"mt-1.5 text-[10.5px] font-bold leading-tight " + (done ? "text-[#1b2431]" : "text-[#a8a290]")}>
                    {lang === "ru" ? a.ru : a.de}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 rounded-xl bg-[#faf8f3] px-3 py-2.5 text-[13px] font-semibold leading-snug text-[#5c5a50]">
            {pickedAch
              ? `${lang === "ru" ? pickedAch.ru : pickedAch.de}: ${lang === "ru" ? pickedAch.hintRu : pickedAch.hintDe}`
              : t.tapBadge}
          </p>
        </>
      )}
    </section>
  );
}

/* ---------- стих дня ---------- */

export function VerseCard({ lang, today }: { lang: Lang; today: string }) {
  const t = TX[lang];
  const verse = verseOfDay(today);

  return (
    <section
      className="tp-up tp-shine relative mt-6 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#ffc93c] to-[#ffb347] p-5 text-[#1b2431]"
      style={{ animationDelay: "60ms" }}
    >
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1b2431]/60">
        <BookOpen size={13} />
        {t.verse}
      </p>
      <p className="mt-2.5 text-[17px] font-bold leading-[1.45] tracking-[-0.01em]">«{lang === "ru" ? verse.ru : verse.de}»</p>
      <p className="mt-2 text-[13px] font-extrabold text-[#1b2431]/70">{verse.ref}</p>
    </section>
  );
}

/* ---------- праздник: конфетти и плашка ---------- */

export type Celebration = { id: number; kind: "start" | "ach" | "level"; title: string };

const COLORS = ["#ffc93c", "#ff7a2f", "#1b2431", "#4ade80", "#60a5fa", "#f472b6"];

export function CelebrationLayer({ lang, event, onDone }: { lang: Lang; event: Celebration | null; onDone: () => void }) {
  const t = TX[lang];

  useEffect(() => {
    if (!event) return;
    const id = window.setTimeout(onDone, 3800);
    return () => window.clearTimeout(id);
  }, [event, onDone]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 34 + (i % 3) * 0.2;
        const dist = 130 + ((i * 37) % 160);
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist * 0.9 + 140,
          rot: ((i * 83) % 720) - 360,
          color: COLORS[i % COLORS.length],
          delay: (i % 6) * 25,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event?.id],
  );

  if (!event) return null;

  const head = event.kind === "level" ? t.levelUp : event.kind === "ach" ? t.unlocked : t.series;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      <div className="absolute inset-x-0 top-0 mx-auto flex max-w-[520px] justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="tp-drop flex items-center gap-3 rounded-2xl bg-[#1b2431] px-4 py-3 text-white shadow-[0_14px_34px_rgba(27,36,49,0.35)]">
          <span className="tp-pop flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#ffc93c] to-[#ff9d3c] text-[#1b2431]">
            {event.kind === "level" ? <Crown size={22} /> : event.kind === "ach" ? <Trophy size={22} /> : <Flame size={22} fill="currentColor" />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#ffc93c]">{head}</p>
            <p className="text-[15px] font-extrabold leading-tight">{event.title}</p>
          </div>
        </div>
      </div>

      <div className="absolute inset-0">
        {pieces.map((p, i) => (
          <span
            key={`${event.id}-${i}`}
            className="tp-confetti"
            style={
              {
                background: p.color,
                animationDelay: `${p.delay}ms`,
                ["--dx" as string]: `${p.dx}px`,
                ["--dy" as string]: `${p.dy}px`,
                ["--rot" as string]: `${p.rot}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}