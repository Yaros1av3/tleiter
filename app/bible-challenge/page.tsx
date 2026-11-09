"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Season = {
  id: number;
  year: number;
  number: number;
  title_de: string;
  title_ru: string;
  start_date: string | null;
  end_date: string | null;
  status: "draft" | "active" | "finished";
};
type Task = {
  id: number;
  season_id: number;
  day_number: number;
  task_date: string;
  deadline: string;
  bible_ref: string | null;
  title_de: string;
  title_ru: string;
  text_de: string | null;
  text_ru: string | null;
  is_published: boolean;
};
type Participant = {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string;
  avatar_url: string | null;
  mentor_id: number | null;
  status: "active" | "blocked";
  hide_in_ranking: boolean;
  is_guest: boolean;
  points: number;
  days_done: number;
};
type Overview = {
  me: { isAdmin: boolean; memberId: number | null };
  seasons: Season[];
  season: Season | null;
  tasks: Task[];
  participants: Participant[];
  team: { id: number; name: string }[];
};

type Tab = "tasks" | "people";

const label = "text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9585]";
const card = "rounded-[22px] border border-[#e9e3d3] bg-white";
const input =
  "h-11 w-full rounded-xl border border-[#e0d9c4] bg-white px-3 text-[15px] outline-none focus:border-[#1b2431]";
const area =
  "min-h-[90px] w-full rounded-xl border border-[#e0d9c4] bg-white px-3 py-2 text-[15px] outline-none focus:border-[#1b2431]";
const btnDark =
  "flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1b2431] px-4 text-[14px] font-bold text-[#ffc93c] disabled:opacity-50";
const btnLight =
  "flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e0d9c4] bg-white px-4 text-[14px] font-bold disabled:opacity-50";

const pad = (n: number) => String(n).padStart(2, "0");
function toLocalInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function plusDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function call<R = Record<string, unknown>>(
  method: "GET" | "POST",
  url: string,
  body?: unknown,
): Promise<{ ok: boolean; data: R & { error?: string } }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: "network" } as R & { error?: string } };
  }
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-8" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[560px] rounded-[24px] bg-[#faf8f3] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function BibleChallengeAdminPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isRu = language === "ru";
  const L = (ru: string, de: string) => (isRu ? ru : de);

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("tasks");
  const [msg, setMsg] = useState("");

  const [seasonForm, setSeasonForm] = useState<Partial<Season> | null>(null);
  const [taskForm, setTaskForm] = useState<Partial<Task> | null>(null);
  const [tempPw, setTempPw] = useState<{ nick: string; pw: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "nomentor" | "guests">("all");

  const load = useCallback(
    async (sid?: number | null) => {
      const s = sid ?? seasonId;
      const { ok, data: d } = await call<Overview>("GET", `/api/bc-admin${s ? `?season=${s}` : ""}`);
      if (!ok) {
        setFailed(true);
      } else {
        setFailed(false);
        setData(d as Overview);
        setSeasonId((d as Overview).season?.id ?? null);
      }
      setLoading(false);
    },
    [seasonId],
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 3500);
  };

  const errText = (code?: string) => {
    const map: Record<string, string> = {
      season_exists: L("Такой сезон уже есть.", "Diese Saison gibt es schon."),
      day_exists: L("Задание с таким номером дня уже есть.", "Für diesen Tag gibt es schon eine Aufgabe."),
      has_submissions: L("Есть ответы, удалять нельзя.", "Es gibt Antworten, Löschen nicht möglich."),
      no_dates: L("Укажите даты начала и конца сезона.", "Start- und Enddatum der Saison angeben."),
      empty: L("Заполните все обязательные поля.", "Bitte alle Pflichtfelder ausfüllen."),
      forbidden: L("Нет доступа.", "Kein Zugriff."),
    };
    return map[code ?? ""] ?? L("Не получилось. Попробуйте ещё раз.", "Das hat nicht geklappt. Bitte nochmal versuchen.");
  };

  const act = async (body: Record<string, unknown>, okText?: string) => {
    setBusy(true);
    const { ok, data: d } = await call<{ created?: number; password?: string }>("POST", "/api/bc-admin", body);
    setBusy(false);
    if (!ok) {
      flash(errText(d.error));
      return null;
    }
    if (okText) flash(okText);
    await load();
    return d;
  };

  const season = data?.season ?? null;
  const isAdmin = data?.me.isAdmin ?? false;
  const mentorName = (id: number | null) => data?.team.find((m) => m.id === id)?.name ?? "";

  const people = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.participants ?? []).filter((p) => {
      if (filter === "nomentor" && p.mentor_id) return false;
      if (filter === "guests" && !p.is_guest) return false;
      if (!needle) return true;
      return `${p.nickname} ${p.first_name} ${p.last_name}`.toLowerCase().includes(needle);
    });
  }, [data, q, filter]);

  const statusChip = (s: Season) =>
    s.status === "active"
      ? { text: L("идёт", "läuft"), cls: "bg-[#ffc93c] text-[#1b2431]" }
      : s.status === "finished"
        ? { text: L("завершён", "beendet"), cls: "bg-[#1b2431] text-[#ffc93c]" }
        : { text: L("черновик", "Entwurf"), cls: "bg-[#f3efe3] text-[#6f6a5c]" };

  return (
    <main className="min-h-screen bg-[#faf8f3] px-4 pb-28 pt-6 text-[#1b2431]">
      <div className="mx-auto max-w-[680px]">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-4 flex items-center gap-1.5 text-[13px] font-semibold text-[#6f6a5c]"
        >
          <ArrowLeft size={15} />
          {L("Назад", "Zurück")}
        </button>

        <p className={label}>{L("Подростки", "Teens")}</p>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-[-0.02em]">Bibel-Challenge</h1>

        {msg && (
          <p className="mt-3 rounded-xl bg-[#fff4d1] px-3.5 py-2.5 text-[13px] font-semibold text-[#9a6b00]">{msg}</p>
        )}

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 size={22} className="animate-spin text-[#8a8678]" />
          </div>
        ) : failed || !data ? (
          <div className={`${card} mt-6 px-5 py-8 text-center text-sm text-[#8a8678]`}>
            {L("Не удалось загрузить.", "Konnte nicht geladen werden.")}
          </div>
        ) : (
          <>
            {/* сезон */}
            <div className={`${card} mt-5 p-4`}>
              <p className={label}>{L("Сезон", "Saison")}</p>
              {data.seasons.length > 0 ? (
                <div className="mt-2 flex gap-2">
                  <select
                    className={input}
                    value={seasonId ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSeasonId(id);
                      void load(id);
                    }}
                  >
                    {data.seasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.year} · {s.number} — {isRu ? s.title_ru : s.title_de}
                      </option>
                    ))}
                  </select>
                  {isAdmin && (
                    <button
                      type="button"
                      className={btnLight}
                      onClick={() =>
                        setSeasonForm({
                          year: new Date().getFullYear(),
                          number: 1,
                          title_de: "",
                          title_ru: "",
                          start_date: "",
                          end_date: "",
                        })
                      }
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[13px] text-[#8a8678]">{L("Сезонов пока нет.", "Noch keine Saison.")}</p>
              )}

              {season && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statusChip(season).cls}`}>
                    {statusChip(season).text}
                  </span>
                  <span className="text-[12px] text-[#8a8678]">
                    {season.start_date ?? "?"} — {season.end_date ?? "?"}
                  </span>
                  {isAdmin && (
                    <div className="ml-auto flex gap-2">
                      <button type="button" className="text-[12px] font-bold underline" onClick={() => setSeasonForm(season)}>
                        {L("Изменить", "Ändern")}
                      </button>
                      {season.status === "draft" && (
                        <button
                          type="button"
                          className="text-[12px] font-bold underline"
                          disabled={busy}
                          onClick={() => act({ action: "season_status", id: season.id, status: "active" }, L("Сезон запущен.", "Saison gestartet."))}
                        >
                          {L("Запустить", "Starten")}
                        </button>
                      )}
                      {season.status === "active" && (
                        <button
                          type="button"
                          className="text-[12px] font-bold underline"
                          disabled={busy}
                          onClick={() => act({ action: "season_status", id: season.id, status: "draft" }, L("Сезон остановлен.", "Saison gestoppt."))}
                        >
                          {L("Остановить", "Stoppen")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!season && isAdmin && (
                <button
                  type="button"
                  className={`${btnDark} mt-3 w-full`}
                  onClick={() =>
                    setSeasonForm({
                      year: new Date().getFullYear(),
                      number: 1,
                      title_de: "",
                      title_ru: "",
                      start_date: "",
                      end_date: "",
                    })
                  }
                >
                  <Plus size={16} />
                  {L("Создать сезон", "Saison erstellen")}
                </button>
              )}
            </div>

            {/* вкладки */}
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-[#f1ede1] p-1">
              {(
                [
                  ["tasks", L("Задания", "Aufgaben"), CalendarDays],
                  ["people", L("Участники", "Teilnehmer"), Users],
                ] as const
              ).map(([key, text, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex h-10 items-center justify-center gap-2 rounded-xl text-[13px] font-bold ${
                    tab === key ? "bg-white shadow-sm" : "text-[#8a8678]"
                  }`}
                >
                  <Icon size={15} />
                  {text}
                </button>
              ))}
            </div>

            {/* задания */}
            {tab === "tasks" && season && (
              <div className="mt-4 space-y-2">
                {isAdmin && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={btnDark}
                      onClick={() => {
                        const next = (data.tasks.at(-1)?.day_number ?? 0) + 1;
                        const date = season.start_date ? plusDays(season.start_date, next - 1) : "";
                        setTaskForm({
                          season_id: season.id,
                          day_number: next,
                          task_date: date,
                          deadline: date ? new Date(`${date}T23:59`).toISOString() : "",
                          title_de: "",
                          title_ru: "",
                          is_published: false,
                        });
                      }}
                    >
                      <Plus size={16} />
                      {L("Задание", "Aufgabe")}
                    </button>
                    <button
                      type="button"
                      className={btnLight}
                      disabled={busy}
                      onClick={() => act({ action: "tasks_generate", season_id: season.id }, L("Заготовки созданы.", "Vorlagen erstellt."))}
                    >
                      <Sparkles size={16} />
                      {L("Все дни сразу", "Alle Tage")}
                    </button>
                  </div>
                )}

                {data.tasks.length === 0 ? (
                  <div className={`${card} px-5 py-8 text-center text-sm text-[#8a8678]`}>
                    {L(
                      "Заданий нет. Нажмите «Все дни сразу», чтобы создать заготовки на весь сезон, и заполните их.",
                      "Keine Aufgaben. Mit „Alle Tage“ erstellst du Vorlagen für die ganze Saison, dann füllst du sie aus.",
                    )}
                  </div>
                ) : (
                  data.tasks.map((t) => (
                    <div key={t.id} className={`${card} flex items-center gap-3 p-3`}>
                      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#fff4d1] text-[#9a6b00]">
                        <span className="text-[9px] font-bold uppercase leading-none">{L("день", "Tag")}</span>
                        <span className="text-[17px] font-extrabold leading-none">{t.day_number}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold">{isRu ? t.title_ru : t.title_de}</p>
                        <p className="truncate text-[12px] text-[#8a8678]">
                          {t.task_date}
                          {t.bible_ref ? ` · ${t.bible_ref}` : ""}
                          {!t.text_de && !t.text_ru ? ` · ${L("без текста", "ohne Text")}` : ""}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label="publish"
                            disabled={busy}
                            onClick={() => act({ action: "task_publish", id: t.id, value: !t.is_published })}
                            className={`flex h-9 w-9 items-center justify-center rounded-full ${
                              t.is_published ? "bg-[#ffc93c]" : "bg-[#f1ede1] text-[#8a8678]"
                            }`}
                            title={t.is_published ? L("Опубликовано", "Veröffentlicht") : L("Скрыто", "Versteckt")}
                          >
                            {t.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                          <button
                            type="button"
                            aria-label="edit"
                            onClick={() => setTaskForm(t)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1ede1]"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label="delete"
                            onClick={() => {
                              if (confirm(L("Удалить задание?", "Aufgabe löschen?"))) {
                                void act({ action: "task_delete", id: t.id });
                              }
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1ede1] text-[#a33]"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* участники */}
            {tab === "people" && (
              <div className="mt-4 space-y-3">
                {!isAdmin && (
                  <p className="text-[12px] text-[#8a8678]">
                    {L("Вы видите только своих подопечных.", "Du siehst nur deine Teilnehmer.")}
                  </p>
                )}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-[#9a9585]" />
                    <input
                      className={`${input} pl-9`}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={L("Поиск", "Suchen")}
                    />
                  </div>
                  {isAdmin && (
                    <select
                      className={`${input} !w-auto`}
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as typeof filter)}
                    >
                      <option value="all">{L("Все", "Alle")}</option>
                      <option value="nomentor">{L("Без ответственного", "Ohne Zuständigen")}</option>
                      <option value="guests">{L("Гости", "Gäste")}</option>
                    </select>
                  )}
                </div>
                <p className={label}>
                  {L("Участников", "Teilnehmer")} · {people.length}
                </p>

                {people.length === 0 ? (
                  <div className={`${card} px-5 py-8 text-center text-sm text-[#8a8678]`}>
                    {L("Никого нет.", "Niemand da.")}
                  </div>
                ) : (
                  people.map((p) => (
                    <div key={p.id} className={`${card} p-3.5 ${p.status === "blocked" ? "opacity-60" : ""}`}>
                      <div className="flex items-center gap-3">
                        {p.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffc93c] font-extrabold">
                            {p.nickname.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-extrabold">{p.nickname}</p>
                          <p className="truncate text-[12px] text-[#8a8678]">
                            {p.first_name} {p.last_name}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.is_guest && (
                              <span className="rounded-full bg-[#fff4d1] px-2 py-0.5 text-[10px] font-bold text-[#9a6b00]">
                                {L("Гость", "Gast")}
                              </span>
                            )}
                            {p.hide_in_ranking && (
                              <span className="rounded-full bg-[#f1ede1] px-2 py-0.5 text-[10px] font-bold text-[#6f6a5c]">
                                {L("скрыт в рейтинге", "im Ranking versteckt")}
                              </span>
                            )}
                            {p.status === "blocked" && (
                              <span className="rounded-full bg-[#1b2431] px-2 py-0.5 text-[10px] font-bold text-[#ffc93c]">
                                {L("заблокирован", "gesperrt")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[18px] font-extrabold leading-none">{p.points}</p>
                          <p className="mt-0.5 text-[10px] text-[#8a8678]">
                            {p.days_done} {L("дн.", "Tage")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {isAdmin ? (
                          <select
                            className="h-10 min-w-0 flex-1 rounded-xl border border-[#e0d9c4] bg-white px-2 text-[13px]"
                            value={p.mentor_id ?? ""}
                            disabled={busy}
                            onChange={(e) =>
                              act({ action: "participant_update", id: p.id, mentor_id: e.target.value ? Number(e.target.value) : null })
                            }
                          >
                            <option value="">{L("Ответственный: не назначен", "Zuständig: nicht festgelegt")}</option>
                            {data.team.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="min-w-0 flex-1 truncate text-[12px] text-[#8a8678]">{mentorName(p.mentor_id)}</p>
                        )}
                        <button
                          type="button"
                          title={L("Сбросить пароль", "Passwort zurücksetzen")}
                          disabled={busy}
                          onClick={async () => {
                            if (!confirm(L(`Сбросить пароль для ${p.nickname}?`, `Passwort für ${p.nickname} zurücksetzen?`))) return;
                            const d = await act({ action: "participant_reset_password", id: p.id });
                            if (d?.password) setTempPw({ nick: p.nickname, pw: d.password });
                          }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1ede1]"
                        >
                          <KeyRound size={16} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              title={L("Скрыть в рейтинге", "Im Ranking verstecken")}
                              disabled={busy}
                              onClick={() => act({ action: "participant_update", id: p.id, hide_in_ranking: !p.hide_in_ranking })}
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                p.hide_in_ranking ? "bg-[#ffc93c]" : "bg-[#f1ede1]"
                              }`}
                            >
                              {p.hide_in_ranking ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button
                              type="button"
                              title={L("Заблокировать", "Sperren")}
                              disabled={busy}
                              onClick={() =>
                                act({
                                  action: "participant_update",
                                  id: p.id,
                                  status: p.status === "blocked" ? "active" : "blocked",
                                })
                              }
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                p.status === "blocked" ? "bg-[#1b2431] text-[#ffc93c]" : "bg-[#f1ede1]"
                              }`}
                            >
                              <Ban size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* форма сезона */}
      {seasonForm && (
        <Modal onClose={() => setSeasonForm(null)}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[18px] font-extrabold">
              {seasonForm.id ? L("Изменить сезон", "Saison ändern") : L("Новый сезон", "Neue Saison")}
            </h2>
            <button type="button" onClick={() => setSeasonForm(null)} aria-label="close">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={label}>{L("Год", "Jahr")}</span>
                <input
                  className={`${input} mt-1`}
                  type="number"
                  value={seasonForm.year ?? ""}
                  onChange={(e) => setSeasonForm({ ...seasonForm, year: Number(e.target.value) })}
                />
              </label>
              <label className="block">
                <span className={label}>{L("Номер в году", "Nr. im Jahr")}</span>
                <input
                  className={`${input} mt-1`}
                  type="number"
                  value={seasonForm.number ?? ""}
                  onChange={(e) => setSeasonForm({ ...seasonForm, number: Number(e.target.value) })}
                />
              </label>
            </div>
            <label className="block">
              <span className={label}>{L("Название (немецкий)", "Titel (Deutsch)")}</span>
              <input
                className={`${input} mt-1`}
                value={seasonForm.title_de ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, title_de: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={label}>{L("Название (русский)", "Titel (Russisch)")}</span>
              <input
                className={`${input} mt-1`}
                value={seasonForm.title_ru ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, title_ru: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={label}>{L("Начало", "Start")}</span>
                <input
                  className={`${input} mt-1`}
                  type="date"
                  value={seasonForm.start_date ?? ""}
                  onChange={(e) => setSeasonForm({ ...seasonForm, start_date: e.target.value })}
                />
              </label>
              <label className="block">
                <span className={label}>{L("Конец", "Ende")}</span>
                <input
                  className={`${input} mt-1`}
                  type="date"
                  value={seasonForm.end_date ?? ""}
                  onChange={(e) => setSeasonForm({ ...seasonForm, end_date: e.target.value })}
                />
              </label>
            </div>
            <button
              type="button"
              className={`${btnDark} w-full`}
              disabled={busy}
              onClick={async () => {
                const d = await act({ action: "season_save", ...seasonForm }, L("Сохранено.", "Gespeichert."));
                if (d) setSeasonForm(null);
              }}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {L("Сохранить", "Speichern")}
            </button>
          </div>
        </Modal>
      )}

      {/* форма задания */}
      {taskForm && (
        <Modal onClose={() => setTaskForm(null)}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[18px] font-extrabold">
              {taskForm.id ? L("Изменить задание", "Aufgabe ändern") : L("Новое задание", "Neue Aufgabe")}
            </h2>
            <button type="button" onClick={() => setTaskForm(null)} aria-label="close">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={label}>{L("Номер дня", "Tag Nr.")}</span>
                <input
                  className={`${input} mt-1`}
                  type="number"
                  value={taskForm.day_number ?? ""}
                  onChange={(e) => setTaskForm({ ...taskForm, day_number: Number(e.target.value) })}
                />
              </label>
              <label className="block">
                <span className={label}>{L("Дата задания", "Datum")}</span>
                <input
                  className={`${input} mt-1`}
                  type="date"
                  value={taskForm.task_date ?? ""}
                  onChange={(e) => setTaskForm({ ...taskForm, task_date: e.target.value })}
                />
              </label>
            </div>
            <label className="block">
              <span className={label}>{L("Срок сдачи (за срок 10 баллов, позже 5)", "Abgabefrist (pünktlich 10 Punkte, später 5)")}</span>
              <input
                className={`${input} mt-1`}
                type="datetime-local"
                value={taskForm.deadline ? toLocalInput(taskForm.deadline) : ""}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, deadline: e.target.value ? new Date(e.target.value).toISOString() : "" })
                }
              />
            </label>
            <label className="block">
              <span className={label}>{L("Место в Библии", "Bibelstelle")}</span>
              <input
                className={`${input} mt-1`}
                value={taskForm.bible_ref ?? ""}
                onChange={(e) => setTaskForm({ ...taskForm, bible_ref: e.target.value })}
                placeholder="1. Mose 1"
              />
            </label>
            <label className="block">
              <span className={label}>{L("Заголовок (немецкий)", "Titel (Deutsch)")}</span>
              <input
                className={`${input} mt-1`}
                value={taskForm.title_de ?? ""}
                onChange={(e) => setTaskForm({ ...taskForm, title_de: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={label}>{L("Заголовок (русский)", "Titel (Russisch)")}</span>
              <input
                className={`${input} mt-1`}
                value={taskForm.title_ru ?? ""}
                onChange={(e) => setTaskForm({ ...taskForm, title_ru: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={label}>{L("Текст и вопросы (немецкий)", "Text und Fragen (Deutsch)")}</span>
              <textarea
                className={`${area} mt-1`}
                value={taskForm.text_de ?? ""}
                onChange={(e) => setTaskForm({ ...taskForm, text_de: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={label}>{L("Текст и вопросы (русский)", "Text und Fragen (Russisch)")}</span>
              <textarea
                className={`${area} mt-1`}
                value={taskForm.text_ru ?? ""}
                onChange={(e) => setTaskForm({ ...taskForm, text_ru: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-3 rounded-xl bg-white px-3 py-3">
              <input
                type="checkbox"
                checked={Boolean(taskForm.is_published)}
                onChange={(e) => setTaskForm({ ...taskForm, is_published: e.target.checked })}
                className="h-5 w-5"
              />
              <span className="text-[14px] font-semibold">
                {L("Опубликовано (подростки увидят в день задания)", "Veröffentlicht (Teens sehen es am Tag der Aufgabe)")}
              </span>
            </label>
            <button
              type="button"
              className={`${btnDark} w-full`}
              disabled={busy}
              onClick={async () => {
                const d = await act({ action: "task_save", ...taskForm }, L("Сохранено.", "Gespeichert."));
                if (d) setTaskForm(null);
              }}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {L("Сохранить", "Speichern")}
            </button>
          </div>
        </Modal>
      )}

      {/* временный пароль */}
      {tempPw && (
        <Modal onClose={() => setTempPw(null)}>
          <h2 className="text-[18px] font-extrabold">{L("Новый пароль", "Neues Passwort")}</h2>
          <p className="mt-1 text-[13px] text-[#8a8678]">
            {L(
              `Для ${tempPw.nick}. Передайте подростку, он сможет сменить его в профиле. Показывается один раз.`,
              `Für ${tempPw.nick}. Gib es dem Teen, er kann es im Profil ändern. Wird nur einmal angezeigt.`,
            )}
          </p>
          <p className="mt-4 rounded-xl bg-white px-4 py-3 text-center font-mono text-[22px] font-extrabold tracking-wider">
            {tempPw.pw}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={btnLight}
              onClick={() => {
                void navigator.clipboard?.writeText(tempPw.pw);
                flash(L("Скопировано.", "Kopiert."));
              }}
            >
              <Copy size={16} />
              {L("Копировать", "Kopieren")}
            </button>
            <button type="button" className={btnDark} onClick={() => setTempPw(null)}>
              OK
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}