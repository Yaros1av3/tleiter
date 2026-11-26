"use client";

import { useCallback, useEffect, useState } from "react";
import { Bug, Check, HelpCircle, Lightbulb, MessageSquare, RotateCcw, Trash2, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Kind = "idea" | "bug" | "question";

type Row = {
  id: number;
  first_name: string;
  last_name: string;
  kind: Kind;
  message: string;
  status: "new" | "done";
  created_at: string;
};

const KIND_ICON = { idea: Lightbulb, bug: Bug, question: HelpCircle } as const;

/* Для служителей: сообщения подростков из приложения (кнопка со счётчиком новых) */
export default function TeensFeedbackAdmin() {
  const { language } = useLanguage();
  const isRu = language === "ru";
  const t = (ru: string, de: string) => (isRu ? ru : de);

  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"new" | "done">("new");
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("teen_feedback")
      .select("id, first_name, last_name, kind, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("teen_feedback:", error.message);
      setFailed(true);
      return;
    }

    setFailed(false);
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kindLabel = (k: Kind) => (k === "idea" ? t("Идея", "Idee") : k === "bug" ? t("Ошибка", "Fehler") : t("Вопрос", "Frage"));

  async function setStatus(row: Row, status: "new" | "done") {
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status } : r)));
    const { error } = await supabase.from("teen_feedback").update({ status }).eq("id", row.id);
    if (error) void load();
  }

  async function remove(row: Row) {
    if (!window.confirm(t("Удалить сообщение?", "Nachricht löschen?"))) return;
    setRows((list) => list.filter((r) => r.id !== row.id));
    const { error } = await supabase.from("teen_feedback").delete().eq("id", row.id);
    if (error) void load();
  }

  const fresh = rows.filter((r) => r.status === "new").length;
  const shown = rows.filter((r) => r.status === filter);

  const date = (iso: string) =>
    new Date(iso).toLocaleString(isRu ? "ru-RU" : "de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void load();
        }}
        aria-label={t("Сообщения подростков", "Nachrichten der Teens")}
        className="relative mr-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-700 shadow-sm ring-1 ring-neutral-200 transition active:scale-95"
      >
        <MessageSquare size={17} />
        {fresh > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {fresh}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[19px] font-bold tracking-[-0.02em]">{t("Сообщения подростков", "Nachrichten der Teens")}</h2>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                <X size={17} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-neutral-100 p-1">
              {(
                [
                  ["new", t("Новые", "Neu"), rows.filter((r) => r.status === "new").length],
                  ["done", t("Готово", "Erledigt"), rows.filter((r) => r.status === "done").length],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`h-9 rounded-xl text-[13px] font-semibold transition ${filter === key ? "bg-white shadow-sm" : "text-neutral-500"}`}
                >
                  {label} · {count}
                </button>
              ))}
            </div>

            {failed && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[13px] text-amber-800">
                {t("Не удалось загрузить. Проверь, что SQL teens-feedback.sql выполнен.", "Konnte nicht geladen werden. Wurde teens-feedback.sql ausgeführt?")}
              </p>
            )}

            {!failed && shown.length === 0 && (
              <p className="py-10 text-center text-[14px] text-neutral-400">{t("Здесь пока пусто", "Hier ist noch nichts")}</p>
            )}

            <div className="mt-4 space-y-3">
              {shown.map((row) => {
                const Icon = KIND_ICON[row.kind];
                return (
                  <div key={row.id} className="rounded-2xl bg-neutral-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold ring-1 ring-neutral-200">
                        <Icon size={12} />
                        {kindLabel(row.kind)}
                      </span>
                      <span className="text-[11px] text-neutral-400">{date(row.created_at)}</span>
                    </div>

                    <p className="mt-2 text-[14px] font-bold">
                      {row.first_name} {row.last_name}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[14px] leading-[1.5] text-neutral-700">{row.message}</p>

                    <div className="mt-3 flex gap-2">
                      {row.status === "new" ? (
                        <button
                          type="button"
                          onClick={() => setStatus(row, "done")}
                          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-neutral-950 text-[12px] font-semibold text-white"
                        >
                          <Check size={14} />
                          {t("Готово", "Erledigt")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStatus(row, "new")}
                          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white text-[12px] font-semibold ring-1 ring-neutral-200"
                        >
                          <RotateCcw size={13} />
                          {t("Вернуть в новые", "Zurück zu neu")}
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={t("Удалить", "Löschen")}
                        onClick={() => remove(row)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-neutral-400 ring-1 ring-neutral-200"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}