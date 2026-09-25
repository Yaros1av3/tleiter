"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Filter,
  ImagePlus,
  ListTodo,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  avatar_url: string | null;
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

type WorkItem = {
  id: number;
  title: string;
  status: "open" | "in_progress" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  deadline: string | null;
  assigned_to: number | null;
  project_id: number | null;
};

type WorkProject = {
  id: number;
  title: string;
};

type ScheduleEntry = {
  id: number;
  schedule_date: string;
  service_time: string;
  entry_type: string;
  title_de: string | null;
  title_ru: string | null;
  bible_text: string | null;
  series: string | null;
};

type ScheduleMember = {
  id: number;
  schedule_entry_id: number;
  team_member_id: number;
};

type UpcomingService = {
  entry: ScheduleEntry;
  assignment: ScheduleMember;
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

  const birth = new Date(`${date}T00:00:00`);

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

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

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString(
    language === "de" ? "de-DE" : "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

function formatShortDate(date: string | null, language: Language) {
  if (!date) return "—";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString(
    language === "de" ? "de-DE" : "ru-RU",
    {
      day: "2-digit",
      month: "short",
    },
  );
}

function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentTimeString() {
  const now = new Date();

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
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
      return "bg-neutral-900 text-white";

    case "sekretariat":
      return "bg-purple-50 text-purple-700";

    case "leiter":
      return "bg-blue-50 text-blue-700";

    case "co_leiter":
      return "bg-emerald-50 text-emerald-700";

    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

function getInitials(member: TeamMember) {
  const first = member.first_name?.charAt(0) ?? "";
  const last = member.last_name?.charAt(0) ?? "";

  return `${first}${last}`.toUpperCase();
}

function getAvatarTone(member: TeamMember) {
  const tones = [
    "bg-neutral-900 text-white",
    "bg-neutral-200 text-neutral-700",
    "bg-slate-200 text-slate-700",
    "bg-stone-200 text-stone-700",
    "bg-zinc-200 text-zinc-700",
  ];

  return tones[member.id % tones.length];
}

function getTaskStatusLabel(
  status: WorkItem["status"],
  language: Language,
) {
  if (status === "completed") {
    return language === "de" ? "Erledigt" : "Выполнено";
  }

  if (status === "in_progress") {
    return language === "de" ? "In Arbeit" : "В работе";
  }

  return language === "de" ? "Offen" : "Открыта";
}

function getPriorityLabel(
  priority: WorkItem["priority"],
  language: Language,
) {
  const labels = {
    low: {
      de: "Niedrig",
      ru: "Низкий",
    },
    normal: {
      de: "Normal",
      ru: "Обычный",
    },
    high: {
      de: "Hoch",
      ru: "Высокий",
    },
    urgent: {
      de: "Dringend",
      ru: "Срочно",
    },
  };

  return labels[priority][language];
}

function getServiceTitle(
  entry: ScheduleEntry,
  language: Language,
) {
  return (
    (language === "de"
      ? entry.title_de
      : entry.title_ru) ??
    entry.title_de ??
    entry.title_ru ??
    (language === "de" ? "Dienst" : "Служение")
  );
}

function getEntryTypeLabel(
  type: string,
  language: Language,
) {
  const normalized = type.toLowerCase();

  if (normalized === "lesson") {
    return language === "de" ? "Lektion" : "Урок";
  }

  if (normalized === "event") {
    return language === "de" ? "Event" : "Событие";
  }

  return type;
}

export default function TeamPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>("de");
  const t = translations[language];

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<
    ScheduleEntry[]
  >([]);
  const [scheduleMembers, setScheduleMembers] = useState<
    ScheduleMember[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [positionFilter, setPositionFilter] = useState<
    Position | "all"
  >("all");

  const [languageFilter, setLanguageFilter] = useState<
    "all" | "DE" | "RU"
  >("all");

  const [statusFilter, setStatusFilter] = useState<
    Status | "all"
  >("all");

  const [showFilters, setShowFilters] = useState(false);

  const [selectedMember, setSelectedMember] =
    useState<TeamMember | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] =
    useState<TeamMember | null>(null);

  const [form, setForm] = useState<MemberForm>(emptyForm);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    null,
  );

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] =
    useState(false);

  const [deleteMember, setDeleteMember] =
    useState<TeamMember | null>(null);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.body.style.overflow =
      showModal || deleteMember || selectedMember
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal, deleteMember, selectedMember]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function loadData() {
    setLoading(true);

    const [
      membersResponse,
      workItemsResponse,
      projectsResponse,
      scheduleEntriesResponse,
      scheduleMembersResponse,
    ] = await Promise.all([
      supabase
        .from("team_members")
        .select("*")
        .order("first_name", { ascending: true }),

      supabase
        .from("work_items")
        .select(
          "id,title,status,priority,deadline,assigned_to,project_id",
        ),

      supabase
        .from("work_projects")
        .select("id,title"),

      supabase
        .from("schedule_entries")
        .select(
          "id,schedule_date,service_time,entry_type,title_de,title_ru,bible_text,series",
        )
        .order("schedule_date", {
          ascending: true,
        }),

      supabase
        .from("schedule_entry_members")
        .select(
          "id,schedule_entry_id,team_member_id",
        ),
    ]);

    if (membersResponse.error) {
      console.error(
        "Error loading team members:",
        membersResponse.error,
      );
      setMembers([]);
    } else {
      const sorted = [
        ...(membersResponse.data ?? []),
      ].sort((a, b) => {
        const positionDifference =
          positionOrder[a.position as Position] -
          positionOrder[b.position as Position];

        if (positionDifference !== 0) {
          return positionDifference;
        }

        return a.first_name.localeCompare(
          b.first_name,
        );
      });

      setMembers(sorted as TeamMember[]);
    }

    if (workItemsResponse.error) {
      console.error(
        "Error loading work items:",
        workItemsResponse.error,
      );
      setWorkItems([]);
    } else {
      setWorkItems(
        (workItemsResponse.data ??
          []) as WorkItem[],
      );
    }

    if (projectsResponse.error) {
      console.error(
        "Error loading work projects:",
        projectsResponse.error,
      );
      setProjects([]);
    } else {
      setProjects(
        (projectsResponse.data ??
          []) as WorkProject[],
      );
    }

    if (scheduleEntriesResponse.error) {
      console.error(
        "Error loading schedule entries:",
        scheduleEntriesResponse.error,
      );
      setScheduleEntries([]);
    } else {
      setScheduleEntries(
        (scheduleEntriesResponse.data ??
          []) as ScheduleEntry[],
      );
    }

    if (scheduleMembersResponse.error) {
      console.error(
        "Error loading schedule assignments:",
        scheduleMembersResponse.error,
      );
      setScheduleMembers([]);
    } else {
      setScheduleMembers(
        (scheduleMembersResponse.data ??
          []) as ScheduleMember[],
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      const fullName =
        `${member.first_name} ${member.last_name}`.toLowerCase();

      const phone = (
        member.phone ?? ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        phone.includes(query);

      const matchesPosition =
        positionFilter === "all" ||
        member.position === positionFilter;

      const matchesLanguage =
        languageFilter === "all" ||
        member.languages.includes(languageFilter);

      const matchesStatus =
        statusFilter === "all" ||
        member.status === statusFilter;

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

  function getMemberTasks(memberId: number) {
    return workItems.filter(
      (item) =>
        item.assigned_to === memberId &&
        item.status !== "completed",
    );
  }

  function getCompletedMemberTasks(memberId: number) {
    return workItems.filter(
      (item) =>
        item.assigned_to === memberId &&
        item.status === "completed",
    );
  }

  function getNextTask(memberId: number) {
    const tasks = getMemberTasks(memberId)
      .filter((item) => item.deadline)
      .sort((a, b) => {
        return (
          new Date(
            `${a.deadline}T00:00:00`,
          ).getTime() -
          new Date(
            `${b.deadline}T00:00:00`,
          ).getTime()
        );
      });

    return tasks[0] ?? null;
  }

  function getProjectTitle(projectId: number | null) {
    if (!projectId) return null;

    return (
      projects.find(
        (project) => project.id === projectId,
      )?.title ?? null
    );
  }

  function getMemberServices(memberId: number) {
    const today = getTodayString();
    const currentTime = getCurrentTimeString();

    const assignedEntryIds = scheduleMembers
      .filter(
        (item) =>
          item.team_member_id === memberId,
      )
      .map((item) => item.schedule_entry_id);

    return scheduleEntries
      .filter((entry) => {
        if (!assignedEntryIds.includes(entry.id)) {
          return false;
        }

        if (entry.schedule_date > today) {
          return true;
        }

        if (entry.schedule_date < today) {
          return false;
        }

        return entry.service_time >= currentTime;
      })
      .sort((a, b) => {
        const dateDifference =
          a.schedule_date.localeCompare(
            b.schedule_date,
          );

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return a.service_time.localeCompare(
          b.service_time,
        );
      });
  }

  function getNextService(memberId: number) {
    return getMemberServices(memberId)[0] ?? null;
  }

  function getServiceAssignment(
    memberId: number,
    entryId: number,
  ) {
    return (
      scheduleMembers.find(
        (item) =>
          item.team_member_id === memberId &&
          item.schedule_entry_id === entryId,
      ) ?? null
    );
  }

  function openCreateModal() {
    setSelectedMember(null);
    setEditingMember(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowModal(true);
  }

  function openEditModal(member: TeamMember) {
    setSelectedMember(null);
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

    setSelectedFile(null);
    setPreviewUrl(member.avatar_url);
    setShowModal(true);
  }

  function closeModal() {
    if (saving || uploadingAvatar) return;

    setShowModal(false);
    setEditingMember(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setPreviewUrl(null);
  }

  function toggleLanguage(value: string) {
    setForm((current) => {
      const exists =
        current.languages.includes(value);

      return {
        ...current,
        languages: exists
          ? current.languages.filter(
              (item) => item !== value,
            )
          : [...current.languages, value],
      };
    });
  }

  function handleAvatarChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadAvatar(
    memberId: number,
  ) {
    if (!selectedFile) {
      return editingMember?.avatar_url ?? null;
    }

    setUploadingAvatar(true);

    try {
      const extension =
        selectedFile.name.split(".").pop()?.toLowerCase() ??
        "jpg";

      const filePath = `${memberId}-${Date.now()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("team-avatars")
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: selectedFile.type,
          });

      if (uploadError) {
        console.error(
          "Avatar upload error:",
          uploadError,
        );
        return editingMember?.avatar_url ?? null;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("team-avatars")
        .getPublicUrl(filePath);

      const avatarUrl =
        publicUrlData.publicUrl;

      if (editingMember?.avatar_url) {
        const oldPath =
          editingMember.avatar_url.split(
            "/team-avatars/",
          )[1];

        if (oldPath) {
          await supabase.storage
            .from("team-avatars")
            .remove([oldPath]);
        }
      }

      return avatarUrl;
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveMember() {
    if (
      !form.first_name.trim() ||
      !form.last_name.trim()
    ) {
      return;
    }

    setSaving(true);

    const basePayload = {
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

    try {
      if (editingMember) {
        let avatarUrl =
          editingMember.avatar_url;

        if (selectedFile) {
          avatarUrl = await uploadAvatar(
            editingMember.id,
          );
        }

        const { error } = await supabase
          .from("team_members")
          .update({
            ...basePayload,
            avatar_url: avatarUrl,
          })
          .eq("id", editingMember.id);

        if (error) {
          console.error(
            "Error updating team member:",
            error,
          );
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("team_members")
          .insert(basePayload)
          .select()
          .single();

        if (error) {
          console.error(
            "Error creating team member:",
            error,
          );
          return;
        }

        if (data?.id && selectedFile) {
          const avatarUrl =
            await uploadAvatar(data.id);

          await supabase
            .from("team_members")
            .update({
              avatar_url: avatarUrl,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", data.id);
        }
      }

      closeModal();
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function deleteAvatar(
    member: TeamMember,
  ) {
    if (!member.avatar_url) return;

    const marker = "/team-avatars/";
    const index =
      member.avatar_url.indexOf(marker);

    if (index === -1) return;

    const path = decodeURIComponent(
      member.avatar_url.slice(
        index + marker.length,
      ),
    );

    if (!path) return;

    await supabase.storage
      .from("team-avatars")
      .remove([path]);
  }

  async function confirmDelete() {
    if (!deleteMember) return;

    setDeleting(true);

    try {
      await deleteAvatar(deleteMember);

      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", deleteMember.id);

      if (error) {
        console.error(
          "Error deleting team member:",
          error,
        );
        return;
      }

      setDeleteMember(null);
      setSelectedMember(null);

      await loadData();
    } finally {
      setDeleting(false);
    }
  }

  function resetFilters() {
    setPositionFilter("all");
    setLanguageFilter("all");
    setStatusFilter("all");
  }

  function clearEverything() {
    setSearch("");
    resetFilters();
  }

  function openMember(member: TeamMember) {
    setSelectedMember(member);
  }

  const selectedTasks = selectedMember
    ? getMemberTasks(selectedMember.id)
    : [];

  const selectedCompletedTasks =
    selectedMember
      ? getCompletedMemberTasks(
          selectedMember.id,
        )
      : [];

  const selectedNextTask = selectedMember
    ? getNextTask(selectedMember.id)
    : null;

  const selectedNextService =
    selectedMember
      ? getNextService(selectedMember.id)
      : null;

  const selectedServiceAssignment =
    selectedMember && selectedNextService
      ? getServiceAssignment(
          selectedMember.id,
          selectedNextService.id,
        )
      : null;

  void selectedServiceAssignment;
  void t;

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-neutral-900">
      <main className="mx-auto min-h-screen w-full max-w-[760px] px-4 pb-32 sm:px-6">
        {/* Top bar */}
        {/* Top bar */}
{/* Top bar */}
<header className="sticky top-0 z-30 -mx-4 border-b border-neutral-200/80 bg-[#f5f5f4]/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
    <Users size={13} strokeWidth={1.8} />
    <span>{language === "de" ? "Team" : "Команда"}</span>
  </div>

  <div className="flex items-center justify-between gap-3">
    <h1 className="text-[28px] font-bold tracking-tight text-neutral-950">
      {language === "de" ? "Unser Team" : "Наша команда"}
    </h1>

    <button
      type="button"
      onClick={openCreateModal}
      aria-label={
        language === "de"
          ? "Teammitglied hinzufügen"
          : "Добавить участника"
      }
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm transition active:scale-95"
    >
      <Plus size={18} strokeWidth={2.2} />
    </button>
  </div>
</header>

{/* Subtitle */}
<section className="pt-2">
  <p className="text-sm leading-5 text-neutral-500">
    {language === "de"
      ? "Menschen, Aufgaben und Dienste an einem Ort."
      : "Люди, задачи и служения в одном месте."}
  </p>
</section>

        {/* Stats */}
        <section className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
              {language === "de"
                ? "Gesamt"
                : "Всего"}
            </div>

            <div className="mt-1 text-2xl font-bold tracking-tight">
              {members.length}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

              {language === "de"
                ? "Aktiv"
                : "Активны"}
            </div>

            <div className="mt-1 text-2xl font-bold tracking-tight">
              {activeCount}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />

              {language === "de"
                ? "Inaktiv"
                : "Неактивны"}
            </div>

            <div className="mt-1 text-2xl font-bold tracking-tight">
              {inactiveCount}
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="mt-4">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder={
                  language === "de"
                    ? "Team durchsuchen..."
                    : "Поиск по команде..."
                }
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-11 pr-10 text-sm font-medium outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  (value) => !value,
                )
              }
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition ${
                showFilters ||
                activeFiltersCount > 0
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600"
              }`}
              aria-label={
                language === "de"
                  ? "Filter"
                  : "Фильтры"
              }
            >
              <Filter size={17} />

              {activeFiltersCount > 0 && (
                <span
                  className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
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
            <div className="mt-2 rounded-2xl border border-neutral-200 bg-white p-3">
              <div className="grid grid-cols-1 gap-2">
                <select
                  value={positionFilter}
                  onChange={(event) =>
                    setPositionFilter(
                      event.target.value as
                        | Position
                        | "all",
                    )
                  }
                  className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none"
                >
                  <option value="all">
                    {language === "de"
                      ? "Alle Positionen"
                      : "Все должности"}
                  </option>

                  <option value="hauptleiter">
                    {getPositionLabel(
                      "hauptleiter",
                      language,
                    )}
                  </option>

                  <option value="leiter">
                    {getPositionLabel(
                      "leiter",
                      language,
                    )}
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

                <select
                  value={languageFilter}
                  onChange={(event) =>
                    setLanguageFilter(
                      event.target.value as
                        | "all"
                        | "DE"
                        | "RU",
                    )
                  }
                  className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none"
                >
                  <option value="all">
                    {language === "de"
                      ? "Alle Sprachen"
                      : "Все языки"}
                  </option>

                  <option value="DE">
                    Deutsch
                  </option>

                  <option value="RU">
                    Русский
                  </option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | Status
                        | "all",
                    )
                  }
                  className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none"
                >
                  <option value="all">
                    {language === "de"
                      ? "Alle Status"
                      : "Все статусы"}
                  </option>

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

                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="h-11 rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-600"
                  >
                    {language === "de"
                      ? "Filter zurücksetzen"
                      : "Сбросить фильтры"}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-neutral-400">
            <span>
              {loading
                ? language === "de"
                  ? "Wird geladen..."
                  : "Загрузка..."
                : language === "de"
                  ? `${filteredMembers.length} Mitglieder`
                  : `${filteredMembers.length} участников`}
            </span>

            {(search ||
              activeFiltersCount > 0) &&
              !loading && (
                <button
                  type="button"
                  onClick={clearEverything}
                  className="font-semibold text-neutral-500"
                >
                  {language === "de"
                    ? "Zurücksetzen"
                    : "Сбросить"}
                </button>
              )}
          </div>
        </section>

        {/* Team list */}
        <section className="mt-4 space-y-3">
          {loading ? (
            <>
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-[28px] border border-neutral-200 bg-white p-4"
                >
                  <div className="flex gap-3">
                    <div className="h-14 w-14 rounded-[20px] bg-neutral-100" />

                    <div className="flex-1">
                      <div className="h-4 w-36 rounded bg-neutral-100" />

                      <div className="mt-2 h-3 w-24 rounded bg-neutral-100" />

                      <div className="mt-5 h-10 w-full rounded-2xl bg-neutral-100" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : filteredMembers.length === 0 ? (
            <div className="rounded-3xl border border-neutral-200 bg-white px-5 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                <UserRound size={21} />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-neutral-800">
                {language === "de"
                  ? "Keine Mitglieder gefunden"
                  : "Участники не найдены"}
              </h3>

              <p className="mt-1 text-xs text-neutral-400">
                {language === "de"
                  ? "Passe deine Suche oder Filter an."
                  : "Измени поиск или фильтры."}
              </p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const openTasks =
                getMemberTasks(member.id);

              const completedTasks =
                getCompletedMemberTasks(
                  member.id,
                );

              const nextTask =
                getNextTask(member.id);

              const nextService =
                getNextService(member.id);

              return (
                <article
                  key={member.id}
                  onClick={() =>
                    openMember(member)
                  }
                  className="group cursor-pointer overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.025)] transition active:scale-[0.99] sm:hover:border-neutral-300 sm:hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)]"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3.5">
                      {/* Avatar */}
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={`${member.first_name} ${member.last_name}`}
                          className="h-14 w-14 shrink-0 rounded-[20px] object-cover"
                        />
                      ) : (
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] text-sm font-bold ${getAvatarTone(
                            member,
                          )}`}
                        >
                          {getInitials(member)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-bold text-neutral-950">
                              {member.first_name}{" "}
                              {member.last_name}
                            </h2>

                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-lg px-2 py-1 text-[9px] font-bold ${getPositionStyle(
                                  member.position,
                                )}`}
                              >
                                {getPositionLabel(
                                  member.position,
                                  language,
                                )}
                              </span>

                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-neutral-400">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    member.status ===
                                    "active"
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

                          <ChevronRight
                            size={17}
                            className="mt-1 shrink-0 text-neutral-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Next service */}
                    <div className="mt-4">
                      {nextService ? (
                        <div className="rounded-[22px] bg-neutral-900 p-3.5 text-white">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                                <CalendarDays
                                  size={14}
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                                  {language === "de"
                                    ? "Nächster Dienst"
                                    : "Ближайшее служение"}
                                </div>

                                <div className="mt-0.5 text-xs font-bold text-white">
                                  {formatShortDate(
                                    nextService.schedule_date,
                                    language,
                                  )}{" "}
                                  ·{" "}
                                  {
                                    nextService.service_time
                                  }
                                </div>
                              </div>
                            </div>

                            <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[9px] font-bold text-neutral-300">
                              {getEntryTypeLabel(
                                nextService.entry_type,
                                language,
                              )}
                            </span>
                          </div>

                          <div className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-neutral-200">
                            {getServiceTitle(
                              nextService,
                              language,
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-[22px] bg-neutral-50 px-3.5 py-3 text-[10px] font-medium text-neutral-400">
                          <CalendarDays
                            size={14}
                          />

                          {language === "de"
                            ? "Kein zukünftiger Dienst eingetragen"
                            : "Будущих служений пока нет"}
                        </div>
                      )}
                    </div>

                    {/* Work stats */}
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <div className="rounded-[20px] bg-neutral-50 p-3">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-neutral-400">
                          <ListTodo size={12} />

                          {language === "de"
                            ? "Aufgaben"
                            : "Задачи"}
                        </div>

                        <div className="mt-1.5 flex items-end gap-1">
                          <span className="text-lg font-bold text-neutral-900">
                            {openTasks.length}
                          </span>

                          <span className="pb-0.5 text-[10px] text-neutral-400">
                            {language === "de"
                              ? "offen"
                              : "открыто"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-[20px] bg-neutral-50 p-3">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-neutral-400">
                          <CheckCircle2
                            size={12}
                          />

                          {language === "de"
                            ? "Erledigt"
                            : "Готово"}
                        </div>

                        <div className="mt-1.5 text-lg font-bold text-neutral-900">
                          {completedTasks.length}
                        </div>
                      </div>
                    </div>

                    {/* Next task */}
                    {nextTask ? (
                      <div className="mt-2.5 flex items-center justify-between gap-3 rounded-[20px] border border-neutral-100 bg-white px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-neutral-400">
                            {language === "de"
                              ? "Nächste Aufgabe"
                              : "Ближайшая задача"}
                          </div>

                          <div className="mt-1 truncate text-xs font-semibold text-neutral-800">
                            {nextTask.title}
                          </div>
                        </div>

                        {nextTask.deadline && (
                          <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-neutral-100 px-2.5 py-2 text-[10px] font-bold text-neutral-600">
                            <CalendarDays
                              size={12}
                            />

                            {formatShortDate(
                              nextTask.deadline,
                              language,
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2.5 flex items-center gap-2 rounded-[20px] bg-neutral-50 px-3 py-2.5 text-[10px] font-medium text-neutral-400">
                        <CheckCircle2
                          size={13}
                        />

                        {language === "de"
                          ? "Keine offenen Aufgaben"
                          : "Нет открытых задач"}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                      className="flex h-11 items-center justify-center gap-2 border-t border-neutral-100 bg-white text-xs font-bold text-neutral-600 transition active:bg-neutral-50"
                    >
                      <Phone size={14} />

                      {member.phone}
                    </a>
                  )}
                </article>
              );
            })
          )}
        </section>
      </main>

      {/* Member detail */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setSelectedMember(null);
            }
          }}
        >
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-t-[30px] bg-[#f5f5f4] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-neutral-200 bg-[#f5f5f4]/95 px-4 pb-3 pt-3 backdrop-blur-xl">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300" />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMember(null)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-neutral-500"
                >
                  <X size={18} />
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openEditModal(
                        selectedMember,
                      )
                    }
                    className="flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-neutral-700"
                  >
                    <Edit3 size={14} />

                    {language === "de"
                      ? "Bearbeiten"
                      : "Изменить"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDeleteMember(
                        selectedMember,
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4 pb-8">
              {/* Profile */}
              <section className="rounded-[28px] border border-neutral-200 bg-white p-5">
                <div className="flex items-center gap-4">
                  {selectedMember.avatar_url ? (
                    <img
                      src={
                        selectedMember.avatar_url
                      }
                      alt={`${selectedMember.first_name} ${selectedMember.last_name}`}
                      className="h-[72px] w-[72px] shrink-0 rounded-[24px] object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[24px] text-xl font-bold ${getAvatarTone(
                        selectedMember,
                      )}`}
                    >
                      {getInitials(
                        selectedMember,
                      )}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                      {
                        selectedMember.first_name
                      }{" "}
                      {selectedMember.last_name}
                    </h2>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${getPositionStyle(
                          selectedMember.position,
                        )}`}
                      >
                        {getPositionLabel(
                          selectedMember.position,
                          language,
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-neutral-400">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            selectedMember.status ===
                            "active"
                              ? "bg-emerald-500"
                              : "bg-neutral-300"
                          }`}
                        />

                        {getStatusLabel(
                          selectedMember.status,
                          language,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedMember.phone && (
                  <a
                    href={`tel:${selectedMember.phone}`}
                    className="mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-neutral-900 text-sm font-semibold text-white transition active:scale-[0.99]"
                  >
                    <Phone size={16} />

                    {language === "de"
                      ? `Anrufen · ${selectedMember.phone}`
                      : `Позвонить · ${selectedMember.phone}`}
                  </a>
                )}
              </section>

              {/* Next service */}
              <section className="rounded-[28px] bg-neutral-900 p-5 text-white">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <CalendarDays
                      size={16}
                    />
                  </div>

                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                      {language === "de"
                        ? "Nächster Dienst"
                        : "Ближайшее служение"}
                    </div>

                    {selectedNextService && (
                      <div className="mt-0.5 text-xs font-bold">
                        {formatDate(
                          selectedNextService.schedule_date,
                          language,
                        )}{" "}
                        ·{" "}
                        {
                          selectedNextService.service_time
                        }
                      </div>
                    )}
                  </div>
                </div>

                {selectedNextService ? (
                  <>
                    <div className="mt-4 text-base font-bold leading-6">
                      {getServiceTitle(
                        selectedNextService,
                        language,
                      )}
                    </div>

                    {selectedNextService.series && (
                      <div className="mt-2 text-xs text-neutral-400">
                        {
                          selectedNextService.series
                        }
                      </div>
                    )}

                    {selectedNextService.bible_text && (
                      <div className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs text-neutral-300">
                        {
                          selectedNextService.bible_text
                        }
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-4 text-sm text-neutral-400">
                    {language === "de"
                      ? "Kein zukünftiger Dienst eingetragen."
                      : "Будущих служений пока нет."}
                  </div>
                )}
              </section>

              {/* Personal information */}
              <section className="rounded-[28px] border border-neutral-200 bg-white p-4">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                  {language === "de"
                    ? "Informationen"
                    : "Информация"}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-neutral-50 p-3">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                      {language === "de"
                        ? "Geburtstag"
                        : "Дата рождения"}
                    </div>

                    <div className="mt-1 text-xs font-semibold text-neutral-800">
                      {formatDate(
                        selectedMember.birth_date,
                        language,
                      )}
                    </div>

                    {calculateAge(
                      selectedMember.birth_date,
                    ) !== null && (
                      <div className="mt-0.5 text-[10px] text-neutral-400">
                        {
                          calculateAge(
                            selectedMember.birth_date,
                          )
                        }{" "}
                        {language === "de"
                          ? "Jahre"
                          : "лет"}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-neutral-50 p-3">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                      {language === "de"
                        ? "Sprachen"
                        : "Языки"}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedMember.languages
                        ?.length ? (
                        selectedMember.languages.map(
                          (item) => (
                            <span
                              key={item}
                              className="rounded-md bg-white px-1.5 py-1 text-[9px] font-bold text-neutral-500"
                            >
                              {item}
                            </span>
                          ),
                        )
                      ) : (
                        <span className="text-xs text-neutral-300">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedMember.notes && (
                  <div className="mt-2 rounded-2xl bg-neutral-50 p-3">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                      {language === "de"
                        ? "Notizen"
                        : "Заметки"}
                    </div>

                    <p className="mt-1 text-xs leading-5 text-neutral-600">
                      {selectedMember.notes}
                    </p>
                  </div>
                )}
              </section>

              {/* Tasks */}
              <section className="rounded-[28px] border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                      {language === "de"
                        ? "Aufgaben"
                        : "Задачи"}
                    </div>

                    <div className="mt-1 text-lg font-bold text-neutral-900">
                      {selectedTasks.length}

                      <span className="ml-1 text-xs font-medium text-neutral-400">
                        {language === "de"
                          ? "offen"
                          : "открытых"}
                      </span>
                    </div>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                    <ListTodo size={17} />
                  </div>
                </div>

                {selectedTasks.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {[...selectedTasks]
                      .sort((a, b) => {
                        if (!a.deadline)
                          return 1;

                        if (!b.deadline)
                          return -1;

                        return (
                          a.deadline.localeCompare(
                            b.deadline,
                          )
                        );
                      })
                      .slice(0, 6)
                      .map((task) => (
                        <div
                          key={task.id}
                          className="rounded-2xl bg-neutral-50 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-neutral-800">
                                {task.title}
                              </div>

                              {getProjectTitle(
                                task.project_id,
                              ) && (
                                <div className="mt-1 truncate text-[10px] text-neutral-400">
                                  {
                                    getProjectTitle(
                                      task.project_id,
                                    )
                                  }
                                </div>
                              )}
                            </div>

                            <span
                              className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-bold ${
                                task.priority ===
                                "urgent"
                                  ? "bg-red-50 text-red-600"
                                  : task.priority ===
                                      "high"
                                    ? "bg-orange-50 text-orange-600"
                                    : "bg-neutral-100 text-neutral-500"
                              }`}
                            >
                              {getPriorityLabel(
                                task.priority,
                                language,
                              )}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[9px] font-semibold text-neutral-400">
                              {getTaskStatusLabel(
                                task.status,
                                language,
                              )}
                            </span>

                            {task.deadline && (
                              <span className="flex items-center gap-1 text-[9px] font-semibold text-neutral-500">
                                <CalendarDays
                                  size={11}
                                />

                                {formatDate(
                                  task.deadline,
                                  language,
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-neutral-50 px-3 py-4 text-center text-xs text-neutral-400">
                    {language === "de"
                      ? "Keine offenen Aufgaben."
                      : "Нет открытых задач."}
                  </div>
                )}

                {selectedCompletedTasks.length >
                  0 && (
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-neutral-400">
                    <CheckCircle2
                      size={13}
                    />

                    {
                      selectedCompletedTasks.length
                    }{" "}
                    {language === "de"
                      ? "Aufgaben erledigt"
                      : "задач выполнено"}
                  </div>
                )}
              </section>

              {/* Next task */}
              {selectedNextTask && (
                <section className="rounded-[28px] bg-white p-5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                    {language === "de"
                      ? "Nächste Aufgabe"
                      : "Ближайшая задача"}
                  </div>

                  <div className="mt-2 text-base font-bold text-neutral-900">
                    {selectedNextTask.title}
                  </div>

                  {selectedNextTask.deadline && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                      <CalendarDays
                        size={14}
                      />

                      {language === "de"
                        ? `Fällig am ${formatDate(
                            selectedNextTask.deadline,
                            language,
                          )}`
                        : `Дедлайн: ${formatDate(
                            selectedNextTask.deadline,
                            language,
                          )}`}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[30px] bg-white shadow-2xl sm:max-w-[620px] sm:rounded-3xl">
            <div className="sticky top-0 z-10 border-b border-neutral-100 bg-white px-5 pb-4 pt-4 sm:px-6">
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-200 sm:hidden" />

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-neutral-950">
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
                  type="button"
                  onClick={closeModal}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {/* Avatar */}
              <div>
                <label className="mb-2 block text-xs font-bold text-neutral-700">
                  {language === "de"
                    ? "Foto"
                    : "Фото"}
                </label>

                <div className="flex items-center gap-4">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Avatar Vorschau"
                      className="h-20 w-20 rounded-[24px] object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-20 w-20 items-center justify-center rounded-[24px] text-lg font-bold ${
                        editingMember
                          ? getAvatarTone(
                              editingMember,
                            )
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      {editingMember
                        ? getInitials(
                            editingMember,
                          )
                        : "?"}
                    </div>
                  )}

                  <div className="min-w-0">
                    <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-neutral-900 px-4 text-xs font-bold text-white">
                      <ImagePlus size={15} />

                      {language === "de"
                        ? "Foto auswählen"
                        : "Выбрать фото"}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={
                          handleAvatarChange
                        }
                        className="hidden"
                      />
                    </label>

                    <p className="mt-2 text-[10px] leading-4 text-neutral-400">
                      {language === "de"
                        ? "JPG, PNG oder WEBP · max. 5 MB"
                        : "JPG, PNG или WEBP · максимум 5 МБ"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="mb-2 block text-xs font-bold text-neutral-700">
                  {language === "de"
                    ? "Name"
                    : "Имя"}
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={form.first_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        first_name:
                          event.target.value,
                      }))
                    }
                    placeholder={
                      language === "de"
                        ? "Vorname"
                        : "Имя"
                    }
                    className="h-12 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />

                  <input
                    value={form.last_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        last_name:
                          event.target.value,
                      }))
                    }
                    placeholder={
                      language === "de"
                        ? "Nachname"
                        : "Фамилия"
                    }
                    className="h-12 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Position + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-bold text-neutral-700">
                    {language === "de"
                      ? "Position"
                      : "Должность"}
                  </label>

                  <select
                    value={form.position}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        position:
                          event.target.value as Position,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none"
                  >
                    <option value="hauptleiter">
                      {getPositionLabel(
                        "hauptleiter",
                        language,
                      )}
                    </option>

                    <option value="leiter">
                      {getPositionLabel(
                        "leiter",
                        language,
                      )}
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
                  <label className="mb-2 block text-xs font-bold text-neutral-700">
                    {language === "de"
                      ? "Status"
                      : "Статус"}
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status:
                          event.target.value as Status,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none"
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

              {/* Phone + Birthday */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-bold text-neutral-700">
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
                    type="tel"
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-neutral-700">
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
                        birth_date:
                          event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="mb-2 block text-xs font-bold text-neutral-700">
                  {language === "de"
                    ? "Sprachen"
                    : "Языки"}
                </label>

                <div className="flex gap-2">
                  {["DE", "RU"].map((item) => {
                    const selected =
                      form.languages.includes(
                        item,
                      );

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          toggleLanguage(item)
                        }
                        className={`h-11 rounded-xl border px-5 text-xs font-bold transition ${
                          selected
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 bg-white text-neutral-500"
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
                <label className="mb-2 block text-xs font-bold text-neutral-700">
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
                  rows={4}
                  placeholder={
                    language === "de"
                      ? "Optionale Notizen..."
                      : "Дополнительные заметки..."
                  }
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                />
              </div>
            </div>

            {/* Save */}
            <div className="sticky bottom-0 flex gap-2 border-t border-neutral-100 bg-white p-4 sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={
                  saving || uploadingAvatar
                }
                className="h-12 flex-1 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-600 disabled:opacity-50"
              >
                {language === "de"
                  ? "Abbrechen"
                  : "Отмена"}
              </button>

              <button
                type="button"
                onClick={saveMember}
                disabled={
                  saving ||
                  uploadingAvatar ||
                  !form.first_name.trim() ||
                  !form.last_name.trim()
                }
                className="h-12 flex-1 rounded-xl bg-neutral-900 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ||
                uploadingAvatar
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

      {/* Delete */}
      {deleteMember && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleting
            ) {
              setDeleteMember(null);
            }
          }}
        >
          <div className="w-full rounded-t-[30px] bg-white p-5 shadow-2xl sm:max-w-[430px] sm:rounded-3xl sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={19} />
            </div>

            <h2 className="mt-4 text-lg font-bold text-neutral-950">
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
                type="button"
                onClick={() =>
                  setDeleteMember(null)
                }
                disabled={deleting}
                className="h-12 flex-1 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-600 disabled:opacity-50"
              >
                {language === "de"
                  ? "Abbrechen"
                  : "Отмена"}
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="h-12 flex-1 rounded-xl bg-red-600 text-sm font-bold text-white disabled:opacity-50"
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