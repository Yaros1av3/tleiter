"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Lightbulb,
  ListTodo,
  Target,
  Users,
  BookOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { translations, type Language } from "@/lib/translations";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

type Goal = {
  id: number;
  title: string;
  status: "active" | "completed" | "archived";
  priority: "low" | "medium" | "high";
  deadline: string | null;
};

type Task = {
  id: number;
  title: string;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  deadline: string | null;
  goal_id: number | null;
};

type Idea = {
  id: number;
  title: string;
  description: string | null;
  status: "new" | "in_progress" | "converted";
  created_at: string;
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

export default function Home() {
  const router = useRouter();

  const [language, setLanguage] =
    useState<Language>("ru");

  const [goals, setGoals] =
    useState<Goal[]>([]);

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [ideas, setIdeas] =
    useState<Idea[]>([]);

  const [scheduleEntries, setScheduleEntries] =
    useState<ScheduleEntry[]>([]);

  const [teamMembers, setTeamMembers] =
    useState<TeamMember[]>([]);

  const [scheduleMembers, setScheduleMembers] =
    useState<ScheduleMember[]>([]);

  const [loading, setLoading] =
    useState(true);

  const t = translations[language];

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const [
      { data: goalsData, error: goalsError },
      { data: tasksData, error: tasksError },
      { data: ideasData, error: ideasError },
      { data: scheduleData, error: scheduleError },
      { data: teamData, error: teamError },
    ] = await Promise.all([
      supabase
        .from("goals")
        .select(
          "id, title, status, priority, deadline"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("tasks")
        .select(
          "id, title, status, priority, deadline, goal_id"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("ideas")
        .select(
          "id, title, description, status, created_at"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("schedule_entries")
        .select(
          "id, schedule_date, service_time, entry_type, title_de, title_ru, bible_text, series, notes"
        )
        .order("schedule_date", {
          ascending: true,
        })
        .order("service_time", {
          ascending: true,
        }),

      supabase
        .from("team_members")
        .select(
          "id, first_name, last_name, position, status"
        )
        .eq("status", "active")
        .order("last_name", {
          ascending: true,
        }),
    ]);

    if (goalsError) {
      console.error(
        "Error loading dashboard goals:",
        goalsError
      );
    }

    if (tasksError) {
      console.error(
        "Error loading dashboard tasks:",
        tasksError
      );
    }

    if (ideasError) {
      console.error(
        "Error loading dashboard ideas:",
        ideasError
      );
    }

    if (scheduleError) {
      console.error(
        "Error loading dashboard schedule:",
        scheduleError
      );
    }

    if (teamError) {
      console.error(
        "Error loading dashboard team:",
        teamError
      );
    }

    const entries = scheduleData ?? [];

    let scheduleMemberData: ScheduleMember[] = [];

    if (entries.length > 0) {
      const { data, error } =
        await supabase
          .from("schedule_entry_members")
          .select(
            "schedule_entry_id, team_member_id"
          )
          .in(
            "schedule_entry_id",
            entries.map(
              (entry) => entry.id
            )
          );

      if (error) {
        console.error(
          "Error loading schedule members:",
          error
        );
      }

      scheduleMemberData = data ?? [];
    }

    setGoals(goalsData ?? []);
    setTasks(tasksData ?? []);
    setIdeas(ideasData ?? []);
    setScheduleEntries(entries);
    setTeamMembers(teamData ?? []);
    setScheduleMembers(
      scheduleMemberData
    );

    setLoading(false);
  }

  const activeGoals = goals.filter(
    (goal) =>
      goal.status === "active"
  ).length;

  const completedGoals = goals.filter(
    (goal) =>
      goal.status === "completed"
  ).length;

  const openTasks = tasks.filter(
    (task) =>
      task.status !== "completed"
  ).length;

  const overdueTasks = tasks.filter(
    (task) => {
      if (
        !task.deadline ||
        task.status === "completed"
      ) {
        return false;
      }

      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const deadline = new Date(
        `${task.deadline}T00:00:00`
      );

      return deadline < today;
    }
  ).length;

  const upcomingTasks = tasks
    .filter(
      (task) =>
        task.deadline &&
        task.status !== "completed"
    )
    .sort((a, b) => {
      if (
        !a.deadline ||
        !b.deadline
      ) {
        return 0;
      }

      return a.deadline.localeCompare(
        b.deadline
      );
    })
    .slice(0, 4);

  const recentIdeas =
    ideas.slice(0, 4);

  const todayString =
    new Date()
      .toLocaleDateString(
        "en-CA"
      );

  const upcomingSchedule =
    useMemo(() => {
      return scheduleEntries
        .filter(
          (entry) =>
            entry.schedule_date >=
            todayString
        )
        .slice(0, 3);
    }, [
      scheduleEntries,
      todayString,
    ]);

  const nextSchedule =
    upcomingSchedule[0] ??
    null;

  function getScheduleMembers(
    entryId: number
  ) {
    const memberIds =
      scheduleMembers
        .filter(
          (item) =>
            item.schedule_entry_id ===
            entryId
        )
        .map(
          (item) =>
            item.team_member_id
        );

    return teamMembers.filter(
      (member) =>
        memberIds.includes(
          member.id
        )
    );
  }

  function getScheduleTitle(
    entry: ScheduleEntry
  ) {
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

  function formatDate(
    date: string
  ) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      language === "de"
        ? "de-DE"
        : "ru-RU",
      {
        day: "2-digit",
        month: "short",
      }
    );
  }

  function formatScheduleDate(
    date: string
  ) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      language === "de"
        ? "de-DE"
        : "ru-RU",
      {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }
    );
  }

  function getDaysDifference(
    date: string
  ) {
    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const deadline =
      new Date(
        `${date}T00:00:00`
      );

    deadline.setHours(
      0,
      0,
      0,
      0
    );

    return Math.ceil(
      (deadline.getTime() -
        today.getTime()) /
        (1000 *
          60 *
          60 *
          24)
    );
  }

  function getDeadlineText(
    date: string
  ) {
    const days =
      getDaysDifference(date);

    if (days < 0) {
      return t.dashboard.overdue;
    }

    if (days === 0) {
      return t.dashboard.today;
    }

    if (days === 1) {
      return t.dashboard.tomorrow;
    }

    return `${days} ${t.dashboard.daysLeft}`;
  }

  function getDeadlineColor(
    date: string
  ) {
    const days =
      getDaysDifference(date);

    if (days < 0) {
      return {
        text: "text-red-600",
        dot: "bg-red-500",
      };
    }

    if (days <= 2) {
      return {
        text: "text-amber-600",
        dot: "bg-amber-500",
      };
    }

    return {
      text: "text-neutral-500",
      dot: "bg-neutral-300",
    };
  }

  function statCard(
    icon: React.ReactNode,
    label: string,
    value: number,
    onClick: () => void,
    accent:
      | "green"
      | "red"
      | "amber"
      | "neutral"
  ) {
    const accentStyles = {
      green: {
        icon: "bg-emerald-50 text-emerald-600",
        value: "text-emerald-700",
      },
      red: {
        icon: "bg-red-50 text-red-600",
        value: "text-red-700",
      },
      amber: {
        icon: "bg-amber-50 text-amber-600",
        value: "text-amber-700",
      },
      neutral: {
        icon: "bg-neutral-100 text-neutral-600",
        value: "text-neutral-950",
      },
    };

    const style =
      accentStyles[accent];

    return (
      <button
        type="button"
        onClick={onClick}
        className="group flex min-h-[92px] items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-left transition hover:border-neutral-300 hover:shadow-sm sm:min-h-[100px] sm:px-4"
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.icon}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={`text-2xl font-semibold leading-none tracking-tight sm:text-3xl ${style.value}`}
          >
            {value}
          </div>

          <div className="mt-1.5 truncate text-[11px] leading-4 text-neutral-500 sm:text-xs">
            {label}
          </div>
        </div>

        <ArrowRight
          size={14}
          strokeWidth={1.8}
          className="shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-700"
        />
      </button>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-neutral-100 text-neutral-900">
      <Sidebar
        language={language}
      />

      <div className="ml-[72px] min-h-screen min-w-0">
        <Header
          language={language}
          setLanguage={setLanguage}
        />

        <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
          {/* Hero */}
          <section className="pb-7 pt-8 sm:pb-9 sm:pt-12 lg:pt-14">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400 sm:text-[10px]">
              {t.common.teamWorkspace}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-4xl font-bold leading-[0.95] tracking-[-0.06em] text-neutral-950 sm:text-5xl lg:text-6xl">
                  {t.dashboard.title}
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500 sm:mt-4 sm:text-base">
                  {t.dashboard.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/calendar"
                  )
                }
                className="inline-flex h-9 w-fit items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
              >
                <CalendarDays
                  size={15}
                  strokeWidth={1.8}
                />

                {language === "ru"
                  ? "Календарь"
                  : "Kalender"}

                <ArrowRight
                  size={13}
                  strokeWidth={1.8}
                />
              </button>
            </div>
          </section>

          {/* Overview */}
          <section>
            <div className="mb-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
                  {t.dashboard.overview}
                </h2>

                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-400">
                  {language === "ru"
                    ? "Обзор"
                    : "Übersicht"}
                </span>
              </div>

              <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
                {
                  t.dashboard
                    .overviewDescription
                }
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-neutral-200 bg-white">
                <p className="text-sm text-neutral-400">
                  {t.common.loading}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                {statCard(
                  <Target
                    size={16}
                    strokeWidth={1.8}
                  />,
                  t.dashboard
                    .activeGoals,
                  activeGoals,
                  () =>
                    router.push(
                      "/goals"
                    ),
                  "neutral"
                )}

                {statCard(
                  <CheckCircle2
                    size={16}
                    strokeWidth={1.8}
                  />,
                  t.dashboard
                    .completedGoals,
                  completedGoals,
                  () =>
                    router.push(
                      "/goals"
                    ),
                  "green"
                )}

                {statCard(
                  <ListTodo
                    size={16}
                    strokeWidth={1.8}
                  />,
                  t.dashboard
                    .openTasks,
                  openTasks,
                  () =>
                    router.push(
                      "/tasks"
                    ),
                  "neutral"
                )}

                {statCard(
                  <CircleAlert
                    size={16}
                    strokeWidth={1.8}
                  />,
                  t.dashboard
                    .overdueTasks,
                  overdueTasks,
                  () =>
                    router.push(
                      "/deadlines"
                    ),
                  overdueTasks >
                    0
                    ? "red"
                    : "green"
                )}

                {statCard(
                  <Lightbulb
                    size={16}
                    strokeWidth={1.8}
                  />,
                  t.dashboard
                    .ideas,
                  ideas.length,
                  () =>
                    router.push(
                      "/ideas"
                    ),
                  "amber"
                )}
              </div>
            )}
          </section>

          {/* Next service */}
          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
                  {language === "ru"
                    ? "Ближайшее служение"
                    : "Nächster Dienst"}
                </h2>

                <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
                  {language === "ru"
                    ? "Что происходит дальше"
                    : "Was als Nächstes ansteht"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/schedule"
                  )
                }
                className="text-xs font-semibold text-neutral-400 transition hover:text-neutral-900"
              >
                {t.dashboard.viewAll}
              </button>
            </div>

            {loading ? (
              <div className="h-[150px] animate-pulse rounded-2xl border border-neutral-200 bg-white" />
            ) : !nextSchedule ? (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center">
                <CalendarDays
                  size={22}
                  strokeWidth={1.7}
                  className="mx-auto text-neutral-300"
                />

                <p className="mt-2 text-sm text-neutral-400">
                  {language === "ru"
                    ? "Ближайших служений пока нет"
                    : "Keine kommenden Dienste"}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/schedule"
                  )
                }
                className="group w-full rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 hover:shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-900 text-white">
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-300">
                        {new Date(
                          `${nextSchedule.schedule_date}T00:00:00`
                        ).toLocaleDateString(
                          language ===
                            "de"
                            ? "de-DE"
                            : "ru-RU",
                          {
                            month:
                              "short",
                          }
                        )}
                      </span>

                      <span className="text-base font-semibold leading-none">
                        {new Date(
                          `${nextSchedule.schedule_date}T00:00:00`
                        ).getDate()}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600">
                          <Clock3
                            size={11}
                            strokeWidth={1.8}
                          />

                          {
                            nextSchedule.service_time
                          }
                        </span>

                        <span className="text-xs text-neutral-400">
                          {formatScheduleDate(
                            nextSchedule.schedule_date
                          )}
                        </span>
                      </div>

                      <h3 className="mt-2 truncate text-sm font-semibold text-neutral-900 sm:text-base">
                        {getScheduleTitle(
                          nextSchedule
                        )}
                      </h3>

                      {nextSchedule.bible_text && (
                        <p className="mt-1 truncate text-xs text-neutral-400">
                          {
                            nextSchedule.bible_text
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-3 sm:min-w-[260px] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                    <div className="min-w-0">
                      <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                        {language ===
                        "ru"
                          ? "Служители"
                          : "Mitarbeiter"}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {getScheduleMembers(
                          nextSchedule.id
                        )
                          .slice(0, 3)
                          .map(
                            (
                              member
                            ) => (
                              <span
                                key={
                                  member.id
                                }
                                className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-medium text-neutral-600"
                              >
                                {
                                  member.first_name
                                }{" "}
                                {
                                  member.last_name
                                }
                              </span>
                            )
                          )}

                        {getScheduleMembers(
                          nextSchedule.id
                        ).length ===
                          0 && (
                          <span className="text-xs text-neutral-400">
                            {language ===
                            "ru"
                              ? "Не назначены"
                              : "Nicht zugewiesen"}
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowRight
                      size={16}
                      strokeWidth={1.8}
                      className="shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-800"
                    />
                  </div>
                </div>
              </button>
            )}
          </section>

          {/* Upcoming + ideas */}
          <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Upcoming deadlines */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarClock
                      size={17}
                      strokeWidth={1.8}
                      className="text-neutral-500"
                    />

                    <h2 className="text-sm font-semibold text-neutral-950 sm:text-base">
                      {
                        t.dashboard
                          .upcomingDeadlines
                      }
                    </h2>
                  </div>

                  <p className="mt-1 text-xs text-neutral-400">
                    {language === "ru"
                      ? "Ближайшие задачи"
                      : "Nächste Aufgaben"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/deadlines"
                    )
                  }
                  className="text-xs font-semibold text-neutral-400 transition hover:text-neutral-900"
                >
                  {
                    t.dashboard
                      .viewAll
                  }
                </button>
              </div>

              <div className="mt-4">
                {upcomingTasks.length ===
                0 ? (
                  <div className="rounded-xl bg-neutral-50 px-4 py-7 text-center">
                    <CheckCircle2
                      size={20}
                      strokeWidth={1.7}
                      className="mx-auto text-emerald-500"
                    />

                    <p className="mt-2 text-xs text-neutral-400">
                      {
                        t.dashboard
                          .noDeadlines
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {upcomingTasks.map(
                      (task) => {
                        const deadlineColor =
                          getDeadlineColor(
                            task.deadline!
                          );

                        return (
                          <button
                            type="button"
                            key={
                              task.id
                            }
                            onClick={() =>
                              router.push(
                                `/tasks?task=${task.id}`
                              )
                            }
                            className="group flex w-full items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 text-left transition hover:bg-neutral-100 sm:px-3.5"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${deadlineColor.dot}`}
                              />

                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-neutral-800 sm:text-sm">
                                  {
                                    task.title
                                  }
                                </p>

                                <p className="mt-0.5 text-[10px] text-neutral-400 sm:text-xs">
                                  {formatDate(
                                    task.deadline!
                                  )}
                                </p>
                              </div>
                            </div>

                            <div
                              className={`shrink-0 text-[10px] font-semibold sm:text-xs ${deadlineColor.text}`}
                            >
                              {getDeadlineText(
                                task.deadline!
                              )}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recent ideas */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Lightbulb
                      size={17}
                      strokeWidth={1.8}
                      className="text-amber-500"
                    />

                    <h2 className="text-sm font-semibold text-neutral-950 sm:text-base">
                      {
                        t.dashboard
                          .recentIdeas
                      }
                    </h2>
                  </div>

                  <p className="mt-1 text-xs text-neutral-400">
                    {language === "ru"
                      ? "Последние идеи команды"
                      : "Letzte Ideen des Teams"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/ideas"
                    )
                  }
                  className="text-xs font-semibold text-neutral-400 transition hover:text-neutral-900"
                >
                  {
                    t.dashboard
                      .viewAll
                  }
                </button>
              </div>

              <div className="mt-4">
                {recentIdeas.length ===
                0 ? (
                  <div className="rounded-xl bg-neutral-50 px-4 py-7 text-center">
                    <Lightbulb
                      size={20}
                      strokeWidth={1.7}
                      className="mx-auto text-amber-400"
                    />

                    <p className="mt-2 text-xs text-neutral-400">
                      {
                        t.dashboard
                          .noIdeas
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {recentIdeas.map(
                      (idea) => (
                        <button
                          type="button"
                          key={
                            idea.id
                          }
                          onClick={() =>
                            router.push(
                              "/ideas"
                            )
                          }
                          className="group flex w-full items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 text-left transition hover:bg-neutral-100 sm:px-3.5"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />

                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-neutral-800 sm:text-sm">
                                {
                                  idea.title
                                }
                              </p>

                              {idea.description && (
                                <p className="mt-0.5 truncate text-[10px] text-neutral-400 sm:text-xs">
                                  {
                                    idea.description
                                  }
                                </p>
                              )}
                            </div>
                          </div>

                          <ArrowRight
                            size={14}
                            strokeWidth={
                              1.8
                            }
                            className="shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-700"
                          />
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Team snapshot */}
          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
                  {language === "ru"
                    ? "Команда"
                    : "Team"}
                </h2>

                <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
                  {language === "ru"
                    ? "Текущий состав служителей"
                    : "Aktuelle Teamübersicht"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/team"
                  )
                }
                className="text-xs font-semibold text-neutral-400 transition hover:text-neutral-900"
              >
                {t.dashboard.viewAll}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/team"
                  )
                }
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-3.5 text-left transition hover:border-neutral-300 hover:shadow-sm"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                  <Users
                    size={16}
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <div className="text-lg font-semibold leading-none text-neutral-950">
                    {
                      teamMembers.length
                    }
                  </div>

                  <div className="mt-1 text-[10px] text-neutral-400">
                    {language ===
                    "ru"
                      ? "Активных"
                      : "Aktiv"}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/schedule"
                  )
                }
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-3.5 text-left transition hover:border-neutral-300 hover:shadow-sm"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                  <CalendarDays
                    size={16}
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <div className="text-lg font-semibold leading-none text-neutral-950">
                    {
                      upcomingSchedule.length
                    }
                  </div>

                  <div className="mt-1 text-[10px] text-neutral-400">
                    {language ===
                    "ru"
                      ? "Ближайших"
                      : "Kommende"}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/materials"
                  )
                }
                className="col-span-2 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-3.5 text-left transition hover:border-neutral-300 hover:shadow-sm sm:col-span-1"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                  <BookOpen
                    size={16}
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <div className="text-sm font-semibold leading-none text-neutral-950">
                    {language ===
                    "ru"
                      ? "Материалы"
                      : "Materialien"}
                  </div>

                  <div className="mt-1 text-[10px] text-neutral-400">
                    {language ===
                    "ru"
                      ? "Открыть библиотеку"
                      : "Bibliothek öffnen"}
                  </div>
                </div>

                <ArrowRight
                  size={14}
                  strokeWidth={1.8}
                  className="ml-auto text-neutral-300"
                />
              </button>
            </div>
          </section>

          {/* Quick actions */}
          <section className="mt-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-neutral-950">
                {
                  t.dashboard
                    .quickActions
                }
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/goals"
                  )
                }
                className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5 text-left transition hover:border-neutral-300 hover:shadow-sm sm:p-4"
              >
                <div>
                  <div className="text-xs font-semibold text-neutral-900 sm:text-sm">
                    {
                      t.dashboard
                        .newGoal
                    }
                  </div>

                  <div className="mt-1 text-[10px] text-neutral-400 sm:text-xs">
                    {
                      t.goals
                        .title
                    }
                  </div>
                </div>

                <ArrowRight
                  size={15}
                  strokeWidth={1.8}
                  className="text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-800"
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/tasks"
                  )
                }
                className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5 text-left transition hover:border-neutral-300 hover:shadow-sm sm:p-4"
              >
                <div>
                  <div className="text-xs font-semibold text-neutral-900 sm:text-sm">
                    {
                      t.dashboard
                        .viewTasks
                    }
                  </div>

                  <div className="mt-1 text-[10px] text-neutral-400 sm:text-xs">
                    {
                      t.navigation
                        .tasks
                    }
                  </div>
                </div>

                <ArrowRight
                  size={15}
                  strokeWidth={1.8}
                  className="text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-800"
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/ideas"
                  )
                }
                className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5 text-left transition hover:border-neutral-300 hover:shadow-sm sm:p-4"
              >
                <div>
                  <div className="text-xs font-semibold text-neutral-900 sm:text-sm">
                    {
                      t.dashboard
                        .viewIdeas
                    }
                  </div>

                  <div className="mt-1 text-[10px] text-neutral-400 sm:text-xs">
                    {
                      t.navigation
                        .ideas
                    }
                  </div>
                </div>

                <ArrowRight
                  size={15}
                  strokeWidth={1.8}
                  className="text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-800"
                />
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}