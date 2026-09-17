"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CircleCheck,
  CircleDot,
  CirclePlay,
  ListTodo,
  Pencil,
  Plus,
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

export default function TasksPage() {
  const searchParams = useSearchParams();
  const taskIdFromUrl = searchParams.get("task");

  const [language, setLanguage] = useState<Language>("ru");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
      (item) => item.id === Number(taskIdFromUrl)
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
        goal_id: newGoalId ? Number(newGoalId) : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating task:", error);
      setCreating(false);
      return;
    }

    setTasks((currentTasks) => [data, ...currentTasks]);

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

  function getGoalTitle(goalId: number | null) {
    if (!goalId) return null;

    return goals.find((goal) => goal.id === goalId)?.title ?? null;
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

  function getDeadlineStyle(date: string | null) {
    if (!date) {
      return {
        container: "bg-neutral-100 text-neutral-400",
        icon: "text-neutral-400",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(`${date}T00:00:00`);
    deadline.setHours(0, 0, 0, 0);

    const days = Math.ceil(
      (deadline.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (days < 0) {
      return {
        container: "bg-red-50 text-red-700",
        icon: "text-red-600",
      };
    }

    if (days <= 2) {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(`${date}T00:00:00`);
    deadline.setHours(0, 0, 0, 0);

    const days = Math.ceil(
      (deadline.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (days < 0) {
      return language === "ru"
        ? `Просрочено на ${Math.abs(days)} дн.`
        : `Überfällig um ${Math.abs(days)} ${Math.abs(days) === 1 ? "Tag" : "Tage"}`;
    }

    if (days === 0) {
      return language === "ru"
        ? "Сегодня"
        : "Heute";
    }

    if (days === 1) {
      return language === "ru"
        ? "Завтра"
        : "Morgen";
    }

    return language === "ru"
      ? `Через ${days} дн.`
      : `In ${days} Tagen`;
  }

  function openTask(task: Task) {
    setSelectedTask(task);

    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDeadline(task.deadline ?? "");
    setEditGoalId(task.goal_id ? String(task.goal_id) : "");

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
    setEditDescription(selectedTask.description ?? "");
    setEditPriority(selectedTask.priority);
    setEditStatus(selectedTask.status);
    setEditDeadline(selectedTask.deadline ?? "");
    setEditGoalId(
      selectedTask.goal_id
        ? String(selectedTask.goal_id)
        : ""
    );

    setIsEditing(true);
  }

  function cancelEditing() {
    if (!selectedTask || saving) return;

    setEditTitle(selectedTask.title);
    setEditDescription(selectedTask.description ?? "");
    setEditPriority(selectedTask.priority);
    setEditStatus(selectedTask.status);
    setEditDeadline(selectedTask.deadline ?? "");
    setEditGoalId(
      selectedTask.goal_id
        ? String(selectedTask.goal_id)
        : ""
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
        task.id === data.id ? data : task
      )
    );

    setSelectedTask(data);
    setIsEditing(false);
    setSaving(false);
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
        (task) => task.id !== selectedTask.id
      )
    );

    setSelectedTask(null);
    setIsDeleteConfirmOpen(false);
    setDeleting(false);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(
      language === "ru" ? "ru-RU" : "de-DE",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
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
          <section className="pb-10 pt-10 sm:pb-14 sm:pt-14 lg:pt-16">
            <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400 sm:mb-4 sm:text-[10px] sm:tracking-[0.18em]">
              {t.common.teamWorkspace}
            </p>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white sm:h-14 sm:w-14">
                <ListTodo
                  size={22}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <h1 className="text-4xl font-bold leading-none tracking-[-0.055em] text-neutral-950 sm:text-5xl lg:text-6xl">
                  {t.navigation.tasks}
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500 sm:text-base">
                  {language === "ru"
                    ? "Что нужно сделать, чтобы наши цели стали реальностью?"
                    : "Was muss getan werden, damit unsere Ziele Realität werden?"}
                </p>
              </div>
            </div>
          </section>

          {/* Tasks */}
          <section>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                  {language === "ru"
                    ? "Все задачи"
                    : "Alle Aufgaben"}
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  {language === "ru"
                    ? `${tasks.length} задач`
                    : `${tasks.length} Aufgaben`}
                </p>
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.99] sm:w-auto"
              >
                <Plus
                  size={17}
                  strokeWidth={2}
                  className="mr-2"
                />

                {language === "ru"
                  ? "Новая задача"
                  : "Neue Aufgabe"}
              </button>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
                <p className="text-sm text-neutral-400">
                  {language === "ru"
                    ? "Загрузка задач..."
                    : "Aufgaben werden geladen..."}
                </p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-5 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                  <ListTodo
                    size={24}
                    strokeWidth={1.7}
                  />
                </div>

                <h3 className="text-base font-semibold text-neutral-900">
                  {language === "ru"
                    ? "Пока нет задач"
                    : "Noch keine Aufgaben"}
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                  {language === "ru"
                    ? "Создайте первую задачу для команды."
                    : "Erstelle die erste Aufgabe für das Team."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tasks.map((task) => {
                  const goalTitle = getGoalTitle(task.goal_id);
                  const statusStyle = getStatusStyle(task.status);
                  const StatusIcon = statusStyle.iconComponent;
                  const deadlineStyle = getDeadlineStyle(task.deadline);

                  return (
                    <article
                      key={task.id}
                      onClick={() => openTask(task)}
                      className={`group relative min-h-[205px] cursor-pointer rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm sm:p-6 ${
                        task.status === "completed"
                          ? "border-emerald-100"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      {/* Top */}
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <span
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle.badge}`}
                        >
                          <StatusIcon
                            size={12}
                            strokeWidth={1.9}
                          />

                          {getStatusLabel(task.status)}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getPriorityStyle(task.priority)}`}
                        >
                          {t.priority[task.priority]}
                        </span>
                      </div>

                      {/* Content */}
                      <h3
                        className={`break-words text-lg font-semibold tracking-tight ${
                          task.status === "completed"
                            ? "text-neutral-400 line-through"
                            : "text-neutral-900"
                        }`}
                      >
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-neutral-500">
                          {task.description}
                        </p>
                      )}

                      {/* Goal */}
                      {goalTitle && (
                        <div className="mt-5 border-t border-neutral-100 pt-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                            {language === "ru"
                              ? "Цель"
                              : "Ziel"}
                          </p>

                          <p className="mt-1 break-words text-xs font-medium text-neutral-700">
                            {goalTitle}
                          </p>
                        </div>
                      )}

                      {/* Deadline */}
                      {task.deadline && (
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${deadlineStyle.container}`}
                          >
                            <CalendarDays
                              size={12}
                              strokeWidth={1.8}
                              className={deadlineStyle.icon}
                            />

                            {formatDate(task.deadline)}
                          </div>

                          <span
                            className={`text-[10px] font-medium ${deadlineStyle.icon}`}
                          >
                            {getDeadlineLabel(task.deadline)}
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/30 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          onClick={() => {
            if (!creating) {
              resetCreateForm();
            }
          }}
        >
          <div
            className="max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-48px)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  {t.navigation.tasks}
                </p>

                <h2 className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
                  {language === "ru"
                    ? "Новая задача"
                    : "Neue Aufgabe"}
                </h2>

                <p className="mt-1 text-sm leading-5 text-neutral-500">
                  {language === "ru"
                    ? "Что нужно сделать?"
                    : "Was muss getan werden?"}
                </p>
              </div>

              <button
                onClick={() => {
                  if (!creating) resetCreateForm();
                }}
                disabled={creating}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
              >
                <X size={19} strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru" ? "Название" : "Titel"}
                </label>

                <input
                  type="text"
                  value={newTitle}
                  onChange={(event) =>
                    setNewTitle(event.target.value)
                  }
                  placeholder={
                    language === "ru"
                      ? "Например: Настроить Backup"
                      : "z. B. Backup einrichten"
                  }
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white sm:px-4"
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
                    setNewDescription(event.target.value)
                  }
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white sm:px-4"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru"
                    ? "Связать с целью"
                    : "Mit Ziel verknüpfen"}
                </label>

                <select
                  value={newGoalId}
                  onChange={(event) =>
                    setNewGoalId(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:bg-white sm:px-4"
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
                      className={`h-10 rounded-xl text-xs font-semibold transition ${
                        newPriority === priority
                          ? priority === "high"
                            ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                            : priority === "medium"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                              : "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200"
                          : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      }`}
                    >
                      {t.priority[priority]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru" ? "Статус" : "Status"}
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    ["todo", "in_progress", "completed"] as Task["status"][]
                  ).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setNewStatus(status)
                      }
                      className={`h-10 rounded-xl text-xs font-semibold transition ${
                        newStatus === status
                          ? status === "completed"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                            : status === "in_progress"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                              : "bg-neutral-900 text-white"
                          : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
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
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:bg-white sm:px-4"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  onClick={resetCreateForm}
                  disabled={creating}
                  className="h-11 w-full rounded-xl px-5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 sm:w-auto"
                >
                  {language === "ru"
                    ? "Отмена"
                    : "Abbrechen"}
                </button>

                <button
                  onClick={createTask}
                  disabled={!newTitle.trim() || creating}
                  className="h-11 w-full rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:w-auto"
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

      {/* Task Details Modal */}
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
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  {t.navigation.tasks}
                </p>

                {!isEditing ? (
                  <h2
                    className={`break-words text-xl font-semibold leading-7 tracking-tight sm:text-2xl ${
                      selectedTask.status === "completed"
                        ? "text-neutral-400 line-through"
                        : "text-neutral-950"
                    }`}
                  >
                    {selectedTask.title}
                  </h2>
                ) : (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(event) =>
                      setEditTitle(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-base font-semibold text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white"
                  />
                )}
              </div>

              <button
                onClick={closeTask}
                disabled={saving || deleting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
              >
                <X size={19} strokeWidth={1.8} />
              </button>
            </div>

            {/* Status + Priority */}
            {!isEditing && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(() => {
                  const style = getStatusStyle(
                    selectedTask.status
                  );
                  const Icon = style.iconComponent;

                  return (
                    <span
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.badge}`}
                    >
                      <Icon
                        size={12}
                        strokeWidth={1.9}
                      />
                      {getStatusLabel(selectedTask.status)}
                    </span>
                  );
                })()}

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getPriorityStyle(selectedTask.priority)}`}
                >
                  {t.priority[selectedTask.priority]}
                </span>
              </div>
            )}

            {/* Description */}
            <div className="mt-7">
              <label className="mb-2 block text-xs font-semibold text-neutral-700">
                {language === "ru"
                  ? "Описание"
                  : "Beschreibung"}
              </label>

              {!isEditing ? (
                <p className="text-sm leading-6 text-neutral-600">
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
                    setEditDescription(event.target.value)
                  }
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm leading-6 text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white"
                />
              )}
            </div>

            {/* Details */}
            <div className="mt-7 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {/* Goal */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-neutral-400">
                    {language === "ru"
                      ? "Цель"
                      : "Ziel"}
                  </span>

                  {!isEditing && (
                    <span className="max-w-[65%] truncate text-xs font-semibold text-neutral-700">
                      {getGoalTitle(selectedTask.goal_id) ||
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
                      setEditGoalId(event.target.value)
                    }
                    className="mt-3 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:bg-white"
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

              {/* Priority */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-neutral-400">
                    {language === "ru"
                      ? "Приоритет"
                      : "Priorität"}
                  </span>

                  {!isEditing && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getPriorityStyle(selectedTask.priority)}`}
                    >
                      {t.priority[selectedTask.priority]}
                    </span>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(
                      ["low", "medium", "high"] as Task["priority"][]
                    ).map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() =>
                          setEditPriority(priority)
                        }
                        className={`h-10 rounded-xl text-xs font-semibold transition ${
                          editPriority === priority
                            ? priority === "high"
                              ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                              : priority === "medium"
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                                : "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200"
                            : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                        }`}
                      >
                        {t.priority[priority]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-neutral-400">
                    {language === "ru"
                      ? "Статус"
                      : "Status"}
                  </span>

                  {!isEditing && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        getStatusStyle(selectedTask.status).badge
                      }`}
                    >
                      {getStatusLabel(selectedTask.status)}
                    </span>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(
                      ["todo", "in_progress", "completed"] as Task["status"][]
                    ).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setEditStatus(status)
                        }
                        className={`h-10 rounded-xl text-xs font-semibold transition ${
                          editStatus === status
                            ? status === "completed"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                              : status === "in_progress"
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                                : "bg-neutral-900 text-white"
                            : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                        }`}
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Deadline */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-4">
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
                              selectedTask.deadline
                            ).container
                          }`}
                        >
                          {getDeadlineLabel(
                            selectedTask.deadline
                          )}
                        </span>
                      )}

                      <span className="text-xs font-semibold text-neutral-700">
                        {selectedTask.deadline
                          ? formatDate(
                              selectedTask.deadline
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
                      setEditDeadline(event.target.value)
                    }
                    className="mt-3 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:bg-white"
                  />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6">
              {!isEditing && !isDeleteConfirmOpen && (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <button
                    onClick={() =>
                      setIsDeleteConfirmOpen(true)
                    }
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 px-5 text-sm font-medium text-neutral-400 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 sm:w-auto"
                  >
                    <Trash2
                      size={15}
                      strokeWidth={1.8}
                    />

                    {language === "ru"
                      ? "Удалить"
                      : "Löschen"}
                  </button>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={startEditing}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 sm:w-auto"
                    >
                      <Pencil
                        size={15}
                        strokeWidth={1.8}
                      />

                      {language === "ru"
                        ? "Редактировать"
                        : "Bearbeiten"}
                    </button>

                    <button
                      onClick={closeTask}
                      className="h-11 w-full rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-auto"
                    >
                      {language === "ru"
                        ? "Закрыть"
                        : "Schließen"}
                    </button>
                  </div>
                </div>
              )}

              {/* Delete Confirmation */}
              {!isEditing && isDeleteConfirmOpen && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    {language === "ru"
                      ? "Удалить эту задачу?"
                      : "Diese Aufgabe löschen?"}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {language === "ru"
                      ? "Это действие нельзя отменить."
                      : "Diese Aktion kann nicht rückgängig gemacht werden."}
                  </p>

                  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      onClick={() =>
                        setIsDeleteConfirmOpen(false)
                      }
                      disabled={deleting}
                      className="h-10 rounded-xl px-4 text-sm font-medium text-neutral-500 transition hover:bg-white hover:text-neutral-900 disabled:opacity-40"
                    >
                      {language === "ru"
                        ? "Отмена"
                        : "Abbrechen"}
                    </button>

                    <button
                      onClick={deleteTask}
                      disabled={deleting}
                      className="h-10 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
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

              {/* Edit Actions */}
              {isEditing && (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="h-11 w-full rounded-xl px-5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 sm:w-auto"
                  >
                    {language === "ru"
                      ? "Отмена"
                      : "Abbrechen"}
                  </button>

                  <button
                    onClick={saveTask}
                    disabled={!editTitle.trim() || saving}
                    className="h-11 w-full rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:w-auto"
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