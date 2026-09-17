"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  translations,
  type Language,
} from "@/lib/translations";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  deadline: string | null;
  goal_id: number | null;
};

type Goal = {
  id: number;
  title: string;
};

export default function DeadlinesPage() {
  const [language, setLanguage] =
    useState<Language>("ru");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const t = translations[language];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [
      { data: tasksData, error: tasksError },
      { data: goalsData },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .not("deadline", "is", null)
        .order("deadline", { ascending: true }),

      supabase
        .from("goals")
        .select("id, title"),
    ]);

    if (tasksError) {
      console.error(
        "Error loading deadlines:",
        tasksError
      );
      setTasks([]);
    } else {
      setTasks(tasksData ?? []);
    }

    setGoals(goalsData ?? []);
    setLoading(false);
  }

  function getGoalTitle(goalId: number | null) {
    if (!goalId) return null;

    return (
      goals.find((goal) => goal.id === goalId)?.title ??
      null
    );
  }

  function formatDate(date: string) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      language === "de" ? "de-DE" : "ru-RU",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function getDaysDifference(date: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(
      `${date}T00:00:00`
    );
    deadline.setHours(0, 0, 0, 0);

    return Math.ceil(
      (deadline.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  function getDeadlineLabel(date: string) {
    const days = getDaysDifference(date);

    if (days < 0) {
      return language === "de"
        ? `Überfällig um ${Math.abs(days)} ${
            Math.abs(days) === 1 ? "Tag" : "Tage"
          }`
        : `Просрочено на ${Math.abs(days)} дн.`;
    }

    if (days === 0) {
      return language === "de"
        ? "Heute"
        : "Сегодня";
    }

    if (days === 1) {
      return language === "de"
        ? "Morgen"
        : "Завтра";
    }

    return language === "de"
      ? `In ${days} Tagen`
      : `Через ${days} дн.`;
  }

  function getDeadlineStyle(date: string) {
    const days = getDaysDifference(date);

    if (days < 0) {
      return {
        container:
          "border-neutral-300 bg-neutral-100",
        text: "text-neutral-900",
        icon: (
          <CircleAlert
            size={17}
            strokeWidth={1.8}
          />
        ),
      };
    }

    if (days <= 3) {
      return {
        container:
          "border-neutral-300 bg-neutral-50",
        text: "text-neutral-800",
        icon: (
          <CalendarClock
            size={17}
            strokeWidth={1.8}
          />
        ),
      };
    }

    return {
      container:
        "border-neutral-200 bg-white",
      text: "text-neutral-600",
      icon: (
        <CalendarClock
          size={17}
          strokeWidth={1.8}
        />
      ),
    };
  }

  function getPriorityLabel(
    priority: Task["priority"]
  ) {
    if (priority === "high") {
      return t.priority.high;
    }

    if (priority === "low") {
      return t.priority.low;
    }

    return t.priority.medium;
  }

  function getStatusLabel(
    status: Task["status"]
  ) {
    if (status === "done") {
      return language === "de"
        ? "Erledigt"
        : "Выполнено";
    }

    if (status === "in_progress") {
      return language === "de"
        ? "In Arbeit"
        : "В работе";
    }

    return language === "de"
      ? "Offen"
      : "Открыта";
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
          <section className="pb-10 pt-10 sm:pb-14 sm:pt-14 lg:pt-16">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white">
                <CalendarClock
                  size={21}
                  strokeWidth={1.8}
                />
              </div>

              <div className="min-w-0">
                <h1 className="text-4xl font-bold tracking-[-0.04em] text-neutral-950 sm:text-5xl">
                  {t.navigation.deadlines}
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500 sm:text-base">
                  {language === "de"
                    ? "Behalte alle wichtigen Fristen und Termine im Blick."
                    : "Все важные сроки и дедлайны команды в одном месте."}
                </p>
              </div>
            </div>
          </section>

          {/* Loading */}
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
              <p className="text-sm text-neutral-400">
                {t.common.loading}
              </p>
            </div>
          ) : tasks.length === 0 ? (
            /* Empty state */
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-5 text-center sm:px-6">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                <CalendarClock
                  size={24}
                  strokeWidth={1.7}
                />
              </div>

              <h2 className="text-base font-semibold text-neutral-900">
                {language === "de"
                  ? "Keine Fristen"
                  : "Пока нет сроков"}
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                {language === "de"
                  ? "Aufgaben mit einem gesetzten Datum erscheinen hier."
                  : "Задачи с установленным дедлайном будут отображаться здесь."}
              </p>
            </div>
          ) : (
            /* Deadlines */
            <div className="space-y-3">
              {tasks.map((task) => {
                if (!task.deadline) {
                  return null;
                }

                const deadlineStyle =
                  getDeadlineStyle(task.deadline);

                const goalTitle =
                  getGoalTitle(task.goal_id);

                return (
                  <button
                    key={task.id}
                    onClick={() =>
                      (window.location.href = `/tasks?task=${task.id}`)
                    }
                    className={`group w-full rounded-2xl border p-4 text-left transition hover:border-neutral-300 hover:shadow-sm sm:p-5 ${deadlineStyle.container}`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left */}
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 shrink-0 ${deadlineStyle.text}`}
                          >
                            {task.status === "done" ? (
                              <CheckCircle2
                                size={18}
                                strokeWidth={1.8}
                              />
                            ) : (
                              deadlineStyle.icon
                            )}
                          </div>

                          <div className="min-w-0">
                            <h2
                              className={`truncate text-sm font-semibold ${
                                task.status === "done"
                                  ? "text-neutral-400 line-through"
                                  : "text-neutral-900"
                              }`}
                            >
                              {task.title}
                            </h2>

                            {task.description && (
                              <p className="mt-1 line-clamp-2 text-sm leading-5 text-neutral-500">
                                {task.description}
                              </p>
                            )}

                            {goalTitle && (
                              <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400">
                                {goalTitle}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex shrink-0 items-center gap-4 pl-8 sm:pl-0">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-neutral-800">
                            {formatDate(
                              task.deadline
                            )}
                          </div>

                          <div
                            className={`mt-1 text-xs font-medium ${deadlineStyle.text}`}
                          >
                            {task.status === "done"
                              ? getStatusLabel(
                                  task.status
                                )
                              : getDeadlineLabel(
                                  task.deadline
                                )}
                          </div>
                        </div>

                        <div className="hidden h-8 w-px bg-neutral-200 sm:block" />

                        <div className="text-right">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                            {language === "de"
                              ? "Priorität"
                              : "Приоритет"}
                          </div>

                          <div className="mt-1 text-xs font-medium text-neutral-600">
                            {getPriorityLabel(
                              task.priority
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}