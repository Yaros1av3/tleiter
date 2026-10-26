"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Check,
  Copy,
  Download,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";

import DatePicker from "@/components/DatePicker";
import TimePicker from "@/components/TimePicker";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import {
  EMOJIS,
  QUESTION_TYPES,
  THEMES,
  calcAge,
  needsOptions,
  newId,
  pickText,
  templateQuestions,
  themeOf,
  type FormQuestion,
  type FormRow,
  type QuestionType,
  type ResponseRow,
} from "@/lib/forms";

type Tab = "edit" | "answers" | "checkin" | "stats";

/* ---------- helpers ---------- */

function optionLabel(q: FormQuestion, stored: string, lang: "de" | "ru") {
  const found = (q.options ?? []).find(
    (option) => option.de === stored || option.ru === stored,
  );
  return found ? pickText(found.de, found.ru, lang) : stored;
}

function answerText(
  q: FormQuestion,
  value: unknown,
  lang: "de" | "ru",
  yes: string,
  no: string,
) {
  if (value === undefined || value === null || value === "") return "";
  if (q.type === "yesno") return value ? yes : no;
  if (q.type === "single") return optionLabel(q, String(value), lang);
  if (q.type === "multi" && Array.isArray(value)) {
    return (value as string[]).map((item) => optionLabel(q, item, lang)).join(", ");
  }
  return String(value);
}

function toLocalDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const inputCls =
  "block min-w-0 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-950/5";

/* ---------- page ---------- */

export default function FormDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { language } = useLanguage();
  const isRu = language === "ru";
  const lang = isRu ? "ru" : "de";
  const formId = Number(params.id);

  const [draft, setDraft] = useState<FormRow | null>(null);
  const [saved, setSaved] = useState<FormRow | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [teenBirth, setTeenBirth] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("edit");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );

  const load = useCallback(async () => {
    const [formResult, responsesResult] = await Promise.all([
      supabase.from("forms").select("*").eq("id", formId).maybeSingle(),
      supabase
        .from("form_responses")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: true }),
    ]);

    if (formResult.error || !formResult.data) {
      console.error("Form load error:", formResult.error);
      toast.error(isRu ? "Форма не найдена." : "Formular nicht gefunden.");
      setLoading(false);
      return;
    }

    const form = formResult.data as FormRow;
    setDraft((current) => current ?? form);
    setSaved(form);

    const rows = (responsesResult.data ?? []) as ResponseRow[];
    setResponses(rows);

    const teenIds = Array.from(
      new Set(rows.map((row) => row.teen_id).filter((id): id is number => id != null)),
    );

    if (teenIds.length > 0) {
      const teens = await supabase
        .from("teens")
        .select("id, birth_date")
        .in("id", teenIds);

      const map: Record<number, string> = {};
      for (const teen of (teens.data ?? []) as { id: number; birth_date: string }[]) {
        map[teen.id] = teen.birth_date;
      }
      setTeenBirth(map);
    }

    setLoading(false);
  }, [formId, isRu, toast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(partial: Partial<FormRow>) {
    setDraft((current) => (current ? { ...current, ...partial } : current));
  }

  function patchQuestion(id: string, partial: Partial<FormQuestion>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            questions: current.questions.map((q) =>
              q.id === id ? { ...q, ...partial } : q,
            ),
          }
        : current,
    );
  }

  function moveQuestion(index: number, delta: number) {
    setDraft((current) => {
      if (!current) return current;
      const list = [...current.questions];
      const target = index + delta;
      if (target < 0 || target >= list.length) return current;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...current, questions: list };
    });
  }

  function addQuestion(type: QuestionType = "short") {
    setDraft((current) =>
      current
        ? {
            ...current,
            questions: [
              ...current.questions,
              {
                id: newId(),
                type,
                label_de: "",
                label_ru: "",
                required: false,
                options: needsOptions(type)
                  ? [
                      { de: "", ru: "" },
                      { de: "", ru: "" },
                    ]
                  : undefined,
              },
            ],
          }
        : current,
    );
  }

  async function save() {
    if (!draft || saving) return;

    if (!draft.title_de.trim() && !draft.title_ru.trim()) {
      toast.error(isRu ? "Укажи название мероприятия." : "Bitte gib einen Titel an.");
      return;
    }

    setSaving(true);

    const questions = draft.questions.map((q) => ({
      ...q,
      options: needsOptions(q.type)
        ? (q.options ?? []).filter((o) => o.de.trim() || o.ru.trim())
        : undefined,
    }));

    const { error } = await supabase
      .from("forms")
      .update({
        title_de: draft.title_de.trim(),
        title_ru: draft.title_ru.trim(),
        desc_de: draft.desc_de.trim(),
        desc_ru: draft.desc_ru.trim(),
        event_date: draft.event_date || null,
        event_time: draft.event_time.trim(),
        location: draft.location.trim(),
        emoji: draft.emoji,
        theme: draft.theme,
        capacity: draft.capacity || null,
        closes_at: draft.closes_at || null,
        is_open: draft.is_open,
        questions,
      })
      .eq("id", draft.id);

    setSaving(false);

    if (error) {
      console.error("Form save error:", error);
      toast.error(isRu ? "Не удалось сохранить." : "Speichern fehlgeschlagen.");
      return;
    }

    const next = { ...draft, questions };
    setDraft(next);
    setSaved(next);
    toast.success(isRu ? "Сохранено" : "Gespeichert");
  }

  async function removeForm() {
    if (!draft) return;
    const { error } = await supabase.from("forms").delete().eq("id", draft.id);
    if (error) {
      toast.error(isRu ? "Не удалось удалить." : "Löschen fehlgeschlagen.");
      return;
    }
    router.replace("/forms");
  }

  async function copyLink() {
    if (!draft) return;
    const url = `${window.location.origin}/f/${draft.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(isRu ? "Ссылка скопирована" : "Link kopiert");
    } catch {
      window.prompt(isRu ? "Скопируй ссылку:" : "Link kopieren:", url);
    }
  }

  /* --- ответы --- */

  async function setAttendance(row: ResponseRow, attendance: ResponseRow["attendance"]) {
    const next = row.attendance === attendance ? "registered" : attendance;

    setResponses((current) =>
      current.map((item) => (item.id === row.id ? { ...item, attendance: next } : item)),
    );

    const { error } = await supabase
      .from("form_responses")
      .update({ attendance: next })
      .eq("id", row.id);

    if (error) {
      console.error("Attendance error:", error);
      toast.error(isRu ? "Не удалось сохранить отметку." : "Markierung nicht gespeichert.");
      load();
    }
  }

  async function deleteResponse(row: ResponseRow) {
    const { error } = await supabase.from("form_responses").delete().eq("id", row.id);
    if (error) {
      toast.error(isRu ? "Не удалось удалить." : "Löschen fehlgeschlagen.");
      return;
    }
    setResponses((current) => current.filter((item) => item.id !== row.id));
  }

  async function addManual(first: string, last: string, came: boolean) {
    const { data, error } = await supabase
      .from("form_responses")
      .insert({
        form_id: formId,
        first_name: first.trim(),
        last_name: last.trim(),
        source: "manual",
        attendance: came ? "came" : "registered",
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Manual add error:", error);
      toast.error(isRu ? "Не удалось добавить." : "Hinzufügen fehlgeschlagen.");
      return false;
    }

    setResponses((current) => [...current, data as ResponseRow]);
    return true;
  }

  function exportCsv() {
    if (!draft) return;

    const yes = isRu ? "Да" : "Ja";
    const no = isRu ? "Нет" : "Nein";

    const head = [
      isRu ? "Имя" : "Vorname",
      isRu ? "Фамилия" : "Nachname",
      isRu ? "Явка" : "Anwesenheit",
      isRu ? "Дата записи" : "Angemeldet am",
      ...draft.questions.map((q) => pickText(q.label_de, q.label_ru, lang)),
    ];

    const attendanceLabel = (a: string) =>
      a === "came"
        ? isRu ? "пришёл" : "da"
        : a === "absent"
          ? isRu ? "не пришёл" : "nicht da"
          : "";

    const rows = responses.map((row) => [
      row.first_name,
      row.last_name,
      attendanceLabel(row.attendance),
      new Date(row.created_at).toLocaleString(isRu ? "ru-RU" : "de-DE"),
      ...draft.questions.map((q) => answerText(q, row.answers[q.id], lang, yes, no)),
    ]);

    const csv = [head, ...rows]
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"),
      )
      .join("\r\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(pickText(draft.title_de, draft.title_ru, lang) || "form").replace(/[^a-zA-Z0-9а-яА-ЯäöüÄÖÜß]+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f6] px-4 pt-6">
        <div className="mx-auto h-40 max-w-[640px] animate-pulse rounded-[22px] bg-white" />
      </main>
    );
  }

  if (!draft) {
    return (
      <main className="min-h-screen bg-[#f7f7f6] px-4 pt-6 text-center text-neutral-500">
        {isRu ? "Форма не найдена." : "Formular nicht gefunden."}
      </main>
    );
  }

  const theme = themeOf(draft.theme);
  const titleShown =
    pickText(draft.title_de, draft.title_ru, lang) ||
    (isRu ? "Без названия" : "Ohne Titel");

  const tabs: { key: Tab; label: string }[] = [
    { key: "edit", label: isRu ? "Форма" : "Formular" },
    { key: "answers", label: `${isRu ? "Ответы" : "Antworten"} · ${responses.length}` },
    { key: "checkin", label: isRu ? "Явка" : "Anwesenheit" },
    { key: "stats", label: isRu ? "Статистика" : "Statistik" },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f7f6] pb-32 text-[#111820]">
      <div className="mx-auto w-full max-w-[640px] px-4 pt-5 sm:px-6">
        {/* header */}
        <button
          type="button"
          onClick={() => router.push("/forms")}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500"
        >
          <ArrowLeft size={15} />
          {isRu ? "Все формы" : "Alle Formulare"}
        </button>

        <div
          className={`overflow-hidden rounded-[24px] bg-gradient-to-br ${theme.hero} p-5 text-white`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[34px] leading-none">{draft.emoji}</div>
              <h1 className="mt-2 break-words text-[24px] font-extrabold leading-tight tracking-[-0.03em]">
                {titleShown}
              </h1>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                draft.is_open ? "bg-white text-emerald-700" : "bg-black/25 text-white"
              }`}
            >
              {draft.is_open
                ? isRu ? "открыта" : "offen"
                : isRu ? "закрыта" : "geschlossen"}
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-[13px] font-bold text-[#111820] active:scale-[0.98]"
            >
              <Copy size={14} />
              {isRu ? "Скопировать ссылку" : "Link kopieren"}
            </button>
            <a
              href={`/f/${draft.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/25 px-4 text-[13px] font-bold text-white active:scale-[0.98]"
            >
              <ExternalLink size={14} />
              {isRu ? "Открыть" : "Öffnen"}
            </a>
          </div>
        </div>

        {/* tabs */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition ${
                tab === item.key
                  ? "bg-[#111820] text-white"
                  : "bg-white text-neutral-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-3">
          {tab === "edit" && (
            <EditTab
              draft={draft}
              isRu={isRu}
              patch={patch}
              patchQuestion={patchQuestion}
              moveQuestion={moveQuestion}
              addQuestion={addQuestion}
              addTemplate={() =>
                setDraft((current) =>
                  current
                    ? { ...current, questions: [...current.questions, ...templateQuestions()] }
                    : current,
                )
              }
              removeQuestion={(id) =>
                setDraft((current) =>
                  current
                    ? { ...current, questions: current.questions.filter((q) => q.id !== id) }
                    : current,
                )
              }
              confirmDelete={confirmDelete}
              setConfirmDelete={setConfirmDelete}
              removeForm={removeForm}
            />
          )}

          {tab === "answers" && (
            <AnswersTab
              form={draft}
              responses={responses}
              teenBirth={teenBirth}
              isRu={isRu}
              lang={lang}
              onDelete={deleteResponse}
              onAdd={addManual}
              onExport={exportCsv}
            />
          )}

          {tab === "checkin" && (
            <CheckinTab
              responses={responses}
              teenBirth={teenBirth}
              isRu={isRu}
              onMark={setAttendance}
              onAdd={addManual}
              onReload={load}
            />
          )}

          {tab === "stats" && (
            <StatsTab form={draft} responses={responses} isRu={isRu} lang={lang} />
          )}
        </div>
      </div>

      {/* save bar */}
      {tab === "edit" && dirty && (
        <div className="fixed inset-x-0 bottom-20 z-40 px-4 md:bottom-6">
          <div className="mx-auto flex max-w-[640px] items-center justify-between gap-3 rounded-2xl bg-[#111820] p-3 pl-4 text-white shadow-[0_10px_30px_rgba(17,24,32,0.3)]">
            <span className="text-[13px] font-semibold">
              {isRu ? "Есть несохранённые изменения" : "Ungespeicherte Änderungen"}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-10 rounded-xl bg-white px-5 text-[13px] font-extrabold text-[#111820] disabled:opacity-50"
            >
              {saving ? "…" : isRu ? "Сохранить" : "Speichern"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/* =====================================================================
   ВКЛАДКА «ФОРМА» — настройки и вопросы
===================================================================== */

function EditTab({
  draft,
  isRu,
  patch,
  patchQuestion,
  moveQuestion,
  addQuestion,
  addTemplate,
  removeQuestion,
  confirmDelete,
  setConfirmDelete,
  removeForm,
}: {
  draft: FormRow;
  isRu: boolean;
  patch: (partial: Partial<FormRow>) => void;
  patchQuestion: (id: string, partial: Partial<FormQuestion>) => void;
  moveQuestion: (index: number, delta: number) => void;
  addQuestion: (type?: QuestionType) => void;
  addTemplate: () => void;
  removeQuestion: (id: string) => void;
  confirmDelete: boolean;
  setConfirmDelete: (value: boolean) => void;
  removeForm: () => void;
}) {
  const label = "mb-1.5 block px-0.5 text-[12px] font-bold text-neutral-600";
  const card =
    "rounded-[20px] border border-neutral-200 bg-white p-4 shadow-[0_2px_10px_rgba(17,24,32,0.03)]";

  return (
    <div className="space-y-3">
      {/* оформление */}
      <div className={card}>
        <label className={label}>{isRu ? "Значок" : "Symbol"}</label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => patch({ emoji })}
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-[22px] transition ${
                draft.emoji === emoji
                  ? "bg-[#111820] ring-2 ring-[#111820]"
                  : "bg-neutral-100"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <label className={`${label} mt-4`}>{isRu ? "Цвет страницы" : "Farbe"}</label>
        <div className="flex gap-2">
          {Object.entries(THEMES).map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => patch({ theme: key })}
              aria-label={value.name}
              className={`h-10 flex-1 rounded-xl bg-gradient-to-br ${value.hero} transition ${
                draft.theme === key ? "ring-2 ring-[#111820] ring-offset-2" : ""
              }`}
            />
          ))}
        </div>
      </div>

      {/* название и описание */}
      <div className={`${card} space-y-3`}>
        <div>
          <label className={label}>{isRu ? "Название · русский" : "Titel · Russisch"}</label>
          <input
            value={draft.title_ru}
            onChange={(e) => patch({ title_ru: e.target.value })}
            placeholder="Новогодний праздник"
            className={inputCls}
          />
        </div>
        <div>
          <label className={label}>{isRu ? "Название · немецкий" : "Titel · Deutsch"}</label>
          <input
            value={draft.title_de}
            onChange={(e) => patch({ title_de: e.target.value })}
            placeholder="Weihnachtsfeier"
            className={inputCls}
          />
        </div>
        <div>
          <label className={label}>{isRu ? "Описание · русский" : "Beschreibung · Russisch"}</label>
          <textarea
            value={draft.desc_ru}
            onChange={(e) => patch({ desc_ru: e.target.value })}
            rows={4}
            placeholder={isRu ? "Что будет, что взять с собой…" : ""}
            className={`${inputCls} resize-none`}
          />
        </div>
        <div>
          <label className={label}>{isRu ? "Описание · немецкий" : "Beschreibung · Deutsch"}</label>
          <textarea
            value={draft.desc_de}
            onChange={(e) => patch({ desc_de: e.target.value })}
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      {/* когда и где */}
      <div className={`${card} space-y-3`}>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <div className="min-w-0">
            <label className={label}>{isRu ? "Дата" : "Datum"}</label>
            <DatePicker
              value={draft.event_date ?? ""}
              onChange={(value: string) => patch({ event_date: value || null })}
              placeholder={isRu ? "Выбрать" : "Wählen"}
              clearable={false}
            />
          </div>
          <div className="min-w-0">
            <label className={label}>{isRu ? "Время" : "Uhrzeit"}</label>
            {draft.event_time ? (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <TimePicker
                    value={draft.event_time}
                    onChange={(value: string) => patch({ event_time: value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => patch({ event_time: "" })}
                  aria-label="clear time"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-400 active:bg-neutral-100"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => patch({ event_time: "16:00" })}
                className={`${inputCls} text-left text-neutral-400`}
              >
                {isRu ? "Указать время" : "Zeit angeben"}
              </button>
            )}
          </div>
        </div>

        <div>
          <label className={label}>{isRu ? "Место" : "Ort"}</label>
          <input
            value={draft.location}
            onChange={(e) => patch({ location: e.target.value })}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <div className="min-w-0">
            <label className={label}>{isRu ? "Мест (необязательно)" : "Plätze (optional)"}</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={draft.capacity ?? ""}
              onChange={(e) =>
                patch({ capacity: e.target.value ? Number(e.target.value) : null })
              }
              className={inputCls}
            />
          </div>
          <div className="min-w-0">
            <label className={label}>{isRu ? "Запись до" : "Anmeldung bis"}</label>
            <DatePicker
              value={toLocalDate(draft.closes_at)}
              onChange={(value: string) =>
                patch({
                  closes_at: value ? new Date(`${value}T23:59:00`).toISOString() : null,
                })
              }
              placeholder={isRu ? "Без срока" : "Offen"}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => patch({ is_open: !draft.is_open })}
          className="flex w-full items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 text-left"
        >
          <span className="text-[14px] font-semibold">
            {isRu ? "Приём записей открыт" : "Anmeldung ist offen"}
          </span>
          <span
            className={`relative h-6 w-11 rounded-full transition ${
              draft.is_open ? "bg-emerald-500" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                draft.is_open ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </div>

      {/* вопросы */}
      <div className="px-1 pt-2">
        <h2 className="text-[16px] font-bold">{isRu ? "Вопросы" : "Fragen"}</h2>
        <p className="text-[12px] text-neutral-500">
          {isRu
            ? "Имя и фамилию спрашиваем всегда. Остальное — здесь. Пиши вопрос на обоих языках."
            : "Vor- und Nachname werden immer abgefragt. Alles Weitere hier. Schreibe jede Frage in beiden Sprachen."}
        </p>
      </div>

      {draft.questions.map((q, index) => (
        <div key={q.id} className={`${card} space-y-3`}>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-bold text-neutral-500">
              {index + 1}
            </span>

            <select
              value={q.type}
              onChange={(e) => {
                const type = e.target.value as QuestionType;
                patchQuestion(q.id, {
                  type,
                  options: needsOptions(type)
                    ? q.options?.length
                      ? q.options
                      : [
                          { de: "", ru: "" },
                          { de: "", ru: "" },
                        ]
                    : undefined,
                });
              }}
              className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-[14px] font-semibold outline-none"
            >
              {QUESTION_TYPES.map((item) => (
                <option key={item.type} value={item.type}>
                  {isRu ? item.ru : item.de}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => moveQuestion(index, -1)}
              disabled={index === 0}
              aria-label="up"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 active:bg-neutral-100 disabled:opacity-30"
            >
              <ArrowUp size={16} />
            </button>
            <button
              type="button"
              onClick={() => moveQuestion(index, 1)}
              disabled={index === draft.questions.length - 1}
              aria-label="down"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 active:bg-neutral-100 disabled:opacity-30"
            >
              <ArrowDown size={16} />
            </button>
          </div>

          <input
            value={q.label_ru}
            onChange={(e) => patchQuestion(q.id, { label_ru: e.target.value })}
            placeholder={isRu ? "Вопрос · русский" : "Frage · Russisch"}
            className={inputCls}
          />
          <input
            value={q.label_de}
            onChange={(e) => patchQuestion(q.id, { label_de: e.target.value })}
            placeholder={isRu ? "Вопрос · немецкий" : "Frage · Deutsch"}
            className={inputCls}
          />

          {needsOptions(q.type) && (
            <div className="space-y-2 rounded-xl bg-neutral-50 p-3">
              {(q.options ?? []).map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                    <input
                      value={option.ru}
                      onChange={(e) =>
                        patchQuestion(q.id, {
                          options: (q.options ?? []).map((item, i) =>
                            i === optionIndex ? { ...item, ru: e.target.value } : item,
                          ),
                        })
                      }
                      placeholder="RU"
                      className={`${inputCls} !py-2 !text-[14px]`}
                    />
                    <input
                      value={option.de}
                      onChange={(e) =>
                        patchQuestion(q.id, {
                          options: (q.options ?? []).map((item, i) =>
                            i === optionIndex ? { ...item, de: e.target.value } : item,
                          ),
                        })
                      }
                      placeholder="DE"
                      className={`${inputCls} !py-2 !text-[14px]`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      patchQuestion(q.id, {
                        options: (q.options ?? []).filter((_, i) => i !== optionIndex),
                      })
                    }
                    aria-label="remove option"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 active:bg-neutral-200"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patchQuestion(q.id, {
                    options: [...(q.options ?? []), { de: "", ru: "" }],
                  })
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[12px] font-bold text-neutral-600"
              >
                <Plus size={14} />
                {isRu ? "Добавить вариант" : "Option hinzufügen"}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => patchQuestion(q.id, { required: !q.required })}
              className="flex items-center gap-2 text-[13px] font-semibold text-neutral-600"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${
                  q.required ? "border-[#111820] bg-[#111820]" : "border-neutral-300"
                }`}
              >
                {q.required && <Check size={12} strokeWidth={4} className="text-white" />}
              </span>
              {isRu ? "Обязательный" : "Pflichtfeld"}
            </button>

            <button
              type="button"
              onClick={() => removeQuestion(q.id)}
              aria-label="delete question"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addQuestion("short")}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#111820] px-4 text-[13px] font-bold text-white active:scale-[0.98]"
        >
          <Plus size={15} />
          {isRu ? "Добавить вопрос" : "Frage hinzufügen"}
        </button>

        {draft.questions.length === 0 && (
          <button
            type="button"
            onClick={addTemplate}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-[13px] font-bold text-neutral-700 active:scale-[0.98]"
          >
            {isRu ? "Шаблон «Запись на праздник»" : "Vorlage „Anmeldung zum Fest“"}
          </button>
        )}
      </div>

      {/* удалить */}
      <div className="pt-6">
        {confirmDelete ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3">
            <span className="flex-1 text-[13px] font-semibold text-red-700">
              {isRu
                ? "Удалить форму вместе со всеми ответами?"
                : "Formular mit allen Antworten löschen?"}
            </span>
            <button
              type="button"
              onClick={removeForm}
              className="h-10 rounded-xl bg-red-600 px-4 text-[13px] font-bold text-white"
            >
              {isRu ? "Удалить" : "Löschen"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="h-10 rounded-xl bg-white px-4 text-[13px] font-bold text-neutral-600"
            >
              {isRu ? "Отмена" : "Abbrechen"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-neutral-400 hover:text-red-600"
          >
            <Trash2 size={14} />
            {isRu ? "Удалить форму" : "Formular löschen"}
          </button>
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   ВКЛАДКА «ОТВЕТЫ»
===================================================================== */

function AddPerson({
  isRu,
  onAdd,
  cameDefault,
}: {
  isRu: boolean;
  onAdd: (first: string, last: string, came: boolean) => Promise<boolean>;
  cameDefault: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!first.trim() || busy) return;
    setBusy(true);
    const ok = await onAdd(first, last, cameDefault);
    setBusy(false);
    if (ok) {
      setFirst("");
      setLast("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3.5 text-[13px] font-bold text-neutral-700 active:scale-[0.98]"
      >
        <UserPlus size={15} />
        {cameDefault
          ? isRu ? "Пришёл без записи" : "Ohne Anmeldung gekommen"
          : isRu ? "Добавить вручную" : "Manuell hinzufügen"}
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-neutral-200 bg-white p-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder={isRu ? "Имя" : "Vorname"}
          autoFocus
          className={inputCls}
        />
        <input
          value={last}
          onChange={(e) => setLast(e.target.value)}
          placeholder={isRu ? "Фамилия" : "Nachname"}
          className={inputCls}
        />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-lg bg-neutral-100 px-3 text-[12px] font-bold text-neutral-600"
        >
          {isRu ? "Отмена" : "Abbrechen"}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!first.trim() || busy}
          className="h-9 rounded-lg bg-[#111820] px-4 text-[12px] font-bold text-white disabled:opacity-40"
        >
          {isRu ? "Добавить" : "Hinzufügen"}
        </button>
      </div>
    </div>
  );
}

function AnswersTab({
  form,
  responses,
  teenBirth,
  isRu,
  lang,
  onDelete,
  onAdd,
  onExport,
}: {
  form: FormRow;
  responses: ResponseRow[];
  teenBirth: Record<number, string>;
  isRu: boolean;
  lang: "de" | "ru";
  onDelete: (row: ResponseRow) => void;
  onAdd: (first: string, last: string, came: boolean) => Promise<boolean>;
  onExport: () => void;
}) {
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const q = query.trim().toLowerCase();
  const list = responses.filter(
    (row) => !q || `${row.first_name} ${row.last_name}`.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <AddPerson isRu={isRu} onAdd={onAdd} cameDefault={false} />
        <button
          type="button"
          onClick={onExport}
          disabled={responses.length === 0}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3.5 text-[13px] font-bold text-neutral-700 active:scale-[0.98] disabled:opacity-40"
        >
          <Download size={15} />
          {isRu ? "Скачать таблицу" : "Tabelle laden"}
        </button>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isRu ? "Поиск по имени" : "Nach Namen suchen"}
          className={`${inputCls} !pl-10`}
        />
      </div>

      {list.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-neutral-300 px-5 py-10 text-center text-[14px] text-neutral-400">
          {responses.length === 0
            ? isRu
              ? "Пока никто не записался. Отправь ссылку ребятам!"
              : "Noch keine Anmeldungen. Schick den Link an die Teens!"
            : isRu ? "Никого не найдено." : "Niemand gefunden."}
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 overflow-hidden rounded-[20px] border border-neutral-200 bg-white">
          {list.map((row) => {
            const birth = row.teen_id ? teenBirth[row.teen_id] : null;
            const expanded = openId === row.id;
            const filled = form.questions.filter(
              (item) => row.answers[item.id] !== undefined,
            );

            return (
              <div key={row.id} className="p-3.5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(expanded ? null : row.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-[15px] font-bold">
                        {row.first_name} {row.last_name}
                      </span>
                      {row.teen_id && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {isRu ? "в базе" : "in Datenbank"}
                          {birth ? ` · ${calcAge(birth)}` : ""}
                        </span>
                      )}
                      {row.source === "manual" && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                          {isRu ? "вручную" : "manuell"}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-neutral-400">
                      {new Date(row.created_at).toLocaleString(isRu ? "ru-RU" : "de-DE", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {row.lang ? ` · ${row.lang.toUpperCase()}` : ""}
                      {filled.length > 0 && (isRu ? " · показать ответы" : " · Antworten zeigen")}
                    </div>
                  </button>

                  {confirmId === row.id ? (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(row);
                          setConfirmId(null);
                        }}
                        className="h-9 rounded-lg bg-red-600 px-3 text-[12px] font-bold text-white"
                      >
                        {isRu ? "Удалить" : "Löschen"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="h-9 rounded-lg bg-neutral-100 px-3 text-[12px] font-bold text-neutral-600"
                      >
                        {isRu ? "Нет" : "Nein"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(row.id)}
                      aria-label="delete"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {expanded && (
                  <dl className="mt-3 space-y-2 rounded-xl bg-neutral-50 p-3">
                    {filled.length === 0 ? (
                      <div className="text-[12px] text-neutral-400">
                        {isRu ? "Ответов нет" : "Keine Antworten"}
                      </div>
                    ) : (
                      filled.map((item) => (
                        <div key={item.id}>
                          <dt className="text-[11px] font-bold text-neutral-500">
                            {pickText(item.label_de, item.label_ru, lang)}
                          </dt>
                          <dd className="whitespace-pre-wrap break-words text-[14px]">
                            {answerText(
                              item,
                              row.answers[item.id],
                              lang,
                              isRu ? "Да" : "Ja",
                              isRu ? "Нет" : "Nein",
                            )}
                          </dd>
                        </div>
                      ))
                    )}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   ВКЛАДКА «ЯВКА» — отметка в день мероприятия
===================================================================== */

function CheckinTab({
  responses,
  teenBirth,
  isRu,
  onMark,
  onAdd,
  onReload,
}: {
  responses: ResponseRow[];
  teenBirth: Record<number, string>;
  isRu: boolean;
  onMark: (row: ResponseRow, attendance: ResponseRow["attendance"]) => void;
  onAdd: (first: string, last: string, came: boolean) => Promise<boolean>;
  onReload: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "registered" | "came" | "absent">("all");
  const [query, setQuery] = useState("");

  const came = responses.filter((r) => r.attendance === "came").length;
  const absent = responses.filter((r) => r.attendance === "absent").length;
  const waiting = responses.length - came - absent;

  const q = query.trim().toLowerCase();
  const list = responses
    .filter((row) => filter === "all" || row.attendance === filter)
    .filter((row) => !q || `${row.first_name} ${row.last_name}`.toLowerCase().includes(q))
    .sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
    );

  const chips: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: isRu ? "Все" : "Alle", count: responses.length },
    { key: "registered", label: isRu ? "Не отмечены" : "Offen", count: waiting },
    { key: "came", label: isRu ? "Пришли" : "Da", count: came },
    { key: "absent", label: isRu ? "Не пришли" : "Nicht da", count: absent },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-emerald-50 p-3 text-center">
          <div className="text-[24px] font-extrabold text-emerald-700">{came}</div>
          <div className="text-[11px] font-bold text-emerald-700/80">
            {isRu ? "пришли" : "da"}
          </div>
        </div>
        <div className="rounded-2xl bg-rose-50 p-3 text-center">
          <div className="text-[24px] font-extrabold text-rose-600">{absent}</div>
          <div className="text-[11px] font-bold text-rose-600/80">
            {isRu ? "не пришли" : "nicht da"}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-neutral-200">
          <div className="text-[24px] font-extrabold text-neutral-700">{waiting}</div>
          <div className="text-[11px] font-bold text-neutral-400">
            {isRu ? "ждём" : "offen"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AddPerson isRu={isRu} onAdd={onAdd} cameDefault={true} />
        <button
          type="button"
          onClick={onReload}
          className="h-10 rounded-xl px-3 text-[12px] font-bold text-neutral-400"
        >
          {isRu ? "Обновить" : "Aktualisieren"}
        </button>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isRu ? "Поиск по имени" : "Nach Namen suchen"}
          className={`${inputCls} !pl-10`}
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter(chip.key)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-bold ${
              filter === chip.key ? "bg-[#111820] text-white" : "bg-white text-neutral-500"
            }`}
          >
            {chip.label} · {chip.count}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-neutral-300 px-5 py-10 text-center text-[14px] text-neutral-400">
          {isRu ? "Здесь пока никого." : "Hier ist noch niemand."}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((row) => {
            const birth = row.teen_id ? teenBirth[row.teen_id] : null;
            return (
              <div
                key={row.id}
                className={`flex items-center gap-2 rounded-[18px] border bg-white p-2.5 pl-4 ${
                  row.attendance === "came"
                    ? "border-emerald-200"
                    : row.attendance === "absent"
                      ? "border-rose-200"
                      : "border-neutral-200"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">
                    {row.first_name} {row.last_name}
                  </div>
                  {birth && (
                    <div className="text-[11px] text-neutral-400">
                      {calcAge(birth)} {isRu ? "лет" : "Jahre"}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onMark(row, "came")}
                  className={`flex h-12 w-14 items-center justify-center rounded-2xl transition active:scale-95 ${
                    row.attendance === "came"
                      ? "bg-emerald-500 text-white"
                      : "bg-neutral-100 text-neutral-400"
                  }`}
                  aria-label={isRu ? "Пришёл" : "Da"}
                >
                  <UserCheck size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => onMark(row, "absent")}
                  className={`flex h-12 w-14 items-center justify-center rounded-2xl transition active:scale-95 ${
                    row.attendance === "absent"
                      ? "bg-rose-500 text-white"
                      : "bg-neutral-100 text-neutral-400"
                  }`}
                  aria-label={isRu ? "Не пришёл" : "Nicht da"}
                >
                  <UserX size={22} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   ВКЛАДКА «СТАТИСТИКА»
===================================================================== */

function Bar({ label, count, total, tone }: { label: string; count: number; total: number; tone: string }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 truncate font-semibold text-neutral-700">{label}</span>
        <span className="shrink-0 font-bold text-neutral-500">
          {count} · {percent}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function StatsTab({
  form,
  responses,
  isRu,
  lang,
}: {
  form: FormRow;
  responses: ResponseRow[];
  isRu: boolean;
  lang: "de" | "ru";
}) {
  const total = responses.length;
  const came = responses.filter((r) => r.attendance === "came").length;
  const absent = responses.filter((r) => r.attendance === "absent").length;
  const marked = came + absent;
  const rate = marked > 0 ? Math.round((came / marked) * 100) : 0;
  const fromLink = responses.filter((r) => r.source === "link").length;
  const walkIns = responses.filter((r) => r.source === "manual" && r.attendance === "came").length;
  const russian = responses.filter((r) => r.lang === "ru").length;
  const german = responses.filter((r) => r.lang === "de").length;

  const card = "rounded-[20px] border border-neutral-200 bg-white p-4";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className={card}>
          <div className="text-[30px] font-extrabold leading-none">
            {total}
            {form.capacity ? <span className="text-[16px] text-neutral-400"> / {form.capacity}</span> : null}
          </div>
          <div className="mt-1 text-[12px] font-semibold text-neutral-500">
            {isRu ? "записалось" : "angemeldet"}
          </div>
          {form.capacity ? (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-neutral-900"
                style={{ width: `${Math.min(100, Math.round((total / form.capacity) * 100))}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className={card}>
          <div className="text-[30px] font-extrabold leading-none text-emerald-600">
            {came}
            {marked > 0 && <span className="text-[16px] text-neutral-400"> · {rate}%</span>}
          </div>
          <div className="mt-1 text-[12px] font-semibold text-neutral-500">
            {isRu ? "пришли (из отмеченных)" : "waren da (von markierten)"}
          </div>
        </div>
      </div>

      <div className={`${card} space-y-3`}>
        <h3 className="flex items-center gap-2 text-[14px] font-bold">
          <BarChart3 size={16} />
          {isRu ? "Общая картина" : "Überblick"}
        </h3>
        <Bar label={isRu ? "Пришли" : "Da"} count={came} total={total} tone="bg-emerald-500" />
        <Bar label={isRu ? "Не пришли" : "Nicht da"} count={absent} total={total} tone="bg-rose-400" />
        <Bar label={isRu ? "Не отмечены" : "Nicht markiert"} count={total - marked} total={total} tone="bg-neutral-300" />
        <div className="grid grid-cols-2 gap-2 pt-1 text-[12px] text-neutral-500">
          <div>{isRu ? "Записались по ссылке" : "Per Link"}: <b className="text-neutral-800">{fromLink}</b></div>
          <div>{isRu ? "Пришли без записи" : "Ohne Anmeldung"}: <b className="text-neutral-800">{walkIns}</b></div>
          <div>RU: <b className="text-neutral-800">{russian}</b></div>
          <div>DE: <b className="text-neutral-800">{german}</b></div>
        </div>
      </div>

      {form.questions.map((q) => {
        const answered = responses.filter((r) => r.answers[q.id] !== undefined);
        const title = pickText(q.label_de, q.label_ru, lang);

        let body: React.ReactNode = null;

        if (q.type === "yesno") {
          const yes = answered.filter((r) => r.answers[q.id] === true).length;
          body = (
            <div className="space-y-3">
              <Bar label={isRu ? "Да" : "Ja"} count={yes} total={answered.length} tone="bg-emerald-500" />
              <Bar label={isRu ? "Нет" : "Nein"} count={answered.length - yes} total={answered.length} tone="bg-neutral-400" />
            </div>
          );
        } else if (q.type === "single" || q.type === "multi") {
          body = (
            <div className="space-y-3">
              {(q.options ?? []).map((option, index) => {
                const count = answered.filter((r) => {
                  const value = r.answers[q.id];
                  const keys = [option.de, option.ru].filter(Boolean);
                  return Array.isArray(value)
                    ? (value as string[]).some((item) => keys.includes(item))
                    : keys.includes(String(value));
                }).length;
                return (
                  <Bar
                    key={index}
                    label={pickText(option.de, option.ru, lang)}
                    count={count}
                    total={answered.length}
                    tone="bg-[#111820]"
                  />
                );
              })}
            </div>
          );
        } else if (q.type === "number") {
          const nums = answered.map((r) => Number(r.answers[q.id])).filter((n) => Number.isFinite(n));
          const sum = nums.reduce((a, b) => a + b, 0);
          body = (
            <div className="flex gap-6 text-[13px] text-neutral-500">
              <div>{isRu ? "Сумма" : "Summe"}: <b className="text-[18px] text-neutral-900">{sum}</b></div>
              <div>
                {isRu ? "Среднее" : "Schnitt"}:{" "}
                <b className="text-[18px] text-neutral-900">
                  {nums.length ? (sum / nums.length).toFixed(1).replace(/\.0$/, "") : "–"}
                </b>
              </div>
            </div>
          );
        } else {
          body = (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto text-[13px] text-neutral-600">
              {answered.map((r) => (
                <li key={r.id} className="rounded-lg bg-neutral-50 px-3 py-2">
                  <span className="font-bold text-neutral-800">{r.first_name}: </span>
                  {String(r.answers[q.id])}
                </li>
              ))}
              {answered.length === 0 && <li className="text-neutral-400">–</li>}
            </ul>
          );
        }

        return (
          <div key={q.id} className={card}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="min-w-0 text-[14px] font-bold">{title || "–"}</h3>
              <span className="shrink-0 text-[11px] font-semibold text-neutral-400">
                {answered.length}/{total}
              </span>
            </div>
            {body}
          </div>
        );
      })}
    </div>
  );
}