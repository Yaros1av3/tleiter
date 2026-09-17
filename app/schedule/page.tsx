"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  BookOpen,
  Clock3,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import {
  translations,
  type Language,
} from "@/lib/translations";

type TeamMember = {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  status: "active" | "inactive";
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
  created_at: string;
  updated_at: string;
};

type ScheduleMember = {
  id: number;
  schedule_entry_id: number;
  team_member_id: number;
};

type EntryForm = {
  schedule_date: string;
  service_time: "10:00" | "12:30";
  entry_type: "lesson" | "event";
  title_de: string;
  title_ru: string;
  bible_text: string;
  series: string;
  notes: string;
  member_ids: number[];
};

const emptyForm: EntryForm = {
  schedule_date: "",
  service_time: "10:00",
  entry_type: "lesson",
  title_de: "",
  title_ru: "",
  bible_text: "",
  series: "",
  notes: "",
  member_ids: [],
};

export default function SchedulePage() {
  const [language, setLanguage] =
    useState<Language>("ru");

  const [entries, setEntries] =
    useState<ScheduleEntry[]>([]);

  const [members, setMembers] =
    useState<TeamMember[]>([]);

  const [entryMembers, setEntryMembers] =
    useState<ScheduleMember[]>([]);

  const [loading, setLoading] = useState(true);

  const [currentMonth, setCurrentMonth] =
    useState(() => {
      const date = new Date();
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
      );
    });

  const [modalOpen, setModalOpen] = useState(false);

  const [editingEntry, setEditingEntry] =
    useState<ScheduleEntry | null>(null);

  const [form, setForm] =
    useState<EntryForm>(emptyForm);

  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<ScheduleEntry | null>(null);

  const [deleting, setDeleting] = useState(false);

  const t = translations[language];

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  async function loadData() {
    setLoading(true);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(
      year,
      month,
      1,
    );

    const lastDay = new Date(
      year,
      month + 1,
      0,
    );

    const formatForDb = (date: Date) => {
      const y = date.getFullYear();
      const m = String(
        date.getMonth() + 1,
      ).padStart(2, "0");
      const d = String(
        date.getDate(),
      ).padStart(2, "0");

      return `${y}-${m}-${d}`;
    };

    const [
      entriesResult,
      membersResult,
    ] = await Promise.all([
      supabase
        .from("schedule_entries")
        .select("*")
        .gte(
          "schedule_date",
          formatForDb(firstDay),
        )
        .lte(
          "schedule_date",
          formatForDb(lastDay),
        )
        .order("schedule_date", {
          ascending: true,
        })
        .order("service_time", {
          ascending: true,
        }),

      supabase
        .from("team_members")
        .select(
          "id, first_name, last_name, position, status",
        )
        .eq("status", "active")
        .order("last_name", {
          ascending: true,
        })
        .order("first_name", {
          ascending: true,
        }),
    ]);

    if (entriesResult.error) {
      console.error(
        "Error loading schedule:",
        entriesResult.error,
      );
      setEntries([]);
    } else {
      setEntries(entriesResult.data ?? []);
    }

    if (membersResult.error) {
      console.error(
        "Error loading team members:",
        membersResult.error,
      );
      setMembers([]);
    } else {
      setMembers(membersResult.data ?? []);
    }

    const entryIds =
      entriesResult.data?.map(
        (entry) => entry.id,
      ) ?? [];

    if (entryIds.length > 0) {
      const membersResult =
        await supabase
          .from("schedule_entry_members")
          .select(
            "id, schedule_entry_id, team_member_id",
          )
          .in(
            "schedule_entry_id",
            entryIds,
          );

      if (membersResult.error) {
        console.error(
          "Error loading schedule members:",
          membersResult.error,
        );
        setEntryMembers([]);
      } else {
        setEntryMembers(
          membersResult.data ?? [],
        );
      }
    } else {
      setEntryMembers([]);
    }

    setLoading(false);
  }

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString(
      language === "ru"
        ? "ru-RU"
        : "de-DE",
      {
        month: "long",
        year: "numeric",
      },
    );
  }, [currentMonth, language]);

  function previousMonth() {
    setCurrentMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1,
        ),
    );
  }

  function nextMonth() {
    setCurrentMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1,
        ),
    );
  }

  function goToToday() {
    const today = new Date();

    setCurrentMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),
    );
  }

  function formatDate(date: string) {
    return new Date(
      `${date}T00:00:00`,
    ).toLocaleDateString(
      language === "ru"
        ? "ru-RU"
        : "de-DE",
      {
        day: "2-digit",
        month: "2-digit",
      },
    );
  }

  function getWeekday(date: string) {
    return new Date(
      `${date}T00:00:00`,
    ).toLocaleDateString(
      language === "ru"
        ? "ru-RU"
        : "de-DE",
      {
        weekday: "short",
      },
    );
  }

  function getFullDate(date: string) {
    return new Date(
      `${date}T00:00:00`,
    ).toLocaleDateString(
      language === "ru"
        ? "ru-RU"
        : "de-DE",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  }

  function getEntryTitle(
    entry: ScheduleEntry,
  ) {
    if (language === "de") {
      return (
        entry.title_de ||
        entry.title_ru ||
        (entry.entry_type === "event"
          ? "Veranstaltung"
          : "Unterricht")
      );
    }

    return (
      entry.title_ru ||
      entry.title_de ||
      (entry.entry_type === "event"
        ? "Событие"
        : "Урок")
    );
  }

  function getMemberIds(
    entryId: number,
  ) {
    return entryMembers
      .filter(
        (item) =>
          item.schedule_entry_id ===
          entryId,
      )
      .map(
        (item) => item.team_member_id,
      );
  }

  function getMemberNames(
    entryId: number,
  ) {
    const ids = getMemberIds(entryId);

    return ids
      .map((id) => {
        const member = members.find(
          (item) => item.id === id,
        );

        if (!member) return null;

        return `${member.first_name} ${member.last_name}`;
      })
      .filter(Boolean) as string[];
  }

  function openCreateModal(
    date?: string,
    time: "10:00" | "12:30" = "10:00",
  ) {
    setEditingEntry(null);

    setForm({
      ...emptyForm,
      schedule_date:
        date ??
        `${currentMonth.getFullYear()}-${String(
          currentMonth.getMonth() + 1,
        ).padStart(2, "0")}-01`,
      service_time: time,
    });

    setModalOpen(true);
  }

  function openEditModal(
    entry: ScheduleEntry,
  ) {
    setEditingEntry(entry);

    setForm({
      schedule_date: entry.schedule_date,
      service_time: entry.service_time,
      entry_type: entry.entry_type,
      title_de: entry.title_de ?? "",
      title_ru: entry.title_ru ?? "",
      bible_text: entry.bible_text ?? "",
      series: entry.series ?? "",
      notes: entry.notes ?? "",
      member_ids: getMemberIds(entry.id),
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingEntry(null);
    setForm(emptyForm);
  }

  function toggleMember(
    memberId: number,
  ) {
    setForm((current) => ({
      ...current,
      member_ids:
        current.member_ids.includes(
          memberId,
        )
          ? current.member_ids.filter(
              (id) => id !== memberId,
            )
          : [
              ...current.member_ids,
              memberId,
            ],
    }));
  }

  async function saveEntry() {
    if (
      !form.schedule_date ||
      saving
    ) {
      return;
    }

    if (
      form.entry_type === "lesson" &&
      !form.title_de.trim() &&
      !form.title_ru.trim()
    ) {
      return;
    }

    if (
      form.entry_type === "event" &&
      !form.title_de.trim() &&
      !form.title_ru.trim()
    ) {
      return;
    }

    setSaving(true);

    const payload = {
      schedule_date:
        form.schedule_date,
      service_time:
        form.service_time,
      entry_type:
        form.entry_type,
      title_de:
        form.title_de.trim() || null,
      title_ru:
        form.title_ru.trim() || null,
      bible_text:
        form.bible_text.trim() || null,
      series:
        form.series.trim() || null,
      notes:
        form.notes.trim() || null,
      updated_at:
        new Date().toISOString(),
    };

    let entryId: number | null =
      editingEntry?.id ?? null;

    if (editingEntry) {
      const { error } =
        await supabase
          .from("schedule_entries")
          .update(payload)
          .eq("id", editingEntry.id);

      if (error) {
        console.error(
          "Error updating schedule entry:",
          error,
        );
        setSaving(false);
        return;
      }

      entryId = editingEntry.id;

      await supabase
        .from("schedule_entry_members")
        .delete()
        .eq(
          "schedule_entry_id",
          editingEntry.id,
        );
    } else {
      const { data, error } =
        await supabase
          .from("schedule_entries")
          .insert(payload)
          .select("id")
          .single();

      if (error || !data) {
        console.error(
          "Error creating schedule entry:",
          error,
        );
        setSaving(false);
        return;
      }

      entryId = data.id;
    }

    if (
      entryId &&
      form.member_ids.length > 0
    ) {
      const memberRows =
        form.member_ids.map(
          (memberId) => ({
            schedule_entry_id:
              entryId,
            team_member_id:
              memberId,
          }),
        );

      const { error } =
        await supabase
          .from(
            "schedule_entry_members",
          )
          .insert(memberRows);

      if (error) {
        console.error(
          "Error saving schedule members:",
          error,
        );
      }
    }

    await loadData();

    setSaving(false);
    closeModal();
  }

  async function deleteEntry() {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);

    const { error } =
      await supabase
        .from("schedule_entries")
        .delete()
        .eq("id", deleteTarget.id);

    if (error) {
      console.error(
        "Error deleting schedule entry:",
        error,
      );
      setDeleting(false);
      return;
    }

    await loadData();

    setDeleting(false);
    setDeleteTarget(null);
  }

  const groupedEntries = useMemo(() => {
    const grouped: Record<
      string,
      ScheduleEntry[]
    > = {};

    entries.forEach((entry) => {
      if (!grouped[entry.schedule_date]) {
        grouped[entry.schedule_date] =
          [];
      }

      grouped[
        entry.schedule_date
      ].push(entry);
    });

    return grouped;
  }, [entries]);

  const scheduleDays = useMemo(() => {
    const days: string[] = [];

    Object.keys(groupedEntries)
      .sort()
      .forEach((date) => {
        days.push(date);
      });

    return days;
  }, [groupedEntries]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f5f4] text-neutral-900">
      <Sidebar language={language} />

      <div className="ml-[72px] min-h-screen min-w-0">
        <Header
          language={language}
          setLanguage={setLanguage}
        />

        <div className="mx-auto w-full max-w-[1400px] px-4 pb-12 sm:px-6 lg:px-8">
          {/* Header */}
          <section className="pb-6 pt-8 sm:pb-7 sm:pt-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  {t.common.teamWorkspace}
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white">
                    <CalendarDays
                      size={20}
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold tracking-[-0.045em] text-neutral-950 sm:text-4xl">
                      {language === "ru"
                        ? "Расписание"
                        : "Dienstplan"}
                    </h1>

                    <p className="mt-1 text-sm text-neutral-500">
                      {language === "ru"
                        ? "Кто, когда и какую тему проводит."
                        : "Wer wann welchen Unterricht übernimmt."}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  openCreateModal()
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800"
              >
                <Plus
                  size={15}
                  strokeWidth={2}
                />

                {language === "ru"
                  ? "Добавить служение"
                  : "Dienst hinzufügen"}
              </button>
            </div>
          </section>

          {/* Month navigation */}
          <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={previousMonth}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                title={
                  language === "ru"
                    ? "Предыдущий месяц"
                    : "Vorheriger Monat"
                }
              >
                <ChevronLeft
                  size={17}
                />
              </button>

              <button
                onClick={nextMonth}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                title={
                  language === "ru"
                    ? "Следующий месяц"
                    : "Nächster Monat"
                }
              >
                <ChevronRight
                  size={17}
                />
              </button>

              <div className="ml-2 min-w-[170px]">
                <div className="text-sm font-semibold capitalize text-neutral-900">
                  {monthLabel}
                </div>

                <div className="text-[10px] text-neutral-400">
                  {language === "ru"
                    ? `${entries.length} служений`
                    : `${entries.length} Dienste`}
                </div>
              </div>
            </div>

            <button
              onClick={goToToday}
              className="h-9 rounded-lg border border-neutral-200 px-3 text-[11px] font-semibold text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
            >
              {language === "ru"
                ? "Сегодня"
                : "Heute"}
            </button>
          </section>

          {/* Schedule */}
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
              <span className="text-sm text-neutral-400">
                {language === "ru"
                  ? "Загрузка расписания..."
                  : "Dienstplan wird geladen..."}
              </span>
            </div>
          ) : scheduleDays.length ===
            0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
                <CalendarDays
                  size={21}
                  strokeWidth={1.8}
                />
              </div>

              <h2 className="mt-4 text-sm font-semibold text-neutral-900">
                {language === "ru"
                  ? "Расписание пока пустое"
                  : "Noch kein Dienstplan"}
              </h2>

              <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-400">
                {language === "ru"
                  ? "Добавь первое служение, чтобы начать формировать расписание."
                  : "Füge den ersten Dienst hinzu, um den Dienstplan zu erstellen."}
              </p>

              <button
                onClick={() =>
                  openCreateModal()
                }
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                <Plus size={13} />

                {language === "ru"
                  ? "Добавить служение"
                  : "Dienst hinzufügen"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduleDays.map(
                (date) => {
                  const dayEntries =
                    groupedEntries[
                      date
                    ] ?? [];

                  return (
                    <section
                      key={date}
                      className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                    >
                      {/* Day header */}
                      <div className="flex flex-col gap-3 border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 min-w-[52px] flex-col items-center justify-center rounded-xl bg-neutral-900 text-white">
                            <span className="text-sm font-bold leading-none">
                              {date.slice(
                                8,
                                10,
                              )}
                            </span>

                            <span className="mt-0.5 text-[8px] uppercase tracking-wider text-neutral-300">
                              {getWeekday(
                                date,
                              )}
                            </span>
                          </div>

                          <div>
                            <div className="text-sm font-semibold capitalize text-neutral-900">
                              {getFullDate(
                                date,
                              )}
                            </div>

                            <div className="mt-0.5 text-[10px] text-neutral-400">
                              {dayEntries.length}{" "}
                              {language ===
                              "ru"
                                ? dayEntries.length ===
                                  1
                                  ? "служение"
                                  : "служений"
                                : dayEntries.length ===
                                    1
                                  ? "Dienst"
                                  : "Dienste"}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              openCreateModal(
                                date,
                                "10:00",
                              )
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-[10px] font-semibold text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-900"
                          >
                            <Plus
                              size={12}
                            />
                            10:00
                          </button>

                          <button
                            onClick={() =>
                              openCreateModal(
                                date,
                                "12:30",
                              )
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-[10px] font-semibold text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-900"
                          >
                            <Plus
                              size={12}
                            />
                            12:30
                          </button>
                        </div>
                      </div>

                      {/* Desktop table */}
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[850px] border-collapse">
                          <thead>
                            <tr className="border-b border-neutral-100">
                              <th className="w-[100px] px-5 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                                {language ===
                                "ru"
                                  ? "Время"
                                  : "Zeit"}
                              </th>

                              <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                                {language ===
                                "ru"
                                  ? "Служители"
                                  : "Mitarbeiter"}
                              </th>

                              <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                                {language ===
                                "ru"
                                  ? "Тема"
                                  : "Thema"}
                              </th>

                              <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                                {language ===
                                "ru"
                                  ? "Библия"
                                  : "Bibel"}
                              </th>

                              <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                                {language ===
                                "ru"
                                  ? "Серия"
                                  : "Serie"}
                              </th>

                              <th className="w-[90px] px-4 py-3" />
                            </tr>
                          </thead>

                          <tbody>
                            {dayEntries.map(
                              (entry) => {
                                const names =
                                  getMemberNames(
                                    entry.id,
                                  );

                                const isEvent =
                                  entry.entry_type ===
                                  "event";

                                return (
                                  <tr
                                    key={
                                      entry.id
                                    }
                                    className="group border-b border-neutral-100 last:border-b-0"
                                  >
                                    <td className="px-5 py-4 align-top">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                            isEvent
                                              ? "bg-amber-50 text-amber-600"
                                              : "bg-neutral-100 text-neutral-600"
                                          }`}
                                        >
                                          {isEvent ? (
                                            <Sparkles
                                              size={
                                                14
                                              }
                                              strokeWidth={
                                                1.8
                                              }
                                            />
                                          ) : (
                                            <Clock3
                                              size={
                                                14
                                              }
                                              strokeWidth={
                                                1.8
                                              }
                                            />
                                          )}
                                        </div>

                                        <span className="text-sm font-semibold text-neutral-900">
                                          {
                                            entry.service_time
                                          }
                                        </span>
                                      </div>
                                    </td>

                                    <td className="max-w-[190px] px-4 py-4 align-top">
                                      {names.length >
                                      0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                          {names.map(
                                            (
                                              name,
                                            ) => (
                                              <span
                                                key={
                                                  name
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600"
                                              >
                                                <Users
                                                  size={
                                                    10
                                                  }
                                                  strokeWidth={
                                                    1.8
                                                  }
                                                />
                                                {
                                                  name
                                                }
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-neutral-300">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    <td className="max-w-[330px] px-4 py-4 align-top">
                                      <div className="flex items-start gap-2">
                                        {isEvent && (
                                          <span className="mt-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-700">
                                            {language ===
                                            "ru"
                                              ? "Событие"
                                              : "Event"}
                                          </span>
                                        )}

                                        <div className="min-w-0">
                                          <div className="break-words text-sm font-semibold text-neutral-900">
                                            {getEntryTitle(
                                              entry,
                                            )}
                                          </div>

                                          {language ===
                                            "ru" &&
                                            entry.title_de && (
                                              <div className="mt-1 text-[10px] text-neutral-400">
                                                {
                                                  entry.title_de
                                                }
                                              </div>
                                            )}

                                          {language ===
                                            "de" &&
                                            entry.title_ru && (
                                              <div className="mt-1 text-[10px] text-neutral-400">
                                                {
                                                  entry.title_ru
                                                }
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    </td>

                                    <td className="max-w-[170px] px-4 py-4 align-top">
                                      {entry.bible_text ? (
                                        <div className="flex items-start gap-1.5 text-xs text-neutral-500">
                                          <BookOpen
                                            size={
                                              13
                                            }
                                            strokeWidth={
                                              1.7
                                            }
                                            className="mt-0.5 shrink-0 text-neutral-400"
                                          />

                                          <span>
                                            {
                                              entry.bible_text
                                            }
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-neutral-300">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    <td className="max-w-[150px] px-4 py-4 align-top">
                                      {entry.series ? (
                                        <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-500">
                                          {
                                            entry.series
                                          }
                                        </span>
                                      ) : (
                                        <span className="text-xs text-neutral-300">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    <td className="px-4 py-4 align-top">
                                      <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                                        <button
                                          onClick={() =>
                                            openEditModal(
                                              entry,
                                            )
                                          }
                                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                                          title={
                                            language ===
                                            "ru"
                                              ? "Редактировать"
                                              : "Bearbeiten"
                                          }
                                        >
                                          <Pencil
                                            size={
                                              13
                                            }
                                          />
                                        </button>

                                        <button
                                          onClick={() =>
                                            setDeleteTarget(
                                              entry,
                                            )
                                          }
                                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                                          title={
                                            language ===
                                            "ru"
                                              ? "Удалить"
                                              : "Löschen"
                                          }
                                        >
                                          <Trash2
                                            size={
                                              13
                                            }
                                          />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              },
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile */}
                      <div className="space-y-2 p-2 md:hidden">
                        {dayEntries.map(
                          (entry) => {
                            const names =
                              getMemberNames(
                                entry.id,
                              );

                            const isEvent =
                              entry.entry_type ===
                              "event";

                            return (
                              <article
                                key={
                                  entry.id
                                }
                                className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3"
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                      isEvent
                                        ? "bg-amber-50 text-amber-600"
                                        : "bg-white text-neutral-600"
                                    }`}
                                  >
                                    {isEvent ? (
                                      <Sparkles
                                        size={
                                          15
                                        }
                                        strokeWidth={
                                          1.8
                                        }
                                      />
                                    ) : (
                                      <Clock3
                                        size={
                                          15
                                        }
                                        strokeWidth={
                                          1.8
                                        }
                                      />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-neutral-900">
                                            {
                                              entry.service_time
                                            }
                                          </span>

                                          {isEvent && (
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-700">
                                              {language ===
                                              "ru"
                                                ? "Событие"
                                                : "Event"}
                                            </span>
                                          )}
                                        </div>

                                        <h3 className="mt-1 break-words text-sm font-semibold leading-5 text-neutral-900">
                                          {getEntryTitle(
                                            entry,
                                          )}
                                        </h3>
                                      </div>

                                      <div className="flex shrink-0 gap-1">
                                        <button
                                          onClick={() =>
                                            openEditModal(
                                              entry,
                                            )
                                          }
                                          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-white hover:text-neutral-900"
                                        >
                                          <Pencil
                                            size={
                                              12
                                            }
                                          />
                                        </button>

                                        <button
                                          onClick={() =>
                                            setDeleteTarget(
                                              entry,
                                            )
                                          }
                                          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"
                                        >
                                          <Trash2
                                            size={
                                              12
                                            }
                                          />
                                        </button>
                                      </div>
                                    </div>

                                    {names.length >
                                      0 && (
                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                        {names.map(
                                          (
                                            name,
                                          ) => (
                                            <span
                                              key={
                                                name
                                              }
                                              className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-neutral-600"
                                            >
                                              <Users
                                                size={
                                                  9
                                                }
                                              />
                                              {
                                                name
                                              }
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    )}

                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-neutral-200 pt-2.5">
                                      {entry.bible_text && (
                                        <div className="flex items-center gap-1.5 text-[9px] text-neutral-500">
                                          <BookOpen
                                            size={
                                              10
                                            }
                                            className="text-neutral-400"
                                          />

                                          {
                                            entry.bible_text
                                          }
                                        </div>
                                      )}

                                      {entry.series && (
                                        <div className="text-[9px] font-medium text-neutral-400">
                                          {
                                            entry.series
                                          }
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </article>
                            );
                          },
                        )}
                      </div>
                    </section>
                  );
                },
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  {editingEntry
                    ? language === "ru"
                      ? "Редактировать служение"
                      : "Dienst bearbeiten"
                    : language === "ru"
                      ? "Новое служение"
                      : "Neuer Dienst"}
                </h2>

                <p className="mt-0.5 text-[10px] text-neutral-400">
                  {language === "ru"
                    ? "Заполни информацию о служении."
                    : "Informationen zum Dienst eintragen."}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Date + time + type */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                    {language === "ru"
                      ? "Дата"
                      : "Datum"}
                  </label>

                  <input
                    type="date"
                    value={
                      form.schedule_date
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          schedule_date:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                    {language === "ru"
                      ? "Время"
                      : "Zeit"}
                  </label>

                  <select
                    value={
                      form.service_time
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          service_time:
                            event.target
                              .value as
                              | "10:00"
                              | "12:30",
                        }),
                      )
                    }
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  >
                    <option value="10:00">
                      10:00
                    </option>

                    <option value="12:30">
                      12:30
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                    {language === "ru"
                      ? "Тип"
                      : "Typ"}
                  </label>

                  <select
                    value={
                      form.entry_type
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          entry_type:
                            event.target
                              .value as
                              | "lesson"
                              | "event",
                        }),
                      )
                    }
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  >
                    <option value="lesson">
                      {language ===
                      "ru"
                        ? "Урок"
                        : "Unterricht"}
                    </option>

                    <option value="event">
                      {language ===
                      "ru"
                        ? "Событие"
                        : "Veranstaltung"}
                    </option>
                  </select>
                </div>
              </div>

              {/* Team members */}
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                  {language === "ru"
                    ? "Служители"
                    : "Mitarbeiter"}
                </label>

                <div className="grid max-h-[170px] grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-2 sm:grid-cols-2">
                  {members.map(
                    (member) => {
                      const selected =
                        form.member_ids.includes(
                          member.id,
                        );

                      return (
                        <button
                          key={
                            member.id
                          }
                          type="button"
                          onClick={() =>
                            toggleMember(
                              member.id,
                            )
                          }
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                            selected
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-transparent bg-white text-neutral-600 hover:border-neutral-200"
                          }`}
                        >
                          <span className="text-xs font-medium">
                            {
                              member.first_name
                            }{" "}
                            {
                              member.last_name
                            }
                          </span>

                          {selected && (
                            <CheckIcon />
                          )}
                        </button>
                      );
                    },
                  )}
                </div>

                {form.member_ids
                  .length > 0 && (
                  <p className="mt-1.5 text-[10px] text-neutral-400">
                    {language ===
                    "ru"
                      ? `Выбрано: ${form.member_ids.length}`
                      : `Ausgewählt: ${form.member_ids.length}`}
                  </p>
                )}
              </div>

              {/* Titles */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                    Thema / DE
                  </label>

                  <input
                    value={
                      form.title_de
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          title_de:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="z. B. Ich bin der Weg..."
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none placeholder:text-neutral-300 focus:border-neutral-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                    Тема / RU
                  </label>

                  <input
                    value={
                      form.title_ru
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          title_ru:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Например: Я — Путь..."
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none placeholder:text-neutral-300 focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Bible + series */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                    {language ===
                    "ru"
                      ? "Библейский текст"
                      : "Bibelstelle"}
                  </label>

                  <input
                    value={
                      form.bible_text
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          bible_text:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Johannes 14,1–7"
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none placeholder:text-neutral-300 focus:border-neutral-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                    {language ===
                    "ru"
                      ? "Серия"
                      : "Serie"}
                  </label>

                  <input
                    value={form.series}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          series:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Lehre Jesu"
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none placeholder:text-neutral-300 focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                  {language === "ru"
                    ? "Дополнительная информация"
                    : "Zusätzliche Informationen"}
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        notes:
                          event.target
                            .value,
                      }),
                    )
                  }
                  rows={3}
                  placeholder={
                    language === "ru"
                      ? "Например: подростки остаются в зале..."
                      : "z. B. Teens bleiben im Saal..."
                  }
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-300 focus:border-neutral-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="sticky bottom-0 flex gap-2 border-t border-neutral-100 bg-white px-5 py-4">
              <button
                onClick={closeModal}
                disabled={saving}
                className="h-10 flex-1 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                {language === "ru"
                  ? "Отмена"
                  : "Abbrechen"}
              </button>

              <button
                onClick={saveEntry}
                disabled={
                  saving ||
                  !form.schedule_date ||
                  (!form.title_de.trim() &&
                    !form.title_ru.trim())
                }
                className="h-10 flex-1 rounded-xl bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? language === "ru"
                    ? "Сохранение..."
                    : "Speichern..."
                  : editingEntry
                    ? language === "ru"
                      ? "Сохранить"
                      : "Speichern"
                    : language === "ru"
                      ? "Добавить"
                      : "Hinzufügen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[400px] rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2
                size={17}
                strokeWidth={1.8}
              />
            </div>

            <h2 className="mt-4 text-base font-semibold text-neutral-900">
              {language === "ru"
                ? "Удалить служение?"
                : "Dienst löschen?"}
            </h2>

            <p className="mt-1 text-xs leading-5 text-neutral-500">
              {language === "ru"
                ? `«${getEntryTitle(deleteTarget)}» будет удалено из расписания.`
                : `„${getEntryTitle(deleteTarget)}“ wird aus dem Dienstplan entfernt.`}
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() =>
                  setDeleteTarget(
                    null,
                  )
                }
                disabled={deleting}
                className="h-10 flex-1 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                {language === "ru"
                  ? "Отмена"
                  : "Abbrechen"}
              </button>

              <button
                onClick={deleteEntry}
                disabled={deleting}
                className="h-10 flex-1 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting
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

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}