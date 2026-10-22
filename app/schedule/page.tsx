"use client";

import DatePicker from "@/components/DatePicker";
import Avatar from "@/components/Avatar";

import { useEffect, useMemo, useRef, useState } from "react";
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
  CalendarCheck,
  FileText,
  Search,
  Link2,
  UserRoundX,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useLanguage } from "@/components/LanguageProvider";
import { useAvailabilityReminder } from "@/lib/useAvailabilityReminder";
import ReminderDot from "@/components/ReminderDot";
import { normalizeServiceTime } from "@/lib/services";
import { useToast } from "@/components/ToastProvider";
import { REPLACEMENTS_UPDATED_EVENT } from "@/lib/useReplacementRequests";

type TeamMember = {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  status: "active" | "inactive";
  user_id?: string | null;
  avatar_url?: string | null;
};

type ReplacementRequest = {
  schedule_entry_id: number;
  team_member_id: number;
  reason: string | null;
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
  material_id: number | null;
  created_at: string;
  updated_at: string;
};

/*
 * Упрощённый материал для пикера "тема из материалов".
 * folder_id нужен, чтобы при клике по теме в расписании
 * сразу открыть правильную папку в /materials.
 */
type PickerMaterial = {
  id: number;
  folder_id: number | null;
  title: string;
  file_name: string | null;
  material_type: string;
};

type PickerFolder = {
  id: number;
  name: string;
  name_de: string | null;
  name_ru: string | null;
  parent_id: number | null;
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
  material_id: number | null;
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
  material_id: null,
};

export default function SchedulePage() {
  const router = useRouter();
  const reminder = useAvailabilityReminder();
  const toast = useToast();
  const { language, t } = useLanguage();

  const isRu = language === "ru";

  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [entryMembers, setEntryMembers] = useState<ScheduleMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  /* замены: «не смогу, нужна замена» */
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<ReplacementRequest[]>([]);
  const [cancelTarget, setCancelTarget] = useState<{
    entry: ScheduleEntry;
    memberId: number;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<{
    entry: ScheduleEntry;
    memberId: number;
  } | null>(null);
  const [freeUserIds, setFreeUserIds] = useState<string[]>([]);
  const [freeNames, setFreeNames] = useState<string[]>([]);

  /*
   * Дата из ссылки (?date=2026-10-25), например с главной страницы.
   * Если её нет — открываем текущий месяц и сами прокручиваем
   * к ближайшему служению.
   */
  const dateFromUrl = useRef<string | null>(
    typeof window !== "undefined" &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        new URLSearchParams(
          window.location.search,
        ).get("date") ?? "",
      )
      ? new URLSearchParams(
          window.location.search,
        ).get("date")
      : null,
  );

  const autoFocusDone = useRef(false);
  const triedNextMonth = useRef(false);
  const [focusedDate, setFocusedDate] = useState<
    string | null
  >(null);

  // Прошедшие даты месяца свёрнуты, чтобы не листать до актуального
  const [showPast, setShowPast] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const fromUrl = dateFromUrl.current;

    if (fromUrl) {
      return new Date(
        Number(fromUrl.slice(0, 4)),
        Number(fromUrl.slice(5, 7)) - 1,
        1,
      );
    }

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

  const [pickerMaterials, setPickerMaterials] = useState<
    PickerMaterial[]
  >([]);

  const [pickerFolders, setPickerFolders] = useState<
    PickerFolder[]
  >([]);

  const [materialSearch, setMaterialSearch] = useState("");
  const [materialPickerOpen, setMaterialPickerOpen] =
    useState(false);

  const [pickerFolderId, setPickerFolderId] = useState<
    number | null
  >(null);

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

    setMyUserId(user.id);

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

  useEffect(() => {
    loadPickerMaterials();
  }, []);

  async function loadPickerMaterials() {
    const [materialsResult, foldersResult] =
      await Promise.all([
        supabase
          .from("materials")
          .select(
            "id, folder_id, title, file_name, material_type",
          )
          .order("title", { ascending: true }),

        supabase
          .from("material_folders")
          .select("id, name, name_de, name_ru, parent_id"),
      ]);

    if (materialsResult.error) {
      console.error(
        "Error loading materials for picker:",
        materialsResult.error,
      );
    } else {
      setPickerMaterials(materialsResult.data ?? []);
    }

    if (foldersResult.error) {
      console.error(
        "Error loading material folders for picker:",
        foldersResult.error,
      );
    } else {
      setPickerFolders(foldersResult.data ?? []);
    }
  }

  function getPickerFolderName(
    folderId: number | null,
  ) {
    if (folderId == null) return "";

    const folder = pickerFolders.find(
      (item) => item.id === folderId,
    );

    if (!folder) return "";

    return (
      (isRu
        ? folder.name_ru
        : folder.name_de) ||
      folder.name
    );
  }

  function getPickerFolderPath(
    folderId: number | null,
  ) {
    if (folderId == null) return "";

    const chain: string[] = [];
    let current =
      pickerFolders.find(
        (item) => item.id === folderId,
      ) ?? null;

    while (current) {
      const name =
        (isRu
          ? current.name_ru
          : current.name_de) ||
        current.name;

      chain.unshift(name);

      current =
        pickerFolders.find(
          (item) => item.id === current!.parent_id,
        ) ?? null;
    }

    return chain.join(" / ");
  }

  const filteredPickerMaterials = useMemo(() => {
    const query = materialSearch
      .trim()
      .toLocaleLowerCase();

    if (!query) {
      return pickerMaterials.slice(0, 30);
    }

    return pickerMaterials
      .filter((material) => {
        const haystack = `${material.title} ${material.file_name ?? ""}`.toLocaleLowerCase();

        return haystack.includes(query);
      })
      .slice(0, 30);
  }, [pickerMaterials, materialSearch]);

  /*
   * Хлебные крошки для навигации по папкам в пикере темы.
   */
  const pickerBreadcrumbs = useMemo(() => {
    const chain: PickerFolder[] = [];
    let current =
      pickerFolders.find(
        (item) => item.id === pickerFolderId,
      ) ?? null;

    while (current) {
      chain.unshift(current);

      current =
        pickerFolders.find(
          (item) => item.id === current!.parent_id,
        ) ?? null;
    }

    return chain;
  }, [pickerFolders, pickerFolderId]);

  const pickerVisibleFolders = useMemo(() => {
    return pickerFolders.filter(
      (folder) =>
        folder.parent_id === pickerFolderId,
    );
  }, [pickerFolders, pickerFolderId]);

  const pickerVisibleMaterials = useMemo(() => {
    return pickerMaterials.filter(
      (material) =>
        material.folder_id === pickerFolderId,
    );
  }, [pickerMaterials, pickerFolderId]);

  function selectPickerMaterial(
    material: PickerMaterial,
  ) {
    setForm((current) => ({
      ...current,
      material_id: material.id,
      title_de:
        current.service_time === "10:00"
          ? material.title
          : current.title_de,
      title_ru:
        current.service_time === "12:30"
          ? material.title
          : current.title_ru,
    }));

    setMaterialPickerOpen(false);
    setMaterialSearch("");
  }

  function clearPickerMaterial() {
    setForm((current) => ({
      ...current,
      material_id: null,
    }));

    setPickerFolderId(null);
    setMaterialSearch("");
  }

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
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
            "id, first_name, last_name, position, status, user_id, avatar_url",
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
      setEntries(
        (entriesResult.data ?? []).map((entry) => ({
          ...entry,
          // старые записи с 13:00 показываем как 12:30
          service_time: normalizeServiceTime(entry.service_time),
        })),
      );
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
      const requestsResult = await supabase
        .from("replacement_requests")
        .select("schedule_entry_id, team_member_id, reason")
        .in("schedule_entry_id", entryIds);

      // если таблицы ещё нет (SQL не запускали) — просто без замен
      setRequests(
        requestsResult.error
          ? []
          : ((requestsResult.data ?? []) as ReplacementRequest[]),
      );

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
      setRequests([]);
    }

    setLoading(false);
  }

  /*
   * =====================================================
   * REPLACEMENTS
   * =====================================================
   */

  const myMemberId = useMemo(
    () => members.find((member) => member.user_id === myUserId)?.id ?? null,
    [members, myUserId],
  );

  function todayKeyLocal() {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function getRequest(entryId: number, memberId: number) {
    return requests.find(
      (item) =>
        item.schedule_entry_id === entryId && item.team_member_id === memberId,
    );
  }

  async function submitCancel() {
    if (!cancelTarget || !myUserId) return;

    const { entry, memberId } = cancelTarget;
    const me = members.find((member) => member.id === memberId);

    setReplaceBusy(true);

    const reason = cancelReason.trim() || null;

    const { error } = await supabase.from("replacement_requests").insert({
      schedule_entry_id: entry.id,
      team_member_id: memberId,
      reason,
    });

    if (error) {
      console.error("Replacement request error:", error);
      toast.error(
        isRu
          ? "Не удалось отправить. Попробуй ещё раз."
          : "Senden fehlgeschlagen. Versuche es noch einmal.",
      );
      setReplaceBusy(false);
      return;
    }

    /* в «Когда могу служить» этот сервис тоже становится «не могу» */
    try {
      const { data: existing } = await supabase
        .from("service_availability")
        .select("service_10, service_13, note")
        .eq("user_id", myUserId)
        .eq("sunday_date", entry.schedule_date)
        .maybeSingle();

      const s10 = entry.service_time === "10:00" ? false : Boolean(existing?.service_10);
      const s13 = entry.service_time === "10:00" ? Boolean(existing?.service_13) : false;

      await supabase.from("service_availability").upsert(
        {
          user_id: myUserId,
          member_name: me ? `${me.first_name} ${me.last_name}`.trim() : "",
          sunday_date: entry.schedule_date,
          status: s10 || s13 ? "available" : "unavailable",
          service_10: s10,
          service_13: s13,
          note: existing?.note || reason,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,sunday_date" },
      );

      window.dispatchEvent(new Event("availability-updated"));
    } catch (availabilityError) {
      console.error("Availability sync error:", availabilityError);
    }

    /* пуш админам (в том числе секретарю) */
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        await fetch("/api/replacement-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ entryId: entry.id, memberId }),
        });
      }
    } catch (notifyError) {
      console.error("Replacement notify error:", notifyError);
    }

    setReplaceBusy(false);
    setCancelTarget(null);
    setCancelReason("");

    toast.success(
      isRu
        ? "Готово — админы получили уведомление."
        : "Erledigt – die Admins wurden benachrichtigt.",
    );

    await loadData(true);
    window.dispatchEvent(new Event(REPLACEMENTS_UPDATED_EVENT));
  }

  async function removeRequest(entryId: number, memberId: number) {
    setReplaceBusy(true);

    const { error } = await supabase
      .from("replacement_requests")
      .delete()
      .eq("schedule_entry_id", entryId)
      .eq("team_member_id", memberId);

    setReplaceBusy(false);

    if (error) {
      console.error("Remove request error:", error);
      toast.error(isRu ? "Не удалось отозвать." : "Zurückziehen fehlgeschlagen.");
      return;
    }

    setReplaceTarget(null);
    await loadData(true);
    window.dispatchEvent(new Event(REPLACEMENTS_UPDATED_EVENT));
  }

  async function openReplace(entry: ScheduleEntry, memberId: number) {
    setReplaceTarget({ entry, memberId });
    setFreeUserIds([]);
    setFreeNames([]);

    const { data } = await supabase
      .from("service_availability")
      .select("user_id, member_name, status, service_10, service_13")
      .eq("sunday_date", entry.schedule_date)
      .eq("status", "available");

    const wanted = entry.service_time === "10:00" ? "service_10" : "service_13";

    const rows = (data ?? []).filter(
      (row) => (row as Record<string, unknown>)[wanted] === true,
    );

    setFreeUserIds(rows.map((row) => row.user_id as string));
    setFreeNames(
      rows.map((row) => String(row.member_name ?? "").trim().toLowerCase()),
    );
  }

  async function doReplace(newMemberId: number) {
    if (!replaceTarget) return;

    const { entry, memberId } = replaceTarget;

    setReplaceBusy(true);

    const removeOld = await supabase
      .from("schedule_entry_members")
      .delete()
      .eq("schedule_entry_id", entry.id)
      .eq("team_member_id", memberId);

    if (removeOld.error) {
      console.error("Replace remove error:", removeOld.error);
      toast.error(isRu ? "Не удалось заменить." : "Ersetzen fehlgeschlagen.");
      setReplaceBusy(false);
      return;
    }

    const alreadyIn = entryMembers.some(
      (item) =>
        item.schedule_entry_id === entry.id &&
        item.team_member_id === newMemberId,
    );

    if (!alreadyIn) {
      const add = await supabase.from("schedule_entry_members").insert({
        schedule_entry_id: entry.id,
        team_member_id: newMemberId,
      });

      if (add.error) {
        console.error("Replace add error:", add.error);
        toast.error(isRu ? "Не удалось поставить замену." : "Ersatz konnte nicht eingetragen werden.");
        setReplaceBusy(false);
        await loadData(true);
        return;
      }
    }

    await supabase
      .from("replacement_requests")
      .delete()
      .eq("schedule_entry_id", entry.id)
      .eq("team_member_id", memberId);

    setReplaceBusy(false);
    setReplaceTarget(null);

    toast.success(isRu ? "Замена поставлена." : "Ersatz eingetragen.");

    await loadData(true);
    window.dispatchEvent(new Event(REPLACEMENTS_UPDATED_EVENT));
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

  function getLinkedMaterial(entry: ScheduleEntry) {
    if (entry.material_id == null) return null;

    return (
      pickerMaterials.find(
        (material) =>
          material.id === entry.material_id,
      ) ?? null
    );
  }

  function goToMaterial(entry: ScheduleEntry) {
    const material = getLinkedMaterial(entry);

    if (!material) return;

    const params = new URLSearchParams();

    params.set("material", String(material.id));

    if (material.folder_id != null) {
      params.set(
        "folder",
        String(material.folder_id),
      );
    }

    router.push(`/materials?${params.toString()}`);
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
      | "12:30" = "10:00",
  ) {
    if (!isAdmin) return;

    setErrorMessage("");
    setEditingEntry(null);
    setMaterialSearch("");
    setMaterialPickerOpen(false);
    setPickerFolderId(null);

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
    setMaterialSearch("");
    setMaterialPickerOpen(false);
    setPickerFolderId(null);

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
      material_id:
        entry.material_id ?? null,
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
    time: "10:00" | "12:30",
  ) {
    setForm((current) => ({
      ...current,
      service_time: time,

      // 10:00 = German only
      // 12:30 = Russian only
      title_de:
        time === "10:00"
          ? current.title_de
          : "",

      title_ru:
        time === "12:30"
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

      // 12:30 → RU
      title_ru:
        form.service_time === "12:30"
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

      material_id:
        form.material_id ?? null,

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

    await loadData(true);

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

    await loadData(true);

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
   * Автопрокрутка к актуальному служению.
   * Срабатывает один раз при открытии страницы.
   */
  useEffect(() => {
    if (loading || autoFocusDone.current) {
      return;
    }

    const now = new Date();

    const today = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;

    const target =
      dateFromUrl.current &&
      scheduleDays.includes(dateFromUrl.current)
        ? dateFromUrl.current
        : (scheduleDays.find(
            (date) => date >= today,
          ) ?? null);

    if (!target) {
      // В этом месяце ближайших служений уже нет — открываем следующий
      if (
        !dateFromUrl.current &&
        !triedNextMonth.current
      ) {
        triedNextMonth.current = true;

        setCurrentMonth(
          new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1,
            1,
          ),
        );
      } else {
        autoFocusDone.current = true;
      }

      return;
    }

    autoFocusDone.current = true;
    setFocusedDate(target);

    if (target < today) {
      setShowPast(true);
    }

    const scrollTimer = window.setTimeout(() => {
      const element = document.getElementById(
        `day-${target}`,
      );

      // Если нужный день и так виден вверху страницы — не прокручиваем,
      // чтобы не прятать переключатель месяца
      if (
        element &&
        element.getBoundingClientRect().top > 260
      ) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 150);

    const clearTimer = window.setTimeout(() => {
      setFocusedDate(null);
    }, 3500);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [loading, scheduleDays, currentMonth]);

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  const todayStr = (() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;
  })();

  const firstUpcomingDate =
    scheduleDays.find((date) => date >= todayStr) ?? null;

  const pastDays = scheduleDays.filter(
    (date) => date < todayStr,
  );

  const upcomingDays = scheduleDays.filter(
    (date) => date >= todayStr,
  );

  // если весь месяц в прошлом — показываем всё, иначе прошедшие под спойлером
  const pastOpen = showPast || upcomingDays.length === 0;

  const visibleDays = pastOpen ? scheduleDays : upcomingDays;

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

        <div className="mx-auto w-full max-w-[880px] px-4 pb-32 pt-3 sm:px-6 md:pt-8 lg:px-8">
          {/* =================================================
              DESKTOP HEADING
          ================================================= */}
          <section className="md:mb-6">
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

          </section>

          {/* =================================================
              TOOLBAR: месяц + быстрые ссылки
          ================================================= */}
          <section className="mb-3 space-y-2">
            {/* MONTH NAVIGATION */}
            <div className="flex items-center gap-1 rounded-[16px] border border-[#e1e3e6] bg-white p-1">
              <button
                type="button"
                onClick={previousMonth}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[#687585] active:bg-[#f3f4f5]"
                aria-label={
                  isRu
                    ? "Предыдущий месяц"
                    : "Vorheriger Monat"
                }
              >
                <ChevronLeft size={20} />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-[15px] font-bold capitalize leading-tight tracking-[-0.02em]">
                  {monthLabel}
                </div>

                <div className="text-[11px] leading-tight text-[#98a0aa]">
                  {entries.length}{" "}
                  {isRu
                    ? entries.length === 1
                      ? "служение"
                      : "служений"
                    : entries.length === 1
                      ? "Dienst"
                      : "Dienste"}
                </div>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[#687585] active:bg-[#f3f4f5]"
                aria-label={
                  isRu
                    ? "Следующий месяц"
                    : "Nächster Monat"
                }
              >
                <ChevronRight size={20} />
              </button>

              <button
                type="button"
                onClick={goToToday}
                className="ml-0.5 mr-0.5 h-9 shrink-0 rounded-[11px] bg-[#111820] px-3.5 text-[11px] font-bold text-white active:opacity-80"
              >
                {isRu ? "Сегодня" : "Heute"}
              </button>
            </div>

            {/* QUICK LINKS */}
            {!roleLoading && (
              <div className="flex flex-wrap items-center gap-2">
                {!reminder.exempt && (
                <button
                  type="button"
                  onClick={() =>
                    router.push("/availability")
                  }
                  className={`inline-flex h-10 items-center gap-2 rounded-full border pl-1.5 pr-4 text-[12.5px] font-bold transition active:scale-[0.98] ${
                    reminder.needed
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-[#e1e3e6] bg-white text-[#111820]"
                  }`}
                >
                  <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#111820] text-white">
                    <CalendarCheck size={14} />

                    {reminder.needed && (
                      <ReminderDot className="-right-0.5 -top-0.5" />
                    )}
                  </span>

                  <span>
                    {isRu
                      ? "Когда могу служить"
                      : "Wann ich dienen kann"}
                  </span>

                  {reminder.needed && (
                    <span className="font-semibold text-red-500">
                      ·{" "}
                      {reminder.nextMonth.toLocaleDateString(
                        isRu ? "ru-RU" : "de-DE",
                        { month: "long" },
                      )}
                    </span>
                  )}
                </button>
                )}

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/availability?tab=overview",
                      )
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e1e3e6] bg-white pl-1.5 pr-4 text-[12.5px] font-bold text-[#111820] transition active:scale-[0.98]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Users size={14} />
                    </span>

                    {isRu ? "Сводка" : "Übersicht"}
                  </button>
                ) : (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-[#8b949f]">
                    <ShieldCheck size={13} />
                    {isRu
                      ? "Только просмотр"
                      : "Nur ansehen"}
                  </span>
                )}
              </div>
            )}
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
            <div className="space-y-3">
              {pastDays.length > 0 &&
                upcomingDays.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowPast((value) => !value)
                    }
                    className="flex w-full items-center justify-between rounded-[14px] border border-dashed border-[#d5d8dc] px-3.5 py-2.5 text-[12px] font-semibold text-[#707987] active:bg-white"
                  >
                    <span>
                      {isRu
                        ? `Прошедшие: ${pastDays.length}`
                        : `Vergangene: ${pastDays.length}`}
                    </span>

                    <span className="flex items-center gap-1 text-[#98a0aa]">
                      {pastOpen
                        ? isRu
                          ? "Скрыть"
                          : "Ausblenden"
                        : isRu
                          ? "Показать"
                          : "Anzeigen"}
                      <ChevronRight
                        size={15}
                        className={`transition ${
                          pastOpen ? "rotate-90" : ""
                        }`}
                      />
                    </span>
                  </button>
                )}

              {visibleDays.map(
                (date) => {
                  const dayEntries =
                    groupedEntries[
                      date
                    ] ?? [];

                  const isPast = date < todayStr;
                  const isToday = date === todayStr;

                  return (
                    <section
                      key={date}
                      id={`day-${date}`}
                      className={`scroll-mt-20 overflow-hidden rounded-[20px] border bg-white transition-shadow duration-500 ${
                        focusedDate === date
                          ? "border-[#111820] shadow-[0_0_0_3px_rgba(17,24,32,0.12)]"
                          : "border-[#e0e2e5] shadow-[0_2px_10px_rgba(17,24,32,0.03)]"
                      } ${isPast ? "opacity-70" : ""}`}
                    >
                      {/* DAY HEADER */}
                      <div className="flex items-center gap-3 border-b border-[#eceef0] bg-[#fafafa] px-3 py-2.5 md:px-4">
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[13px] bg-[#111820] text-white">
                          <span className="text-[17px] font-bold leading-none">
                            {date.slice(8, 10)}
                          </span>

                          <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[#aeb6bf]">
                            {getWeekday(date)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-bold capitalize leading-tight tracking-[-0.015em]">
                            {getFullDate(date)}
                          </div>

                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#969ea8]">
                            {isToday ? (
                              <span className="rounded-full bg-[#111820] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                {isRu ? "Сегодня" : "Heute"}
                              </span>
                            ) : (
                              date === firstUpcomingDate && (
                                <span className="rounded-full bg-[#111820] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                  {isRu ? "Ближайшее" : "Nächster"}
                                </span>
                              )
                            )}

                            <span>
                              {dayEntries.length}{" "}
                              {isRu
                                ? dayEntries.length === 1
                                  ? "служение"
                                  : "служений"
                                : dayEntries.length === 1
                                  ? "Dienst"
                                  : "Dienste"}
                            </span>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex shrink-0 gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                openCreateModal(date, "10:00")
                              }
                              title="DE"
                              className="flex h-9 items-center gap-1 rounded-[10px] border border-[#dedfe2] bg-white px-2 text-[11px] font-bold text-[#68717d] active:bg-[#f4f5f5]"
                            >
                              <Plus size={13} />
                              10:00
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openCreateModal(date, "12:30")
                              }
                              title="RU"
                              className="flex h-9 items-center gap-1 rounded-[10px] border border-[#dedfe2] bg-white px-2 text-[11px] font-bold text-[#68717d] active:bg-[#f4f5f5]"
                            >
                              <Plus size={13} />
                              12:30
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ENTRIES */}
                      <div className="divide-y divide-[#eef0f1]">
                        {dayEntries.map(
                          (entry) => {
                            const serviceMembers =
                              getEntryMembers(entry.id);

                            const isEvent =
                              entry.entry_type === "event";

                            const linkedMaterial =
                              getLinkedMaterial(entry);

                            const materialPath =
                              linkedMaterial
                                ? getPickerFolderPath(
                                    linkedMaterial.folder_id,
                                  )
                                : "";

                            return (
                              <article
                                key={entry.id}
                                className="flex gap-3 px-3 py-3 md:px-4"
                              >
                                {/* TIME */}
                                <div
                                  className={`flex h-fit w-[52px] shrink-0 flex-col items-center rounded-[12px] py-2 ${
                                    isEvent
                                      ? "bg-[#fff3d9] text-[#a8731b]"
                                      : "bg-[#eef0f2] text-[#4e5966]"
                                  }`}
                                >
                                  <span className="text-[14px] font-bold leading-none">
                                    {entry.service_time}
                                  </span>

                                  <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] opacity-70">
                                    {isEvent
                                      ? isRu
                                        ? "Событие"
                                        : "Event"
                                      : entry.service_time === "10:00"
                                        ? "DE"
                                        : "RU"}
                                  </span>
                                </div>

                                <div className="min-w-0 flex-1">
                                  {/* TITLE */}
                                  <div className="flex items-start justify-between gap-2">
                                    {linkedMaterial ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          goToMaterial(entry)
                                        }
                                        className="group inline-flex min-w-0 items-start gap-1.5 text-left"
                                      >
                                        <h3 className="break-words text-[16px] font-bold leading-[1.25] tracking-[-0.02em] text-[#111820] underline decoration-[#c7cbd1] decoration-2 underline-offset-2 group-active:text-[#4e5966]">
                                          {getEntryTitle(entry)}
                                        </h3>

                                        <FileText
                                          size={14}
                                          className="mt-1 shrink-0 text-[#9aa2ad]"
                                        />
                                      </button>
                                    ) : (
                                      <h3 className="min-w-0 break-words text-[16px] font-bold leading-[1.25] tracking-[-0.02em] text-[#111820]">
                                        {getEntryTitle(entry)}
                                      </h3>
                                    )}

                                    {isAdmin && (
                                      <div className="-mr-1 flex shrink-0 items-center">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openEditModal(entry)
                                          }
                                          className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[#8a929c] active:bg-[#eef0f1] active:text-[#111820]"
                                          aria-label={
                                            isRu
                                              ? "Редактировать"
                                              : "Bearbeiten"
                                          }
                                        >
                                          <Pencil size={15} />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDeleteTarget(entry)
                                          }
                                          className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[#9b8a8a] active:bg-red-50 active:text-red-600"
                                          aria-label={
                                            isRu
                                              ? "Удалить"
                                              : "Löschen"
                                          }
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* META */}
                                  {(entry.bible_text ||
                                    materialPath) && (
                                    <div className="mt-1 space-y-0.5 text-[12px] leading-snug text-[#707987]">
                                      {entry.bible_text && (
                                        <p className="flex items-start gap-1.5 break-words">
                                          <BookOpen
                                            size={13}
                                            className="mt-[3px] shrink-0 text-[#9aa2ad]"
                                          />
                                          <span className="font-medium">
                                            {entry.bible_text}
                                          </span>
                                        </p>
                                      )}

                                      {materialPath && (
                                        <p className="flex items-start gap-1.5 break-words">
                                          <Link2
                                            size={13}
                                            className="mt-[3px] shrink-0 text-[#9aa2ad]"
                                          />
                                          <span>{materialPath}</span>
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* SERVING TEAM */}
                                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    {serviceMembers.length > 0 ? (
                                      serviceMembers.map(
                                        (member) => (
                                          <span
                                            key={member.id}
                                            title={
                                              member.position ||
                                              undefined
                                            }
                                            className={`inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 ${
                                              getRequest(entry.id, member.id)
                                                ? "bg-red-50 ring-1 ring-red-200"
                                                : "bg-[#f1f2f3]"
                                            }`}
                                          >
                                            <Avatar
                                              src={member.avatar_url}
                                              initials={getInitials(member)}
                                              className="h-7 w-7 rounded-full bg-[#111820] text-[9px] font-bold text-white"
                                            />

                                            <span className="leading-none">
                                              <span className="text-[14px] font-bold text-[#111820]">
                                                {member.first_name}
                                              </span>{" "}
                                              <span className="text-[12px] font-medium text-[#7a8490]">
                                                {member.last_name}
                                              </span>
                                            </span>
                                          </span>
                                        ),
                                      )
                                    ) : (
                                      <span className="flex items-center gap-1.5 text-[12px] text-[#929aa5]">
                                        <Users size={13} />
                                        {isRu
                                          ? "Служители не назначены"
                                          : "Noch keine Mitarbeiter"}
                                      </span>
                                    )}
                                  </div>

                                  {/* REPLACEMENT REQUESTS */}
                                  {serviceMembers
                                    .filter((member) => getRequest(entry.id, member.id))
                                    .map((member) => {
                                      const request = getRequest(entry.id, member.id)!;
                                      const mine = member.id === myMemberId;

                                      return (
                                        <div
                                          key={`req-${member.id}`}
                                          className="mt-2.5 rounded-[12px] border border-red-200 bg-red-50 px-3 py-2.5"
                                        >
                                          <p className="flex items-start gap-1.5 text-[12.5px] font-semibold leading-snug text-red-700">
                                            <UserRoundX size={14} className="mt-0.5 shrink-0" />
                                            <span>
                                              {member.first_name}{" "}
                                              {isRu ? "не сможет — нужна замена" : "kann nicht – Ersatz gesucht"}
                                            </span>
                                          </p>

                                          {request.reason && (
                                            <p className="mt-1 pl-5 text-[12px] leading-snug text-red-600/80">
                                              {request.reason}
                                            </p>
                                          )}

                                          <div className="mt-2 flex flex-wrap gap-2 pl-5">
                                            {isAdmin && (
                                              <button
                                                type="button"
                                                onClick={() => openReplace(entry, member.id)}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-600 px-3 text-[12px] font-bold text-white active:scale-[0.98]"
                                              >
                                                <RefreshCw size={12} />
                                                {isRu ? "Найти замену" : "Ersatz finden"}
                                              </button>
                                            )}

                                            {(isAdmin || mine) && (
                                              <button
                                                type="button"
                                                disabled={replaceBusy}
                                                onClick={() => removeRequest(entry.id, member.id)}
                                                className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[12px] font-semibold text-red-700 ring-1 ring-red-200 active:scale-[0.98]"
                                              >
                                                {mine
                                                  ? isRu ? "Я смогу, отозвать" : "Doch möglich, zurückziehen"
                                                  : isRu ? "Оставить как есть" : "Beibehalten"}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}

                                  {myMemberId !== null &&
                                    entry.schedule_date >= todayKeyLocal() &&
                                    serviceMembers.some((member) => member.id === myMemberId) &&
                                    !getRequest(entry.id, myMemberId) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCancelReason("");
                                          setCancelTarget({ entry, memberId: myMemberId });
                                        }}
                                        className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-full border border-[#e0e3e6] bg-white px-3 text-[12px] font-semibold text-[#68727e] transition active:scale-[0.98]"
                                      >
                                        <UserRoundX size={13} />
                                        {isRu ? "Не смогу — нужна замена" : "Ich kann nicht – Ersatz nötig"}
                                      </button>
                                    )}

                                  {entry.notes && (
                                    <p className="mt-2.5 rounded-[11px] bg-[#f6f6f5] px-3 py-2 text-[12px] leading-snug text-[#68727e]">
                                      {entry.notes}
                                    </p>
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

      {/* CANCEL SHEET */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-[#111820]/35 backdrop-blur-[3px] md:items-center md:p-5"
          onClick={() => !replaceBusy && setCancelTarget(null)}
        >
          <div
            className="w-full rounded-t-[27px] bg-white p-5 shadow-2xl md:max-w-[460px] md:rounded-[22px]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-[18px] font-bold tracking-[-0.02em]">
              {isRu ? "Не смогу служить" : "Ich kann nicht dienen"}
            </h2>

            <p className="mt-1 text-[13px] leading-snug text-[#68727e]">
              {new Date(`${cancelTarget.entry.schedule_date}T12:00:00`).toLocaleDateString(
                isRu ? "ru-RU" : "de-DE",
                { day: "numeric", month: "long" },
              )}
              {" · "}
              {cancelTarget.entry.service_time}.{" "}
              {isRu
                ? "Админы получат уведомление и найдут замену."
                : "Die Admins werden benachrichtigt und suchen Ersatz."}
            </p>

            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={3}
              maxLength={300}
              placeholder={isRu ? "Причина (по желанию)" : "Grund (optional)"}
              className="mt-3 w-full resize-none rounded-[14px] border border-[#e0e3e6] bg-[#fafafa] px-3.5 py-3 text-[14px] outline-none focus:border-[#111820]"
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={replaceBusy}
                onClick={() => setCancelTarget(null)}
                className="h-12 flex-1 rounded-[14px] bg-[#f1f2f3] text-[14px] font-semibold text-[#4e5966]"
              >
                {isRu ? "Отмена" : "Abbrechen"}
              </button>

              <button
                type="button"
                disabled={replaceBusy}
                onClick={submitCancel}
                className="h-12 flex-[1.4] rounded-[14px] bg-red-600 text-[14px] font-bold text-white disabled:opacity-60"
              >
                {replaceBusy
                  ? isRu ? "Отправляю…" : "Sende…"
                  : isRu ? "Сообщить" : "Melden"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPLACE SHEET (admin) */}
      {replaceTarget && isAdmin && (() => {
        const { entry, memberId } = replaceTarget;
        const alreadyIds = entryMembers
          .filter((item) => item.schedule_entry_id === entry.id)
          .map((item) => item.team_member_id);

        const candidates = members.filter(
          (member) =>
            !alreadyIds.includes(member.id) &&
            ((member.user_id && freeUserIds.includes(member.user_id)) ||
              freeNames.includes(`${member.first_name} ${member.last_name}`.trim().toLowerCase())),
        );

        const others = members.filter(
          (member) =>
            !alreadyIds.includes(member.id) &&
            !candidates.some((candidate) => candidate.id === member.id),
        );

        const leaving = members.find((member) => member.id === memberId);

        const renderRow = (member: TeamMember, free: boolean) => (
          <button
            key={member.id}
            type="button"
            disabled={replaceBusy}
            onClick={() => doReplace(member.id)}
            className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition active:bg-[#f1f2f3] hover:bg-[#f6f7f7]"
          >
            <Avatar
              src={member.avatar_url}
              initials={getInitials(member)}
              className={`h-9 w-9 rounded-full text-[12px] font-bold ${
                free ? "bg-emerald-600 text-white" : "bg-[#f1f2f3] text-[#65707d]"
              }`}
            />

            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#111820]">
              {member.first_name} {member.last_name}
            </span>

            {free && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                {isRu ? "может" : "kann"}
              </span>
            )}
          </button>
        );

        return (
          <div
            className="fixed inset-0 z-[110] flex items-end justify-center bg-[#111820]/35 backdrop-blur-[3px] md:items-center md:p-5"
            onClick={() => !replaceBusy && setReplaceTarget(null)}
          >
            <div
              className="flex max-h-[85vh] w-full flex-col rounded-t-[27px] bg-white shadow-2xl md:max-w-[480px] md:rounded-[22px]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
                <div>
                  <h2 className="text-[18px] font-bold tracking-[-0.02em]">
                    {isRu ? "Кто заменит" : "Wer springt ein"}
                    {leaving ? ` · ${leaving.first_name}` : ""}
                  </h2>
                  <p className="mt-0.5 text-[12px] text-[#858e99]">
                    {new Date(`${entry.schedule_date}T12:00:00`).toLocaleDateString(
                      isRu ? "ru-RU" : "de-DE",
                      { day: "numeric", month: "long" },
                    )}
                    {" · "}
                    {entry.service_time}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setReplaceTarget(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f3f4] text-[#68727e]"
                  aria-label={isRu ? "Закрыть" : "Schließen"}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto px-2 pb-4">
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                  {isRu ? "Отметили, что могут" : "Haben „kann“ angegeben"}
                </p>

                {candidates.length === 0 ? (
                  <p className="px-3 pb-2 text-[13px] text-[#9aa2ad]">
                    {isRu ? "Никто не отметил это служение." : "Niemand hat diesen Dienst angegeben."}
                  </p>
                ) : (
                  candidates.map((member) => renderRow(member, true))
                )}

                <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]">
                  {isRu ? "Остальные" : "Weitere"}
                </p>

                {others.map((member) => renderRow(member, false))}
              </div>
            </div>
          </div>
        );
      })()}

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
                          ? "12:30 · русское служение"
                          : "12:30 · Russischer Gottesdienst"}
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

                    <DatePicker value={form.schedule_date} onChange={(__value: string) => setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            schedule_date:
                              __value,
                          }),
                        )} className="h-[52px] w-full rounded-[15px] border border-[#dfe1e4] bg-[#fafafa] px-3.5 text-[15px] outline-none focus:border-[#111820] focus:bg-white" />
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
                            "12:30",
                          )
                        }
                        className={`rounded-[15px] border px-3 py-3 text-left ${
                          form.service_time ===
                          "12:30"
                            ? "border-[#111820] bg-[#111820] text-white"
                            : "border-[#dfe1e4] bg-[#fafafa] text-[#66707d]"
                        }`}
                      >
                        <div className="text-[15px] font-bold">
                          12:30
                        </div>

                        <div
                          className={`mt-1 text-[10px] ${
                            form.service_time ===
                            "12:30"
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
                                  <Avatar
                                    src={member.avatar_url}
                                    initials={getInitials(member)}
                                    className={`h-9 w-9 rounded-[10px] text-[9px] font-bold ${
                                      selected
                                        ? "bg-white/10 text-white"
                                        : "bg-[#f0f1f2] text-[#4d5864]"
                                    }`}
                                  />

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
                      MATERIAL PICKER (тема из материалов)
                  ================================================= */}
                  <div>
                    <label className="mb-2 block px-1 text-[11px] font-bold text-[#65707d]">
                      {isRu
                        ? "Тема из материалов"
                        : "Thema aus Materialien"}
                    </label>

                    {form.material_id != null ? (
                      (() => {
                        const linked =
                          pickerMaterials.find(
                            (item) =>
                              item.id ===
                              form.material_id,
                          );

                        return (
                          <div className="flex items-center gap-2.5 rounded-[15px] border border-[#dfe1e4] bg-[#fafafa] px-4 py-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#111820] text-white">
                              <FileText
                                size={15}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-semibold text-[#111820]">
                                {linked?.title ??
                                  (isRu
                                    ? "Материал"
                                    : "Material")}
                              </div>

                              {linked?.folder_id !=
                                null && (
                                <div className="truncate text-[10px] text-[#9aa2ad]">
                                  {getPickerFolderPath(
                                    linked.folder_id,
                                  )}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={
                                clearPickerMaterial
                              }
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[#9aa2ad] active:bg-[#eceef0]"
                              aria-label={
                                isRu
                                  ? "Отвязать материал"
                                  : "Material trennen"
                              }
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="overflow-hidden rounded-[15px] border border-[#dfe1e4] bg-[#fafafa]">
                        {/* SEARCH */}
                        <div className="relative p-2">
                          <Search
                            size={15}
                            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#b1b7bf]"
                          />

                          <input
                            value={
                              materialSearch
                            }
                            onChange={(
                              event,
                            ) =>
                              setMaterialSearch(
                                event.target
                                  .value,
                              )
                            }
                            placeholder={
                              isRu
                                ? "Искать по названию файла..."
                                : "Nach Dateiname suchen..."
                            }
                            className="h-11 w-full rounded-[12px] border border-[#dfe1e4] bg-white pl-9 pr-4 text-[14px] outline-none placeholder:text-[#b1b7bf] focus:border-[#111820]"
                          />
                        </div>

                        {materialSearch.trim() ? (
                          /* =========================
                             ПОИСК ПО ВСЕМ ПАПКАМ
                          ========================== */
                          <div className="max-h-[260px] overflow-y-auto border-t border-[#e6e8ea] p-1.5">
                            {filteredPickerMaterials.length ===
                            0 ? (
                              <div className="px-3 py-6 text-center text-[12px] text-[#9aa2ad]">
                                {isRu
                                  ? "Ничего не найдено в материалах."
                                  : "Keine Materialien gefunden."}
                              </div>
                            ) : (
                              filteredPickerMaterials.map(
                                (material) => (
                                  <button
                                    key={
                                      material.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      selectPickerMaterial(
                                        material,
                                      )
                                    }
                                    className="flex w-full items-center gap-2.5 rounded-[11px] px-2.5 py-2.5 text-left active:bg-[#eceef0]"
                                  >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white text-[#4d5864] ring-1 ring-[#e6e8ea]">
                                      <FileText
                                        size={
                                          14
                                        }
                                      />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-[13px] font-semibold text-[#111820]">
                                        {
                                          material.title
                                        }
                                      </div>

                                      <div className="truncate text-[10px] text-[#9aa2ad]">
                                        {getPickerFolderPath(
                                          material.folder_id,
                                        ) ||
                                          material.file_name ||
                                          ""}
                                      </div>
                                    </div>
                                  </button>
                                ),
                              )
                            )}
                          </div>
                        ) : (
                          /* =========================
                             НАВИГАЦИЯ ПО ПАПКАМ
                          ========================== */
                          <div className="border-t border-[#e6e8ea]">
                            {/* BREADCRUMBS */}
                            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap px-2 py-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setPickerFolderId(
                                    null,
                                  )
                                }
                                className={`shrink-0 rounded-lg px-2 py-1 text-[11px] ${
                                  pickerFolderId ==
                                  null
                                    ? "font-bold text-[#111820]"
                                    : "text-[#8a929c]"
                                }`}
                              >
                                {isRu
                                  ? "Материалы"
                                  : "Materialien"}
                              </button>

                              {pickerBreadcrumbs.map(
                                (
                                  folder,
                                  index,
                                ) => (
                                  <div
                                    key={
                                      folder.id
                                    }
                                    className="flex shrink-0 items-center gap-1"
                                  >
                                    <span className="text-[#c7cbd1]">
                                      /
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPickerFolderId(
                                          folder.id,
                                        )
                                      }
                                      className={`rounded-lg px-2 py-1 text-[11px] ${
                                        index ===
                                        pickerBreadcrumbs.length -
                                          1
                                          ? "font-bold text-[#111820]"
                                          : "text-[#8a929c]"
                                      }`}
                                    >
                                      {(isRu
                                        ? folder.name_ru
                                        : folder.name_de) ||
                                        folder.name}
                                    </button>
                                  </div>
                                ),
                              )}
                            </div>

                            {/* LIST */}
                            <div className="max-h-[220px] overflow-y-auto p-1.5">
                              {pickerVisibleFolders.length ===
                                0 &&
                              pickerVisibleMaterials.length ===
                                0 ? (
                                <div className="px-3 py-6 text-center text-[12px] text-[#9aa2ad]">
                                  {isRu
                                    ? "Эта папка пуста."
                                    : "Dieser Ordner ist leer."}
                                </div>
                              ) : (
                                <>
                                  {pickerVisibleFolders.map(
                                    (folder) => (
                                      <button
                                        key={`folder-${folder.id}`}
                                        type="button"
                                        onClick={() =>
                                          setPickerFolderId(
                                            folder.id,
                                          )
                                        }
                                        className="flex w-full items-center gap-2.5 rounded-[11px] px-2.5 py-2.5 text-left active:bg-[#eceef0]"
                                      >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white text-[#4d5864] ring-1 ring-[#e6e8ea]">
                                          <BookOpen
                                            size={
                                              14
                                            }
                                          />
                                        </div>

                                        <span className="truncate text-[13px] font-semibold text-[#111820]">
                                          {(isRu
                                            ? folder.name_ru
                                            : folder.name_de) ||
                                            folder.name}
                                        </span>

                                        <ChevronRight
                                          size={
                                            15
                                          }
                                          className="ml-auto shrink-0 text-[#c7cbd1]"
                                        />
                                      </button>
                                    ),
                                  )}

                                  {pickerVisibleMaterials.map(
                                    (material) => (
                                      <button
                                        key={`material-${material.id}`}
                                        type="button"
                                        onClick={() =>
                                          selectPickerMaterial(
                                            material,
                                          )
                                        }
                                        className="flex w-full items-center gap-2.5 rounded-[11px] px-2.5 py-2.5 text-left active:bg-[#eceef0]"
                                      >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white text-[#4d5864] ring-1 ring-[#e6e8ea]">
                                          <FileText
                                            size={
                                              14
                                            }
                                          />
                                        </div>

                                        <span className="truncate text-[13px] font-semibold text-[#111820]">
                                          {
                                            material.title
                                          }
                                        </span>
                                      </button>
                                    ),
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="mt-1.5 px-1 text-[10px] text-[#9aa2ad]">
                      {isRu
                        ? "Выбери файл из раздела Материалы — название темы подставится автоматически, его можно поправить ниже."
                        : "Wähle eine Datei aus dem Bereich Materialien — das Thema wird automatisch übernommen und kann unten angepasst werden."}
                    </p>
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
                          12:30
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
                          ? "Для служения в 12:30 используется только русская тема."
                          : "Für den Gottesdienst um 12:30 wird nur das russische Thema verwendet."}
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
                        "12:30" &&
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