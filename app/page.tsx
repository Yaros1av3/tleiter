"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  BookOpen,
  Bus,
  Cake,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Clock3,
  FileText,
  Lightbulb,
  ListChecks,
  MapPin,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";
import { useAvailabilityReminder } from "@/lib/useAvailabilityReminder";
import { useTripsReminder } from "@/lib/useTripsReminder";
import { useIdeasUnread } from "@/lib/useIdeasUnread";
import { normalizeServiceTime } from "@/lib/services";
import { getVerseOfTheDay } from "@/lib/verses";
import ReminderDot from "@/components/ReminderDot";
import InstallBanner from "@/components/InstallBanner";
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
  material_id: number | null;
};

type NextTrip = {
  id: number;
  title: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
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
  const reminder = useAvailabilityReminder();
  const tripsReminder = useTripsReminder();
  const ideas = useIdeasUnread();

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

  const [nextTrip, setNextTrip] = useState<NextTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  const isRu = language === "ru";
  const verse = useMemo(() => getVerseOfTheDay(), []);

  useEffect(() => {
    loadDashboard();
    loadNextTrip();
  }, []);

  // Ближайшая поездка (необязательный блок: если таблицы нет — просто не показываем)
  async function loadNextTrip() {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("trips")
      .select("id, title, start_date, end_date, location")
      .in("status", ["planned", "idea"])
      .gte("start_date", todayKey)
      .order("start_date", { ascending: true })
      .limit(1);

    if (error) {
      return;
    }

    setNextTrip((data?.[0] as NextTrip | undefined) ?? null);
  }

  async function loadDashboard() {
    setLoading(true);

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
          "id, schedule_date, service_time, entry_type, title_de, title_ru, bible_text, series, notes, material_id",
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
      console.error(
        "Dashboard schedule:",
        scheduleError,
      );
    }

    if (teamError) {
      console.error("Dashboard team:", teamError);
    }

    if (projectsError) {
      console.error(
        "Dashboard work projects:",
        projectsError,
      );
    }

    if (workItemsError) {
      console.error(
        "Dashboard work items:",
        workItemsError,
      );
    }

    if (teensError) {
      console.error("Dashboard teens:", teensError);
    }

    if (birthdayError) {
      console.error(
        "Dashboard birthday celebrations:",
        birthdayError,
      );
    }

    // старые записи с 13:00 показываем как 12:30
    const entries = (scheduleData ?? []).map((entry) => ({
      ...entry,
      service_time: normalizeServiceTime(entry.service_time),
    })) as ScheduleEntry[];

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
        console.error(
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

    setLoading(false);
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
   * Нажатие на карточку служения — открываем расписание
   * сразу на этой дате (страница сама прокрутит к нужному дню).
   */
  function openService(entry: ScheduleEntry) {
    router.push(`/schedule?date=${entry.schedule_date}`);
  }

  function getProjectProgress(projectId: number) {
    const items = workItems.filter(
      (item) => item.project_id === projectId,
    );

    if (items.length === 0) {
      return 0;
    }

    const done = items.filter(
      (item) => item.status === "completed",
    ).length;

    return Math.round((done / items.length) * 100);
  }

  /*
   * Menü "Mehr".
   *
   * Идеи убраны.
   */
  const moreItems = [
    {
      href: "/work",
      label: isRu ? "Проекты" : "Projekte",
      description: isRu
        ? "Общие проекты команды"
        : "Gemeinsame Projekte",
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
      href: "/teenie-plus",
      label: "Teenie+",
      description: isRu
        ? "Посещаемость и список покупок"
        : "Anwesenheit und Einkaufsliste",
      icon: ListChecks,
    },
    {
      href: "/trips",
      label: isRu ? "Поездки" : "Fahrten & Freizeiten",
      description: isRu
        ? "Голосования и планирование поездок"
        : "Abstimmungen und Planung",
      icon: Bus,
    },
    {
      href: "/availability",
      label: isRu ? "Когда могу служить" : "Wann ich dienen kann",
      description: isRu
        ? "Мои воскресенья и служения"
        : "Meine Sonntage und Gottesdienste",
      icon: CalendarCheck,
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

            <div className="flex shrink-0 items-center gap-2">
            {/* IDEAS */}
            <button
              type="button"
              onClick={() => router.push("/ideas")}
              aria-label={isRu ? "Идеи" : "Ideen"}
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
                ideas.unread
                  ? "border-amber-400 bg-amber-300 text-[#111820] shadow-[0_0_0_4px_rgba(252,211,77,0.35)]"
                  : "border-[#dfe2e5] bg-white text-[#374353] shadow-[0_2px_8px_rgba(17,24,32,0.05)]"
              }`}
            >
              <Lightbulb
                size={21}
                strokeWidth={2}
                fill={ideas.unread ? "currentColor" : "none"}
              />
            </button>

            {/* MORE */}
            <button
              type="button"
              onClick={() =>
                setMoreOpen((value) => !value)
              }
              aria-label={
                isRu ? "Ещё" : "Mehr"
              }
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border shadow-[0_2px_8px_rgba(17,24,32,0.05)] transition active:scale-95 ${
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

              {(reminder.needed || tripsReminder.needed) && !moreOpen && (
                <ReminderDot className="right-0 top-0" />
              )}
            </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[760px] px-4 pb-28 sm:px-6">
          <InstallBanner isRu={isRu} />

          {/* =====================================================
              NEW IDEA
          ====================================================== */}
          {ideas.unread && (
            <button
              type="button"
              onClick={() => router.push("/ideas")}
              className="mt-4 flex w-full items-center gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-left transition active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-amber-300 text-[#111820]">
                <Lightbulb size={18} fill="currentColor" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-amber-900">
                  {isRu ? "Новая идея" : "Neue Idee"}
                  {ideas.count > 1 ? ` · ${ideas.count}` : ""}
                </span>

                {ideas.latestAuthor && (
                  <span className="block truncate text-[12px] text-amber-800/80">
                    {isRu ? "от" : "von"} {ideas.latestAuthor}
                  </span>
                )}
              </span>

              <ArrowRight size={16} className="shrink-0 text-amber-500" />
            </button>
          )}

          {/* =====================================================
              AVAILABILITY REMINDER
          ====================================================== */}
          {reminder.needed && (
            <button
              type="button"
              onClick={() => router.push("/availability")}
              className="mt-5 flex w-full items-center gap-3 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3.5 text-left transition active:scale-[0.99]"
            >
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-red-500 text-white">
                <CalendarCheck size={19} />
                <ReminderDot className="-right-0.5 -top-0.5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-red-700">
                  {isRu
                    ? "Запиши, когда сможешь служить"
                    : "Trage ein, wann du dienen kannst"}
                </span>

                <span className="block text-[12px] text-red-600/80">
                  {isRu
                    ? `Нужно заполнить на ${reminder.nextMonth.toLocaleDateString("ru-RU", { month: "long" })}`
                    : `Bitte für ${reminder.nextMonth.toLocaleDateString("de-DE", { month: "long" })} ausfüllen`}
                </span>
              </span>

              <ArrowRight size={18} className="shrink-0 text-red-400" />
            </button>
          )}

          {/* =====================================================
              NEXT SERVICE
          ====================================================== */}
          <section className="pt-5">
            <div className="mb-3 flex items-end justify-between gap-4">
              <h1 className="text-[22px] font-bold leading-[1.1] tracking-[-0.04em] text-neutral-950">
                {isRu
                  ? "Ближайшее служение"
                  : "Nächster Dienst"}
              </h1>

              <button
                type="button"
                onClick={() =>
                  router.push("/schedule")
                }
                className="shrink-0 pb-0.5 text-[13px] font-semibold text-neutral-500"
              >
                {t.dashboard.viewAll}
              </button>
            </div>

            {loading ? (
              <div className="h-[130px] animate-pulse rounded-[22px] bg-white" />
            ) : nextServiceEntries.length === 0 ? (
              <div className="rounded-[22px] border border-neutral-200 bg-white px-6 py-8 text-center shadow-[0_4px_18px_rgba(17,24,32,0.04)]">
                <CalendarDays
                  size={26}
                  className="mx-auto text-neutral-300"
                />

                <p className="mt-3 text-[14px] font-medium text-neutral-400">
                  {isRu
                    ? "Ближайших служений пока нет"
                    : "Keine kommenden Dienste"}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
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
                          openService(entry)
                        }
                        className="group w-full overflow-hidden rounded-[22px] border border-neutral-200 bg-white text-left shadow-[0_4px_18px_rgba(17,24,32,0.05)] transition active:scale-[0.995]"
                      >
                        <div className="flex">
                          <div className="flex w-[78px] shrink-0 flex-col items-center justify-center bg-[#111820] px-2 py-3 text-white">
                            <Clock3
                              size={17}
                              strokeWidth={1.7}
                              className="mb-2 text-neutral-400"
                            />

                            <span className="text-[19px] font-bold leading-none tracking-[-0.04em]">
                              {entry.service_time}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1 p-3.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium capitalize text-neutral-400">
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

                                <h2 className="mt-0.5 line-clamp-2 text-[17px] font-bold leading-[1.15] tracking-[-0.03em] text-neutral-950">
                                  {getScheduleTitle(
                                    entry,
                                  )}
                                </h2>
                              </div>

                              <ArrowRight
                                size={18}
                                className="mt-1 shrink-0 text-neutral-300"
                              />
                            </div>

                            {(entry.bible_text ||
                              entry.material_id != null) && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] font-medium text-neutral-500">
                                {entry.bible_text && (
                                  <span className="truncate">
                                    {entry.bible_text}
                                  </span>
                                )}

                                {entry.material_id != null && (
                                  <span className="inline-flex items-center gap-1 text-[#111820]">
                                    <FileText size={12} />
                                    {isRu
                                      ? "Материал"
                                      : "Material"}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {members.length > 0 ? (
                                members.map(
                                  (member) => (
                                    <span
                                      key={
                                        member.id
                                      }
                                      className="rounded-full bg-[#f1f2f3] px-3 py-1.5 leading-none"
                                    >
                                      <span className="text-[15px] font-bold text-[#111820]">
                                        {
                                          member.first_name
                                        }
                                      </span>{" "}
                                      <span className="text-[12px] font-medium text-neutral-500">
                                        {
                                          member.last_name
                                        }
                                      </span>
                                    </span>
                                  ),
                                )
                              ) : (
                                <span className="text-[12px] text-neutral-400">
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
              VERSE OF THE DAY
          ====================================================== */}
          <section className="mt-3">
            <div className="rounded-[20px] border border-neutral-200 bg-white px-4 py-3.5 shadow-[0_2px_10px_rgba(17,24,32,0.03)]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#111820] text-white">
                  <BookOpen size={14} />
                </span>

                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                  {isRu
                    ? "Слово на сегодня"
                    : "Wort für heute"}
                </p>
              </div>

              <p className="mt-2.5 text-[15px] font-medium leading-[1.5] text-[#1a232d]">
                «{isRu ? verse.ru : verse.de}»
              </p>

              <p className="mt-2 text-[12px] font-bold text-neutral-500">
                {isRu ? verse.ref.ru : verse.ref.de}
                <span className="font-medium text-neutral-300">
                  {" · "}
                  {isRu
                    ? "Синодальный перевод"
                    : "Lutherbibel 1912"}
                </span>
              </p>
            </div>
          </section>

          {/* =====================================================
              TEEN BIRTHDAYS
          ====================================================== */}
          {!loading && upcomingBirthdays.length > 0 && (
            <section className="mt-4">
              <div className="overflow-hidden rounded-[20px] border border-neutral-200 bg-white shadow-[0_4px_18px_rgba(17,24,32,0.04)]">
                <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-3.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#111820] text-white">
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
                        className="flex items-center gap-3 px-3.5 py-2.5"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
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
                className="flex w-full items-center justify-between rounded-[20px] border border-neutral-200 bg-white px-3.5 py-2.5 text-left shadow-[0_2px_10px_rgba(17,24,32,0.03)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-neutral-100 text-neutral-600">
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
              NEXT TRIP
          ====================================================== */}
          {nextTrip && (
            <section className="mt-3">
              <button
                type="button"
                onClick={() => router.push("/trips")}
                className="flex w-full items-center gap-3 rounded-[20px] border border-neutral-200 bg-white px-3.5 py-2.5 text-left shadow-[0_2px_10px_rgba(17,24,32,0.03)] transition active:scale-[0.99]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#111820] text-white">
                  <Bus size={17} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                    {isRu
                      ? "Ближайшая поездка"
                      : "Nächste Fahrt"}
                  </span>

                  <span className="block truncate text-[14px] font-bold text-[#111820]">
                    {nextTrip.title}
                  </span>

                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
                    <span>
                      {formatProjectPeriod(
                        nextTrip.start_date,
                        nextTrip.end_date,
                        language,
                      )}
                    </span>

                    {nextTrip.location && (
                      <span className="inline-flex min-w-0 items-center gap-0.5 truncate">
                        <MapPin size={11} />
                        {nextTrip.location}
                      </span>
                    )}
                  </span>
                </span>

                <ArrowRight
                  size={16}
                  className="shrink-0 text-neutral-300"
                />
              </button>
            </section>
          )}

          {/* =====================================================
              CURRENT WORK
          ====================================================== */}
          <section className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-4">
              <h2 className="text-[19px] font-bold tracking-[-0.04em] text-neutral-950">
                {isRu
                  ? "Текущие проекты"
                  : "Aktuelle Projekte"}
              </h2>

              <button
                type="button"
                onClick={() => router.push("/work")}
                className="shrink-0 text-[13px] font-semibold text-neutral-500"
              >
                {t.dashboard.viewAll}
              </button>
            </div>

            {loading ? (
              <div className="h-[90px] animate-pulse rounded-[20px] bg-white" />
            ) : workProjects.length === 0 ? (
              <button
                type="button"
                onClick={() => router.push("/work")}
                className="w-full rounded-[20px] border border-neutral-200 bg-white px-4 py-4 text-left text-[13px] font-medium text-neutral-400 shadow-[0_2px_10px_rgba(17,24,32,0.03)]"
              >
                {isRu
                  ? "Пока нет текущих проектов"
                  : "Noch keine aktuellen Projekte"}
              </button>
            ) : (
              <div className="divide-y divide-neutral-100 overflow-hidden rounded-[20px] border border-neutral-200 bg-white shadow-[0_2px_10px_rgba(17,24,32,0.03)]">
                {workProjects
                  .slice(0, 5)
                  .map((project) => {
                    const progress =
                      getProjectProgress(project.id);

                    return (
                      <button
                        type="button"
                        key={project.id}
                        onClick={() =>
                          router.push(
                            `/work/${project.id}`,
                          )
                        }
                        className="block w-full px-3.5 py-3 text-left transition active:bg-neutral-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#111820]">
                            {project.title}
                          </span>

                          <span className="shrink-0 text-[13px] font-bold tabular-nums text-neutral-700">
                            {progress}%
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-[#111820] transition-all"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </section>

          {/* =====================================================
              CALENDAR PREVIEW
          ====================================================== */}
          <section className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[19px] font-bold tracking-[-0.045em] text-neutral-950">
                  {t.navigation.calendar}
                </h2>

                <p className="mt-0.5 text-[12px] text-neutral-500">
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

            <div className="overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-[0_4px_18px_rgba(17,24,32,0.04)]">
              <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-neutral-100 text-neutral-700">
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
                <div className="px-5 py-6 text-center text-sm text-neutral-400">
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
                          className={`min-h-[92px] rounded-[17px] p-3 text-left transition active:scale-[0.98] ${
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

                          <p className="mt-2 text-[22px] font-bold leading-none tracking-[-0.04em]">
                            {new Date(
                              `${date}T00:00:00`,
                            ).getDate()}
                          </p>

                          <div className="mt-2.5 flex flex-wrap gap-1">
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

              <div className="grid max-h-[70vh] grid-cols-1 gap-2 overflow-y-auto p-3">
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
                      className="flex min-h-[68px] items-center gap-3 rounded-[18px] bg-[#f6f7f7] px-4 py-3 text-left transition active:scale-[0.98]"
                    >
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white text-[#303b48] shadow-sm">
                        <Icon size={19} />

                        {item.href === "/availability" && reminder.needed && (
                          <ReminderDot className="-right-0.5 -top-0.5" />
                        )}

                        {item.href === "/trips" && tripsReminder.needed && (
                          <ReminderDot className="-right-0.5 -top-0.5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-[15px] font-semibold leading-tight text-[#202a35]">
                          {item.label}
                        </p>

                        <p className="mt-0.5 break-words text-[11px] leading-snug text-[#8a939d]">
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