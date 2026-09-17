"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleAlert,
  Lightbulb,
  ListTodo,
  Pencil,
  Target,
  Trash2,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { translations, type Language } from "@/lib/translations";

type Goal = {
  id: number;
  title: string;
  description: string | null;
  status: "active" | "completed" | "archived";
  priority: "low" | "medium" | "high";
  deadline: string | null;
  created_at: string;
  source_idea_id: number | null;
};

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: "low" | "medium" | "high";
  deadline: string | null;
  goal_id: number | null;
  created_at: string;
};

type GoalCardProps = {
  goal: Goal;
  language: Language;
};

export default function GoalCard({
  goal,
  language,
}: GoalCardProps) {
  const t = translations[language];
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(
    goal.description ?? ""
  );
  const [editPriority, setEditPriority] =
    useState<Goal["priority"]>(goal.priority);
  const [editStatus, setEditStatus] =
    useState<Goal["status"]>(goal.status);
  const [editDeadline, setEditDeadline] = useState(
    goal.deadline ?? ""
  );

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString(
      language === "ru" ? "ru-RU" : "de-DE",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
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

  function getDeadlineStyle(date: string) {
    const days = getDaysDifference(date);

    if (days < 0) {
      return {
        container: "bg-red-50 text-red-600",
        icon: "bg-red-50 text-red-600",
      };
    }

    if (days <= 2) {
      return {
        container: "bg-amber-50 text-amber-600",
        icon: "bg-amber-50 text-amber-600",
      };
    }

    return {
      container: "bg-neutral-50 text-neutral-600",
      icon: "bg-neutral-100 text-neutral-500",
    };
  }

  function getPriorityStyle(priority: Goal["priority"]) {
    if (priority === "high") {
      return {
        badge: "bg-red-50 text-red-700",
        dot: "bg-red-500",
      };
    }

    if (priority === "medium") {
      return {
        badge: "bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
      };
    }

    return {
      badge: "bg-neutral-100 text-neutral-500",
      dot: "bg-neutral-300",
    };
  }

  function getStatusStyle(status: Goal["status"]) {
    if (status === "completed") {
      return {
        badge: "bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
      };
    }

    if (status === "archived") {
      return {
        badge: "bg-neutral-100 text-neutral-500",
        dot: "bg-neutral-300",
      };
    }

    return {
      badge: "bg-amber-50 text-amber-700",
      dot: "bg-amber-500",
    };
  }

  function getTaskStatusStyle(task: Task) {
    if (isTaskCompleted(task)) {
      return {
        badge: "bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
      };
    }

    if (task.status === "in_progress") {
      return {
        badge: "bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
      };
    }

    return {
      badge: "bg-neutral-100 text-neutral-500",
      dot: "bg-neutral-300",
    };
  }

  async function loadTasks() {
    setTasksLoading(true);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("goal_id", goal.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading goal tasks:", error);
      setTasks([]);
      setTasksLoading(false);
      return;
    }

    setTasks(data ?? []);
    setTasksLoading(false);
  }

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen, goal.id]);

  function startEditing() {
    setEditTitle(goal.title);
    setEditDescription(goal.description ?? "");
    setEditPriority(goal.priority);
    setEditStatus(goal.status);
    setEditDeadline(goal.deadline ?? "");
    setIsEditing(true);
  }

  function cancelEditing() {
    if (saving) return;

    setEditTitle(goal.title);
    setEditDescription(goal.description ?? "");
    setEditPriority(goal.priority);
    setEditStatus(goal.status);
    setEditDeadline(goal.deadline ?? "");
    setIsEditing(false);
  }

  async function saveGoal() {
    const title = editTitle.trim();
    const description = editDescription.trim();

    if (!title || saving) return;

    setSaving(true);

    const { data, error } = await supabase
      .from("goals")
      .update({
        title,
        description: description || null,
        priority: editPriority,
        status: editStatus,
        deadline: editDeadline || null,
      })
      .eq("id", goal.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating goal:", error);
      setSaving(false);
      return;
    }

    Object.assign(goal, data);

    setIsEditing(false);
    setSaving(false);
  }

  async function deleteGoal() {
    if (deleting) return;

    setDeleting(true);

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goal.id);

    if (error) {
      console.error("Error deleting goal:", error);
      setDeleting(false);
      return;
    }

    setIsDeleteConfirmOpen(false);
    setIsOpen(false);
    setDeleting(false);

    window.location.reload();
  }

  function openTasks(taskId?: number) {
    setIsOpen(false);

    if (taskId) {
      router.push(`/tasks?task=${taskId}`);
      return;
    }

    router.push("/tasks");
  }

  function isTaskCompleted(task: Task) {
    return (
      task.status === "completed" ||
      task.status === "done"
    );
  }

  const priorityStyle = getPriorityStyle(goal.priority);
  const statusStyle = getStatusStyle(goal.status);

  return (
    <>
      {/* Goal Card */}
      <article
        onClick={() => setIsOpen(true)}
        className="group flex min-h-[220px] min-w-0 cursor-pointer flex-col rounded-2xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-sm sm:min-h-[230px] sm:p-6"
      >
        {/* Top badges */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <span
            className={`inline-flex max-w-[48%] items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[10px] font-semibold ${priorityStyle.badge}`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityStyle.dot}`}
            />

            {t.priority[goal.priority]}
          </span>

          <span
            className={`inline-flex max-w-[48%] items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle.badge}`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusStyle.dot}`}
            />

            {t.status[goal.status]}
          </span>
        </div>

        {/* Title */}
        <h3
          className={`break-words text-lg font-semibold leading-6 tracking-tight ${
            goal.status === "completed"
              ? "text-neutral-400 line-through"
              : "text-neutral-900"
          }`}
        >
          {goal.title}
        </h3>

        {goal.description && (
          <p className="mt-2 break-words text-sm leading-6 text-neutral-500">
            {goal.description}
          </p>
        )}

        {/* Source Idea */}
        {goal.source_idea_id !== null && (
          <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-amber-600">
            <Lightbulb
              size={13}
              strokeWidth={1.8}
            />

            <span>
              {language === "ru"
                ? "Создано из идеи"
                : "Aus einer Idee entstanden"}
            </span>
          </div>
        )}

        {/* Deadline */}
        {goal.deadline && (
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-100 pt-5">
            <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              <CalendarDays
                size={13}
                strokeWidth={1.8}
              />

              {t.common.until}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                getDaysDifference(goal.deadline) < 0
                  ? "bg-red-50 text-red-700"
                  : getDaysDifference(goal.deadline) <= 2
                    ? "bg-amber-50 text-amber-700"
                    : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {getDaysDifference(goal.deadline) < 0 && (
                <CircleAlert
                  size={12}
                  strokeWidth={1.8}
                />
              )}

              {formatDate(goal.deadline)}
            </span>
          </div>
        )}
      </article>

      {/* Goal Details Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/30 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          onClick={() => {
            if (!saving && !deleting) {
              setIsOpen(false);
              setIsEditing(false);
              setIsDeleteConfirmOpen(false);
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
                  {t.goals.title}
                </p>

                {!isEditing ? (
                  <h2
                    className={`break-words text-xl font-semibold leading-7 tracking-tight sm:text-2xl ${
                      goal.status === "completed"
                        ? "text-neutral-400"
                        : "text-neutral-950"
                    }`}
                  >
                    {goal.title}
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
                onClick={() => {
                  if (!saving && !deleting) {
                    setIsOpen(false);
                    setIsEditing(false);
                    setIsDeleteConfirmOpen(false);
                  }
                }}
                disabled={saving || deleting}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X
                  size={19}
                  strokeWidth={1.8}
                />
              </button>
            </div>

            {/* Status overview */}
            {!isEditing && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${priorityStyle.badge}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${priorityStyle.dot}`}
                  />

                  {t.priority[goal.priority]}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle.badge}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                  />

                  {t.status[goal.status]}
                </span>

                {goal.deadline && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      getDaysDifference(goal.deadline) < 0
                        ? "bg-red-50 text-red-700"
                        : getDaysDifference(goal.deadline) <= 2
                          ? "bg-amber-50 text-amber-700"
                          : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    <CalendarDays
                      size={12}
                      strokeWidth={1.8}
                    />

                    {formatDate(goal.deadline)}
                  </span>
                )}
              </div>
            )}

            {/* Source Idea */}
            {!isEditing && goal.source_idea_id !== null && (
              <div className="mt-5 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600">
                  <Lightbulb
                    size={15}
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600">
                    {language === "ru"
                      ? "Источник"
                      : "Quelle"}
                  </p>

                  <p className="mt-0.5 text-xs font-medium text-neutral-700">
                    {language === "ru"
                      ? "Эта цель создана из идеи"
                      : "Dieses Ziel wurde aus einer Idee erstellt"}
                  </p>
                </div>
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
                  {goal.description ||
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

            {/* Tasks */}
            {!isEditing && (
              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ListTodo
                      size={15}
                      strokeWidth={1.8}
                      className="text-neutral-400"
                    />

                    <h3 className="text-xs font-semibold text-neutral-700">
                      {language === "ru"
                        ? "Задачи"
                        : "Aufgaben"}
                    </h3>
                  </div>

                  {!tasksLoading && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-500">
                      {tasks.length}
                    </span>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-neutral-200">
                  {tasksLoading ? (
                    <div className="px-4 py-5 text-center text-xs text-neutral-400">
                      {language === "ru"
                        ? "Задачи загружаются..."
                        : "Aufgaben werden geladen..."}
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="px-4 py-5 text-center">
                      <ListTodo
                        size={18}
                        strokeWidth={1.6}
                        className="mx-auto text-neutral-300"
                      />

                      <p className="mt-2 text-xs font-medium text-neutral-500">
                        {language === "ru"
                          ? "Пока нет задач"
                          : "Noch keine Aufgaben"}
                      </p>

                      <p className="mt-1 text-[11px] text-neutral-400">
                        {language === "ru"
                          ? "Добавьте задачи, связанные с этой целью."
                          : "Füge Aufgaben hinzu, die zu diesem Ziel gehören."}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {tasks.map((task) => {
                        const completed =
                          isTaskCompleted(task);
                        const taskStatusStyle =
                          getTaskStatusStyle(task);

                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => openTasks(task.id)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-50"
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                completed
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-neutral-300 bg-white text-transparent"
                              }`}
                            >
                              {completed && (
                                <Check
                                  size={12}
                                  strokeWidth={2.2}
                                />
                              )}
                            </span>

                            <span
                              className={`min-w-0 flex-1 truncate text-xs font-medium ${
                                completed
                                  ? "text-neutral-400 line-through"
                                  : "text-neutral-700"
                              }`}
                            >
                              {task.title}
                            </span>

                            {task.status === "in_progress" && (
                              <span
                                className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-semibold sm:inline-flex ${taskStatusStyle.badge}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${taskStatusStyle.dot}`}
                                />

                                {language === "ru"
                                  ? "В работе"
                                  : "In Arbeit"}
                              </span>
                            )}

                            {task.deadline && (
                              <span
                                className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${
                                  getDaysDifference(
                                    task.deadline
                                  ) < 0
                                    ? "bg-red-50 text-red-700"
                                    : getDaysDifference(
                                          task.deadline
                                        ) <= 2
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-neutral-100 text-neutral-500"
                                }`}
                              >
                                {formatDate(task.deadline)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {tasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => openTasks()}
                    className="mt-3 flex w-full items-center justify-center rounded-xl bg-neutral-50 py-2.5 text-[11px] font-semibold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    {language === "ru"
                      ? "Открыть все задачи"
                      : "Alle Aufgaben öffnen"}
                  </button>
                )}
              </div>
            )}

            {/* Details */}
            <div className="mt-7 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
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
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${priorityStyle.badge}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${priorityStyle.dot}`}
                      />

                      {t.priority[goal.priority]}
                    </span>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(
                      ["low", "medium", "high"] as Goal["priority"][]
                    ).map((priority) => {
                      const style =
                        getPriorityStyle(priority);

                      return (
                        <button
                          key={priority}
                          type="button"
                          onClick={() =>
                            setEditPriority(priority)
                          }
                          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition ${
                            editPriority === priority
                              ? style.badge
                              : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                          }`}
                        >
                          {editPriority === priority && (
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                            />
                          )}

                          {t.priority[priority]}
                        </button>
                      );
                    })}
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
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle.badge}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                      />

                      {t.status[goal.status]}
                    </span>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(
                      [
                        "active",
                        "completed",
                        "archived",
                      ] as Goal["status"][]
                    ).map((status) => {
                      const style =
                        getStatusStyle(status);

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setEditStatus(status)
                          }
                          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition ${
                            editStatus === status
                              ? style.badge
                              : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                          }`}
                        >
                          {editStatus === status && (
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                            />
                          )}

                          {t.status[status]}
                        </button>
                      );
                    })}
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
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        !goal.deadline
                          ? "bg-neutral-100 text-neutral-500"
                          : getDaysDifference(
                                goal.deadline
                              ) < 0
                            ? "bg-red-50 text-red-700"
                            : getDaysDifference(
                                  goal.deadline
                                ) <= 2
                              ? "bg-amber-50 text-amber-700"
                              : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {goal.deadline &&
                        getDaysDifference(
                          goal.deadline
                        ) < 0 && (
                          <CircleAlert
                            size={12}
                            strokeWidth={1.8}
                          />
                        )}

                      {goal.deadline
                        ? formatDate(goal.deadline)
                        : language === "ru"
                          ? "Не установлен"
                          : "Nicht festgelegt"}
                    </span>
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
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-5 text-sm font-medium text-red-600 transition hover:border-red-200 hover:bg-red-100 sm:w-auto"
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
                      onClick={() => setIsOpen(false)}
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
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-600">
                      <Trash2
                        size={15}
                        strokeWidth={1.8}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        {language === "ru"
                          ? "Удалить эту цель?"
                          : "Dieses Ziel löschen?"}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-red-700/70">
                        {language === "ru"
                          ? "Это действие нельзя отменить."
                          : "Diese Aktion kann nicht rückgängig gemacht werden."}
                      </p>
                    </div>
                  </div>

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
                      onClick={deleteGoal}
                      disabled={deleting}
                      className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
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
                    className="h-11 w-full rounded-xl px-5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                  >
                    {language === "ru"
                      ? "Отмена"
                      : "Abbrechen"}
                  </button>

                  <button
                    onClick={saveGoal}
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
    </>
  );
}