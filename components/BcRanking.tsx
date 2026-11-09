"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, Crown, Flame, Loader2, Medal, Trophy, X } from "lucide-react";
import { AWARDS, type AwardKind } from "@/lib/bcAwards";

type Lang = "de" | "ru";

type Row = {
  id: number;
  nickname: string;
  avatar_url: string | null;
  points: number;
  position: number;
  rank: string;
  me: boolean;
};
type Player = {
  id: number;
  nickname: string;
  avatar_url: string | null;
  points: number;
  daysDone: number;
  rank: string;
  awards: { kind: string; season: string }[];
};

const T = {
  de: {
    empty: "Noch niemand im Ranking.",
    points: "Punkte",
    you: "Du",
    awards: "Auszeichnungen",
    noAwards: "Noch keine Auszeichnungen. Sie gibt es am Ende einer Challenge.",
    days: "Tage abgegeben",
    fail: "Das Ranking konnte nicht geladen werden.",
    retry: "Nochmal",
  },
  ru: {
    empty: "В рейтинге пока никого нет.",
    points: "баллов",
    you: "Ты",
    awards: "Награды",
    noAwards: "Наград пока нет. Их выдают в конце челленджа.",
    days: "дней сдано",
    fail: "Не удалось загрузить рейтинг.",
    retry: "Ещё раз",
  },
} as const;

const card = "rounded-2xl border border-[#e9e3d3] bg-white";

function Ava({ url, name, size }: { url: string | null; name: string; size: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[#ffc93c] font-extrabold text-[#1b2431]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const ICON: Record<AwardKind, typeof Medal> = {
  finisher: Medal,
  legend: Crown,
  perfect: Flame,
  top1: Trophy,
  top2: Award,
  top3: Award,
};

export function AwardsGrid({
  awards,
  lang,
}: {
  awards: { kind: string; season: string }[];
  lang: Lang;
}) {
  const t = T[lang];
  if (!awards.length) {
    return <p className="text-[13px] text-[#8a8678]">{t.noAwards}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {awards.map((a, i) => {
        const def = AWARDS[a.kind as AwardKind];
        if (!def) return null;
        const Icon = ICON[a.kind as AwardKind];
        return (
          <div
            key={`${a.kind}-${a.season}-${i}`}
            className="flex items-center gap-2 rounded-full bg-[#fff4d1] py-1 pl-1 pr-3"
            title={lang === "ru" ? def.descRu : def.descDe}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1b2431] text-[#ffc93c]">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="text-[12px] font-extrabold leading-tight">
              {lang === "ru" ? def.ru : def.de}
              {a.season && <span className="ml-1.5 font-bold text-[#9a6b00]">{a.season}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Мои награды (для вкладки "Профиль") */
export function MyAwards({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [p, setP] = useState<Player | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/bc/player?id=me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setP(d?.player ?? null))
      .catch(() => setP(null));
  }, []);

  if (p === undefined) return null;
  return (
    <div className={`${card} p-3.5`}>
      <p className="mb-2 text-[13px] font-extrabold">{t.awards}</p>
      <AwardsGrid awards={p?.awards ?? []} lang={lang} />
    </div>
  );
}

export default function BcRanking({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<Player | null>(null);
  const [opening, setOpening] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bc/ranking", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setRows(d.rows ?? []);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, lang]);

  const openPlayer = async (id: number) => {
    setOpening(id);
    try {
      const res = await fetch(`/api/bc/player?id=${id}`, { cache: "no-store" });
      const d = await res.json();
      if (res.ok) setOpen(d.player);
    } catch {}
    setOpening(null);
  };

  if (failed && !rows) {
    return (
      <div className={`${card} mt-3 px-5 py-6 text-center text-[14px] text-[#8a8678]`}>
        {t.fail}
        <button type="button" onClick={load} className="ml-2 font-bold underline">
          {t.retry}
        </button>
      </div>
    );
  }
  if (!rows) {
    return (
      <div className="mt-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#8a8678]" />
      </div>
    );
  }
  if (!rows.length) {
    return <div className={`${card} mt-3 px-5 py-8 text-center text-[14px] text-[#8a8678]`}>{t.empty}</div>;
  }

  return (
    <div className="mt-1 space-y-1.5 pb-4">
      {rows.map((r) => {
        const top = r.position <= 3 && r.points > 0;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => openPlayer(r.id)}
            className={`flex w-full items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-left active:scale-[0.99] ${
              r.me ? "border-[#ffc93c] bg-[#fff4d1]" : "border-[#e9e3d3] bg-white"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                top ? "bg-[#1b2431] text-[#ffc93c]" : "bg-[#f1ede1] text-[#8a8678]"
              }`}
            >
              {r.position}
            </span>
            <Ava url={r.avatar_url} name={r.nickname} size={38} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[14px] font-extrabold">{r.nickname}</span>
                {r.me && (
                  <span className="shrink-0 rounded-full bg-[#1b2431] px-2 py-0.5 text-[10px] font-extrabold text-[#ffc93c]">
                    {t.you}
                  </span>
                )}
              </span>
              <span className="block truncate text-[12px] text-[#8a8678]">{r.rank}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[16px] font-extrabold leading-none">{r.points}</span>
              <span className="mt-0.5 block text-[10px] text-[#8a8678]">{t.points}</span>
            </span>
            {opening === r.id && <Loader2 className="h-4 w-4 animate-spin text-[#8a8678]" />}
          </button>
        );
      })}

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[85%] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] bg-[#faf8f3] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-[#e9e3d3]"
                aria-label="close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col items-center">
              <Ava url={open.avatar_url} name={open.nickname} size={96} />
              <p className="mt-3 text-[22px] font-extrabold">{open.nickname}</p>
              <span className="mt-2 rounded-full bg-[#ffc93c] px-3.5 py-1 text-[12px] font-extrabold">
                {open.rank}
              </span>
              <p className="mt-3 text-[13px] text-[#8a8678]">
                {open.points} {t.points} · {open.daysDone} {t.days}
              </p>
            </div>
            <p className="mb-3 mt-6 text-[14px] font-extrabold">{t.awards}</p>
            <AwardsGrid awards={open.awards} lang={lang} />
          </div>
        </div>
      )}
    </div>
  );
}