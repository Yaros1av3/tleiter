"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Copy,
  Plus,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import {
  formatEventDate,
  pickText,
  themeOf,
  type FormRow,
} from "@/lib/forms";

type Counts = { total: number; came: number };

export default function FormsPage() {
  const router = useRouter();
  const toast = useToast();
  const { language } = useLanguage();
  const isRu = language === "ru";
  const lang = isRu ? "ru" : "de";

  const [forms, setForms] = useState<FormRow[]>([]);
  const [counts, setCounts] = useState<Record<number, Counts>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Forms load error:", error);
      toast.error(
        isRu
          ? "Не удалось загрузить формы. Запущен ли forms.sql?"
          : "Formulare konnten nicht geladen werden. Wurde forms.sql ausgeführt?",
      );
      setLoading(false);
      return;
    }

    setForms((data ?? []) as FormRow[]);

    const responses = await supabase
      .from("form_responses")
      .select("form_id, attendance");

    const map: Record<number, Counts> = {};
    for (const row of (responses.data ?? []) as {
      form_id: number;
      attendance: string;
    }[]) {
      const entry = (map[row.form_id] ??= { total: 0, came: 0 });
      entry.total++;
      if (row.attendance === "came") entry.came++;
    }
    setCounts(map);
    setLoading(false);
  }, [isRu, toast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createForm() {
    if (creating) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("forms")
      .insert({
        title_ru: isRu ? "Новое мероприятие" : "",
        title_de: isRu ? "" : "Neue Veranstaltung",
      })
      .select("id")
      .single();

    setCreating(false);

    if (error || !data) {
      console.error("Form create error:", error);
      toast.error(
        isRu ? "Не удалось создать форму." : "Formular konnte nicht erstellt werden.",
      );
      return;
    }

    router.push(`/forms/${data.id}`);
  }

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/f/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(isRu ? "Ссылка скопирована" : "Link kopiert");
    } catch {
      window.prompt(isRu ? "Скопируй ссылку:" : "Link kopieren:", url);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f7f6] pb-28 text-[#111820]">
      <div className="mx-auto w-full max-w-[640px] px-4 pt-6 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111820] text-white">
              <ClipboardList size={22} />
            </div>
            <div>
              <h1 className="text-[26px] font-bold leading-none tracking-[-0.04em]">
                {isRu ? "Формы" : "Formulare"}
              </h1>
              <p className="mt-1.5 text-[13px] text-neutral-500">
                {isRu
                  ? "Запись на мероприятия и опросы"
                  : "Anmeldungen und Umfragen"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={createForm}
            disabled={creating}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#111820] px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            <Plus size={16} />
            {isRu ? "Создать" : "Neu"}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-28 animate-pulse rounded-[22px] bg-white" />
            <div className="h-28 animate-pulse rounded-[22px] bg-white" />
          </div>
        ) : forms.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-neutral-300 px-6 py-12 text-center">
            <div className="text-4xl">🎉</div>
            <p className="mt-3 text-[15px] font-semibold text-neutral-700">
              {isRu ? "Форм пока нет" : "Noch keine Formulare"}
            </p>
            <p className="mt-1 text-[13px] text-neutral-400">
              {isRu
                ? "Создай первую — например, запись на праздник."
                : "Erstelle das erste – zum Beispiel eine Anmeldung zum Fest."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {forms.map((form) => {
              const theme = themeOf(form.theme);
              const count = counts[form.id] ?? { total: 0, came: 0 };
              const title =
                pickText(form.title_de, form.title_ru, lang) ||
                (isRu ? "Без названия" : "Ohne Titel");
              const closed =
                !form.is_open ||
                (form.closes_at && new Date(form.closes_at) < new Date());

              return (
                <div
                  key={form.id}
                  className="overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-[0_2px_10px_rgba(17,24,32,0.03)]"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/forms/${form.id}`)}
                    className="flex w-full items-center gap-3 p-4 text-left active:bg-neutral-50"
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.hero} text-[28px]`}
                    >
                      {form.emoji}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-bold">
                        {title}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-neutral-500">
                        {form.event_date && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={12} />
                            {formatEventDate(form.event_date, lang)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-semibold text-neutral-700">
                          <Users size={12} />
                          {count.total}
                          {form.capacity ? ` / ${form.capacity}` : ""}
                        </span>
                        {count.came > 0 && (
                          <span className="font-semibold text-emerald-600">
                            {isRu ? "пришли" : "da"}: {count.came}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          closed
                            ? "bg-neutral-100 text-neutral-500"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {closed
                          ? isRu
                            ? "закрыта"
                            : "geschlossen"
                          : isRu
                            ? "открыта"
                            : "offen"}
                      </span>
                      <ChevronRight size={16} className="text-neutral-300" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyLink(form.slug)}
                    className="flex w-full items-center justify-center gap-2 border-t border-neutral-100 py-2.5 text-[12px] font-semibold text-neutral-500 active:bg-neutral-50"
                  >
                    <Copy size={13} />
                    {isRu ? "Скопировать ссылку для ребят" : "Link für die Teens kopieren"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}