"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CheckCircle2, FileText, MessageCircle, ExternalLink, Gift, Loader2, RotateCcw, Trophy, Users } from "lucide-react";

import { bcCall } from "@/lib/bcAdminClient";
import { downloadGiftsPdf, downloadParticipantsPdf, type ExportData } from "@/lib/bcPdf";
import { useLanguage } from "@/components/LanguageProvider";
import { Avatar, Badge, Empty, Segmented, Skeleton, cx, ui, useBcUi } from "@/components/BcUi";

function useL() {
  const { language } = useLanguage();
  const isRu = language === "ru";
  return { isRu, L: (ru: string, de: string) => (isRu ? ru : de) };
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
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
  const { toast } = useBcUi();
  const [quality, setQuality] = useState<number | null>(item.points_quality);
  const [comment, setComment] = useState(item.admin_comment ?? "");
  const [busy, setBusy] = useState<"" | "ok" | "no">("");
  const [needComment, setNeedComment] = useState(false);
  const [zoom, setZoom] = useState(false);

  const send = async (action: "submission_grade" | "submission_reject") => {
    if (action === "submission_reject" && !comment.trim()) {
      setNeedComment(true);
      return;
    }
    setBusy(action === "submission_grade" ? "ok" : "no");
    const { ok } = await bcCall("POST", "/api/bc-admin/work", { action, id: item.id, quality, comment });
    setBusy("");
    if (ok) {
      toast(action === "submission_grade" ? L("Ответ принят", "Antwort angenommen") : L("Отправлено на доработку", "Zur Überarbeitung zurückgegeben"));
      onDone();
    } else toast(L("Не получилось. Попробуйте ещё раз.", "Das hat nicht geklappt. Bitte nochmal versuchen."), "error");
  };

  const p = item.bc_participants;
  const t = item.bc_tasks;
  const when = new Date(item.submitted_at).toLocaleString(isRu ? "ru-RU" : "de-DE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const auto = item.points_photo + item.points_time;
  const marks: [number, string][] = [
    [0, L("Не по теме", "Am Thema vorbei")],
    [5, L("Хорошо", "Gut")],
    [10, L("Отлично", "Sehr gut")],
  ];

  return (
    <article className="overflow-hidden rounded-[20px] border border-[#ece6d3] bg-white">
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <Avatar url={null} name={p.nickname} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold leading-tight">{p.nickname}</p>
          <p className="truncate text-[12px] text-[#8a8678]">
            {p.first_name} {p.last_name}
          </p>
        </div>
        <Badge tone="soft">
          {L("День", "Tag")} {t.day_number}
        </Badge>
      </header>

      <div className="px-4">
        <p className="text-[13px] font-semibold text-[#6f6a5c]">{isRu ? t.title_ru : t.title_de}</p>
        <p className="mt-0.5 text-[12px] text-[#a09a88]">
          {when}
          {item.is_late ? ` · ${L("сдано с опозданием", "zu spät abgegeben")}` : ""}
        </p>
        <p className="mt-3 whitespace-pre-line rounded-[14px] bg-[#faf8f3] px-3.5 py-3 text-[15px] leading-relaxed">
          {item.answer_text}
        </p>
        {item.photo_url && (
          <button type="button" onClick={() => setZoom((v) => !v)} className="mt-3 block w-full overflow-hidden rounded-[14px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photo_url} alt="" className={cx("w-full object-cover", zoom ? "max-h-none" : "max-h-56")} />
          </button>
        )}
        <p className="mt-3 text-[12px] text-[#8a8678]">
          {L("Уже засчитано автоматически", "Automatisch gezählt")}: {auto} {L("баллов", "Punkte")}
          {item.points_photo ? ` (${L("фото", "Foto")} +${item.points_photo}, ${L("срок", "Frist")} +${item.points_time})` : ` (${L("срок", "Frist")} +${item.points_time})`}
        </p>
      </div>

      <div className="mt-3 border-t border-[#f0ebdc] px-4 pb-4 pt-3">
        <p className={cx(ui.label, "mb-2")}>{L("Оценка за качество", "Bewertung der Qualität")}</p>
        <div className="grid grid-cols-3 gap-2">
          {marks.map(([v, text]) => (
            <button
              key={v}
              type="button"
              onClick={() => setQuality(v)}
              className={cx(
                "flex h-[62px] flex-col items-center justify-center rounded-[14px] transition active:scale-[0.97]",
                quality === v ? "bg-[#1b2431] text-[#ffc93c]" : "bg-[#f1ede1]",
              )}
            >
              <span className="text-[20px] font-extrabold leading-none">{v}</span>
              <span className={cx("mt-1 text-[11px] font-medium", quality === v ? "text-[#ffc93c]/80" : "text-[#8a8678]")}>{text}</span>
            </button>
          ))}
        </div>

        <textarea
          className={cx(ui.area, "mt-3 !min-h-[80px]", needComment && "!border-[#b3342f]")}
          placeholder={L("Комментарий подростку (для доработки обязателен)", "Kommentar für den Teen (bei Überarbeitung Pflicht)")}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setNeedComment(false);
          }}
        />
        {needComment && (
          <p className="mt-1.5 text-[12px] font-semibold text-[#b3342f]">
            {L("Напишите, что нужно доработать.", "Schreibe, was überarbeitet werden soll.")}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className={cx(ui.btn, ui.ghost)} disabled={!!busy} onClick={() => send("submission_reject")}>
            {busy === "no" ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
            {L("На доработку", "Überarbeiten")}
          </button>
          <button
            type="button"
            className={cx(ui.btn, ui.primary)}
            disabled={!!busy || quality === null}
            onClick={() => send("submission_grade")}
          >
            {busy === "ok" ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {L("Принять", "Annehmen")}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ReviewTab({ seasonId, onChanged }: { seasonId: number | null; onChanged?: () => void }) {
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
    <div className="space-y-3">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "pending", label: L("Ждут проверки", "Zu prüfen") },
          { value: "done", label: L("Проверено", "Geprüft") },
        ]}
      />
      {items === null ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <Empty
          icon={<CheckCircle2 size={22} />}
          title={mode === "pending" ? L("Всё проверено", "Alles geprüft") : L("Пока пусто", "Noch leer")}
          text={
            mode === "pending"
              ? L("Новые ответы подростков появятся здесь.", "Neue Antworten der Teens erscheinen hier.")
              : L("Проверенные ответы будут здесь, их можно исправить.", "Geprüfte Antworten erscheinen hier, du kannst sie ändern.")
          }
        />
      ) : (
        items.map((it) => (
          <ReviewCard
            key={`${it.id}-${mode}`}
            item={it}
            onDone={() => {
              void load();
              onChanged?.();
            }}
          />
        ))
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
  gift_price: number | null;
  submitted_at: string | null;
  given_at: string | null;
  bc_participants: { nickname: string; first_name: string; last_name: string };
};

export function GiftsTab() {
  const { isRu, L } = useL();
  const { confirm, toast } = useBcUi();
  const [gifts, setGifts] = useState<GiftRow[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [filter, setFilter] = useState<"todo" | "all">("todo");

  const load = useCallback(async () => {
    const { data } = await bcCall<{ gifts?: GiftRow[] }>("GET", "/api/bc-admin/work?view=gifts");
    setGifts(data.gifts ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: string, id: number, okText: string) => {
    setBusy(id);
    const { ok } = await bcCall("POST", "/api/bc-admin/work", { action, id });
    setBusy(null);
    toast(ok ? okText : L("Не получилось", "Fehlgeschlagen"), ok ? "ok" : "error");
    await load();
  };

  if (gifts === null) return <ListSkeleton />;

  const shown = gifts.filter((g) => (filter === "todo" ? g.status !== "given" : true));
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(isRu ? "ru-RU" : "de-DE", { day: "numeric", month: "short" }).format(new Date(iso));
  const badge = (s: GiftRow["status"]) =>
    s === "open" ? (
      <Badge tone="sun">{L("Ждём ссылку", "Wartet auf Link")}</Badge>
    ) : s === "submitted" ? (
      <Badge tone="soft">{L("Ссылка получена", "Link erhalten")}</Badge>
    ) : s === "expired" ? (
      <Badge tone="danger">{L("Время вышло", "Zeit abgelaufen")}</Badge>
    ) : (
      <Badge tone="ink">{L("Выдан", "Übergeben")}</Badge>
    );

  return (
    <div className="space-y-3">
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "todo", label: L("Нужно сделать", "Offen") },
          { value: "all", label: L("Все", "Alle") },
        ]}
      />
      {shown.length === 0 ? (
        <Empty
          icon={<Gift size={22} />}
          title={filter === "todo" ? L("Нет открытых подарков", "Keine offenen Geschenke") : L("Подарков пока нет", "Noch keine Geschenke")}
          text={L(
            "Окно подарка открывается автоматически, когда подросток набирает 300 баллов.",
            "Das Geschenk-Fenster öffnet sich automatisch, wenn ein Teen 300 Punkte erreicht.",
          )}
        />
      ) : (
        shown.map((g) => {
          const p = g.bc_participants;
          return (
            <article key={g.id} className="rounded-[20px] border border-[#ece6d3] bg-white p-4">
              <div className="flex items-center gap-3">
                <Avatar url={null} name={p.nickname} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-extrabold leading-tight">{p.nickname}</p>
                  <p className="truncate text-[12px] text-[#8a8678]">
                    {p.first_name} {p.last_name}
                  </p>
                </div>
                {badge(g.status)}
              </div>
              <p className="mt-2.5 text-[12px] text-[#8a8678]">
                {L("Окно открыто", "Fenster geöffnet")} {fmt(g.opened_at)} · {L("до", "bis")} {fmt(g.expires_at)}
              </p>
              {g.gift_link && (
                <a
                  href={g.gift_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2.5 rounded-[14px] bg-[#faf8f3] px-3.5 py-3 text-[13px] font-semibold active:bg-[#f1ede1]"
                >
                  <ExternalLink size={16} className="shrink-0" />
                  <span className="min-w-0 break-all">{g.gift_link}</span>
                </a>
              )}
              {g.gift_link && (
                <label className="mt-2.5 flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-[#6f6a5c]">{L("Цена, €", "Preis, €")}</span>
                  <input
                    className={cx(ui.input, "!h-11 max-w-[140px]")}
                    inputMode="decimal"
                    placeholder="19,99"
                    defaultValue={g.gift_price != null ? String(g.gift_price).replace(".", ",") : ""}
                    onBlur={async (e) => {
                      const value = e.target.value;
                      const { ok } = await bcCall("POST", "/api/bc-admin/work", { action: "gift_price", id: g.id, price: value });
                      toast(ok ? L("Цена сохранена", "Preis gespeichert") : L("Не получилось", "Fehlgeschlagen"), ok ? "ok" : "error");
                    }}
                  />
                </label>
              )}
              {g.status !== "given" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={cx(ui.btn, ui.ghost, "!h-11")}
                    disabled={busy === g.id}
                    onClick={async () => {
                      const ok = await confirm({
                        title: L("Открыть окно заново?", "Fenster neu öffnen?"),
                        text: L("Подросток получит ещё неделю на выбор подарка.", "Der Teen bekommt noch eine Woche Zeit."),
                        confirmLabel: L("Открыть", "Öffnen"),
                      });
                      if (ok) void act("gift_reopen", g.id, L("Окно открыто", "Fenster geöffnet"));
                    }}
                  >
                    <RotateCcw size={16} />
                    {L("Открыть заново", "Neu öffnen")}
                  </button>
                  <button
                    type="button"
                    className={cx(ui.btn, ui.primary, "!h-11")}
                    disabled={busy === g.id}
                    onClick={() => act("gift_given", g.id, L("Отмечено: подарок выдан", "Als übergeben markiert"))}
                  >
                    <Check size={16} />
                    {L("Подарок выдан", "Übergeben")}
                  </button>
                </div>
              )}
            </article>
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
  quiet: { id: number; nickname: string; name: string; missed: number; last: string | null; whatsapp: string | null }[];
};

export function StatsTab({ seasonId }: { seasonId: number | null }) {
  const { L } = useL();
  const [s, setS] = useState<Stats | null | undefined>(undefined);

  useEffect(() => {
    setS(undefined);
    bcCall<{ stats?: Stats | null }>("GET", `/api/bc-admin/work?view=stats${seasonId ? `&season=${seasonId}` : ""}`).then(
      ({ data }) => setS(data.stats ?? null),
    );
  }, [seasonId]);

  if (s === undefined) return <ListSkeleton />;
  if (!s) {
    return <Empty icon={<Trophy size={22} />} title={L("Данных пока нет", "Noch keine Daten")} />;
  }

  const max = Math.max(1, s.participants, ...s.perDay.map((d) => d.count));
  const tiles: [string, number][] = [
    [L("Участников", "Teilnehmer"), s.participants],
    [L("Ответов сдано", "Antworten"), s.submissions],
    [L("Ждут проверки", "Zu prüfen"), s.pending],
    [L("Средний балл", "Ø Punkte"), s.avgPoints],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map(([text, n]) => (
          <div key={text} className="rounded-[18px] border border-[#ece6d3] bg-white p-4">
            <p className="text-[30px] font-extrabold leading-none tracking-[-0.02em]">{n}</p>
            <p className="mt-2 text-[13px] text-[#8a8678]">{text}</p>
          </div>
        ))}
      </div>

      <section>
        <h3 className="mb-2 px-1 text-[15px] font-extrabold">
          {L("Кто пропал", "Wer fehlt")}{" "}
          <span className="font-semibold text-[#8a8678]">{s.quiet.length}</span>
        </h3>
        {s.quiet.length === 0 ? (
          <div className="flex items-center gap-2 rounded-[18px] border border-[#ece6d3] bg-white px-4 py-4 text-[14px] text-[#6f6a5c]">
            <Users size={16} />
            {L("Никто не пропускает 2 дня подряд и больше.", "Niemand fehlt 2 Tage in Folge oder länger.")}
          </div>
        ) : (
          <div className={ui.group}>
            {s.quiet.map((p) => (
              <div key={p.id} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{p.nickname}</p>
                  <p className="truncate text-[12px] text-[#8a8678]">
                    {p.name}
                    {" · "}
                    {L(`пропустил(а) дней: ${p.missed}`, `${p.missed} Tage verpasst`)}
                    {" · "}
                    {p.last
                      ? L(`последний ответ ${p.last.slice(8, 10)}.${p.last.slice(5, 7)}.`, `zuletzt ${p.last.slice(8, 10)}.${p.last.slice(5, 7)}.`)
                      : L("ещё не сдавал(а)", "noch nichts abgegeben")}
                  </p>
                </div>
                {p.whatsapp ? (
                  <a
                    href={p.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#1b2431] px-3.5 text-[13px] font-bold text-[#ffc93c] active:scale-95"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                ) : (
                  <span className="shrink-0 text-[11px] text-[#b3ad9b]">{L("нет номера", "keine Nummer")}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[18px] border border-[#ece6d3] bg-white p-4">
        <h3 className="text-[15px] font-extrabold">{L("Сколько сдали по дням", "Abgaben pro Tag")}</h3>
        {s.perDay.length === 0 ? (
          <p className="mt-2 text-[13px] text-[#8a8678]">{L("Нет опубликованных заданий.", "Keine veröffentlichten Aufgaben.")}</p>
        ) : (
          <div className="mt-4 flex h-32 items-end gap-1">
            {s.perDay.map((d) => (
              <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  className="w-full rounded-t-[4px] bg-[#ffc93c]"
                  style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
                  title={`${d.day}: ${d.count}`}
                />
                <span className="text-[9px] text-[#8a8678]">{d.day}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[15px] font-extrabold">{L("Лучшие", "Die Besten")}</h3>
        <div className={ui.group}>
          {s.top.map((p, i) => (
            <div key={p.id} className="flex min-h-[56px] items-center gap-3 px-4 py-2">
              <span
                className={cx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold",
                  i < 3 ? "bg-[#1b2431] text-[#ffc93c]" : "bg-[#f1ede1] text-[#8a8678]",
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{p.nickname}</span>
                <span className="block truncate text-[12px] text-[#8a8678]">{p.name}</span>
              </span>
              <span className="text-[17px] font-extrabold">{p.points}</span>
            </div>
          ))}
        </div>
      </section>

      <ExportSection seasonId={seasonId} />
    </div>
  );
}

/* ================= Экспорт итогов в PDF ================= */

function ExportSection({ seasonId }: { seasonId: number | null }) {
  const { L } = useL();
  const { toast } = useBcUi();
  const [busy, setBusy] = useState<"" | "people" | "gifts">("");

  const run = async (kind: "people" | "gifts") => {
    setBusy(kind);
    try {
      const { ok, data } = await bcCall<ExportData & { error?: string }>(
        "GET",
        `/api/bc-admin/work?view=export${seasonId ? `&season=${seasonId}` : ""}`,
      );
      if (!ok || !data.season) {
        toast(L("Не удалось получить данные", "Daten konnten nicht geladen werden"), "error");
        return;
      }
      if (kind === "people") {
        await downloadParticipantsPdf(data);
      } else {
        if (data.gifts.length === 0) {
          toast(L("Пока нет подарков со ссылкой", "Noch keine Geschenke mit Link"), "error");
          return;
        }
        await downloadGiftsPdf(data);
      }
      toast(L("PDF готов", "PDF fertig"));
    } catch {
      toast(L("Не получилось создать PDF", "PDF konnte nicht erstellt werden"), "error");
    } finally {
      setBusy("");
    }
  };

  const btn = (kind: "people" | "gifts", title: string, sub: string) => (
    <button
      type="button"
      disabled={busy !== ""}
      onClick={() => run(kind)}
      className="flex w-full items-center gap-3 rounded-[18px] border border-[#ece6d3] bg-white p-4 text-left active:scale-[0.99] disabled:opacity-60"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#fff4d1] text-[#9a6b00]">
        {busy === kind ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold">{title}</span>
        <span className="block text-[12px] text-[#8a8678]">{sub}</span>
      </span>
    </button>
  );

  return (
    <section>
      <h3 className="mb-2 px-1 text-[15px] font-extrabold">{L("Экспорт итогов (PDF)", "Export der Ergebnisse (PDF)")}</h3>
      <div className="space-y-2.5">
        {btn(
          "people",
          L("Описание и участники", "Beschreibung und Teilnehmer"),
          L("Текст челленджа и таблица имён", "Text der Challenge und Namenstabelle"),
        )}
        {btn(
          "gifts",
          L("Таблица подарков", "Geschenketabelle"),
          L("Имя, ссылка на Amazon, цена", "Name, Amazon-Link, Preis"),
        )}
      </div>
    </section>
  );
}