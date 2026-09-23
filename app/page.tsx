"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Cake,
  CalendarDays,
  CalendarRange,
  Clock3,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";
import { useLanguage } from "@/components/LanguageProvider";

type WorkProject = {
  id: number;
  title: string;
  description: string | null;
  status: "planned" | "active" | "completed" | "archived";
  start_date: string | null;
  end_date: string | null;
};

type WorkItem = {
  id: number;
  project_id: number;
  title: string;
  status: "open" | "in_progress" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  deadline: string | null;
};

type ScheduleEntry = {
  id: number;
  schedule_date: string;
  service_time: "10:00" | "12:30";
  entry_type: "lesson" | "event";
  title_de: string | null;
  title_ru: string | null;
  bible_text: string | null;
  series: string | null;
  notes: string | null;
};

type TeamMember = {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  status: "active" | "inactive";
};

type ScheduleMember = {
  schedule_entry_id: number;
  team_member_id: number;
};

type Teen = {
  id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  is_active: boolean;
};

type BirthdayCelebration = {
  id: number;
  teen_id: number;
  birthday_year: number;
  celebration_date: string;
  celebrated: boolean;
};

/**
 * Единый помощник для логирования ошибок Supabase.
 * PostgrestError почти никогда не сериализуется красиво через
 * console.error(label, error) — в консоли/оверлее Next.js это
 * часто выглядит как пустой объект "{}". Логируем явные поля.
 */
function logSupabaseError(
  label: string,
  error: unknown,
) {
  if (!error) return;

  const err = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  console.error(label, {
    message: err?.message ?? String(error),
    code: err?.code ?? null,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
  });
}

function parseLocalDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function dateToString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPreviousSunday(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const daysBack = day === 0 ? 0 : day;

  result.setDate(result.getDate() - daysBack);
  return result;
}

function getNextSunday(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const daysForward = day === 0 ? 0 : 7 - day;

  result.setDate(result.getDate() + daysForward);
  return result;
}

function getBirthdayDateForYear(
  birthDate: string,
  year: number,
) {
  const original = parseLocalDate(birthDate);
  const month = original.getMonth();
  const day = original.getDate();

  if (month === 1 && day === 29) {
    const isLeapYear =
      year % 4 === 0 &&
      (year % 100 !== 0 || year % 400 === 0);

    return new Date(
      year,
      1,
      isLeapYear ? 29 : 28,
    );
  }

  return new Date(year, month, day);
}

function getBirthdayCelebrationCandidate(
  birthDate: string,
  today: Date,
) {
  const previousSunday = getPreviousSunday(today);
  const nextSunday = getNextSunday(today);
  const isSunday = today.getDay() === 0;

  const birthday = getBirthdayDateForYear(
    birthDate,
    today.getFullYear(),
  );

  const isInWindow = isSunday
    ? birthday >= previousSunday && birthday <= nextSunday
    : birthday > previousSunday && birthday <= nextSunday;

  return isInWindow ? dateToString(nextSunday) : null;
}

function formatDate(
  date: string,
  language: "de" | "ru",
  options: Intl.DateTimeFormatOptions,
) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    language === "de" ? "de-DE" : "ru-RU",
    options,
  );
}

function formatProjectPeriod(
  startDate: string | null,
  endDate: string | null,
  language: "de" | "ru",
) {
  if (!startDate && !endDate) {
    return language === "de"
      ? "Kein Zeitraum festgelegt"
      : "Период не указан";
  }

  if (startDate && endDate) {
    return `${formatDate(startDate, language, {
      day: "2-digit",
      month: "short",
    })} – ${formatDate(endDate, language, {
      day: "2-digit",
      month: "short",
    })}`;
  }

  if (startDate) {
    return language === "de"
      ? `Ab ${formatDate(startDate, language, {
          day: "2-digit",
          month: "short",
        })}`
      : `С ${formatDate(startDate, language, {
          day: "2-digit",
          month: "short",
        })}`;
  }

  return language === "de"
    ? `Bis ${formatDate(endDate!, language, {
        day: "2-digit",
        month: "short",
      })}`
    : `До ${formatDate(endDate!, language, {
        day: "2-digit",
        month: "short",
      })}`;
}

export default function Home() {
  const router = useRouter();
  const { language } = useLanguage();

  const t = translations[language];

  const [scheduleEntries, setScheduleEntries] = useState<
    ScheduleEntry[]
  >([]);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(
    [],
  );

  const [scheduleMembers, setScheduleMembers] = useState<
    ScheduleMember[]
  >([]);

  const [workProjects, setWorkProjects] = useState<
    WorkProject[]
  >([]);

  const [workItems, setWorkItems] = useState<WorkItem[]>([]);

  const [teens, setTeens] = useState<Teen[]>([]);
  const [birthdayCelebrations, setBirthdayCelebrations] = useState<
    BirthdayCelebration[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(
    null,
  );

  const isRu = language === "ru";

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setLoadError(null);

    try {
      const [
        { data: scheduleData, error: scheduleError },
        { data: teamData, error: teamError },
        { data: projectsData, error: projectsError },
        { data: workItemsData, error: workItemsError },
        { data: teensData, error: teensError },
        { data: birthdayData, error: birthdayError },
      ] = await Promise.all([
        supabase
          .from("schedule_entries")
          .select(
            "id, schedule_date, service_time, entry_type, title_de, title_ru, bible_text, series, notes",
          )
          .order("schedule_date", { ascending: true })
          .order("service_time", { ascending: true }),

        supabase
          .from("team_members")
          .select(
            "id, first_name, last_name, position, status",
          )
          .eq("status", "active")
          .order("last_name", { ascending: true }),

        supabase
          .from("work_projects")
          .select(
            "id, title, description, status, start_date, end_date",
          )
          .in("status", ["planned", "active"])
          .order("start_date", { ascending: true })
          .order("created_at", { ascending: false }),

        supabase
          .from("work_items")
          .select(
            "id, project_id, title, status, priority, deadline",
          )
          .order("deadline", {
            ascending: true,
            nullsFirst: false,
          }),

        supabase
          .from("teens")
          .select(
            "id, first_name, last_name, birth_date, is_active",
          )
          .eq("is_active", true)
          .order("last_name", { ascending: true }),

        supabase
          .from("teen_birthday_celebrations")
          .select(
            "id, teen_id, birthday_year, celebration_date, celebrated",
          )
          .eq("birthday_year", new Date().getFullYear()),
      ]);

      if (scheduleError) {
        logSupabaseError(
          "Dashboard schedule:",
          scheduleError,
        );
      }

      if (teamError) {
        logSupabaseError("Dashboard team:", teamError);
      }

      if (projectsError) {
        logSupabaseError(
          "Dashboard work projects:",
          projectsError,
        );
      }

      if (workItemsError) {
        logSupabaseError(
          "Dashboard work items:",
          workItemsError,
        );
      }

      if (teensError) {
        logSupabaseError("Dashboard teens:", teensError);
      }

      if (birthdayError) {
        logSupabaseError(
          "Dashboard birthday celebrations:",
          birthdayError,
        );
      }

      const entries = scheduleData ?? [];

      let scheduleMemberData: ScheduleMember[] = [];

      if (entries.length > 0) {
        const { data, error } = await supabase
          .from("schedule_entry_members")
          .select(
            "schedule_entry_id, team_member_id",
          )
          .in(
            "schedule_entry_id",
            entries.map((entry) => entry.id),
          );

        if (error) {
          logSupabaseError(
            "Dashboard schedule members:",
            error,
          );
        }

        scheduleMemberData = data ?? [];
      }

      setScheduleEntries(entries);
      setTeamMembers(teamData ?? []);
      setScheduleMembers(scheduleMemberData);
      setWorkProjects(projectsData ?? []);
      setWorkItems(workItemsData ?? []);
      setTeens(teensData ?? []);
      setBirthdayCelebrations(birthdayData ?? []);
    } catch (err) {
      /*
       * Сеть недоступна, Supabase-проект на паузе, CORS и т.п.
       * Ловим здесь, чтобы неотловленный reject не ронял рендер
       * (из-за чего в dev-режиме Next.js мог перекрывать весь
       * экран оверлеем ошибки, включая нижнюю навигацию).
       */
      const message =
        err instanceof Error
          ? err.message
          : "Unbekannter Fehler";

      console.error("Dashboard load failed:", message);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }

  const today = useMemo(() => new Date(), []);
  const todayString = dateToString(today);

  const upcomingSchedule = useMemo(() => {
    return scheduleEntries.filter(
      (entry) => entry.schedule_date >= todayString,
    );
  }, [scheduleEntries, todayString]);

  const nextScheduleDate =
    upcomingSchedule[0]?.schedule_date ?? null;

  const nextServiceEntries = useMemo(() => {
    if (!nextScheduleDate) {
      return [];
    }

    return upcomingSchedule
      .filter(
        (entry) =>
          entry.schedule_date === nextScheduleDate,
      )
      .sort((a, b) =>
        a.service_time.localeCompare(b.service_time),
      );
  }, [nextScheduleDate, upcomingSchedule]);

  const calendarPreview = useMemo(() => {
    const dates: string[] = [];

    for (const entry of upcomingSchedule) {
      if (!dates.includes(entry.schedule_date)) {
        dates.push(entry.schedule_date);
      }

      if (dates.length >= 4) {
        break;
      }
    }

    return dates;
  }, [upcomingSchedule]);

  const upcomingBirthdays = useMemo(() => {
    const currentYear = today.getFullYear();

    return teens
      .map((teen) => {
        const celebration = birthdayCelebrations.find(
          (item) =>
            item.teen_id === teen.id &&
            item.birthday_year === currentYear,
        );

        if (celebration?.celebrated) {
          return null;
        }

        const celebrationDate =
          getBirthdayCelebrationCandidate(
            teen.birth_date,
            today,
          );

        if (!celebrationDate) {
          return null;
        }

        return {
          teen,
          birthdayDate: getBirthdayDateForYear(
            teen.birth_date,
            currentYear,
          ),
          celebrationDate,
        };
      })
      .filter(
        (item): item is NonNullable<typeof item> =>
          item !== null,
      )
      .sort(
        (a, b) =>
          a.birthdayDate.getTime() -
          b.birthdayDate.getTime(),
      );
  }, [teens, birthdayCelebrations, today]);

  async function markBirthdayCelebrated(teenId: number) {
    const year = today.getFullYear();

    const existing = birthdayCelebrations.find(
      (item) =>
        item.teen_id === teenId &&
        item.birthday_year === year,
    );

    if (existing) {
      const { error } = await supabase
        .from("teen_birthday_celebrations")
        .update({
          celebrated: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        logSupabaseError(
          "Dashboard birthday update:",
          error,
        );
        return;
      }

      setBirthdayCelebrations((current) =>
        current.map((item) =>
          item.id === existing.id
            ? { ...item, celebrated: true }
            : item,
        ),
      );

      return;
    }

    const teen = teens.find((item) => item.id === teenId);

    if (!teen) return;

    const candidate = getBirthdayCelebrationCandidate(
      teen.birth_date,
      today,
    );

    if (!candidate) return;

    const { data, error } = await supabase
      .from("teen_birthday_celebrations")
      .insert({
        teen_id: teenId,
        birthday_year: year,
        celebration_date: candidate,
        celebrated: true,
      })
      .select(
        "id, teen_id, birthday_year, celebration_date, celebrated",
      )
      .single();

    if (error) {
      logSupabaseError(
        "Dashboard birthday insert:",
        error,
      );
      return;
    }

    if (data) {
      setBirthdayCelebrations((current) => [
        ...current,
        data,
      ]);
    }
  }

  const currentWork = useMemo(() => {
    const active = workProjects.find(
      (project) => project.status === "active",
    );

    if (active) {
      return active;
    }

    return (
      workProjects.find(
        (project) => project.status === "planned",
      ) ?? null
    );
  }, [workProjects]);

  const currentWorkItems = useMemo(() => {
    if (!currentWork) {
      return [];
    }

    return workItems.filter(
      (item) => item.project_id === currentWork.id,
    );
  }, [currentWork, workItems]);

  const currentWorkStats = useMemo(() => {
    const total = currentWorkItems.length;

    const completed = currentWorkItems.filter(
      (item) => item.status === "completed",
    ).length;

    const inProgress = currentWorkItems.filter(
      (item) => item.status === "in_progress",
    ).length;

    const open = currentWorkItems.filter(
      (item) => item.status === "open",
    ).length;

    const progress =
      total > 0
        ? Math.round((completed / total) * 100)
        : 0;

    return {
      total,
      completed,
      inProgress,
      open,
      progress,
    };
  }, [currentWorkItems]);

  function getScheduleMembers(entryId: number) {
    const memberIds = scheduleMembers
      .filter(
        (item) =>
          item.schedule_entry_id === entryId,
      )
      .map((item) => item.team_member_id);

    return teamMembers.filter((member) =>
      memberIds.includes(member.id),
    );
  }

  function getScheduleTitle(entry: ScheduleEntry) {
    if (language === "de") {
      return (
        entry.title_de ||
        entry.title_ru ||
        "Ohne Titel"
      );
    }

    return (
      entry.title_ru ||
      entry.title_de ||
      "Без названия"
    );
  }

  /*
   * Menü "Mehr".
   *
   * Идеи убраны.
   */
  const moreItems = [
    {
      href: "/work",
      label: isRu ? "Работа" : "Arbeit",
      description: isRu
        ? "Общие работы команды"
        : "Gemeinsame Arbeiten",
      icon: BriefcaseBusiness,
    },
    {
      href: "/team",
      label: isRu ? "Команда" : "Team",
      description: isRu
        ? "Участники команды"
        : "Teammitglieder",
      icon: Users,
    },
    {
      href: "/teens",
      label: isRu ? "Подростки" : "Teens",
      description: isRu
        ? "Список подростков"
        : "Teenager",
      icon: UserRound,
    },
    {
      href: "/settings",
      label: isRu ? "Настройки" : "Einstellungen",
      description: isRu
        ? "Аккаунт и система"
        : "Konto und System",
      icon: SettingsIcon,
    },
  ];

  return (
    <>
      <main className="min-h-screen overflow-x-hidden bg-[#f7f7f6] text-neutral-900">
        {/* =====================================================
            MOBILE HEADER
        ====================================================== */}
        <header className="sticky top-0 z-30 border-b border-[#e6e7e8] bg-[#f7f7f6]/95 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[760px] items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src="/tlite-logo.png"
                alt="TLight"
                width={46}
                height={46}
                priority
                className="h-[46px] w-[46px] shrink-0 rounded-[13px]"
              />

              <div className="min-w-0">
                <div className="text-[20px] font-bold leading-none tracking-[-0.04em] text-[#111820]">
                  TLight
                </div>

                <div className="mt-1 text-[8px] font-semibold uppercase leading-[1.1] tracking-[0.14em] text-[#8a939d]">
                  {t.common.teamWorkspace}
                </div>
              </div>
            </div>

            {/* MORE */}
            <button
              type="button"
              onClick={() =>
                setMoreOpen((value) => !value)
              }
              aria-label={
                isRu ? "Ещё" : "Mehr"
              }
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border shadow-[0_2px_8px_rgba(17,24,32,0.05)] transition active:scale-95 ${
                moreOpen
                  ? "border-[#111820] bg-[#111820] text-white"
                  : "border-[#dfe2e5] bg-white text-[#374353]"
              }`}
            >
              {moreOpen ? (
                <X
                  size={21}
                  strokeWidth={2.1}
                />
              ) : (
                <MoreIcon size={22} />
              )}
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[760px] px-4 pb-28 sm:px-6">
          {loadError && (
            <div className="mt-4 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {isRu
                ? "Не удалось загрузить данные. Проверьте подключение и попробуйте ещё раз."
                : "Daten konnten nicht geladen werden. Bitte Verbindung prüfen und erneut versuchen."}
              <button
                type="button"
                onClick={() => loadDashboard()}
                className="ml-2 font-semibold underline"
              >
                {isRu ? "Повторить" : "Erneut versuchen"}
              </button>
            </div>
          )}

          {/* =====================================================
              NEXT SERVICE
          ====================================================== */}
          <section className="pt-7">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-[29px] font-bold leading-[1.08] tracking-[-0.05em] text-neutral-950">
                  {isRu
                    ? "Ближайшее служение"
                    : "Nächster Dienst"}
                </h1>

                <p className="mt-2 text-[14px] leading-5 text-neutral-500">
                  {isRu
                    ? "Самое важное на ближайшее время"
                    : "Das Wichtigste für die nächste Zeit"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/schedule")
                }
                className="shrink-0 pb-1 text-[13px] font-semibold text-neutral-500"
              >
                {t.dashboard.viewAll}
              </button>
            </div>

            {loading ? (
              <div className="h-[390px] animate-pulse rounded-[27px] bg-white" />
            ) : nextServiceEntries.length === 0 ? (
              <div className="rounded-[27px] border border-neutral-200 bg-white px-6 py-12 text-center shadow-[0_4px_18px_rgba(17,24,32,0.04)]">
                <CalendarDays
                  size={30}
                  className="mx-auto text-neutral-300"
                />

                <p className="mt-4 text-[14px] font-medium text-neutral-400">
                  {isRu
                    ? "Ближайших служений пока нет"
                    : "Keine kommenden Dienste"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {nextServiceEntries.map(
                  (entry) => {
                    const members =
                      getScheduleMembers(
                        entry.id,
                      );

                    return (
                      <button
                        type="button"
                        key={entry.id}
                        onClick={() =>
                          router.push("/schedule")
                        }
                        className="group w-full overflow-hidden rounded-[27px] border border-neutral-200 bg-white text-left shadow-[0_4px_18px_rgba(17,24,32,0.055)] transition active:scale-[0.995]"
                      >
                        <div className="flex min-h-[180px]">
                          <div className="flex w-[112px] shrink-0 flex-col items-center justify-center bg-[#111820] px-2 text-white">
                            <Clock3
                              size={23}
                              strokeWidth={1.7}
                              className="mb-3 text-neutral-400"
                            />

                            <span className="text-[25px] font-bold leading-none tracking-[-0.05em]">
                              {entry.service_time}
                            </span>

                            <span className="mt-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                              {isRu
                                ? "служение"
                                : "dienst"}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1 p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[12px] font-medium capitalize text-neutral-400">
                                  {formatDate(
                                    entry.schedule_date,
                                    language,
                                    {
                                      weekday:
                                        "long",
                                      day: "2-digit",
                                      month: "long",
                                    },
                                  )}
                                </p>

                                <h2 className="mt-2 line-clamp-2 text-[20px] font-bold leading-[1.15] tracking-[-0.035em] text-neutral-950">
                                  {getScheduleTitle(
                                    entry,
                                  )}
                                </h2>
                              </div>

                              <ArrowRight
                                size={20}
                                className="mt-1 shrink-0 text-neutral-300"
                              />
                            </div>

                            {entry.bible_text && (
                              <span className="mt-4 inline-flex max-w-full truncate rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-600">
                                {entry.bible_text}
                              </span>
                            )}

                            {entry.series && (
                              <p className="mt-3 truncate text-[11px] font-medium text-neutral-400">
                                {entry.series}
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {members.length > 0 ? (
                                members
                                  .slice(0, 4)
                                  .map(
                                    (member) => (
                                      <span
                                        key={
                                          member.id
                                        }
                                        className="rounded-full bg-[#f4f5f5] px-2.5 py-1 text-[10px] font-medium text-neutral-600"
                                      >
                                        {
                                          member.first_name
                                        }{" "}
                                        {
                                          member.last_name
                                        }
                                      </span>
                                    ),
                                  )
                              ) : (
                                <span className="text-[11px] text-neutral-400">
                                  {isRu
                                    ? "Служители не назначены"
                                    : "Keine Mitarbeiter zugewiesen"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </section>

          {/* =====================================================
              TEEN BIRTHDAYS
          ====================================================== */}
          {!loading && upcomingBirthdays.length > 0 && (
            <section className="mt-4">
              <div className="overflow-hidden rounded-[23px] border border-neutral-200 bg-white shadow-[0_4px_18px_rgba(17,24,32,0.04)]">
                <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#111820] text-white">
                      <Cake size={18} strokeWidth={1.8} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-neutral-900">
                        {isRu
                          ? "Дни рождения"
                          : "Geburtstage"}
                      </p>

                      <p className="mt-0.5 text-[11px] text-neutral-400">
                        {isRu
                          ? "Кого не забыть поздравить"
                          : "Wen ihr nicht vergessen solltet"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push("/teens")
                    }
                    className="shrink-0 text-[12px] font-semibold text-neutral-500"
                  >
                    {isRu
                      ? "Подростки"
                      : "Teens"}
                  </button>
                </div>

                <div className="divide-y divide-neutral-100">
                  {upcomingBirthdays.map(
                    ({
                      teen,
                      birthdayDate,
                      celebrationDate,
                    }) => (
                      <div
                        key={teen.id}
                        className="flex items-center gap-3 px-4 py-3.5"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                          <span className="text-[13px] font-bold">
                            {teen.first_name.charAt(0)}
                            {teen.last_name.charAt(0)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-neutral-900">
                            {teen.first_name}{" "}
                            {teen.last_name}
                          </p>

                          <p className="mt-0.5 text-[11px] text-neutral-400">
                            {formatDate(
                              dateToString(
                                birthdayDate,
                              ),
                              language,
                              {
                                day: "2-digit",
                                month: "long",
                              },
                            )}
                          </p>

                          <p className="mt-1 text-[10px] font-medium text-neutral-500">
                            {isRu
                              ? `Поздравить ${formatDate(
                                  celebrationDate,
                                  language,
                                  {
                                    weekday:
                                      "long",
                                    day: "2-digit",
                                    month: "long",
                                  },
                                )}`
                              : `Am ${formatDate(
                                  celebrationDate,
                                  language,
                                  {
                                    weekday:
                                      "long",
                                    day: "2-digit",
                                    month: "long",
                                  },
                                )} gratulieren`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            markBirthdayCelebrated(
                              teen.id,
                            )
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[15px] font-semibold text-neutral-600 transition active:scale-95"
                          aria-label={
                            isRu
                              ? "Поздравление выполнено"
                              : "Als gratuliert markieren"
                          }
                        >
                          ✓
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </section>
          )}

          {/* =====================================================
              SERVICE DATE SUMMARY
          ====================================================== */}
          {nextScheduleDate && (
            <section className="mt-4">
              <button
                type="button"
                onClick={() =>
                  router.push("/schedule")
                }
                className="flex w-full items-center justify-between rounded-[20px] border border-neutral-200 bg-white px-4 py-3.5 text-left shadow-[0_2px_10px_rgba(17,24,32,0.03)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-neutral-100 text-neutral-600">
                    <CalendarRange size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-neutral-800">
                      {formatDate(
                        nextScheduleDate,
                        language,
                        {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                        },
                      )}
                    </p>

                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      {nextServiceEntries.length ===
                      1
                        ? isRu
                          ? "1 служение"
                          : "1 Dienst"
                        : isRu
                          ? `${nextServiceEntries.length} служения`
                          : `${nextServiceEntries.length} Dienste`}
                    </p>
                  </div>
                </div>

                <ArrowRight
                  size={18}
                  className="shrink-0 text-neutral-300"
                />
              </button>
            </section>
          )}

          {/* =====================================================
              CURRENT WORK
          ====================================================== */}
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[23px] font-bold tracking-[-0.045em] text-neutral-950">
                  {isRu
                    ? "Текущая работа"
                    : "Aktuelle Arbeit"}
                </h2>

                <p className="mt-1 text-[13px] text-neutral-500">
                  {isRu
                    ? "Над чем команда работает сейчас"
                    : "Woran das Team gerade arbeitet"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/work")
                }
                className="shrink-0 text-[13px] font-semibold text-neutral-500"
              >
                Alle
              </button>
            </div>

            {loading ? (
              <div className="h-[190px] animate-pulse rounded-[25px] bg-white" />
            ) : !currentWork ? (
              <button
                type="button"
                onClick={() =>
                  router.push("/work")
                }
                className="w-full rounded-[25px] border border-neutral-200 bg-white px-5 py-7 text-left shadow-[0_4px_18px_rgba(17,24,32,0.04)] transition active:scale-[0.995]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#111820] text-white">
                    <BriefcaseBusiness
                      size={21}
                      strokeWidth={1.8}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-neutral-900">
                      {isRu
                        ? "Пока нет текущей работы"
                        : "Noch keine aktuelle Arbeit"}
                    </p>

                    <p className="mt-1 text-[12px] text-neutral-400">
                      {isRu
                        ? "Открыть раздел Arbeit"
                        : "Arbeit öffnen"}
                    </p>
                  </div>

                  <ArrowRight
                    size={18}
                    className="shrink-0 text-neutral-300"
                  />
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/work/${currentWork.id}`,
                  )
                }
                className="group w-full overflow-hidden rounded-[25px] bg-[#111820] text-left text-white shadow-[0_7px_24px_rgba(17,24,32,0.13)] transition active:scale-[0.995]"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-white/10">
                      <BriefcaseBusiness
                        size={21}
                        strokeWidth={1.8}
                        className="text-white"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                            {currentWork.status ===
                            "active"
                              ? isRu
                                ? "Активная работа"
                                : "Aktiv"
                              : isRu
                                ? "Запланировано"
                                : "Geplant"}
                          </p>

                          <h3 className="mt-1.5 line-clamp-2 text-[19px] font-bold leading-[1.15] tracking-[-0.035em]">
                            {currentWork.title}
                          </h3>
                        </div>

                        <ArrowRight
                          size={19}
                          className="mt-1 shrink-0 text-neutral-500 transition group-active:translate-x-0.5"
                        />
                      </div>
                    </div>
                  </div>

                  {currentWork.description && (
                    <p className="mt-4 line-clamp-2 text-[12px] leading-5 text-neutral-400">
                      {currentWork.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-neutral-400">
                      {formatProjectPeriod(
                        currentWork.start_date,
                        currentWork.end_date,
                        language,
                      )}
                    </p>

                    <p className="text-[11px] font-semibold text-neutral-300">
                      {currentWorkStats.progress}%
                    </p>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-white transition-all"
                      style={{
                        width: `${currentWorkStats.progress}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {currentWorkStats.open > 0 && (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-neutral-300">
                        {currentWorkStats.open}{" "}
                        {isRu ? "открыто" : "offen"}
                      </span>
                    )}

                    {currentWorkStats.inProgress >
                      0 && (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-neutral-300">
                        {currentWorkStats.inProgress}{" "}
                        {isRu
                          ? "в работе"
                          : "in Arbeit"}
                      </span>
                    )}

                    {currentWorkStats.completed >
                      0 && (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-neutral-300">
                        {currentWorkStats.completed}{" "}
                        {isRu
                          ? "готово"
                          : "erledigt"}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )}
          </section>

          {/* =====================================================
              CALENDAR PREVIEW
          ====================================================== */}
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[23px] font-bold tracking-[-0.045em] text-neutral-950">
                  {t.navigation.calendar}
                </h2>

                <p className="mt-1 text-[13px] text-neutral-500">
                  {isRu
                    ? "Ближайшие даты"
                    : "Die nächsten Termine"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/calendar")
                }
                className="text-[13px] font-semibold text-neutral-500"
              >
                {t.dashboard.viewAll}
              </button>
            </div>

            <div className="overflow-hidden rounded-[25px] border border-neutral-200 bg-white shadow-[0_4px_18px_rgba(17,24,32,0.04)]">
              <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-neutral-100 text-neutral-700">
                    <CalendarDays
                      size={21}
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>
                    <p className="text-[14px] font-semibold text-neutral-900">
                      {nextScheduleDate
                        ? formatDate(
                            nextScheduleDate,
                            language,
                            {
                              month: "long",
                              year: "numeric",
                            },
                          )
                        : isRu
                          ? "Календарь"
                          : "Kalender"}
                    </p>

                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      {isRu
                        ? "Ближайшие события"
                        : "Nächste Termine"}
                    </p>
                  </div>
                </div>

                <ArrowRight
                  size={18}
                  className="text-neutral-300"
                />
              </div>

              {calendarPreview.length === 0 ? (
                <div className="px-5 py-9 text-center text-sm text-neutral-400">
                  {isRu
                    ? "Пока нет запланированных дат"
                    : "Noch keine Termine geplant"}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-4">
                  {calendarPreview.map(
                    (date, index) => {
                      const entriesForDate =
                        upcomingSchedule.filter(
                          (entry) =>
                            entry.schedule_date ===
                            date,
                        );

                      return (
                        <button
                          type="button"
                          key={date}
                          onClick={() =>
                            router.push(
                              "/calendar",
                            )
                          }
                          className={`min-h-[125px] rounded-[19px] p-4 text-left transition active:scale-[0.98] ${
                            index === 0
                              ? "bg-[#111820] text-white"
                              : "bg-neutral-50 text-neutral-900"
                          }`}
                        >
                          <p
                            className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                              index === 0
                                ? "text-neutral-400"
                                : "text-neutral-400"
                            }`}
                          >
                            {formatDate(
                              date,
                              language,
                              {
                                weekday: "short",
                              },
                            )}
                          </p>

                          <p className="mt-2 text-[27px] font-bold leading-none tracking-[-0.04em]">
                            {new Date(
                              `${date}T00:00:00`,
                            ).getDate()}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-1">
                            {entriesForDate.map(
                              (entry) => (
                                <span
                                  key={
                                    entry.id
                                  }
                                  className={`rounded-full px-2 py-1 text-[9px] font-semibold ${
                                    index === 0
                                      ? "bg-white/10 text-white"
                                      : "bg-white text-neutral-600"
                                  }`}
                                >
                                  {
                                    entry.service_time
                                  }
                                </span>
                              ),
                            )}
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* =====================================================
          MORE SHEET
      ====================================================== */}
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label={
              isRu
                ? "Закрыть меню"
                : "Menü schließen"
            }
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          />

          <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3">
            <div className="mx-auto max-w-[430px] overflow-hidden rounded-[28px] border border-[#e2e5e8] bg-white shadow-[0_-12px_40px_rgba(17,24,32,0.16)]">
              <div className="flex items-center justify-between border-b border-[#eceef0] px-5 py-4">
                <div>
                  <p className="text-[18px] font-bold tracking-[-0.02em] text-[#111820]">
                    {isRu
                      ? "Ещё"
                      : "Mehr"}
                  </p>

                  <p className="mt-0.5 text-[13px] text-[#7a8490]">
                    {isRu
                      ? "Все разделы TLight"
                      : "Weitere Bereiche"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMoreOpen(false)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f5] text-[#4e5966]"
                  aria-label={
                    isRu
                      ? "Закрыть"
                      : "Schließen"
                  }
                >
                  <X size={19} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3">
                {moreItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      type="button"
                      key={item.href}
                      onClick={() => {
                        setMoreOpen(false);
                        router.push(item.href);
                      }}
                      className="flex min-h-[72px] items-center gap-3 rounded-[18px] bg-[#f6f7f7] px-4 text-left transition active:scale-[0.98]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white text-[#303b48] shadow-sm">
                        <Icon size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-[#202a35]">
                          {item.label}
                        </p>

                        <p className="mt-0.5 truncate text-[10px] text-[#8a939d]">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-[#eceef0] px-5 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    router.push("/settings");
                  }}
                  className="flex min-h-[48px] w-full items-center justify-center text-[13px] font-semibold text-[#687585]"
                >
                  {isRu
                    ? "Настройки аккаунта"
                    : "Kontoeinstellungen"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function MoreIcon({
  size = 20,
}: {
  size?: number;
}) {
  return (
    <span
      className="flex items-center justify-center gap-[3px]"
      style={{
        width: size,
        height: size,
      }}
    >
      <span className="h-[3px] w-[3px] rounded-full bg-current" />
      <span className="h-[3px] w-[3px] rounded-full bg-current" />
      <span className="h-[3px] w-[3px] rounded-full bg-current" />
    </span>
  );
}

function SettingsIcon({
  size = 20,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.02 1.55V20h-2.4v-.21a1.7 1.7 0 0 0-1.02-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.5 15a1.7 1.7 0 0 0-1.55-1.02H6.7v-2.4h.25A1.7 1.7 0 0 0 8.5 10a1.7 1.7 0 0 0-.34-1.88L8.1 8.06l1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.02-1.55V5h2.4v.21a1.7 1.7 0 0 0 1.02 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.55 1.02h.25v2.4h-.25A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}