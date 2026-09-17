"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import GoalCard from "@/components/GoalCard";
import { translations, type Language } from "@/lib/translations";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

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

export default function Home() {
  const [language, setLanguage] = useState<Language>("ru");

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [creatingGoal, setCreatingGoal] = useState(false);

  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [newGoalPriority, setNewGoalPriority] =
    useState<Goal["priority"]>("medium");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");

  const t = translations[language];

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    setLoading(true);

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading goals:", error);
      setGoals([]);
    } else {
      setGoals(data ?? []);
    }

    setLoading(false);
  }

  async function createGoal() {
    const title = newGoalTitle.trim();
    const description = newGoalDescription.trim();

    if (!title || creatingGoal) {
      return;
    }

    setCreatingGoal(true);

    const { data, error } = await supabase
      .from("goals")
      .insert({
        title,
        description: description || null,
        priority: newGoalPriority,
        deadline: newGoalDeadline || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating goal:", error);
      setCreatingGoal(false);
      return;
    }

    setGoals((currentGoals) => [data, ...currentGoals]);

    resetCreateGoalForm();
    setCreatingGoal(false);
  }

  function resetCreateGoalForm() {
    setNewGoalTitle("");
    setNewGoalDescription("");
    setNewGoalPriority("medium");
    setNewGoalDeadline("");
    setIsCreateGoalOpen(false);
  }

  function priorityButtonClass(priority: Goal["priority"]) {
    const isActive = newGoalPriority === priority;

    if (!isActive) {
      return "bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700";
    }

    if (priority === "high") {
      return "bg-neutral-900 text-white";
    }

    if (priority === "medium") {
      return "bg-neutral-200 text-neutral-900";
    }

    return "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200";
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

            <h1 className="text-5xl font-bold leading-[0.95] tracking-[-0.065em] text-neutral-950 sm:text-6xl lg:text-7xl">
              {t.dashboard.title}
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-500 sm:mt-5 sm:text-base sm:leading-7">
              {t.dashboard.subtitle}
            </p>
          </section>

          {/* Goals */}
          <section>
            <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                  {t.goals.title}
                </h2>

                <p className="mt-2 text-sm leading-5 text-neutral-500">
                  {t.goals.description}
                </p>
              </div>

              <button
                onClick={() => setIsCreateGoalOpen(true)}
                className="flex h-11 w-full shrink-0 items-center justify-center rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.99] sm:w-auto"
              >
                <span className="mr-2 text-base">+</span>
                {t.goals.new}
              </button>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-neutral-200 bg-white sm:min-h-[240px]">
                <p className="text-sm text-neutral-400">
                  {t.goals.loading}
                </p>
              </div>
            ) : goals.length === 0 ? (
              /* Empty state */
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-5 text-center sm:min-h-[280px] sm:px-6">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-2xl text-neutral-500">
                  ○
                </div>

                <h3 className="text-base font-semibold text-neutral-900">
                  {t.goals.emptyTitle}
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                  {t.goals.emptyDescription}
                </p>
              </div>
            ) : (
              /* Goals */
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    language={language}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Create Goal Modal */}
      {isCreateGoalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/30 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          onClick={() => {
            if (!creatingGoal) {
              resetCreateGoalForm();
            }
          }}
        >
          <div
            className="max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-48px)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-neutral-950 sm:text-xl">
                  {t.goals.new}
                </h2>

                <p className="mt-1 text-sm leading-5 text-neutral-500">
                  {t.goals.description}
                </p>
              </div>

              <button
                onClick={() => {
                  if (!creatingGoal) {
                    resetCreateGoalForm();
                  }
                }}
                disabled={creatingGoal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-4 sm:mt-7 sm:space-y-5">
              {/* Title */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru" ? "Название" : "Titel"}
                </label>

                <input
                  type="text"
                  placeholder={
                    language === "ru"
                      ? "Например: Запустить новый Prozess"
                      : "z. B. Einen neuen Prozess starten"
                  }
                  value={newGoalTitle}
                  onChange={(event) =>
                    setNewGoalTitle(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white sm:px-4"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru" ? "Описание" : "Beschreibung"}
                </label>

                <textarea
                  rows={4}
                  placeholder={
                    language === "ru"
                      ? "Что мы хотим достичь?"
                      : "Was möchten wir erreichen?"
                  }
                  value={newGoalDescription}
                  onChange={(event) =>
                    setNewGoalDescription(event.target.value)
                  }
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white sm:px-4"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru" ? "Приоритет" : "Priorität"}
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewGoalPriority("low")}
                    className={`h-10 rounded-xl text-xs font-semibold transition ${priorityButtonClass(
                      "low"
                    )}`}
                  >
                    {t.priority.low}
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewGoalPriority("medium")}
                    className={`h-10 rounded-xl text-xs font-semibold transition ${priorityButtonClass(
                      "medium"
                    )}`}
                  >
                    {t.priority.medium}
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewGoalPriority("high")}
                    className={`h-10 rounded-xl text-xs font-semibold transition ${priorityButtonClass(
                      "high"
                    )}`}
                  >
                    {t.priority.high}
                  </button>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "ru" ? "Срок" : "Deadline"}
                </label>

                <input
                  type="date"
                  value={newGoalDeadline}
                  onChange={(event) =>
                    setNewGoalDeadline(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:bg-white sm:px-4"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3 sm:pt-2">
                <button
                  onClick={() => {
                    if (!creatingGoal) {
                      resetCreateGoalForm();
                    }
                  }}
                  disabled={creatingGoal}
                  className="h-11 w-full rounded-xl px-4 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  {language === "ru" ? "Отмена" : "Abbrechen"}
                </button>

                <button
                  onClick={createGoal}
                  disabled={!newGoalTitle.trim() || creatingGoal}
                  className="h-11 w-full rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:w-auto"
                >
                  {creatingGoal
                    ? language === "ru"
                      ? "Создание..."
                      : "Wird erstellt..."
                    : language === "ru"
                      ? "Создать цель"
                      : "Ziel erstellen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}