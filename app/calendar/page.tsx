"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat2,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Recurrence = "none" | "weekly" | "biweekly" | "monthly" | "yearly";
type SeriesScope = "single" | "following" | "all";

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
  source?: "event" | "work" | "schedule";
  source_id?: number;
};

type WorkProject = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

type WorkItem = {
  id: number;
  project_id: number | null;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  deadline: string | null;
};

type ScheduleEntry = {
  id: number;
  schedule_date: string;
  service_time: "10:00" | "12:30";
  entry_type: "lesson" | "event";
  title_de: string | null;
  title_ru: string | null;
  bible_text: string | null;
  series: string | null;
  notes: string | null;
};

type EventForm = {
  title: string;
  description: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  category: string;
  recurrence: Recurrence;
  recurrenceUntil: string;
};

const categories = [
  { id: "youth", ru: "Teens", de: "Teens", dot: "bg-violet-500" },
  { id: "team", ru: "Команда", de: "Team", dot: "bg-blue-500" },
  { id: "church", ru: "Церковь", de: "Gemeinde", dot: "bg-emerald-500" },
  { id: "lesson", ru: "Урок", de: "Unterricht", dot: "bg-amber-500" },
  { id: "important", ru: "Важное", de: "Wichtig", dot: "bg-red-500" },
  { id: "work", ru: "Работа", de: "Arbeit", dot: "bg-slate-700" },
  { id: "other", ru: "Другое", de: "Sonstiges", dot: "bg-neutral-400" },
] as const;

const emptyForm: EventForm = {
  title: "",
  description: "",
  date: "",
  endDate: "",
  startTime: "10:00",
  endTime: "11:00",
  location: "",
  category: "other",
  recurrence: "none",
  recurrenceUntil: "",
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localDateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function eventDateKey(value: string) {
  const date = new Date(value);
  return dateKey(date);
}

function eventOverlapsDate(event: Pick<Event, "start_at" | "end_at">, key: string) {
  const dayStart = localDateFromKey(key);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  return start < dayEnd && end > dayStart;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLongDate(value: string, language: "ru" | "de") {
  return new Date(value).toLocaleDateString(
    language === "ru" ? "ru-RU" : "de-DE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatShortDate(value: string, language: "ru" | "de") {
  return new Date(value).toLocaleDateString(
    language === "ru" ? "ru-RU" : "de-DE",
    { day: "numeric", month: "short", year: "numeric" }
  );
}

function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function isValidTime(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  let mondayIndex = first.getDay();
  mondayIndex = mondayIndex === 0 ? 6 : mondayIndex - 1;

  const days: Date[] = [];

  for (let i = mondayIndex - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  for (let day = 1; day <= last.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  let next = 1;
  while (days.length < 42) {
    days.push(new Date(year, month + 1, next++));
  }

  return days;
}

function nextOccurrence(date: Date, recurrence: Recurrence) {
  const next = new Date(date);

  if (recurrence === "weekly") next.setDate(next.getDate() + 7);
  if (recurrence === "biweekly") next.setDate(next.getDate() + 14);

  if (recurrence === "monthly") {
    const originalDay = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0
    ).getDate();
    next.setDate(Math.min(originalDay, lastDay));
  }

  if (recurrence === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  }

  return next;
}

function generateOccurrences(
  start: Date,
  end: Date,
  recurrence: Recurrence,
  until: Date | null
) {
  if (recurrence === "none" || !until) {
    return [{ start: new Date(start), end: new Date(end) }];
  }

  const result: { start: Date; end: Date }[] = [];
  const duration = end.getTime() - start.getTime();
  let current = new Date(start);

  while (current <= until && result.length < 500) {
    result.push({
      start: new Date(current),
      end: new Date(current.getTime() + duration),
    });
    current = nextOccurrence(current, recurrence);
  }

  return result;
}

function googleDateTime(value: string) {
  const date = new Date(value);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(
    date.getUTCDate()
  )}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(
    date.getUTCSeconds()
  )}Z`;
}

function googleDateOnly(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}${month}${day}`;
}

function addOneDayToDateKey(value: string) {
  const date = localDateFromKey(value);
  date.setDate(date.getDate() + 1);
  return dateKey(date);
}

function buildGoogleCalendarUrl({
  title,
  description,
  location,
  startAt,
  endAt,
  allDay = false,
}: {
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt: string;
  allDay?: boolean;
}) {
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", title);
  params.set("details", description?.trim() || "");
  if (location?.trim()) params.set("location", location.trim());
  if (allDay) {
    params.set("dates", `${googleDateOnly(startAt)}/${googleDateOnly(endAt)}`);
  } else {
    params.set("dates", `${googleDateTime(startAt)}/${googleDateTime(endAt)}`);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function categoryInfo(category: string, language: "ru" | "de") {
  const item = categories.find((entry) => entry.id === category);
  return (
    item ?? {
      id: "other",
      ru: "Другое",
      de: "Sonstiges",
      dot: "bg-neutral-400",
    }
  );
}

export default function CalendarPage() {
  const { language } = useLanguage();
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [events, setEvents] = useState<Event[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [workProjects, setWorkProjects] = useState<WorkProject[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
  const [selectedScheduleEntry, setSelectedScheduleEntry] = useState<ScheduleEntry | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [seriesAction, setSeriesAction] = useState<"edit" | "delete" | null>(
    null
  );
  const [seriesScope, setSeriesScope] = useState<SeriesScope>("single");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<EventForm>(emptyForm);

  const days = useMemo(() => getMonthDays(currentMonth), [currentMonth]);

  const workCalendarEvents = useMemo<Event[]>(() => {
    return workItems
      .filter((item) => Boolean(item.deadline))
      .map((item) => {
        const project = workProjects.find((entry) => entry.id === item.project_id);
        const startKey = item.deadline as string;
        const endKey = addOneDayToDateKey(startKey);
        return {
          id: -item.id,
          title: item.title,
          description: project
            ? `${language === "ru" ? "Проект" : "Projekt"}: ${project.title}${item.description ? `\n\n${item.description}` : ""}`
            : item.description,
          start_at: `${startKey}T00:00:00`,
          end_at: `${endKey}T00:00:00`,
          location: null,
          category: "work",
          series_id: null,
          recurrence: "none",
        };
      });
  }, [language, workItems, workProjects]);

  const scheduleCalendarEvents = useMemo<Event[]>(() => {
    return scheduleEntries.map((entry) => {
      const start = toDateTime(entry.schedule_date, entry.service_time);
      const durationMinutes = entry.entry_type === "lesson" ? 90 : 60;
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      const title =
        language === "ru"
          ? entry.title_ru || entry.title_de || "Служение"
          : entry.title_de || entry.title_ru || "Dienst";

      const details = [
        entry.entry_type === "lesson"
          ? language === "ru" ? "Урок" : "Unterricht"
          : language === "ru" ? "Событие" : "Veranstaltung",
        entry.bible_text ? `Bibel: ${entry.bible_text}` : null,
        entry.series ? `${language === "ru" ? "Серия" : "Reihe"}: ${entry.series}` : null,
        entry.notes ? entry.notes : null,
      ].filter(Boolean).join("\n");

      return {
        id: -100000 - entry.id,
        title,
        description: details || null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        location: language === "ru" ? "Расписание" : "Dienstplan",
        category: entry.entry_type === "lesson" ? "lesson" : "youth",
        series_id: null,
        recurrence: "none",
        source: "schedule",
        source_id: entry.id,
      };
    });
  }, [language, scheduleEntries]);

  const calendarEvents = useMemo(
    () => [...events, ...workCalendarEvents, ...scheduleCalendarEvents],
    [events, workCalendarEvents, scheduleCalendarEvents]
  );

  const selectedDayEvents = useMemo(
    () =>
      calendarEvents
        .filter((event) => eventOverlapsDate(event, selectedDate))
        .sort(
          (a, b) =>
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        ),
    [calendarEvents, selectedDate]
  );

  const monthEvents = useMemo(() => {
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );

    return calendarEvents.filter((event) => {
      const start = new Date(event.start_at);
      const end = new Date(event.end_at);
      return start < monthEnd && end > monthStart;
    });
  }, [calendarEvents, currentMonth]);

  const monthLabel = currentMonth.toLocaleDateString(
    language === "ru" ? "ru-RU" : "de-DE",
    { month: "long", year: "numeric" }
  );

  const weekdays =
    language === "ru"
      ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
      : ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const loadEvents = async () => {
    setLoading(true);

    const rangeStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );
    const rangeEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 2,
      1
    );

    const [
      { data: eventData, error: eventError },
      { data: workData, error: workError },
      { data: projectData, error: projectError },
      { data: scheduleData, error: scheduleError },
    ] = await Promise.all([
      supabase
        .from("events")
        .select(
          "id,title,description,start_at,end_at,location,category,series_id,recurrence"
        )
        .lt("start_at", rangeEnd.toISOString())
        .gt("end_at", rangeStart.toISOString())
        .order("start_at", { ascending: true }),
      supabase
        .from("work_items")
        .select("id,project_id,title,description,status,priority,deadline")
        .not("deadline", "is", null)
        .gte("deadline", dateKey(rangeStart))
        .lt("deadline", dateKey(rangeEnd))
        .order("deadline", { ascending: true }),
      supabase
        .from("work_projects")
        .select("id,title,description,status,start_date,end_date")
        .in("status", ["planned", "active", "completed"]),
      supabase
        .from("schedule_entries")
        .select("id,schedule_date,service_time,entry_type,title_de,title_ru,bible_text,series,notes")
        .gte("schedule_date", dateKey(rangeStart))
        .lt("schedule_date", dateKey(rangeEnd))
        .order("schedule_date", { ascending: true })
        .order("service_time", { ascending: true }),
    ]);

    if (eventError) console.error("Calendar events load error:", eventError);
    if (workError) console.error("Calendar work items load error:", workError);
    if (projectError) console.error("Calendar work projects load error:", projectError);
    if (scheduleError) console.error("Calendar schedule load error:", scheduleError);

    setEvents((eventData ?? []) as Event[]);
    setWorkItems((workData ?? []) as WorkItem[]);
    setWorkProjects((projectData ?? []) as WorkProject[]);
    setScheduleEntries((scheduleData ?? []) as ScheduleEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, [currentMonth]);

  const goToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(dateKey(today));
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + offset,
        1
      )
    );
  };

  const selectDay = (date: Date) => {
    setSelectedDate(dateKey(date));
  };

  const openCreate = () => {
    setSelectedEvent(null);
    setSelectedWorkItem(null);

    const baseDate = localDateFromKey(selectedDate);
    const date = dateKey(baseDate);

    setForm({
      ...emptyForm,
      date,
      endDate: date,
      startTime: "10:00",
      endTime: "11:00",
    });

    setEditorOpen(true);
  };

  const openEdit = (event: Event) => {
    const start = new Date(event.start_at);
    const end = new Date(event.end_at);

    setSelectedEvent(event);
    setSelectedWorkItem(null);
    setForm({
      title: event.title,
      description: event.description ?? "",
      date: dateKey(start),
      endDate: dateKey(end),
      startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      location: event.location ?? "",
      category: event.category,
      recurrence: event.recurrence ?? "none",
      recurrenceUntil: "",
    });

    setEditorOpen(true);
  };

  const closeOverlays = () => {
    if (saving) return;
    setEditorOpen(false);
    setDeleteOpen(false);
    setSeriesOpen(false);
    setSeriesAction(null);
    setSelectedEvent(null);
    setSelectedWorkItem(null);
    setSelectedScheduleEntry(null);
  };

  const updateForm = (field: keyof EventForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      alert(language === "ru" ? "Введите название." : "Bitte einen Titel eingeben.");
      return null;
    }

    if (
      !form.date ||
      !form.endDate ||
      !isValidTime(form.startTime) ||
      !isValidTime(form.endTime)
    ) {
      alert(
        language === "ru"
          ? "Проверьте даты и время."
          : "Bitte Start-/Enddatum und Uhrzeit prüfen."
      );
      return null;
    }

    const start = toDateTime(form.date, form.startTime);
    const end = toDateTime(form.endDate, form.endTime);

    if (end <= start) {
      alert(
        language === "ru"
          ? "Дата и время окончания должны быть позже начала."
          : "Enddatum und Endzeit müssen nach dem Beginn liegen."
      );
      return null;
    }

    let until: Date | null = null;

    if (form.recurrence !== "none") {
      if (!form.recurrenceUntil) {
        alert(
          language === "ru"
            ? "Выберите дату окончания повторения."
            : "Bitte ein Enddatum für die Wiederholung wählen."
        );
        return null;
      }

      until = new Date(`${form.recurrenceUntil}T23:59:59`);

      if (until < start) {
        alert(
          language === "ru"
            ? "Дата окончания повторения должна быть позже начала."
            : "Das Ende der Wiederholung muss nach dem Start liegen."
        );
        return null;
      }
    }

    return { start, end, until };
  };

  const createEvent = async () => {
    const validated = validateForm();
    if (!validated) return;

    setSaving(true);

    const seriesId =
      form.recurrence === "none" ? null : crypto.randomUUID();

    const occurrences = generateOccurrences(
      validated.start,
      validated.end,
      form.recurrence,
      validated.until
    );

    const rows = occurrences.map(({ start, end }) => ({
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      location: form.location.trim() || null,
      category: form.category,
      series_id: seriesId,
      recurrence: form.recurrence,
    }));

    const { error } = await supabase.from("events").insert(rows);

    if (error) {
      console.error("Create event error:", error);
      alert(
        language === "ru"
          ? "Не удалось создать событие."
          : "Das Ereignis konnte nicht erstellt werden."
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditorOpen(false);
    setSelectedDate(form.date);
    setCurrentMonth(localDateFromKey(form.date));
    await loadEvents();
  };

  const saveSingleEvent = async () => {
    if (!selectedEvent) return;

    const validated = validateForm();
    if (!validated) return;

    setSaving(true);

    const { data, error } = await supabase
      .from("events")
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_at: validated.start.toISOString(),
        end_at: validated.end.toISOString(),
        location: form.location.trim() || null,
        category: form.category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedEvent.id)
      .select()
      .single();

    if (error) {
      console.error("Update event error:", error);
      alert(
        language === "ru"
          ? "Не удалось сохранить событие."
          : "Das Ereignis konnte nicht gespeichert werden."
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditorOpen(false);
    setSelectedEvent(null);
    setSelectedDate(form.date);
    setCurrentMonth(localDateFromKey(form.date));
    await loadEvents();

    // Keep the database as source of truth.
    void data;
  };

  const saveSeries = async () => {
    if (!selectedEvent) return;

    const validated = validateForm();
    if (!validated) return;

    setSaving(true);

    const { data: seriesEvents, error: seriesError } = await supabase
      .from("events")
      .select("id,start_at,end_at,series_id")
      .eq("series_id", selectedEvent.series_id);

    if (seriesError) {
      console.error("Series load error:", seriesError);
      setSaving(false);
      return;
    }

    const oldSelectedStart = new Date(selectedEvent.start_at).getTime();
    const newDuration =
      validated.end.getTime() - validated.start.getTime();
    const startShift =
      validated.start.getTime() - oldSelectedStart;

    const targets = (seriesEvents ?? []).filter((event) => {
      if (seriesScope === "all") return true;
      if (seriesScope === "single") return event.id === selectedEvent.id;
      return new Date(event.start_at).getTime() >= oldSelectedStart;
    });

    try {
      for (const event of targets) {
        const oldStart = new Date(event.start_at);
        const newStart = new Date(oldStart.getTime() + startShift);
        const newEnd = new Date(newStart.getTime() + newDuration);

        const { error } = await supabase
          .from("events")
          .update({
            title: form.title.trim(),
            description: form.description.trim() || null,
            start_at: newStart.toISOString(),
            end_at: newEnd.toISOString(),
            location: form.location.trim() || null,
            category: form.category,
            updated_at: new Date().toISOString(),
          })
          .eq("id", event.id);

        if (error) throw error;
      }

      setSaving(false);
      setEditorOpen(false);
      setSelectedEvent(null);
      await loadEvents();
    } catch (error) {
      console.error("Series update error:", error);
      alert(
        language === "ru"
          ? "Не удалось полностью обновить серию."
          : "Die Serie konnte nicht vollständig aktualisiert werden."
      );
      setSaving(false);
      await loadEvents();
    }
  };

  const handleSave = () => {
    if (!selectedEvent) {
      void createEvent();
      return;
    }

    if (selectedEvent.recurrence !== "none" && seriesScope !== "single") {
      void saveSeries();
      return;
    }

    void saveSingleEvent();
  };

  const askDelete = (event: Event) => {
    setSelectedEvent(event);

    if (event.recurrence !== "none") {
      setSeriesAction("delete");
      setSeriesScope("single");
      setSeriesOpen(true);
    } else {
      setDeleteOpen(true);
    }
  };

  const askEdit = (event: Event) => {
    setSelectedEvent(event);

    if (event.recurrence !== "none") {
      setSeriesAction("edit");
      setSeriesScope("single");
      setSeriesOpen(true);
    } else {
      openEdit(event);
    }
  };

  const applySeriesChoice = (scope: SeriesScope) => {
    setSeriesScope(scope);
    setSeriesOpen(false);

    if (seriesAction === "edit" && selectedEvent) {
      openEdit(selectedEvent);
    }

    if (seriesAction === "delete") {
      setDeleteOpen(true);
    }

    setSeriesAction(null);
  };

  const deleteEvent = async () => {
    if (!selectedEvent) return;

    setSaving(true);

    try {
      if (selectedEvent.recurrence === "none" || seriesScope === "single") {
        const { error } = await supabase
          .from("events")
          .delete()
          .eq("id", selectedEvent.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("events")
          .select("id,start_at")
          .eq("series_id", selectedEvent.series_id);

        if (error) throw error;

        const selectedStart = new Date(selectedEvent.start_at).getTime();

        const ids = (data ?? [])
          .filter((event) => {
            if (seriesScope === "all") return true;
            return new Date(event.start_at).getTime() >= selectedStart;
          })
          .map((event) => event.id);

        if (ids.length) {
          const { error: deleteError } = await supabase
            .from("events")
            .delete()
            .in("id", ids);

          if (deleteError) throw deleteError;
        }
      }

      setSaving(false);
      closeOverlays();
      await loadEvents();
    } catch (error) {
      console.error("Delete event error:", error);
      alert(
        language === "ru"
          ? "Не удалось удалить событие."
          : "Das Ereignis konnte nicht gelöscht werden."
      );
      setSaving(false);
      await loadEvents();
    }
  };

  const openWorkItem = (item: WorkItem) => {
    setSelectedEvent(null);
    setSelectedScheduleEntry(null);
    setSelectedWorkItem(item);
  };

  const openScheduleEntry = (entry: ScheduleEntry) => {
    setSelectedEvent(null);
    setSelectedWorkItem(null);
    setSelectedScheduleEntry(entry);
  };

  const getWorkProject = (item: WorkItem) =>
    workProjects.find((project) => project.id === item.project_id) ?? null;

  const addEventToGoogleCalendar = (event: Event) => {
    const url = buildGoogleCalendarUrl({
      title: event.title,
      description: event.description,
      location: event.location,
      startAt: event.start_at,
      endAt: event.end_at,
      allDay: false,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const addWorkItemToGoogleCalendar = (item: WorkItem) => {
    if (!item.deadline) return;
    const project = getWorkProject(item);
    const url = buildGoogleCalendarUrl({
      title: item.title,
      description: project
        ? `${language === "ru" ? "Проект" : "Projekt"}: ${project.title}${item.description ? `\n\n${item.description}` : ""}`
        : item.description,
      startAt: item.deadline,
      endAt: addOneDayToDateKey(item.deadline),
      allDay: true,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const addScheduleEntryToGoogleCalendar = (entry: ScheduleEntry) => {
    const start = toDateTime(entry.schedule_date, entry.service_time);
    const durationMinutes = entry.entry_type === "lesson" ? 90 : 60;
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const title =
      language === "ru"
        ? entry.title_ru || entry.title_de || "Служение"
        : entry.title_de || entry.title_ru || "Dienst";
    const description = [
      entry.bible_text ? `Bibel: ${entry.bible_text}` : null,
      entry.series ? `${language === "ru" ? "Серия" : "Reihe"}: ${entry.series}` : null,
      entry.notes || null,
    ].filter(Boolean).join("\n");

    const url = buildGoogleCalendarUrl({
      title,
      description,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      allDay: false,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5] pb-32 text-neutral-950 sm:pb-10">
      <div className="mx-auto w-full max-w-6xl px-3 pb-10 pt-4 sm:px-6 sm:pt-8">
        {/* TOP */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
              {language === "ru" ? "Календарь" : "Kalender"}
            </div>
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {monthLabel}
            </h1>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-sm transition hover:bg-neutral-800 sm:h-auto sm:w-auto sm:gap-2 sm:px-4"
            aria-label={language === "ru" ? "Новое событие" : "Neues Ereignis"}
          >
            <Plus size={19} />
            <span className="hidden text-sm font-semibold sm:inline">
              {language === "ru" ? "Новое" : "Neu"}
            </span>
          </button>
        </header>

        {/* NAVIGATION */}
        <section className="mb-4 flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={goToday}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
          >
            {language === "ru" ? "Сегодня" : "Heute"}
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
              aria-label={language === "ru" ? "Предыдущий месяц" : "Vorheriger Monat"}
            >
              <ChevronLeft size={19} />
            </button>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
              aria-label={language === "ru" ? "Следующий месяц" : "Nächster Monat"}
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </section>

        {/* CALENDAR */}
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
            {weekdays.map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const key = dateKey(day);
              const isCurrentMonth =
                day.getMonth() === currentMonth.getMonth() &&
                day.getFullYear() === currentMonth.getFullYear();
              const isSelected = key === selectedDate;
              const isTodayKey = key === dateKey(new Date());

              const dayEvents = monthEvents.filter((event) =>
                eventOverlapsDate(event, key)
              );

              return (
                <button
                  type="button"
                  key={`${key}-${index}`}
                  onClick={() => selectDay(day)}
                  className={`relative min-h-[68px] border-b border-r border-neutral-200 p-1.5 text-left transition sm:min-h-[104px] sm:p-2 ${
                    isCurrentMonth ? "bg-white" : "bg-neutral-50/70"
                  } ${
                    isSelected
                      ? "z-10 bg-neutral-50 ring-2 ring-inset ring-neutral-900"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      isTodayKey
                        ? "bg-neutral-950 text-white"
                        : isCurrentMonth
                        ? "text-neutral-800"
                        : "text-neutral-300"
                    }`}
                  >
                    {day.getDate()}
                  </div>

                  <div className="mt-1.5 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      const info = categoryInfo(event.category, language);

                      return (
                        <div
                          key={event.id}
                          className="flex min-w-0 items-center gap-1"
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${info.dot}`}
                          />
                          <span className="hidden min-w-0 truncate text-[10px] font-medium text-neutral-600 sm:block">
                            {event.category === "work" ? "Deadline · " : `${formatTime(event.start_at)} `}{event.title}
                          </span>
                          <span className="block truncate text-[9px] font-medium text-neutral-600 sm:hidden">
                            {event.category === "work" ? "Deadline" : formatTime(event.start_at)}
                          </span>
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <div className="text-[9px] font-semibold text-neutral-400">
                        +{dayEvents.length - 3}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* SELECTED DAY */}
        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                {language === "ru" ? "Выбранный день" : "Ausgewählter Tag"}
              </div>
              <h2 className="mt-1 text-lg font-semibold capitalize">
                {localDateFromKey(selectedDate).toLocaleDateString(
                  language === "ru" ? "ru-RU" : "de-DE",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }
                )}
              </h2>
            </div>

            <span className="text-xs text-neutral-400">
              {selectedDayEvents.length}{" "}
              {language === "ru" ? "событий" : "Termine"}
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-400">
              {language === "ru" ? "Загрузка..." : "Laden..."}
            </div>
          ) : selectedDayEvents.length === 0 ? (
            <button
              type="button"
              onClick={openCreate}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-left transition hover:border-neutral-400 hover:bg-neutral-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                <Plus size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {language === "ru" ? "Свободный день" : "Noch kein Termin"}
                </div>
                <div className="mt-0.5 text-xs text-neutral-400">
                  {language === "ru"
                    ? "Добавить событие"
                    : "Termin hinzufügen"}
                </div>
              </div>
            </button>
          ) : (
            <div className="space-y-2.5">
              {selectedDayEvents.map((event) => {
                const info = categoryInfo(event.category, language);

                return (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-950 py-2 text-white">
                        {event.category === "work" ? (
                          <BriefcaseBusiness size={14} className="mb-1 opacity-70" />
                        ) : event.source === "schedule" ? (
                          <CalendarDays size={14} className="mb-1 opacity-70" />
                        ) : (
                          <Clock3 size={14} className="mb-1 opacity-70" />
                        )}
                        <span className="text-[10px] font-bold text-center">
                          {event.category === "work" ? "DEADLINE" : formatTime(event.start_at)}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold">
                              {event.title}
                            </h3>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
                              <span className="inline-flex items-center gap-1">
                                <span className={`h-1.5 w-1.5 rounded-full ${info.dot}`} />
                                {language === "ru" ? info.ru : info.de}
                              </span>

                              {event.category === "work" ? (
                                <span className="inline-flex items-center gap-1">
                                  · {language === "ru" ? "Дедлайн задачи" : "Aufgaben-Deadline"}
                                </span>
                              ) : (
                                <>
                                  <span>
                                    {formatTime(event.start_at)}–{formatTime(event.end_at)}
                                  </span>
                                  {eventDateKey(event.start_at) !== eventDateKey(event.end_at) && (
                                    <span className="inline-flex items-center gap-1">
                                      · {formatShortDate(event.start_at, language)} – {formatShortDate(event.end_at, language)}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (event.source === "schedule" && event.source_id) {
                                const entry = scheduleEntries.find((item) => item.id === event.source_id);
                                if (entry) openScheduleEntry(entry);
                                return;
                              }

                              if (event.category === "work") {
                                const item = workItems.find((entry) => entry.id === Math.abs(event.id));
                                if (item) {
                                  setSelectedWorkItem(item);
                                  setSelectedEvent(null);
                                  setSelectedScheduleEntry(null);
                                }
                              } else {
                                setSelectedEvent(event);
                                setSelectedWorkItem(null);
                                setSelectedScheduleEntry(null);
                              }
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                            aria-label={language === "ru" ? "Открыть" : "Öffnen"}
                          >
                            <MoreHorizontal size={17} />
                          </button>
                        </div>

                        {event.location && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
                            <MapPin size={13} />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}

                        {event.category === "work" ? (
                          <button
                            type="button"
                            onClick={() => {
                              const item = workItems.find((entry) => entry.id === Math.abs(event.id));
                              if (item) openWorkItem(item);
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            <BriefcaseBusiness size={11} />
                            {language === "ru" ? "Открыть работу" : "Arbeit öffnen"}
                          </button>
                        ) : event.source === "schedule" ? (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-700">
                            <CalendarDays size={11} />
                            {language === "ru" ? "Из расписания" : "Aus Dienstplan"}
                          </div>
                        ) : event.recurrence !== "none" ? (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-500">
                            <Repeat2 size={11} />
                            {language === "ru" ? "Повторяющееся" : "Wiederkehrend"}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* AUTOMATIC SOURCES */}
        <section className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
            {language === "ru" ? "Автоматическая синхронизация" : "Automatische Synchronisierung"}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <BriefcaseBusiness size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {language === "ru" ? "Arbeit" : "Arbeit"}
                </div>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  {language === "ru" ? "Дедлайны задач появляются автоматически." : "Aufgaben-Deadlines erscheinen automatisch."}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-violet-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
                <CalendarDays size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-violet-950">
                  {language === "ru" ? "Расписание" : "Dienstplan"}
                </div>
                <p className="mt-0.5 text-[11px] leading-4 text-violet-700/70">
                  {language === "ru" ? "Все служения из расписания появляются автоматически." : "Alle Dienste aus dem Dienstplan erscheinen automatisch."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MONTH SUMMARY */}
        <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {language === "ru" ? "События" : "Termine"}
            </div>
            <div className="mt-1 text-xl font-semibold">{monthEvents.length}</div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {language === "ru" ? "Повторения" : "Wiederholungen"}
            </div>
            <div className="mt-1 text-xl font-semibold">
              {monthEvents.filter((event) => event.recurrence !== "none").length}
            </div>
          </div>

          <div className="col-span-2 rounded-2xl border border-neutral-200 bg-white p-4 sm:col-span-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {language === "ru" ? "Этот месяц" : "Dieser Monat"}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold capitalize">
              <CalendarDays size={16} className="text-neutral-400" />
              {monthLabel}
            </div>
          </div>
        </section>
      </div>

      {/* SCHEDULE ENTRY ACTION SHEET */}
      {selectedScheduleEntry && !selectedEvent && !selectedWorkItem && !editorOpen && !deleteOpen && !seriesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/35 p-2 backdrop-blur-[2px] sm:items-center sm:justify-center"
          onClick={() => setSelectedScheduleEntry(null)}
        >
          <div
            className="w-full max-w-lg rounded-[24px] bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-500">
                  <CalendarDays size={13} />
                  {language === "ru" ? "Расписание" : "Dienstplan"}
                </div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {language === "ru"
                    ? selectedScheduleEntry.title_ru || selectedScheduleEntry.title_de || "Служение"
                    : selectedScheduleEntry.title_de || selectedScheduleEntry.title_ru || "Dienst"}
                </h2>
                <p className="mt-1 text-sm capitalize text-neutral-500">
                  {formatLongDate(`${selectedScheduleEntry.schedule_date}T12:00:00`, language)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedScheduleEntry(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-neutral-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === "ru" ? "Время" : "Zeit"}
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {selectedScheduleEntry.service_time}–{selectedScheduleEntry.entry_type === "lesson" ? "11:30" : "13:30"}
                </div>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === "ru" ? "Тип" : "Typ"}
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {selectedScheduleEntry.entry_type === "lesson"
                    ? language === "ru" ? "Урок" : "Unterricht"
                    : language === "ru" ? "Событие" : "Veranstaltung"}
                </div>
              </div>
            </div>

            {selectedScheduleEntry.bible_text && (
              <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Bibel</div>
                <div className="mt-1 font-medium">{selectedScheduleEntry.bible_text}</div>
              </div>
            )}

            {selectedScheduleEntry.series && (
              <div className="mt-3 text-sm text-neutral-600">
                <span className="font-semibold">{language === "ru" ? "Серия:" : "Reihe:"}</span> {selectedScheduleEntry.series}
              </div>
            )}

            {selectedScheduleEntry.notes && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-600">{selectedScheduleEntry.notes}</p>
            )}

            <div className="mt-6 grid grid-cols-1 gap-2 border-t border-neutral-100 pt-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => addScheduleEntryToGoogleCalendar(selectedScheduleEntry)}
                className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <CalendarDays size={15} />
                {language === "ru" ? "В Google Календарь" : "Google Kalender"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedScheduleEntry(null);
                  router.push("/schedule");
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                <Clock3 size={15} />
                {language === "ru" ? "Открыть расписание" : "Dienstplan öffnen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVENT ACTION SHEET */}
      {selectedEvent && !selectedWorkItem && !editorOpen && !deleteOpen && !seriesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/35 p-2 backdrop-blur-[2px] sm:items-center sm:justify-center"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-lg rounded-[24px] bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      categoryInfo(selectedEvent.category, language).dot
                    }`}
                  />
                  {language === "ru"
                    ? categoryInfo(selectedEvent.category, language).ru
                    : categoryInfo(selectedEvent.category, language).de}
                </div>

                <h2 className="text-xl font-semibold tracking-tight">
                  {selectedEvent.title}
                </h2>

                <p className="mt-1 text-sm capitalize text-neutral-500">
                  {eventDateKey(selectedEvent.start_at) === eventDateKey(selectedEvent.end_at)
                    ? formatLongDate(selectedEvent.start_at, language)
                    : `${formatShortDate(selectedEvent.start_at, language)} – ${formatShortDate(selectedEvent.end_at, language)}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-neutral-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === "ru" ? "Время" : "Zeit"}
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {formatTime(selectedEvent.start_at)}–{formatTime(selectedEvent.end_at)}
                </div>
                {eventDateKey(selectedEvent.start_at) !== eventDateKey(selectedEvent.end_at) && (
                  <div className="mt-1 text-[11px] text-neutral-400">
                    {formatShortDate(selectedEvent.start_at, language)} – {formatShortDate(selectedEvent.end_at, language)}
                  </div>
                )}
              </div>

              {selectedEvent.location && (
                <div className="rounded-xl bg-neutral-50 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === "ru" ? "Место" : "Ort"}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold">
                    {selectedEvent.location}
                  </div>
                </div>
              )}
            </div>

            {selectedEvent.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
                {selectedEvent.description}
              </p>
            )}

            {selectedEvent.recurrence !== "none" && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500">
                <Repeat2 size={14} />
                {language === "ru"
                  ? "Повторяющееся событие"
                  : "Wiederkehrendes Ereignis"}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-2 border-t border-neutral-100 pt-4 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => addEventToGoogleCalendar(selectedEvent)}
                className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <CalendarDays size={15} />
                {language === "ru" ? "В Google Календарь" : "Google Kalender"}
              </button>

              <button
                type="button"
                onClick={() => askEdit(selectedEvent)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <Pencil size={15} />
                {language === "ru" ? "Изменить" : "Bearbeiten"}
              </button>

              <button
                type="button"
                onClick={() => askDelete(selectedEvent)}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                <Trash2 size={15} />
                {language === "ru" ? "Удалить" : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WORK ITEM ACTION SHEET */}
      {selectedWorkItem && !editorOpen && !deleteOpen && !seriesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/35 p-2 backdrop-blur-[2px] sm:items-center sm:justify-center"
          onClick={() => setSelectedWorkItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-[24px] bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                  <BriefcaseBusiness size={13} />
                  {language === "ru" ? "Работа" : "Arbeit"}
                </div>
                <h2 className="text-xl font-semibold tracking-tight">{selectedWorkItem.title}</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {getWorkProject(selectedWorkItem)?.title ?? (language === "ru" ? "Без проекта" : "Ohne Projekt")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkItem(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-neutral-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{language === "ru" ? "Дедлайн" : "Deadline"}</div>
                <div className="mt-1 text-sm font-semibold">
                  {selectedWorkItem.deadline ? formatLongDate(`${selectedWorkItem.deadline}T12:00:00`, language) : "—"}
                </div>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{language === "ru" ? "Статус" : "Status"}</div>
                <div className="mt-1 text-sm font-semibold">
                  {selectedWorkItem.status === "completed"
                    ? language === "ru" ? "Выполнено" : "Erledigt"
                    : selectedWorkItem.status === "in_progress"
                    ? language === "ru" ? "В работе" : "In Arbeit"
                    : language === "ru" ? "Открыто" : "Offen"}
                </div>
              </div>
            </div>

            {selectedWorkItem.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-600">{selectedWorkItem.description}</p>
            )}

            <div className="mt-6 grid grid-cols-1 gap-2 border-t border-neutral-100 pt-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => addWorkItemToGoogleCalendar(selectedWorkItem)}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                <CalendarDays size={15} />
                {language === "ru" ? "В Google Календарь" : "Zum Google Kalender"}
              </button>
              <button
                type="button"
                onClick={() => selectedWorkItem.project_id && router.push(`/work/${selectedWorkItem.project_id}`)}
                disabled={!selectedWorkItem.project_id}
                className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <BriefcaseBusiness size={15} />
                {language === "ru" ? "Открыть работу" : "Arbeit öffnen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/35 p-2 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4"
          onClick={() => !saving && setEditorOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                  {selectedEvent
                    ? language === "ru"
                      ? "Редактирование"
                      : "Bearbeiten"
                    : language === "ru"
                    ? "Новое событие"
                    : "Neuer Termin"}
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  {selectedEvent
                    ? selectedEvent.title
                    : language === "ru"
                    ? "Добавить событие"
                    : "Termin hinzufügen"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => !saving && setEditorOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <Field
                label={language === "ru" ? "Название" : "Titel"}
                value={form.title}
                onChange={(value) => updateForm("title", value)}
                placeholder={
                  language === "ru" ? "Например: Teens Abend" : "z. B. Teens Abend"
                }
              />

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === "ru" ? "Описание" : "Beschreibung"}
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400"
                  placeholder={
                    language === "ru"
                      ? "Дополнительная информация..."
                      : "Weitere Informationen..."
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === "ru" ? "Дата начала" : "Startdatum"}
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateForm("date", value);
                      if (!form.endDate || form.endDate < value) {
                        updateForm("endDate", value);
                      }
                    }}
                    className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === "ru" ? "Дата окончания" : "Enddatum"}
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.date || undefined}
                    onChange={(event) => updateForm("endDate", event.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === "ru" ? "Время начала" : "Beginn"}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="10:00"
                    value={form.startTime}
                    onChange={(event) =>
                      updateForm(
                        "startTime",
                        event.target.value.replace(/[^0-9:]/g, "")
                      )
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === "ru" ? "Время окончания" : "Ende"}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="11:00"
                    value={form.endTime}
                    onChange={(event) =>
                      updateForm(
                        "endTime",
                        event.target.value.replace(/[^0-9:]/g, "")
                      )
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-neutral-50 px-3 py-2.5 text-[11px] text-neutral-500">
                {language === "ru"
                  ? "Если дата окончания позже даты начала, событие будет отображаться во все эти дни."
                  : "Liegt das Enddatum nach dem Startdatum, wird der Termin an allen diesen Tagen angezeigt."}
              </div>

              <Field
                label={language === "ru" ? "Место" : "Ort"}
                value={form.location}
                onChange={(value) => updateForm("location", value)}
                placeholder={
                  language === "ru"
                    ? "Например: Gemeinde Berlin"
                    : "z. B. Gemeinde Berlin"
                }
              />

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === "ru" ? "Категория" : "Kategorie"}
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {categories.filter((category) => category.id !== "work").map((category) => (
                    <button
                      type="button"
                      key={category.id}
                      onClick={() => updateForm("category", category.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                        form.category === category.id
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          form.category === category.id
                            ? "bg-white"
                            : category.dot
                        }`}
                      />
                      {language === "ru" ? category.ru : category.de}
                    </button>
                  ))}
                </div>
              </div>

              {!selectedEvent && (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Repeat2 size={14} className="text-neutral-500" />
                    {language === "ru" ? "Повторение" : "Wiederholung"}
                  </div>

                  <select
                    value={form.recurrence}
                    onChange={(event) =>
                      updateForm("recurrence", event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="none">
                      {language === "ru" ? "Не повторяется" : "Keine Wiederholung"}
                    </option>
                    <option value="weekly">
                      {language === "ru" ? "Каждую неделю" : "Jede Woche"}
                    </option>
                    <option value="biweekly">
                      {language === "ru" ? "Каждые 2 недели" : "Alle 2 Wochen"}
                    </option>
                    <option value="monthly">
                      {language === "ru" ? "Каждый месяц" : "Jeden Monat"}
                    </option>
                    <option value="yearly">
                      {language === "ru" ? "Каждый год" : "Jedes Jahr"}
                    </option>
                  </select>

                  {form.recurrence !== "none" && (
                    <input
                      type="date"
                      value={form.recurrenceUntil}
                      min={form.date}
                      onChange={(event) =>
                        updateForm("recurrenceUntil", event.target.value)
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2 border-t border-neutral-100 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditorOpen(false)}
                className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                {language === "ru" ? "Отмена" : "Abbrechen"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex-1 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {saving
                  ? language === "ru"
                    ? "Сохранение..."
                    : "Speichern..."
                  : language === "ru"
                  ? "Сохранить"
                  : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERIES CHOICE */}
      {seriesOpen && selectedEvent && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/35 p-2 backdrop-blur-[2px] sm:items-center sm:justify-center"
          onClick={() => setSeriesOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100">
              <Repeat2 size={19} />
            </div>

            <h2 className="mt-4 text-lg font-semibold">
              {seriesAction === "edit"
                ? language === "ru"
                  ? "Что изменить?"
                  : "Was soll geändert werden?"
                : language === "ru"
                ? "Что удалить?"
                : "Was soll gelöscht werden?"}
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {language === "ru"
                ? "Событие входит в повторяющуюся серию."
                : "Dieses Ereignis gehört zu einer Serie."}
            </p>

            <div className="mt-5 space-y-2">
              {(
                [
                  ["single", language === "ru" ? "Только это событие" : "Nur dieses Ereignis"],
                  [
                    "following",
                    language === "ru"
                      ? "Это и все следующие"
                      : "Dieses und alle folgenden",
                  ],
                  ["all", language === "ru" ? "Вся серия" : "Gesamte Serie"],
                ] as const
              ).map(([scope, label]) => (
                <button
                  type="button"
                  key={scope}
                  onClick={() => applySeriesChoice(scope)}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold hover:bg-neutral-50"
                >
                  {label}
                  <ChevronRight size={16} className="text-neutral-400" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSeriesOpen(false)}
              className="mt-3 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700"
            >
              {language === "ru" ? "Отмена" : "Abbrechen"}
            </button>
          </div>
        </div>
      )}

      {/* DELETE */}
      {deleteOpen && selectedEvent && (
        <div
          className="fixed inset-0 z-[90] flex items-end bg-black/35 p-2 backdrop-blur-[2px] sm:items-center sm:justify-center"
          onClick={() => !saving && setDeleteOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={19} />
            </div>

            <h2 className="mt-4 text-lg font-semibold">
              {language === "ru" ? "Удалить событие?" : "Ereignis löschen?"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              {selectedEvent.recurrence !== "none"
                ? language === "ru"
                  ? "Выбранный диапазон серии будет удалён."
                  : "Der ausgewählte Teil der Serie wird gelöscht."
                : language === "ru"
                ? `«${selectedEvent.title}» будет удалено.`
                : `„${selectedEvent.title}“ wird gelöscht.`}
            </p>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeleteOpen(false)}
                className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold"
              >
                {language === "ru" ? "Отмена" : "Abbrechen"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void deleteEvent()}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                {saving
                  ? language === "ru"
                    ? "Удаление..."
                    : "Löschen..."
                  : language === "ru"
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none placeholder:text-neutral-300 focus:border-neutral-400"
      />
    </div>
  );
}
