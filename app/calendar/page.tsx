"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Repeat2,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import {
  translations,
  type Language,
} from "@/lib/translations";
import { supabase } from "@/lib/supabase";

type Recurrence =
  | "none"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly";

type SeriesScope =
  | "single"
  | "following"
  | "all";

type SeriesAction =
  | "edit"
  | "delete"
  | null;

type Event = {
  id: number;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string | null;
  category: string;
  series_id: string | null;
  recurrence: Recurrence;
};

type EventForm = {
  title: string;
  description: string;
  start: string;
  end: string;
  location: string;
  category: string;
  recurrence: Recurrence;
  recurrenceUntil: string;
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

const emptyForm: EventForm = {
  title: "",
  description: "",
  start: "",
  end: "",
  location: "",
  category: "other",
  recurrence: "none",
  recurrenceUntil: "",
};

export default function CalendarPage() {
  const [language, setLanguage] =
    useState<Language>("ru");

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [events, setEvents] = useState<Event[]>(
    []
  );

  const [selectedEvent, setSelectedEvent] =
    useState<Event | null>(null);

  const [isCreating, setIsCreating] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);

  const [showSeriesScope, setShowSeriesScope] =
    useState(false);

  const [seriesAction, setSeriesAction] =
    useState<SeriesAction>(null);

  const [seriesScope, setSeriesScope] =
    useState<SeriesScope>("single");

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [form, setForm] =
    useState<EventForm>(emptyForm);

  const t = translations[language];

  /*
   * LOAD EVENTS
   *
   * We only load:
   * previous month + current month + next month.
   *
   * This keeps the calendar lightweight while
   * still allowing recurring-series operations
   * to work reliably around the visible month.
   */
  const loadEvents = async () => {
    const year =
      currentDate.getFullYear();

    const month =
      currentDate.getMonth();

    const rangeStart = new Date(
      year,
      month - 1,
      1,
      0,
      0,
      0,
      0
    );

    const rangeEnd = new Date(
      year,
      month + 2,
      1,
      0,
      0,
      0,
      0
    );

    const {
      data,
      error,
    } = await supabase
      .from("events")
      .select("*")
      .gte(
        "start_at",
        rangeStart.toISOString()
      )
      .lt(
        "start_at",
        rangeEnd.toISOString()
      )
      .order("start_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Fehler beim Laden der Events:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      return;
    }

    setEvents(
      (data ?? []) as Event[]
    );
  };

  /*
   * RELOAD WHEN MONTH CHANGES
   */
  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  /*
   * MONTH
   */
  const monthName =
    currentDate.toLocaleDateString(
      language === "ru"
        ? "ru-RU"
        : "de-DE",
      {
        month: "long",
        year: "numeric",
      }
    );

  /*
   * WEEKDAYS
   */
  const daysOfWeek =
    language === "ru"
      ? [
          "Пн",
          "Вт",
          "Ср",
          "Чт",
          "Пт",
          "Сб",
          "Вс",
        ]
      : [
          "Mo",
          "Di",
          "Mi",
          "Do",
          "Fr",
          "Sa",
          "So",
        ];

  /*
   * CALENDAR DAYS
   */
  const calendarDays = useMemo(() => {
    const year =
      currentDate.getFullYear();

    const month =
      currentDate.getMonth();

    const firstDay = new Date(
      year,
      month,
      1
    );

    const lastDay = new Date(
      year,
      month + 1,
      0
    );

    let startDay =
      firstDay.getDay();

    startDay =
      startDay === 0
        ? 6
        : startDay - 1;

    const daysInMonth =
      lastDay.getDate();

    const previousMonthLastDay =
      new Date(
        year,
        month,
        0
      ).getDate();

    const days: {
      date: number;
      currentMonth: boolean;
    }[] = [];

    for (
      let i = startDay - 1;
      i >= 0;
      i--
    ) {
      days.push({
        date:
          previousMonthLastDay -
          i,
        currentMonth: false,
      });
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
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

  /*
   * NAVIGATION
   */
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

  /*
   * TODAY
   */
  const isToday = (day: number) => {
    const today = new Date();

    return (
      day === today.getDate() &&
      currentDate.getMonth() ===
        today.getMonth() &&
      currentDate.getFullYear() ===
        today.getFullYear()
    );
  };

  /*
   * EVENTS FOR DAY
   */
  const getEventsForDay = (
    day: number
  ) => {
    return events
      .filter((event) => {
        const eventDate =
          new Date(event.start_at);

        return (
          eventDate.getDate() === day &&
          eventDate.getMonth() ===
            currentDate.getMonth() &&
          eventDate.getFullYear() ===
            currentDate.getFullYear()
        );
      })
      .sort(
        (a, b) =>
          new Date(
            a.start_at
          ).getTime() -
          new Date(
            b.start_at
          ).getTime()
      );
  };

  /*
   * FORM UPDATE
   */
  const updateForm = (
    field: keyof EventForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /*
   * OPEN CREATE
   */
  const openCreateMode = () => {
    const now = new Date();

    const start = new Date(now);

    start.setHours(
      now.getHours() + 1,
      0,
      0,
      0
    );

    const end = new Date(start);

    end.setHours(
      start.getHours() + 1
    );

    setForm({
      title: "",
      description: "",
      start: toDateTimeLocal(
        start.toISOString()
      ),
      end: toDateTimeLocal(
        end.toISOString()
      ),
      location: "",
      category: "other",
      recurrence: "none",
      recurrenceUntil: "",
    });

    setSelectedEvent(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setShowSeriesScope(false);
    setSeriesAction(null);
    setIsCreating(true);
  };

  /*
   * CLOSE MODALS
   */
  const closeModals = () => {
    if (
      isSaving ||
      isDeleting
    ) {
      return;
    }

    setSelectedEvent(null);
    setIsCreating(false);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setShowSeriesScope(false);
    setSeriesAction(null);
    setSeriesScope("single");
    setForm(emptyForm);
  };

  /*
   * CREATE EVENT / SERIES
   */
  const createEvent = async () => {
    if (!form.title.trim()) {
      alert(
        language === "ru"
          ? "Введите название события."
          : "Bitte einen Titel eingeben."
      );

      return;
    }

    const startTime =
      form.start.slice(11, 16);

    const endTime =
      form.end.slice(11, 16);

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

    const startDate =
      new Date(form.start);

    const endDate =
      new Date(form.end);

    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      Number.isNaN(
        endDate.getTime()
      )
    ) {
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

    let recurrenceUntilDate: Date | null =
      null;

    if (
      form.recurrence !==
      "none"
    ) {
      if (!form.recurrenceUntil) {
        alert(
          language === "ru"
            ? "Выберите дату окончания повторения."
            : "Bitte ein Enddatum für die Wiederholung auswählen."
        );

        return;
      }

      recurrenceUntilDate =
        new Date(
          `${form.recurrenceUntil}T23:59`
        );

      if (
        Number.isNaN(
          recurrenceUntilDate.getTime()
        )
      ) {
        alert(
          language === "ru"
            ? "Проверьте дату окончания повторения."
            : "Bitte das Enddatum der Wiederholung überprüfen."
        );

        return;
      }

      if (
        recurrenceUntilDate <
        startDate
      ) {
        alert(
          language === "ru"
            ? "Дата окончания повторения должна быть после даты начала."
            : "Das Ende der Wiederholung muss nach dem Startdatum liegen."
        );

        return;
      }
    }

    setIsSaving(true);

    const seriesId =
      form.recurrence !== "none"
        ? crypto.randomUUID()
        : null;

    const occurrences =
      generateOccurrences({
        startDate,
        endDate,
        recurrence:
          form.recurrence,
        until:
          recurrenceUntilDate,
      });

    const rows = occurrences.map(
      ({
        start,
        end,
      }) => ({
        title:
          form.title.trim(),
        description:
          form.description.trim() ||
          null,
        start_at:
          start.toISOString(),
        end_at:
          end.toISOString(),
        location:
          form.location.trim() ||
          null,
        category:
          form.category,
        series_id:
          seriesId,
        recurrence:
          form.recurrence,
      })
    );

    const {
      data,
      error,
    } = await supabase
      .from("events")
      .insert(rows)
      .select();

    if (error) {
      console.error(
        "Fehler beim Erstellen des Events:",
        error
      );

      alert(
        language === "ru"
          ? "Не удалось создать событие."
          : "Das Ereignis konnte nicht erstellt werden."
      );

      setIsSaving(false);

      return;
    }

    const createdEvents =
      (data ?? []) as Event[];

    setEvents(
      (currentEvents) =>
        [
          ...currentEvents,
          ...createdEvents,
        ].sort(
          (a, b) =>
            new Date(
              a.start_at
            ).getTime() -
            new Date(
              b.start_at
            ).getTime()
        )
    );

    setCurrentDate(
      new Date(startDate)
    );

    setIsCreating(false);
    setIsSaving(false);
    setForm(emptyForm);
  };

  /*
   * OPEN EDIT
   */
  const openEditMode = () => {
    if (!selectedEvent) {
      return;
    }

    if (
      selectedEvent.recurrence !==
      "none"
    ) {
      setSeriesAction("edit");
      setShowSeriesScope(true);
      return;
    }

    startEditingWithScope(
      "single"
    );
  };

  /*
   * START EDITING WITH SCOPE
   */
  const startEditingWithScope = (
    scope: SeriesScope
  ) => {
    if (!selectedEvent) {
      return;
    }

    setSeriesScope(scope);

    setForm({
      title:
        selectedEvent.title,
      description:
        selectedEvent.description ??
        "",
      start:
        toDateTimeLocal(
          selectedEvent.start_at
        ),
      end:
        toDateTimeLocal(
          selectedEvent.end_at
        ),
      location:
        selectedEvent.location ??
        "",
      category:
        selectedEvent.category,
      recurrence:
        selectedEvent.recurrence ??
        "none",
      recurrenceUntil: "",
    });

    setShowSeriesScope(false);
    setSeriesAction(null);
    setIsEditing(true);
  };

  /*
   * CANCEL EDIT
   */
  const cancelEdit = () => {
    setIsEditing(false);
  };

  /*
   * SAVE EDIT
   */
  const saveEvent = async () => {
    if (!selectedEvent) {
      return;
    }

    if (!form.title.trim()) {
      alert(
        language === "ru"
          ? "Введите название события."
          : "Bitte einen Titel eingeben."
      );

      return;
    }

    const startTime =
      form.start.slice(11, 16);

    const endTime =
      form.end.slice(11, 16);

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

    const startDate =
      new Date(form.start);

    const endDate =
      new Date(form.end);

    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      Number.isNaN(
        endDate.getTime()
      )
    ) {
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

    /*
     * SINGLE EVENT
     */
    if (
      selectedEvent.recurrence ===
        "none" ||
      seriesScope === "single"
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("events")
        .update({
          title:
            form.title.trim(),
          description:
            form.description.trim() ||
            null,
          start_at:
            startDate.toISOString(),
          end_at:
            endDate.toISOString(),
          location:
            form.location.trim() ||
            null,
          category:
            form.category,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          selectedEvent.id
        )
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

      const updatedEvent =
        data as Event;

      setEvents(
        (currentEvents) =>
          currentEvents
            .map((event) =>
              event.id ===
              selectedEvent.id
                ? updatedEvent
                : event
            )
            .sort(
              (a, b) =>
                new Date(
                  a.start_at
                ).getTime() -
                new Date(
                  b.start_at
                ).getTime()
            )
      );

      setSelectedEvent(
        updatedEvent
      );

      setIsEditing(false);
      setIsSaving(false);

      setCurrentDate(
        new Date(startDate)
      );

      return;
    }

    /*
     * SERIES EDIT
     */
    const selectedOldStart =
      new Date(
        selectedEvent.start_at
      );

    const selectedOldEnd =
      new Date(
        selectedEvent.end_at
      );

    const startShift =
      startDate.getTime() -
      selectedOldStart.getTime();

    const newDuration =
      endDate.getTime() -
      startDate.getTime();

    const targetEvents =
      events.filter((event) => {
        if (
          event.series_id !==
          selectedEvent.series_id
        ) {
          return false;
        }

        if (
          seriesScope === "all"
        ) {
          return true;
        }

        return (
          new Date(
            event.start_at
          ).getTime() >=
          selectedOldStart.getTime()
        );
      });

    try {
      const updatedEvents =
        await Promise.all(
          targetEvents.map(
            async (event) => {
              const oldStart =
                new Date(
                  event.start_at
                );

              const newStart =
                new Date(
                  oldStart.getTime() +
                    startShift
                );

              const newEnd =
                new Date(
                  newStart.getTime() +
                    newDuration
                );

              const {
                data,
                error,
              } = await supabase
                .from("events")
                .update({
                  title:
                    form.title.trim(),
                  description:
                    form.description.trim() ||
                    null,
                  start_at:
                    newStart.toISOString(),
                  end_at:
                    newEnd.toISOString(),
                  location:
                    form.location.trim() ||
                    null,
                  category:
                    form.category,
                  updated_at:
                    new Date().toISOString(),
                })
                .eq(
                  "id",
                  event.id
                )
                .select()
                .single();

              if (error) {
                throw error;
              }

              return data as Event;
            }
          )
        );

      setEvents(
        (currentEvents) =>
          currentEvents
            .map((event) => {
              const updated =
                updatedEvents.find(
                  (item) =>
                    item.id ===
                    event.id
                );

              return updated ??
                event;
            })
            .sort(
              (a, b) =>
                new Date(
                  a.start_at
                ).getTime() -
                new Date(
                  b.start_at
                ).getTime()
            )
      );

      const updatedSelected =
        updatedEvents.find(
          (event) =>
            event.id ===
            selectedEvent.id
        );

      if (updatedSelected) {
        setSelectedEvent(
          updatedSelected
        );

        setCurrentDate(
          new Date(
            updatedSelected.start_at
          )
        );
      }

      setIsEditing(false);
      setIsSaving(false);
    } catch (error) {
      console.error(
        "Fehler beim Aktualisieren der Serie:",
        error
      );

      alert(
        language === "ru"
          ? "Не удалось полностью сохранить серию."
          : "Die Serie konnte nicht vollständig gespeichert werden."
      );

      setIsSaving(false);

      /*
       * Reload from database so the UI
       * always reflects the actual state.
       */
      await loadEvents();
    }
  };

  /*
   * OPEN DELETE
   */
  const openDeleteMode = () => {
    if (!selectedEvent) {
      return;
    }

    if (
      selectedEvent.recurrence !==
      "none"
    ) {
      setSeriesAction("delete");
      setShowSeriesScope(true);
      return;
    }

    setSeriesScope("single");
    setShowDeleteConfirm(true);
  };

  /*
   * APPLY SERIES SCOPE
   */
  const applySeriesScope = (
    scope: SeriesScope
  ) => {
    setSeriesScope(scope);

    if (
      seriesAction === "edit"
    ) {
      startEditingWithScope(
        scope
      );

      return;
    }

    if (
      seriesAction === "delete"
    ) {
      setShowSeriesScope(false);
      setSeriesAction(null);
      setShowDeleteConfirm(true);
    }
  };

  /*
   * DELETE EVENT / SERIES
   */
  const deleteEvent = async () => {
    if (!selectedEvent) {
      return;
    }

    setIsDeleting(true);

    /*
     * SINGLE EVENT
     */
    if (
      selectedEvent.recurrence ===
        "none" ||
      seriesScope === "single"
    ) {
      const {
        error,
      } = await supabase
        .from("events")
        .delete()
        .eq(
          "id",
          selectedEvent.id
        );

      if (error) {
        console.error(
          "Fehler beim Löschen des Events:",
          error
        );

        alert(
          language === "ru"
            ? "Не удалось удалить событие."
            : "Das Ereignis konnte nicht gelöscht werden."
        );

        setIsDeleting(false);

        return;
      }

      setEvents(
        (currentEvents) =>
          currentEvents.filter(
            (event) =>
              event.id !==
              selectedEvent.id
          )
      );

      setShowDeleteConfirm(false);
      setSelectedEvent(null);
      setIsEditing(false);
      setIsDeleting(false);

      return;
    }

    /*
     * SERIES DELETE
     */
    const selectedStart =
      new Date(
        selectedEvent.start_at
      ).getTime();

    const targetEvents =
      events.filter((event) => {
        if (
          event.series_id !==
          selectedEvent.series_id
        ) {
          return false;
        }

        if (
          seriesScope === "all"
        ) {
          return true;
        }

        return (
          new Date(
            event.start_at
          ).getTime() >=
          selectedStart
        );
      });

    try {
      await Promise.all(
        targetEvents.map(
          async (event) => {
            const {
              error,
            } = await supabase
              .from("events")
              .delete()
              .eq(
                "id",
                event.id
              );

            if (error) {
              throw error;
            }
          }
        )
      );

      const deletedIds =
        new Set(
          targetEvents.map(
            (event) =>
              event.id
          )
        );

      setEvents(
        (currentEvents) =>
          currentEvents.filter(
            (event) =>
              !deletedIds.has(
                event.id
              )
          )
      );

      setShowDeleteConfirm(false);
      setSelectedEvent(null);
      setIsEditing(false);
      setIsDeleting(false);
    } catch (error) {
      console.error(
        "Fehler beim Löschen der Serie:",
        error
      );

      alert(
        language === "ru"
          ? "Не удалось полностью удалить серию."
          : "Die Serie konnte nicht vollständig gelöscht werden."
      );

      setIsDeleting(false);

      await loadEvents();
    }
  };

  /*
   * CATEGORY LABEL
   */
  const getCategoryLabel = (
    category: string
  ) => {
    const labels: Record<
      string,
      {
        ru: string;
        de: string;
      }
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

    return (
      labels[category]?.[language] ??
      category
    );
  };

  /*
   * RECURRENCE LABEL
   */
  const getRecurrenceLabel = (
    recurrence: Recurrence
  ) => {
    const labels: Record<
      Recurrence,
      {
        ru: string;
        de: string;
      }
    > = {
      none: {
        ru: "Не повторяется",
        de: "Keine Wiederholung",
      },
      weekly: {
        ru: "Каждую неделю",
        de: "Jede Woche",
      },
      biweekly: {
        ru: "Каждые 2 недели",
        de: "Alle 2 Wochen",
      },
      monthly: {
        ru: "Каждый месяц",
        de: "Jeden Monat",
      },
      yearly: {
        ru: "Каждый год",
        de: "Jedes Jahr",
      },
    };

    return labels[recurrence][
      language
    ];
  };

  /*
   * SERIES SCOPE LABEL
   */
  const getSeriesScopeLabel = (
    scope: SeriesScope
  ) => {
    const labels: Record<
      SeriesScope,
      {
        ru: string;
        de: string;
      }
    > = {
      single: {
        ru: "Только это событие",
        de: "Nur dieses Ereignis",
      },
      following: {
        ru: "Это и все следующие",
        de: "Dieses und alle folgenden",
      },
      all: {
        ru: "Вся серия",
        de: "Gesamte Serie",
      },
    };

    return labels[scope][
      language
    ];
  };

  /*
   * RENDER
   */
  return (
    <main className="min-h-screen overflow-x-hidden bg-neutral-100 text-neutral-900">
      <Sidebar
        language={language}
      />

      <div className="ml-[72px] min-h-screen min-w-0">
        <Header
          language={language}
          setLanguage={
            setLanguage
          }
        />

        <div className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6">
          {/* PAGE HEADER */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                {
                  t.navigation
                    .calendar
                }
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
              onClick={
                openCreateMode
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              <Plus
                size={17}
                strokeWidth={2}
              />

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
                onClick={
                  goToToday
                }
                className="w-fit rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                {language === "ru"
                  ? "Сегодня"
                  : "Heute"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={
                    goToPreviousMonth
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
                  aria-label="Previous month"
                >
                  <ChevronLeft
                    size={17}
                  />
                </button>

                <button
                  type="button"
                  onClick={
                    goToNextMonth
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
                  aria-label="Next month"
                >
                  <ChevronRight
                    size={17}
                  />
                </button>
              </div>
            </div>

            {/* WEEKDAYS */}
            <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
              {daysOfWeek.map(
                (day) => (
                  <div
                    key={day}
                    className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400"
                  >
                    {day}
                  </div>
                )
              )}
            </div>

            {/* DAYS */}
            <div className="grid grid-cols-7">
              {calendarDays.map(
                (
                  day,
                  index
                ) => {
                  const dayEvents =
                    day.currentMonth
                      ? getEventsForDay(
                          day.date
                        )
                      : [];

                  return (
                    <div
                      key={`${day.date}-${index}`}
                      className={`relative min-h-[110px] border-b border-r border-neutral-200 p-2 sm:min-h-[130px] ${
                        !day.currentMonth
                          ? "bg-neutral-50/70"
                          : "bg-white"
                      }`}
                    >
                      {/* DATE */}
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                          isToday(
                            day.date
                          ) &&
                          day.currentMonth
                            ? "bg-neutral-900 text-white"
                            : day.currentMonth
                            ? "text-neutral-700"
                            : "text-neutral-300"
                        }`}
                      >
                        {
                          day.date
                        }
                      </div>

                      {/* EVENTS */}
                      {dayEvents.length >
                        0 && (
                        <div className="mt-2 space-y-1">
                          {dayEvents.map(
                            (
                              event
                            ) => {
                              const style =
                                categoryStyles[
                                  event
                                    .category
                                ] ??
                                categoryStyles.other;

                              return (
                                <button
                                  type="button"
                                  key={
                                    event.id
                                  }
                                  onClick={() =>
                                    setSelectedEvent(
                                      event
                                    )
                                  }
                                  className={`group block w-full overflow-hidden rounded-md border px-2 py-1.5 text-left transition hover:shadow-sm ${style.bg} ${style.text} ${style.border}`}
                                  title={
                                    event.title
                                  }
                                >
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
                                    />

                                    <span className="min-w-0 truncate text-[10px] font-semibold">
                                      {
                                        event.title
                                      }
                                    </span>

                                    {event.recurrence !==
                                      "none" && (
                                      <Repeat2
                                        size={
                                          10
                                        }
                                        strokeWidth={
                                          2
                                        }
                                        className="ml-auto shrink-0 opacity-60"
                                      />
                                    )}
                                  </div>
                                </button>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </section>

          {/* LEGEND */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
            {[
              "youth",
              "team",
              "church",
              "lesson",
              "important",
              "other",
            ].map(
              (category) => {
                const style =
                  categoryStyles[
                    category
                  ];

                return (
                  <div
                    key={
                      category
                    }
                    className="flex items-center gap-2 text-xs text-neutral-500"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${style.dot}`}
                    />

                    {getCategoryLabel(
                      category
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreating && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm"
          onClick={() =>
            closeModals()
          }
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  <Plus
                    size={13}
                  />

                  {language ===
                  "ru"
                    ? "Календарь"
                    : "Kalender"}
                </div>

                <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                  {language ===
                  "ru"
                    ? "Новое событие"
                    : "Neues Ereignis"}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeModals
                }
                disabled={
                  isSaving
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <EventFormFields
              language={language}
              form={form}
              updateForm={
                updateForm
              }
              showRecurrence
              getRecurrenceLabel={
                getRecurrenceLabel
              }
            />

            <div className="mt-7 flex justify-end gap-2 border-t border-neutral-100 pt-5">
              <button
                type="button"
                onClick={
                  closeModals
                }
                disabled={
                  isSaving
                }
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                {language ===
                "ru"
                  ? "Отмена"
                  : "Abbrechen"}
              </button>

              <button
                type="button"
                onClick={
                  createEvent
                }
                disabled={
                  isSaving
                }
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {form.recurrence !==
                  "none" && (
                  <Repeat2
                    size={15}
                  />
                )}

                {isSaving
                  ? language ===
                    "ru"
                    ? "Создание..."
                    : "Erstellen..."
                  : form.recurrence !==
                    "none"
                  ? language ===
                    "ru"
                    ? "Создать серию"
                    : "Serie erstellen"
                  : language ===
                    "ru"
                  ? "Создать событие"
                  : "Ereignis erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVENT VIEW / EDIT MODAL */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm"
          onClick={() => {
            if (
              showDeleteConfirm ||
              showSeriesScope ||
              isSaving ||
              isDeleting
            ) {
              return;
            }

            closeModals();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {!isEditing ? (
              <>
                {/* VIEW */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      {language ===
                      "ru"
                        ? "Событие"
                        : "Ereignis"}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          (
                            categoryStyles[
                              selectedEvent
                                .category
                            ] ??
                            categoryStyles.other
                          ).dot
                        }`}
                      />

                      <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                        {
                          selectedEvent.title
                        }
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeModals
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {/* DATE / TIME */}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      {language ===
                      "ru"
                        ? "Дата и время"
                        : "Datum und Uhrzeit"}
                    </div>

                    <div className="mt-1 text-sm text-neutral-700">
                      {new Date(
                        selectedEvent.start_at
                      ).toLocaleDateString(
                        language ===
                          "ru"
                          ? "ru-RU"
                          : "de-DE",
                        {
                          weekday:
                            "long",
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

                  {/* LOCATION */}
                  {selectedEvent.location && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        {language ===
                        "ru"
                          ? "Место"
                          : "Ort"}
                      </div>

                      <div className="mt-1 text-sm text-neutral-700">
                        {
                          selectedEvent.location
                        }
                      </div>
                    </div>
                  )}

                  {/* DESCRIPTION */}
                  {selectedEvent.description && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        {language ===
                        "ru"
                          ? "Описание"
                          : "Beschreibung"}
                      </div>

                      <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
                        {
                          selectedEvent.description
                        }
                      </div>
                    </div>
                  )}

                  {/* CATEGORY */}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      {language ===
                      "ru"
                        ? "Категория"
                        : "Kategorie"}
                    </div>

                    <div
                      className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                        (
                          categoryStyles[
                            selectedEvent
                              .category
                          ] ??
                          categoryStyles.other
                        ).bg
                      } ${
                        (
                          categoryStyles[
                            selectedEvent
                              .category
                          ] ??
                          categoryStyles.other
                        ).text
                      } ${
                        (
                          categoryStyles[
                            selectedEvent
                              .category
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

                  {/* RECURRENCE */}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      {language ===
                      "ru"
                        ? "Повторение"
                        : "Wiederholung"}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-sm text-neutral-700">
                      {selectedEvent.recurrence !==
                        "none" && (
                        <Repeat2
                          size={15}
                          className="text-neutral-400"
                        />
                      )}

                      {getRecurrenceLabel(
                        selectedEvent.recurrence ??
                          "none"
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="mt-7 flex justify-end gap-2 border-t border-neutral-100 pt-5">
                  <button
                    type="button"
                    onClick={
                      openEditMode
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                  >
                    <Pencil
                      size={15}
                    />

                    {language ===
                    "ru"
                      ? "Редактировать"
                      : "Bearbeiten"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      openDeleteMode
                    }
                    className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                  >
                    {language ===
                    "ru"
                      ? "Удалить"
                      : "Löschen"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* EDIT */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      {language ===
                      "ru"
                        ? "Редактирование"
                        : "Bearbeiten"}
                    </div>

                    <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                      {language ===
                      "ru"
                        ? "Изменить событие"
                        : "Ereignis bearbeiten"}
                    </h2>

                    {selectedEvent.recurrence !==
                      "none" && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-medium text-neutral-600">
                        <Repeat2
                          size={12}
                        />

                        {getSeriesScopeLabel(
                          seriesScope
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={
                      cancelEdit
                    }
                    disabled={
                      isSaving
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>

                {selectedEvent.recurrence !==
                  "none" && (
                  <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3 text-xs leading-5 text-neutral-500">
                    {language ===
                    "ru"
                      ? seriesScope ===
                        "single"
                        ? "Изменения применятся только к этому событию."
                        : seriesScope ===
                          "following"
                        ? "Изменения применятся к этому и всем последующим событиям серии."
                        : "Изменения применятся ко всей серии."
                      : seriesScope ===
                        "single"
                      ? "Die Änderungen gelten nur für dieses Ereignis."
                      : seriesScope ===
                        "following"
                      ? "Die Änderungen gelten für dieses und alle folgenden Ereignisse."
                      : "Die Änderungen gelten für die gesamte Serie."}
                  </div>
                )}

                <EventFormFields
                  language={language}
                  form={form}
                  updateForm={
                    updateForm
                  }
                  showRecurrence={
                    false
                  }
                  getRecurrenceLabel={
                    getRecurrenceLabel
                  }
                />

                <div className="mt-7 flex justify-end gap-2 border-t border-neutral-100 pt-5">
                  <button
                    type="button"
                    onClick={
                      cancelEdit
                    }
                    disabled={
                      isSaving
                    }
                    className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {language ===
                    "ru"
                      ? "Отмена"
                      : "Abbrechen"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      saveEvent
                    }
                    disabled={
                      isSaving
                    }
                    className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving
                      ? language ===
                        "ru"
                        ? "Сохранение..."
                        : "Speichern..."
                      : language ===
                        "ru"
                      ? "Сохранить"
                      : "Speichern"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SERIES SCOPE MODAL */}
      {showSeriesScope &&
        selectedEvent && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm"
            onClick={() => {
              if (
                !isSaving &&
                !isDeleting
              ) {
                setShowSeriesScope(
                  false
                );
                setSeriesAction(
                  null
                );
              }
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
                <Repeat2
                  size={19}
                />
              </div>

              <h3 className="mt-4 text-lg font-semibold tracking-tight text-neutral-950">
                {seriesAction ===
                "edit"
                  ? language ===
                    "ru"
                    ? "Что изменить?"
                    : "Was soll geändert werden?"
                  : language ===
                    "ru"
                  ? "Что удалить?"
                  : "Was soll gelöscht werden?"}
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {language ===
                "ru"
                  ? "Это событие является частью повторяющейся серии."
                  : "Dieses Ereignis gehört zu einer wiederkehrenden Serie."}
              </p>

              <div className="mt-5 space-y-2">
                {(
                  [
                    "single",
                    "following",
                    "all",
                  ] as SeriesScope[]
                ).map(
                  (scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() =>
                        applySeriesScope(
                          scope
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-left transition hover:border-neutral-300 hover:bg-neutral-50"
                    >
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {getSeriesScopeLabel(
                            scope
                          )}
                        </div>

                        <div className="mt-0.5 text-[11px] text-neutral-400">
                          {scope ===
                          "single"
                            ? language ===
                              "ru"
                              ? "Только выбранная дата"
                              : "Nur das ausgewählte Datum"
                            : scope ===
                              "following"
                            ? language ===
                              "ru"
                              ? "От выбранного события и дальше"
                              : "Ab diesem Ereignis und danach"
                            : language ===
                              "ru"
                            ? "Все события этой серии"
                            : "Alle Ereignisse dieser Serie"}
                        </div>
                      </div>

                      <span className="text-neutral-300">
                        →
                      </span>
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSeriesScope(
                    false
                  );
                  setSeriesAction(
                    null
                  );
                }}
                className="mt-5 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                {language ===
                "ru"
                  ? "Отмена"
                  : "Abbrechen"}
              </button>
            </div>
          </div>
        )}

      {/* DELETE CONFIRMATION */}
      {showDeleteConfirm &&
        selectedEvent && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
            onClick={() => {
              if (!isDeleting) {
                setShowDeleteConfirm(
                  false
                );
              }
            }}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                🗑
              </div>

              <h3 className="mt-4 text-lg font-semibold tracking-tight text-neutral-950">
                {language ===
                "ru"
                  ? "Удалить событие?"
                  : "Ereignis löschen?"}
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {selectedEvent.recurrence !==
                "none"
                  ? language ===
                    "ru"
                    ? `Будет удалено: «${getSeriesScopeLabel(
                        seriesScope
                      )}».`
                    : `Gelöscht wird: „${getSeriesScopeLabel(
                        seriesScope
                      )}“.`
                  : language ===
                    "ru"
                  ? `Событие «${selectedEvent.title}» будет удалено. Это действие нельзя отменить.`
                  : `Das Ereignis „${selectedEvent.title}“ wird gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`}
              </p>

              {selectedEvent.recurrence !==
                "none" && (
                <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                  <div className="font-medium text-neutral-700">
                    {
                      selectedEvent.title
                    }
                  </div>

                  <div className="mt-1">
                    {getRecurrenceLabel(
                      selectedEvent.recurrence
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={
                    isDeleting
                  }
                  onClick={() =>
                    setShowDeleteConfirm(
                      false
                    )
                  }
                  className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {language ===
                  "ru"
                    ? "Отмена"
                    : "Abbrechen"}
                </button>

                <button
                  type="button"
                  onClick={
                    deleteEvent
                  }
                  disabled={
                    isDeleting
                  }
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting
                    ? language ===
                      "ru"
                      ? "Удаление..."
                      : "Löschen..."
                    : language ===
                      "ru"
                    ? "Удалить"
                    : "Löschen"}
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

/*
 * EVENT FORM FIELDS
 */
function EventFormFields({
  language,
  form,
  updateForm,
  showRecurrence,
  getRecurrenceLabel,
}: {
  language: Language;
  form: EventForm;
  updateForm: (
    field: keyof EventForm,
    value: string
  ) => void;
  showRecurrence: boolean;
  getRecurrenceLabel: (
    recurrence: Recurrence
  ) => string;
}) {
  return (
    <div className="mt-6 space-y-4">
      {/* TITLE */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {language === "ru"
            ? "Название"
            : "Titel"}
        </label>

        <input
          type="text"
          value={form.title}
          onChange={(e) =>
            updateForm(
              "title",
              e.target.value
            )
          }
          placeholder={
            language === "ru"
              ? "Например: Встреча Teens"
              : "z. B. Teens Treffen"
          }
          className="mt-1 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition placeholder:text-neutral-300 focus:border-neutral-400"
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
          value={
            form.description
          }
          onChange={(e) =>
            updateForm(
              "description",
              e.target.value
            )
          }
          rows={3}
          placeholder={
            language === "ru"
              ? "Дополнительная информация..."
              : "Weitere Informationen..."
          }
          className="mt-1 w-full resize-none rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none transition placeholder:text-neutral-300 focus:border-neutral-400"
        />
      </div>

      {/* DATE + TIME */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* START */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {language === "ru"
              ? "Начало"
              : "Beginn"}
          </label>

          <input
            type="date"
            value={form.start.slice(
              0,
              10
            )}
            onChange={(e) =>
              updateForm(
                "start",
                `${e.target.value}T${form.start.slice(
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
            value={form.start.slice(
              11,
              16
            )}
            onChange={(e) => {
              const value =
                e.target.value.replace(
                  /[^0-9:]/g,
                  ""
                );

              updateForm(
                "start",
                `${form.start.slice(
                  0,
                  10
                )}T${value}`
              );
            }}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm tracking-wide outline-none transition placeholder:text-neutral-300 focus:border-neutral-400"
          />

          <div className="mt-1 px-1 text-[9px] text-neutral-400">
            {language === "ru"
              ? "Время · 24 часа"
              : "Zeit · 24 Stunden"}
          </div>
        </div>

        {/* END */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {language === "ru"
              ? "Конец"
              : "Ende"}
          </label>

          <input
            type="date"
            value={form.end.slice(
              0,
              10
            )}
            onChange={(e) =>
              updateForm(
                "end",
                `${e.target.value}T${form.end.slice(
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
            value={form.end.slice(
              11,
              16
            )}
            onChange={(e) => {
              const value =
                e.target.value.replace(
                  /[^0-9:]/g,
                  ""
                );

              updateForm(
                "end",
                `${form.end.slice(
                  0,
                  10
                )}T${value}`
              );
            }}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm tracking-wide outline-none transition placeholder:text-neutral-300 focus:border-neutral-400"
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
          type="text"
          value={form.location}
          onChange={(e) =>
            updateForm(
              "location",
              e.target.value
            )
          }
          placeholder={
            language === "ru"
              ? "Например: Gemeinde Berlin"
              : "z. B. Gemeinde Berlin"
          }
          className="mt-1 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition placeholder:text-neutral-300 focus:border-neutral-400"
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
          value={form.category}
          onChange={(e) =>
            updateForm(
              "category",
              e.target.value
            )
          }
          className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-400"
        >
          <option value="youth">
            🟣 Teens
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

      {/* RECURRENCE */}
      {showRecurrence && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
          <div className="flex items-center gap-2">
            <Repeat2
              size={15}
              className="text-neutral-500"
            />

            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              {language ===
              "ru"
                ? "Повторение"
                : "Wiederholung"}
            </label>
          </div>

          <select
            value={
              form.recurrence
            }
            onChange={(e) =>
              updateForm(
                "recurrence",
                e.target.value
              )
            }
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-400"
          >
            <option value="none">
              {getRecurrenceLabel(
                "none"
              )}
            </option>

            <option value="weekly">
              {getRecurrenceLabel(
                "weekly"
              )}
            </option>

            <option value="biweekly">
              {getRecurrenceLabel(
                "biweekly"
              )}
            </option>

            <option value="monthly">
              {getRecurrenceLabel(
                "monthly"
              )}
            </option>

            <option value="yearly">
              {getRecurrenceLabel(
                "yearly"
              )}
            </option>
          </select>

          {form.recurrence !==
            "none" && (
            <>
              <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                {language ===
                "ru"
                  ? "Повторять до"
                  : "Wiederholen bis"}
              </label>

              <input
                type="date"
                value={
                  form.recurrenceUntil
                }
                min={form.start.slice(
                  0,
                  10
                )}
                onChange={(e) =>
                  updateForm(
                    "recurrenceUntil",
                    e.target.value
                  )
                }
                className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-400"
              />

              <p className="mt-2 text-[10px] leading-4 text-neutral-400">
                {language ===
                "ru"
                  ? "События будут созданы автоматически до выбранной даты."
                  : "Die Ereignisse werden automatisch bis zu diesem Datum erstellt."}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/*
 * GENERATE OCCURRENCES
 */
function generateOccurrences({
  startDate,
  endDate,
  recurrence,
  until,
}: {
  startDate: Date;
  endDate: Date;
  recurrence: Recurrence;
  until: Date | null;
}) {
  const occurrences: {
    start: Date;
    end: Date;
  }[] = [];

  const duration =
    endDate.getTime() -
    startDate.getTime();

  /*
   * ONE EVENT
   */
  if (
    recurrence === "none" ||
    !until
  ) {
    return [
      {
        start: new Date(
          startDate
        ),
        end: new Date(
          endDate
        ),
      },
    ];
  }

  let currentStart =
    new Date(startDate);

  while (
    currentStart <= until
  ) {
    const currentEnd =
      new Date(
        currentStart.getTime() +
          duration
      );

    occurrences.push({
      start: new Date(
        currentStart
      ),
      end: currentEnd,
    });

    currentStart =
      getNextOccurrence(
        currentStart,
        recurrence
      );
  }

  return occurrences;
}

/*
 * NEXT RECURRENCE
 */
function getNextOccurrence(
  date: Date,
  recurrence: Recurrence
) {
  const next =
    new Date(date);

  if (
    recurrence ===
    "weekly"
  ) {
    next.setDate(
      next.getDate() + 7
    );
  }

  if (
    recurrence ===
    "biweekly"
  ) {
    next.setDate(
      next.getDate() + 14
    );
  }

  if (
    recurrence ===
    "monthly"
  ) {
    const originalDay =
      next.getDate();

    next.setDate(1);
    next.setMonth(
      next.getMonth() + 1
    );

    const lastDay =
      new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0
      ).getDate();

    next.setDate(
      Math.min(
        originalDay,
        lastDay
      )
    );
  }

  if (
    recurrence ===
    "yearly"
  ) {
    next.setFullYear(
      next.getFullYear() + 1
    );
  }

  return next;
}

/*
 * DATETIME LOCAL
 */
function toDateTimeLocal(
  value: string
) {
  const date = new Date(value);

  const pad = (
    number: number
  ) =>
    String(number).padStart(
      2,
      "0"
    );

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(
    date.getDate()
  )}T${pad(
    date.getHours()
  )}:${pad(
    date.getMinutes()
  )}`;
}

/*
 * TIME VALIDATION
 */
function isValidTime(
  value: string
) {
  const match = value.match(
    /^(\d{2}):(\d{2})$/
  );

  if (!match) {
    return false;
  }

  const hours = Number(
    match[1]
  );

  const minutes = Number(
    match[2]
  );

  return (
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

/*
 * EVENT TIME
 */
function formatEventTime(
  value: string
) {
  const date = new Date(value);

  return date.toLocaleTimeString(
    "de-DE",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}