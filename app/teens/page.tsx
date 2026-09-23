"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cake,
  Check,
  ChevronDown,
  GraduationCap,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

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

type BirthdayCelebration = {
  id: number;
  teen_id: number;
  birthday_year: number;
  celebration_date: string;
  celebrated: boolean;
  created_at?: string;
  updated_at?: string;
};

type AgeFilter = "all" | 12 | 13 | 14 | 15;
type GenderFilter = "all" | Gender;
type LanguageFilter = "all" | TeenLanguage;
type StatusFilter = "active" | "all" | "inactive";

type Tab = "teens" | "graduates";

export default function TeensPage() {
  const { language } = useLanguage();

  const isRu = language === "ru";

  const [teens, setTeens] = useState<Teen[]>([]);
  const [birthdayCelebrations, setBirthdayCelebrations] =
    useState<BirthdayCelebration[]>([]);

  const [loading, setLoading] = useState(true);
  const [birthdayLoading, setBirthdayLoading] = useState(true);

  const [tab, setTab] = useState<Tab>("teens");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("active");
  const [genderFilter, setGenderFilter] =
    useState<GenderFilter>("all");
  const [languageFilter, setLanguageFilter] =
    useState<LanguageFilter>("all");
  const [ageFilter, setAgeFilter] =
    useState<AgeFilter>("all");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [graduateYearFilter, setGraduateYearFilter] =
    useState<number | "all">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState(false);

  const [editingTeen, setEditingTeen] =
    useState<Teen | null>(null);

  const [selectedTeen, setSelectedTeen] =
    useState<Teen | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");

  const [gender, setGender] =
    useState<Gender | "">("");

  const [selectedLanguages, setSelectedLanguages] =
    useState<TeenLanguage[]>([]);

  const [isActive, setIsActive] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadTeens();
    loadBirthdayCelebrations();
  }, []);

  async function loadTeens() {
    setLoading(true);

    const { data, error } = await supabase
      .from("teens")
      .select("*")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Error loading teens:", error);
      setTeens([]);
    } else {
      setTeens(data ?? []);
    }

    setLoading(false);
  }

  async function loadBirthdayCelebrations() {
    setBirthdayLoading(true);

    const { data, error } = await supabase
      .from("teen_birthday_celebrations")
      .select("*")
      .eq("birthday_year", currentYear);

    if (error) {
      console.error("❌ Birthday celebrations error");
      console.error("message:", error?.message);
      console.error("details:", error?.details);
      console.error("hint:", error?.hint);
      console.error("code:", error?.code);
      console.error("full error:", error);

      setBirthdayCelebrations([]);
      setBirthdayLoading(false);
      return;
    }

    setBirthdayCelebrations(data ?? []);
    setBirthdayLoading(false);
  }

  function parseDate(date: string) {
    const [year, month, day] = date
      .split("-")
      .map(Number);

    return new Date(year, month - 1, day);
  }

  function formatDate(date: string) {
    return parseDate(date).toLocaleDateString(
      isRu ? "ru-RU" : "de-DE",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  function calculateAge(date: string) {
    const birth = parseDate(date);
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
        today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }

  function getGraduationYear(date: string) {
    return parseDate(date).getFullYear() + 16;
  }

  function getBirthdayDateForYear(
    date: string,
    year: number
  ) {
    const birth = parseDate(date);

    let day = birth.getDate();

    if (
      birth.getMonth() === 1 &&
      day === 29 &&
      !(
        year % 4 === 0 &&
        (year % 100 !== 0 ||
          year % 400 === 0)
      )
    ) {
      day = 28;
    }

    return new Date(
      year,
      birth.getMonth(),
      day
    );
  }

  function formatShortDate(date: Date) {
    return date.toLocaleDateString(
      isRu ? "ru-RU" : "de-DE",
      {
        day: "2-digit",
        month: "2-digit",
      }
    );
  }

  function dateToISO(date: Date) {
    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getPreviousSunday(date: Date) {
    const result = new Date(date);
    const day = result.getDay();

    result.setDate(
      result.getDate() - day
    );

    return result;
  }

  function getNextSunday(date: Date) {
    const result = new Date(date);
    const day = result.getDay();

    const daysUntilSunday =
      day === 0 ? 0 : 7 - day;

    result.setDate(
      result.getDate() + daysUntilSunday
    );

    return result;
  }

  const birthdayWeek = useMemo(() => {
    const today = new Date();

    return {
      previousSunday:
        getPreviousSunday(today),
      nextSunday:
        getNextSunday(today),
      isSunday:
        today.getDay() === 0,
    };
  }, []);

  const birthdayCandidates = useMemo(() => {
    const {
      previousSunday,
      nextSunday,
      isSunday,
    } = birthdayWeek;

    return teens
      .filter((teen) => teen.is_active)
      .map((teen) => {
        const birthday =
          getBirthdayDateForYear(
            teen.birth_date,
            currentYear
          );

        return {
          teen,
          birthday,
        };
      })
      .filter(({ birthday }) => {
        if (isSunday) {
          return (
            birthday >= previousSunday &&
            birthday <= nextSunday
          );
        }

        return (
          birthday > previousSunday &&
          birthday <= nextSunday
        );
      })
      .sort(
        (a, b) =>
          a.birthday.getTime() -
          b.birthday.getTime()
      );
  }, [
    teens,
    birthdayWeek,
    currentYear,
  ]);

  const pendingBirthdays =
    birthdayCandidates.filter(
      ({ teen }) => {
        const celebration =
          birthdayCelebrations.find(
            (item) =>
              item.teen_id === teen.id &&
              item.birthday_year ===
                currentYear
          );

        return !celebration?.celebrated;
      }
    );

  async function markBirthdayCelebrated(
    teen: Teen
  ) {
    const celebrationDate = dateToISO(
      birthdayWeek.nextSunday
    );

    const existing =
      birthdayCelebrations.find(
        (item) =>
          item.teen_id === teen.id &&
          item.birthday_year ===
            currentYear
      );

    if (existing) {
      const { data, error } =
        await supabase
          .from(
            "teen_birthday_celebrations"
          )
          .update({
            celebrated: true,
            celebration_date:
              celebrationDate,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

      if (error) {
        console.error(
          "❌ Error updating birthday",
          error
        );
        return;
      }

      setBirthdayCelebrations(
        (current) =>
          current.map((item) =>
            item.id === existing.id
              ? data
              : item
          )
      );

      return;
    }

    const { data, error } =
      await supabase
        .from(
          "teen_birthday_celebrations"
        )
        .insert({
          teen_id: teen.id,
          birthday_year:
            currentYear,
          celebration_date:
            celebrationDate,
          celebrated: true,
          updated_at:
            new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
      console.error(
        "❌ Error saving birthday",
        error
      );
      return;
    }

    setBirthdayCelebrations(
      (current) => [
        ...current,
        data,
      ]
    );
  }

  function getGenderLabel(
    value: Gender | null
  ) {
    if (value === "male") {
      return isRu
        ? "Мальчик"
        : "Junge";
    }

    if (value === "female") {
      return isRu
        ? "Девочка"
        : "Mädchen";
    }

    return isRu
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
    if (
      !languages ||
      languages.length === 0
    ) {
      return isRu
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

  const mainTeenList = useMemo(() => {
    const normalizedSearch =
      search
        .trim()
        .toLocaleLowerCase();

    return teens
      .filter((teen) => {
        const age = calculateAge(
          teen.birth_date
        );

        if (age < 12 || age > 15) {
          return false;
        }

        if (
          statusFilter === "active" &&
          !teen.is_active
        ) {
          return false;
        }

        if (
          statusFilter === "inactive" &&
          teen.is_active
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

        if (
          ageFilter !== "all" &&
          age !== ageFilter
        ) {
          return false;
        }

        if (normalizedSearch) {
          const fullName =
            `${teen.first_name} ${teen.last_name}`
              .toLocaleLowerCase();

          const reverseName =
            `${teen.last_name} ${teen.first_name}`
              .toLocaleLowerCase();

          const phoneValue =
            (teen.phone ?? "")
              .toLocaleLowerCase();

          if (
            !fullName.includes(
              normalizedSearch
            ) &&
            !reverseName.includes(
              normalizedSearch
            ) &&
            !phoneValue.includes(
              normalizedSearch
            )
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`,
          isRu ? "ru" : "de",
          {
            sensitivity: "base",
          }
        )
      );
  }, [
    teens,
    search,
    statusFilter,
    genderFilter,
    languageFilter,
    ageFilter,
    isRu,
  ]);

  const graduateYears = useMemo(() => {
    const years = new Set<number>();

    teens.forEach((teen) => {
      const year =
        getGraduationYear(
          teen.birth_date
        );

      if (
        year >= currentYear &&
        year <= currentYear + 5
      ) {
        years.add(year);
      }
    });

    return Array.from(years).sort(
      (a, b) => a - b
    );
  }, [teens, currentYear]);

  const graduates = useMemo(() => {
    return teens
      .filter((teen) => {
        const year =
          getGraduationYear(
            teen.birth_date
          );

        if (
          year < currentYear ||
          year > currentYear + 5
        ) {
          return false;
        }

        if (
          graduateYearFilter !== "all" &&
          year !== graduateYearFilter
        ) {
          return false;
        }

        if (search.trim()) {
          const query =
            search
              .trim()
              .toLocaleLowerCase();

          const fullName =
            `${teen.first_name} ${teen.last_name}`
              .toLocaleLowerCase();

          return fullName.includes(query);
        }

        return true;
      })
      .sort((a, b) => {
        const yearA =
          getGraduationYear(
            a.birth_date
          );

        const yearB =
          getGraduationYear(
            b.birth_date
          );

        if (yearA !== yearB) {
          return yearA - yearB;
        }

        return `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`,
          isRu ? "ru" : "de"
        );
      });
  }, [
    teens,
    currentYear,
    graduateYearFilter,
    search,
    isRu,
  ]);

  const activeCount = teens.filter(
    (teen) => teen.is_active
  ).length;

  const mainAgeCount = teens.filter(
    (teen) => {
      const age = calculateAge(
        teen.birth_date
      );

      return age >= 12 && age <= 15;
    }
  ).length;

  const activeMainAgeCount = teens.filter(
    (teen) => {
      const age = calculateAge(
        teen.birth_date
      );

      return (
        teen.is_active &&
        age >= 12 &&
        age <= 15
      );
    }
  ).length;

  const boysCount = teens.filter(
    (teen) =>
      teen.is_active &&
      teen.gender === "male" &&
      calculateAge(teen.birth_date) >=
        12 &&
      calculateAge(teen.birth_date) <=
        15
  ).length;

  const girlsCount = teens.filter(
    (teen) =>
      teen.is_active &&
      teen.gender === "female" &&
      calculateAge(teen.birth_date) >=
        12 &&
      calculateAge(teen.birth_date) <=
        15
  ).length;

  const ageCounts = {
    12: teens.filter(
      (teen) =>
        teen.is_active &&
        calculateAge(
          teen.birth_date
        ) === 12
    ).length,

    13: teens.filter(
      (teen) =>
        teen.is_active &&
        calculateAge(
          teen.birth_date
        ) === 13
    ).length,

    14: teens.filter(
      (teen) =>
        teen.is_active &&
        calculateAge(
          teen.birth_date
        ) === 14
    ).length,

    15: teens.filter(
      (teen) =>
        teen.is_active &&
        calculateAge(
          teen.birth_date
        ) === 15
    ).length,
  };

  const activeFilterCount =
    (statusFilter !== "active"
      ? 1
      : 0) +
    (genderFilter !== "all"
      ? 1
      : 0) +
    (languageFilter !== "all"
      ? 1
      : 0);

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "active" ||
    ageFilter !== "all" ||
    genderFilter !== "all" ||
    languageFilter !== "all";

  function resetFilters() {
    setSearch("");
    setStatusFilter("active");
    setAgeFilter("all");
    setGenderFilter("all");
    setLanguageFilter("all");
  }

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
    setSelectedTeen(null);

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
    setIsDeleteConfirmOpen(
      false
    );
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

    setBirthdayCelebrations(
      (current) =>
        current.filter(
          (item) =>
            item.teen_id !==
            editingTeen.id
        )
    );

    setDeleting(false);
    setIsDeleteConfirmOpen(
      false
    );
    setIsModalOpen(false);
    resetForm();
  }

  return (
    <main className="min-h-screen bg-[#f5f5f3] text-neutral-900">
      <div className="mx-auto w-full max-w-[760px] px-4 pb-28 pt-5 sm:px-6 sm:pt-8">

        {/* TOP BAR */}

        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
              TLight
            </p>

            <h1 className="mt-1 text-[28px] font-bold tracking-[-0.05em] text-neutral-950">
              {isRu
                ? "Подростки"
                : "Teenager"}
            </h1>
          </div>

          <button
            type="button"
            onClick={
              openCreateModal
            }
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-950 text-white shadow-sm transition active:scale-95"
            aria-label={
              isRu
                ? "Добавить подростка"
                : "Teenager hinzufügen"
            }
          >
            <Plus
              size={18}
              strokeWidth={2}
            />
          </button>
        </header>

        {/* BIRTHDAY CARD */}

        <section className="mb-5 overflow-hidden rounded-[22px] bg-neutral-950 text-white">
          <div className="flex items-start justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Cake
                    size={16}
                    strokeWidth={1.8}
                  />
                </div>

                <p className="text-sm font-semibold">
                  {isRu
                    ? "Дни рождения"
                    : "Geburtstage"}
                </p>
              </div>

              <p className="mt-2 text-[12px] text-white/50">
                {isRu
                  ? `Поздравить в воскресенье ${formatShortDate(
                      birthdayWeek.nextSunday
                    )}`
                  : `Am Sonntag, ${formatShortDate(
                      birthdayWeek.nextSunday
                    )}, gratulieren`}
              </p>
            </div>

            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/10 px-2 text-[10px] font-semibold text-white/70">
              {pendingBirthdays.length}
            </span>
          </div>

          {birthdayLoading ? (
            <div className="border-t border-white/10 px-5 py-4 text-xs text-white/40">
              {isRu
                ? "Загрузка..."
                : "Wird geladen..."}
            </div>
          ) : pendingBirthdays.length ===
            0 ? (
            <div className="border-t border-white/10 px-5 py-4">
              <div className="flex items-center gap-2 text-xs text-white/45">
                <Check
                  size={14}
                  strokeWidth={2}
                />

                {isRu
                  ? "На эту неделю всё отмечено."
                  : "Für diesen Sonntag ist alles erledigt."}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/10 border-t border-white/10">
              {pendingBirthdays.map(
                ({
                  teen,
                  birthday,
                }) => (
                  <div
                    key={teen.id}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/70">
                      {teen.first_name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {teen.first_name}{" "}
                        {teen.last_name}
                      </p>

                      <p className="mt-0.5 text-[11px] text-white/40">
                        {formatShortDate(
                          birthday
                        )}{" "}
                        ·{" "}
                        {calculateAge(
                          teen.birth_date
                        ) + 1}{" "}
                        {isRu
                          ? "лет"
                          : "Jahre"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        markBirthdayCelebrated(
                          teen
                        )
                      }
                      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-bold text-neutral-900 transition active:scale-95"
                    >
                      <Check
                        size={13}
                        strokeWidth={2.3}
                      />

                      {isRu
                        ? "Поздравили"
                        : "Gratuliert"}
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* TABS */}

        <div className="mb-4 flex rounded-xl bg-neutral-200/70 p-1">
          <button
            type="button"
            onClick={() =>
              setTab("teens")
            }
            className={`flex h-10 flex-1 items-center justify-center rounded-lg text-xs font-bold transition ${
              tab === "teens"
                ? "bg-white text-neutral-950 shadow-sm"
                : "text-neutral-500"
            }`}
          >
            {isRu
              ? "Подростки"
              : "Teenager"}

            <span className="ml-1.5 text-neutral-400">
              {mainAgeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setTab("graduates")
            }
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${
              tab === "graduates"
                ? "bg-white text-neutral-950 shadow-sm"
                : "text-neutral-500"
            }`}
          >
            <GraduationCap
              size={14}
              strokeWidth={1.9}
            />

            {isRu
              ? "Выпускники"
              : "Absolventen"}
          </button>
        </div>

        {/* TEENS */}

        {tab === "teens" && (
          <>
            {/* COMPACT STATS */}

            <section className="mb-4 overflow-hidden rounded-[20px] bg-white">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    {isRu
                      ? "Подростки 12–15"
                      : "Teenager 12–15"}
                  </p>

                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    {isRu
                      ? `${activeMainAgeCount} активных`
                      : `${activeMainAgeCount} aktiv`}
                  </p>
                </div>

                <span className="text-xl font-bold tracking-tight text-neutral-950">
                  {mainAgeCount}
                </span>
              </div>

              <div className="border-t border-neutral-100 px-4 py-2.5">
                <div className="grid grid-cols-4">
                  {[12, 13, 14, 15].map(
                    (age) => (
                      <div
                        key={age}
                        className="flex flex-col items-center"
                      >
                        <span className="text-[10px] font-semibold text-neutral-400">
                          {age}
                        </span>

                        <span className="mt-0.5 text-sm font-bold text-neutral-800">
                          {
                            ageCounts[
                              age as 12 | 13 | 14 | 15
                            ]
                          }
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 border-t border-neutral-100 px-4 py-2.5">
                <span className="text-[11px] font-semibold text-blue-600">
                  ♂ {boysCount}
                </span>

                <span className="text-[11px] font-semibold text-pink-600">
                  ♀ {girlsCount}
                </span>

                <span className="ml-auto text-[10px] text-neutral-400">
                  {isRu
                    ? `${activeCount} всего активных`
                    : `${activeCount} insgesamt aktiv`}
                </span>
              </div>
            </section>

            {/* SEARCH */}

            <div className="relative mb-3">
              <Search
                size={16}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder={
                  isRu
                    ? "Поиск подростка..."
                    : "Teenager suchen..."
                }
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-neutral-400 focus:ring-4 focus:ring-neutral-950/5"
              />
            </div>

            {/* AGE FILTER */}

            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  "all",
                  12,
                  13,
                  14,
                  15,
                ] as AgeFilter[]
              ).map((age) => (
                <button
                  key={String(age)}
                  type="button"
                  onClick={() =>
                    setAgeFilter(
                      age
                    )
                  }
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                    ageFilter === age
                      ? "bg-neutral-950 text-white"
                      : "bg-white text-neutral-500"
                  }`}
                >
                  {age === "all"
                    ? isRu
                      ? "Все"
                      : "Alle"
                    : `${age}`}
                </button>
              ))}
            </div>

            {/* FILTER BUTTON */}

            <div className="mb-4">
              <button
                type="button"
                onClick={() =>
                  setFiltersOpen(
                    (value) => !value
                  )
                }
                className={`flex h-11 w-full items-center justify-between rounded-2xl border px-4 text-xs font-bold transition ${
                  filtersOpen ||
                  activeFilterCount > 0
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-200 bg-white text-neutral-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal
                    size={15}
                    strokeWidth={2}
                  />

                  {isRu
                    ? "Фильтры"
                    : "Filter"}
                </span>

                <span className="flex items-center gap-2">
                  {activeFilterCount >
                    0 && (
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[9px] font-bold ${
                        filtersOpen
                          ? "bg-white text-neutral-950"
                          : "bg-neutral-950 text-white"
                      }`}
                    >
                      {activeFilterCount}
                    </span>
                  )}

                  <ChevronDown
                    size={15}
                    className={`transition-transform ${
                      filtersOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </span>
              </button>

              {filtersOpen && (
                <div className="mt-2 rounded-[20px] border border-neutral-200 bg-white p-3">
                  <div className="space-y-4">

                    {/* STATUS */}

                    <div>
                      <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                        {isRu
                          ? "Статус"
                          : "Status"}
                      </p>

                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          [
                            "active",
                            isRu
                              ? "Активные"
                              : "Aktive",
                          ],
                          [
                            "all",
                            isRu
                              ? "Все"
                              : "Alle",
                          ],
                          [
                            "inactive",
                            isRu
                              ? "Неактивные"
                              : "Inaktive",
                          ],
                        ].map(
                          ([
                            value,
                            label,
                          ]) => (
                            <button
                              key={
                                value
                              }
                              type="button"
                              onClick={() =>
                                setStatusFilter(
                                  value as StatusFilter
                                )
                              }
                              className={`h-9 rounded-xl text-[10px] font-semibold transition ${
                                statusFilter ===
                                value
                                  ? "bg-neutral-950 text-white"
                                  : "bg-neutral-100 text-neutral-500"
                              }`}
                            >
                              {label}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* GENDER */}

                    <div>
                      <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                        {isRu
                          ? "Пол"
                          : "Geschlecht"}
                      </p>

                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          [
                            "all",
                            isRu
                              ? "Все"
                              : "Alle",
                          ],
                          [
                            "male",
                            isRu
                              ? "Мальчики"
                              : "Jungen",
                          ],
                          [
                            "female",
                            isRu
                              ? "Девочки"
                              : "Mädchen",
                          ],
                        ].map(
                          ([
                            value,
                            label,
                          ]) => (
                            <button
                              key={
                                value
                              }
                              type="button"
                              onClick={() =>
                                setGenderFilter(
                                  value as GenderFilter
                                )
                              }
                              className={`h-9 rounded-xl text-[10px] font-semibold transition ${
                                genderFilter ===
                                value
                                  ? "bg-neutral-950 text-white"
                                  : "bg-neutral-100 text-neutral-500"
                              }`}
                            >
                              {label}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* LANGUAGE */}

                    <div>
                      <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                        {isRu
                          ? "Язык"
                          : "Sprache"}
                      </p>

                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          [
                            "all",
                            isRu
                              ? "Все"
                              : "Alle",
                          ],
                          [
                            "de",
                            "Deutsch",
                          ],
                          [
                            "ru",
                            "Русский",
                          ],
                        ].map(
                          ([
                            value,
                            label,
                          ]) => (
                            <button
                              key={
                                value
                              }
                              type="button"
                              onClick={() =>
                                setLanguageFilter(
                                  value as LanguageFilter
                                )
                              }
                              className={`h-9 rounded-xl text-[10px] font-semibold transition ${
                                languageFilter ===
                                value
                                  ? "bg-neutral-950 text-white"
                                  : "bg-neutral-100 text-neutral-500"
                              }`}
                            >
                              {label}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* RESET */}

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          resetFilters();
                          setFiltersOpen(
                            false
                          );
                        }}
                        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl text-[11px] font-semibold text-neutral-400 transition active:bg-neutral-50"
                      >
                        <RotateCcw
                          size={12}
                        />

                        {isRu
                          ? "Сбросить фильтры"
                          : "Filter zurücksetzen"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* LIST */}

            <section className="overflow-hidden rounded-[22px] bg-white">
              {loading ? (
                <div className="flex min-h-[220px] items-center justify-center text-xs text-neutral-400">
                  {isRu
                    ? "Загрузка..."
                    : "Wird geladen..."}
                </div>
              ) : mainTeenList.length ===
                0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                    <UserRound
                      size={20}
                    />
                  </div>

                  <p className="mt-4 text-sm font-semibold">
                    {isRu
                      ? "Никого не найдено"
                      : "Keine Teenager gefunden"}
                  </p>

                  <p className="mt-1 text-xs text-neutral-400">
                    {isRu
                      ? "Измени фильтры или поиск."
                      : "Filter oder Suche ändern."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {mainTeenList.map(
                    (teen) => {
                      const age =
                        calculateAge(
                          teen.birth_date
                        );

                      const graduationYear =
                        getGraduationYear(
                          teen.birth_date
                        );

                      return (
                        <button
                          key={teen.id}
                          type="button"
                          onClick={() =>
                            setSelectedTeen(
                              teen
                            )
                          }
                          className="flex w-full items-center gap-3 p-4 text-left transition active:bg-neutral-50"
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              teen.gender ===
                              "female"
                                ? "bg-pink-50 text-pink-500"
                                : teen.gender ===
                                  "male"
                                ? "bg-blue-50 text-blue-500"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {teen.first_name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-bold text-neutral-950">
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

                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                                {age}{" "}
                                {isRu
                                  ? "лет"
                                  : "Jahre"}
                              </span>

                              {teen.gender && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    teen.gender ===
                                    "male"
                                      ? "bg-blue-50 text-blue-600"
                                      : "bg-pink-50 text-pink-600"
                                  }`}
                                >
                                  {getGenderLabel(
                                    teen.gender
                                  )}
                                </span>
                              )}

                              {(
                                teen.languages ??
                                []
                              ).map(
                                (
                                  item
                                ) => (
                                  <span
                                    key={
                                      item
                                    }
                                    className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500"
                                  >
                                    {item ===
                                    "de"
                                      ? "DE"
                                      : "RU"}
                                  </span>
                                )
                              )}
                            </div>

                            {graduationYear ===
                              currentYear && (
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-neutral-400">
                                <GraduationCap
                                  size={
                                    11
                                  }
                                />

                                {isRu
                                  ? `Выпускник ${graduationYear}`
                                  : `Absolvent ${graduationYear}`}
                              </div>
                            )}
                          </div>

                          <Pencil
                            size={15}
                            className="shrink-0 text-neutral-300"
                          />
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* GRADUATES */}

        {tab === "graduates" && (
          <>
            <section className="mb-5 rounded-[22px] bg-neutral-950 p-5 text-white">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <GraduationCap
                    size={19}
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <h2 className="text-base font-bold">
                    {isRu
                      ? "Будущие выпускники"
                      : "Zukünftige Absolventen"}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-white/45">
                    {isRu
                      ? "Здесь автоматически отображаются подростки, которым исполнится 16 лет."
                      : "Hier erscheinen automatisch Teenager, die 16 Jahre alt werden."}
                  </p>
                </div>
              </div>
            </section>

            <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() =>
                  setGraduateYearFilter(
                    "all"
                  )
                }
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                  graduateYearFilter ===
                  "all"
                    ? "bg-neutral-950 text-white"
                    : "bg-white text-neutral-500"
                }`}
              >
                {isRu
                  ? "Все"
                  : "Alle"}
              </button>

              {graduateYears.map(
                (year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() =>
                      setGraduateYearFilter(
                        year
                      )
                    }
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                      graduateYearFilter ===
                      year
                        ? "bg-neutral-950 text-white"
                        : "bg-white text-neutral-500"
                    }`}
                  >
                    {year}
                  </button>
                )
              )}
            </div>

            <div className="relative mb-3">
              <Search
                size={16}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder={
                  isRu
                    ? "Поиск выпускника..."
                    : "Absolvent suchen..."
                }
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-neutral-400 focus:ring-4 focus:ring-neutral-950/5"
              />
            </div>

            <section className="overflow-hidden rounded-[22px] bg-white">
              {graduates.length ===
              0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                    <GraduationCap
                      size={21}
                    />
                  </div>

                  <p className="mt-4 text-sm font-semibold">
                    {isRu
                      ? "Выпускников пока нет"
                      : "Keine Absolventen"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {graduates.map(
                    (teen) => {
                      const year =
                        getGraduationYear(
                          teen.birth_date
                        );

                      const age =
                        calculateAge(
                          teen.birth_date
                        );

                      return (
                        <button
                          key={teen.id}
                          type="button"
                          onClick={() =>
                            setSelectedTeen(
                              teen
                            )
                          }
                          className="flex w-full items-center gap-3 p-4 text-left transition active:bg-neutral-50"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                            {teen.first_name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">
                              {
                                teen.first_name
                              }{" "}
                              {
                                teen.last_name
                              }
                            </p>

                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                                {age}{" "}
                                {isRu
                                  ? "лет"
                                  : "Jahre"}
                              </span>

                              <span className="rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-bold text-white">
                                {isRu
                                  ? `Выпускник ${year}`
                                  : `Absolvent ${year}`}
                              </span>
                            </div>
                          </div>

                          <ChevronDown
                            size={15}
                            className="-rotate-90 shrink-0 text-neutral-300"
                          />
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* DETAIL SHEET */}

      {selectedTeen && (
        <div
          className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm"
          onClick={() =>
            setSelectedTeen(null)
          }
        >
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto max-h-[88vh] w-full max-w-[760px] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 shadow-2xl sm:bottom-4 sm:rounded-[28px]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-neutral-200" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-lg font-bold text-neutral-500">
                  {selectedTeen.first_name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h2 className="text-lg font-bold tracking-tight">
                    {
                      selectedTeen.first_name
                    }{" "}
                    {
                      selectedTeen.last_name
                    }
                  </h2>

                  <p className="mt-1 text-xs text-neutral-400">
                    {calculateAge(
                      selectedTeen.birth_date
                    )}{" "}
                    {isRu
                      ? "лет"
                      : "Jahre"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTeen(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  {isRu
                    ? "Рождение"
                    : "Geburt"}
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {formatDate(
                    selectedTeen.birth_date
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  {isRu
                    ? "Выпуск"
                    : "Abschluss"}
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {getGraduationYear(
                    selectedTeen.birth_date
                  )}
                </p>
              </div>
            </div>

            <div className="mt-2 rounded-2xl bg-neutral-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {isRu
                  ? "Язык"
                  : "Sprache"}
              </p>

              <p className="mt-1 text-sm font-semibold">
                {getLanguagesLabel(
                  selectedTeen.languages ??
                    []
                )}
              </p>
            </div>

            <div className="mt-2 rounded-2xl bg-neutral-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {isRu
                  ? "Телефон"
                  : "Telefon"}
              </p>

              <p className="mt-1 text-sm font-semibold">
                {selectedTeen.phone ||
                  "—"}
              </p>
            </div>

            <div className="mt-2 flex items-center justify-between rounded-2xl bg-neutral-50 p-4">
              <span className="text-sm font-semibold">
                {isRu
                  ? "Статус"
                  : "Status"}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  selectedTeen.is_active
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-neutral-200 text-neutral-500"
                }`}
              >
                {selectedTeen.is_active
                  ? isRu
                    ? "Активен"
                    : "Aktiv"
                  : isRu
                    ? "Неактивен"
                    : "Inaktiv"}
              </span>
            </div>

            {getGraduationYear(
              selectedTeen.birth_date
            ) >= currentYear && (
              <div className="mt-2 flex items-center gap-3 rounded-2xl bg-neutral-950 p-4 text-white">
                <GraduationCap
                  size={19}
                  strokeWidth={1.8}
                />

                <div>
                  <p className="text-sm font-bold">
                    {isRu
                      ? `Выпускник ${getGraduationYear(
                          selectedTeen.birth_date
                        )}`
                      : `Absolvent ${getGraduationYear(
                          selectedTeen.birth_date
                        )}`}
                  </p>

                  <p className="mt-0.5 text-[11px] text-white/40">
                    {isRu
                      ? "Автоматически рассчитано по дате рождения"
                      : "Automatisch aus dem Geburtsdatum berechnet"}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                openEditModal(
                  selectedTeen
                )
              }
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 text-sm font-bold text-white transition active:scale-[0.99]"
            >
              <Pencil size={15} />

              {isRu
                ? "Редактировать"
                : "Bearbeiten"}
            </button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 px-0 backdrop-blur-sm sm:items-center sm:px-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 shadow-2xl sm:max-h-[90vh] sm:rounded-[28px] sm:p-6"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-neutral-200 sm:hidden" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                  Teenager
                </p>

                <h2 className="mt-1 text-xl font-bold tracking-tight">
                  {editingTeen
                    ? isRu
                      ? "Редактировать"
                      : "Bearbeiten"
                    : isRu
                      ? "Новый подросток"
                      : "Neuer Teenager"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={
                  saving ||
                  deleting
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-neutral-700">
                    {isRu
                      ? "Имя"
                      : "Vorname"}
                  </label>

                  <input
                    value={firstName}
                    onChange={(event) =>
                      setFirstName(
                        event.target.value
                      )
                    }
                    placeholder="Max"
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-neutral-700">
                    {isRu
                      ? "Фамилия"
                      : "Nachname"}
                  </label>

                  <input
                    value={lastName}
                    onChange={(event) =>
                      setLastName(
                        event.target.value
                      )
                    }
                    placeholder="Mustermann"
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-neutral-700">
                  {isRu
                    ? "Дата рождения"
                    : "Geburtsdatum"}
                </label>

                <input
                  type="date"
                  value={birthDate}
                  onChange={(event) =>
                    setBirthDate(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                />

                {birthDate && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-500">
                      {isRu
                        ? `Сейчас ${calculateAge(
                            birthDate
                          )} лет`
                        : `Jetzt ${calculateAge(
                            birthDate
                          )} Jahre`}
                    </span>

                    <span className="rounded-full bg-neutral-950 px-2.5 py-1 text-[10px] font-bold text-white">
                      {isRu
                        ? `Выпуск ${getGraduationYear(
                            birthDate
                          )}`
                        : `Abschluss ${getGraduationYear(
                            birthDate
                          )}`}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-neutral-700">
                  {isRu
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
                    className={`h-11 rounded-xl border text-sm font-semibold ${
                      gender ===
                      "male"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    {isRu
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
                    className={`h-11 rounded-xl border text-sm font-semibold ${
                      gender ===
                      "female"
                        ? "border-pink-200 bg-pink-50 text-pink-700"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    {isRu
                      ? "Девочка"
                      : "Mädchen"}
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-700">
                    {isRu
                      ? "Языки"
                      : "Sprachen"}
                  </label>

                  <span className="text-[10px] text-neutral-400">
                    {isRu
                      ? "Можно оба"
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
                    className={`h-11 rounded-xl border text-sm font-semibold ${
                      selectedLanguages.includes(
                        "de"
                      )
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    🇩🇪 Deutsch
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleLanguage(
                        "ru"
                      )
                    }
                    className={`h-11 rounded-xl border text-sm font-semibold ${
                      selectedLanguages.includes(
                        "ru"
                      )
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    🇷🇺 Русский
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-neutral-700">
                  {isRu
                    ? "Телефон"
                    : "Telefon"}
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  placeholder="+49 ..."
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-neutral-50 p-4">
                <div>
                  <p className="text-sm font-bold">
                    {isRu
                      ? "Активный"
                      : "Aktiv"}
                  </p>

                  <p className="mt-0.5 text-[10px] text-neutral-400">
                    {isRu
                      ? "Неактивные скрываются по умолчанию."
                      : "Inaktive werden standardmäßig ausgeblendet."}
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
                  className={`relative h-7 w-12 rounded-full ${
                    isActive
                      ? "bg-neutral-950"
                      : "bg-neutral-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                      isActive
                        ? "left-6"
                        : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-col gap-2 pt-2">
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
                  className="h-12 rounded-2xl bg-neutral-950 text-sm font-bold text-white disabled:bg-neutral-300"
                >
                  {saving
                    ? isRu
                      ? "Сохранение..."
                      : "Wird gespeichert..."
                    : editingTeen
                      ? isRu
                        ? "Сохранить"
                        : "Speichern"
                      : isRu
                        ? "Добавить"
                        : "Hinzufügen"}
                </button>

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
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-red-500"
                  >
                    <Trash2
                      size={15}
                    />

                    {isRu
                      ? "Удалить подростка"
                      : "Teenager löschen"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}

      {isDeleteConfirmOpen &&
        editingTeen && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
            onClick={() => {
              if (!deleting) {
                setIsDeleteConfirmOpen(
                  false
                );
              }
            }}
          >
            <div
              className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Trash2
                  size={19}
                />
              </div>

              <h3 className="mt-4 text-lg font-bold">
                {isRu
                  ? "Удалить подростка?"
                  : "Teenager löschen?"}
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {isRu
                  ? `Удалить ${editingTeen.first_name} ${editingTeen.last_name}? Это действие нельзя отменить.`
                  : `${editingTeen.first_name} ${editingTeen.last_name} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setIsDeleteConfirmOpen(
                      false
                    )
                  }
                  disabled={deleting}
                  className="h-11 flex-1 rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-600"
                >
                  {isRu
                    ? "Отмена"
                    : "Abbrechen"}
                </button>

                <button
                  type="button"
                  onClick={
                    deleteTeen
                  }
                  disabled={deleting}
                  className="h-11 flex-1 rounded-xl bg-red-500 text-sm font-bold text-white"
                >
                  {deleting
                    ? "..."
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