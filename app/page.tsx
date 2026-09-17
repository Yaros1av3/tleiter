"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Lightbulb,
  ListTodo,
  Target,
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
  status: "todo" | "in_progress" | "done";
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

export default function Home() {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>("ru");

  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);

  const [loading, setLoading] = useState(true);

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
    ] = await Promise.all([
      supabase
        .from("goals")
        .select("id, title, status, priority, deadline")
        .order("created_at", { ascending: false }),

      supabase
        .from("tasks")
        .select("id, title, status, priority, deadline, goal_id")
        .order("created_at", { ascending: false }),

      supabase
        .from("ideas")
        .select("id, title, description, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (goalsError) {
      console.error("Error loading dashboard goals:", goalsError);
    }

    if (tasksError) {
      console.error("Error loading dashboard tasks:", tasksError);
    }

    if (ideasError) {
      console.error("Error loading dashboard ideas:", ideasError);
    }

    setGoals(goalsData ?? []);
    setTasks(tasksData ?? []);
    setIdeas(ideasData ?? []);

    setLoading(false);
  }

  const activeGoals = goals.filter(
    (goal) => goal.status === "active"
  ).length;

  const completedGoals = goals.filter(
    (goal) => goal.status === "completed"
  ).length;

  const openTasks = tasks.filter(
    (task) => task.status !== "done"
  ).length;

  const overdueTasks = tasks.filter((task) => {
    if (!task.deadline || task.status === "done") {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(`${task.deadline}T00:00:00`);

    return deadline < today;
  }).length;

  const upcomingTasks = tasks
    .filter((task) => task.deadline && task.status !== "done")
    .sort((a, b) => {
      if (!a.deadline || !b.deadline) return 0;
      return a.deadline.localeCompare(b.deadline);
    })
    .slice(0, 4);

  const recentIdeas = ideas.slice(0, 4);

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString(
      language === "de" ? "de-DE" : "ru-RU",
      {
        day: "2-digit",
        month: "short",
      }
    );
  }

  function getDaysDifference(date: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(`${date}T00:00:00`);
    deadline.setHours(0, 0, 0, 0);

    return Math.ceil(
      (deadline.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  function getDeadlineText(date: string) {
    const days = getDaysDifference(date);

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

  function getDeadlineColor(date: string) {
    const days = getDaysDifference(date);

    if (days < 0) {
      return {
        icon: "bg-red-50 text-red-600",
        text: "text-red-600",
        dot: "bg-red-500",
      };
    }

    if (days <= 2) {
      return {
        icon: "bg-amber-50 text-amber-600",
        text: "text-amber-600",
        dot: "bg-amber-500",
      };
    }

    return {
      icon: "bg-neutral-100 text-neutral-500",
      text: "text-neutral-500",
      dot: "bg-neutral-300",
    };
  }

  function statCard(
    icon: React.ReactNode,
    label: string,
    value: number,
    onClick: () => void,
    accent: "green" | "red" | "amber" | "neutral"
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

    const style = accentStyles[accent];

    return (
      <button
        onClick={onClick}
        className="group rounded-2xl border border-neutral-200 bg-white p-5 text-left transition hover:border-neutral-300 hover:shadow-sm"
      >
        <div className="flex items-start justify-between">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.icon}`}
          >
            {icon}
          </div>

          <ArrowRight
            size={16}
            strokeWidth={1.8}
            className="text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-700"
          />
        </div>

        <div className="mt-6">
          <div
            className={`text-3xl font-semibold tracking-tight ${style.value}`}
          >
            {value}
          </div>

          <div className="mt-1 text-sm text-neutral-500">
            {label}
          </div>
        </div>
      </button>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-neutral-100 text-neutral-900">
      <Sidebar language={language} />

      <div className="ml-[72px] min-h-screen min-w-0">
        <Header
          language={language}
          setLanguage={setLanguage}
        />

        <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
          {/* Hero */}
          <section className="pb-8 pt-10 sm:pb-10 sm:pt-14 lg:pt-16">
            <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400 sm:text-[10px] sm:tracking-[0.18em]">
              {t.common.teamWorkspace}
            </p>

            <h1 className="text-5xl font-bold leading-[0.95] tracking-[-0.065em] text-neutral-950 sm:text-6xl lg:text-7xl">
              {t.dashboard.title}
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-500 sm:mt-5 sm:text-base sm:leading-7">
              {t.dashboard.subtitle}
            </p>
          </section>

          {/* Overview */}
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                {t.dashboard.overview}
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                {t.dashboard.overviewDescription}
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
                <p className="text-sm text-neutral-400">
                  {t.common.loading}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {statCard(
                  <Target size={18} strokeWidth={1.8} />,
                  t.dashboard.activeGoals,
                  activeGoals,
                  () => router.push("/goals"),
                  "neutral"
                )}

                {statCard(
                  <CheckCircle2 size={18} strokeWidth={1.8} />,
                  t.dashboard.completedGoals,
                  completedGoals,
                  () => router.push("/goals"),
                  "green"
                )}

                {statCard(
                  <ListTodo size={18} strokeWidth={1.8} />,
                  t.dashboard.openTasks,
                  openTasks,
                  () => router.push("/tasks"),
                  "neutral"
                )}

                {statCard(
                  <CircleAlert size={18} strokeWidth={1.8} />,
                  t.dashboard.overdueTasks,
                  overdueTasks,
                  () => router.push("/deadlines"),
                  overdueTasks > 0 ? "red" : "green"
                )}

                {statCard(
                  <Lightbulb size={18} strokeWidth={1.8} />,
                  t.dashboard.ideas,
                  ideas.length,
                  () => router.push("/ideas"),
                  "amber"
                )}
              </div>
            )}
          </section>

          {/* Main content */}
          <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Upcoming deadlines */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarClock
                      size={18}
                      strokeWidth={1.8}
                      className="text-neutral-500"
                    />

                    <h2 className="text-base font-semibold text-neutral-950">
                      {t.dashboard.upcomingDeadlines}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/deadlines")}
                  className="text-xs font-semibold text-neutral-400 transition hover:text-neutral-900"
                >
                  {t.dashboard.viewAll}
                </button>
              </div>

              <div className="mt-5">
                {upcomingTasks.length === 0 ? (
                  <div className="rounded-xl bg-neutral-50 px-4 py-8 text-center">
                    <p className="text-sm text-neutral-400">
                      {t.dashboard.noDeadlines}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingTasks.map((task) => {
                      const deadlineColor = getDeadlineColor(
                        task.deadline!
                      );

                      return (
                        <button
                          key={task.id}
                          onClick={() =>
                            router.push(
                              `/tasks?task=${task.id}`
                            )
                          }
                          className="group flex w-full items-center justify-between gap-4 rounded-xl bg-neutral-50 px-4 py-3 text-left transition hover:bg-neutral-100"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${deadlineColor.dot}`}
                            />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-neutral-800">
                                {task.title}
                              </p>

                              <p className="mt-1 text-xs text-neutral-400">
                                {formatDate(task.deadline!)}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`shrink-0 text-xs font-semibold ${deadlineColor.text}`}
                          >
                            {getDeadlineText(task.deadline!)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent ideas */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Lightbulb
                      size={18}
                      strokeWidth={1.8}
                      className="text-amber-500"
                    />

                    <h2 className="text-base font-semibold text-neutral-950">
                      {t.dashboard.recentIdeas}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/ideas")}
                  className="text-xs font-semibold text-neutral-400 transition hover:text-neutral-900"
                >
                  {t.dashboard.viewAll}
                </button>
              </div>

              <div className="mt-5">
                {recentIdeas.length === 0 ? (
                  <div className="rounded-xl bg-neutral-50 px-4 py-8 text-center">
                    <p className="text-sm text-neutral-400">
                      {t.dashboard.noIdeas}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentIdeas.map((idea) => (
                      <button
                        key={idea.id}
                        onClick={() => router.push("/ideas")}
                        className="group flex w-full items-center justify-between gap-4 rounded-xl bg-neutral-50 px-4 py-3 text-left transition hover:bg-neutral-100"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-800">
                              {idea.title}
                            </p>

                            {idea.description && (
                              <p className="mt-1 truncate text-xs text-neutral-400">
                                {idea.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <ArrowRight
                          size={15}
                          strokeWidth={1.8}
                          className="shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-700"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-neutral-950">
                {t.dashboard.quickActions}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                onClick={() => router.push("/goals")}
                className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 hover:shadow-sm"
              >
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {t.dashboard.newGoal}
                  </div>

                  <div className="mt-1 text-xs text-neutral-400">
                    {t.goals.title}
                  </div>
                </div>

                <ArrowRight
                  size={17}
                  strokeWidth={1.8}
                  className="text-neutral-300"
                />
              </button>

              <button
                onClick={() => router.push("/tasks")}
                className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 hover:shadow-sm"
              >
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {t.dashboard.viewTasks}
                  </div>

                  <div className="mt-1 text-xs text-neutral-400">
                    {t.navigation.tasks}
                  </div>
                </div>

                <ArrowRight
                  size={17}
                  strokeWidth={1.8}
                  className="text-neutral-300"
                />
              </button>

              <button
                onClick={() => router.push("/ideas")}
                className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 hover:shadow-sm"
              >
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {t.dashboard.viewIdeas}
                  </div>

                  <div className="mt-1 text-xs text-neutral-400">
                    {t.navigation.ideas}
                  </div>
                </div>

                <ArrowRight
                  size={17}
                  strokeWidth={1.8}
                  className="text-neutral-300"
                />
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}