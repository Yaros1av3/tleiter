"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Filter,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { translations, type Language } from "@/lib/translations";

type Position =
  | "hauptleiter"
  | "leiter"
  | "co_leiter"
  | "sekretariat"
  | "weitere";

type Status = "active" | "inactive";

type TeamMember = {
  id: number;
  first_name: string;
  last_name: string;
  position: Position;
  phone: string | null;
  birth_date: string | null;
  languages: string[];
  status: Status;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type MemberForm = {
  first_name: string;
  last_name: string;
  position: Position;
  phone: string;
  birth_date: string;
  languages: string[];
  status: Status;
  notes: string;
};

const emptyForm: MemberForm = {
  first_name: "",
  last_name: "",
  position: "co_leiter",
  phone: "",
  birth_date: "",
  languages: [],
  status: "active",
  notes: "",
};

const positionOrder: Record<Position, number> = {
  hauptleiter: 1,
  sekretariat: 2,
  leiter: 3,
  co_leiter: 4,
  weitere: 5,
};

function calculateAge(date: string | null) {
  if (!date) return null;

  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function formatDate(date: string | null, language: Language) {
  if (!date) return "—";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(language === "de" ? "de-DE" : "ru-RU");
}

function getPositionLabel(position: Position, language: Language) {
  const labels = {
    hauptleiter: {
      ru: "Главный лидер",
      de: "Hauptleiter",
    },
    sekretariat: {
      ru: "Секретариат",
      de: "Sekretariat",
    },
    leiter: {
      ru: "Лидер",
      de: "Leiter",
    },
    co_leiter: {
      ru: "Помощник лидера",
      de: "Co-Leiter",
    },
    weitere: {
      ru: "Другое",
      de: "Weitere",
    },
  };

  return labels[position][language];
}

function getStatusLabel(status: Status, language: Language) {
  return status === "active"
    ? language === "de"
      ? "Aktiv"
      : "Активен"
    : language === "de"
      ? "Inaktiv"
      : "Неактивен";
}

function getPositionStyle(position: Position) {
  switch (position) {
    case "hauptleiter":
      return "bg-neutral-900 text-white border-neutral-900";

    case "sekretariat":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "leiter":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "co_leiter":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "weitere":
      return "bg-neutral-50 text-neutral-600 border-neutral-200";

    default:
      return "bg-neutral-50 text-neutral-500 border-neutral-200";
  }
}

function getInitials(member: TeamMember) {
  const first = member.first_name?.charAt(0) ?? "";
  const last = member.last_name?.charAt(0) ?? "";

  return `${first}${last}`.toUpperCase();
}

export default function TeamPage() {
  const [language, setLanguage] = useState<Language>("ru");

  const t = translations[language];

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<Position | "all">(
    "all",
  );
  const [languageFilter, setLanguageFilter] = useState<
    "all" | "DE" | "RU"
  >("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const [showFilters, setShowFilters] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const [form, setForm] = useState<MemberForm>(emptyForm);

  const [saving, setSaving] = useState(false);

  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadMembers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Error loading team members:", error);
      setMembers([]);
      setLoading(false);
      return;
    }

    const sorted = [...(data ?? [])].sort((a, b) => {
      const positionDifference =
        positionOrder[a.position as Position] -
        positionOrder[b.position as Position];

      if (positionDifference !== 0) {
        return positionDifference;
      }

      return a.first_name.localeCompare(b.first_name);
    });

    setMembers(sorted as TeamMember[]);
    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      const fullName =
        `${member.first_name} ${member.last_name}`.toLowerCase();

      const phone = (member.phone ?? "").toLowerCase();

      const matchesSearch =
        !query || fullName.includes(query) || phone.includes(query);

      const matchesPosition =
        positionFilter === "all" || member.position === positionFilter;

      const matchesLanguage =
        languageFilter === "all" ||
        member.languages.includes(languageFilter);

      const matchesStatus =
        statusFilter === "all" || member.status === statusFilter;

      return (
        matchesSearch &&
        matchesPosition &&
        matchesLanguage &&
        matchesStatus
      );
    });
  }, [
    members,
    search,
    positionFilter,
    languageFilter,
    statusFilter,
  ]);

  const activeCount = members.filter(
    (member) => member.status === "active",
  ).length;

  const inactiveCount = members.filter(
    (member) => member.status === "inactive",
  ).length;

  const activeFiltersCount =
    Number(positionFilter !== "all") +
    Number(languageFilter !== "all") +
    Number(statusFilter !== "all");

  function openCreateModal() {
    setEditingMember(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEditModal(member: TeamMember) {
    setEditingMember(member);

    setForm({
      first_name: member.first_name,
      last_name: member.last_name,
      position: member.position,
      phone: member.phone ?? "",
      birth_date: member.birth_date ?? "",
      languages: member.languages ?? [],
      status: member.status,
      notes: member.notes ?? "",
    });

    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingMember(null);
    setForm(emptyForm);
  }

  function toggleLanguage(value: string) {
    setForm((current) => {
      const exists = current.languages.includes(value);

      return {
        ...current,
        languages: exists
          ? current.languages.filter((item) => item !== value)
          : [...current.languages, value],
      };
    });
  }

  async function saveMember() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      return;
    }

    setSaving(true);

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      position: form.position,
      phone: form.phone.trim() || null,
      birth_date: form.birth_date || null,
      languages: form.languages,
      status: form.status,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingMember) {
      const { error } = await supabase
        .from("team_members")
        .update(payload)
        .eq("id", editingMember.id);

      if (error) {
        console.error("Error updating team member:", error);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("team_members")
        .insert(payload);

      if (error) {
        console.error("Error creating team member:", error);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    closeModal();
    await loadMembers();
  }

  async function confirmDelete() {
    if (!deleteMember) return;

    setDeleting(true);

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", deleteMember.id);

    if (error) {
      console.error("Error deleting team member:", error);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setDeleteMember(null);

    await loadMembers();
  }

  function resetFilters() {
    setPositionFilter("all");
    setLanguageFilter("all");
    setStatusFilter("all");
  }

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-neutral-900">
      <Sidebar language={language} />

      <div className="pl-[72px]">
        <Header language={language} setLanguage={setLanguage} />

        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
          {/* Header */}
          <section className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Users
                  size={18}
                  strokeWidth={1.8}
                  className="text-neutral-400"
                />

                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  {language === "de" ? "Team" : "Команда"}
                </span>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
                {t.navigation.team}
              </h1>

              <p className="mt-1 text-sm text-neutral-500">
                {language === "de"
                  ? "Übersicht über alle Teammitglieder."
                  : "Обзор всех участников команды."}
              </p>
            </div>

            <button
              onClick={openCreateModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.98]"
            >
              <Plus size={17} strokeWidth={2} />

              {language === "de"
                ? "Mitglied hinzufügen"
                : "Добавить участника"}
            </button>
          </section>

          {/* Compact stats */}
          <section className="mb-5 grid grid-cols-3 gap-2 sm:max-w-[520px] sm:gap-3">
            <div className="flex min-h-[58px] items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] sm:px-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                <Users size={15} strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <div className="text-[10px] font-medium text-neutral-400 sm:text-[11px]">
                  {language === "de" ? "Gesamt" : "Всего"}
                </div>

                <div className="mt-0.5 text-lg font-semibold leading-none text-neutral-900 sm:text-xl">
                  {members.length}
                </div>
              </div>
            </div>

            <div className="flex min-h-[58px] items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] sm:px-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>

              <div className="min-w-0">
                <div className="text-[10px] font-medium text-neutral-400 sm:text-[11px]">
                  {language === "de" ? "Aktiv" : "Активны"}
                </div>

                <div className="mt-0.5 text-lg font-semibold leading-none text-neutral-900 sm:text-xl">
                  {activeCount}
                </div>
              </div>
            </div>

            <div className="flex min-h-[58px] items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] sm:px-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
                <span className="h-2 w-2 rounded-full bg-neutral-300" />
              </div>

              <div className="min-w-0">
                <div className="text-[10px] font-medium text-neutral-400 sm:text-[11px]">
                  {language === "de" ? "Inaktiv" : "Неактивны"}
                </div>

                <div className="mt-0.5 text-lg font-semibold leading-none text-neutral-900 sm:text-xl">
                  {inactiveCount}
                </div>
              </div>
            </div>
          </section>

          {/* Search / filters */}
          <section className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    language === "de"
                      ? "Name oder Telefonnummer suchen..."
                      : "Поиск по имени или телефону..."
                  }
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-10 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
                />

                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilters((value) => !value)}
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${
                  showFilters || activeFiltersCount > 0
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <Filter size={16} strokeWidth={1.8} />

                <span>
                  {language === "de" ? "Filter" : "Фильтры"}
                </span>

                {activeFiltersCount > 0 && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      showFilters
                        ? "bg-white text-neutral-900"
                        : "bg-neutral-900 text-white"
                    }`}
                  >
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="mt-3 grid grid-cols-1 gap-2 border-t border-neutral-100 pt-3 sm:grid-cols-3">
                <select
                  value={positionFilter}
                  onChange={(event) =>
                    setPositionFilter(
                      event.target.value as Position | "all",
                    )
                  }
                  className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-400"
                >
                  <option value="all">
                    {language === "de"
                      ? "Alle Positionen"
                      : "Все должности"}
                  </option>

                  <option value="hauptleiter">
                    {getPositionLabel("hauptleiter", language)}
                  </option>

                  <option value="leiter">
                    {getPositionLabel("leiter", language)}
                  </option>

                  <option value="co_leiter">
                    {getPositionLabel("co_leiter", language)}
                  </option>

                  <option value="sekretariat">
                    {getPositionLabel("sekretariat", language)}
                  </option>

                  <option value="weitere">
                    {getPositionLabel("weitere", language)}
                  </option>
                </select>

                <select
                  value={languageFilter}
                  onChange={(event) =>
                    setLanguageFilter(
                      event.target.value as "all" | "DE" | "RU",
                    )
                  }
                  className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-400"
                >
                  <option value="all">
                    {language === "de"
                      ? "Alle Sprachen"
                      : "Все языки"}
                  </option>

                  <option value="DE">Deutsch</option>
                  <option value="RU">Русский</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as Status | "all",
                    )
                  }
                  className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-400"
                >
                  <option value="all">
                    {language === "de"
                      ? "Alle Status"
                      : "Все статусы"}
                  </option>

                  <option value="active">
                    {language === "de" ? "Aktiv" : "Активен"}
                  </option>

                  <option value="inactive">
                    {language === "de" ? "Inaktiv" : "Неактивен"}
                  </option>
                </select>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="h-10 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 sm:col-span-3"
                  >
                    {language === "de"
                      ? "Filter zurücksetzen"
                      : "Сбросить фильтры"}
                  </button>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400">
              <span>
                {loading
                  ? language === "de"
                    ? "Wird geladen..."
                    : "Загрузка..."
                  : language === "de"
                    ? `${filteredMembers.length} Mitglieder`
                    : `${filteredMembers.length} участников`}
              </span>

              {(search || activeFiltersCount > 0) && !loading && (
                <button
                  onClick={() => {
                    setSearch("");
                    resetFilters();
                  }}
                  className="font-medium text-neutral-500 transition hover:text-neutral-900"
                >
                  {language === "de" ? "Zurücksetzen" : "Сбросить"}
                </button>
              )}
            </div>
          </section>

          {/* Desktop table */}
          <section className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.025)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/70">
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                      {language === "de" ? "Person" : "Участник"}
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                      {language === "de" ? "Position" : "Должность"}
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                      {language === "de" ? "Kontakt" : "Контакт"}
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                      {language === "de" ? "Geburtstag" : "Дата рождения"}
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                      {language === "de" ? "Sprachen" : "Языки"}
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                      {language === "de" ? "Status" : "Статус"}
                    </th>

                    <th className="w-[90px] px-4 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-14 text-center text-sm text-neutral-400"
                      >
                        {language === "de"
                          ? "Team wird geladen..."
                          : "Загрузка команды..."}
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-14 text-center"
                      >
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
                          <UserRound size={18} />
                        </div>

                        <div className="mt-3 text-sm font-medium text-neutral-700">
                          {language === "de"
                            ? "Keine Mitglieder gefunden"
                            : "Участники не найдены"}
                        </div>

                        <div className="mt-1 text-xs text-neutral-400">
                          {language === "de"
                            ? "Passe deine Suche oder Filter an."
                            : "Измени поиск или фильтры."}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => {
                      const age = calculateAge(member.birth_date);

                      return (
                        <tr
                          key={member.id}
                          className="group border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/60"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-[11px] font-semibold text-neutral-600">
                                {getInitials(member)}
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-neutral-900">
                                  {member.first_name}{" "}
                                  {member.last_name}
                                </div>

                                {member.notes && (
                                  <div className="mt-0.5 max-w-[240px] truncate text-[11px] text-neutral-400">
                                    {member.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-medium ${getPositionStyle(
                                member.position,
                              )}`}
                            >
                              {getPositionLabel(
                                member.position,
                                language,
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            {member.phone ? (
                              <span className="text-xs font-medium text-neutral-700">
                                {member.phone}
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-300">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="text-xs text-neutral-600">
                              {formatDate(
                                member.birth_date,
                                language,
                              )}
                            </div>

                            {age !== null && (
                              <div className="mt-0.5 text-[10px] text-neutral-400">
                                {age}{" "}
                                {language === "de"
                                  ? "Jahre"
                                  : "лет"}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {member.languages.length > 0 ? (
                                member.languages.map((item) => (
                                  <span
                                    key={item}
                                    className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500"
                                  >
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-neutral-300">
                                  —
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  member.status === "active"
                                    ? "bg-emerald-500"
                                    : "bg-neutral-300"
                                }`}
                              />

                              {getStatusLabel(
                                member.status,
                                language,
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                              <button
                                onClick={() =>
                                  openEditModal(member)
                                }
                                title={
                                  language === "de"
                                    ? "Bearbeiten"
                                    : "Редактировать"
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                              >
                                <Edit3
                                  size={15}
                                  strokeWidth={1.8}
                                />
                              </button>

                              <button
                                onClick={() =>
                                  setDeleteMember(member)
                                }
                                title={
                                  language === "de"
                                    ? "Löschen"
                                    : "Удалить"
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2
                                  size={15}
                                  strokeWidth={1.8}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mobile list */}
          <section className="space-y-2 md:hidden">
            {loading ? (
              <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-neutral-400">
                {language === "de"
                  ? "Team wird geladen..."
                  : "Загрузка команды..."}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-12 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
                  <UserRound size={18} />
                </div>

                <div className="mt-3 text-sm font-medium text-neutral-700">
                  {language === "de"
                    ? "Keine Mitglieder gefunden"
                    : "Участники не найдены"}
                </div>

                <div className="mt-1 text-xs text-neutral-400">
                  {language === "de"
                    ? "Passe deine Suche oder Filter an."
                    : "Измени поиск или фильтры."}
                </div>
              </div>
            ) : (
              filteredMembers.map((member) => {
                const age = calculateAge(member.birth_date);

                return (
                  <article
                    key={member.id}
                    className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-xs font-semibold text-neutral-600">
                        {getInitials(member)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-neutral-900">
                              {member.first_name}{" "}
                              {member.last_name}
                            </h3>

                            <div className="mt-1">
                              <span
                                className={`inline-flex max-w-full truncate rounded-lg border px-2 py-0.5 text-[10px] font-medium ${getPositionStyle(
                                  member.position,
                                )}`}
                              >
                                {getPositionLabel(
                                  member.position,
                                  language,
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() =>
                                openEditModal(member)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                            >
                              <Edit3
                                size={15}
                                strokeWidth={1.8}
                              />
                            </button>

                            <button
                              onClick={() =>
                                setDeleteMember(member)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2
                                size={15}
                                strokeWidth={1.8}
                              />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                          <div className="min-w-0">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                              {language === "de"
                                ? "Kontakt"
                                : "Контакт"}
                            </div>

                            <div className="mt-0.5 truncate text-xs font-medium text-neutral-700">
                              {member.phone || "—"}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                              {language === "de"
                                ? "Geburtstag"
                                : "Дата рождения"}
                            </div>

                            <div className="mt-0.5 truncate text-xs font-medium text-neutral-700">
                              {formatDate(
                                member.birth_date,
                                language,
                              )}

                              {age !== null && (
                                <span className="ml-1 text-neutral-400">
                                  · {age}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5">
                          <div className="flex flex-wrap gap-1">
                            {member.languages.length > 0 ? (
                              member.languages.map((item) => (
                                <span
                                  key={item}
                                  className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-500"
                                >
                                  {item}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-neutral-300">
                                —
                              </span>
                            )}
                          </div>

                          <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-neutral-500">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                member.status === "active"
                                  ? "bg-emerald-500"
                                  : "bg-neutral-300"
                              }`}
                            />

                            {getStatusLabel(
                              member.status,
                              language,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </main>
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-[620px] sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                  {editingMember
                    ? language === "de"
                      ? "Mitglied bearbeiten"
                      : "Редактировать участника"
                    : language === "de"
                      ? "Mitglied hinzufügen"
                      : "Добавить участника"}
                </h2>

                <p className="mt-0.5 text-xs text-neutral-400">
                  {language === "de"
                    ? "Teamdaten verwalten."
                    : "Управление данными участника."}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {/* Name */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "de" ? "Name" : "Имя"}
                </label>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    value={form.first_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        first_name: event.target.value,
                      }))
                    }
                    placeholder={
                      language === "de" ? "Vorname" : "Имя"
                    }
                    className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none transition focus:border-neutral-400 focus:bg-white"
                  />

                  <input
                    value={form.last_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        last_name: event.target.value,
                      }))
                    }
                    placeholder={
                      language === "de" ? "Nachname" : "Фамилия"
                    }
                    className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none transition focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Position / status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-neutral-700">
                    {language === "de"
                      ? "Position"
                      : "Должность"}
                  </label>

                  <select
                    value={form.position}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        position: event.target.value as Position,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  >
                    <option value="hauptleiter">
                      {getPositionLabel(
                        "hauptleiter",
                        language,
                      )}
                    </option>

                    <option value="leiter">
                      {getPositionLabel("leiter", language)}
                    </option>

                    <option value="co_leiter">
                      {getPositionLabel(
                        "co_leiter",
                        language,
                      )}
                    </option>

                    <option value="sekretariat">
                      {getPositionLabel(
                        "sekretariat",
                        language,
                      )}
                    </option>

                    <option value="weitere">
                      {getPositionLabel(
                        "weitere",
                        language,
                      )}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-neutral-700">
                    {language === "de" ? "Status" : "Статус"}
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as Status,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  >
                    <option value="active">
                      {language === "de"
                        ? "Aktiv"
                        : "Активен"}
                    </option>

                    <option value="inactive">
                      {language === "de"
                        ? "Inaktiv"
                        : "Неактивен"}
                    </option>
                  </select>
                </div>
              </div>

              {/* Contact / birth */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-neutral-700">
                    {language === "de"
                      ? "Telefon"
                      : "Телефон"}
                  </label>

                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="+49 ..."
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none transition focus:border-neutral-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-neutral-700">
                    {language === "de"
                      ? "Geburtsdatum"
                      : "Дата рождения"}
                  </label>

                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        birth_date: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none transition focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "de"
                    ? "Sprachen"
                    : "Языки"}
                </label>

                <div className="flex gap-2">
                  {["DE", "RU"].map((item) => {
                    const selected =
                      form.languages.includes(item);

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleLanguage(item)}
                        className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                          selected
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language === "de"
                    ? "Notizen"
                    : "Заметки"}
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder={
                    language === "de"
                      ? "Optionale Notizen..."
                      : "Дополнительные заметки..."
                  }
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm outline-none transition focus:border-neutral-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="sticky bottom-0 flex gap-2 border-t border-neutral-100 bg-white p-4 sm:px-6">
              <button
                onClick={closeModal}
                disabled={saving}
                className="h-11 flex-1 rounded-xl border border-neutral-200 bg-white text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                {language === "de" ? "Abbrechen" : "Отмена"}
              </button>

              <button
                onClick={saveMember}
                disabled={
                  saving ||
                  !form.first_name.trim() ||
                  !form.last_name.trim()
                }
                className="h-11 flex-1 rounded-xl bg-neutral-900 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? language === "de"
                    ? "Speichern..."
                    : "Сохранение..."
                  : editingMember
                    ? language === "de"
                      ? "Speichern"
                      : "Сохранить"
                    : language === "de"
                      ? "Hinzufügen"
                      : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteMember && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              if (!deleting) {
                setDeleteMember(null);
              }
            }
          }}
        >
          <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-[430px] sm:rounded-2xl sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={19} strokeWidth={1.8} />
            </div>

            <h2 className="mt-4 text-lg font-semibold tracking-tight text-neutral-900">
              {language === "de"
                ? "Mitglied löschen?"
                : "Удалить участника?"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              {language === "de"
                ? `Möchtest du ${deleteMember.first_name} ${deleteMember.last_name} wirklich aus dem Team entfernen?`
                : `Ты действительно хочешь удалить ${deleteMember.first_name} ${deleteMember.last_name} из команды?`}
            </p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setDeleteMember(null)}
                disabled={deleting}
                className="h-11 flex-1 rounded-xl border border-neutral-200 bg-white text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                {language === "de" ? "Abbrechen" : "Отмена"}
              </button>

              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting
                  ? language === "de"
                    ? "Löschen..."
                    : "Удаление..."
                  : language === "de"
                    ? "Löschen"
                    : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}