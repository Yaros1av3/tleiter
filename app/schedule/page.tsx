"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useLanguage } from "@/components/LanguageProvider";

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
  service_time: "10:00" | "13:00";
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
  service_time: "10:00" | "13:00";
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
  const router = useRouter();
  const { language, t } = useLanguage();

  const isRu = language === "ru";

  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [entryMembers, setEntryMembers] = useState<ScheduleMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(() => {
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

  const [form, setForm] = useState<EntryForm>(emptyForm);

  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<ScheduleEntry | null>(null);

  const [deleting, setDeleting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  /*
   * =====================================================
   * AUTH / ROLE
   * =====================================================
   */

  useEffect(() => {
    loadRole();
  }, []);

  async function loadRole() {
    setRoleLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsAdmin(false);
      setRoleLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error loading user role:", error);
      setIsAdmin(false);
    } else {
      setIsAdmin(data?.role === "admin");
    }

    setRoleLoading(false);
  }

  /*
   * =====================================================
   * DATA
   * =====================================================
   */

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const formatForDb = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");

      return `${y}-${m}-${d}`;
    };

    const [entriesResult, membersResult] =
      await Promise.all([
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

      setErrorMessage(
        isRu
          ? "Не удалось загрузить расписание."
          : "Der Dienstplan konnte nicht geladen werden.",
      );
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
      const scheduleMembersResult =
        await supabase
          .from("schedule_entry_members")
          .select(
            "id, schedule_entry_id, team_member_id",
          )
          .in(
            "schedule_entry_id",
            entryIds,
          );

      if (scheduleMembersResult.error) {
        console.error(
          "Error loading schedule members:",
          scheduleMembersResult.error,
        );

        setEntryMembers([]);
      } else {
        setEntryMembers(
          scheduleMembersResult.data ?? [],
        );
      }
    } else {
      setEntryMembers([]);
    }

    setLoading(false);
  }

  /*
   * =====================================================
   * DATE HELPERS
   * =====================================================
   */

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString(
      isRu ? "ru-RU" : "de-DE",
      {
        month: "long",
        year: "numeric",
      },
    );
  }, [currentMonth, isRu]);

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

  function getWeekday(date: string) {
    return new Date(
      `${date}T00:00:00`,
    ).toLocaleDateString(
      isRu ? "ru-RU" : "de-DE",
      {
        weekday: "short",
      },
    );
  }

  function getFullDate(date: string) {
    return new Date(
      `${date}T00:00:00`,
    ).toLocaleDateString(
      isRu ? "ru-RU" : "de-DE",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  }

  /*
   * =====================================================
   * ENTRY HELPERS
   * =====================================================
   */

  function getEntryTitle(entry: ScheduleEntry) {
    if (entry.service_time === "10:00") {
      return (
        entry.title_de ||
        (entry.entry_type === "event"
          ? isRu
            ? "Событие"
            : "Veranstaltung"
          : isRu
            ? "Урок"
            : "Unterricht")
      );
    }

    return (
      entry.title_ru ||
      (entry.entry_type === "event"
        ? isRu
          ? "Событие"
          : "Veranstaltung"
        : isRu
          ? "Урок"
          : "Unterricht")
    );
  }

  function getMemberIds(entryId: number) {
    return entryMembers
      .filter(
        (item) =>
          item.schedule_entry_id ===
          entryId,
      )
      .map(
        (item) =>
          item.team_member_id,
      );
  }

  function getEntryMembers(entryId: number) {
    const ids = getMemberIds(entryId);

    return ids
      .map((id) =>
        members.find(
          (member) =>
            member.id === id,
        ),
      )
      .filter(
        Boolean,
      ) as TeamMember[];
  }

  function getInitials(member: TeamMember) {
    return `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();
  }

  /*
   * =====================================================
   * CREATE / EDIT
   * =====================================================
   */

  function openCreateModal(
    date?: string,
    time:
      | "10:00"
      | "13:00" = "10:00",
  ) {
    if (!isAdmin) return;

    setErrorMessage("");
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
    if (!isAdmin) return;

    setErrorMessage("");
    setEditingEntry(entry);

    setForm({
      schedule_date:
        entry.schedule_date,
      service_time:
        entry.service_time,
      entry_type:
        entry.entry_type,
      title_de:
        entry.title_de ?? "",
      title_ru:
        entry.title_ru ?? "",
      bible_text:
        entry.bible_text ?? "",
      series:
        entry.series ?? "",
      notes:
        entry.notes ?? "",
      member_ids:
        getMemberIds(entry.id),
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingEntry(null);
    setForm(emptyForm);
    setErrorMessage("");
  }

  function changeServiceTime(
    time: "10:00" | "13:00",
  ) {
    setForm((current) => ({
      ...current,
      service_time: time,

      // 10:00 = German only
      // 13:00 = Russian only
      title_de:
        time === "10:00"
          ? current.title_de
          : "",

      title_ru:
        time === "13:00"
          ? current.title_ru
          : "",
    }));

    setErrorMessage("");
  }

  function toggleMember(memberId: number) {
    if (!isAdmin) return;

    setForm((current) => ({
      ...current,
      member_ids:
        current.member_ids.includes(
          memberId,
        )
          ? current.member_ids.filter(
              (id) =>
                id !== memberId,
            )
          : [
              ...current.member_ids,
              memberId,
            ],
    }));
  }

  async function saveEntry() {
    if (!isAdmin) return;

    if (
      !form.schedule_date ||
      saving
    ) {
      return;
    }

    const correctTitle =
      form.service_time === "10:00"
        ? form.title_de.trim()
        : form.title_ru.trim();

    if (!correctTitle) {
      setErrorMessage(
        form.service_time === "10:00"
          ? isRu
            ? "Укажи немецкую тему служения."
            : "Bitte gib das deutsche Thema ein."
          : isRu
            ? "Укажи русскую тему служения."
            : "Bitte gib das russische Thema ein.",
      );

      return;
    }

    setSaving(true);
    setErrorMessage("");

    const payload = {
      schedule_date:
        form.schedule_date,

      service_time:
        form.service_time,

      entry_type:
        form.entry_type,

      // 10:00 → DE
      title_de:
        form.service_time === "10:00"
          ? form.title_de.trim() || null
          : null,

      // 13:00 → RU
      title_ru:
        form.service_time === "13:00"
          ? form.title_ru.trim() || null
          : null,

      bible_text:
        form.bible_text.trim() ||
        null,

      series:
        form.series.trim() ||
        null,

      notes:
        form.notes.trim() ||
        null,

      updated_at:
        new Date().toISOString(),
    };

    let entryId:
      | number
      | null =
      editingEntry?.id ?? null;

    if (editingEntry) {
      const { error } =
        await supabase
          .from("schedule_entries")
          .update(payload)
          .eq(
            "id",
            editingEntry.id,
          );

      if (error) {
        console.error(
          "Error updating schedule entry:",
          error,
        );

        setErrorMessage(
          isRu
            ? "Не удалось сохранить изменения."
            : "Die Änderungen konnten nicht gespeichert werden.",
        );

        setSaving(false);
        return;
      }

      entryId =
        editingEntry.id;

      const {
        error:
          deleteMembersError,
      } = await supabase
        .from(
          "schedule_entry_members",
        )
        .delete()
        .eq(
          "schedule_entry_id",
          editingEntry.id,
        );

      if (deleteMembersError) {
        console.error(
          "Error replacing schedule members:",
          deleteMembersError,
        );

        setErrorMessage(
          isRu
            ? "Служение сохранено, но список служителей обновить не удалось."
            : "Der Dienst wurde gespeichert, aber die Mitarbeiter konnten nicht aktualisiert werden.",
        );

        setSaving(false);
        return;
      }
    } else {
      const {
        data,
        error,
      } = await supabase
        .from(
          "schedule_entries",
        )
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        console.error(
          "Error creating schedule entry:",
          error,
        );

        setErrorMessage(
          isRu
            ? "Не удалось создать служение."
            : "Der Dienst konnte nicht erstellt werden.",
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
          .insert(
            memberRows,
          );

      if (error) {
        console.error(
          "Error saving schedule members:",
          error,
        );

        setErrorMessage(
          isRu
            ? "Служение сохранено, но служителей добавить не удалось."
            : "Der Dienst wurde gespeichert, aber die Mitarbeiter konnten nicht hinzugefügt werden.",
        );

        setSaving(false);
        return;
      }
    }

    await loadData();

    setSaving(false);
    setModalOpen(false);
    setEditingEntry(null);
    setForm(emptyForm);
  }

  /*
   * =====================================================
   * DELETE
   * =====================================================
   */

  async function deleteEntry() {
    if (
      !isAdmin ||
      !deleteTarget ||
      deleting
    ) {
      return;
    }

    setDeleting(true);
    setErrorMessage("");

    const { error } =
      await supabase
        .from("schedule_entries")
        .delete()
        .eq(
          "id",
          deleteTarget.id,
        );

    if (error) {
      console.error(
        "Error deleting schedule entry:",
        error,
      );

      setErrorMessage(
        isRu
          ? "Не удалось удалить служение."
          : "Der Dienst konnte nicht gelöscht werden.",
      );

      setDeleting(false);
      return;
    }

    await loadData();

    setDeleting(false);
    setDeleteTarget(null);
  }

  /*
   * =====================================================
   * GROUPING
   * =====================================================
   */

  const groupedEntries =
    useMemo(() => {
      const grouped: Record<
        string,
        ScheduleEntry[]
      > = {};

      entries.forEach(
        (entry) => {
          if (
            !grouped[
              entry.schedule_date
            ]
          ) {
            grouped[
              entry.schedule_date
            ] = [];
          }

          grouped[
            entry.schedule_date
          ].push(entry);
        },
      );

      return grouped;
    }, [entries]);

  const scheduleDays =
    useMemo(() => {
      return Object.keys(
        groupedEntries,
      ).sort();
    }, [groupedEntries]);

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f5f3] text-[#111820]">
      {/* Desktop navigation */}
      <div className="hidden md:block">
        <Sidebar language={language} />
      </div>

      <div className="md:ml-[72px]">
        {/* Desktop header */}
        <div className="hidden md:block">
          <Header
            language={language}
            setLanguage={() => {}}
          />
        </div>

        {/* =================================================
            MOBILE TOP BAR
        ================================================= */}
        <div className="sticky top-0 z-30 border-b border-[#e4e5e7] bg-[#f5f5f3]/95 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-3">
            {/* HOME */}
            

            {/* TITLE */}
            <div className="min-w-0">
              <div className="text-[17px] font-bold tracking-[-0.035em]">
                {isRu
                  ? "Расписание"
                  : "Dienstplan"}
              </div>

              <div className="truncate text-[11px] text-[#818994]">
                {monthLabel}
              </div>
            </div>

            {/* CREATE */}
            {!roleLoading &&
              isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    openCreateModal()
                  }
                  className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#111820] text-white shadow-sm active:scale-[0.96]"
                  aria-label={
                    isRu
                      ? "Новое служение"
                      : "Neuer Dienst"
                  }
                >
                  <Plus
                    size={21}
                    strokeWidth={2}
                  />
                </button>
              )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-5 sm:px-6 md:pt-8 lg:px-8">
          {/* =================================================
              DESKTOP HEADING
          ================================================= */}
          <section className="mb-5 md:mb-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() =>
                    router.push("/")
                  }
                  className="mt-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#111820] ring-1 ring-[#e1e3e5] transition hover:bg-[#f0f1f2] md:flex"
                  aria-label={
                    isRu
                      ? "На главную"
                      : "Zur Startseite"
                  }
                >
                  <ArrowLeft
                    size={19}
                  />
                </button>

                <div>
                  <p className="mb-1.5 hidden text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa2ad] md:block">
                    {t.common.teamWorkspace}
                  </p>

                  <h1 className="hidden text-[30px] font-bold leading-[1.05] tracking-[-0.045em] md:block md:text-4xl">
                    {isRu
                      ? "Расписание"
                      : "Dienstplan"}
                  </h1>

                  <p className="mt-0 hidden max-w-[540px] text-[14px] leading-5 text-[#707987] md:block">
                    {isRu
                      ? "Кто, когда и какую тему проводит."
                      : "Wer wann welchen Dienst übernimmt."}
                  </p>
                </div>
              </div>

              {/* DESKTOP CREATE BUTTON ONLY */}
              {!roleLoading &&
                isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      openCreateModal()
                    }
                    className="hidden h-10 shrink-0 items-center gap-2 rounded-xl bg-[#111820] px-4 text-white shadow-sm transition active:scale-[0.97] md:flex"
                    aria-label={
                      isRu
                        ? "Добавить служение"
                        : "Dienst hinzufügen"
                    }
                  >
                    <Plus
                      size={18}
                    />

                    <span className="text-xs font-semibold">
                      {isRu
                        ? "Добавить служение"
                        : "Dienst hinzufügen"}
                    </span>
                  </button>
                )}
            </div>

            {!roleLoading &&
              !isAdmin && (
                <div className="mt-4 flex items-center gap-2 rounded-[15px] border border-[#e3e5e8] bg-white px-4 py-3 text-[12px] leading-4 text-[#687585]">
                  <ShieldCheck
                    size={16}
                    className="shrink-0 text-[#8b949f]"
                  />

                  <span>
                    {isRu
                      ? "Ты просматриваешь расписание. Изменять его могут только администраторы."
                      : "Du kannst den Dienstplan ansehen. Änderungen sind nur für Administratoren möglich."}
                  </span>
                </div>
              )}
          </section>

          {/* =================================================
              MONTH NAVIGATION
          ================================================= */}
          <section className="mb-5 rounded-[20px] border border-[#e1e3e6] bg-white p-2 shadow-[0_2px_10px_rgba(17,24,32,0.025)]">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center">
                <button
                  type="button"
                  onClick={
                    previousMonth
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[#687585] active:bg-[#f3f4f5] md:h-9 md:w-9"
                  aria-label={
                    isRu
                      ? "Предыдущий месяц"
                      : "Vorheriger Monat"
                  }
                >
                  <ChevronLeft
                    size={20}
                  />
                </button>

                <div className="min-w-0 px-2 md:px-3">
                  <div className="truncate text-[15px] font-bold capitalize tracking-[-0.02em]">
                    {monthLabel}
                  </div>

                  <div className="mt-0.5 text-[11px] text-[#98a0aa]">
                    {entries.length}{" "}
                    {isRu
                      ? entries.length ===
                        1
                        ? "служение"
                        : "служений"
                      : entries.length ===
                          1
                        ? "Dienst"
                        : "Dienste"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[#687585] active:bg-[#f3f4f5] md:h-9 md:w-9"
                  aria-label={
                    isRu
                      ? "Следующий месяц"
                      : "Nächster Monat"
                  }
                >
                  <ChevronRight
                    size={20}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={
                  goToToday
                }
                className="h-10 shrink-0 rounded-[13px] border border-[#e2e4e7] px-3 text-[11px] font-bold text-[#596371] active:bg-[#f5f5f5]"
              >
                {isRu
                  ? "Сегодня"
                  : "Heute"}
              </button>
            </div>
          </section>

          {/* ERROR */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-3 rounded-[17px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700"
            >
              <AlertCircle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {errorMessage}
              </span>

              <button
                type="button"
                onClick={() =>
                  setErrorMessage("")
                }
                className="ml-auto shrink-0 text-red-400"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* LOADING */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(
                (item) => (
                  <div
                    key={item}
                    className="animate-pulse overflow-hidden rounded-[22px] border border-[#e5e6e8] bg-white"
                  >
                    <div className="h-[76px] bg-[#f0f1f2]" />

                    <div className="p-3">
                      <div className="h-[160px] rounded-[18px] bg-[#f1f2f3]" />
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : scheduleDays.length ===
            0 ? (
            <div className="flex min-h-[390px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[#d7dadd] bg-white px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#f1f2f3] text-[#929aa5]">
                <Clock3
                  size={28}
                  strokeWidth={1.6}
                />
              </div>

              <h2 className="mt-5 text-[18px] font-bold tracking-[-0.025em]">
                {isRu
                  ? "Расписание пока пустое"
                  : "Noch kein Dienstplan"}
              </h2>

              <p className="mt-2 max-w-[330px] text-[13px] leading-5 text-[#858e9a]">
                {isRu
                  ? "В этом месяце пока нет служений."
                  : "Für diesen Monat sind noch keine Dienste eingetragen."}
              </p>

              {!roleLoading &&
                isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      openCreateModal()
                    }
                    className="mt-6 flex h-12 items-center gap-2 rounded-full bg-[#111820] px-5 text-[13px] font-bold text-white active:scale-[0.98]"
                  >
                    <Plus
                      size={17}
                    />

                    {isRu
                      ? "Добавить служение"
                      : "Dienst hinzufügen"}
                  </button>
                )}
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
                      className="overflow-hidden rounded-[22px] border border-[#e0e2e5] bg-white shadow-[0_3px_14px_rgba(17,24,32,0.035)]"
                    >
                      {/* DAY HEADER */}
                      <div className="border-b border-[#e8e9eb] bg-[#fafafa] px-3.5 py-3.5 md:px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-[54px] w-[54px] shrink-0 flex-col items-center justify-center rounded-[16px] bg-[#111820] text-white shadow-sm">
                            <span className="text-[19px] font-bold leading-none">
                              {date.slice(
                                8,
                                10,
                              )}
                            </span>

                            <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] text-[#aeb6bf]">
                              {getWeekday(
                                date,
                              )}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14px] font-bold capitalize tracking-[-0.015em]">
                              {getFullDate(
                                date,
                              )}
                            </div>

                            <div className="mt-1 text-[11px] text-[#969ea8]">
                              {dayEntries.length}{" "}
                              {isRu
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

                        {isAdmin && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openCreateModal(
                                  date,
                                  "10:00",
                                )
                              }
                              className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] border border-[#dedfe2] bg-white text-[11px] font-bold text-[#68717d] active:bg-[#f4f5f5]"
                            >
                              <Plus
                                size={14}
                              />
                              10:00 · DE
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openCreateModal(
                                  date,
                                  "13:00",
                                )
                              }
                              className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] border border-[#dedfe2] bg-white text-[11px] font-bold text-[#68717d] active:bg-[#f4f5f5]"
                            >
                              <Plus
                                size={14}
                              />
                              13:00 · RU
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ENTRIES */}
                      <div className="space-y-3 p-2.5 md:p-3">
                        {dayEntries.map(
                          (entry) => {
                            const serviceMembers =
                              getEntryMembers(
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
                                className="overflow-hidden rounded-[19px] border border-[#e4e6e8] bg-[#fbfbfb]"
                              >
                                <div className="p-4">
                                  {/* TITLE */}
                                  <div className="flex items-start gap-3">
                                    <div
                                      className={`flex h-[54px] w-[54px] shrink-0 flex-col items-center justify-center rounded-[15px] ${
                                        isEvent
                                          ? "bg-[#fff3d9] text-[#a8731b]"
                                          : "bg-[#eef0f2] text-[#4e5966]"
                                      }`}
                                    >
                                      {isEvent ? (
                                        <Sparkles
                                          size={
                                            17
                                          }
                                          strokeWidth={
                                            1.8
                                          }
                                        />
                                      ) : (
                                        <Clock3
                                          size={
                                            17
                                          }
                                          strokeWidth={
                                            1.8
                                          }
                                        />
                                      )}

                                      <span className="mt-1 text-[11px] font-bold">
                                        {
                                          entry.service_time
                                        }
                                      </span>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex rounded-full bg-[#eef0f2] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#707987]">
                                              {entry.service_time ===
                                              "10:00"
                                                ? "DE"
                                                : "RU"}
                                            </span>

                                            {isEvent && (
                                              <span className="inline-flex rounded-full bg-[#fff1d4] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#a56d16]">
                                                {isRu
                                                  ? "Событие"
                                                  : "Event"}
                                              </span>
                                            )}
                                          </div>

                                          <h3 className="break-words text-[16px] font-bold leading-[1.25] tracking-[-0.025em] text-[#111820]">
                                            {getEntryTitle(
                                              entry,
                                            )}
                                          </h3>
                                        </div>

                                        {isAdmin && (
                                          <div className="flex shrink-0 items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openEditModal(
                                                  entry,
                                                )
                                              }
                                              className="flex h-9 w-9 items-center justify-center rounded-[11px] text-[#8a929c] active:bg-[#eef0f1] active:text-[#111820]"
                                              aria-label={
                                                isRu
                                                  ? "Редактировать"
                                                  : "Bearbeiten"
                                              }
                                            >
                                              <Pencil
                                                size={
                                                  15
                                                }
                                              />
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                setDeleteTarget(
                                                  entry,
                                                )
                                              }
                                              className="flex h-9 w-9 items-center justify-center rounded-[11px] text-[#9b8a8a] active:bg-red-50 active:text-red-600"
                                              aria-label={
                                                isRu
                                                  ? "Удалить"
                                                  : "Löschen"
                                              }
                                            >
                                              <Trash2
                                                size={
                                                  15
                                                }
                                              />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* =================================================
                                      SERVING TEAM
                                  ================================================= */}
                                  <div className="mt-4 rounded-[16px] border border-[#e2e4e6] bg-white p-3.5">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#111820] text-white">
                                          <Users
                                            size={
                                              15
                                            }
                                            strokeWidth={
                                              1.8
                                            }
                                          />
                                        </div>

                                        <div>
                                          <div className="text-[12px] font-bold text-[#111820]">
                                            {isRu
                                              ? "Служат"
                                              : "Mitarbeiter"}
                                          </div>

                                          <div className="text-[9px] text-[#9aa2ad]">
                                            {serviceMembers.length}{" "}
                                            {isRu
                                              ? serviceMembers.length ===
                                                1
                                                ? "человек"
                                                : "человека"
                                              : serviceMembers.length ===
                                                  1
                                                ? "Person"
                                                : "Personen"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {serviceMembers.length >
                                    0 ? (
                                      <div className="space-y-2">
                                        {serviceMembers.map(
                                          (
                                            member,
                                          ) => (
                                            <div
                                              key={
                                                member.id
                                              }
                                              className="flex min-h-[58px] items-center gap-3 rounded-[14px] bg-[#f5f6f6] px-3"
                                            >
                                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#111820] text-[10px] font-bold text-white">
                                                {getInitials(
                                                  member,
                                                )}
                                              </div>

                                              <div className="min-w-0 flex-1">
                                                <div className="text-[13px] font-bold leading-5 text-[#1a222b]">
                                                  {
                                                    member.first_name
                                                  }{" "}
                                                  {
                                                    member.last_name
                                                  }
                                                </div>

                                                {member.position && (
                                                  <div className="mt-0.5 text-[10px] text-[#8a939d]">
                                                    {
                                                      member.position
                                                    }
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <div className="rounded-[12px] bg-[#f5f6f6] px-3 py-3 text-[11px] text-[#929aa5]">
                                        {isRu
                                          ? "Служители ещё не назначены."
                                          : "Noch keine Mitarbeiter zugewiesen."}
                                      </div>
                                    )}
                                  </div>

                                  {/* META */}
                                  {(entry.bible_text ||
                                    entry.series) && (
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                      {entry.bible_text && (
                                        <div className="flex min-w-0 gap-2 rounded-[13px] bg-[#f1f2f3] px-3 py-2.5">
                                          <BookOpen
                                            size={
                                              15
                                            }
                                            className="mt-0.5 shrink-0 text-[#7f8893]"
                                          />

                                          <div className="min-w-0">
                                            <div className="text-[8px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]">
                                              {isRu
                                                ? "Библия"
                                                : "Bibelstelle"}
                                            </div>

                                            <div className="mt-0.5 break-words text-[11px] font-semibold leading-4 text-[#5f6975]">
                                              {
                                                entry.bible_text
                                              }
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {entry.series && (
                                        <div className="rounded-[13px] bg-[#f1f2f3] px-3 py-2.5">
                                          <div className="text-[8px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]">
                                            {isRu
                                              ? "Серия"
                                              : "Serie"}
                                          </div>

                                          <div className="mt-0.5 break-words text-[11px] font-semibold leading-4 text-[#5f6975]">
                                            {
                                              entry.series
                                            }
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {entry.notes && (
                                    <div className="mt-3 rounded-[13px] bg-[#f1f2f3] px-3 py-2.5 text-[11px] leading-4 text-[#68727e]">
                                      {
                                        entry.notes
                                      }
                                    </div>
                                  )}
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

      {/* =====================================================
          CREATE / EDIT SHEET
      ===================================================== */}

      {modalOpen &&
        isAdmin && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111820]/35 backdrop-blur-[3px] md:items-center md:p-5">
            <div className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[27px] bg-white shadow-2xl md:max-w-[650px] md:rounded-[22px]">
              <div className="shrink-0 border-b border-[#e8e9eb] bg-white px-5 pb-4 pt-3 md:px-6 md:pt-5">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#d9dadd] md:hidden" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[19px] font-bold tracking-[-0.03em]">
                      {editingEntry
                        ? isRu
                          ? "Редактировать служение"
                          : "Dienst bearbeiten"
                        : isRu
                          ? "Новое служение"
                          : "Neuer Dienst"}
                    </h2>

                    <p className="mt-1 text-[12px] text-[#858e99]">
                      {form.service_time ===
                      "10:00"
                        ? isRu
                          ? "10:00 · немецкое служение"
                          : "10:00 · Deutscher Gottesdienst"
                        : isRu
                          ? "13:00 · русское служение"
                          : "13:00 · Russischer Gottesdienst"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={saving}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#f2f3f4] text-[#68727e] disabled:opacity-40"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
                <div className="space-y-5">
                  {/* DATE */}
                  <div>
                    <label className="mb-2 block px-1 text-[11px] font-bold text-[#65707d]">
                      {isRu
                        ? "Дата"
                        : "Datum"}
                    </label>

                    <input
                      type="date"
                      value={
                        form.schedule_date
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            schedule_date:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="h-[52px] w-full rounded-[15px] border border-[#dfe1e4] bg-[#fafafa] px-3.5 text-[15px] outline-none focus:border-[#111820] focus:bg-white"
                    />
                  </div>

                  {/* SERVICE */}
                  <div>
                    <label className="mb-2 block px-1 text-[11px] font-bold text-[#65707d]">
                      {isRu
                        ? "Служение"
                        : "Gottesdienst"}
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          changeServiceTime(
                            "10:00",
                          )
                        }
                        className={`rounded-[15px] border px-3 py-3 text-left ${
                          form.service_time ===
                          "10:00"
                            ? "border-[#111820] bg-[#111820] text-white"
                            : "border-[#dfe1e4] bg-[#fafafa] text-[#66707d]"
                        }`}
                      >
                        <div className="text-[15px] font-bold">
                          10:00
                        </div>

                        <div
                          className={`mt-1 text-[10px] ${
                            form.service_time ===
                            "10:00"
                              ? "text-white/60"
                              : "text-[#9aa2ad]"
                          }`}
                        >
                          Deutsch · DE
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          changeServiceTime(
                            "13:00",
                          )
                        }
                        className={`rounded-[15px] border px-3 py-3 text-left ${
                          form.service_time ===
                          "13:00"
                            ? "border-[#111820] bg-[#111820] text-white"
                            : "border-[#dfe1e4] bg-[#fafafa] text-[#66707d]"
                        }`}
                      >
                        <div className="text-[15px] font-bold">
                          13:00
                        </div>

                        <div
                          className={`mt-1 text-[10px] ${
                            form.service_time ===
                            "13:00"
                              ? "text-white/60"
                              : "text-[#9aa2ad]"
                          }`}
                        >
                          Русский · RU
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* TYPE */}
                  <div>
                    <label className="mb-2 block px-1 text-[11px] font-bold text-[#65707d]">
                      {isRu
                        ? "Тип"
                        : "Typ"}
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              entry_type:
                                "lesson",
                            }),
                          )
                        }
                        className={`h-[52px] rounded-[15px] border text-[13px] font-bold ${
                          form.entry_type ===
                          "lesson"
                            ? "border-[#111820] bg-[#111820] text-white"
                            : "border-[#dfe1e4] bg-[#fafafa] text-[#66707d]"
                        }`}
                      >
                        {isRu
                          ? "Урок"
                          : "Unterricht"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              entry_type:
                                "event",
                            }),
                          )
                        }
                        className={`h-[52px] rounded-[15px] border text-[13px] font-bold ${
                          form.entry_type ===
                          "event"
                            ? "border-[#111820] bg-[#111820] text-white"
                            : "border-[#dfe1e4] bg-[#fafafa] text-[#66707d]"
                        }`}
                      >
                        {isRu
                          ? "Событие"
                          : "Veranstaltung"}
                      </button>
                    </div>
                  </div>

                  {/* TEAM */}
                  <div>
                    <div className="mb-2 flex items-center justify-between px-1">
                      <label className="text-[11px] font-bold text-[#65707d]">
                        {isRu
                          ? "Служители"
                          : "Mitarbeiter"}
                      </label>

                      {form.member_ids
                        .length >
                        0 && (
                        <span className="text-[10px] font-semibold text-[#969ea8]">
                          {isRu
                            ? `Выбрано: ${form.member_ids.length}`
                            : `Ausgewählt: ${form.member_ids.length}`}
                        </span>
                      )}
                    </div>

                    <div className="max-h-[240px] space-y-1.5 overflow-y-auto rounded-[16px] border border-[#e0e2e5] bg-[#fafafa] p-2">
                      {members.length ===
                      0 ? (
                        <div className="px-3 py-4 text-center text-[12px] text-[#939ba5]">
                          {isRu
                            ? "Нет активных служителей."
                            : "Keine aktiven Mitarbeiter."}
                        </div>
                      ) : (
                        members.map(
                          (
                            member,
                          ) => {
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
                                className={`flex min-h-[52px] w-full items-center justify-between rounded-[13px] border px-3.5 text-left ${
                                  selected
                                    ? "border-[#111820] bg-[#111820] text-white"
                                    : "border-transparent bg-white text-[#5f6975]"
                                }`}
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[9px] font-bold ${
                                      selected
                                        ? "bg-white/10 text-white"
                                        : "bg-[#f0f1f2] text-[#4d5864]"
                                    }`}
                                  >
                                    {getInitials(
                                      member,
                                    )}
                                  </div>

                                  <span className="truncate text-[13px] font-semibold">
                                    {
                                      member.first_name
                                    }{" "}
                                    {
                                      member.last_name
                                    }
                                  </span>
                                </div>

                                {selected && (
                                  <CheckIcon />
                                )}
                              </button>
                            );
                          },
                        )
                      )}
                    </div>
                  </div>

                  {/* =================================================
                      LANGUAGE-SPECIFIC TOPIC
                  ================================================= */}

                  {form.service_time ===
                  "10:00" ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between px-1">
                        <label className="text-[11px] font-bold text-[#65707d]">
                          Thema · DE
                        </label>

                        <span className="rounded-full bg-[#eef0f2] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#707987]">
                          10:00
                        </span>
                      </div>

                      <input
                        value={
                          form.title_de
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              title_de:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="z. B. Ich bin der Weg..."
                        className="h-[54px] w-full rounded-[15px] border border-[#dfe1e4] bg-[#fafafa] px-4 text-[15px] outline-none placeholder:text-[#b1b7bf] focus:border-[#111820] focus:bg-white"
                      />

                      <p className="mt-1.5 px-1 text-[10px] text-[#9aa2ad]">
                        {isRu
                          ? "Для служения в 10:00 используется только немецкая тема."
                          : "Für den Gottesdienst um 10:00 wird nur das deutsche Thema verwendet."}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2 flex items-center justify-between px-1">
                        <label className="text-[11px] font-bold text-[#65707d]">
                          Тема · RU
                        </label>

                        <span className="rounded-full bg-[#eef0f2] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#707987]">
                          13:00
                        </span>
                      </div>

                      <input
                        value={
                          form.title_ru
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              title_ru:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="Например: Я — Путь..."
                        className="h-[54px] w-full rounded-[15px] border border-[#dfe1e4] bg-[#fafafa] px-4 text-[15px] outline-none placeholder:text-[#b1b7bf] focus:border-[#111820] focus:bg-white"
                      />

                      <p className="mt-1.5 px-1 text-[10px] text-[#9aa2ad]">
                        {isRu
                          ? "Для служения в 13:00 используется только русская тема."
                          : "Für den Gottesdienst um 13:00 wird nur das russische Thema verwendet."}
                      </p>
                    </div>
                  )}

                  {/* BIBLE */}
                  <div>
                    <label className="mb-2 block px-1 text-[11px] font-bold text-[#65707d]">
                      {isRu
                        ? "Библейский текст"
                        : "Bibelstelle"}
                    </label>

                    <input
                      value={
                        form.bible_text
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            bible_text:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder="Johannes 14,1–7"
                      className="h-[54px] w-full rounded-[15px] border border-[#dfe1e4] bg-[#fafafa] px-4 text-[15px] outline-none placeholder:text-[#b1b7bf] focus:border-[#111820] focus:bg-white"
                    />
                  </div>

                  {/* SERIES */}
                  <div>
                    <label className="mb-2 block px-1 text-[11px] font-bold text-[#65707d]">
                      {isRu
                        ? "Серия"
                        : "Serie"}
                    </label>

                    <input
                      value={
                        form.series
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            series:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder="Lehre Jesu"
                      className="h-[54px] w-full rounded-[15px] border border-[#dfe1e4] bg-[#fafafa] px-4 text-[15px] outline-none placeholder:text-[#b1b7bf] focus:border-[#111820] focus:bg-white"
                    />
                  </div>

                  {/* NOTES */}
                  <div>
                    <label className="mb-2 block px-1 text-[11px] font-bold text-[#65707d]">
                      {isRu
                        ? "Дополнительная информация"
                        : "Zusätzliche Informationen"}
                    </label>

                    <textarea
                      value={
                        form.notes
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            notes:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      rows={4}
                      placeholder={
                        isRu
                          ? "Например: подростки остаются в зале..."
                          : "z. B. Teens bleiben im Saal..."
                      }
                      className="w-full resize-none rounded-[15px] border border-[#dfe1e4] bg-[#fafafa] px-4 py-3 text-[15px] leading-5 outline-none placeholder:text-[#b1b7bf] focus:border-[#111820] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="shrink-0 border-t border-[#e8e9eb] bg-white px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))] md:px-6">
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={saving}
                    className="h-[54px] flex-1 rounded-[15px] border border-[#dedfe2] text-[13px] font-bold text-[#69727e] disabled:opacity-40"
                  >
                    {isRu
                      ? "Отмена"
                      : "Abbrechen"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      saveEntry
                    }
                    disabled={
                      saving ||
                      !form.schedule_date ||
                      (form.service_time ===
                        "10:00" &&
                        !form.title_de.trim()) ||
                      (form.service_time ===
                        "13:00" &&
                        !form.title_ru.trim())
                    }
                    className="h-[54px] flex-1 rounded-[15px] bg-[#111820] text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving
                      ? isRu
                        ? "Сохранение..."
                        : "Speichern..."
                      : editingEntry
                        ? isRu
                          ? "Сохранить"
                          : "Speichern"
                        : isRu
                          ? "Добавить"
                          : "Hinzufügen"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          DELETE CONFIRMATION
      ===================================================== */}

      {deleteTarget &&
        isAdmin && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-[#111820]/35 p-0 backdrop-blur-[3px] md:items-center md:p-5">
            <div className="w-full rounded-t-[27px] bg-white p-5 shadow-2xl md:max-w-[430px] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#d9dadd] md:hidden" />

              <div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-red-50 text-red-600">
                <Trash2
                  size={20}
                  strokeWidth={1.8}
                />
              </div>

              <h2 className="mt-5 text-[19px] font-bold tracking-[-0.03em]">
                {isRu
                  ? "Удалить служение?"
                  : "Dienst löschen?"}
              </h2>

              <p className="mt-2 text-[13px] leading-5 text-[#707987]">
                {isRu
                  ? `«${getEntryTitle(deleteTarget)}» будет удалено из расписания.`
                  : `„${getEntryTitle(deleteTarget)}“ wird aus dem Dienstplan entfernt.`}
              </p>

              <div className="mt-6 flex gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget(
                      null,
                    )
                  }
                  disabled={deleting}
                  className="h-[52px] flex-1 rounded-[15px] border border-[#dedfe2] text-[13px] font-bold text-[#69727e] disabled:opacity-40"
                >
                  {isRu
                    ? "Отмена"
                    : "Abbrechen"}
                </button>

                <button
                  type="button"
                  onClick={
                    deleteEntry
                  }
                  disabled={deleting}
                  className="h-[52px] flex-1 rounded-[15px] bg-red-600 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {deleting
                    ? isRu
                      ? "Удаление..."
                      : "Löschen..."
                    : isRu
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
      width="16"
      height="16"
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