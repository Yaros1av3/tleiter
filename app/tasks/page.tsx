"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Check,
  CircleCheck,
  CircleDot,
  CirclePlay,
  Filter,
  ListTodo,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
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

type StatusFilter = Task["status"] | "all";
type PriorityFilter = Task["priority"] | "all";

const statusOrder: Record<Task["status"], number> = {
  todo: 1,
  in_progress: 2,
  completed: 3,
};

const priorityOrder: Record<Task["priority"], number> = {
  high: 1,
  medium: 2,
  low: 3,
};

function TasksPageContent() {
  const searchParams = useSearchParams();
  const taskIdFromUrl = searchParams.get("task");

  const [language, setLanguage] = useState<Language>("ru");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [selectedTask, setSelectedTask] =
    useState<Task | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] =
    useState<Task["priority"]>("medium");
  const [newStatus, setNewStatus] =
    useState<Task["status"]>("todo");
  const [newDeadline, setNewDeadline] = useState("");
  const [newGoalId, setNewGoalId] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] =
    useState<Task["priority"]>("medium");
  const [editStatus, setEditStatus] =
    useState<Task["status"]>("todo");
  const [editDeadline, setEditDeadline] = useState("");
  const [editGoalId, setEditGoalId] = useState("");

  const t = translations[language];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!taskIdFromUrl || tasks.length === 0) return;

    const task = tasks.find(
      (item) => item.id === Number(taskIdFromUrl),
    );

    if (task) {
      openTask(task);
    }
  }, [taskIdFromUrl, tasks]);

  async function loadData() {
    setLoading(true);

    const [tasksResult, goalsResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("goals")
        .select("id, title")
        .order("created_at", { ascending: false }),
    ]);

    if (tasksResult.error) {
      console.error("Error loading tasks:", tasksResult.error);
      setTasks([]);
    } else {
      setTasks(tasksResult.data ?? []);
    }

    if (goalsResult.error) {
      console.error("Error loading goals:", goalsResult.error);
      setGoals([]);
    } else {
      setGoals(goalsResult.data ?? []);
    }

    setLoading(false);
  }

  function getGoalTitle(goalId: number | null) {
    if (!goalId) return null;

    return (
      goals.find((goal) => goal.id === goalId)?.title ?? null
    );
  }

  function getStatusLabel(status: Task["status"]) {
    if (language === "ru") {
      if (status === "todo") return "К выполнению";
      if (status === "in_progress") return "В работе";
      return "Завершена";
    }

    if (status === "todo") return "Offen";
    if (status === "in_progress") return "In Arbeit";
    return "Abgeschlossen";
  }

  function getStatusStyle(status: Task["status"]) {
    if (status === "completed") {
      return {
        badge: "bg-emerald-50 text-emerald-700",
        icon: "text-emerald-600",
        iconComponent: CircleCheck,
      };
    }

    if (status === "in_progress") {
      return {
        badge: "bg-amber-50 text-amber-700",
        icon: "text-amber-600",
        iconComponent: CirclePlay,
      };
    }

    return {
      badge: "bg-neutral-100 text-neutral-500",
      icon: "text-neutral-400",
      iconComponent: CircleDot,
    };
  }

  function getPriorityStyle(priority: Task["priority"]) {
    if (priority === "high") {
      return "bg-red-50 text-red-700";
    }

    if (priority === "medium") {
      return "bg-amber-50 text-amber-700";
    }

    return "bg-neutral-100 text-neutral-500";
  }

  function getDeadlineDays(date: string | null) {
    if (!date) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(`${date}T00:00:00`);
    deadline.setHours(0, 0, 0, 0);

    return Math.ceil(
      (deadline.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24),
    );
  }

  function getDeadlineStyle(date: string | null) {
    if (!date) {
      return {
        container: "bg-neutral-100 text-neutral-400",
        icon: "text-neutral-400",
      };
    }

    const days = getDeadlineDays(date);

    if (days !== null && days < 0) {
      return {
        container: "bg-red-50 text-red-700",
        icon: "text-red-600",
      };
    }

    if (days !== null && days <= 2) {
      return {
        container: "bg-amber-50 text-amber-700",
        icon: "text-amber-600",
      };
    }

    return {
      container: "bg-neutral-100 text-neutral-500",
      icon: "text-neutral-400",
    };
  }

  function getDeadlineLabel(date: string | null) {
    if (!date) {
      return language === "ru"
        ? "Без срока"
        : "Keine Frist";
    }

    const days = getDeadlineDays(date);

    if (days === null) {
      return "";
    }

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

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(
      language === "ru" ? "ru-RU" : "de-DE",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );
  }

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: tasks.length,

      todo: tasks.filter(
        (task) => task.status === "todo",
      ).length,

      inProgress: tasks.filter(
        (task) => task.status === "in_progress",
      ).length,

      completed: tasks.filter(
        (task) => task.status === "completed",
      ).length,

      overdue: tasks.filter((task) => {
        if (!task.deadline || task.status === "completed") {
          return false;
        }

        const deadline = new Date(
          `${task.deadline}T00:00:00`,
        );
        deadline.setHours(0, 0, 0, 0);

        return deadline < today;
      }).length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = tasks.filter((task) => {
      const goalTitle = getGoalTitle(task.goal_id);

      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.description ?? "")
          .toLowerCase()
          .includes(query) ||
        (goalTitle ?? "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        task.priority === priorityFilter;

      const matchesGoal =
        goalFilter === "all" ||
        String(task.goal_id) === goalFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesGoal
      );
    });

    return filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return (
          statusOrder[a.status] -
          statusOrder[b.status]
        );
      }

      if (a.priority !== b.priority) {
        return (
          priorityOrder[a.priority] -
          priorityOrder[b.priority]
        );
      }

      if (a.deadline && b.deadline) {
        return (
          new Date(
            `${a.deadline}T00:00:00`,
          ).getTime() -
          new Date(
            `${b.deadline}T00:00:00`,
          ).getTime()
        );
      }

      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;

      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    });
  }, [
    tasks,
    search,
    statusFilter,
    priorityFilter,
    goalFilter,
    goals,
  ]);

  const activeFiltersCount =
    Number(statusFilter !== "all") +
    Number(priorityFilter !== "all") +
    Number(goalFilter !== "all");

  async function createTask() {
    const title = newTitle.trim();
    const description = newDescription.trim();

    if (!title || creating) return;

    setCreating(true);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description: description || null,
        priority: newPriority,
        status: newStatus,
        deadline: newDeadline || null,
        goal_id: newGoalId
          ? Number(newGoalId)
          : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating task:", error);
      setCreating(false);
      return;
    }

    setTasks((currentTasks) => [
      data,
      ...currentTasks,
    ]);

    resetCreateForm();
    setCreating(false);
  }

  function resetCreateForm() {
    setNewTitle("");
    setNewDescription("");
    setNewPriority("medium");
    setNewStatus("todo");
    setNewDeadline("");
    setNewGoalId("");
    setIsCreateOpen(false);
  }

  function openTask(task: Task) {
    setSelectedTask(task);

    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDeadline(task.deadline ?? "");
    setEditGoalId(
      task.goal_id ? String(task.goal_id) : "",
    );

    setIsEditing(false);
    setIsDeleteConfirmOpen(false);
  }

  function closeTask() {
    if (saving || deleting) return;

    setSelectedTask(null);
    setIsEditing(false);
    setIsDeleteConfirmOpen(false);
  }

  function startEditing() {
    if (!selectedTask) return;

    setEditTitle(selectedTask.title);
    setEditDescription(
      selectedTask.description ?? "",
    );
    setEditPriority(selectedTask.priority);
    setEditStatus(selectedTask.status);
    setEditDeadline(selectedTask.deadline ?? "");
    setEditGoalId(
      selectedTask.goal_id
        ? String(selectedTask.goal_id)
        : "",
    );

    setIsEditing(true);
  }

  function cancelEditing() {
    if (!selectedTask || saving) return;

    setEditTitle(selectedTask.title);
    setEditDescription(
      selectedTask.description ?? "",
    );
    setEditPriority(selectedTask.priority);
    setEditStatus(selectedTask.status);
    setEditDeadline(selectedTask.deadline ?? "");
    setEditGoalId(
      selectedTask.goal_id
        ? String(selectedTask.goal_id)
        : "",
    );

    setIsEditing(false);
  }

  async function saveTask() {
    if (!selectedTask || saving) return;

    const title = editTitle.trim();
    const description = editDescription.trim();

    if (!title) return;

    setSaving(true);

    const { data, error } = await supabase
      .from("tasks")
      .update({
        title,
        description: description || null,
        priority: editPriority,
        status: editStatus,
        deadline: editDeadline || null,
        goal_id: editGoalId
          ? Number(editGoalId)
          : null,
      })
      .eq("id", selectedTask.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating task:", error);
      setSaving(false);
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === data.id ? data : task,
      ),
    );

    setSelectedTask(data);
    setIsEditing(false);
    setSaving(false);
  }

  async function changeTaskStatus(
    task: Task,
    status: Task["status"],
  ) {
    if (task.status === status) return;

    const { data, error } = await supabase
      .from("tasks")
      .update({
        status,
      })
      .eq("id", task.id)
      .select()
      .single();

    if (error) {
      console.error(
        "Error changing task status:",
        error,
      );
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === data.id ? data : item,
      ),
    );

    if (selectedTask?.id === data.id) {
      setSelectedTask(data);
      setEditStatus(data.status);
    }
  }

  async function deleteTask() {
    if (!selectedTask || deleting) return;

    setDeleting(true);

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", selectedTask.id);

    if (error) {
      console.error("Error deleting task:", error);
      setDeleting(false);
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.filter(
        (task) => task.id !== selectedTask.id,
      ),
    );

    setSelectedTask(null);
    setIsDeleteConfirmOpen(false);
    setDeleting(false);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setGoalFilter("all");
  }

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
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  {t.common.teamWorkspace}
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white">
                    <ListTodo
                      size={20}
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold tracking-[-0.045em] text-neutral-950 sm:text-4xl">
                      {t.navigation.tasks}
                    </h1>

                    <p className="mt-1 text-sm text-neutral-500">
                      {language === "ru"
                        ? "Задачи, которые превращают цели в результат."
                        : "Aufgaben, die Ziele in Ergebnisse verwandeln."}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.98] sm:w-auto"
              >
                <Plus
                  size={16}
                  strokeWidth={2}
                />

                {language === "ru"
                  ? "Новая задача"
                  : "Neue Aufgabe"}
              </button>
            </div>
          </section>

          {/* Compact statistics */}
          <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="flex min-h-[62px] items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                <ListTodo
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

            <div className="flex min-h-[62px] items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-400" />

              <div>
                <p className="text-[10px] font-medium text-neutral-400">
                  {language === "ru"
                    ? "Открытые"
                    : "Offen"}
                </p>

                <p className="mt-0.5 text-lg font-semibold leading-none text-neutral-900">
                  {stats.todo}
                </p>
              </div>
            </div>

            <div className="flex min-h-[62px] items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />

              <div>
                <p className="text-[10px] font-medium text-neutral-400">
                  {language === "ru"
                    ? "В работе"
                    : "In Arbeit"}
                </p>

                <p className="mt-0.5 text-lg font-semibold leading-none text-neutral-900">
                  {stats.inProgress}
                </p>
              </div>
            </div>

            <div className="flex min-h-[62px] items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />

              <div>
                <p className="text-[10px] font-medium text-neutral-400">
                  {language === "ru"
                    ? "Готово"
                    : "Fertig"}
                </p>

                <p className="mt-0.5 text-lg font-semibold leading-none text-neutral-900">
                  {stats.completed}
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
          </section>

          {/* Search + filters */}
          <section className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
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
                      ? "Поиск задач..."
                      : "Aufgaben suchen..."
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
                  showFilters || activeFiltersCount > 0
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
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as StatusFilter,
                    )
                  }
                  className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-400"
                >
                  <option value="all">
                    {language === "ru"
                      ? "Все статусы"
                      : "Alle Status"}
                  </option>

                  <option value="todo">
                    {getStatusLabel("todo")}
                  </option>

                  <option value="in_progress">
                    {getStatusLabel("in_progress")}
                  </option>

                  <option value="completed">
                    {getStatusLabel("completed")}
                  </option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(
                      event.target.value as PriorityFilter,
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
                    ? `${filteredTasks.length} из ${tasks.length} задач`
                    : `${filteredTasks.length} von ${tasks.length} Aufgaben`}
              </span>

              {(search || activeFiltersCount > 0) && (
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

          {/* Loading */}
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
              <p className="text-sm text-neutral-400">
                {language === "ru"
                  ? "Загрузка задач..."
                  : "Aufgaben werden geladen..."}
              </p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
                <ListTodo
                  size={21}
                  strokeWidth={1.8}
                />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-neutral-900">
                {tasks.length === 0
                  ? language === "ru"
                    ? "Пока нет задач"
                    : "Noch keine Aufgaben"
                  : language === "ru"
                    ? "Задачи не найдены"
                    : "Keine Aufgaben gefunden"}
              </h3>

              <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-400">
                {tasks.length === 0
                  ? language === "ru"
                    ? "Создайте первую задачу для команды."
                    : "Erstelle die erste Aufgabe für das Team."
                  : language === "ru"
                    ? "Попробуйте изменить поиск или фильтры."
                    : "Passe deine Suche oder Filter an."}
              </p>

              {tasks.length === 0 && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  <Plus size={14} />
                  {language === "ru"
                    ? "Создать задачу"
                    : "Aufgabe erstellen"}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <section className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse">
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

                        <th className="w-[90px] px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {filteredTasks.map((task) => {
                        const goalTitle = getGoalTitle(
                          task.goal_id,
                        );

                        const statusStyle =
                          getStatusStyle(task.status);

                        const StatusIcon =
                          statusStyle.iconComponent;

                        const deadlineStyle =
                          getDeadlineStyle(task.deadline);

                        return (
                          <tr
                            key={task.id}
                            onClick={() => openTask(task)}
                            className="group cursor-pointer border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/60"
                          >
                            <td className="max-w-[390px] px-5 py-3.5">
                              <div className="flex items-start gap-3">
                                <div
                                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                    task.status ===
                                    "completed"
                                      ? "bg-emerald-50 text-emerald-600"
                                      : "bg-neutral-100 text-neutral-400"
                                  }`}
                                >
                                  {task.status ===
                                  "completed" ? (
                                    <Check
                                      size={14}
                                      strokeWidth={2}
                                    />
                                  ) : (
                                    <ListTodo
                                      size={14}
                                      strokeWidth={1.8}
                                    />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div
                                    className={`truncate text-sm font-semibold ${
                                      task.status ===
                                      "completed"
                                        ? "text-neutral-400 line-through"
                                        : "text-neutral-900"
                                    }`}
                                  >
                                    {task.title}
                                  </div>

                                  {task.description && (
                                    <div className="mt-0.5 max-w-[350px] truncate text-[11px] text-neutral-400">
                                      {task.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="max-w-[220px] px-4 py-3.5">
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

                                {getStatusLabel(
                                  task.status,
                                )}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getPriorityStyle(
                                  task.priority,
                                )}`}
                              >
                                {t.priority[
                                  task.priority
                                ]}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              {task.deadline ? (
                                <div className="flex flex-col items-start gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${deadlineStyle.container}`}
                                  >
                                    <CalendarDays
                                      size={12}
                                      strokeWidth={1.8}
                                    />

                                    {formatDate(
                                      task.deadline,
                                    )}
                                  </span>

                                  <span
                                    className={`text-[10px] font-medium ${deadlineStyle.icon}`}
                                  >
                                    {getDeadlineLabel(
                                      task.deadline,
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-neutral-300">
                                  {language === "ru"
                                    ? "Без срока"
                                    : "Keine Frist"}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex justify-end opacity-50 transition group-hover:opacity-100">
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openTask(task);
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                                >
                                  <Pencil
                                    size={14}
                                    strokeWidth={1.8}
                                  />
                                </button>

                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedTask(task);
                                    setIsDeleteConfirmOpen(
                                      true,
                                    );
                                    setIsEditing(false);
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2
                                    size={14}
                                    strokeWidth={1.8}
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Mobile */}
              <section className="space-y-2 md:hidden">
                {filteredTasks.map((task) => {
                  const goalTitle = getGoalTitle(
                    task.goal_id,
                  );

                  const statusStyle =
                    getStatusStyle(task.status);

                  const StatusIcon =
                    statusStyle.iconComponent;

                  const deadlineStyle =
                    getDeadlineStyle(task.deadline);

                  return (
                    <article
                      key={task.id}
                      onClick={() => openTask(task)}
                      className={`rounded-2xl border bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                        task.status === "completed"
                          ? "border-emerald-100"
                          : "border-neutral-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            task.status === "completed"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-neutral-100 text-neutral-400"
                          }`}
                        >
                          {task.status ===
                          "completed" ? (
                            <Check
                              size={15}
                              strokeWidth={2}
                            />
                          ) : (
                            <ListTodo
                              size={15}
                              strokeWidth={1.8}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={`break-words text-sm font-semibold leading-5 ${
                                task.status ===
                                "completed"
                                  ? "text-neutral-400 line-through"
                                  : "text-neutral-900"
                              }`}
                            >
                              {task.title}
                            </h3>

                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                openTask(task);
                              }}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                            >
                              <Pencil
                                size={13}
                                strokeWidth={1.8}
                              />
                            </button>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${statusStyle.badge}`}
                            >
                              <StatusIcon
                                size={10}
                                strokeWidth={1.9}
                              />

                              {getStatusLabel(
                                task.status,
                              )}
                            </span>

                            <span
                              className={`rounded-full px-2 py-1 text-[9px] font-semibold ${getPriorityStyle(
                                task.priority,
                              )}`}
                            >
                              {t.priority[
                                task.priority
                              ]}
                            </span>
                          </div>

                          {task.description && (
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-500">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-neutral-100 pt-3">
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

                            <div className="flex items-center justify-between gap-2">
                              {task.deadline ? (
                                <div
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-semibold ${deadlineStyle.container}`}
                                >
                                  <CalendarDays
                                    size={10}
                                    strokeWidth={1.8}
                                  />

                                  {formatDate(
                                    task.deadline,
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-neutral-300">
                                  {language === "ru"
                                    ? "Без срока"
                                    : "Keine Frist"}
                                </span>
                              )}

                              {task.status !==
                                "completed" && (
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();

                                    changeTaskStatus(
                                      task,
                                      task.status ===
                                        "todo"
                                        ? "in_progress"
                                        : "completed",
                                    );
                                  }}
                                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-neutral-900 px-2.5 text-[9px] font-semibold text-white"
                                >
                                  <Check size={11} />

                                  {task.status ===
                                  "todo"
                                    ? language === "ru"
                                      ? "В работу"
                                      : "Starten"
                                    : language === "ru"
                                      ? "Готово"
                                      : "Fertig"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            </>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/30 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          onClick={() => {
            if (!creating) resetCreateForm();
          }}
        >
          <div
            className="max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-48px)] sm:p-6"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  {t.navigation.tasks}
                </p>

                <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-950">
                  {language === "ru"
                    ? "Новая задача"
                    : "Neue Aufgabe"}
                </h2>
              </div>

              <button
                onClick={resetCreateForm}
                disabled={creating}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru"
                    ? "Название"
                    : "Titel"}
                </label>

                <input
                  value={newTitle}
                  onChange={(event) =>
                    setNewTitle(event.target.value)
                  }
                  placeholder={
                    language === "ru"
                      ? "Например: Подготовить программу"
                      : "z. B. Programm vorbereiten"
                  }
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru"
                    ? "Описание"
                    : "Beschreibung"}
                </label>

                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(event) =>
                    setNewDescription(
                      event.target.value,
                    )
                  }
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru"
                    ? "Цель"
                    : "Ziel"}
                </label>

                <select
                  value={newGoalId}
                  onChange={(event) =>
                    setNewGoalId(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                >
                  <option value="">
                    {language === "ru"
                      ? "Без цели"
                      : "Kein Ziel"}
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
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru"
                    ? "Приоритет"
                    : "Priorität"}
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    ["low", "medium", "high"] as Task["priority"][]
                  ).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() =>
                        setNewPriority(priority)
                      }
                      className={`h-10 rounded-xl text-xs font-semibold ${
                        newPriority === priority
                          ? getPriorityStyle(
                              priority,
                            ) +
                            " ring-1 ring-current/10"
                          : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100"
                      }`}
                    >
                      {t.priority[priority]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru"
                    ? "Статус"
                    : "Status"}
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      "todo",
                      "in_progress",
                      "completed",
                    ] as Task["status"][]
                  ).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setNewStatus(status)
                      }
                      className={`h-10 rounded-xl text-[10px] font-semibold ${
                        newStatus === status
                          ? getStatusStyle(
                              status,
                            ).badge +
                            " ring-1 ring-current/10"
                          : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100"
                      }`}
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru"
                    ? "Срок"
                    : "Deadline"}
                </label>

                <input
                  type="date"
                  value={newDeadline}
                  onChange={(event) =>
                    setNewDeadline(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  onClick={resetCreateForm}
                  disabled={creating}
                  className="h-11 rounded-xl px-5 text-sm font-medium text-neutral-500 hover:bg-neutral-100"
                >
                  {language === "ru"
                    ? "Отмена"
                    : "Abbrechen"}
                </button>

                <button
                  onClick={createTask}
                  disabled={
                    !newTitle.trim() || creating
                  }
                  className="h-11 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:bg-neutral-300"
                >
                  {creating
                    ? language === "ru"
                      ? "Создание..."
                      : "Wird erstellt..."
                    : language === "ru"
                      ? "Создать задачу"
                      : "Aufgabe erstellen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TASK MODAL */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/30 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          onClick={() => {
            if (!saving && !deleting) {
              closeTask();
            }
          }}
        >
          <div
            className="max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-48px)] sm:p-6"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  {t.navigation.tasks}
                </p>

                {!isEditing ? (
                  <h2
                    className={`mt-1 break-words text-xl font-semibold leading-7 tracking-tight ${
                      selectedTask.status ===
                      "completed"
                        ? "text-neutral-400 line-through"
                        : "text-neutral-950"
                    }`}
                  >
                    {selectedTask.title}
                  </h2>
                ) : (
                  <input
                    value={editTitle}
                    onChange={(event) =>
                      setEditTitle(event.target.value)
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-base font-semibold outline-none focus:border-neutral-400 focus:bg-white"
                  />
                )}
              </div>

              <button
                onClick={closeTask}
                disabled={saving || deleting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={18} />
              </button>
            </div>

            {!isEditing && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(() => {
                  const style = getStatusStyle(
                    selectedTask.status,
                  );

                  const Icon =
                    style.iconComponent;

                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.badge}`}
                    >
                      <Icon size={12} />
                      {getStatusLabel(
                        selectedTask.status,
                      )}
                    </span>
                  );
                })()}

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getPriorityStyle(
                    selectedTask.priority,
                  )}`}
                >
                  {t.priority[selectedTask.priority]}
                </span>
              </div>
            )}

            <div className="mt-6">
              <label className="mb-2 block text-xs font-semibold text-neutral-700">
                {language === "ru"
                  ? "Описание"
                  : "Beschreibung"}
              </label>

              {!isEditing ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-600">
                  {selectedTask.description ||
                    (language === "ru"
                      ? "Описание не указано."
                      : "Keine Beschreibung vorhanden.")}
                </p>
              ) : (
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(event) =>
                    setEditDescription(
                      event.target.value,
                    )
                  }
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm leading-6 outline-none focus:border-neutral-400 focus:bg-white"
                />
              )}
            </div>

            <div className="mt-6 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {/* Goal */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs text-neutral-400">
                    <Target
                      size={14}
                      strokeWidth={1.7}
                    />

                    {language === "ru"
                      ? "Цель"
                      : "Ziel"}
                  </span>

                  {!isEditing && (
                    <span className="max-w-[60%] truncate text-xs font-semibold text-neutral-700">
                      {getGoalTitle(
                        selectedTask.goal_id,
                      ) ||
                        (language === "ru"
                          ? "Без цели"
                          : "Kein Ziel")}
                    </span>
                  )}
                </div>

                {isEditing && (
                  <select
                    value={editGoalId}
                    onChange={(event) =>
                      setEditGoalId(
                        event.target.value,
                      )
                    }
                    className="mt-3 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  >
                    <option value="">
                      {language === "ru"
                        ? "Без цели"
                        : "Kein Ziel"}
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
                )}
              </div>

              {/* Status */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-neutral-400">
                    {language === "ru"
                      ? "Статус"
                      : "Status"}
                  </span>

                  {!isEditing && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        getStatusStyle(
                          selectedTask.status,
                        ).badge
                      }`}
                    >
                      {getStatusLabel(
                        selectedTask.status,
                      )}
                    </span>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(
                      [
                        "todo",
                        "in_progress",
                        "completed",
                      ] as Task["status"][]
                    ).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setEditStatus(status)
                        }
                        className={`h-10 rounded-xl text-[10px] font-semibold ${
                          editStatus === status
                            ? getStatusStyle(
                                status,
                              ).badge
                            : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100"
                        }`}
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-neutral-400">
                    {language === "ru"
                      ? "Приоритет"
                      : "Priorität"}
                  </span>

                  {!isEditing && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getPriorityStyle(
                        selectedTask.priority,
                      )}`}
                    >
                      {t.priority[
                        selectedTask.priority
                      ]}
                    </span>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(
                      [
                        "low",
                        "medium",
                        "high",
                      ] as Task["priority"][]
                    ).map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() =>
                          setEditPriority(priority)
                        }
                        className={`h-10 rounded-xl text-xs font-semibold ${
                          editPriority === priority
                            ? getPriorityStyle(
                                priority,
                              )
                            : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100"
                        }`}
                      >
                        {t.priority[priority]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Deadline */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs text-neutral-400">
                    <CalendarDays
                      size={14}
                      strokeWidth={1.8}
                    />

                    {language === "ru"
                      ? "Срок"
                      : "Deadline"}
                  </span>

                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      {selectedTask.deadline && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            getDeadlineStyle(
                              selectedTask.deadline,
                            ).container
                          }`}
                        >
                          {getDeadlineLabel(
                            selectedTask.deadline,
                          )}
                        </span>
                      )}

                      <span className="text-xs font-semibold text-neutral-700">
                        {selectedTask.deadline
                          ? formatDate(
                              selectedTask.deadline,
                            )
                          : language === "ru"
                            ? "Не установлен"
                            : "Nicht festgelegt"}
                      </span>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(event) =>
                      setEditDeadline(
                        event.target.value,
                      )
                    }
                    className="mt-3 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6">
              {!isEditing &&
                !isDeleteConfirmOpen && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <button
                      onClick={() =>
                        setIsDeleteConfirmOpen(true)
                      }
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-400 hover:bg-red-50 hover:text-red-600 sm:w-auto"
                    >
                      <Trash2 size={14} />

                      {language === "ru"
                        ? "Удалить"
                        : "Löschen"}
                    </button>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        onClick={startEditing}
                        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                      >
                        <Pencil size={14} />

                        {language === "ru"
                          ? "Редактировать"
                          : "Bearbeiten"}
                      </button>

                      <button
                        onClick={closeTask}
                        className="h-10 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white hover:bg-neutral-800"
                      >
                        {language === "ru"
                          ? "Закрыть"
                          : "Schließen"}
                      </button>
                    </div>
                  </div>
                )}

              {/* Delete confirmation */}
              {!isEditing &&
                isDeleteConfirmOpen && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-neutral-900">
                      {language === "ru"
                        ? "Удалить эту задачу?"
                        : "Diese Aufgabe löschen?"}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {language === "ru"
                        ? "Это действие нельзя отменить."
                        : "Diese Aktion kann nicht rückgängig gemacht werden."}
                    </p>

                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        onClick={() =>
                          setIsDeleteConfirmOpen(
                            false,
                          )
                        }
                        disabled={deleting}
                        className="h-10 rounded-xl px-4 text-sm font-medium text-neutral-500 hover:bg-white"
                      >
                        {language === "ru"
                          ? "Отмена"
                          : "Abbrechen"}
                      </button>

                      <button
                        onClick={deleteTask}
                        disabled={deleting}
                        className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-neutral-300"
                      >
                        {deleting
                          ? language === "ru"
                            ? "Удаление..."
                            : "Wird gelöscht..."
                          : language === "ru"
                            ? "Да, удалить"
                            : "Ja, löschen"}
                      </button>
                    </div>
                  </div>
                )}

              {/* Edit actions */}
              {isEditing && (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="h-10 rounded-xl px-5 text-sm font-medium text-neutral-500 hover:bg-neutral-100"
                  >
                    {language === "ru"
                      ? "Отмена"
                      : "Abbrechen"}
                  </button>

                  <button
                    onClick={saveTask}
                    disabled={
                      !editTitle.trim() || saving
                    }
                    className="h-10 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:bg-neutral-300"
                  >
                    {saving
                      ? language === "ru"
                        ? "Сохранение..."
                        : "Wird gespeichert..."
                      : language === "ru"
                        ? "Сохранить"
                        : "Speichern"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f5f5f4]">
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-sm text-neutral-400">
              Загрузка...
            </p>
          </div>
        </main>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}