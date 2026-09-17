"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { translations, type Language } from "@/lib/translations";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

type Gender = "male" | "female";
type TeenLanguage = "de" | "ru";

type Teen = {
  id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  phone: string | null;
  gender: Gender | null;
  languages: TeenLanguage[];
  is_active: boolean;
  created_at: string;
};

type AgeFilter = "all" | number;
type GenderFilter = "all" | Gender;
type LanguageFilter = "all" | TeenLanguage;

export default function TeensPage() {
  const [language, setLanguage] =
    useState<Language>("ru");

  const [teens, setTeens] = useState<Teen[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showInactive, setShowInactive] =
    useState(false);

  const [genderFilter, setGenderFilter] =
    useState<GenderFilter>("all");

  const [languageFilter, setLanguageFilter] =
    useState<LanguageFilter>("all");

  const [ageFilter, setAgeFilter] =
    useState<AgeFilter>("all");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState(false);

  const [editingTeen, setEditingTeen] =
    useState<Teen | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [birthDate, setBirthDate] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [gender, setGender] =
    useState<Gender | "">("");

  const [selectedLanguages, setSelectedLanguages] =
    useState<TeenLanguage[]>([]);

  const [isActive, setIsActive] =
    useState(true);

  const t = translations[language];

  useEffect(() => {
    loadTeens();
  }, []);

  async function loadTeens() {
    setLoading(true);

    const { data, error } = await supabase
      .from("teens")
      .select("*")
      .order("last_name", {
        ascending: true,
      })
      .order("first_name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Error loading teens:",
        error
      );

      setTeens([]);
    } else {
      setTeens(data ?? []);
    }

    setLoading(false);
  }

  function calculateAge(
    birthDate: string
  ) {
    const birth = new Date(
      `${birthDate}T00:00:00`
    );

    const today = new Date();

    let age =
      today.getFullYear() -
      birth.getFullYear();

    const monthDifference =
      today.getMonth() -
      birth.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        today.getDate() <
          birth.getDate())
    ) {
      age--;
    }

    return age;
  }

  function formatDate(date: string) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      language === "ru"
        ? "ru-RU"
        : "de-DE",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  function getGenderLabel(
    value: Gender | null
  ) {
    if (value === "male") {
      return language === "ru"
        ? "Мальчик"
        : "Junge";
    }

    if (value === "female") {
      return language === "ru"
        ? "Девочка"
        : "Mädchen";
    }

    return language === "ru"
      ? "Не указан"
      : "Nicht angegeben";
  }

  function getLanguageLabel(
    value: TeenLanguage
  ) {
    return value === "de"
      ? "Deutsch"
      : "Русский";
  }

  function getLanguagesLabel(
    languages: TeenLanguage[]
  ) {
    if (!languages || languages.length === 0) {
      return language === "ru"
        ? "Не указан"
        : "Nicht angegeben";
    }

    return languages
      .map((item) =>
        getLanguageLabel(item)
      )
      .join(" + ");
  }

  function toggleLanguage(
    value: TeenLanguage
  ) {
    setSelectedLanguages(
      (current) => {
        if (current.includes(value)) {
          return current.filter(
            (item) => item !== value
          );
        }

        return [...current, value];
      }
    );
  }

  const filteredTeens = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return teens.filter((teen) => {
      if (
        !showInactive &&
        !teen.is_active
      ) {
        return false;
      }

      if (
        genderFilter !== "all" &&
        teen.gender !== genderFilter
      ) {
        return false;
      }

      if (
        languageFilter !== "all" &&
        !(teen.languages ?? []).includes(
          languageFilter
        )
      ) {
        return false;
      }

      if (ageFilter !== "all") {
        const age = calculateAge(
          teen.birth_date
        );

        if (age !== ageFilter) {
          return false;
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      const fullName =
        `${teen.first_name} ${teen.last_name}`.toLowerCase();

      const reverseName =
        `${teen.last_name} ${teen.first_name}`.toLowerCase();

      const phoneValue =
        (
          teen.phone ?? ""
        ).toLowerCase();

      return (
        fullName.includes(
          normalizedSearch
        ) ||
        reverseName.includes(
          normalizedSearch
        ) ||
        phoneValue.includes(
          normalizedSearch
        )
      );
    });
  }, [
    teens,
    search,
    showInactive,
    genderFilter,
    languageFilter,
    ageFilter,
  ]);

  const activeCount = teens.filter(
    (teen) => teen.is_active
  ).length;

  const inactiveCount =
    teens.length - activeCount;

  const boysCount = teens.filter(
    (teen) =>
      teen.gender === "male" &&
      teen.is_active
  ).length;

  const girlsCount = teens.filter(
    (teen) =>
      teen.gender === "female" &&
      teen.is_active
  ).length;

  const filteredActiveCount =
    filteredTeens.filter(
      (teen) => teen.is_active
    ).length;

  const filteredBoysCount =
    filteredTeens.filter(
      (teen) =>
        teen.gender === "male"
    ).length;

  const filteredGirlsCount =
    filteredTeens.filter(
      (teen) =>
        teen.gender === "female"
    ).length;

  function resetForm() {
    setFirstName("");
    setLastName("");
    setBirthDate("");
    setPhone("");
    setGender("");
    setSelectedLanguages([]);
    setIsActive(true);
    setEditingTeen(null);
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(
    teen: Teen
  ) {
    setEditingTeen(teen);

    setFirstName(
      teen.first_name
    );

    setLastName(
      teen.last_name
    );

    setBirthDate(
      teen.birth_date
    );

    setPhone(
      teen.phone ?? ""
    );

    setGender(
      teen.gender ?? ""
    );

    setSelectedLanguages(
      teen.languages ?? []
    );

    setIsActive(
      teen.is_active
    );

    setIsModalOpen(true);
  }

  function closeModal() {
    if (
      saving ||
      deleting
    ) {
      return;
    }

    setIsModalOpen(false);
    setIsDeleteConfirmOpen(false);
    resetForm();
  }

  async function saveTeen() {
    const cleanFirstName =
      firstName.trim();

    const cleanLastName =
      lastName.trim();

    const cleanPhone =
      phone.trim();

    if (
      !cleanFirstName ||
      !cleanLastName ||
      !birthDate ||
      saving
    ) {
      return;
    }

    setSaving(true);

    const teenData = {
      first_name:
        cleanFirstName,

      last_name:
        cleanLastName,

      birth_date:
        birthDate,

      phone:
        cleanPhone || null,

      gender:
        gender || null,

      languages:
        selectedLanguages,

      is_active:
        isActive,
    };

    if (editingTeen) {
      const { data, error } =
        await supabase
          .from("teens")
          .update(teenData)
          .eq(
            "id",
            editingTeen.id
          )
          .select()
          .single();

      if (error) {
        console.error(
          "Error updating teen:",
          error
        );

        setSaving(false);
        return;
      }

      setTeens(
        (current) =>
          current.map(
            (teen) =>
              teen.id ===
              editingTeen.id
                ? data
                : teen
          )
      );
    } else {
      const { data, error } =
        await supabase
          .from("teens")
          .insert(teenData)
          .select()
          .single();

      if (error) {
        console.error(
          "Error creating teen:",
          error
        );

        setSaving(false);
        return;
      }

      setTeens(
        (current) => [
          ...current,
          data,
        ]
      );
    }

    setSaving(false);
    setIsModalOpen(false);
    resetForm();
  }

  async function deleteTeen() {
    if (
      !editingTeen ||
      deleting
    ) {
      return;
    }

    setDeleting(true);

    const { error } =
      await supabase
        .from("teens")
        .delete()
        .eq(
          "id",
          editingTeen.id
        );

    if (error) {
      console.error(
        "Error deleting teen:",
        error
      );

      setDeleting(false);
      return;
    }

    setTeens(
      (current) =>
        current.filter(
          (teen) =>
            teen.id !==
            editingTeen.id
        )
    );

    setDeleting(false);
    setIsDeleteConfirmOpen(false);
    setIsModalOpen(false);
    resetForm();
  }

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

        <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
          {/* HEADER */}

          <section className="pb-8 pt-10 sm:pb-10 sm:pt-14 lg:pt-16">
            <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400 sm:mb-4 sm:text-[10px] sm:tracking-[0.18em]">
              {t.common.teamWorkspace}
            </p>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-4xl font-bold tracking-[-0.055em] text-neutral-950 sm:text-5xl lg:text-6xl">
                  {language ===
                  "ru"
                    ? "Подростки"
                    : "Teens"}
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500 sm:text-base">
                  {language ===
                  "ru"
                    ? "Обзор подростков нашей группы."
                    : "Übersicht über die Jugendlichen unserer Gruppe."}
                </p>
              </div>

              <button
                onClick={
                  openCreateModal
                }
                className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.99] sm:w-auto"
              >
                <Plus
                  size={16}
                  strokeWidth={2}
                />

                {language ===
                "ru"
                  ? "Добавить подростка"
                  : "Teenager hinzufügen"}
              </button>
            </div>
          </section>

          {/* STATISTICS */}

          <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                {language ===
                "ru"
                  ? "Всего"
                  : "Gesamt"}
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-950">
                {teens.length}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                {language ===
                "ru"
                  ? "Активные"
                  : "Aktiv"}
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                {activeCount}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                {language ===
                "ru"
                  ? "Мальчики"
                  : "Jungen"}
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-blue-600">
                {boysCount}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                {language ===
                "ru"
                  ? "Девочки"
                  : "Mädchen"}
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-pink-500">
                {girlsCount}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                {language ===
                "ru"
                  ? "В выборке"
                  : "Gefiltert"}
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-950">
                {filteredTeens.length}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                {language ===
                "ru"
                  ? "Неактивные"
                  : "Inaktiv"}
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-500">
                {inactiveCount}
              </p>
            </div>
          </section>

          {/* FILTERS */}

          <section className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              {/* SEARCH */}

              <div className="relative">
                <Search
                  size={16}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder={
                    language ===
                    "ru"
                      ? "Поиск по имени или телефону..."
                      : "Nach Name oder Telefonnummer suchen..."
                  }
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
                />
              </div>

              {/* FILTER ROW */}

              <div className="flex flex-wrap items-center gap-2">
                {/* ACTIVE */}

                <button
                  type="button"
                  onClick={() =>
                    setShowInactive(
                      (current) =>
                        !current
                    )
                  }
                  className={`h-9 rounded-lg border px-3 text-xs font-medium transition ${
                    showInactive
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-white hover:text-neutral-900"
                  }`}
                >
                  {showInactive
                    ? language ===
                      "ru"
                      ? "Все"
                      : "Alle"
                    : language ===
                        "ru"
                      ? "Активные"
                      : "Aktive"}
                </button>

                {/* AGE */}

                <select
                  value={
                    ageFilter ===
                    "all"
                      ? "all"
                      : String(
                          ageFilter
                        )
                  }
                  onChange={(
                    event
                  ) => {
                    const value =
                      event.target
                        .value;

                    setAgeFilter(
                      value ===
                        "all"
                        ? "all"
                        : Number(
                            value
                          )
                    );
                  }}
                  className="h-9 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs font-medium text-neutral-600 outline-none transition focus:border-neutral-400"
                >
                  <option value="all">
                    {language ===
                    "ru"
                      ? "Все возраста"
                      : "Alle Alter"}
                  </option>

                  {Array.from(
                    {
                      length: 9,
                    },
                    (
                      _,
                      index
                    ) => {
                      const age =
                        index +
                        10;

                      return (
                        <option
                          key={age}
                          value={age}
                        >
                          {age}{" "}
                          {language ===
                          "ru"
                            ? "лет"
                            : "Jahre"}
                        </option>
                      );
                    }
                  )}
                </select>

                {/* GENDER */}

                <button
                  type="button"
                  onClick={() =>
                    setGenderFilter(
                      "all"
                    )
                  }
                  className={`h-9 rounded-lg border px-3 text-xs font-medium transition ${
                    genderFilter ===
                    "all"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-white hover:text-neutral-900"
                  }`}
                >
                  {language ===
                  "ru"
                    ? "Все"
                    : "Alle"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setGenderFilter(
                      "male"
                    )
                  }
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                    genderFilter ===
                    "male"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />

                  {language ===
                  "ru"
                    ? "Мальчики"
                    : "Jungen"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setGenderFilter(
                      "female"
                    )
                  }
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                    genderFilter ===
                    "female"
                      ? "border-pink-200 bg-pink-50 text-pink-700"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-pink-50 hover:text-pink-700"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />

                  {language ===
                  "ru"
                    ? "Девочки"
                    : "Mädchen"}
                </button>

                {/* LANGUAGE */}

                <button
                  type="button"
                  onClick={() =>
                    setLanguageFilter(
                      "all"
                    )
                  }
                  className={`h-9 rounded-lg border px-3 text-xs font-medium transition ${
                    languageFilter ===
                    "all"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-white hover:text-neutral-900"
                  }`}
                >
                  {language ===
                  "ru"
                    ? "Все языки"
                    : "Alle Sprachen"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setLanguageFilter(
                      "de"
                    )
                  }
                  className={`h-9 rounded-lg border px-3 text-xs font-medium transition ${
                    languageFilter ===
                    "de"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-white hover:text-neutral-900"
                  }`}
                >
                  Deutsch
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setLanguageFilter(
                      "ru"
                    )
                  }
                  className={`h-9 rounded-lg border px-3 text-xs font-medium transition ${
                    languageFilter ===
                    "ru"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-white hover:text-neutral-900"
                  }`}
                >
                  Русский
                </button>
              </div>
            </div>

            {/* FILTER RESULT */}

            {(ageFilter !==
              "all" ||
              genderFilter !==
                "all" ||
              languageFilter !==
                "all" ||
              search ||
              showInactive) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                <span className="text-xs text-neutral-400">
                  {language ===
                  "ru"
                    ? "Результат:"
                    : "Ergebnis:"}
                </span>

                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                  {filteredTeens.length}
                </span>

                {ageFilter !==
                  "all" && (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">
                    {ageFilter}{" "}
                    {language ===
                    "ru"
                      ? "лет"
                      : "Jahre"}
                  </span>
                )}

                {genderFilter ===
                  "male" && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-600">
                    {language ===
                    "ru"
                      ? "Мальчики"
                      : "Jungen"}
                  </span>
                )}

                {genderFilter ===
                  "female" && (
                  <span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs text-pink-600">
                    {language ===
                    "ru"
                      ? "Девочки"
                      : "Mädchen"}
                  </span>
                )}

                {languageFilter !==
                  "all" && (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                    {languageFilter ===
                    "de"
                      ? "Deutsch"
                      : "Русский"}
                  </span>
                )}
              </div>
            )}
          </section>

          {/* TABLE */}

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center">
                <p className="text-sm text-neutral-400">
                  {language ===
                  "ru"
                    ? "Загрузка подростков..."
                    : "Teenager werden geladen..."}
                </p>
              </div>
            ) : filteredTeens.length ===
              0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                  <UserRound
                    size={20}
                    strokeWidth={
                      1.7
                    }
                  />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-neutral-900">
                  {language ===
                  "ru"
                    ? "Никого не найдено"
                    : "Keine Teenager gefunden"}
                </h3>

                <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-400">
                  {language ===
                  "ru"
                    ? "Попробуйте изменить фильтры или поисковый запрос."
                    : "Versuche die Filter oder den Suchbegriff zu ändern."}
                </p>
              </div>
            ) : (
              <>
                {/* DESKTOP */}

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1050px] border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50">
                        <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                          {language ===
                          "ru"
                            ? "Имя"
                            : "Name"}
                        </th>

                        <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                          {language ===
                          "ru"
                            ? "Пол"
                            : "Geschlecht"}
                        </th>

                        <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                          {language ===
                          "ru"
                            ? "Рождение"
                            : "Geburt"}
                        </th>

                        <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                          {language ===
                          "ru"
                            ? "Возраст"
                            : "Alter"}
                        </th>

                        <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                          {language ===
                          "ru"
                            ? "Язык"
                            : "Sprache"}
                        </th>

                        <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                          {language ===
                          "ru"
                            ? "Телефон"
                            : "Telefon"}
                        </th>

                        <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                          {language ===
                          "ru"
                            ? "Статус"
                            : "Status"}
                        </th>

                        <th className="w-12 px-3 py-3.5" />
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-neutral-100">
                      {filteredTeens.map(
                        (teen) => (
                          <tr
                            key={
                              teen.id
                            }
                            className="group transition hover:bg-neutral-50"
                          >
                            <td className="px-5 py-4">
                              <div className="font-medium text-neutral-900">
                                {
                                  teen.first_name
                                }{" "}
                                {
                                  teen.last_name
                                }
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              {teen.gender ? (
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      teen.gender ===
                                      "male"
                                        ? "bg-blue-500"
                                        : "bg-pink-500"
                                    }`}
                                  />

                                  <span
                                    className={`text-sm font-medium ${
                                      teen.gender ===
                                      "male"
                                        ? "text-blue-600"
                                        : "text-pink-600"
                                    }`}
                                  >
                                    {getGenderLabel(
                                      teen.gender
                                    )}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-sm text-neutral-400">
                                  —
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-sm text-neutral-500">
                              {formatDate(
                                teen.birth_date
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex min-w-[34px] items-center justify-center rounded-lg bg-neutral-100 px-2 py-1 text-sm font-semibold text-neutral-800">
                                {calculateAge(
                                  teen.birth_date
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {(
                                  teen.languages ??
                                  []
                                ).length ===
                                0 ? (
                                  <span className="text-sm text-neutral-400">
                                    —
                                  </span>
                                ) : (
                                  (
                                    teen.languages ??
                                    []
                                  ).map(
                                    (
                                      lang
                                    ) => (
                                      <span
                                        key={
                                          lang
                                        }
                                        className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600"
                                      >
                                        {getLanguageLabel(
                                          lang
                                        )}
                                      </span>
                                    )
                                  )
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm text-neutral-500">
                              {teen.phone ||
                                "—"}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                  teen.is_active
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-neutral-100 text-neutral-400"
                                }`}
                              >
                                {teen.is_active
                                  ? language ===
                                    "ru"
                                    ? "Активен"
                                    : "Aktiv"
                                  : language ===
                                      "ru"
                                    ? "Неактивен"
                                    : "Inaktiv"}
                              </span>
                            </td>

                            <td className="px-3 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    teen
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 opacity-0 transition hover:bg-white hover:text-neutral-900 group-hover:opacity-100"
                              >
                                <Pencil
                                  size={
                                    15
                                  }
                                  strokeWidth={
                                    1.8
                                  }
                                />
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE */}

                <div className="divide-y divide-neutral-100 md:hidden">
                  {filteredTeens.map(
                    (teen) => (
                      <button
                        key={
                          teen.id
                        }
                        type="button"
                        onClick={() =>
                          openEditModal(
                            teen
                          )
                        }
                        className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-neutral-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                          <UserRound
                            size={
                              17
                            }
                            strokeWidth={
                              1.7
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-neutral-900">
                              {
                                teen.first_name
                              }{" "}
                              {
                                teen.last_name
                              }
                            </p>

                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                teen.is_active
                                  ? "bg-emerald-500"
                                  : "bg-neutral-300"
                              }`}
                            />
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
                            <span className="font-semibold text-neutral-700">
                              {calculateAge(
                                teen.birth_date
                              )}{" "}
                              {language ===
                              "ru"
                                ? "лет"
                                : "Jahre"}
                            </span>

                            {teen.gender && (
                              <>
                                <span>
                                  ·
                                </span>

                                <span
                                  className={
                                    teen.gender ===
                                    "male"
                                      ? "font-medium text-blue-500"
                                      : "font-medium text-pink-500"
                                  }
                                >
                                  {getGenderLabel(
                                    teen.gender
                                  )}
                                </span>
                              </>
                            )}

                            {(
                              teen.languages ??
                              []
                            ).length >
                              0 && (
                              <>
                                <span>
                                  ·
                                </span>

                                <span>
                                  {getLanguagesLabel(
                                    teen.languages ??
                                      []
                                  )}
                                </span>
                              </>
                            )}
                          </div>

                          {teen.phone && (
                            <p className="mt-0.5 truncate text-xs text-neutral-400">
                              {
                                teen.phone
                              }
                            </p>
                          )}
                        </div>

                        <Pencil
                          size={
                            15
                          }
                          strokeWidth={
                            1.8
                          }
                          className="shrink-0 text-neutral-300"
                        />
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </section>

          {!loading &&
            filteredTeens.length >
              0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
                <span>
                  {filteredTeens.length}{" "}
                  {language ===
                  "ru"
                    ? "показано"
                    : "angezeigt"}
                </span>

                {ageFilter !==
                  "all" && (
                  <span>
                    {language ===
                    "ru"
                      ? `${filteredTeens.length} подростков в возрасте ${ageFilter} лет`
                      : `${filteredTeens.length} Teenager im Alter von ${ageFilter} Jahren`}
                  </span>
                )}
              </div>
            )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/30 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          onClick={
            closeModal
          }
        >
          <div
            className="max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-48px)] sm:p-6"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Teens
                </p>

                <h2 className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
                  {editingTeen
                    ? language ===
                      "ru"
                      ? "Редактировать подростка"
                      : "Teenager bearbeiten"
                    : language ===
                        "ru"
                      ? "Новый подросток"
                      : "Neuer Teenager"}
                </h2>
              </div>

              <button
                onClick={
                  closeModal
                }
                disabled={
                  saving ||
                  deleting
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
              >
                <X
                  size={
                    19
                  }
                  strokeWidth={
                    1.8
                  }
                />
              </button>
            </div>

            <div className="mt-7 space-y-5">
              {/* NAME */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-neutral-700">
                    {language ===
                    "ru"
                      ? "Имя"
                      : "Vorname"}
                  </label>

                  <input
                    type="text"
                    value={
                      firstName
                    }
                    onChange={(
                      event
                    ) =>
                      setFirstName(
                        event
                          .target
                          .value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
                    placeholder={
                      language ===
                      "ru"
                        ? "Например: Max"
                        : "z. B. Max"
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-neutral-700">
                    {language ===
                    "ru"
                      ? "Фамилия"
                      : "Nachname"}
                  </label>

                  <input
                    type="text"
                    value={
                      lastName
                    }
                    onChange={(
                      event
                    ) =>
                      setLastName(
                        event
                          .target
                          .value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
                    placeholder={
                      language ===
                      "ru"
                        ? "Например: Mustermann"
                        : "z. B. Mustermann"
                    }
                  />
                </div>
              </div>

              {/* GENDER */}

              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language ===
                  "ru"
                    ? "Пол"
                    : "Geschlecht"}
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setGender(
                        "male"
                      )
                    }
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${
                      gender ===
                      "male"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-white hover:text-neutral-900"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500" />

                    {language ===
                    "ru"
                      ? "Мальчик"
                      : "Junge"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setGender(
                        "female"
                      )
                    }
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${
                      gender ===
                      "female"
                        ? "border-pink-200 bg-pink-50 text-pink-700"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-white hover:text-neutral-900"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-pink-500" />

                    {language ===
                    "ru"
                      ? "Девочка"
                      : "Mädchen"}
                  </button>
                </div>
              </div>

              {/* BIRTH DATE */}

              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language ===
                  "ru"
                    ? "Дата рождения"
                    : "Geburtsdatum"}
                </label>

                <input
                  type="date"
                  value={
                    birthDate
                  }
                  onChange={(
                    event
                  ) =>
                    setBirthDate(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:bg-white"
                />

                {birthDate && (
                  <p className="mt-2 text-xs text-neutral-400">
                    {language ===
                    "ru"
                      ? `Возраст сейчас: ${calculateAge(
                          birthDate
                        )} лет`
                      : `Aktuelles Alter: ${calculateAge(
                          birthDate
                        )} Jahre`}
                  </p>
                )}
              </div>

              {/* LANGUAGES */}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-700">
                    {language ===
                    "ru"
                      ? "Язык"
                      : "Sprache"}
                  </label>

                  <span className="text-[10px] text-neutral-400">
                    {language ===
                    "ru"
                      ? "Можно выбрать оба"
                      : "Mehrere möglich"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      toggleLanguage(
                        "de"
                      )
                    }
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${
                      selectedLanguages.includes(
                        "de"
                      )
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-white hover:text-neutral-900"
                    }`}
                  >
                    <span className="text-base">
                      🇩🇪
                    </span>

                    Deutsch
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleLanguage(
                        "ru"
                      )
                    }
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${
                      selectedLanguages.includes(
                        "ru"
                      )
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-white hover:text-neutral-900"
                    }`}
                  >
                    <span className="text-base">
                      🇷🇺
                    </span>

                    Русский
                  </button>
                </div>

                {selectedLanguages.length >
                  0 && (
                  <p className="mt-2 text-xs text-neutral-400">
                    {language ===
                    "ru"
                      ? `Выбрано: ${getLanguagesLabel(
                          selectedLanguages
                        )}`
                      : `Ausgewählt: ${getLanguagesLabel(
                          selectedLanguages
                        )}`}
                  </p>
                )}
              </div>

              {/* PHONE */}

              <div>
                <label className="mb-2 block text-xs font-semibold text-neutral-700">
                  {language ===
                  "ru"
                    ? "Номер телефона"
                    : "Telefonnummer"}
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(
                    event
                  ) =>
                    setPhone(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="+49 ..."
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
                />
              </div>

              {/* STATUS */}

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-neutral-700">
                      {language ===
                      "ru"
                        ? "Статус"
                        : "Status"}
                    </p>

                    <p className="mt-1 text-[11px] text-neutral-400">
                      {language ===
                      "ru"
                        ? "Неактивных можно скрыть из списка."
                        : "Inaktive können ausgeblendet werden."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsActive(
                        (current) =>
                          !current
                      )
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      isActive
                        ? "bg-neutral-900"
                        : "bg-neutral-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                        isActive
                          ? "left-6"
                          : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* BUTTONS */}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {editingTeen && (
                    <button
                      type="button"
                      onClick={() =>
                        setIsDeleteConfirmOpen(
                          true
                        )
                      }
                      disabled={
                        saving ||
                        deleting
                      }
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 sm:w-auto"
                    >
                      <Trash2
                        size={
                          15
                        }
                        strokeWidth={
                          1.8
                        }
                      />

                      {language ===
                      "ru"
                        ? "Удалить"
                        : "Löschen"}
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={
                      saving ||
                      deleting
                    }
                    className="h-11 w-full rounded-xl px-5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 sm:w-auto"
                  >
                    {language ===
                    "ru"
                      ? "Отмена"
                      : "Abbrechen"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      saveTeen
                    }
                    disabled={
                      !firstName.trim() ||
                      !lastName.trim() ||
                      !birthDate ||
                      saving ||
                      deleting
                    }
                    className="h-11 w-full rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:w-auto"
                  >
                    {saving
                      ? language ===
                        "ru"
                        ? "Сохранение..."
                        : "Wird gespeichert..."
                      : editingTeen
                        ? language ===
                          "ru"
                          ? "Сохранить"
                          : "Speichern"
                        : language ===
                            "ru"
                          ? "Добавить"
                          : "Hinzufügen"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}

      {isDeleteConfirmOpen &&
        editingTeen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
            onClick={() => {
              if (!deleting) {
                setIsDeleteConfirmOpen(
                  false
                );
              }
            }}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Trash2
                  size={
                    19
                  }
                  strokeWidth={
                    1.8
                  }
                />
              </div>

              <h3 className="mt-5 text-lg font-semibold tracking-tight text-neutral-950">
                {language ===
                "ru"
                  ? "Удалить подростка?"
                  : "Teenager löschen?"}
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {language ===
                "ru"
                  ? `Ты действительно хочешь удалить ${editingTeen.first_name} ${editingTeen.last_name}? Это действие нельзя отменить.`
                  : `Möchtest du ${editingTeen.first_name} ${editingTeen.last_name} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
              </p>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setIsDeleteConfirmOpen(
                      false
                    )
                  }
                  disabled={
                    deleting
                  }
                  className="h-11 rounded-xl px-5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
                >
                  {language ===
                  "ru"
                    ? "Отмена"
                    : "Abbrechen"}
                </button>

                <button
                  type="button"
                  onClick={
                    deleteTeen
                  }
                  disabled={
                    deleting
                  }
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2
                    size={
                      15
                    }
                    strokeWidth={
                      1.8
                    }
                  />

                  {deleting
                    ? language ===
                      "ru"
                      ? "Удаление..."
                      : "Wird gelöscht..."
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