"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  BarChart3,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { GiftsTab, ReviewTab, StatsTab } from "@/components/BcAdminTabs";

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
type Member = { id: number; name: string; has_account: boolean };
type Overview = {
  me: { isAdmin: boolean; memberId: number | null };
  seasons: Season[];
  season: Season | null;
  tasks: Task[];
  participants: Participant[];
  team: Member[];
};

type Tab = "review" | "tasks" | "people" | "gifts" | "stats";

const label = "text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9585]";
const card = "rounded-2xl border border-[#e9e3d3] bg-white";
const input =
  "h-11 w-full rounded-xl border border-[#e0d9c4] bg-white px-3 text-[15px] outline-none focus:border-[#1b2431]";
const area =
  "min-h-[90px] w-full rounded-xl border border-[#e0d9c4] bg-white px-3 py-2 text-[15px] outline-none focus:border-[#1b2431]";
const btnDark =
  "flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1b2431] px-4 text-[14px] font-bold text-[#ffc93c] disabled:opacity-50";
const btnLight =
  "flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e0d9c4] bg-white px-4 text-[14px] font-bold disabled:opacity-50";
const btnDanger =
  "flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e6c3c3] bg-white px-4 text-[14px] font-bold text-[#a33] disabled:opacity-50";

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
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/40 px-4 py-8" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[560px] rounded-[22px] bg-[#faf8f3] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={label}>{text}</span>
      <div className="mt-1">{children}</div>
    </label>
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
  const [tab, setTab] = useState<Tab>("review");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [seasonForm, setSeasonForm] = useState<Partial<Season> | null>(null);
  const [taskForm, setTaskForm] = useState<Partial<Task> | null>(null);
  const [tempPw, setTempPw] = useState<{ nick: string; pw: string } | null>(null);
  const [delSeason, setDelSeason] = useState<Season | null>(null);
  const [delText, setDelText] = useState("");
  const [distOpen, setDistOpen] = useState(false);
  const [distMentors, setDistMentors] = useState<number[]>([]);

  /* задания */
  const [taskSelect, setTaskSelect] = useState(false);
  const [pickedTasks, setPickedTasks] = useState<number[]>([]);

  /* участники */
  const [q, setQ] = useState("");
  const [mentorFilter, setMentorFilter] = useState<"all" | "none" | number>("all");
  const [peopleSelect, setPeopleSelect] = useState(false);
  const [pickedPeople, setPickedPeople] = useState<number[]>([]);
  const [openPerson, setOpenPerson] = useState<number | null>(null);

  const load = useCallback(
    async (sid?: number | null) => {
      const s = sid === undefined ? seasonId : sid;
      const { ok, data: d } = await call<Overview>("GET", `/api/bc-admin${s ? `?season=${s}` : ""}`);
      if (!ok) setFailed(true);
      else {
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
      no_dates: L("Укажите даты начала и конца сезона.", "Start- und Enddatum der Saison angeben."),
      empty: L("Заполните все обязательные поля.", "Bitte alle Pflichtfelder ausfüllen."),
      forbidden: L("Нет доступа.", "Kein Zugriff."),
    };
    return map[code ?? ""] ?? L("Не получилось. Попробуйте ещё раз.", "Das hat nicht geklappt. Bitte nochmal versuchen.");
  };

  const act = async (body: Record<string, unknown>, okText?: string) => {
    setBusy(true);
    const { ok, data: d } = await call<{
      created?: number;
      password?: string;
      deleted?: number;
      skippedIds?: number[];
    }>("POST", "/api/bc-admin", body);
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
  const team = useMemo(() => data?.team ?? [], [data]);
  const mentorName = (id: number | null) => team.find((m) => m.id === id)?.name ?? "";

  const loadByMentor = useMemo(() => {
    const m = new Map<number, number>();
    let none = 0;
    for (const p of data?.participants ?? []) {
      if (p.mentor_id) m.set(p.mentor_id, (m.get(p.mentor_id) ?? 0) + 1);
      else none += 1;
    }
    return { m, none };
  }, [data]);

  const people = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.participants ?? []).filter((p) => {
      if (mentorFilter === "none" && p.mentor_id) return false;
      if (typeof mentorFilter === "number" && p.mentor_id !== mentorFilter) return false;
      if (!needle) return true;
      return `${p.nickname} ${p.first_name} ${p.last_name}`.toLowerCase().includes(needle);
    });
  }, [data, q, mentorFilter]);

  const statusChip = (s: Season) =>
    s.status === "active"
      ? { text: L("идёт", "läuft"), cls: "bg-[#ffc93c] text-[#1b2431]" }
      : s.status === "finished"
        ? { text: L("завершён", "beendet"), cls: "bg-[#1b2431] text-[#ffc93c]" }
        : { text: L("черновик", "Entwurf"), cls: "bg-[#f3efe3] text-[#6f6a5c]" };

  const newSeasonForm = () =>
    setSeasonForm({
      year: new Date().getFullYear(),
      number: 1,
      title_de: "",
      title_ru: "",
      start_date: "",
      end_date: "",
    });

  const togglePick = (list: number[], id: number, set: (v: number[]) => void) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  /* удалить выбранные задания */
  const deleteTasks = async () => {
    if (!pickedTasks.length) return;
    if (!confirm(L(`Удалить заданий: ${pickedTasks.length}?`, `${pickedTasks.length} Aufgaben löschen?`))) return;
    const d = await act({ action: "tasks_bulk", op: "delete", ids: pickedTasks });
    if (!d) return;
    const skipped = d.skippedIds ?? [];
    if (skipped.length) {
      const yes = confirm(
        L(
          `У ${skipped.length} заданий уже есть ответы подростков. Удалить их вместе с ответами и фото? Это нельзя отменить.`,
          `Für ${skipped.length} Aufgaben gibt es schon Antworten. Mit Antworten und Fotos löschen? Das lässt sich nicht rückgängig machen.`,
        ),
      );
      if (yes) await act({ action: "tasks_bulk", op: "delete", ids: skipped, force: true });
    }
    flash(L("Готово.", "Fertig."));
    setPickedTasks([]);
    setTaskSelect(false);
  };

  const assignPicked = async (mentorId: number | null) => {
    if (!pickedPeople.length) return;
    const d = await act(
      { action: "participants_assign", ids: pickedPeople, mentor_id: mentorId },
      L("Назначено.", "Zugewiesen."),
    );
    if (d) {
      setPickedPeople([]);
      setPeopleSelect(false);
    }
  };

  const distribute = async () => {
    const ids = pickedPeople.length
      ? pickedPeople
      : (data?.participants ?? []).filter((p) => !p.mentor_id).map((p) => p.id);
    const d = await act(
      { action: "participants_distribute", ids, mentor_ids: distMentors },
      L(`Распределено: ${ids.length}.`, `Verteilt: ${ids.length}.`),
    );
    if (d) {
      setDistOpen(false);
      setPickedPeople([]);
      setPeopleSelect(false);
    }
  };

  const barOn = (tab === "tasks" && taskSelect) || (tab === "people" && peopleSelect);

  return (
    <main className={`min-h-screen bg-[#faf8f3] px-4 pt-6 text-[#1b2431] ${barOn ? "pb-48" : "pb-28"}`}>
      <div className="mx-auto max-w-[680px]">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-[#6f6a5c]"
        >
          <ArrowLeft size={15} />
          {L("Назад", "Zurück")}
        </button>

        <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">Bibel-Challenge</h1>

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
            <div className={`${card} mt-4 p-3`}>
              {data.seasons.length > 0 ? (
                <div className="flex items-center gap-2">
                  <select
                    className={`${input} min-w-0 flex-1`}
                    value={seasonId ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSeasonId(id);
                      setPickedTasks([]);
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
                    <>
                      <button type="button" className={btnLight} onClick={newSeasonForm} aria-label="new">
                        <Plus size={18} />
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          className={btnLight}
                          onClick={() => setMenuOpen((v) => !v)}
                          aria-label="menu"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuOpen && season && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-[#e0d9c4] bg-white shadow-lg">
                              <button
                                type="button"
                                className="block w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-[#faf8f3]"
                                onClick={() => {
                                  setMenuOpen(false);
                                  setSeasonForm(season);
                                }}
                              >
                                {L("Изменить сезон", "Saison ändern")}
                              </button>
                              {season.status === "draft" && (
                                <button
                                  type="button"
                                  className="block w-full border-t border-[#f0ebdc] px-4 py-3 text-left text-[14px] font-semibold active:bg-[#faf8f3]"
                                  onClick={() => {
                                    setMenuOpen(false);
                                    void act(
                                      { action: "season_status", id: season.id, status: "active" },
                                      L("Сезон запущен.", "Saison gestartet."),
                                    );
                                  }}
                                >
                                  {L("Запустить", "Starten")}
                                </button>
                              )}
                              {season.status === "active" && (
                                <>
                                  <button
                                    type="button"
                                    className="block w-full border-t border-[#f0ebdc] px-4 py-3 text-left text-[14px] font-semibold active:bg-[#faf8f3]"
                                    onClick={() => {
                                      setMenuOpen(false);
                                      void act(
                                        { action: "season_status", id: season.id, status: "draft" },
                                        L("Сезон остановлен.", "Saison gestoppt."),
                                      );
                                    }}
                                  >
                                    {L("Остановить", "Stoppen")}
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full border-t border-[#f0ebdc] px-4 py-3 text-left text-[14px] font-semibold active:bg-[#faf8f3]"
                                    onClick={async () => {
                                      setMenuOpen(false);
                                      if (
                                        !confirm(
                                          L(
                                            "Завершить сезон? Подросткам будут выданы награды, это нельзя отменить.",
                                            "Saison beenden? Die Auszeichnungen werden vergeben, das lässt sich nicht rückgängig machen.",
                                          ),
                                        )
                                      )
                                        return;
                                      setBusy(true);
                                      const { ok } = await call("POST", "/api/bc-admin/work", {
                                        action: "season_finish",
                                        id: season.id,
                                      });
                                      setBusy(false);
                                      flash(
                                        ok
                                          ? L("Сезон завершён, награды выданы.", "Saison beendet, Auszeichnungen vergeben.")
                                          : errText(),
                                      );
                                      await load();
                                    }}
                                  >
                                    {L("Завершить и выдать награды", "Beenden und Auszeichnungen vergeben")}
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className="block w-full border-t border-[#f0ebdc] px-4 py-3 text-left text-[14px] font-semibold text-[#a33] active:bg-[#faf8f3]"
                                onClick={() => {
                                  setMenuOpen(false);
                                  setDelText("");
                                  setDelSeason(season);
                                }}
                              >
                                {L("Удалить сезон", "Saison löschen")}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-[13px] text-[#8a8678]">{L("Сезонов пока нет.", "Noch keine Saison.")}</p>
                  {isAdmin && (
                    <button type="button" className={`${btnDark} mt-3 w-full`} onClick={newSeasonForm}>
                      <Plus size={16} />
                      {L("Создать сезон", "Saison erstellen")}
                    </button>
                  )}
                </div>
              )}
              {season && (
                <div className="mt-2.5 flex items-center gap-2 px-0.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${statusChip(season).cls}`}>
                    {statusChip(season).text}
                  </span>
                  <span className="text-[12px] text-[#8a8678]">
                    {season.start_date ?? "?"} — {season.end_date ?? "?"}
                  </span>
                </div>
              )}
            </div>

            {/* вкладки */}
            <div className="sticky top-0 z-30 -mx-4 mt-3 bg-[#faf8f3]/95 px-4 py-2 backdrop-blur">
              <div className="flex gap-1 overflow-x-auto rounded-2xl bg-[#f1ede1] p-1">
                {(
                  [
                    ["review", L("Проверка", "Prüfung"), ClipboardCheck],
                    ["tasks", L("Задания", "Aufgaben"), CalendarDays],
                    ["people", L("Участники", "Teilnehmer"), Users],
                    ["gifts", L("Подарки", "Geschenke"), Gift],
                    ["stats", L("Статистика", "Statistik"), BarChart3],
                  ] as const
                ).map(([key, text, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-[13px] font-bold ${
                      tab === key ? "bg-white shadow-sm" : "text-[#8a8678]"
                    }`}
                  >
                    <Icon size={15} />
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {tab === "review" && <ReviewTab key={seasonId ?? 0} seasonId={seasonId} />}
            {tab === "gifts" && <GiftsTab />}
            {tab === "stats" && <StatsTab key={seasonId ?? 0} seasonId={seasonId} />}

            {/* ЗАДАНИЯ */}
            {tab === "tasks" && season && (
              <div className="mt-2 space-y-2">
                {isAdmin && (
                  <div className="grid grid-cols-3 gap-2">
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
                      {L("Новое", "Neu")}
                    </button>
                    <button
                      type="button"
                      className={btnLight}
                      disabled={busy}
                      onClick={() =>
                        act({ action: "tasks_generate", season_id: season.id }, L("Заготовки созданы.", "Vorlagen erstellt."))
                      }
                    >
                      <Sparkles size={16} />
                      {L("Все дни", "Alle Tage")}
                    </button>
                    <button
                      type="button"
                      className={`${btnLight} ${taskSelect ? "!bg-[#ffc93c]" : ""}`}
                      onClick={() => {
                        setTaskSelect((v) => !v);
                        setPickedTasks([]);
                      }}
                    >
                      <CheckSquare size={16} />
                      {L("Выбрать", "Wählen")}
                    </button>
                  </div>
                )}

                {data.tasks.length === 0 ? (
                  <div className={`${card} px-5 py-8 text-center text-sm text-[#8a8678]`}>
                    {L(
                      "Заданий нет. Нажмите «Все дни», чтобы создать заготовки на весь сезон, и заполните их.",
                      "Keine Aufgaben. Mit „Alle Tage“ erstellst du Vorlagen für die ganze Saison, dann füllst du sie aus.",
                    )}
                  </div>
                ) : (
                  data.tasks.map((t) => {
                    const picked = pickedTasks.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          taskSelect ? togglePick(pickedTasks, t.id, setPickedTasks) : isAdmin ? setTaskForm(t) : null
                        }
                        className={`${card} flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                          picked ? "!border-[#ffc93c] !bg-[#fff4d1]" : ""
                        }`}
                      >
                        {taskSelect && (
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                              picked ? "border-[#1b2431] bg-[#1b2431] text-[#ffc93c]" : "border-[#d9d3c1]"
                            }`}
                          >
                            {picked && <Check size={14} />}
                          </span>
                        )}
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff4d1] text-[15px] font-extrabold text-[#9a6b00]">
                          {t.day_number}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-bold">{isRu ? t.title_ru : t.title_de}</span>
                          <span className="block truncate text-[12px] text-[#8a8678]">
                            {t.task_date}
                            {t.bible_ref ? ` · ${t.bible_ref}` : ""}
                            {!t.text_de && !t.text_ru ? ` · ${L("без текста", "ohne Text")}` : ""}
                          </span>
                        </span>
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            t.is_published ? "bg-[#ffc93c]" : "bg-[#f1ede1] text-[#8a8678]"
                          }`}
                          title={t.is_published ? L("Опубликовано", "Veröffentlicht") : L("Скрыто", "Versteckt")}
                        >
                          {t.is_published ? <Eye size={15} /> : <EyeOff size={15} />}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* УЧАСТНИКИ */}
            {tab === "people" && (
              <div className="mt-2 space-y-2.5">
                {isAdmin && (
                  <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
                    {(
                      [
                        ["all", `${L("Все", "Alle")} · ${data.participants.length}`],
                        ["none", `${L("Без ответственного", "Ohne Zuständigen")} · ${loadByMentor.none}`],
                        ...team
                          .filter((m) => loadByMentor.m.has(m.id))
                          .map((m) => [m.id, `${m.name} · ${loadByMentor.m.get(m.id)}`] as const),
                      ] as [string | number, string][]
                    ).map(([key, text]) => (
                      <button
                        key={String(key)}
                        type="button"
                        onClick={() => setMentorFilter(key as typeof mentorFilter)}
                        className={`h-9 shrink-0 rounded-full px-3.5 text-[12px] font-bold ${
                          mentorFilter === key ? "bg-[#1b2431] text-[#ffc93c]" : "border border-[#e0d9c4] bg-white"
                        }`}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                )}
                {!isAdmin && (
                  <p className="text-[12px] text-[#8a8678]">
                    {L("Вы видите только своих подопечных.", "Du siehst nur deine Teilnehmer.")}
                  </p>
                )}

                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-[#9a9585]" />
                    <input
                      className={`${input} pl-9`}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={L("Поиск", "Suchen")}
                    />
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className={`${btnLight} ${peopleSelect ? "!bg-[#ffc93c]" : ""}`}
                      onClick={() => {
                        setPeopleSelect((v) => !v);
                        setPickedPeople([]);
                        setOpenPerson(null);
                      }}
                    >
                      <Shuffle size={16} />
                      {L("Распределить", "Verteilen")}
                    </button>
                  )}
                </div>

                {people.length === 0 ? (
                  <div className={`${card} px-5 py-8 text-center text-sm text-[#8a8678]`}>
                    {L("Никого нет.", "Niemand da.")}
                  </div>
                ) : (
                  people.map((p) => {
                    const picked = pickedPeople.includes(p.id);
                    const open = openPerson === p.id && !peopleSelect;
                    return (
                      <div
                        key={p.id}
                        className={`${card} overflow-hidden ${p.status === "blocked" ? "opacity-60" : ""} ${
                          picked ? "!border-[#ffc93c] !bg-[#fff4d1]" : ""
                        }`}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                          onClick={() =>
                            peopleSelect
                              ? togglePick(pickedPeople, p.id, setPickedPeople)
                              : setOpenPerson(open ? null : p.id)
                          }
                        >
                          {peopleSelect && (
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                                picked ? "border-[#1b2431] bg-[#1b2431] text-[#ffc93c]" : "border-[#d9d3c1]"
                              }`}
                            >
                              {picked && <Check size={14} />}
                            </span>
                          )}
                          {p.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffc93c] font-extrabold">
                              {p.nickname.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[14px] font-extrabold">{p.nickname}</span>
                              {p.is_guest && (
                                <span className="shrink-0 rounded-full bg-[#fff4d1] px-1.5 py-0.5 text-[9px] font-bold text-[#9a6b00]">
                                  {L("гость", "Gast")}
                                </span>
                              )}
                              {p.hide_in_ranking && <EyeOff size={12} className="shrink-0 text-[#8a8678]" />}
                              {p.status === "blocked" && <Ban size={12} className="shrink-0 text-[#a33]" />}
                            </span>
                            <span className="block truncate text-[12px] text-[#8a8678]">
                              {p.first_name} {p.last_name}
                              {isAdmin && p.mentor_id ? ` · ${mentorName(p.mentor_id)}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-[16px] font-extrabold leading-none">{p.points}</span>
                            <span className="mt-0.5 block text-[10px] text-[#8a8678]">
                              {p.days_done} {L("дн.", "Tg.")}
                            </span>
                          </span>
                          {!peopleSelect && (
                            <ChevronDown
                              size={16}
                              className={`shrink-0 text-[#c5bfae] transition ${open ? "rotate-180" : ""}`}
                            />
                          )}
                        </button>

                        {open && (
                          <div className="space-y-2 border-t border-[#f0ebdc] bg-[#faf8f3] p-3">
                            {isAdmin && (
                              <select
                                className="h-10 w-full rounded-xl border border-[#e0d9c4] bg-white px-2 text-[14px]"
                                value={p.mentor_id ?? ""}
                                disabled={busy}
                                onChange={(e) =>
                                  act({
                                    action: "participant_update",
                                    id: p.id,
                                    mentor_id: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                              >
                                <option value="">{L("Ответственный: не назначен", "Zuständig: nicht festgelegt")}</option>
                                {team.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                    {m.has_account ? "" : ` (${L("нет входа", "kein Login")})`}
                                  </option>
                                ))}
                              </select>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                className={`${btnLight} !h-10 !text-[13px]`}
                                disabled={busy}
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      L(`Сбросить пароль для ${p.nickname}?`, `Passwort für ${p.nickname} zurücksetzen?`),
                                    )
                                  )
                                    return;
                                  const d = await act({ action: "participant_reset_password", id: p.id });
                                  if (d?.password) setTempPw({ nick: p.nickname, pw: d.password });
                                }}
                              >
                                <KeyRound size={15} />
                                {L("Пароль", "Passwort")}
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  className={`${btnLight} !h-10 !text-[13px]`}
                                  disabled={busy}
                                  onClick={() =>
                                    act({ action: "participant_update", id: p.id, hide_in_ranking: !p.hide_in_ranking })
                                  }
                                >
                                  {p.hide_in_ranking ? <Eye size={15} /> : <EyeOff size={15} />}
                                  {p.hide_in_ranking ? L("Показать", "Zeigen") : L("Скрыть", "Verstecken")}
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  className={`${btnLight} !h-10 !text-[13px]`}
                                  disabled={busy}
                                  onClick={() =>
                                    act({
                                      action: "participant_update",
                                      id: p.id,
                                      status: p.status === "blocked" ? "active" : "blocked",
                                    })
                                  }
                                >
                                  <Ban size={15} />
                                  {p.status === "blocked" ? L("Разблокировать", "Entsperren") : L("Заблокировать", "Sperren")}
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  className={`${btnDanger} !h-10 !text-[13px]`}
                                  disabled={busy}
                                  onClick={async () => {
                                    if (
                                      !confirm(
                                        L(
                                          `Удалить ${p.nickname} вместе с ответами, фото и подарками? Это нельзя отменить.`,
                                          `${p.nickname} mit Antworten, Fotos und Geschenken löschen? Das lässt sich nicht rückgängig machen.`,
                                        ),
                                      )
                                    )
                                      return;
                                    await act({ action: "participant_delete", id: p.id }, L("Удалено.", "Gelöscht."));
                                    setOpenPerson(null);
                                  }}
                                >
                                  <Trash2 size={15} />
                                  {L("Удалить", "Löschen")}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* нижняя панель выбора: задания */}
      {tab === "tasks" && taskSelect && (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#e0d9c4] bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <div className="mx-auto max-w-[680px]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold">
                {L("Выбрано", "Gewählt")}: {pickedTasks.length}
              </span>
              <div className="flex gap-3 text-[12px] font-bold underline">
                <button type="button" onClick={() => setPickedTasks((data?.tasks ?? []).map((t) => t.id))}>
                  {L("Все", "Alle")}
                </button>
                <button type="button" onClick={() => setPickedTasks([])}>
                  {L("Сброс", "Leeren")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTaskSelect(false);
                    setPickedTasks([]);
                  }}
                >
                  {L("Закрыть", "Schließen")}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`${btnLight} !h-10 !px-2 !text-[13px]`}
                disabled={busy || !pickedTasks.length}
                onClick={async () => {
                  await act({ action: "tasks_bulk", op: "publish", ids: pickedTasks }, L("Опубликовано.", "Veröffentlicht."));
                  setPickedTasks([]);
                }}
              >
                <Eye size={15} />
                {L("Показать", "Zeigen")}
              </button>
              <button
                type="button"
                className={`${btnLight} !h-10 !px-2 !text-[13px]`}
                disabled={busy || !pickedTasks.length}
                onClick={async () => {
                  await act({ action: "tasks_bulk", op: "hide", ids: pickedTasks }, L("Скрыто.", "Versteckt."));
                  setPickedTasks([]);
                }}
              >
                <EyeOff size={15} />
                {L("Скрыть", "Verstecken")}
              </button>
              <button
                type="button"
                className={`${btnDanger} !h-10 !px-2 !text-[13px]`}
                disabled={busy || !pickedTasks.length}
                onClick={deleteTasks}
              >
                <Trash2 size={15} />
                {L("Удалить", "Löschen")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* нижняя панель выбора: участники */}
      {tab === "people" && peopleSelect && (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#e0d9c4] bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <div className="mx-auto max-w-[680px]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold">
                {L("Выбрано", "Gewählt")}: {pickedPeople.length}
              </span>
              <div className="flex gap-3 text-[12px] font-bold underline">
                <button type="button" onClick={() => setPickedPeople(people.map((p) => p.id))}>
                  {L("Все", "Alle")}
                </button>
                <button type="button" onClick={() => setPickedPeople(people.filter((p) => !p.mentor_id).map((p) => p.id))}>
                  {L("Без отв.", "Ohne Zust.")}
                </button>
                <button type="button" onClick={() => setPickedPeople([])}>
                  {L("Сброс", "Leeren")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeopleSelect(false);
                    setPickedPeople([]);
                  }}
                >
                  {L("Закрыть", "Schließen")}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select
                className="h-11 min-w-0 rounded-xl border border-[#e0d9c4] bg-white px-2 text-[14px] disabled:opacity-50"
                disabled={busy || !pickedPeople.length}
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") return;
                  void assignPicked(v === "none" ? null : Number(v));
                }}
              >
                <option value="">{L("Назначить служителю…", "Zuweisen an…")}</option>
                <option value="none">{L("Снять ответственного", "Zuständigen entfernen")}</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.has_account ? "" : ` (${L("нет входа", "kein Login")})`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={btnDark}
                disabled={busy}
                onClick={() => {
                  setDistMentors([]);
                  setDistOpen(true);
                }}
              >
                <Shuffle size={16} />
                {L("Поровну", "Gleichmäßig")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* поровну между служителями */}
      {distOpen && (
        <Modal onClose={() => setDistOpen(false)}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[18px] font-extrabold">{L("Распределить поровну", "Gleichmäßig verteilen")}</h2>
            <button type="button" onClick={() => setDistOpen(false)} aria-label="close">
              <X size={20} />
            </button>
          </div>
          <p className="mb-3 text-[13px] text-[#8a8678]">
            {pickedPeople.length
              ? L(`Выбрано подростков: ${pickedPeople.length}.`, `Gewählte Teens: ${pickedPeople.length}.`)
              : L(
                  `Ничего не выбрано: распределим всех без ответственного (${loadByMentor.none}).`,
                  `Nichts gewählt: alle ohne Zuständigen werden verteilt (${loadByMentor.none}).`,
                )}{" "}
            {L(
              "Отметьте служителей, между которыми разделить. Уже закреплённые за ними подростки учитываются.",
              "Wähle die Mitarbeiter aus. Schon zugewiesene Teens werden mitgezählt.",
            )}
          </p>
          <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">
            {team.map((m) => {
              const on = distMentors.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => togglePick(distMentors, m.id, setDistMentors)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
                    on ? "border-[#ffc93c] bg-[#fff4d1]" : "border-[#e9e3d3] bg-white"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      on ? "border-[#1b2431] bg-[#1b2431] text-[#ffc93c]" : "border-[#d9d3c1]"
                    }`}
                  >
                    {on && <Check size={14} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                    {m.name}
                    {!m.has_account && (
                      <span className="ml-1.5 text-[11px] font-normal text-[#a33]">{L("нет входа", "kein Login")}</span>
                    )}
                  </span>
                  <span className="text-[12px] text-[#8a8678]">{loadByMentor.m.get(m.id) ?? 0}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={`${btnDark} mt-4 w-full`}
            disabled={busy || distMentors.length === 0}
            onClick={distribute}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Shuffle size={16} />}
            {L("Распределить", "Verteilen")}
          </button>
        </Modal>
      )}

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
              <Field text={L("Год", "Jahr")}>
                <input
                  className={input}
                  type="number"
                  value={seasonForm.year ?? ""}
                  onChange={(e) => setSeasonForm({ ...seasonForm, year: Number(e.target.value) })}
                />
              </Field>
              <Field text={L("Номер в году", "Nr. im Jahr")}>
                <input
                  className={input}
                  type="number"
                  value={seasonForm.number ?? ""}
                  onChange={(e) => setSeasonForm({ ...seasonForm, number: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field text={L("Название (немецкий)", "Titel (Deutsch)")}>
              <input
                className={input}
                value={seasonForm.title_de ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, title_de: e.target.value })}
              />
            </Field>
            <Field text={L("Название (русский)", "Titel (Russisch)")}>
              <input
                className={input}
                value={seasonForm.title_ru ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, title_ru: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field text={L("Начало", "Start")}>
                <input
                  className={input}
                  type="date"
                  value={seasonForm.start_date ?? ""}
                  onChange={(e) => setSeasonForm({ ...seasonForm, start_date: e.target.value })}
                />
              </Field>
              <Field text={L("Конец", "Ende")}>
                <input
                  className={input}
                  type="date"
                  value={seasonForm.end_date ?? ""}
                  onChange={(e) => setSeasonForm({ ...seasonForm, end_date: e.target.value })}
                />
              </Field>
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
              <Field text={L("Номер дня", "Tag Nr.")}>
                <input
                  className={input}
                  type="number"
                  value={taskForm.day_number ?? ""}
                  onChange={(e) => setTaskForm({ ...taskForm, day_number: Number(e.target.value) })}
                />
              </Field>
              <Field text={L("Дата задания", "Datum")}>
                <input
                  className={input}
                  type="date"
                  value={taskForm.task_date ?? ""}
                  onChange={(e) => setTaskForm({ ...taskForm, task_date: e.target.value })}
                />
              </Field>
            </div>
            <Field text={L("Срок сдачи (в срок 10 баллов, позже 5)", "Abgabefrist (pünktlich 10 Punkte, später 5)")}>
              <input
                className={input}
                type="datetime-local"
                value={taskForm.deadline ? toLocalInput(taskForm.deadline) : ""}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, deadline: e.target.value ? new Date(e.target.value).toISOString() : "" })
                }
              />
            </Field>
            <Field text={L("Место в Библии", "Bibelstelle")}>
              <input
                className={input}
                value={taskForm.bible_ref ?? ""}
                onChange={(e) => setTaskForm({ ...taskForm, bible_ref: e.target.value })}
                placeholder="1. Mose 1"
              />
            </Field>
            <Field text={L("Заголовок (немецкий)", "Titel (Deutsch)")}>
              <input
                className={input}
                value={taskForm.title_de ?? ""}
                onChange={(e) => setTaskForm({ ...taskForm, title_de: e.target.value })}
              />
            </Field>
            <Field text={L("Заголовок (русский)", "Titel (Russisch)")}>
              <input
                className={input}
                value={taskForm.title_ru ?? ""}
                onChange={(e) => setTaskForm({ ...taskForm, title_ru: e.target.value })}
              />
            </Field>
            <Field text={L("Текст и вопросы (немецкий)", "Text und Fragen (Deutsch)")}>
              <textarea
                className={area}
                value={taskForm.text_de ?? ""}
                onChange={(e) => setTaskForm({ ...taskForm, text_de: e.target.value })}
              />
            </Field>
            <Field text={L("Текст и вопросы (русский)", "Text und Fragen (Russisch)")}>
              <textarea
                className={area}
                value={taskForm.text_ru ?? ""}
                onChange={(e) => setTaskForm({ ...taskForm, text_ru: e.target.value })}
              />
            </Field>
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
            <div className={`grid gap-2 ${taskForm.id ? "grid-cols-[auto_1fr]" : "grid-cols-1"}`}>
              {taskForm.id && (
                <button
                  type="button"
                  className={btnDanger}
                  disabled={busy}
                  onClick={async () => {
                    const id = taskForm.id as number;
                    if (!confirm(L("Удалить это задание?", "Diese Aufgabe löschen?"))) return;
                    const d = await act({ action: "tasks_bulk", op: "delete", ids: [id] });
                    if (!d) return;
                    if ((d.skippedIds ?? []).length) {
                      if (
                        confirm(
                          L(
                            "На это задание уже есть ответы. Удалить вместе с ответами и фото?",
                            "Es gibt schon Antworten. Mit Antworten und Fotos löschen?",
                          ),
                        )
                      ) {
                        await act({ action: "tasks_bulk", op: "delete", ids: [id], force: true });
                      } else return;
                    }
                    setTaskForm(null);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                type="button"
                className={btnDark}
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
          </div>
        </Modal>
      )}

      {/* удаление сезона */}
      {delSeason && (
        <Modal onClose={() => setDelSeason(null)}>
          <h2 className="text-[18px] font-extrabold text-[#a33]">{L("Удалить сезон?", "Saison löschen?")}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#6f6a5c]">
            {L(
              `Сезон «${delSeason.title_ru}» будет удалён вместе со всеми заданиями, ответами, фото, подарками и наградами. Вернуть это нельзя. Чтобы подтвердить, напишите слово УДАЛИТЬ.`,
              `Die Saison „${delSeason.title_de}“ wird mit allen Aufgaben, Antworten, Fotos, Geschenken und Auszeichnungen gelöscht. Das lässt sich nicht rückgängig machen. Zur Bestätigung schreibe LÖSCHEN.`,
            )}
          </p>
          <input
            className={`${input} mt-3`}
            value={delText}
            onChange={(e) => setDelText(e.target.value)}
            placeholder={L("УДАЛИТЬ", "LÖSCHEN")}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className={btnLight} onClick={() => setDelSeason(null)}>
              {L("Отмена", "Abbrechen")}
            </button>
            <button
              type="button"
              className={btnDanger}
              disabled={busy || delText.trim().toLowerCase() !== (isRu ? "удалить" : "löschen")}
              onClick={async () => {
                const d = await act({ action: "season_delete", id: delSeason.id }, L("Сезон удалён.", "Saison gelöscht."));
                if (d) {
                  setDelSeason(null);
                  setSeasonId(null);
                  await load(null);
                }
              }}
            >
              <Trash2 size={16} />
              {L("Удалить", "Löschen")}
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