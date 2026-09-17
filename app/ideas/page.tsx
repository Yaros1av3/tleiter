"use client";

import { useEffect, useState } from "react";
import {
  Lightbulb,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
  ArrowRight,
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
    setIsDeleteConfirmOpen(false);
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

  function getStatusStyles(status: Idea["status"]) {
    if (status === "converted") {
      return {
        badge: "bg-emerald-50 text-emerald-700",
        icon: "bg-emerald-50 text-emerald-600",
        dot: "bg-emerald-500",
        border: "border-emerald-100",
      };
    }

    if (status === "in_progress") {
      return {
        badge: "bg-amber-50 text-amber-700",
        icon: "bg-amber-50 text-amber-600",
        dot: "bg-amber-500",
        border: "border-amber-100",
      };
    }

    return {
      badge: "bg-neutral-100 text-neutral-600",
      icon: "bg-neutral-100 text-neutral-500",
      dot: "bg-neutral-400",
      border: "border-neutral-200",
    };
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(
      language === "ru" ? "ru-RU" : "de-DE",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(new Date(date));
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
          <section className="pb-8 pt-9 sm:pb-10 sm:pt-12 lg:pt-14">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400 sm:text-[10px]">
                  {t.common.teamWorkspace}
                </p>

                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white sm:h-12 sm:w-12">
                    <Lightbulb
                      size={21}
                      strokeWidth={1.8}
                    />
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-3xl font-bold leading-none tracking-[-0.05em] text-neutral-950 sm:text-5xl lg:text-6xl">
                      {t.navigation.ideas}
                    </h1>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500 sm:text-base">
                      {language === "ru"
                        ? "Идеи, которые могут стать следующими целями команды."
                        : "Ideen, die zu den nächsten Zielen des Teams werden können."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section header */}
          <section>
            <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
                    {language === "ru"
                      ? "Все идеи"
                      : "Alle Ideen"}
                  </h2>

                  <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-[10px] font-semibold text-neutral-500">
                    {ideas.length}
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-neutral-400 sm:text-sm">
                  {language === "ru"
                    ? "Идеи команды и их текущий статус"
                    : "Teamideen und ihr aktueller Status"}
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
                <div className="flex flex-col items-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                    <Lightbulb
                      size={18}
                      className="text-neutral-400"
                      strokeWidth={1.7}
                    />
                  </div>

                  <p className="text-sm text-neutral-400">
                    {language === "ru"
                      ? "Загрузка идей..."
                      : "Ideen werden geladen..."}
                  </p>
                </div>
              </div>
            ) : ideas.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-5 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
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

                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white transition hover:bg-neutral-800"
                >
                  <Plus size={15} />
                  {language === "ru"
                    ? "Добавить идею"
                    : "Idee hinzufügen"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                {ideas.map((idea) => {
                  const statusStyles =
                    getStatusStyles(idea.status);

                  return (
                    <article
                      key={idea.id}
                      onClick={() => openIdea(idea)}
                      className={`group relative flex min-h-[205px] cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md sm:p-5.5 ${statusStyles.border}`}
                    >
                      {/* Top */}
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${statusStyles.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`}
                          />

                          {getStatusLabel(idea.status)}
                        </span>

                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${statusStyles.icon}`}
                        >
                          {idea.status === "converted" ? (
                            <Target
                              size={15}
                              strokeWidth={1.8}
                            />
                          ) : (
                            <Lightbulb
                              size={15}
                              strokeWidth={1.8}
                            />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="mt-5 min-w-0 flex-1">
                        <h3 className="break-words text-[17px] font-semibold leading-6 tracking-tight text-neutral-900">
                          {idea.title}
                        </h3>

                        {idea.description ? (
                          <p className="mt-2 line-clamp-3 break-words text-sm leading-5.5 text-neutral-500">
                            {idea.description}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm italic text-neutral-300">
                            {language === "ru"
                              ? "Без описания"
                              : "Keine Beschreibung"}
                          </p>
                        )}
                      </div>

                      {/* Bottom */}
                      <div className="mt-5 flex items-end justify-between border-t border-neutral-100 pt-3.5">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-300">
                            {language === "ru"
                              ? "Создана"
                              : "Erstellt"}
                          </p>

                          <p className="mt-1 text-[11px] font-medium text-neutral-500">
                            {formatDate(idea.created_at)}
                          </p>
                        </div>

                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-50 text-neutral-300 transition group-hover:bg-neutral-100 group-hover:text-neutral-600">
                          <ArrowRight
                            size={14}
                            strokeWidth={1.8}
                          />
                        </div>
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
            className="max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-48px)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
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
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(event) =>
                    setNewTitle(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      newTitle.trim()
                    ) {
                      createIdea();
                    }
                  }}
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
            if (
              !saving &&
              !deleting &&
              !converting
            ) {
              closeIdea();
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
                  {t.navigation.ideas}
                </p>

                {!isEditing ? (
                  <h2 className="break-words text-xl font-semibold leading-7 tracking-tight text-neutral-950 sm:text-2xl">
                    {selectedIdea.title}
                  </h2>
                ) : (
                  <input
                    autoFocus
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
                disabled={
                  saving ||
                  deleting ||
                  converting
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
              >
                <X size={19} strokeWidth={1.8} />
              </button>
            </div>

            {/* Description */}
            <div className="mt-7">
              <label className="mb-2 block text-xs font-semibold text-neutral-700">
                {language === "ru"
                  ? "Описание"
                  : "Beschreibung"}
              </label>

              {!isEditing ? (
                <div className="rounded-xl bg-neutral-50 px-4 py-3.5">
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">
                    {selectedIdea.description ||
                      (language === "ru"
                        ? "Описание не указано."
                        : "Keine Beschreibung vorhanden.")}
                  </p>
                </div>
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

            {/* Status */}
            <div className="mt-6 rounded-xl border border-neutral-200 bg-white">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-neutral-400">
                    {language === "ru"
                      ? "Статус"
                      : "Status"}
                  </span>

                  {!isEditing && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${
                        getStatusStyles(
                          selectedIdea.status
                        ).badge
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          getStatusStyles(
                            selectedIdea.status
                          ).dot
                        }`}
                      />

                      {getStatusLabel(
                        selectedIdea.status
                      )}
                    </span>
                  )}
                </div>

                {!isEditing && (
                  <p className="mt-2 text-xs leading-5 text-neutral-500">
                    {getStatusDescription(
                      selectedIdea.status
                    )}
                  </p>
                )}

                {isEditing && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(
                      [
                        "new",
                        "in_progress",
                        "converted",
                      ] as Idea["status"][]
                    ).map((status) => {
                      const styles =
                        getStatusStyles(status);

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setEditStatus(status)
                          }
                          className={`h-10 rounded-xl text-xs font-semibold transition ${
                            editStatus === status
                              ? "bg-neutral-900 text-white"
                              : `${styles.badge} hover:opacity-80`
                          }`}
                        >
                          {getStatusLabel(status)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Created date */}
            {!isEditing && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-300">
                  {language === "ru"
                    ? "Создана"
                    : "Erstellt"}
                </span>

                <span className="text-xs font-medium text-neutral-500">
                  {formatDate(
                    selectedIdea.created_at
                  )}
                </span>
              </div>
            )}

            {/* Actions */}
            {!isEditing &&
              !isDeleteConfirmOpen && (
                <div className="mt-6 flex flex-col gap-2">
                  {selectedIdea.status !==
                    "converted" && (
                    <button
                      onClick={
                        convertIdeaToGoal
                      }
                      disabled={converting}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
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

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={startEditing}
                      disabled={converting}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Pencil
                        size={15}
                        strokeWidth={1.8}
                      />

                      {language === "ru"
                        ? "Изменить"
                        : "Bearbeiten"}
                    </button>

                    <button
                      onClick={() =>
                        setIsDeleteConfirmOpen(
                          true
                        )
                      }
                      disabled={converting}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2
                        size={15}
                        strokeWidth={1.8}
                      />

                      {language === "ru"
                        ? "Удалить"
                        : "Löschen"}
                    </button>
                  </div>

                  <button
                    onClick={closeIdea}
                    disabled={converting}
                    className="h-11 w-full rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {language === "ru"
                      ? "Закрыть"
                      : "Schließen"}
                  </button>
                </div>
              )}

            {/* Delete confirmation */}
            {!isEditing &&
              isDeleteConfirmOpen && (
                <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-500">
                      <Trash2
                        size={16}
                        strokeWidth={1.8}
                      />
                    </div>

                    <div>
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
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      onClick={() =>
                        setIsDeleteConfirmOpen(
                          false
                        )
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

            {/* Edit actions */}
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
                  disabled={
                    !editTitle.trim() || saving
                  }
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