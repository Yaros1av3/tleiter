"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  Download,
  ListChecks,
  Plus,
  Settings2,
  Share2,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type AttendanceEntry = {
  id: number;
  entry_date: string;
  topic: string | null;
  attendee_count: number | null;
};

type ShoppingItem = {
  id: number;
  title: string;
  note: string | null;
  is_purchased: boolean;
  created_at: string;
};

const PAST_WEEKS = 8;
const INITIAL_FUTURE_WEEKS = 12;
const LOAD_MORE_WEEKS = 12;

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0",
  );
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addWeeks(date: Date, weeks: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/*
 * Настройка по умолчанию — вторник (0 = воскресенье, 2 = вторник).
 */
const DEFAULT_WEEKDAYS = [2];

const WEEKDAY_LABELS_RU = [
  "Вс",
  "Пн",
  "Вт",
  "Ср",
  "Чт",
  "Пт",
  "Сб",
];

const WEEKDAY_LABELS_DE = [
  "So",
  "Mo",
  "Di",
  "Mi",
  "Do",
  "Fr",
  "Sa",
];

/*
 * Все даты в диапазоне [start, end], день недели которых
 * входит в weekdays (0 = воскресенье ... 6 = суббота).
 */
function getMatchingDatesInRange(
  start: Date,
  end: Date,
  weekdays: number[],
) {
  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    if (weekdays.includes(cursor.getDay())) {
      dates.push(toDateString(cursor));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export default function TeeniePlusPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isRu = language === "ru";

  const [tab, setTab] = useState<
    "attendance" | "shopping"
  >("attendance");

  /* ================= ПОСЕЩАЕМОСТЬ ================= */

  const [entries, setEntries] = useState<
    AttendanceEntry[]
  >([]);

  const [loadingAttendance, setLoadingAttendance] =
    useState(true);

  const [horizonWeeks, setHorizonWeeks] = useState(
    INITIAL_FUTURE_WEEKS,
  );

  const [loadingMore, setLoadingMore] = useState(false);

  const [weekdays, setWeekdays] = useState<number[]>(
    DEFAULT_WEEKDAYS,
  );

  const [settingsOpen, setSettingsOpen] = useState(
    false,
  );

  const [draftWeekdays, setDraftWeekdays] = useState<
    number[]
  >(DEFAULT_WEEKDAYS);

  const [savingSettings, setSavingSettings] =
    useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    initAttendance();
  }, []);

  async function loadWeekdaySettings() {
    const { data, error } = await supabase
      .from("teenie_attendance_settings")
      .select("weekdays")
      .eq("id", 1)
      .single();

    if (error || !data) {
      console.error(
        "Teenie+ loadWeekdaySettings:",
        error,
      );
      return DEFAULT_WEEKDAYS;
    }

    return data.weekdays?.length
      ? data.weekdays
      : DEFAULT_WEEKDAYS;
  }

  async function saveWeekdaySettings() {
    if (draftWeekdays.length === 0) return;

    setSavingSettings(true);

    const { error } = await supabase
      .from("teenie_attendance_settings")
      .update({
        weekdays: draftWeekdays,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error(
        "Teenie+ saveWeekdaySettings:",
        error,
      );
    } else {
      setWeekdays(draftWeekdays);

      /*
       * Новые дни недели применяются к будущим датам —
       * существующие записи (в том числе прошлые) не трогаем.
       */
      await ensureRecurringDates(
        new Date(),
        addWeeks(new Date(), horizonWeeks),
        draftWeekdays,
      );

      await loadAttendance();
    }

    setSavingSettings(false);
    setSettingsOpen(false);
  }

  function toggleDraftWeekday(day: number) {
    setDraftWeekdays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort(),
    );
  }

  async function ensureRecurringDates(
    start: Date,
    end: Date,
    activeWeekdays: number[],
  ) {
    const dates = getMatchingDatesInRange(
      start,
      end,
      activeWeekdays,
    );

    if (dates.length === 0) return;

    const rows = dates.map((entry_date) => ({
      entry_date,
    }));

    const { error } = await supabase
      .from("teenie_attendance_entries")
      .upsert(rows, {
        onConflict: "entry_date",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(
        "Teenie+ ensureRecurringDates:",
        error,
      );
    }
  }

  async function loadAttendance() {
    const { data, error } = await supabase
      .from("teenie_attendance_entries")
      .select(
        "id, entry_date, topic, attendee_count",
      )
      .order("entry_date", { ascending: true });

    if (error) {
      console.error(
        "Teenie+ loadAttendance:",
        error,
      );
      return;
    }

    setEntries(data ?? []);
  }

  async function initAttendance() {
    setLoadingAttendance(true);

    const savedWeekdays =
      await loadWeekdaySettings();

    setWeekdays(savedWeekdays);
    setDraftWeekdays(savedWeekdays);

    await ensureRecurringDates(
      addWeeks(new Date(), -PAST_WEEKS),
      addWeeks(new Date(), INITIAL_FUTURE_WEEKS),
      savedWeekdays,
    );

    await loadAttendance();

    setLoadingAttendance(false);
  }

  async function loadMoreAttendance() {
    if (loadingMore) return;

    setLoadingMore(true);

    const newHorizon =
      horizonWeeks + LOAD_MORE_WEEKS;

    await ensureRecurringDates(
      addWeeks(new Date(), horizonWeeks),
      addWeeks(new Date(), newHorizon),
      weekdays,
    );

    setHorizonWeeks(newHorizon);
    await loadAttendance();

    setLoadingMore(false);
  }

  useEffect(() => {
    if (
      tab !== "attendance" ||
      loadingAttendance
    ) {
      return;
    }

    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (
          observerEntries[0]?.isIntersecting
        ) {
          loadMoreAttendance();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loadingAttendance, horizonWeeks]);

  async function updateEntry(
    id: number,
    patch: Partial<AttendanceEntry>,
  ) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? { ...entry, ...patch }
          : entry,
      ),
    );

    const { error } = await supabase
      .from("teenie_attendance_entries")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error(
        "Teenie+ updateEntry:",
        error,
      );
    }
  }

  const groupedEntries = useMemo(() => {
    const groups = new Map<
      string,
      AttendanceEntry[]
    >();

    for (const entry of entries) {
      const key = entry.entry_date.slice(0, 7);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(entry);
    }

    return Array.from(groups.entries());
  }, [entries]);

  function formatMonthLabel(key: string) {
    const [year, month] = key
      .split("-")
      .map(Number);

    const date = new Date(year, month - 1, 1);

    return date.toLocaleDateString(
      isRu ? "ru-RU" : "de-DE",
      { month: "long", year: "numeric" },
    );
  }

  function formatDayLabel(dateString: string) {
    const date = new Date(
      `${dateString}T00:00:00`,
    );

    return date.toLocaleDateString(
      isRu ? "ru-RU" : "de-DE",
      { day: "2-digit", month: "2-digit" },
    );
  }

  const todayString = toDateString(new Date());

  /* ================= СПИСОК ПОКУПОК ================= */

  const [items, setItems] = useState<
    ShoppingItem[]
  >([]);

  const [loadingShopping, setLoadingShopping] =
    useState(true);

  const [newItemTitle, setNewItemTitle] =
    useState("");

  const [newItemNote, setNewItemNote] =
    useState("");

  useEffect(() => {
    loadShopping();
  }, []);

  async function loadShopping() {
    setLoadingShopping(true);

    const { data, error } = await supabase
      .from("teenie_shopping_items")
      .select(
        "id, title, note, is_purchased, created_at",
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "Teenie+ loadShopping:",
        error,
      );
    } else {
      setItems(data ?? []);
    }

    setLoadingShopping(false);
  }

  async function addItem() {
    const title = newItemTitle.trim();

    if (!title) return;

    const note = newItemNote.trim() || null;

    const { data, error } = await supabase
      .from("teenie_shopping_items")
      .insert({ title, note })
      .select(
        "id, title, note, is_purchased, created_at",
      )
      .single();

    if (error) {
      console.error(
        "Teenie+ addItem:",
        error,
      );
      return;
    }

    if (data) {
      setItems((current) => [...current, data]);
    }

    setNewItemTitle("");
    setNewItemNote("");
  }

  async function togglePurchased(
    item: ShoppingItem,
  ) {
    const nextValue = !item.is_purchased;

    setItems((current) =>
      current.map((current_item) =>
        current_item.id === item.id
          ? {
              ...current_item,
              is_purchased: nextValue,
            }
          : current_item,
      ),
    );

    const { error } = await supabase
      .from("teenie_shopping_items")
      .update({ is_purchased: nextValue })
      .eq("id", item.id);

    if (error) {
      console.error(
        "Teenie+ togglePurchased:",
        error,
      );
    }
  }

  async function deleteItem(id: number) {
    setItems((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    );

    const { error } = await supabase
      .from("teenie_shopping_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Teenie+ deleteItem:",
        error,
      );
    }
  }

  const pendingItems = items.filter(
    (item) => !item.is_purchased,
  );

  const purchasedItems = items.filter(
    (item) => item.is_purchased,
  );

  function buildShoppingListText() {
    const dateLabel = new Date().toLocaleDateString(
      isRu ? "ru-RU" : "de-DE",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    );

    const header = isRu
      ? `Список покупок — TLight (${dateLabel})`
      : `Einkaufsliste — TLight (${dateLabel})`;

    const lines = pendingItems.map(
      (item) =>
        `• ${item.title}${
          item.note ? ` — ${item.note}` : ""
        }`,
    );

    if (lines.length === 0) {
      lines.push(
        isRu
          ? "Список пуст."
          : "Liste ist leer.",
      );
    }

    return [header, "", ...lines].join("\n");
  }

  function downloadShoppingList() {
    const text = buildShoppingListText();
    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `einkaufsliste-${toDateString(
      new Date(),
    )}.txt`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function shareShoppingList() {
    const text = buildShoppingListText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: isRu
            ? "Список покупок"
            : "Einkaufsliste",
          text,
        });
      } catch {
        /* пользователь отменил — ничего не делаем */
      }

      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      alert(
        isRu
          ? "Список скопирован в буфер обмена."
          : "Liste wurde in die Zwischenablage kopiert.",
      );
    } catch (error) {
      console.error(
        "Teenie+ shareShoppingList:",
        error,
      );
    }
  }

  /* ================= РЕНДЕР ================= */

  return (
    <main className="min-h-screen bg-[#f7f7f6] text-neutral-900">
      <header className="sticky top-0 z-30 border-b border-[#e6e7e8] bg-[#f7f7f6]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[760px] items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dfe2e5] bg-white text-[#374353]"
            aria-label={
              isRu ? "Назад" : "Zurück"
            }
          >
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0">
            <div className="text-[19px] font-bold leading-none tracking-[-0.03em] text-[#111820]">
              Teenie+
            </div>

            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a939d]">
              {isRu
                ? "Посещаемость и покупки"
                : "Anwesenheit und Einkauf"}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[760px] px-4 pb-32 pt-5 sm:px-6">
        {/* TABS */}
        <div className="mb-5 flex gap-2 rounded-[16px] border border-[#e2e5e8] bg-white p-1.5">
          <button
            type="button"
            onClick={() =>
              setTab("attendance")
            }
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-[13px] font-semibold transition ${
              tab === "attendance"
                ? "bg-[#111820] text-white"
                : "text-[#65707d]"
            }`}
          >
            <Calendar size={15} />
            {isRu ? "Посещаемость" : "Anwesenheit"}
          </button>

          <button
            type="button"
            onClick={() => setTab("shopping")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-[13px] font-semibold transition ${
              tab === "shopping"
                ? "bg-[#111820] text-white"
                : "text-[#65707d]"
            }`}
          >
            <ShoppingCart size={15} />
            {isRu ? "Покупки" : "Einkauf"}
          </button>
        </div>

        {/* ================= ATTENDANCE TAB ================= */}
        {tab === "attendance" && (
          <div>
            {/* WEEKDAY SETTINGS */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  setDraftWeekdays(weekdays);
                  setSettingsOpen(
                    (value) => !value,
                  );
                }}
                className="flex w-full items-center justify-between rounded-[14px] border border-[#e6e8ea] bg-white px-3.5 py-2.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <Settings2
                    size={14}
                    className="text-[#8a939d]"
                  />

                  <span className="text-[12px] font-semibold text-[#65707d]">
                    {isRu
                      ? "Дни занятий:"
                      : "Tage der Treffen:"}{" "}
                    <span className="text-[#111820]">
                      {weekdays
                        .map(
                          (day) =>
                            (isRu
                              ? WEEKDAY_LABELS_RU
                              : WEEKDAY_LABELS_DE)[
                              day
                            ],
                        )
                        .join(", ")}
                    </span>
                  </span>
                </div>

                <span className="text-[11px] font-semibold text-[#9aa2ad]">
                  {isRu
                    ? "Изменить"
                    : "Ändern"}
                </span>
              </button>

              {settingsOpen && (
                <div className="mt-2 rounded-[14px] border border-[#e6e8ea] bg-white p-3.5">
                  <p className="mb-3 text-[11px] text-[#9aa2ad]">
                    {isRu
                      ? "Выбери один или несколько дней недели — по ним будут автоматически создаваться строки в таблице ниже. Уже созданные строки не изменятся."
                      : "Wähle einen oder mehrere Wochentage — dafür werden unten automatisch Zeilen angelegt. Bereits vorhandene Zeilen bleiben unverändert."}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {(isRu
                      ? WEEKDAY_LABELS_RU
                      : WEEKDAY_LABELS_DE
                    ).map((label, day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          toggleDraftWeekday(day)
                        }
                        className={`rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition ${
                          draftWeekdays.includes(
                            day,
                          )
                            ? "bg-[#111820] text-white"
                            : "bg-[#f1f2f3] text-[#65707d]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsOpen(false)
                      }
                      className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[#9aa2ad]"
                    >
                      {isRu
                        ? "Отмена"
                        : "Abbrechen"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        savingSettings ||
                        draftWeekdays.length ===
                          0
                      }
                      onClick={
                        saveWeekdaySettings
                      }
                      className="rounded-[10px] bg-[#111820] px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      {savingSettings
                        ? isRu
                          ? "Сохранение..."
                          : "Speichern..."
                        : isRu
                          ? "Сохранить"
                          : "Speichern"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {loadingAttendance ? (
              <div className="h-[300px] animate-pulse rounded-[20px] bg-white" />
            ) : (
              <>
                {groupedEntries.map(
                  ([monthKey, monthEntries]) => (
                    <div
                      key={monthKey}
                      className="mb-5"
                    >
                      <div className="sticky top-[68px] z-10 -mx-1 mb-2 bg-[#f7f7f6] px-1 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a939d]">
                        {formatMonthLabel(
                          monthKey,
                        )}
                      </div>

                      <div className="overflow-hidden rounded-[18px] border border-[#e6e8ea] bg-white">
                        {/* HEADER ROW */}
                        <div className="flex items-center gap-2 border-b border-[#eceef0] bg-[#fafafa] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#9aa2ad]">
                          <div className="w-[68px] shrink-0">
                            {isRu
                              ? "Дата"
                              : "Datum"}
                          </div>

                          <div className="flex-1">
                            {isRu
                              ? "Тема"
                              : "Thema"}
                          </div>

                          <div className="w-[56px] shrink-0 text-right">
                            {isRu
                              ? "Чел."
                              : "Anz."}
                          </div>
                        </div>

                        {monthEntries.map(
                          (entry, index) => (
                            <div
                              key={entry.id}
                              className={`flex items-center gap-2 px-3 py-2.5 ${
                                index > 0
                                  ? "border-t border-[#f0f1f2]"
                                  : ""
                              } ${
                                entry.entry_date ===
                                todayString
                                  ? "bg-amber-50"
                                  : ""
                              }`}
                            >
                              <input
                                type="date"
                                value={
                                  entry.entry_date
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateEntry(
                                    entry.id,
                                    {
                                      entry_date:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                                className="w-[68px] shrink-0 truncate rounded-[8px] border border-transparent bg-transparent text-[12px] font-semibold text-[#374353] outline-none focus:border-[#dfe1e4] focus:bg-[#fafafa]"
                              />

                              <input
                                type="text"
                                defaultValue={
                                  entry.topic ??
                                  ""
                                }
                                placeholder={
                                  isRu
                                    ? "Тема..."
                                    : "Thema..."
                                }
                                onBlur={(
                                  event,
                                ) => {
                                  const value =
                                    event.target.value.trim();

                                  if (
                                    value !==
                                    (entry.topic ??
                                      "")
                                  ) {
                                    updateEntry(
                                      entry.id,
                                      {
                                        topic:
                                          value ||
                                          null,
                                      },
                                    );
                                  }
                                }}
                                className="min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-[#111820] outline-none placeholder:text-[#c7cbd1] focus:border-[#dfe1e4] focus:bg-[#fafafa]"
                              />

                              <input
                                type="number"
                                min={0}
                                defaultValue={
                                  entry.attendee_count ??
                                  ""
                                }
                                placeholder="—"
                                onBlur={(
                                  event,
                                ) => {
                                  const raw =
                                    event.target
                                      .value;

                                  const value =
                                    raw === ""
                                      ? null
                                      : Number(
                                          raw,
                                        );

                                  if (
                                    value !==
                                    entry.attendee_count
                                  ) {
                                    updateEntry(
                                      entry.id,
                                      {
                                        attendee_count:
                                          value,
                                      },
                                    );
                                  }
                                }}
                                className="w-[56px] shrink-0 rounded-[8px] border border-transparent bg-transparent px-1 py-1 text-right text-[13px] font-semibold text-[#111820] outline-none placeholder:text-[#c7cbd1] focus:border-[#dfe1e4] focus:bg-[#fafafa]"
                              />
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ),
                )}

                {/* INFINITE SCROLL SENTINEL */}
                <div
                  ref={sentinelRef}
                  className="flex justify-center py-6"
                >
                  {loadingMore && (
                    <span className="text-[12px] text-[#9aa2ad]">
                      {isRu
                        ? "Загрузка..."
                        : "Wird geladen..."}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= SHOPPING TAB ================= */}
        {tab === "shopping" && (
          <div>
            {/* ADD FORM */}
            <div className="mb-4 rounded-[18px] border border-[#e6e8ea] bg-white p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(event) =>
                    setNewItemTitle(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      addItem();
                    }
                  }}
                  placeholder={
                    isRu
                      ? "Что купить?"
                      : "Was einkaufen?"
                  }
                  className="h-11 min-w-0 flex-1 rounded-[12px] border border-[#e2e5e8] bg-[#fafafa] px-3 text-[14px] outline-none placeholder:text-[#b1b7bf] focus:border-[#111820] focus:bg-white"
                />

                <input
                  type="text"
                  value={newItemNote}
                  onChange={(event) =>
                    setNewItemNote(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      addItem();
                    }
                  }}
                  placeholder={
                    isRu
                      ? "Кол-во..."
                      : "Menge..."
                  }
                  className="h-11 w-[100px] shrink-0 rounded-[12px] border border-[#e2e5e8] bg-[#fafafa] px-3 text-[14px] outline-none placeholder:text-[#b1b7bf] focus:border-[#111820] focus:bg-white"
                />

                <button
                  type="button"
                  onClick={addItem}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#111820] text-white active:scale-95"
                  aria-label={
                    isRu
                      ? "Добавить"
                      : "Hinzufügen"
                  }
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* ACTIONS */}
            {items.length > 0 && (
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={downloadShoppingList}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[13px] border border-[#e2e5e8] bg-white py-2.5 text-[12px] font-semibold text-[#374353] active:bg-[#f4f5f5]"
                >
                  <Download size={14} />
                  {isRu ? "Скачать" : "Herunterladen"}
                </button>

                <button
                  type="button"
                  onClick={shareShoppingList}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[13px] bg-[#111820] py-2.5 text-[12px] font-semibold text-white active:scale-[0.98]"
                >
                  <Share2 size={14} />
                  {isRu
                    ? "Отправить лидерам"
                    : "An Leiter senden"}
                </button>
              </div>
            )}

            {loadingShopping ? (
              <div className="h-[200px] animate-pulse rounded-[18px] bg-white" />
            ) : items.length === 0 ? (
              <div className="rounded-[18px] border border-[#e6e8ea] bg-white px-6 py-12 text-center">
                <ListChecks
                  size={26}
                  className="mx-auto text-neutral-300"
                />

                <p className="mt-3 text-[13px] text-neutral-400">
                  {isRu
                    ? "Список пока пуст — добавь первый пункт выше."
                    : "Die Liste ist noch leer — füge oben den ersten Punkt hinzu."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingItems.length > 0 && (
                  <div className="overflow-hidden rounded-[18px] border border-[#e6e8ea] bg-white">
                    {pendingItems.map(
                      (item, index) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-3 py-3 ${
                            index > 0
                              ? "border-t border-[#f0f1f2]"
                              : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              togglePurchased(
                                item,
                              )
                            }
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#dfe1e4] active:bg-[#f4f5f5]"
                            aria-label={
                              isRu
                                ? "Отметить купленным"
                                : "Als gekauft markieren"
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14px] font-semibold text-[#111820]">
                              {item.title}
                            </div>

                            {item.note && (
                              <div className="truncate text-[11px] text-[#9aa2ad]">
                                {item.note}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              deleteItem(item.id)
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[#c7cbd1] active:bg-[#f4f5f5]"
                            aria-label={
                              isRu
                                ? "Удалить"
                                : "Löschen"
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                )}

                {purchasedItems.length > 0 && (
                  <div>
                    <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#c7cbd1]">
                      {isRu
                        ? "Уже куплено"
                        : "Schon gekauft"}
                    </div>

                    <div className="overflow-hidden rounded-[18px] border border-[#e6e8ea] bg-[#fafafa]">
                      {purchasedItems.map(
                        (item, index) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 px-3 py-3 ${
                              index > 0
                                ? "border-t border-[#eceef0]"
                                : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                togglePurchased(
                                  item,
                                )
                              }
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111820] text-white active:scale-95"
                              aria-label={
                                isRu
                                  ? "Вернуть в список"
                                  : "Zurück in die Liste"
                              }
                            >
                              <Check size={14} />
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[14px] font-medium text-[#9aa2ad] line-through">
                                {item.title}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                deleteItem(item.id)
                              }
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[#c7cbd1] active:bg-[#f0f1f2]"
                              aria-label={
                                isRu
                                  ? "Удалить"
                                  : "Löschen"
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}