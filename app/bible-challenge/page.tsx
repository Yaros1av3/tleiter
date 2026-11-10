"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  Flag,
  Gift,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

import { bcCall } from "@/lib/bcAdminClient";
import { useLanguage } from "@/components/LanguageProvider";
import { GiftsTab, ReviewTab, StatsTab } from "@/components/BcAdminTabs";
import {
  Avatar,
  BcUiProvider,
  Badge,
  DateField,
  DateTimeField,
  Empty,
  Segmented,
  SelectField,
  SelectSheet,
  Sheet,
  Skeleton,
  Switch,
  cx,
  ui,
  useBcUi,
} from "@/components/BcUi";

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
  pending: number;
  tasks: Task[];
  participants: Participant[];
  team: Member[];
};
type Tab = "review" | "tasks" | "people" | "gifts" | "stats";

const berlinToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const pad = (n: number) => String(n).padStart(2, "0");
function plusDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const AUTO_TITLE = /^(Bibel-Challenge|Библейский челлендж) /;
const lastDayOf = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
function dayCount(a?: string | null, b?: string | null) {
  if (!a || !b) return 0;
  const n = Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000) + 1;
  return n > 0 ? n : 0;
}

export default function BibleChallengeAdminPage() {
  return (
    <BcUiProvider>
      <AdminInner />
    </BcUiProvider>
  );
}

function AdminInner() {
  const router = useRouter();
  const { language } = useLanguage();
  const { confirm, toast } = useBcUi();
  const isRu = language === "ru";
  const L = (ru: string, de: string) => (isRu ? ru : de);
  const locale = isRu ? "ru-RU" : "de-DE";

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("review");
  const [busy, setBusy] = useState(false);

  /* панели */
  const [seasonPicker, setSeasonPicker] = useState(false);
  const [seasonMenu, setSeasonMenu] = useState(false);
  const [seasonForm, setSeasonForm] = useState<Partial<Season> | null>(null);
  const [taskForm, setTaskForm] = useState<Partial<Task> | null>(null);
  const [taskLang, setTaskLang] = useState<"de" | "ru">(isRu ? "ru" : "de");
  const [personId, setPersonId] = useState<number | null>(null);
  const [tempPw, setTempPw] = useState<{ nick: string; pw: string } | null>(null);
  const [distOpen, setDistOpen] = useState(false);
  const [distMentors, setDistMentors] = useState<number[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);

  /* выбор */
  const [taskSelect, setTaskSelect] = useState(false);
  const [pickedTasks, setPickedTasks] = useState<number[]>([]);
  const [peopleSelect, setPeopleSelect] = useState(false);
  const [pickedPeople, setPickedPeople] = useState<number[]>([]);
  const [q, setQ] = useState("");
  const [mentorFilter, setMentorFilter] = useState<"all" | "none" | number>("all");

  const load = useCallback(
    async (sid?: number | null) => {
      const s = sid === undefined ? seasonId : sid;
      const { ok, data: d } = await bcCall<Overview>("GET", `/api/bc-admin${s ? `?season=${s}` : ""}`);
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

  const errText = (code?: string) => {
    const map: Record<string, string> = {
      season_exists: L("Такой сезон уже есть.", "Diese Saison gibt es schon."),
      day_exists: L("Задание с таким номером дня уже есть.", "Für diesen Tag gibt es schon eine Aufgabe."),
      no_dates: L("Укажите даты начала и конца сезона.", "Start- und Enddatum der Saison angeben."),
      empty: L("Заполните обязательные поля.", "Bitte Pflichtfelder ausfüllen."),
      forbidden: L("Нет доступа.", "Kein Zugriff."),
    };
    return map[code ?? ""] ?? L("Не получилось. Попробуйте ещё раз.", "Das hat nicht geklappt. Bitte nochmal versuchen.");
  };

  const act = async (body: Record<string, unknown>, okText?: string, reloadSeason?: number) => {
    setBusy(true);
    const { ok, data: d } = await bcCall<{
      id?: number;
      created?: number;
      password?: string;
      deleted?: number;
      skippedIds?: number[];
    }>("POST", "/api/bc-admin", body);
    setBusy(false);
    if (!ok) {
      toast(errText(d.error), "error");
      return null;
    }
    if (okText) toast(okText);
    await load(reloadSeason);
    return d;
  };

  const season = data?.season ?? null;
  const isAdmin = data?.me.isAdmin ?? false;
  const team = useMemo(() => data?.team ?? [], [data]);
  const mentorName = (id: number | null) => team.find((m) => m.id === id)?.name ?? "";
  const titleOf = (s: Season) => (isRu ? s.title_ru : s.title_de);

  const mentorLoad = useMemo(() => {
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
      return !needle || `${p.nickname} ${p.first_name} ${p.last_name}`.toLowerCase().includes(needle);
    });
  }, [data, q, mentorFilter]);

  const person = data?.participants.find((p) => p.id === personId) ?? null;
  const toggle = (list: number[], id: number, set: (v: number[]) => void) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const fmtDay = (iso: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(
      new Date(`${iso}T12:00:00`),
    );
  const fmtRange = (s: Season) =>
    s.start_date && s.end_date
      ? `${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${s.start_date}T12:00:00`))} – ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${s.end_date}T12:00:00`))}`
      : L("даты не заданы", "Daten fehlen");

  const statusBadge = (s: Season) =>
    s.status === "active" ? (
      <Badge tone="sun">{L("Идёт", "Läuft")}</Badge>
    ) : s.status === "finished" ? (
      <Badge tone="soft">{L("Завершён", "Beendet")}</Badge>
    ) : (
      <Badge tone="neutral">{L("Черновик", "Entwurf")}</Badge>
    );

  const newSeason = () =>
    setSeasonForm({
      year: new Date().getFullYear(),
      number: 1,
      title_de: "",
      title_ru: "",
      start_date: "",
      end_date: "",
    });

  /* выбран месяц: даты сезона и названия подставляются сами */
  const applyMonth = (m: number, y: number) =>
    setSeasonForm((f) => {
      const monthDe = new Intl.DateTimeFormat("de-DE", { month: "long" }).format(new Date(y, m, 1));
      const monthRu = new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(new Date(y, m, 1));
      const keep = (v?: string) => !!v && !AUTO_TITLE.test(v);
      return {
        ...f,
        year: y,
        start_date: `${y}-${pad(m + 1)}-01`,
        end_date: `${y}-${pad(m + 1)}-${pad(lastDayOf(y, m))}`,
        title_de: keep(f?.title_de) ? f?.title_de : `Bibel-Challenge ${monthDe} ${y}`,
        title_ru: keep(f?.title_ru) ? f?.title_ru : `Библейский челлендж ${monthRu} ${y}`,
      };
    });

  const saveSeason = async () => {
    if (!seasonForm) return;
    const form = seasonForm;
    const isNew = !form.id;
    const d = await act({ action: "season_save", ...form }, L("Сохранено", "Gespeichert"));
    if (!d) return;
    setSeasonForm(null);
    const days = dayCount(form.start_date, form.end_date);
    if (isNew && d.id && days > 0) {
      await load(d.id);
      setTab("tasks");
      const yes = await confirm({
        title: L(`Создать задания на все ${days} дн.?`, `Aufgaben für alle ${days} Tage erstellen?`),
        text: L(
          "Мы сразу создадим заготовки на каждый день сезона с датами и сроками сдачи. Останется заполнить тексты.",
          "Wir erstellen sofort Vorlagen für jeden Tag mit Datum und Abgabefrist. Du füllst nur noch die Texte aus.",
        ),
        confirmLabel: L("Создать", "Erstellen"),
      });
      if (yes) {
        await act(
          { action: "tasks_generate", season_id: d.id },
          L(`Создано заданий: ${days}`, `Aufgaben erstellt: ${days}`),
          d.id,
        );
      }
    }
  };

  const newTask = () => {
    if (!season) return;
    const next = (data?.tasks.at(-1)?.day_number ?? 0) + 1;
    const date = season.start_date ? plusDays(season.start_date, next - 1) : "";
    setTaskLang(isRu ? "ru" : "de");
    setTaskForm({
      season_id: season.id,
      day_number: next,
      task_date: date,
      deadline: date ? new Date(`${date}T23:59`).toISOString() : "",
      title_de: "",
      title_ru: "",
      is_published: false,
    });
  };

  const deleteTasks = async (ids: number[]) => {
    if (!ids.length) return;
    const ok = await confirm({
      title: L(`Удалить заданий: ${ids.length}?`, `${ids.length} Aufgaben löschen?`),
      text: L("Это действие нельзя отменить.", "Das lässt sich nicht rückgängig machen."),
      confirmLabel: L("Удалить", "Löschen"),
      danger: true,
    });
    if (!ok) return false;
    const d = await act({ action: "tasks_bulk", op: "delete", ids });
    if (!d) return false;
    const skipped = d.skippedIds ?? [];
    if (skipped.length) {
      const force = await confirm({
        title: L("Есть ответы подростков", "Es gibt Antworten"),
        text: L(
          `У ${skipped.length} заданий уже есть ответы. Удалить их вместе с ответами и фото?`,
          `Für ${skipped.length} Aufgaben gibt es schon Antworten. Mit Antworten und Fotos löschen?`,
        ),
        confirmLabel: L("Удалить с ответами", "Mit Antworten löschen"),
        danger: true,
      });
      if (force) await act({ action: "tasks_bulk", op: "delete", ids: skipped, force: true });
    }
    toast(L("Удалено", "Gelöscht"));
    return true;
  };

  const assignPicked = async (mentorId: number | null) => {
    const d = await act(
      { action: "participants_assign", ids: pickedPeople, mentor_id: mentorId },
      mentorId ? L("Назначено", "Zugewiesen") : L("Ответственный снят", "Zuständiger entfernt"),
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
      L(`Распределено: ${ids.length}`, `Verteilt: ${ids.length}`),
    );
    if (d) {
      setDistOpen(false);
      setPickedPeople([]);
      setPeopleSelect(false);
    }
  };

  const finishSeason = async () => {
    if (!season) return;
    const ok = await confirm({
      title: L("Завершить сезон?", "Saison beenden?"),
      text: L(
        "Подросткам будут выданы награды. Это нельзя отменить.",
        "Die Auszeichnungen werden vergeben. Das lässt sich nicht rückgängig machen.",
      ),
      confirmLabel: L("Завершить", "Beenden"),
    });
    if (!ok) return;
    setBusy(true);
    const { ok: good } = await bcCall("POST", "/api/bc-admin/work", { action: "season_finish", id: season.id });
    setBusy(false);
    toast(good ? L("Сезон завершён, награды выданы", "Saison beendet, Auszeichnungen vergeben") : errText(), good ? "ok" : "error");
    await load();
  };

  const deleteSeason = async () => {
    if (!season) return;
    const ok = await confirm({
      title: L("Удалить сезон?", "Saison löschen?"),
      text: L(
        `«${season.title_ru}» будет удалён вместе с заданиями, ответами, фото, подарками и наградами. Вернуть это нельзя. Напишите слово для подтверждения.`,
        `„${season.title_de}“ wird mit Aufgaben, Antworten, Fotos, Geschenken und Auszeichnungen gelöscht. Das lässt sich nicht rückgängig machen. Schreibe zur Bestätigung das Wort.`,
      ),
      confirmLabel: L("Удалить сезон", "Saison löschen"),
      danger: true,
      typeToConfirm: L("удалить", "löschen"),
    });
    if (!ok) return;
    const d = await act({ action: "season_delete", id: season.id }, L("Сезон удалён", "Saison gelöscht"));
    if (d) {
      setSeasonId(null);
      await load(null);
    }
  };

  const seasonDays = dayCount(season?.start_date, season?.end_date);
  const barOn = (tab === "tasks" && taskSelect) || (tab === "people" && peopleSelect);
  const tasksSorted = data?.tasks ?? [];
  const today = berlinToday();

  const tabs: { key: Tab; label: string; icon: typeof Users; badge?: number }[] = [
    { key: "review", label: L("Проверка", "Prüfung"), icon: ClipboardCheck, badge: data?.pending ?? 0 },
    { key: "tasks", label: L("Задания", "Aufgaben"), icon: CalendarDays },
    { key: "people", label: L("Участники", "Teilnehmer"), icon: Users },
    { key: "gifts", label: L("Подарки", "Geschenke"), icon: Gift },
    { key: "stats", label: L("Статистика", "Statistik"), icon: BarChart3 },
  ];

  return (
    <main className={cx("min-h-screen bg-[#faf8f3] px-4 pt-5 text-[#1b2431]", barOn ? "pb-44" : "pb-32")}>
      <div className="mx-auto max-w-[680px]">
        {/* шапка */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label={L("Назад", "Zurück")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#e9e3d3] active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[22px] font-extrabold tracking-[-0.02em]">Bibel-Challenge</h1>
          {isAdmin && season && (
            <button
              type="button"
              onClick={() => setSeasonMenu(true)}
              aria-label={L("Действия с сезоном", "Saison-Aktionen")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#e9e3d3] active:scale-95"
            >
              <MoreHorizontal size={18} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="mt-5 space-y-3">
            <Skeleton className="h-[188px]" />
            <Skeleton className="h-12" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : failed || !data ? (
          <div className="mt-6">
            <Empty
              icon={<Loader2 size={22} />}
              title={L("Не удалось загрузить", "Laden fehlgeschlagen")}
              text={L("Проверьте интернет и попробуйте ещё раз.", "Prüfe die Verbindung und versuche es nochmal.")}
              action={
                <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => load()}>
                  {L("Повторить", "Nochmal")}
                </button>
              }
            />
          </div>
        ) : (
          <>
            {/* карточка сезона */}
            {season ? (
              <section className="mt-4 overflow-hidden rounded-[26px] bg-[#1b2431] p-4 text-white shadow-[0_10px_30px_rgba(27,36,49,0.18)]">
                <button
                  type="button"
                  onClick={() => setSeasonPicker(true)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-[12px] font-medium text-white/55">
                      {L("Сезон", "Saison")} {season.year} · {season.number}
                    </span>
                    <span className="mt-0.5 block truncate text-[21px] font-extrabold tracking-[-0.01em]">
                      {titleOf(season)}
                    </span>
                  </span>
                  <span className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 py-1 pl-3 pr-2 text-[12px] font-semibold">
                    {L("Сменить", "Wechseln")}
                    <ChevronDown size={14} />
                  </span>
                </button>
                <div className="mt-2 flex items-center gap-2">
                  {statusBadge(season)}
                  <span className="text-[12px] text-white/60">{fmtRange(season)}</span>
                </div>

                {/* дни сезона: каждый столбик — один день */}
                <div className="mt-4 flex h-7 items-end gap-[3px]" aria-hidden>
                  {tasksSorted.length === 0 ? (
                    <span className="h-1.5 w-full rounded-full bg-white/15" />
                  ) : (
                    tasksSorted.map((t) => {
                      const isToday = t.task_date === today;
                      const past = t.task_date < today;
                      return (
                        <span
                          key={t.id}
                          className={cx(
                            "min-w-[3px] flex-1 rounded-[3px]",
                            isToday
                              ? "h-7 bg-white"
                              : t.is_published && past
                                ? "h-4 bg-[#ffc93c]"
                                : t.is_published
                                  ? "h-4 bg-[#ffc93c]/40"
                                  : "h-2 bg-white/20",
                          )}
                        />
                      );
                    })
                  )}
                </div>
                <p className="mt-2 text-[12px] text-white/55">
                  {L("Опубликовано", "Veröffentlicht")}: {tasksSorted.filter((t) => t.is_published).length}{" "}
                  {L("из", "von")} {tasksSorted.length}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTab("review")}
                    className={cx(
                      "rounded-2xl p-3 text-left active:scale-[0.98]",
                      data.pending > 0 ? "bg-[#ffc93c] text-[#1b2431]" : "bg-white/10",
                    )}
                  >
                    <span className="block text-[26px] font-extrabold leading-none">{data.pending}</span>
                    <span className={cx("mt-1 block text-[12px]", data.pending > 0 ? "font-semibold" : "text-white/60")}>
                      {L("ждут проверки", "zu prüfen")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("people")}
                    className="rounded-2xl bg-white/10 p-3 text-left active:scale-[0.98]"
                  >
                    <span className="block text-[26px] font-extrabold leading-none">{data.participants.length}</span>
                    <span className="mt-1 block text-[12px] text-white/60">{L("участников", "Teilnehmer")}</span>
                  </button>
                </div>
              </section>
            ) : (
              <div className="mt-4">
                <Empty
                  icon={<BookOpen size={22} />}
                  title={L("Сезона пока нет", "Noch keine Saison")}
                  text={L(
                    "Создайте сезон, добавьте задания на каждый день и запустите его.",
                    "Erstelle eine Saison, füge Aufgaben für jeden Tag hinzu und starte sie.",
                  )}
                  action={
                    isAdmin ? (
                      <button type="button" className={cx(ui.btn, ui.primary)} onClick={newSeason}>
                        <Plus size={18} />
                        {L("Создать сезон", "Saison erstellen")}
                      </button>
                    ) : undefined
                  }
                />
              </div>
            )}

            {/* вкладки */}
            <div className="sticky top-0 z-30 -mx-4 mt-4 border-b border-[#e9e3d3] bg-[#faf8f3]/95 px-4 backdrop-blur">
              <div className="flex gap-5 overflow-x-auto" role="tablist">
                {tabs.map(({ key, label, badge }) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={cx(
                      "relative flex shrink-0 items-center gap-1.5 py-3.5 text-[14px] font-semibold transition",
                      tab === key ? "text-[#1b2431]" : "text-[#8a8678]",
                    )}
                  >
                    {label}
                    {!!badge && (
                      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ffc93c] px-1 text-[11px] font-extrabold text-[#1b2431]">
                        {badge}
                      </span>
                    )}
                    {tab === key && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#ffc93c]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              {tab === "review" && <ReviewTab key={seasonId ?? 0} seasonId={seasonId} onChanged={() => load()} />}
              {tab === "gifts" && <GiftsTab />}
              {tab === "stats" && <StatsTab key={seasonId ?? 0} seasonId={seasonId} />}

              {/* ЗАДАНИЯ */}
              {tab === "tasks" &&
                (!season ? (
                  <Empty icon={<CalendarDays size={22} />} title={L("Сначала создайте сезон", "Erst eine Saison erstellen")} />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[15px] font-extrabold">
                        {L("Дни", "Tage")} <span className="font-semibold text-[#8a8678]">{tasksSorted.length}</span>
                      </p>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          {seasonDays > tasksSorted.length && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                act(
                                  { action: "tasks_generate", season_id: season.id },
                                  L("Заготовки на все дни созданы", "Vorlagen für alle Tage erstellt"),
                                )
                              }
                              className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold ring-1 ring-[#e6dfca] active:scale-95 disabled:opacity-50"
                            >
                              <Sparkles size={14} />
                              {L(`Все дни (${seasonDays})`, `Alle Tage (${seasonDays})`)}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setTaskSelect((v) => !v);
                              setPickedTasks([]);
                            }}
                            className={cx(
                              "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold active:scale-95",
                              taskSelect ? "bg-[#1b2431] text-[#ffc93c]" : "bg-white ring-1 ring-[#e6dfca]",
                            )}
                          >
                            <CheckSquare size={14} />
                            {taskSelect ? L("Готово", "Fertig") : L("Выбрать", "Wählen")}
                          </button>
                        </div>
                      )}
                    </div>

                    {tasksSorted.length === 0 ? (
                      <Empty
                        icon={<CalendarDays size={22} />}
                        title={L("Заданий пока нет", "Noch keine Aufgaben")}
                        text={L(
                          "Нажмите «Все дни», и мы создадим заготовки на каждый день сезона по его датам. Останется заполнить их.",
                          "Mit „Alle Tage“ erstellen wir Vorlagen für jeden Tag der Saison nach ihren Daten. Du füllst sie nur noch aus.",
                        )}
                      />
                    ) : (
                      <div className={ui.group}>
                        {tasksSorted.map((t) => {
                          const picked = pickedTasks.includes(t.id);
                          const empty = !t.text_de && !t.text_ru;
                          return (
                            <div
                              key={t.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => (taskSelect ? toggle(pickedTasks, t.id, setPickedTasks) : isAdmin && (setTaskLang(isRu ? "ru" : "de"), setTaskForm(t)))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.currentTarget as HTMLElement).click();
                              }}
                              className={cx(
                                "flex min-h-[64px] cursor-pointer items-center gap-3 px-3.5 py-2.5 active:bg-[#faf8f3]",
                                picked && "bg-[#fff4d1]",
                              )}
                            >
                              {taskSelect ? (
                                <span
                                  className={cx(
                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                                    picked ? "border-[#1b2431] bg-[#1b2431] text-[#ffc93c]" : "border-[#d9d3c1]",
                                  )}
                                >
                                  {picked && <Check size={14} strokeWidth={3} />}
                                </span>
                              ) : (
                                <span
                                  className={cx(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold",
                                    t.task_date === today ? "bg-[#1b2431] text-[#ffc93c]" : "bg-[#fff4d1] text-[#9a6b00]",
                                  )}
                                >
                                  {t.day_number}
                                </span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[15px] font-semibold">{isRu ? t.title_ru : t.title_de}</span>
                                <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#8a8678]">
                                  <span className="truncate">
                                    {fmtDay(t.task_date)}
                                    {t.bible_ref ? ` · ${t.bible_ref}` : ""}
                                  </span>
                                  {empty && <Badge tone="soft">{L("нет текста", "ohne Text")}</Badge>}
                                </span>
                              </span>
                              {!taskSelect && isAdmin && (
                                <Switch
                                  checked={t.is_published}
                                  label={L("Опубликовано", "Veröffentlicht")}
                                  disabled={busy}
                                  onChange={(v) => act({ action: "task_publish", id: t.id, value: v })}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {isAdmin && tasksSorted.length > 0 && (
                      <p className="px-1 text-[12px] text-[#8a8678]">
                        {L(
                          "Переключатель справа открывает или скрывает задание для подростков.",
                          "Der Schalter rechts zeigt oder versteckt die Aufgabe für die Teens.",
                        )}
                      </p>
                    )}
                  </div>
                ))}

              {/* УЧАСТНИКИ */}
              {tab === "people" && (
                <div className="space-y-3">
                  {isAdmin && (
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
                      {(
                        [
                          ["all", `${L("Все", "Alle")} ${data.participants.length}`],
                          ["none", `${L("Без ответственного", "Ohne Zuständigen")} ${mentorLoad.none}`],
                          ...team
                            .filter((m) => mentorLoad.m.has(m.id))
                            .map((m) => [m.id, `${m.name.split(" ")[0]} ${mentorLoad.m.get(m.id)}`] as const),
                        ] as [string | number, string][]
                      ).map(([key, text]) => (
                        <button
                          key={String(key)}
                          type="button"
                          onClick={() => setMentorFilter(key as typeof mentorFilter)}
                          className={cx(
                            "h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition active:scale-95",
                            mentorFilter === key ? "bg-[#1b2431] text-[#ffc93c]" : "bg-white ring-1 ring-[#e6dfca]",
                          )}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  )}
                  {!isAdmin && (
                    <p className="text-[13px] text-[#8a8678]">
                      {L("Здесь только ваши подопечные.", "Hier siehst du nur deine Teilnehmer.")}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search size={16} className="pointer-events-none absolute left-3.5 top-4 text-[#9a9585]" />
                      <input
                        className={cx(ui.input, "pl-10")}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={L("Найти по имени или нику", "Nach Name oder Nick suchen")}
                      />
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setPeopleSelect((v) => !v);
                          setPickedPeople([]);
                        }}
                        className={cx(
                          ui.btn,
                          "!px-4",
                          peopleSelect ? ui.primary : ui.ghost,
                        )}
                      >
                        <Shuffle size={16} />
                        {peopleSelect ? L("Готово", "Fertig") : L("Распределить", "Verteilen")}
                      </button>
                    )}
                  </div>

                  {people.length === 0 ? (
                    <Empty
                      icon={<Users size={22} />}
                      title={L("Никого не найдено", "Niemand gefunden")}
                      text={
                        data.participants.length === 0
                          ? L("Подростки появятся здесь после регистрации.", "Teens erscheinen hier nach der Registrierung.")
                          : L("Измените поиск или фильтр.", "Ändere Suche oder Filter.")
                      }
                    />
                  ) : (
                    <div className={ui.group}>
                      {people.map((p) => {
                        const picked = pickedPeople.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => (peopleSelect ? toggle(pickedPeople, p.id, setPickedPeople) : setPersonId(p.id))}
                            className={cx(
                              "flex min-h-[64px] w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-[#faf8f3]",
                              picked && "bg-[#fff4d1]",
                              p.status === "blocked" && "opacity-60",
                            )}
                          >
                            {peopleSelect && (
                              <span
                                className={cx(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                                  picked ? "border-[#1b2431] bg-[#1b2431] text-[#ffc93c]" : "border-[#d9d3c1]",
                                )}
                              >
                                {picked && <Check size={14} strokeWidth={3} />}
                              </span>
                            )}
                            <Avatar url={p.avatar_url} name={p.nickname} size={40} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate text-[15px] font-semibold">{p.nickname}</span>
                                {p.is_guest && <Badge tone="soft">{L("гость", "Gast")}</Badge>}
                                {p.status === "blocked" && <Ban size={13} className="shrink-0 text-[#b3342f]" />}
                                {p.hide_in_ranking && <EyeOff size={13} className="shrink-0 text-[#8a8678]" />}
                              </span>
                              <span className="block truncate text-[12px] text-[#8a8678]">
                                {p.first_name} {p.last_name}
                                {isAdmin && p.mentor_id ? ` · ${mentorName(p.mentor_id)}` : ""}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-[17px] font-extrabold leading-none">{p.points}</span>
                              <span className="mt-1 block text-[11px] text-[#8a8678]">
                                {p.days_done} {L("дн.", "Tg.")}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* кнопка "Новое задание" */}
      {tab === "tasks" && isAdmin && season && !taskSelect && (
        <button
          type="button"
          onClick={newTask}
          aria-label={L("Новое задание", "Neue Aufgabe")}
          className="fixed bottom-24 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-[#ffc93c] pl-4 pr-5 text-[15px] font-extrabold text-[#1b2431] shadow-[0_10px_24px_rgba(154,107,0,0.35)] active:scale-95"
        >
          <Plus size={20} strokeWidth={2.6} />
          {L("День", "Tag")}
        </button>
      )}

      {/* панель выбора: задания */}
      {tab === "tasks" && taskSelect && (
        <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-[656px] rounded-[22px] bg-[#1b2431] p-3 text-white shadow-[0_16px_40px_rgba(27,36,49,0.35)]">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <span className="text-[14px] font-bold">
              {L("Выбрано", "Gewählt")}: {pickedTasks.length}
            </span>
            <span className="flex gap-4 text-[13px] font-semibold text-[#ffc93c]">
              <button type="button" onClick={() => setPickedTasks(tasksSorted.map((t) => t.id))}>
                {L("Все", "Alle")}
              </button>
              <button type="button" onClick={() => setPickedTasks([])}>
                {L("Сбросить", "Leeren")}
              </button>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy || !pickedTasks.length}
              onClick={async () => {
                await act({ action: "tasks_bulk", op: "publish", ids: pickedTasks }, L("Показано подросткам", "Für Teens sichtbar"));
                setPickedTasks([]);
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white/12 text-[13px] font-semibold active:scale-95 disabled:opacity-40"
            >
              <Eye size={15} />
              {L("Показать", "Zeigen")}
            </button>
            <button
              type="button"
              disabled={busy || !pickedTasks.length}
              onClick={async () => {
                await act({ action: "tasks_bulk", op: "hide", ids: pickedTasks }, L("Скрыто", "Versteckt"));
                setPickedTasks([]);
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white/12 text-[13px] font-semibold active:scale-95 disabled:opacity-40"
            >
              <EyeOff size={15} />
              {L("Скрыть", "Verstecken")}
            </button>
            <button
              type="button"
              disabled={busy || !pickedTasks.length}
              onClick={async () => {
                if (await deleteTasks(pickedTasks)) {
                  setPickedTasks([]);
                  setTaskSelect(false);
                }
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#b3342f] text-[13px] font-semibold active:scale-95 disabled:opacity-40"
            >
              <Trash2 size={15} />
              {L("Удалить", "Löschen")}
            </button>
          </div>
        </div>
      )}

      {/* панель выбора: участники */}
      {tab === "people" && peopleSelect && (
        <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-[656px] rounded-[22px] bg-[#1b2431] p-3 text-white shadow-[0_16px_40px_rgba(27,36,49,0.35)]">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <span className="text-[14px] font-bold">
              {L("Выбрано", "Gewählt")}: {pickedPeople.length}
            </span>
            <span className="flex gap-4 text-[13px] font-semibold text-[#ffc93c]">
              <button type="button" onClick={() => setPickedPeople(people.map((p) => p.id))}>
                {L("Все", "Alle")}
              </button>
              <button type="button" onClick={() => setPickedPeople(people.filter((p) => !p.mentor_id).map((p) => p.id))}>
                {L("Без отв.", "Ohne Zust.")}
              </button>
              <button type="button" onClick={() => setPickedPeople([])}>
                {L("Сбросить", "Leeren")}
              </button>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy || !pickedPeople.length}
              onClick={() => setAssignOpen(true)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white/12 text-[13px] font-semibold active:scale-95 disabled:opacity-40"
            >
              <Users size={15} />
              {L("Назначить служителю", "Zuweisen")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDistMentors([]);
                setDistOpen(true);
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#ffc93c] text-[13px] font-extrabold text-[#1b2431] active:scale-95"
            >
              <Shuffle size={15} />
              {L("Поровну", "Gleichmäßig")}
            </button>
          </div>
        </div>
      )}

      {/* выбор сезона */}
      <SelectSheet
        open={seasonPicker}
        onClose={() => setSeasonPicker(false)}
        title={L("Сезон", "Saison")}
        value={seasonId}
        options={[
          ...(data?.seasons ?? []).map((s) => ({
            value: s.id,
            label: `${s.year} · ${s.number} — ${titleOf(s)}`,
            hint: `${s.status === "active" ? L("идёт", "läuft") : s.status === "finished" ? L("завершён", "beendet") : L("черновик", "Entwurf")} · ${fmtRange(s)}`,
          })),
          ...(isAdmin ? [{ value: "__new", label: L("+ Новый сезон", "+ Neue Saison") }] : []),
        ]}
        onChange={(v) => {
          if (v === "__new") return newSeason();
          const id = Number(v);
          setSeasonId(id);
          setPickedTasks([]);
          void load(id);
        }}
      />

      {/* действия с сезоном */}
      <Sheet open={seasonMenu} onClose={() => setSeasonMenu(false)} title={L("Действия с сезоном", "Saison-Aktionen")}>
        {season && (
          <div className="space-y-3">
            <div className={ui.group}>
              <MenuRow
                icon={<Pencil size={18} />}
                label={L("Изменить название и даты", "Titel und Daten ändern")}
                onClick={() => {
                  setSeasonMenu(false);
                  setSeasonForm(season);
                }}
              />
              <MenuRow icon={<Plus size={18} />} label={L("Новый сезон", "Neue Saison")} onClick={() => { setSeasonMenu(false); newSeason(); }} />
              {season.status === "draft" && (
                <MenuRow
                  icon={<Flag size={18} />}
                  label={L("Запустить сезон", "Saison starten")}
                  hint={L("Подростки увидят задания", "Teens sehen die Aufgaben")}
                  onClick={() => {
                    setSeasonMenu(false);
                    void act({ action: "season_status", id: season.id, status: "active" }, L("Сезон запущен", "Saison gestartet"));
                  }}
                />
              )}
              {season.status === "active" && (
                <>
                  <MenuRow
                    icon={<EyeOff size={18} />}
                    label={L("Остановить", "Pausieren")}
                    hint={L("Вернуть в черновик", "Zurück zum Entwurf")}
                    onClick={() => {
                      setSeasonMenu(false);
                      void act({ action: "season_status", id: season.id, status: "draft" }, L("Сезон остановлен", "Saison pausiert"));
                    }}
                  />
                  <MenuRow
                    icon={<Check size={18} />}
                    label={L("Завершить и выдать награды", "Beenden und Auszeichnungen vergeben")}
                    onClick={() => {
                      setSeasonMenu(false);
                      void finishSeason();
                    }}
                  />
                </>
              )}
            </div>
            <div className={ui.group}>
              <MenuRow
                danger
                icon={<Trash2 size={18} />}
                label={L("Удалить сезон", "Saison löschen")}
                hint={L("Вместе с заданиями и ответами", "Mit Aufgaben und Antworten")}
                onClick={() => {
                  setSeasonMenu(false);
                  void deleteSeason();
                }}
              />
            </div>
          </div>
        )}
      </Sheet>

      {/* форма сезона */}
      <Sheet
        open={!!seasonForm}
        onClose={() => setSeasonForm(null)}
        title={seasonForm?.id ? L("Изменить сезон", "Saison ändern") : L("Новый сезон", "Neue Saison")}
        footer={
          <button
            type="button"
            className={cx(ui.btn, ui.primary, "w-full")}
            disabled={busy}
            onClick={saveSeason}
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {L("Сохранить", "Speichern")}
          </button>
        }
      >
        {seasonForm && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_96px] gap-3">
              <SelectField
                label={L("Месяц сезона", "Monat der Saison")}
                value={seasonForm.start_date ? Number(seasonForm.start_date.slice(5, 7)) - 1 : null}
                placeholder={L("Выбрать месяц", "Monat wählen")}
                options={Array.from({ length: 12 }, (_, m) => ({
                  value: m,
                  label: new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2024, m, 1)),
                }))}
                onChange={(v) => v !== "" && applyMonth(Number(v), seasonForm.year || new Date().getFullYear())}
              />
              <Labeled text={L("Год", "Jahr")}>
                <input
                  className={ui.input}
                  inputMode="numeric"
                  value={seasonForm.year ?? ""}
                  onChange={(e) => {
                    const y = Number(e.target.value.replace(/\D/g, "").slice(0, 4));
                    if (y >= 2000 && seasonForm.start_date) applyMonth(Number(seasonForm.start_date.slice(5, 7)) - 1, y);
                    else setSeasonForm({ ...seasonForm, year: y });
                  }}
                />
              </Labeled>
            </div>
            {dayCount(seasonForm.start_date, seasonForm.end_date) > 0 && (
              <p className="-mt-1 rounded-[14px] bg-[#fff4d1] px-3.5 py-2.5 text-[13px] font-semibold text-[#9a6b00]">
                {L("Дней в сезоне", "Tage in der Saison")}: {dayCount(seasonForm.start_date, seasonForm.end_date)}
                {". "}
                {L(
                  "После сохранения мы предложим сразу создать задания на все дни.",
                  "Nach dem Speichern bieten wir an, sofort Aufgaben für alle Tage zu erstellen.",
                )}
              </p>
            )}
            <Labeled text={L("Номер сезона в году", "Nr. der Saison im Jahr")}>
              <input
                className={ui.input}
                inputMode="numeric"
                value={seasonForm.number ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, number: Number(e.target.value.replace(/\D/g, "")) })}
              />
            </Labeled>
            <Labeled text={L("Название по-немецки", "Titel auf Deutsch")}>
              <input
                className={ui.input}
                value={seasonForm.title_de ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, title_de: e.target.value })}
              />
            </Labeled>
            <Labeled text={L("Название по-русски", "Titel auf Russisch")}>
              <input
                className={ui.input}
                value={seasonForm.title_ru ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, title_ru: e.target.value })}
              />
            </Labeled>
            <DateField
              label={L("Первый день (можно изменить)", "Erster Tag (änderbar)")}
              value={seasonForm.start_date}
              onChange={(v) => setSeasonForm({ ...seasonForm, start_date: v })}
            />
            <DateField
              label={L("Последний день (можно изменить)", "Letzter Tag (änderbar)")}
              value={seasonForm.end_date}
              onChange={(v) => setSeasonForm({ ...seasonForm, end_date: v })}
            />
          </div>
        )}
      </Sheet>

      {/* форма задания */}
      <Sheet
        open={!!taskForm}
        onClose={() => setTaskForm(null)}
        title={taskForm?.id ? `${L("День", "Tag")} ${taskForm.day_number}` : L("Новое задание", "Neue Aufgabe")}
        footer={
          <div className={cx("grid gap-2", taskForm?.id ? "grid-cols-[auto_1fr]" : "grid-cols-1")}>
            {taskForm?.id && (
              <button
                type="button"
                aria-label={L("Удалить", "Löschen")}
                className={cx(ui.btn, ui.danger, "!px-4")}
                disabled={busy}
                onClick={async () => {
                  if (await deleteTasks([taskForm.id as number])) setTaskForm(null);
                }}
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              type="button"
              className={cx(ui.btn, ui.primary)}
              disabled={busy}
              onClick={async () => {
                const d = await act({ action: "task_save", ...taskForm }, L("Сохранено", "Gespeichert"));
                if (d) setTaskForm(null);
              }}
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {L("Сохранить", "Speichern")}
            </button>
          </div>
        }
      >
        {taskForm && (
          <div className="space-y-3">
            <div className="grid grid-cols-[96px_1fr] gap-3">
              <Labeled text={L("День №", "Tag Nr.")}>
                <input
                  className={ui.input}
                  inputMode="numeric"
                  value={taskForm.day_number ?? ""}
                  onChange={(e) => setTaskForm({ ...taskForm, day_number: Number(e.target.value.replace(/\D/g, "")) })}
                />
              </Labeled>
              <DateField
                label={L("Дата задания", "Datum")}
                value={taskForm.task_date}
                onChange={(v) =>
                  setTaskForm({
                    ...taskForm,
                    task_date: v,
                    deadline: new Date(`${v}T23:59`).toISOString(),
                  })
                }
              />
            </div>
            <DateTimeField
              label={L("Срок сдачи", "Abgabefrist")}
              value={taskForm.deadline}
              defaultDate={taskForm.task_date || undefined}
              onChange={(v) => setTaskForm({ ...taskForm, deadline: v })}
            />
            <p className="-mt-1 px-1 text-[12px] text-[#8a8678]">
              {L("В срок — 10 баллов, позже — 5.", "Pünktlich 10 Punkte, später 5.")}
            </p>
            <Labeled text={L("Место в Библии", "Bibelstelle")}>
              <input
                className={ui.input}
                value={taskForm.bible_ref ?? ""}
                onChange={(e) => setTaskForm({ ...taskForm, bible_ref: e.target.value })}
                placeholder="1. Mose 1"
              />
            </Labeled>

            <Segmented
              value={taskLang}
              onChange={setTaskLang}
              options={[
                { value: "de", label: "Deutsch" },
                { value: "ru", label: "Русский" },
              ]}
            />
            {taskLang === "de" ? (
              <>
                <Labeled text="Titel">
                  <input
                    className={ui.input}
                    value={taskForm.title_de ?? ""}
                    onChange={(e) => setTaskForm({ ...taskForm, title_de: e.target.value })}
                  />
                </Labeled>
                <Labeled text="Text und Fragen">
                  <textarea
                    className={ui.area}
                    value={taskForm.text_de ?? ""}
                    onChange={(e) => setTaskForm({ ...taskForm, text_de: e.target.value })}
                  />
                </Labeled>
              </>
            ) : (
              <>
                <Labeled text="Заголовок">
                  <input
                    className={ui.input}
                    value={taskForm.title_ru ?? ""}
                    onChange={(e) => setTaskForm({ ...taskForm, title_ru: e.target.value })}
                  />
                </Labeled>
                <Labeled text="Текст и вопросы">
                  <textarea
                    className={ui.area}
                    value={taskForm.text_ru ?? ""}
                    onChange={(e) => setTaskForm({ ...taskForm, text_ru: e.target.value })}
                  />
                </Labeled>
              </>
            )}

            <div className="flex items-center justify-between gap-3 rounded-[16px] bg-white px-4 py-3 ring-1 ring-[#ece6d3]">
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold">{L("Показать подросткам", "Für Teens sichtbar")}</span>
                <span className="block text-[12px] text-[#8a8678]">
                  {L("Откроется в день задания", "Wird am Tag der Aufgabe freigeschaltet")}
                </span>
              </span>
              <Switch
                checked={Boolean(taskForm.is_published)}
                label={L("Показать подросткам", "Für Teens sichtbar")}
                onChange={(v) => setTaskForm({ ...taskForm, is_published: v })}
              />
            </div>
          </div>
        )}
      </Sheet>

      {/* карточка подростка */}
      <Sheet open={!!person} onClose={() => setPersonId(null)} title={L("Участник", "Teilnehmer")}>
        {person && (
          <div className="space-y-3">
            <div className="flex items-center gap-3.5">
              <Avatar url={person.avatar_url} name={person.nickname} size={64} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[20px] font-extrabold leading-tight">{person.nickname}</p>
                <p className="truncate text-[13px] text-[#6f6a5c]">
                  {person.first_name} {person.last_name}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone="soft">
                    {person.points} {L("баллов", "Punkte")}
                  </Badge>
                  <Badge>
                    {person.days_done} {L("дн. сдано", "Tage abgegeben")}
                  </Badge>
                  {person.is_guest && <Badge tone="sun">{L("гость", "Gast")}</Badge>}
                </div>
              </div>
            </div>

            {isAdmin && (
              <SelectField
                label={L("Ответственный служитель", "Zuständiger Mitarbeiter")}
                value={person.mentor_id}
                emptyLabel={L("Не назначен", "Nicht festgelegt")}
                searchable
                options={team.map((m) => ({
                  value: m.id,
                  label: m.name,
                  hint: m.has_account ? undefined : L("нет входа в приложение", "kein Login in der App"),
                }))}
                onChange={(v) => act({ action: "participant_update", id: person.id, mentor_id: v === "" ? null : Number(v) })}
              />
            )}

            {isAdmin && (
              <div className={ui.group}>
                <SwitchRow
                  title={L("Скрыть в рейтинге", "Im Ranking verstecken")}
                  hint={L("Другие подростки его не увидят", "Andere Teens sehen ihn nicht")}
                  checked={person.hide_in_ranking}
                  onChange={(v) => act({ action: "participant_update", id: person.id, hide_in_ranking: v })}
                />
                <SwitchRow
                  title={L("Заблокировать вход", "Zugang sperren")}
                  hint={L("Не сможет войти в Bibel-Challenge", "Kann sich nicht mehr anmelden")}
                  checked={person.status === "blocked"}
                  onChange={(v) => act({ action: "participant_update", id: person.id, status: v ? "blocked" : "active" })}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                className={cx(ui.btn, ui.soft)}
                disabled={busy}
                onClick={async () => {
                  const ok = await confirm({
                    title: L(`Сбросить пароль для ${person.nickname}?`, `Passwort für ${person.nickname} zurücksetzen?`),
                    text: L(
                      "Мы создадим новый временный пароль. Старый перестанет работать.",
                      "Wir erstellen ein neues Passwort. Das alte funktioniert dann nicht mehr.",
                    ),
                    confirmLabel: L("Сбросить", "Zurücksetzen"),
                  });
                  if (!ok) return;
                  const d = await act({ action: "participant_reset_password", id: person.id });
                  if (d?.password) setTempPw({ nick: person.nickname, pw: d.password });
                }}
              >
                <KeyRound size={18} />
                {L("Сбросить пароль", "Passwort zurücksetzen")}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className={cx(ui.btn, ui.danger)}
                  disabled={busy}
                  onClick={async () => {
                    const ok = await confirm({
                      title: L(`Удалить ${person.nickname}?`, `${person.nickname} löschen?`),
                      text: L(
                        "Вместе с ответами, фото и подарками. Это нельзя отменить.",
                        "Mit Antworten, Fotos und Geschenken. Das lässt sich nicht rückgängig machen.",
                      ),
                      confirmLabel: L("Удалить", "Löschen"),
                      danger: true,
                    });
                    if (!ok) return;
                    const d = await act({ action: "participant_delete", id: person.id }, L("Удалено", "Gelöscht"));
                    if (d) setPersonId(null);
                  }}
                >
                  <Trash2 size={18} />
                  {L("Удалить участника", "Teilnehmer löschen")}
                </button>
              )}
            </div>
          </div>
        )}
      </Sheet>

      {/* временный пароль */}
      <Sheet open={!!tempPw} onClose={() => setTempPw(null)} title={L("Новый пароль", "Neues Passwort")}>
        {tempPw && (
          <div>
            <p className="text-[14px] leading-relaxed text-[#6f6a5c]">
              {L(
                `Для ${tempPw.nick}. Передайте его подростку, потом он сможет сменить пароль в профиле. Мы покажем его только один раз.`,
                `Für ${tempPw.nick}. Gib es dem Teen, er kann es danach im Profil ändern. Wir zeigen es nur einmal.`,
              )}
            </p>
            <p className="mt-4 rounded-[18px] bg-white px-4 py-5 text-center font-mono text-[28px] font-extrabold tracking-[0.12em] ring-1 ring-[#ece6d3]">
              {tempPw.pw}
            </p>
            <button
              type="button"
              className={cx(ui.btn, ui.primary, "mt-4 w-full")}
              onClick={() => {
                void navigator.clipboard?.writeText(tempPw.pw);
                toast(L("Пароль скопирован", "Passwort kopiert"));
              }}
            >
              <Copy size={18} />
              {L("Скопировать", "Kopieren")}
            </button>
          </div>
        )}
      </Sheet>

      {/* назначить выбранным */}
      <SelectSheet
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={L(`Назначить: ${pickedPeople.length}`, `Zuweisen: ${pickedPeople.length}`)}
        value={undefined}
        searchable
        emptyLabel={L("Снять ответственного", "Zuständigen entfernen")}
        options={team.map((m) => ({
          value: m.id,
          label: m.name,
          hint: `${mentorLoad.m.get(m.id) ?? 0} ${L("подопечных", "Teilnehmer")}${m.has_account ? "" : ` · ${L("нет входа", "kein Login")}`}`,
        }))}
        onChange={(v) => void assignPicked(v === "" ? null : Number(v))}
      />

      {/* поровну */}
      <Sheet
        open={distOpen}
        onClose={() => setDistOpen(false)}
        title={L("Распределить поровну", "Gleichmäßig verteilen")}
        footer={
          <button
            type="button"
            className={cx(ui.btn, ui.primary, "w-full")}
            disabled={busy || distMentors.length === 0}
            onClick={distribute}
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Shuffle size={18} />}
            {L("Распределить", "Verteilen")}
          </button>
        }
      >
        <p className="mb-3 text-[14px] leading-relaxed text-[#6f6a5c]">
          {pickedPeople.length
            ? L(`Подростков выбрано: ${pickedPeople.length}.`, `Gewählte Teens: ${pickedPeople.length}.`)
            : L(
                `Ничего не выбрано, поэтому распределим всех без ответственного (${mentorLoad.none}).`,
                `Nichts gewählt, deshalb verteilen wir alle ohne Zuständigen (${mentorLoad.none}).`,
              )}{" "}
          {L(
            "Отметьте служителей. Тех, кто уже за ними закреплён, мы тоже учтём.",
            "Wähle die Mitarbeiter. Schon zugewiesene Teens zählen wir mit.",
          )}
        </p>
        <div className={ui.group}>
          {team.map((m) => {
            const on = distMentors.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(distMentors, m.id, setDistMentors)}
                className={cx("flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left active:bg-[#faf8f3]", on && "bg-[#fff4d1]")}
              >
                <span
                  className={cx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                    on ? "border-[#1b2431] bg-[#1b2431] text-[#ffc93c]" : "border-[#d9d3c1]",
                  )}
                >
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{m.name}</span>
                  {!m.has_account && (
                    <span className="block text-[12px] text-[#b3342f]">{L("нет входа в приложение", "kein Login in der App")}</span>
                  )}
                </span>
                <span className="text-[13px] font-semibold text-[#8a8678]">{mentorLoad.m.get(m.id) ?? 0}</span>
              </button>
            );
          })}
        </div>
      </Sheet>
    </main>
  );
}

function Labeled({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={cx(ui.label, "mb-1.5 block")}>{text}</span>
      {children}
    </label>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("flex min-h-[58px] w-full items-center gap-3.5 px-4 py-2.5 text-left active:bg-[#faf8f3]", danger && "text-[#b3342f]")}
    >
      <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", danger ? "bg-[#fbeceb]" : "bg-[#f1ede1]")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="block text-[12px] font-normal text-[#8a8678]">{hint}</span>}
      </span>
    </button>
  );
}

function SwitchRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-h-[62px] items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        {hint && <span className="block text-[12px] text-[#8a8678]">{hint}</span>}
      </span>
      <Switch checked={checked} label={title} onChange={onChange} />
    </div>
  );
}