"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Flame } from "lucide-react";

type Lang = "de" | "ru";
type State = "done" | "redo" | "missed" | "today" | "future";
type Data = { total: number; done: number; streak: number; days: { day: number; date: string; state: State }[] };

const TX = {
  de: {
    streak: "Serie",
    daysWord: (n: number) => (n === 1 ? "Tag" : "Tage"),
    of: "von",
    done: "abgegeben",
    legendDone: "abgegeben",
    legendMissed: "verpasst",
    legendRedo: "überarbeiten",
    wd: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    none: "Noch keine Serie, starte heute",
  },
  ru: {
    streak: "Серия",
    daysWord: (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "день" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "дня" : "дней"),
    of: "из",
    done: "сдано",
    legendDone: "сдано",
    legendMissed: "пропущено",
    legendRedo: "на доработку",
    wd: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    none: "Серии пока нет, начни сегодня",
  },
} as const;

const dateKey = (d: Date) => d.toISOString().slice(0, 10);

export default function BcProgress({ lang, refreshKey }: { lang: Lang; refreshKey: number }) {
  const t = TX[lang];
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/bc/progress", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  if (!data || data.total === 0) return null;

  const pct = Math.round((data.done / data.total) * 100);
  const byDate = new Map(data.days.map((d) => [d.date, d]));
  const first = new Date(`${data.days[0].date}T12:00:00Z`);
  const last = new Date(`${data.days[data.days.length - 1].date}T12:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7; /* пустые клетки до понедельника */
  const cells: (typeof data.days[number] | null)[] = Array.from({ length: lead }, () => null);
  for (let d = new Date(first); d <= last; d = new Date(d.getTime() + 86400000)) {
    cells.push(byDate.get(dateKey(d)) ?? { day: 0, date: dateKey(d), state: "future" });
  }

  const cls: Record<State, string> = {
    done: "bg-[#1b2431] text-[#ffc93c]",
    redo: "bg-[#fff4d1] text-[#9a6b00] ring-1 ring-[#e8c46a]",
    missed: "bg-[#f6e3df] text-[#a0453a]",
    today: "bg-white text-[#1b2431] ring-2 ring-[#ffc93c]",
    future: "bg-[#f4f0e4] text-[#b3ad9b]",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e9e3d3] bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-3 text-left">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            data.streak > 0 ? "bg-[#fff4d1] text-[#9a6b00]" : "bg-[#f4f0e4] text-[#b3ad9b]"
          }`}
        >
          <Flame className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold leading-tight">
            {data.streak > 0 ? `${t.streak}: ${data.streak} ${t.daysWord(data.streak)}` : t.none}
          </span>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#f1ede1]">
            <span className="block h-full rounded-full bg-[#ffc93c]" style={{ width: `${pct}%` }} />
          </span>
          <span className="mt-1 block text-[11px] text-[#8a8678]">
            {data.done} {t.of} {data.total} {t.done}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#8a8678] transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-[#f0ebdc] p-3">
          <div className="grid grid-cols-7 gap-1.5">
            {t.wd.map((w) => (
              <span key={w} className="text-center text-[10px] font-semibold text-[#8a8678]">
                {w}
              </span>
            ))}
            {cells.map((c, i) =>
              c ? (
                <span
                  key={c.date}
                  className={`flex aspect-square items-center justify-center rounded-lg text-[11px] font-bold ${cls[c.state]}`}
                >
                  {Number(c.date.slice(8, 10))}
                </span>
              ) : (
                <span key={`e${i}`} />
              ),
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#6f6a5c]">
            {([
              ["done", t.legendDone],
              ["missed", t.legendMissed],
              ["redo", t.legendRedo],
            ] as [State, string][]).map(([k, label]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded ${cls[k]}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}