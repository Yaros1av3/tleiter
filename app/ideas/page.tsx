"use client";

import { useEffect, useState } from "react";
import {
  Lightbulb,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { translations, type Language } from "@/lib/translations";

type Idea = {
  id: number;
  title: string;
  description: string | null;
  status: "new" | "in_progress" | "converted";
  created_at: string;
};

export default function IdeasPage() {
  const [language, setLanguage] = useState<Language>("ru");

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] =
    useState<Idea["status"]>("new");

  const t = translations[language];

  useEffect(() => {
    loadIdeas();
  }, []);

  async function loadIdeas() {
    setLoading(true);

    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading ideas:", error);
      setIdeas([]);
    } else {
      setIdeas(data ?? []);
    }

    setLoading(false);
  }

  async function createIdea() {
    const title = newTitle.trim();
    const description = newDescription.trim();

    if (!title || creating) return;

    setCreating(true);

    const { data, error } = await supabase
      .from("ideas")
      .insert({
        title,
        description: description || null,
        status: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating idea:", error);
      setCreating(false);
      return;
    }

    setIdeas((currentIdeas) => [data, ...currentIdeas]);

    setNewTitle("");
    setNewDescription("");
    setIsCreateOpen(false);
    setCreating(false);
  }

  function openIdea(idea: Idea) {
    setSelectedIdea(idea);

    setEditTitle(idea.title);
    setEditDescription(idea.description ?? "");
    setEditStatus(idea.status);

    setIsEditing(false);
    setIsDeleteConfirmOpen(false);
  }

  function closeIdea() {
    if (saving || deleting || converting) return;

    setSelectedIdea(null);
    setIsEditing(false);
    setIsDeleteConfirmOpen(false);
  }

  function startEditing() {
    if (!selectedIdea) return;

    setEditTitle(selectedIdea.title);
    setEditDescription(selectedIdea.description ?? "");
    setEditStatus(selectedIdea.status);

    setIsEditing(true);
  }

  function cancelEditing() {
    if (!selectedIdea || saving) return;

    setEditTitle(selectedIdea.title);
    setEditDescription(selectedIdea.description ?? "");
    setEditStatus(selectedIdea.status);

    setIsEditing(false);
  }

  async function saveIdea() {
    if (!selectedIdea || saving) return;

    const title = editTitle.trim();
    const description = editDescription.trim();

    if (!title) return;

    setSaving(true);

    const { data, error } = await supabase
      .from("ideas")
      .update({
        title,
        description: description || null,
        status: editStatus,
      })
      .eq("id", selectedIdea.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating idea:", error);
      setSaving(false);
      return;
    }

    setIdeas((currentIdeas) =>
      currentIdeas.map((idea) =>
        idea.id === data.id ? data : idea
      )
    );

    setSelectedIdea(data);
    setIsEditing(false);
    setSaving(false);
  }

  async function convertIdeaToGoal() {
    if (!selectedIdea || converting) return;

    setConverting(true);

    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .insert({
        title: selectedIdea.title,
        description: selectedIdea.description,
        status: "active",
        priority: "medium",
        source_idea_id: selectedIdea.id,
      })
      .select()
      .single();

    if (goalError) {
      console.error("Error converting idea to goal:", goalError);
      setConverting(false);
      return;
    }

    const { data: updatedIdea, error: ideaError } = await supabase
      .from("ideas")
      .update({
        status: "converted",
      })
      .eq("id", selectedIdea.id)
      .select()
      .single();

    if (ideaError) {
      console.error("Error updating idea status:", ideaError);

      // Falls das Ziel erstellt wurde, die Idee aber nicht aktualisiert
      // werden konnte, löschen wir das neu erstellte Ziel wieder.
      if (goal?.id) {
        await supabase
          .from("goals")
          .delete()
          .eq("id", goal.id);
      }

      setConverting(false);
      return;
    }

    setIdeas((currentIdeas) =>
      currentIdeas.map((idea) =>
        idea.id === updatedIdea.id ? updatedIdea : idea
      )
    );

    setSelectedIdea(updatedIdea);
    setConverting(false);
  }

  async function deleteIdea() {
    if (!selectedIdea || deleting) return;

    setDeleting(true);

    const { error } = await supabase
      .from("ideas")
      .delete()
      .eq("id", selectedIdea.id);

    if (error) {
      console.error("Error deleting idea:", error);
      setDeleting(false);
      return;
    }

    setIdeas((currentIdeas) =>
      currentIdeas.filter(
        (idea) => idea.id !== selectedIdea.id
      )
    );

    setSelectedIdea(null);
    setIsDeleteConfirmOpen(false);
    setDeleting(false);
  }

  function getStatusLabel(status: Idea["status"]) {
    if (language === "ru") {
      if (status === "new") return "Новая";
      if (status === "in_progress") return "В работе";
      return "Стала целью";
    }

    if (status === "new") return "Neu";
    if (status === "in_progress") return "In Arbeit";
    return "Zum Ziel geworden";
  }

  function getStatusDescription(status: Idea["status"]) {
    if (language === "ru") {
      if (status === "new") {
        return "Идея ещё не начала реализовываться.";
      }

      if (status === "in_progress") {
        return "Команда уже работает над этой идеей.";
      }

      return "Идея была преобразована в цель.";
    }

    if (status === "new") {
      return "Die Idee wurde noch nicht umgesetzt.";
    }

    if (status === "in_progress") {
      return "Das Team arbeitet bereits an dieser Idee.";
    }

    return "Die Idee wurde in ein Ziel umgewandelt.";
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
                <Lightbulb
                  size={23}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <h1 className="text-4xl font-bold leading-none tracking-[-0.055em] text-neutral-950 sm:text-5xl lg:text-6xl">
                  {t.navigation.ideas}
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500 sm:text-base">
                  {language === "ru"
                    ? "Идеи, которые могут стать следующими целями команды."
                    : "Ideen, die zu den nächsten Zielen des Teams werden können."}
                </p>
              </div>
            </div>
          </section>

          {/* Ideas */}
          <section>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                  {language === "ru"
                    ? "Все идеи"
                    : "Alle Ideen"}
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  {language === "ru"
                    ? `${ideas.length} идей`
                    : `${ideas.length} Ideen`}
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
                  ? "Новая идея"
                  : "Neue Idee"}
              </button>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
                <p className="text-sm text-neutral-400">
                  {language === "ru"
                    ? "Загрузка идей..."
                    : "Ideen werden geladen..."}
                </p>
              </div>
            ) : ideas.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-5 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                  <Lightbulb
                    size={24}
                    strokeWidth={1.7}
                  />
                </div>

                <h3 className="text-base font-semibold text-neutral-900">
                  {language === "ru"
                    ? "Пока нет идей"
                    : "Noch keine Ideen"}
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                  {language === "ru"
                    ? "Добавьте первую идею команды."
                    : "Füge die erste Idee des Teams hinzu."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
  {ideas.map((idea) => {
    const statusStyles =
      idea.status === "converted"
        ? {
            badge: "bg-emerald-50 text-emerald-700",
            icon: "bg-emerald-50 text-emerald-600",
            dot: "bg-emerald-500",
          }
        : idea.status === "in_progress"
          ? {
              badge: "bg-amber-50 text-amber-700",
              icon: "bg-amber-50 text-amber-600",
              dot: "bg-amber-500",
            }
          : {
              badge: "bg-neutral-100 text-neutral-500",
              icon: "bg-amber-50 text-amber-600",
              dot: "bg-amber-400",
            };

    return (
      <article
        key={idea.id}
        onClick={() => openIdea(idea)}
        className="group min-h-[190px] cursor-pointer rounded-2xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-sm sm:p-6"
      >
        {/* Top */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles.badge}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`}
            />

            {getStatusLabel(idea.status)}
          </span>

          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${statusStyles.icon}`}
          >
            <Lightbulb
              size={16}
              strokeWidth={1.8}
            />
          </div>
        </div>

        {/* Content */}
        <h3 className="break-words text-lg font-semibold tracking-tight text-neutral-900 transition group-hover:text-neutral-950">
          {idea.title}
        </h3>

        {idea.description && (
          <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-neutral-500">
            {idea.description}
          </p>
        )}

        {/* Status */}
        <div className="mt-5 border-t border-neutral-100 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              {language === "ru" ? "Статус" : "Status"}
            </p>

            {idea.status === "converted" && (
              <Target
                size={14}
                strokeWidth={1.8}
                className="text-emerald-500"
              />
            )}
          </div>

          <p
            className={`mt-1 text-xs font-medium ${
              idea.status === "converted"
                ? "text-emerald-700"
                : "text-neutral-700"
            }`}
          >
            {getStatusDescription(idea.status)}
          </p>
        </div>
      </article>
    );
  })}
</div>
            )}
          </section>
        </div>
      </div>

      {/* Create Idea Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/30 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          onClick={() => {
            if (!creating) {
              setIsCreateOpen(false);
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
                  {t.navigation.ideas}
                </p>

                <h2 className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
                  {language === "ru"
                    ? "Новая идея"
                    : "Neue Idee"}
                </h2>

                <p className="mt-1 text-sm leading-5 text-neutral-500">
                  {language === "ru"
                    ? "Что можно сделать или улучшить?"
                    : "Was könnten wir machen oder verbessern?"}
                </p>
              </div>

              <button
                onClick={() => setIsCreateOpen(false)}
                disabled={creating}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
              >
                <X size={19} strokeWidth={1.8} />
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
                  type="text"
                  value={newTitle}
                  onChange={(event) =>
                    setNewTitle(event.target.value)
                  }
                  placeholder={
                    language === "ru"
                      ? "Например: Создать внутреннюю Wiki"
                      : "z. B. Interne Wiki erstellen"
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
                  rows={5}
                  value={newDescription}
                  onChange={(event) =>
                    setNewDescription(event.target.value)
                  }
                  placeholder={
                    language === "ru"
                      ? "Расскажите немного подробнее..."
                      : "Beschreibe die Idee etwas genauer..."
                  }
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm leading-6 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white sm:px-4"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                  className="h-11 w-full rounded-xl px-5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 sm:w-auto"
                >
                  {language === "ru"
                    ? "Отмена"
                    : "Abbrechen"}
                </button>

                <button
                  onClick={createIdea}
                  disabled={!newTitle.trim() || creating}
                  className="h-11 w-full rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:w-auto"
                >
                  {creating
                    ? language === "ru"
                      ? "Создание..."
                      : "Wird erstellt..."
                    : language === "ru"
                      ? "Создать идею"
                      : "Idee erstellen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Idea Details Modal */}
      {selectedIdea && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/30 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          onClick={() => {
            if (!saving && !deleting && !converting) {
              closeIdea();
            }
          }}
        >
          <div
            className="max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-48px)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  {t.navigation.ideas}
                </p>

                {!isEditing ? (
                  <h2 className="break-words text-xl font-semibold leading-7 tracking-tight text-neutral-950 sm:text-2xl">
                    {selectedIdea.title}
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
                onClick={closeIdea}
                disabled={saving || deleting || converting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
              >
                <X size={19} strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-7">
              <label className="mb-2 block text-xs font-semibold text-neutral-700">
                {language === "ru"
                  ? "Описание"
                  : "Beschreibung"}
              </label>

              {!isEditing ? (
                <p className="text-sm leading-6 text-neutral-600">
                  {selectedIdea.description ||
                    (language === "ru"
                      ? "Описание не указано."
                      : "Keine Beschreibung vorhanden.")}
                </p>
              ) : (
                <textarea
                  rows={5}
                  value={editDescription}
                  onChange={(event) =>
                    setEditDescription(event.target.value)
                  }
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm leading-6 text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white"
                />
              )}
            </div>

            <div className="mt-7 rounded-xl border border-neutral-200">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-neutral-400">
                    {language === "ru"
                      ? "Статус"
                      : "Status"}
                  </span>

                  {!isEditing && (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
      selectedIdea.status === "converted"
        ? "bg-emerald-50 text-emerald-700"
        : selectedIdea.status === "in_progress"
          ? "bg-amber-50 text-amber-700"
          : "bg-amber-50 text-amber-700"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        selectedIdea.status === "converted"
          ? "bg-emerald-500"
          : "bg-amber-500"
      }`}
    />

    {getStatusLabel(selectedIdea.status)}
  </span>
)}
                </div>

                {isEditing && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(
                      ["new", "in_progress", "converted"] as Idea["status"][]
                    ).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setEditStatus(status)
                        }
                        className={`h-10 rounded-xl text-xs font-semibold transition ${
                          editStatus === status
                            ? "bg-neutral-900 text-white"
                            : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                        }`}
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!isEditing && !isDeleteConfirmOpen && (
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() =>
                    setIsDeleteConfirmOpen(true)
                  }
                  disabled={converting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 px-5 text-sm font-medium text-neutral-400 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <Trash2
                    size={15}
                    strokeWidth={1.8}
                  />

                  {language === "ru"
                    ? "Удалить"
                    : "Löschen"}
                </button>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  {selectedIdea.status !== "converted" && (
                    <button
                      onClick={convertIdeaToGoal}
                      disabled={converting}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:w-auto"
                    >
                      <Target
                        size={15}
                        strokeWidth={1.8}
                      />

                      {converting
                        ? language === "ru"
                          ? "Создание цели..."
                          : "Ziel wird erstellt..."
                        : language === "ru"
                          ? "Превратить в цель"
                          : "In Ziel umwandeln"}
                    </button>
                  )}

                  <button
                    onClick={startEditing}
                    disabled={converting}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
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
                    onClick={closeIdea}
                    disabled={converting}
                    className="h-11 w-full rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:w-auto"
                  >
                    {language === "ru"
                      ? "Закрыть"
                      : "Schließen"}
                  </button>
                </div>
              </div>
            )}

            {!isEditing && isDeleteConfirmOpen && (
              <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-900">
                  {language === "ru"
                    ? "Удалить эту идею?"
                    : "Diese Idee löschen?"}
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
                    onClick={deleteIdea}
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

            {isEditing && (
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
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
                  onClick={saveIdea}
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
      )}
    </main>
  );
}