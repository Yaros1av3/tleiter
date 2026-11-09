"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Gift, Loader2, RotateCcw, X } from "lucide-react";

import { bcCall } from "@/lib/bcAdminClient";
import { useLanguage } from "@/components/LanguageProvider";

const label = "text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9585]";
const card = "rounded-[22px] border border-[#e9e3d3] bg-white";
const btnDark =
  "flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1b2431] px-4 text-[14px] font-bold text-[#ffc93c] disabled:opacity-50";
const btnLight =
  "flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e0d9c4] bg-white px-4 text-[14px] font-bold disabled:opacity-50";

function useL() {
  const { language } = useLanguage();
  const isRu = language === "ru";
  return { isRu, L: (ru: string, de: string) => (isRu ? ru : de) };
}

function Spinner() {
  return (
    <div className="mt-10 flex justify-center">
      <Loader2 size={22} className="animate-spin text-[#8a8678]" />
    </div>
  );
}

/* ================= Проверка ответов ================= */

type Item = {
  id: number;
  answer_text: string | null;
  photo_url: string | null;
  submitted_at: string;
  is_late: boolean;
  points_photo: number;
  points_time: number;
  points_quality: number | null;
  status: "pending" | "accepted" | "rejected";
  admin_comment: string | null;
  bc_tasks: { day_number: number; title_de: string; title_ru: string };
  bc_participants: { nickname: string; first_name: string; last_name: string };
};

function ReviewCard({ item, onDone }: { item: Item; onDone: () => void }) {
  const { isRu, L } = useL();
  const [quality, setQuality] = useState<number | null>(item.points_quality);
  const [comment, setComment] = useState(item.admin_comment ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async (action: "submission_grade" | "submission_reject") => {
    setErr("");
    if (action === "submission_reject" && !comment.trim()) {
      return setErr(L("Напишите, что нужно доработать.", "Schreibe, was überarbeitet werden soll."));
    }
    setBusy(true);
    const { ok } = await bcCall("POST", "/api/bc-admin/work", {
      action,
      id: item.id,
      quality,
      comment,
    });
    setBusy(false);
    if (ok) onDone();
    else setErr(L("Не получилось. Попробуйте ещё раз.", "Das hat nicht geklappt. Bitte nochmal versuchen."));
  };

  const p = item.bc_participants;
  const t = item.bc_tasks;
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold">{p.nickname}</p>
          <p className="truncate text-[12px] text-[#8a8678]">
            {p.first_name} {p.last_name}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#fff4d1] px-2.5 py-1 text-[11px] font-extrabold text-[#9a6b00]">
          {L("День", "Tag")} {t.day_number}
        </span>
      </div>
      <p className="mt-2 text-[13px] font-bold">{isRu ? t.title_ru : t.title_de}</p>
      <p className="text-[11px] text-[#8a8678]">
        {new Date(item.submitted_at).toLocaleString(isRu ? "ru-RU" : "de-DE", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
        {item.is_late ? ` · ${L("с опозданием", "zu spät")}` : ""}
      </p>

      <p className="mt-3 whitespace-pre-line rounded-xl bg-[#faf8f3] px-3.5 py-3 text-[14px] leading-relaxed">
        {item.answer_text}
      </p>
      {item.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.photo_url} alt="" className="mt-3 max-h-80 w-full rounded-xl object-cover" />
      )}

      <p className="mt-3 text-[12px] text-[#8a8678]">
        {L("Автоматически", "Automatisch")}: +{item.points_photo} {L("фото", "Foto")}, +{item.points_time}{" "}
        {L("срок", "Frist")}
      </p>

      <p className={`${label} mb-1.5 mt-3`}>{L("Качество ответа", "Qualität der Antwort")}</p>
      <div className="grid grid-cols-3 gap-2">
        {[0, 5, 10].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setQuality(v)}
            className={`h-11 rounded-xl text-[15px] font-extrabold ${
              quality === v ? "bg-[#ffc93c]" : "border border-[#e0d9c4] bg-white"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <textarea
        className="mt-3 min-h-[70px] w-full rounded-xl border border-[#e0d9c4] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#1b2431]"
        placeholder={L("Комментарий подростку (необязательно)", "Kommentar für den Teen (optional)")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {err && <p className="mt-2 text-[13px] font-semibold text-[#9a6b00]">{err}</p>}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className={btnLight} disabled={busy} onClick={() => send("submission_reject")}>
          <RotateCcw size={16} />
          {L("Доработать", "Überarbeiten")}
        </button>
        <button
          type="button"
          className={btnDark}
          disabled={busy || quality === null}
          onClick={() => send("submission_grade")}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {L("Принять", "Annehmen")}
        </button>
      </div>
    </div>
  );
}

export function ReviewTab({ seasonId }: { seasonId: number | null }) {
  const { L } = useL();
  const [mode, setMode] = useState<"pending" | "done">("pending");
  const [items, setItems] = useState<Item[] | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    const { data } = await bcCall<{ items?: Item[] }>(
      "GET",
      `/api/bc-admin/work?view=review&status=${mode}${seasonId ? `&season=${seasonId}` : ""}`,
    );
    setItems(data.items ?? []);
  }, [mode, seasonId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#f1ede1] p-1">
        {(
          [
            ["pending", L("Ждут проверки", "Zu prüfen")],
            ["done", L("Проверено", "Geprüft")],
          ] as const
        ).map(([k, text]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={`h-9 rounded-xl text-[13px] font-bold ${mode === k ? "bg-white shadow-sm" : "text-[#8a8678]"}`}
          >
            {text}
          </button>
        ))}
      </div>
      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className={`${card} px-5 py-8 text-center text-sm text-[#8a8678]`}>
          {mode === "pending" ? L("Всё проверено.", "Alles geprüft.") : L("Пока ничего.", "Noch nichts.")}
        </div>
      ) : (
        items.map((it) => <ReviewCard key={`${it.id}-${mode}`} item={it} onDone={load} />)
      )}
    </div>
  );
}

/* ================= Подарки ================= */

type GiftRow = {
  id: number;
  status: "open" | "submitted" | "expired" | "given";
  opened_at: string;
  expires_at: string;
  gift_link: string | null;
  submitted_at: string | null;
  given_at: string | null;
  bc_participants: { nickname: string; first_name: string; last_name: string };
};

export function GiftsTab() {
  const { isRu, L } = useL();
  const [gifts, setGifts] = useState<GiftRow[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data } = await bcCall<{ gifts?: GiftRow[] }>("GET", "/api/bc-admin/work?view=gifts");
    setGifts(data.gifts ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: string, id: number) => {
    setBusy(id);
    await bcCall("POST", "/api/bc-admin/work", { action, id });
    setBusy(null);
    await load();
  };

  const chip = (s: GiftRow["status"]) =>
    ({
      open: { t: L("ждём ссылку", "wartet auf Link"), c: "bg-[#ffc93c] text-[#1b2431]" },
      submitted: { t: L("ссылка получена", "Link erhalten"), c: "bg-[#fff4d1] text-[#9a6b00]" },
      expired: { t: L("время вышло", "Zeit abgelaufen"), c: "bg-[#f1ede1] text-[#6f6a5c]" },
      given: { t: L("выдан", "übergeben"), c: "bg-[#1b2431] text-[#ffc93c]" },
    })[s];

  if (gifts === null) return <Spinner />;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(isRu ? "ru-RU" : "de-DE", { day: "2-digit", month: "2-digit" });

  return (
    <div className="mt-4 space-y-3">
      <p className={label}>
        {L("Подарки", "Geschenke")} · {gifts.length}
      </p>
      {gifts.length === 0 ? (
        <div className={`${card} px-5 py-8 text-center text-sm text-[#8a8678]`}>
          {L("Пока никто не набрал нужное число баллов.", "Noch niemand hat genug Punkte.")}
        </div>
      ) : (
        gifts.map((g) => {
          const c = chip(g.status);
          const p = g.bc_participants;
          return (
            <div key={g.id} className={`${card} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4d1] text-[#9a6b00]">
                    <Gift size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-extrabold">{p.nickname}</p>
                    <p className="truncate text-[12px] text-[#8a8678]">
                      {p.first_name} {p.last_name}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${c.c}`}>{c.t}</span>
              </div>
              <p className="mt-2 text-[12px] text-[#8a8678]">
                {L("Окно открыто", "Fenster geöffnet")} {fmt(g.opened_at)} · {L("до", "bis")} {fmt(g.expires_at)}
              </p>
              {g.gift_link && (
                <a
                  href={g.gift_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 rounded-xl bg-[#faf8f3] px-3 py-2.5 text-[13px] font-semibold underline"
                >
                  <ExternalLink size={15} className="shrink-0" />
                  <span className="min-w-0 break-all">{g.gift_link}</span>
                </a>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(g.status === "expired" || g.status === "open" || g.status === "submitted") && (
                  <button
                    type="button"
                    className={btnLight}
                    disabled={busy === g.id}
                    onClick={() => {
                      if (confirm(L("Открыть окно заново на неделю?", "Fenster für eine Woche neu öffnen?")))
                        void act("gift_reopen", g.id);
                    }}
                  >
                    <RotateCcw size={16} />
                    {L("Открыть заново", "Neu öffnen")}
                  </button>
                )}
                {g.status !== "given" && (
                  <button
                    type="button"
                    className={btnDark}
                    disabled={busy === g.id}
                    onClick={() => act("gift_given", g.id)}
                  >
                    <Check size={16} />
                    {L("Выдан", "Übergeben")}
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ================= Статистика ================= */

type Stats = {
  participants: number;
  submissions: number;
  pending: number;
  avgPoints: number;
  publishedDays: number;
  perDay: { day: number; count: number }[];
  top: { id: number; nickname: string; name: string; points: number; days: number }[];
  silent: { id: number; nickname: string; name: string }[];
};

export function StatsTab({ seasonId }: { seasonId: number | null }) {
  const { L } = useL();
  const [s, setS] = useState<Stats | null | undefined>(undefined);

  useEffect(() => {
    setS(undefined);
    bcCall<{ stats?: Stats | null }>(
      "GET",
      `/api/bc-admin/work?view=stats${seasonId ? `&season=${seasonId}` : ""}`,
    ).then(({ data }) => setS(data.stats ?? null));
  }, [seasonId]);

  if (s === undefined) return <Spinner />;
  if (!s) {
    return (
      <div className={`${card} mt-4 px-5 py-8 text-center text-sm text-[#8a8678]`}>
        {L("Данных пока нет.", "Noch keine Daten.")}
      </div>
    );
  }

  const max = Math.max(1, s.participants, ...s.perDay.map((d) => d.count));
  const tiles: [string, number][] = [
    [L("Участников", "Teilnehmer"), s.participants],
    [L("Ответов", "Antworten"), s.submissions],
    [L("Ждут проверки", "Zu prüfen"), s.pending],
    [L("Средний балл", "Ø Punkte"), s.avgPoints],
  ];

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(([text, n]) => (
          <div key={text} className={`${card} p-4`}>
            <p className="text-[28px] font-extrabold leading-none">{n}</p>
            <p className="mt-1.5 text-[12px] text-[#8a8678]">{text}</p>
          </div>
        ))}
      </div>

      <div className={`${card} p-4`}>
        <p className={`${label} mb-3`}>{L("Сдано по дням", "Abgaben pro Tag")}</p>
        {s.perDay.length === 0 ? (
          <p className="text-[13px] text-[#8a8678]">{L("Нет опубликованных заданий.", "Keine veröffentlichten Aufgaben.")}</p>
        ) : (
          <div className="flex h-28 items-end gap-1">
            {s.perDay.map((d) => (
              <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t bg-[#ffc93c]"
                  style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
                  title={`${d.day}: ${d.count}`}
                />
                <span className="text-[8px] text-[#8a8678]">{d.day}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${card} p-4`}>
        <p className={`${label} mb-2`}>{L("Лучшие", "Beste")}</p>
        {s.top.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-[#f0ebdc] py-2 last:border-0">
            <span className="w-5 text-[13px] font-extrabold text-[#9a6b00]">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold">{p.nickname}</span>
              <span className="block truncate text-[11px] text-[#8a8678]">{p.name}</span>
            </span>
            <span className="text-[15px] font-extrabold">{p.points}</span>
          </div>
        ))}
      </div>

      <div className={`${card} p-4`}>
        <p className={`${label} mb-2`}>
          {L("Ещё ничего не сдали", "Noch nichts abgegeben")} · {s.silent.length}
        </p>
        {s.silent.length === 0 ? (
          <p className="flex items-center gap-1.5 text-[13px] text-[#8a8678]">
            <X className="hidden" />
            {L("Все хотя бы раз сдали.", "Alle haben mindestens einmal abgegeben.")}
          </p>
        ) : (
          <p className="text-[13px] leading-relaxed">
            {s.silent.map((p) => `${p.nickname} (${p.name})`).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}