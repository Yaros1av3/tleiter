"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { translations, type Language } from "@/lib/translations";
import { supabase } from "@/lib/supabase";

type Event = {
  id: number;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string | null;
  category: string;
};

const categoryStyles: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  youth: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  team: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  church: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  lesson: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  important: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  other: {
    bg: "bg-neutral-100",
    text: "text-neutral-700",
    border: "border-neutral-200",
    dot: "bg-neutral-400",
  },
};

export default function CalendarPage() {
  const [language, setLanguage] = useState<Language>("ru");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const [isEditing, setIsEditing] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCategory, setEditCategory] = useState("other");

  const [isSaving, setIsSaving] = useState(false);

  const t = translations[language];

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_at", { ascending: true });

    if (error) {
      console.error("Fehler beim Laden der Events:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return;
    }

    setEvents(data ?? []);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const monthName = currentDate.toLocaleDateString(
    language === "ru" ? "ru-RU" : "de-DE",
    {
      month: "long",
      year: "numeric",
    }
  );

  const daysOfWeek =
    language === "ru"
      ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
      : ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const daysInMonth = lastDay.getDate();

    const previousMonthLastDay = new Date(
      year,
      month,
      0
    ).getDate();

    const days = [];

    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: previousMonthLastDay - i,
        currentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: day,
        currentMonth: true,
      });
    }

    let nextDay = 1;

    while (days.length < 42) {
      days.push({
        date: nextDay,
        currentMonth: false,
      });

      nextDay++;
    }

    return days;
  }, [currentDate]);

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      )
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
      )
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (day: number) => {
    const today = new Date();

    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const getEventsForDay = (day: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_at);

      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const openEditMode = () => {
    if (!selectedEvent) return;

    setEditTitle(selectedEvent.title);
    setEditDescription(selectedEvent.description ?? "");
    setEditStart(toDateTimeLocal(selectedEvent.start_at));
    setEditEnd(toDateTimeLocal(selectedEvent.end_at));
    setEditLocation(selectedEvent.location ?? "");
    setEditCategory(selectedEvent.category);

    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEvent = async () => {
    if (!selectedEvent) return;

    if (!editTitle.trim()) {
      alert(
        language === "ru"
          ? "Введите название события."
          : "Bitte einen Titel eingeben."
      );
      return;
    }

    const startTime = editStart.slice(11, 16);
    const endTime = editEnd.slice(11, 16);

    if (
      !isValidTime(startTime) ||
      !isValidTime(endTime)
    ) {
      alert(
        language === "ru"
          ? "Введите время в формате 14:00."
          : "Bitte die Uhrzeit im Format 14:00 eingeben."
      );
      return;
    }

    if (!editStart.slice(0, 10) || !editEnd.slice(0, 10)) {
      return;
    }

    const startDate = new Date(editStart);
    const endDate = new Date(editEnd);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      alert(
        language === "ru"
          ? "Проверьте дату и время."
          : "Bitte Datum und Uhrzeit überprüfen."
      );
      return;
    }

    if (endDate < startDate) {
      alert(
        language === "ru"
          ? "Время окончания не может быть раньше начала."
          : "Das Ende darf nicht vor dem Beginn liegen."
      );
      return;
    }

    setIsSaving(true);

    const { data, error } = await supabase
      .from("events")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        location: editLocation.trim() || null,
        category: editCategory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedEvent.id)
      .select()
      .single();

    if (error) {
      console.error(
        "Fehler beim Aktualisieren des Events:",
        error
      );

      alert(
        language === "ru"
          ? "Не удалось сохранить событие."
          : "Das Ereignis konnte nicht gespeichert werden."
      );

      setIsSaving(false);
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === selectedEvent.id ? data : event
      )
    );

    setSelectedEvent(data);
    setIsEditing(false);
    setIsSaving(false);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<
      string,
      { ru: string; de: string }
    > = {
      youth: {
        ru: "Teens",
        de: "Teens",
      },
      team: {
        ru: "Команда",
        de: "Team",
      },
      church: {
        ru: "Церковь",
        de: "Gemeinde",
      },
      lesson: {
        ru: "Урок",
        de: "Unterricht",
      },
      important: {
        ru: "Важное",
        de: "Wichtig",
      },
      other: {
        ru: "Другое",
        de: "Sonstiges",
      },
    };

    return labels[category]?.[language] ?? category;
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-neutral-100 text-neutral-900">
      <Sidebar language={language} />

      <div className="ml-[72px] min-h-screen min-w-0">
        <Header
          language={language}
          setLanguage={setLanguage}
        />

        <div className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6">
          {/* PAGE HEADER */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                {t.navigation.calendar}
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
                {monthName}
              </h1>

              <p className="mt-2 text-sm text-neutral-500">
                {language === "ru"
                  ? "Общий календарь команды"
                  : "Gemeinsamer Teamkalender"}
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              <Plus size={17} strokeWidth={2} />

              {language === "ru"
                ? "Новое событие"
                : "Neues Ereignis"}
            </button>
          </div>

          {/* CALENDAR */}
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {/* TOOLBAR */}
            <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <button
                type="button"
                onClick={goToToday}
                className="w-fit rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                {language === "ru"
                  ? "Сегодня"
                  : "Heute"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
                  aria-label="Next month"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            {/* WEEKDAYS */}
            <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* DAYS */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => (
                <div
                  key={`${day.date}-${index}`}
                  className={`relative min-h-[110px] border-b border-r border-neutral-200 p-2 sm:min-h-[130px] ${
                    !day.currentMonth
                      ? "bg-neutral-50/70"
                      : "bg-white"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                      isToday(day.date) && day.currentMonth
                        ? "bg-neutral-900 text-white"
                        : day.currentMonth
                        ? "text-neutral-700"
                        : "text-neutral-300"
                    }`}
                  >
                    {day.date}
                  </div>

                  {day.currentMonth && (
                    <div className="mt-2 space-y-1">
                      {getEventsForDay(day.date).map(
                        (event) => {
                          const style =
                            categoryStyles[
                              event.category
                            ] ??
                            categoryStyles.other;

                          return (
                            <button
                              type="button"
                              key={event.id}
                              onClick={() =>
                                setSelectedEvent(event)
                              }
                              className={`group block w-full overflow-hidden rounded-md border px-2 py-1.5 text-left transition hover:shadow-sm ${style.bg} ${style.text} ${style.border}`}
                              title={event.title}
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
                                />

                                <span className="truncate text-[10px] font-semibold">
                                  {event.title}
                                </span>
                              </div>

                              <div className="mt-0.5 pl-3 text-[9px] opacity-70">
                                {formatEventTime(
                                  event.start_at
                                )}
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* CATEGORY LEGEND */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
            {[
              "youth",
              "team",
              "church",
              "lesson",
              "important",
              "other",
            ].map((category) => {
              const style =
                categoryStyles[category];

              return (
                <div
                  key={category}
                  className="flex items-center gap-2 text-xs text-neutral-500"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${style.dot}`}
                  />

                  {getCategoryLabel(category)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* EVENT MODAL */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm"
          onClick={() => {
            setSelectedEvent(null);
            setIsEditing(false);
          }}
        >
          <div
            className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {!isEditing ? (
              <>
                {/* VIEW EVENT */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      {language === "ru"
                        ? "Событие"
                        : "Ereignis"}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          (
                            categoryStyles[
                              selectedEvent.category
                            ] ??
                            categoryStyles.other
                          ).dot
                        }`}
                      />

                      <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                        {selectedEvent.title}
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedEvent(null)
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      {language === "ru"
                        ? "Дата и время"
                        : "Datum und Uhrzeit"}
                    </div>

                    <div className="mt-1 text-sm text-neutral-700">
                      {new Date(
                        selectedEvent.start_at
                      ).toLocaleDateString(
                        language === "ru"
                          ? "ru-RU"
                          : "de-DE",
                        {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }
                      )}

                      {" · "}

                      {formatEventTime(
                        selectedEvent.start_at
                      )}

                      {" – "}

                      {formatEventTime(
                        selectedEvent.end_at
                      )}
                    </div>
                  </div>

                  {selectedEvent.location && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        {language === "ru"
                          ? "Место"
                          : "Ort"}
                      </div>

                      <div className="mt-1 text-sm text-neutral-700">
                        {selectedEvent.location}
                      </div>
                    </div>
                  )}

                  {selectedEvent.description && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        {language === "ru"
                          ? "Описание"
                          : "Beschreibung"}
                      </div>

                      <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
                        {selectedEvent.description}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      {language === "ru"
                        ? "Категория"
                        : "Kategorie"}
                    </div>

                    <div
                      className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                        (
                          categoryStyles[
                            selectedEvent.category
                          ] ??
                          categoryStyles.other
                        ).bg
                      } ${
                        (
                          categoryStyles[
                            selectedEvent.category
                          ] ??
                          categoryStyles.other
                        ).text
                      } ${
                        (
                          categoryStyles[
                            selectedEvent.category
                          ] ??
                          categoryStyles.other
                        ).border
                      }`}
                    >
                      {getCategoryLabel(
                        selectedEvent.category
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex justify-end gap-2 border-t border-neutral-100 pt-5">
                  <button
                    type="button"
                    onClick={openEditMode}
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                  >
                    <Pencil size={15} />

                    {language === "ru"
                      ? "Редактировать"
                      : "Bearbeiten"}
                  </button>

                  <button
                    type="button"
                    className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                  >
                    {language === "ru"
                      ? "Удалить"
                      : "Löschen"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* EDIT EVENT */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      {language === "ru"
                        ? "Редактирование"
                        : "Bearbeiten"}
                    </div>

                    <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                      {language === "ru"
                        ? "Изменить событие"
                        : "Ereignis bearbeiten"}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {/* TITLE */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      {language === "ru"
                        ? "Название"
                        : "Titel"}
                    </label>

                    <input
                      value={editTitle}
                      onChange={(e) =>
                        setEditTitle(
                          e.target.value
                        )
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-400"
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      {language === "ru"
                        ? "Описание"
                        : "Beschreibung"}
                    </label>

                    <textarea
                      value={editDescription}
                      onChange={(e) =>
                        setEditDescription(
                          e.target.value
                        )
                      }
                      rows={3}
                      className="mt-1 w-full resize-none rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none transition focus:border-neutral-400"
                    />
                  </div>

                  {/* DATE + TIME */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* BEGINN */}
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        {language === "ru"
                          ? "Начало"
                          : "Beginn"}
                      </label>

                      <input
                        type="date"
                        value={editStart.slice(
                          0,
                          10
                        )}
                        onChange={(e) =>
                          setEditStart(
                            `${e.target.value}T${editStart.slice(
                              11,
                              16
                            )}`
                          )
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-400"
                      />

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="14:00"
                        value={editStart.slice(
                          11,
                          16
                        )}
                        onChange={(e) => {
                          const value =
                            e.target.value.replace(
                              /[^0-9:]/g,
                              ""
                            );

                          setEditStart(
                            `${editStart.slice(
                              0,
                              10
                            )}T${value}`
                          );
                        }}
                        className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm tracking-wide outline-none transition focus:border-neutral-400"
                      />

                      <div className="mt-1 px-1 text-[9px] text-neutral-400">
                        {language === "ru"
                          ? "Время · 24 часа"
                          : "Zeit · 24 Stunden"}
                      </div>
                    </div>

                    {/* ENDE */}
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        {language === "ru"
                          ? "Конец"
                          : "Ende"}
                      </label>

                      <input
                        type="date"
                        value={editEnd.slice(
                          0,
                          10
                        )}
                        onChange={(e) =>
                          setEditEnd(
                            `${e.target.value}T${editEnd.slice(
                              11,
                              16
                            )}`
                          )
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-400"
                      />

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="16:00"
                        value={editEnd.slice(
                          11,
                          16
                        )}
                        onChange={(e) => {
                          const value =
                            e.target.value.replace(
                              /[^0-9:]/g,
                              ""
                            );

                          setEditEnd(
                            `${editEnd.slice(
                              0,
                              10
                            )}T${value}`
                          );
                        }}
                        className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm tracking-wide outline-none transition focus:border-neutral-400"
                      />

                      <div className="mt-1 px-1 text-[9px] text-neutral-400">
                        {language === "ru"
                          ? "Время · 24 часа"
                          : "Zeit · 24 Stunden"}
                      </div>
                    </div>
                  </div>

                  {/* LOCATION */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      {language === "ru"
                        ? "Место"
                        : "Ort"}
                    </label>

                    <input
                      value={editLocation}
                      onChange={(e) =>
                        setEditLocation(
                          e.target.value
                        )
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-400"
                    />
                  </div>

                  {/* CATEGORY */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      {language === "ru"
                        ? "Категория"
                        : "Kategorie"}
                    </label>

                    <select
                      value={editCategory}
                      onChange={(e) =>
                        setEditCategory(
                          e.target.value
                        )
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-400"
                    >
                      <option value="youth">
                        {language === "ru"
                          ? "🟣 Teens"
                          : "🟣 Teens"}
                      </option>

                      <option value="team">
                        {language === "ru"
                          ? "🔵 Команда"
                          : "🔵 Team"}
                      </option>

                      <option value="church">
                        {language === "ru"
                          ? "🟢 Церковь"
                          : "🟢 Gemeinde"}
                      </option>

                      <option value="lesson">
                        {language === "ru"
                          ? "🟡 Урок"
                          : "🟡 Unterricht"}
                      </option>

                      <option value="important">
                        {language === "ru"
                          ? "🔴 Важное"
                          : "🔴 Wichtig"}
                      </option>

                      <option value="other">
                        {language === "ru"
                          ? "⚪ Другое"
                          : "⚪ Sonstiges"}
                      </option>
                    </select>
                  </div>
                </div>

                {/* BUTTONS */}
                <div className="mt-7 flex justify-end gap-2 border-t border-neutral-100 pt-5">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                  >
                    {language === "ru"
                      ? "Отмена"
                      : "Abbrechen"}
                  </button>

                  <button
                    type="button"
                    onClick={saveEvent}
                    disabled={isSaving}
                    className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving
                      ? language === "ru"
                        ? "Сохранение..."
                        : "Speichern..."
                      : language === "ru"
                      ? "Сохранить"
                      : "Speichern"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  const pad = (number: number) =>
    String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function isValidTime(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);

  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return (
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

function formatEventTime(value: string) {
  const date = new Date(value);

  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}