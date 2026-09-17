"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  Filter,
  ListTodo,
  Search,
  Target,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { translations, type Language } from "@/lib/translations";

type Goal = {
  id: number;
  title: string;
};

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  deadline: string | null;
  goal_id: number | null;
  created_at: string;
};

type DeadlineFilter =
  | "all"
  | "overdue"
  | "today"
  | "upcoming"
  | "completed";

const priorityOrder: Record<Task["priority"], number> = {
  high: 1,
  medium: 2,
  low: 3,
};

export default function DeadlinesPage() {
  const [language, setLanguage] = useState<Language>("ru");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [deadlineFilter, setDeadlineFilter] =
    useState<DeadlineFilter>("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] =
    useState<Task["priority"] | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const t = translations[language];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [tasksResult, goalsResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .not("deadline", "is", null)
        .order("deadline", { ascending: true }),

      supabase
        .from("goals")
        .select("id, title")
        .order("created_at", { ascending: false }),
    ]);

    if (tasksResult.error) {
      console.error(
        "Error loading deadlines:",
        tasksResult.error,
      );
      setTasks([]);
    } else {
      setTasks(tasksResult.data ?? []);
    }

    if (goalsResult.error) {
      console.error(
        "Error loading goals:",
        goalsResult.error,
      );
      setGoals([]);
    } else {
      setGoals(goalsResult.data ?? []);
    }

    setLoading(false);
  }

  function getGoalTitle(goalId: number | null) {
    if (!goalId) return null;

    return (
      goals.find((goal) => goal.id === goalId)?.title ??
      null
    );
  }

  function getDaysDifference(date: string | null) {
    if (!date) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(`${date}T00:00:00`);
    deadline.setHours(0, 0, 0, 0);

    return Math.round(
      (deadline.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24),
    );
  }

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString(
      language === "ru" ? "ru-RU" : "de-DE",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );
  }

  function getDeadlineLabel(date: string | null) {
    if (!date) {
      return language === "ru"
        ? "Без срока"
        : "Keine Frist";
    }

    const days = getDaysDifference(date);

    if (days === null) return "";

    if (days < 0) {
      return language === "ru"
        ? `Просрочено на ${Math.abs(days)} дн.`
        : `Überfällig um ${Math.abs(days)} ${
            Math.abs(days) === 1 ? "Tag" : "Tage"
          }`;
    }

    if (days === 0) {
      return language === "ru" ? "Сегодня" : "Heute";
    }

    if (days === 1) {
      return language === "ru" ? "Завтра" : "Morgen";
    }

    return language === "ru"
      ? `Через ${days} дн.`
      : `In ${days} Tagen`;
  }

  function getDeadlineCategory(
    task: Task,
  ): "overdue" | "today" | "upcoming" | "later" | "completed" {
    if (task.status === "completed") {
      return "completed";
    }

    const days = getDaysDifference(task.deadline);

    if (days === null) {
      return "later";
    }

    if (days < 0) {
      return "overdue";
    }

    if (days === 0) {
      return "today";
    }

    if (days <= 7) {
      return "upcoming";
    }

    return "later";
  }

  function getDeadlineStyle(task: Task) {
    const category = getDeadlineCategory(task);

    if (category === "completed") {
      return {
        badge: "bg-emerald-50 text-emerald-700",
        icon: "text-emerald-600",
        container: "border-emerald-100 bg-emerald-50/30",
      };
    }

    if (category === "overdue") {
      return {
        badge: "bg-red-50 text-red-700",
        icon: "text-red-600",
        container: "border-red-100 bg-red-50/30",
      };
    }

    if (category === "today") {
      return {
        badge: "bg-amber-50 text-amber-700",
        icon: "text-amber-600",
        container: "border-amber-100 bg-amber-50/30",
      };
    }

    if (category === "upcoming") {
      return {
        badge: "bg-amber-50 text-amber-700",
        icon: "text-amber-600",
        container: "border-neutral-200 bg-white",
      };
    }

    return {
      badge: "bg-neutral-100 text-neutral-500",
      icon: "text-neutral-400",
      container: "border-neutral-200 bg-white",
    };
  }

  function getPriorityStyle(
    priority: Task["priority"],
  ) {
    if (priority === "high") {
      return "bg-red-50 text-red-700";
    }

    if (priority === "medium") {
      return "bg-amber-50 text-amber-700";
    }

    return "bg-neutral-100 text-neutral-500";
  }

  function getPriorityLabel(
    priority: Task["priority"],
  ) {
    return t.priority[priority];
  }

  function getStatusLabel(
    status: Task["status"],
  ) {
    if (language === "ru") {
      if (status === "todo") return "К выполнению";
      if (status === "in_progress") return "В работе";
      return "Завершена";
    }

    if (status === "todo") return "Offen";
    if (status === "in_progress") return "In Arbeit";
    return "Abgeschlossen";
  }

  function getStatusStyle(
    status: Task["status"],
  ) {
    if (status === "completed") {
      return {
        badge: "bg-emerald-50 text-emerald-700",
        icon: "text-emerald-600",
        iconComponent: CheckCircle2,
      };
    }

    if (status === "in_progress") {
      return {
        badge: "bg-amber-50 text-amber-700",
        icon: "text-amber-600",
        iconComponent: CalendarClock,
      };
    }

    return {
      badge: "bg-neutral-100 text-neutral-500",
      icon: "text-neutral-400",
      iconComponent: CircleDot,
    };
  }

  const stats = useMemo(() => {
    const overdue = tasks.filter(
      (task) =>
        task.status !== "completed" &&
        getDeadlineCategory(task) === "overdue",
    ).length;

    const today = tasks.filter(
      (task) =>
        task.status !== "completed" &&
        getDeadlineCategory(task) === "today",
    ).length;

    const upcoming = tasks.filter(
      (task) =>
        task.status !== "completed" &&
        getDeadlineCategory(task) === "upcoming",
    ).length;

    const completed = tasks.filter(
      (task) => task.status === "completed",
    ).length;

    return {
      total: tasks.length,
      overdue,
      today,
      upcoming,
      completed,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks
      .filter((task) => {
        const goalTitle = getGoalTitle(task.goal_id);

        const matchesSearch =
          !query ||
          task.title.toLowerCase().includes(query) ||
          (task.description ?? "")
            .toLowerCase()
            .includes(query) ||
          (goalTitle ?? "")
            .toLowerCase()
            .includes(query);

        const category =
          getDeadlineCategory(task);

        const matchesDeadline =
          deadlineFilter === "all" ||
          (deadlineFilter === "overdue" &&
            category === "overdue") ||
          (deadlineFilter === "today" &&
            category === "today") ||
          (deadlineFilter === "upcoming" &&
            category === "upcoming") ||
          (deadlineFilter === "completed" &&
            category === "completed");

        const matchesGoal =
          goalFilter === "all" ||
          String(task.goal_id) === goalFilter;

        const matchesPriority =
          priorityFilter === "all" ||
          task.priority === priorityFilter;

        return (
          matchesSearch &&
          matchesDeadline &&
          matchesGoal &&
          matchesPriority
        );
      })
      .sort((a, b) => {
        const categoryOrder: Record<
          ReturnType<typeof getDeadlineCategory>,
          number
        > = {
          overdue: 1,
          today: 2,
          upcoming: 3,
          later: 4,
          completed: 5,
        };

        const categoryDifference =
          categoryOrder[getDeadlineCategory(a)] -
          categoryOrder[getDeadlineCategory(b)];

        if (categoryDifference !== 0) {
          return categoryDifference;
        }

        if (a.deadline && b.deadline) {
          const dateDifference =
            new Date(
              `${a.deadline}T00:00:00`,
            ).getTime() -
            new Date(
              `${b.deadline}T00:00:00`,
            ).getTime();

          if (dateDifference !== 0) {
            return dateDifference;
          }
        }

        if (a.priority !== b.priority) {
          return (
            priorityOrder[a.priority] -
            priorityOrder[b.priority]
          );
        }

        return a.title.localeCompare(
          b.title,
          language === "ru" ? "ru" : "de",
        );
      });
  }, [
    tasks,
    goals,
    search,
    deadlineFilter,
    goalFilter,
    priorityFilter,
    language,
  ]);

  const activeFiltersCount =
    Number(deadlineFilter !== "all") +
    Number(priorityFilter !== "all") +
    Number(goalFilter !== "all");

  const groupedTasks = useMemo(() => {
    return {
      overdue: filteredTasks.filter(
        (task) =>
          getDeadlineCategory(task) === "overdue",
      ),
      today: filteredTasks.filter(
        (task) =>
          getDeadlineCategory(task) === "today",
      ),
      upcoming: filteredTasks.filter(
        (task) =>
          getDeadlineCategory(task) === "upcoming",
      ),
      later: filteredTasks.filter(
        (task) =>
          getDeadlineCategory(task) === "later",
      ),
      completed: filteredTasks.filter(
        (task) =>
          getDeadlineCategory(task) === "completed",
      ),
    };
  }, [filteredTasks]);

  function resetFilters() {
    setSearch("");
    setDeadlineFilter("all");
    setGoalFilter("all");
    setPriorityFilter("all");
  }

  function openTask(task: Task) {
    window.location.href = `/tasks?task=${task.id}`;
  }

  function renderTaskRow(task: Task) {
    const goalTitle = getGoalTitle(task.goal_id);
    const deadlineStyle = getDeadlineStyle(task);
    const statusStyle = getStatusStyle(task.status);
    const StatusIcon = statusStyle.iconComponent;

    return (
      <tr
        key={task.id}
        onClick={() => openTask(task)}
        className="group cursor-pointer border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/60"
      >
        <td className="max-w-[400px] px-5 py-3.5">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                task.status === "completed"
                  ? "bg-emerald-50 text-emerald-600"
                  : deadlineStyle.badge
              }`}
            >
              {task.status === "completed" ? (
                <Check
                  size={14}
                  strokeWidth={2}
                />
              ) : deadlineStyle.icon.includes(
                  "red",
                ) ? (
                <CircleAlert
                  size={14}
                  strokeWidth={1.8}
                />
              ) : (
                <CalendarClock
                  size={14}
                  strokeWidth={1.8}
                />
              )}
            </div>

            <div className="min-w-0">
              <div
                className={`truncate text-sm font-semibold ${
                  task.status === "completed"
                    ? "text-neutral-400 line-through"
                    : "text-neutral-900"
                }`}
              >
                {task.title}
              </div>

              {task.description && (
                <div className="mt-0.5 max-w-[360px] truncate text-[11px] text-neutral-400">
                  {task.description}
                </div>
              )}
            </div>
          </div>
        </td>

        <td className="max-w-[230px] px-4 py-3.5">
          {goalTitle ? (
            <div className="flex items-center gap-2">
              <Target
                size={13}
                strokeWidth={1.7}
                className="shrink-0 text-neutral-400"
              />

              <span className="truncate text-xs font-medium text-neutral-600">
                {goalTitle}
              </span>
            </div>
          ) : (
            <span className="text-xs text-neutral-300">
              —
            </span>
          )}
        </td>

        <td className="px-4 py-3.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle.badge}`}
          >
            <StatusIcon
              size={12}
              strokeWidth={1.9}
            />

            {getStatusLabel(task.status)}
          </span>
        </td>

        <td className="px-4 py-3.5">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getPriorityStyle(
              task.priority,
            )}`}
          >
            {getPriorityLabel(task.priority)}
          </span>
        </td>

        <td className="px-4 py-3.5">
          {task.deadline && (
            <div className="flex flex-col items-start gap-1">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${deadlineStyle.badge}`}
              >
                <CalendarDays
                  size={12}
                  strokeWidth={1.8}
                />

                {formatDate(task.deadline)}
              </span>

              <span
                className={`text-[10px] font-medium ${deadlineStyle.icon}`}
              >
                {task.status === "completed"
                  ? language === "ru"
                    ? "Выполнено"
                    : "Erledigt"
                  : getDeadlineLabel(
                      task.deadline,
                    )}
              </span>
            </div>
          )}
        </td>

        <td className="w-[40px] px-2 py-3.5">
          <div className="flex justify-end opacity-0 transition group-hover:opacity-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400">
              →
            </span>
          </div>
        </td>
      </tr>
    );
  }

  function renderMobileTask(task: Task) {
    const goalTitle = getGoalTitle(task.goal_id);
    const deadlineStyle = getDeadlineStyle(task);
    const statusStyle = getStatusStyle(task.status);
    const StatusIcon = statusStyle.iconComponent;

    return (
      <article
        key={task.id}
        onClick={() => openTask(task)}
        className={`cursor-pointer rounded-2xl border bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition hover:border-neutral-300 ${
          task.status === "completed"
            ? "border-emerald-100"
            : deadlineStyle.container
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              task.status === "completed"
                ? "bg-emerald-50 text-emerald-600"
                : deadlineStyle.badge
            }`}
          >
            {task.status === "completed" ? (
              <Check
                size={15}
                strokeWidth={2}
              />
            ) : (
              <CalendarClock
                size={15}
                strokeWidth={1.8}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`break-words text-sm font-semibold leading-5 ${
                  task.status === "completed"
                    ? "text-neutral-400 line-through"
                    : "text-neutral-900"
                }`}
              >
                {task.title}
              </h3>

              <span className="shrink-0 text-lg leading-none text-neutral-300">
                →
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${statusStyle.badge}`}
              >
                <StatusIcon
                  size={10}
                  strokeWidth={1.9}
                />

                {getStatusLabel(task.status)}
              </span>

              <span
                className={`rounded-full px-2 py-1 text-[9px] font-semibold ${getPriorityStyle(
                  task.priority,
                )}`}
              >
                {getPriorityLabel(task.priority)}
              </span>
            </div>

            {task.description && (
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-500">
                {task.description}
              </p>
            )}

            <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3">
              {goalTitle && (
                <div className="flex min-w-0 items-center gap-2">
                  <Target
                    size={12}
                    strokeWidth={1.7}
                    className="shrink-0 text-neutral-400"
                  />

                  <span className="truncate text-[10px] font-medium text-neutral-500">
                    {goalTitle}
                  </span>
                </div>
              )}

              {task.deadline && (
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-semibold ${deadlineStyle.badge}`}
                  >
                    <CalendarDays
                      size={10}
                      strokeWidth={1.8}
                    />

                    {formatDate(task.deadline)}
                  </span>

                  <span
                    className={`text-right text-[9px] font-medium ${deadlineStyle.icon}`}
                  >
                    {task.status === "completed"
                      ? language === "ru"
                        ? "Выполнено"
                        : "Erledigt"
                      : getDeadlineLabel(
                          task.deadline,
                        )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  function renderGroup(
    title: string,
    tasksInGroup: Task[],
    type:
      | "overdue"
      | "today"
      | "upcoming"
      | "later"
      | "completed",
  ) {
    if (tasksInGroup.length === 0) {
      return null;
    }

    const groupStyles = {
      overdue: {
        dot: "bg-red-500",
        count: "bg-red-50 text-red-700",
      },
      today: {
        dot: "bg-amber-500",
        count: "bg-amber-50 text-amber-700",
      },
      upcoming: {
        dot: "bg-amber-400",
        count: "bg-neutral-100 text-neutral-600",
      },
      later: {
        dot: "bg-neutral-300",
        count: "bg-neutral-100 text-neutral-500",
      },
      completed: {
        dot: "bg-emerald-500",
        count: "bg-emerald-50 text-emerald-700",
      },
    };

    const style = groupStyles[type];

    return (
      <section key={type} className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${style.dot}`}
            />

            <h2 className="text-xs font-semibold text-neutral-700">
              {title}
            </h2>
          </div>

          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${style.count}`}
          >
            {tasksInGroup.length}
          </span>
        </div>

        {/* Desktop */}
        <section className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/70">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    {language === "ru"
                      ? "Задача"
                      : "Aufgabe"}
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    {language === "ru"
                      ? "Цель"
                      : "Ziel"}
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    {language === "ru"
                      ? "Статус"
                      : "Status"}
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    {language === "ru"
                      ? "Приоритет"
                      : "Priorität"}
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    {language === "ru"
                      ? "Срок"
                      : "Deadline"}
                  </th>

                  <th className="w-[40px] px-2 py-3" />
                </tr>
              </thead>

              <tbody>
                {tasksInGroup.map(renderTaskRow)}
              </tbody>
            </table>
          </div>
        </section>

        {/* Mobile */}
        <section className="space-y-2 md:hidden">
          {tasksInGroup.map(renderMobileTask)}
        </section>
      </section>
    );
  }

  const hasVisibleTasks =
    groupedTasks.overdue.length > 0 ||
    groupedTasks.today.length > 0 ||
    groupedTasks.upcoming.length > 0 ||
    groupedTasks.later.length > 0 ||
    groupedTasks.completed.length > 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f5f4] text-neutral-900">
      <Sidebar language={language} />

      <div className="ml-[72px] min-h-screen min-w-0">
        <Header
          language={language}
          setLanguage={setLanguage}
        />

        <div className="mx-auto w-full max-w-[1400px] px-4 pb-12 sm:px-6 lg:px-8">
          {/* Header */}
          <section className="pb-7 pt-8 sm:pb-8 sm:pt-10">
            <div>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                {t.common.teamWorkspace}
              </p>

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white">
                  <CalendarClock
                    size={20}
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <h1 className="text-3xl font-bold tracking-[-0.045em] text-neutral-950 sm:text-4xl">
                    {t.navigation.deadlines}
                  </h1>

                  <p className="mt-1 text-sm text-neutral-500">
                    {language === "ru"
                      ? "Все важные сроки команды — в одном месте."
                      : "Alle wichtigen Fristen des Teams — an einem Ort."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Statistics */}
          <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="flex min-h-[62px] items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                <CalendarClock
                  size={14}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <p className="text-[10px] font-medium text-neutral-400">
                  {language === "ru"
                    ? "Всего"
                    : "Gesamt"}
                </p>

                <p className="mt-0.5 text-lg font-semibold leading-none text-neutral-900">
                  {stats.total}
                </p>
              </div>
            </div>

            <div className="flex min-h-[62px] items-center gap-2.5 rounded-xl border border-red-100 bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />

              <div>
                <p className="text-[10px] font-medium text-neutral-400">
                  {language === "ru"
                    ? "Просрочено"
                    : "Überfällig"}
                </p>

                <p className="mt-0.5 text-lg font-semibold leading-none text-neutral-900">
                  {stats.overdue}
                </p>
              </div>
            </div>

            <div className="flex min-h-[62px] items-center gap-2.5 rounded-xl border border-amber-100 bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />

              <div>
                <p className="text-[10px] font-medium text-neutral-400">
                  {language === "ru"
                    ? "Сегодня"
                    : "Heute"}
                </p>

                <p className="mt-0.5 text-lg font-semibold leading-none text-neutral-900">
                  {stats.today}
                </p>
              </div>
            </div>

            <div className="flex min-h-[62px] items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />

              <div>
                <p className="text-[10px] font-medium text-neutral-400">
                  {language === "ru"
                    ? "Ближайшие"
                    : "Demnächst"}
                </p>

                <p className="mt-0.5 text-lg font-semibold leading-none text-neutral-900">
                  {stats.upcoming}
                </p>
              </div>
            </div>

            <div className="flex min-h-[62px] items-center gap-2.5 rounded-xl border border-emerald-100 bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />

              <div>
                <p className="text-[10px] font-medium text-neutral-400">
                  {language === "ru"
                    ? "Выполнено"
                    : "Erledigt"}
                </p>

                <p className="mt-0.5 text-lg font-semibold leading-none text-neutral-900">
                  {stats.completed}
                </p>
              </div>
            </div>
          </section>

          {/* Search + Filters */}
          <section className="mb-5 rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder={
                    language === "ru"
                      ? "Поиск по задачам и целям..."
                      : "Aufgaben und Ziele suchen..."
                  }
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-9 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
                />

                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <button
                onClick={() =>
                  setShowFilters((value) => !value)
                }
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${
                  showFilters ||
                  activeFiltersCount > 0
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <Filter
                  size={15}
                  strokeWidth={1.8}
                />

                {language === "ru"
                  ? "Фильтры"
                  : "Filter"}

                {activeFiltersCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-neutral-900">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="mt-3 grid grid-cols-1 gap-2 border-t border-neutral-100 pt-3 sm:grid-cols-3">
                <select
                  value={deadlineFilter}
                  onChange={(event) =>
                    setDeadlineFilter(
                      event.target
                        .value as DeadlineFilter,
                    )
                  }
                  className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-400"
                >
                  <option value="all">
                    {language === "ru"
                      ? "Все сроки"
                      : "Alle Fristen"}
                  </option>

                  <option value="overdue">
                    {language === "ru"
                      ? "Просроченные"
                      : "Überfällig"}
                  </option>

                  <option value="today">
                    {language === "ru"
                      ? "Сегодня"
                      : "Heute"}
                  </option>

                  <option value="upcoming">
                    {language === "ru"
                      ? "Ближайшие 7 дней"
                      : "Nächste 7 Tage"}
                  </option>

                  <option value="completed">
                    {language === "ru"
                      ? "Выполненные"
                      : "Erledigt"}
                  </option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(
                      event.target.value as
                        | Task["priority"]
                        | "all",
                    )
                  }
                  className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-400"
                >
                  <option value="all">
                    {language === "ru"
                      ? "Все приоритеты"
                      : "Alle Prioritäten"}
                  </option>

                  <option value="high">
                    {t.priority.high}
                  </option>

                  <option value="medium">
                    {t.priority.medium}
                  </option>

                  <option value="low">
                    {t.priority.low}
                  </option>
                </select>

                <select
                  value={goalFilter}
                  onChange={(event) =>
                    setGoalFilter(event.target.value)
                  }
                  className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-400"
                >
                  <option value="all">
                    {language === "ru"
                      ? "Все цели"
                      : "Alle Ziele"}
                  </option>

                  {goals.map((goal) => (
                    <option
                      key={goal.id}
                      value={goal.id}
                    >
                      {goal.title}
                    </option>
                  ))}
                </select>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="h-10 rounded-xl bg-neutral-50 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 sm:col-span-3"
                  >
                    {language === "ru"
                      ? "Сбросить фильтры"
                      : "Filter zurücksetzen"}
                  </button>
                )}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between px-0.5 text-[10px] text-neutral-400">
              <span>
                {loading
                  ? language === "ru"
                    ? "Загрузка..."
                    : "Wird geladen..."
                  : language === "ru"
                    ? `${filteredTasks.length} из ${tasks.length} сроков`
                    : `${filteredTasks.length} von ${tasks.length} Fristen`}
              </span>

              {(search ||
                activeFiltersCount > 0) && (
                <button
                  onClick={resetFilters}
                  className="font-medium text-neutral-500 hover:text-neutral-900"
                >
                  {language === "ru"
                    ? "Сбросить"
                    : "Zurücksetzen"}
                </button>
              )}
            </div>
          </section>

          {/* Content */}
          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
              <p className="text-sm text-neutral-400">
                {language === "ru"
                  ? "Загрузка сроков..."
                  : "Fristen werden geladen..."}
              </p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
                <CalendarClock
                  size={21}
                  strokeWidth={1.8}
                />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-neutral-900">
                {language === "ru"
                  ? "Пока нет сроков"
                  : "Noch keine Fristen"}
              </h3>

              <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-400">
                {language === "ru"
                  ? "Задачи с установленным дедлайном автоматически появятся здесь."
                  : "Aufgaben mit gesetzter Frist erscheinen automatisch hier."}
              </p>
            </div>
          ) : !hasVisibleTasks ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
                <Search
                  size={21}
                  strokeWidth={1.8}
                />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-neutral-900">
                {language === "ru"
                  ? "Сроки не найдены"
                  : "Keine Fristen gefunden"}
              </h3>

              <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-400">
                {language === "ru"
                  ? "Попробуйте изменить поиск или фильтры."
                  : "Passe deine Suche oder Filter an."}
              </p>

              <button
                onClick={resetFilters}
                className="mt-4 h-9 rounded-lg bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                {language === "ru"
                  ? "Сбросить"
                  : "Zurücksetzen"}
              </button>
            </div>
          ) : (
            <div className="space-y-7">
              {renderGroup(
                language === "ru"
                  ? "Просрочено"
                  : "Überfällig",
                groupedTasks.overdue,
                "overdue",
              )}

              {renderGroup(
                language === "ru"
                  ? "Сегодня"
                  : "Heute",
                groupedTasks.today,
                "today",
              )}

              {renderGroup(
                language === "ru"
                  ? "Ближайшие 7 дней"
                  : "Nächste 7 Tage",
                groupedTasks.upcoming,
                "upcoming",
              )}

              {renderGroup(
                language === "ru"
                  ? "Позже"
                  : "Später",
                groupedTasks.later,
                "later",
              )}

              {renderGroup(
                language === "ru"
                  ? "Выполнено"
                  : "Erledigt",
                groupedTasks.completed,
                "completed",
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}