"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  FolderKanban,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Project = {
  id: number;
  title: string;
  description: string | null;
  status:
    | "planned"
    | "active"
    | "completed"
    | "archived";
  start_date: string | null;
  end_date: string | null;
};

type WorkItem = {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status:
    | "open"
    | "in_progress"
    | "completed";
  priority:
    | "low"
    | "normal"
    | "high"
    | "urgent";
  deadline: string | null;
  assigned_to: number | null;
};

type TeamMember = {
  id: number;
  first_name: string;
  last_name: string;
  status: "active" | "inactive";
};

type ChecklistItem = {
  id: number;
  work_item_id: number;
  title: string;
  is_completed: boolean;
  sort_order: number;
};

const statusConfig = {
  open: {
    label: "Offen",
    dot: "bg-[#9ca3af]",
  },
  in_progress: {
    label: "In Arbeit",
    dot: "bg-[#f59e0b]",
  },
  completed: {
    label: "Erledigt",
    dot: "bg-[#22c55e]",
  },
};

const projectStatusConfig = {
  planned: {
    label: "Geplant",
    className:
      "bg-[#f1f2f3] text-[#68727c]",
  },
  active: {
    label: "Aktiv",
    className:
      "bg-[#eef6ef] text-[#32804a]",
  },
  completed: {
    label: "Abgeschlossen",
    className:
      "bg-[#eef1f3] text-[#68727c]",
  },
  archived: {
    label: "Archiviert",
    className:
      "bg-[#f1f1f1] text-[#969da5]",
  },
};

const priorityConfig = {
  low: {
    label: "Niedrig",
    className: "text-[#7a8490]",
  },
  normal: {
    label: "Normal",
    className: "text-[#59636f]",
  },
  high: {
    label: "Hoch",
    className: "text-[#d97706]",
  },
  urgent: {
    label: "Dringend",
    className: "text-[#dc2626]",
  },
};

function formatDate(date: string | null) {
  if (!date) return "Kein Termin";

  return new Intl.DateTimeFormat(
    "de-DE",
    {
      day: "2-digit",
      month: "short",
    }
  ).format(
    new Date(`${date}T12:00:00`)
  );
}

function formatFullDate(
  date: string | null
) {
  if (!date) return "Kein Termin";

  return new Intl.DateTimeFormat(
    "de-DE",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(`${date}T12:00:00`)
  );
}

function formatProjectPeriod(
  project: Project
) {
  if (
    !project.start_date &&
    !project.end_date
  ) {
    return "Kein Zeitraum";
  }

  if (
    project.start_date &&
    project.end_date &&
    project.start_date !==
      project.end_date
  ) {
    return `${formatDate(
      project.start_date
    )} – ${formatDate(
      project.end_date
    )}`;
  }

  return formatDate(
    project.start_date ??
      project.end_date
  );
}

function isOverdue(
  date: string | null,
  status: WorkItem["status"]
) {
  if (!date || status === "completed")
    return false;

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const deadline = new Date(
    `${date}T12:00:00`
  );

  return deadline < today;
}

export default function WorkProjectPage() {
  const params = useParams<{
    id: string;
  }>();

  const router = useRouter();

  const rawId = params.id;

  const projectId = Number(
    Array.isArray(rawId)
      ? rawId[0]
      : rawId
  );

  const [project, setProject] =
    useState<Project | null>(null);

  const [items, setItems] =
    useState<WorkItem[]>([]);

  const [team, setTeam] =
    useState<TeamMember[]>([]);

  const [checklists, setChecklists] =
    useState<ChecklistItem[]>([]);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [selectedItem, setSelectedItem] =
    useState<WorkItem | null>(null);

  const [view, setView] =
    useState<
      "overview" | "board"
    >("overview");

  /* CREATE TASK */
  const [newTaskOpen, setNewTaskOpen] =
    useState(false);

  const [newTitle, setNewTitle] =
    useState("");

  const [
    newDescription,
    setNewDescription,
  ] = useState("");

  const [
    newDeadline,
    setNewDeadline,
  ] = useState("");

  const [
    newPriority,
    setNewPriority,
  ] =
    useState<WorkItem["priority"]>(
      "normal"
    );

  const [
    newAssignee,
    setNewAssignee,
  ] = useState("");

  /* EDIT TASK */
  const [editTaskOpen, setEditTaskOpen] =
    useState(false);

  const [editTitle, setEditTitle] =
    useState("");

  const [
    editDescription,
    setEditDescription,
  ] = useState("");

  const [
    editDeadline,
    setEditDeadline,
  ] = useState("");

  const [
    editPriority,
    setEditPriority,
  ] =
    useState<WorkItem["priority"]>(
      "normal"
    );

  const [
    editAssignee,
    setEditAssignee,
  ] = useState("");

  const [
    editStatus,
    setEditStatus,
  ] =
    useState<WorkItem["status"]>(
      "open"
    );

  /* DELETE TASK */
  const [
    deleteTaskOpen,
    setDeleteTaskOpen,
  ] = useState(false);

  const [
    deletingTask,
    setDeletingTask,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  /* CHECKLIST */
  const [
    checklistText,
    setChecklistText,
  ] = useState("");

  useEffect(() => {
    const sheetOpen =
      deleteOpen ||
      newTaskOpen ||
      editTaskOpen ||
      deleteTaskOpen ||
      Boolean(selectedItem);

    if (!sheetOpen) {
      document.body.style.overflow =
        "";
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    deleteOpen,
    newTaskOpen,
    editTaskOpen,
    deleteTaskOpen,
    selectedItem,
  ]);

  async function loadProject() {
    if (!Number.isFinite(projectId)) {
      setProject(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Fehler beim Prüfen der Admin-Rolle:",
          profileError
        );

        setIsAdmin(false);
      } else {
        setIsAdmin(
          profileData?.role ===
            "admin"
        );
      }
    } else {
      setIsAdmin(false);
    }

    const [
      {
        data: projectData,
        error: projectError,
      },
      {
        data: itemsData,
        error: itemsError,
      },
      {
        data: teamData,
        error: teamError,
      },
    ] = await Promise.all([
      supabase
        .from("work_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle(),

      supabase
        .from("work_items")
        .select("*")
        .eq(
          "project_id",
          projectId
        )
        .order("deadline", {
          ascending: true,
          nullsFirst: false,
        }),

      supabase
        .from("team_members")
        .select(
          "id, first_name, last_name, status"
        )
        .eq("status", "active")
        .order("first_name", {
          ascending: true,
        }),
    ]);

    if (projectError)
      console.error(projectError);

    if (itemsError)
      console.error(itemsError);

    if (teamError)
      console.error(teamError);

    if (!projectData) {
      setProject(null);
      setItems([]);
      setTeam([]);
      setChecklists([]);
      setLoading(false);
      return;
    }

    const loadedProject =
      projectData as Project;

    const loadedItems =
      (itemsData ?? []) as WorkItem[];

    setProject(loadedProject);
    setItems(loadedItems);
    setTeam(
      (teamData ?? []) as TeamMember[]
    );

    if (loadedItems.length > 0) {
      const {
        data: checklistData,
        error: checklistError,
      } = await supabase
        .from("work_checklist_items")
        .select("*")
        .in(
          "work_item_id",
          loadedItems.map(
            (item) => item.id
          )
        )
        .order("sort_order", {
          ascending: true,
        });

      if (checklistError)
        console.error(
          checklistError
        );

      setChecklists(
        (checklistData ??
          []) as ChecklistItem[]
      );
    } else {
      setChecklists([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function deleteProject() {
    if (
      !project ||
      !isAdmin ||
      deleting
    ) {
      return;
    }

    setDeleting(true);

    const { error } =
      await supabase
        .from("work_projects")
        .delete()
        .eq("id", project.id);

    if (error) {
      console.error(error);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setDeleteOpen(false);

    router.push("/work");
  }

  const stats = useMemo(() => {
    return {
      total: items.length,

      open: items.filter(
        (item) =>
          item.status === "open"
      ).length,

      progress: items.filter(
        (item) =>
          item.status ===
          "in_progress"
      ).length,

      completed: items.filter(
        (item) =>
          item.status ===
          "completed"
      ).length,

      urgent: items.filter(
        (item) =>
          item.priority === "urgent" &&
          item.status !==
            "completed"
      ).length,
    };
  }, [items]);

  const selectedChecklist =
    useMemo(() => {
      if (!selectedItem) return [];

      return checklists
        .filter(
          (item) =>
            item.work_item_id ===
            selectedItem.id
        )
        .sort(
          (a, b) =>
            a.sort_order -
            b.sort_order
        );
    }, [
      checklists,
      selectedItem,
    ]);

  function getMember(
    id: number | null
  ) {
    if (!id) return null;

    return (
      team.find(
        (member) =>
          member.id === id
      ) ?? null
    );
  }

  async function changeStatus(
    item: WorkItem,
    status: WorkItem["status"]
  ) {
    const { error } =
      await supabase
        .from("work_items")
        .update({
          status,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", item.id);

    if (error) {
      console.error(error);
      return;
    }

    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              status,
            }
          : entry
      )
    );

    setSelectedItem((current) =>
      current &&
      current.id === item.id
        ? {
            ...current,
            status,
          }
        : current
    );
  }

  function openEditTask(
    item: WorkItem
  ) {
    setEditTitle(item.title);
    setEditDescription(
      item.description ?? ""
    );
    setEditDeadline(
      item.deadline ?? ""
    );
    setEditPriority(item.priority);
    setEditAssignee(
      item.assigned_to
        ? String(item.assigned_to)
        : ""
    );
    setEditStatus(item.status);

    setEditTaskOpen(true);
  }

  async function updateTask() {
    if (
      !selectedItem ||
      !editTitle.trim() ||
      saving
    ) {
      return;
    }

    setSaving(true);

    const {
      data,
      error,
    } = await supabase
      .from("work_items")
      .update({
        title: editTitle.trim(),
        description:
          editDescription.trim() ||
          null,
        deadline:
          editDeadline || null,
        priority: editPriority,
        assigned_to:
          editAssignee
            ? Number(editAssignee)
            : null,
        status: editStatus,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", selectedItem.id)
      .select("*")
      .single();

    if (error) {
      console.error(error);
      setSaving(false);
      return;
    }

    const updatedItem =
      data as WorkItem;

    setItems((current) =>
      current
        .map((item) =>
          item.id ===
          updatedItem.id
            ? updatedItem
            : item
        )
        .sort((a, b) => {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;

          return a.deadline.localeCompare(
            b.deadline
          );
        })
    );

    setSelectedItem(
      updatedItem
    );

    setEditTaskOpen(false);
    setSaving(false);
  }

  async function deleteTask() {
    if (
      !selectedItem ||
      deletingTask
    ) {
      return;
    }

    setDeletingTask(true);

    const taskId =
      selectedItem.id;

    const { error } =
      await supabase
        .from("work_items")
        .delete()
        .eq("id", taskId);

    if (error) {
      console.error(error);
      setDeletingTask(false);
      return;
    }

    setItems((current) =>
      current.filter(
        (item) =>
          item.id !== taskId
      )
    );

    setChecklists((current) =>
      current.filter(
        (item) =>
          item.work_item_id !==
          taskId
      )
    );

    setSelectedItem(null);
    setDeleteTaskOpen(false);
    setDeletingTask(false);
  }

  async function toggleChecklist(
    item: ChecklistItem
  ) {
    const { error } =
      await supabase
        .from("work_checklist_items")
        .update({
          is_completed:
            !item.is_completed,
        })
        .eq("id", item.id);

    if (error) {
      console.error(error);
      return;
    }

    setChecklists((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              is_completed:
                !entry.is_completed,
            }
          : entry
      )
    );
  }

  async function addChecklistItem() {
    if (
      !selectedItem ||
      !checklistText.trim()
    ) {
      return;
    }

    const currentItems =
      checklists.filter(
        (item) =>
          item.work_item_id ===
          selectedItem.id
      );

    const {
      data,
      error,
    } = await supabase
      .from("work_checklist_items")
      .insert({
        work_item_id:
          selectedItem.id,
        title:
          checklistText.trim(),
        sort_order:
          currentItems.length,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setChecklists((current) => [
      ...current,
      data as ChecklistItem,
    ]);

    setChecklistText("");
  }

  async function createTask() {
    if (
      !project ||
      !newTitle.trim() ||
      saving
    ) {
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("work_items")
      .insert({
        project_id: project.id,
        title:
          newTitle.trim(),
        description:
          newDescription.trim() ||
          null,
        status: "open",
        priority: newPriority,
        deadline:
          newDeadline || null,
        assigned_to:
          newAssignee
            ? Number(newAssignee)
            : null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      setSaving(false);
      return;
    }

    const createdItem =
      data as WorkItem;

    setItems((current) =>
      [
        ...current,
        createdItem,
      ].sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;

        return a.deadline.localeCompare(
          b.deadline
        );
      })
    );

    setNewTitle("");
    setNewDescription("");
    setNewDeadline("");
    setNewPriority("normal");
    setNewAssignee("");
    setNewTaskOpen(false);
    setSaving(false);
  }

  const openItems = items.filter(
    (item) =>
      item.status === "open"
  );

  const progressItems =
    items.filter(
      (item) =>
        item.status ===
        "in_progress"
    );

  const completedItems =
    items.filter(
      (item) =>
        item.status ===
        "completed"
    );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 pb-32 pt-8">
        <div className="mx-auto max-w-[720px]">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-32 rounded-2xl bg-[#e7e8e9]" />
            <div className="h-36 rounded-[28px] bg-[#e7e8e9]" />
            <div className="h-24 rounded-[24px] bg-[#e7e8e9]" />
            <div className="h-24 rounded-[24px] bg-[#e7e8e9]" />
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-4 pb-32 pt-5">
        <div className="mx-auto max-w-[720px]">
          <header className="mb-7 flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.push("/work")
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dedfe1] bg-white text-[#303841] active:scale-95"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#969da5]">
                Team Work
              </p>

              <h1 className="text-[22px] font-bold text-[#111820]">
                Arbeit
              </h1>
            </div>
          </header>

          <section className="rounded-[26px] border border-[#e0e1e3] bg-white p-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f1f2] text-[#7c858e]">
              <FolderKanban size={21} />
            </div>

            <p className="mt-3 text-sm font-bold text-[#3c454f]">
              Arbeit nicht gefunden
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/work")
              }
              className="mt-5 rounded-[18px] bg-[#111820] px-5 py-3 text-sm font-bold text-white"
            >
              Zu allen Arbeiten
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#f7f7f5] px-4 pb-32 pt-5 sm:px-5 sm:pt-8">
        <div className="mx-auto max-w-[720px]">
          <header className="mb-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                router.push("/work")
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dedfe1] bg-white text-[#303841] active:scale-95"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 px-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#969da5]">
                Team Work
              </p>

              <h1 className="truncate text-[19px] font-bold text-[#111820]">
                Arbeit
              </h1>
            </div>

            <button
              type="button"
              onClick={() =>
                setNewTaskOpen(true)
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111820] text-white shadow-[0_5px_18px_rgba(17,24,32,0.18)] active:scale-95"
              aria-label="Aufgabe hinzufügen"
            >
              <Plus size={21} />
            </button>
          </header>

          <section className="overflow-hidden rounded-[30px] bg-[#111820] p-6 text-white">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <FolderKanban size={23} />
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/80">
                  {
                    projectStatusConfig[
                      project.status
                    ].label
                  }
                </span>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/work?edit=${project.id}`
                    )
                  }
                  className="hidden"
                />

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteOpen(true)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15 text-red-300 active:scale-95"
                    aria-label="Arbeit löschen"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            </div>

            <h2 className="max-w-[520px] text-[25px] font-bold leading-[1.1] tracking-[-0.035em]">
              {project.title}
            </h2>

            {project.description && (
              <p className="mt-3 max-w-[560px] text-[14px] leading-6 text-white/65">
                {project.description}
              </p>
            )}

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-white/85">
              <CalendarDays size={17} />
              {formatProjectPeriod(project)}
            </div>
          </section>

          <section className="mt-4 grid grid-cols-4 gap-2">
            {[
              {
                label: "Gesamt",
                value: stats.total,
                color: "text-[#111820]",
              },
              {
                label: "Offen",
                value: stats.open,
                color: "text-[#111820]",
              },
              {
                label: "Aktiv",
                value: stats.progress,
                color: "text-[#d97706]",
              },
              {
                label: "Fertig",
                value: stats.completed,
                color: "text-[#16a34a]",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[20px] border border-[#e1e2e4] bg-white p-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ba1a8]">
                  {stat.label}
                </p>

                <p
                  className={`mt-1 text-[22px] font-bold ${stat.color}`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </section>

          <div className="mt-6 flex rounded-2xl border border-[#dedfe1] bg-white p-1">
            <button
              type="button"
              onClick={() =>
                setView("overview")
              }
              className={`flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-bold ${
                view === "overview"
                  ? "bg-[#111820] text-white"
                  : "text-[#737c86]"
              }`}
            >
              Übersicht
            </button>

            <button
              type="button"
              onClick={() =>
                setView("board")
              }
              className={`flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-bold ${
                view === "board"
                  ? "bg-[#111820] text-white"
                  : "text-[#737c86]"
              }`}
            >
              Board
            </button>
          </div>

          {view === "overview" && (
            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ba1a8]">
                    Nächste Schritte
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-[#111820]">
                    Aufgaben
                  </h3>
                </div>

                <ListTodo
                  size={20}
                  className="text-[#8b939c]"
                />
              </div>

              <div className="space-y-3">
                {items.map((item) => {
                  const member =
                    getMember(
                      item.assigned_to
                    );

                  const overdue =
                    isOverdue(
                      item.deadline,
                      item.status
                    );

                  const itemChecklist =
                    checklists.filter(
                      (check) =>
                        check.work_item_id ===
                        item.id
                    );

                  const completedChecklist =
                    itemChecklist.filter(
                      (check) =>
                        check.is_completed
                    ).length;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setSelectedItem(
                          item
                        )
                      }
                      className="w-full rounded-[24px] border border-[#e0e1e3] bg-white p-4 text-left active:scale-[0.99]"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${statusConfig[item.status].dot}`}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[15px] font-bold leading-5 text-[#18202a]">
                              {item.title}
                            </p>

                            <ChevronRight
                              size={18}
                              className="mt-0.5 shrink-0 text-[#b0b5bb]"
                            />
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[11px] font-bold ${priorityConfig[item.priority].className}`}
                            >
                              {item.priority ===
                                "urgent" &&
                                "● "}

                              {
                                priorityConfig[
                                  item.priority
                                ].label
                              }
                            </span>

                            {item.deadline && (
                              <span
                                className={`flex items-center gap-1 text-[11px] font-semibold ${
                                  overdue
                                    ? "text-[#dc2626]"
                                    : "text-[#7c858e]"
                                }`}
                              >
                                <Clock3 size={12} />
                                {formatDate(
                                  item.deadline
                                )}
                              </span>
                            )}

                            {member && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#7c858e]">
                                <UserRound
                                  size={12}
                                />
                                {
                                  member.first_name
                                }
                              </span>
                            )}
                          </div>

                          {itemChecklist.length >
                            0 && (
                            <div className="mt-3 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eceef0]">
                                <div
                                  className="h-full rounded-full bg-[#111820]"
                                  style={{
                                    width: `${
                                      (completedChecklist /
                                        itemChecklist.length) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>

                              <span className="text-[10px] font-bold text-[#858d96]">
                                {
                                  completedChecklist
                                }
                                /
                                {
                                  itemChecklist.length
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {items.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-[#cfd2d5] bg-white p-7 text-center">
                  <ListTodo
                    size={21}
                    className="mx-auto text-[#7c858e]"
                  />

                  <p className="mt-3 text-sm font-bold text-[#3c454f]">
                    Noch keine Aufgaben
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  setNewTaskOpen(true)
                }
                className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-[#cfd2d5] bg-white text-sm font-bold text-[#59636f]"
              >
                <Plus size={18} />
                Aufgabe hinzufügen
              </button>
            </section>
          )}

          {view === "board" && (
            <section className="mt-6">
              <div className="mb-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ba1a8]">
                  Arbeitsstand
                </p>

                <h3 className="mt-1 text-lg font-bold">
                  Board
                </h3>
              </div>

              <div className="-mx-4 overflow-x-auto px-4 pb-4">
                <div className="flex w-max gap-3">
                  {[
                    {
                      key: "open" as const,
                      title: "Offen",
                      items:
                        openItems,
                    },
                    {
                      key: "in_progress" as const,
                      title: "In Arbeit",
                      items:
                        progressItems,
                    },
                    {
                      key: "completed" as const,
                      title: "Erledigt",
                      items:
                        completedItems,
                    },
                  ].map(
                    (column) => (
                      <div
                        key={
                          column.key
                        }
                        className="w-[285px] rounded-[26px] bg-[#eceeed] p-3"
                      >
                        <div className="mb-3 flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${statusConfig[column.key].dot}`}
                            />

                            <span className="text-sm font-bold text-[#3c454f]">
                              {
                                column.title
                              }
                            </span>
                          </div>

                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#818991]">
                            {
                              column.items
                                .length
                            }
                          </span>
                        </div>

                        <div className="space-y-2">
                          {column.items.map(
                            (item) => (
                              <button
                                key={
                                  item.id
                                }
                                type="button"
                                onClick={() =>
                                  setSelectedItem(
                                    item
                                  )
                                }
                                className="w-full rounded-[20px] border border-[#e1e2e4] bg-white p-4 text-left"
                              >
                                <p className="text-sm font-bold leading-5">
                                  {
                                    item.title
                                  }
                                </p>

                                <div className="mt-3 flex items-center justify-between">
                                  <span
                                    className={`text-[10px] font-bold ${priorityConfig[item.priority].className}`}
                                  >
                                    {
                                      priorityConfig[
                                        item.priority
                                      ].label
                                    }
                                  </span>

                                  {getMember(
                                    item.assigned_to
                                  ) && (
                                    <span className="text-[10px] font-semibold text-[#7e8790]">
                                      {
                                        getMember(
                                          item.assigned_to
                                        )!
                                          .first_name
                                      }
                                    </span>
                                  )}
                                </div>

                                {item.deadline && (
                                  <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#858d95]">
                                    <Clock3 size={11} />
                                    {formatDate(
                                      item.deadline
                                    )}
                                  </div>
                                )}
                              </button>
                            )
                          )}

                          {column.items
                            .length ===
                            0 && (
                            <div className="rounded-[20px] border border-dashed border-[#cdd0d3] px-4 py-7 text-center text-xs font-semibold text-[#9299a1]">
                              Keine Aufgaben
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* TASK DETAIL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Schließen"
            onClick={() =>
              setSelectedItem(null)
            }
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
          />

          <section className="absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-12px)] flex-col overflow-hidden rounded-t-[30px] bg-[#f7f7f5] shadow-[0_-10px_45px_rgba(0,0,0,0.16)] sm:left-1/2 sm:max-w-[620px] sm:-translate-x-1/2">
            <div className="px-5 pt-4">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-[#d4d6d8]" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9299a1]">
                    Aufgabe
                  </p>

                  <h2 className="text-[22px] font-bold leading-tight text-[#111820]">
                    {selectedItem.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedItem(
                      null
                    )
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dedfe1] bg-white text-[#555f69]"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedItem.description && (
                <p className="mt-4 text-sm leading-6 text-[#68727c]">
                  {
                    selectedItem.description
                  }
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-[18px] border border-[#e0e1e3] bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ba1a8]">
                    Status
                  </p>

                  <select
                    value={
                      selectedItem.status
                    }
                    onChange={(event) =>
                      changeStatus(
                        selectedItem,
                        event.target
                          .value as WorkItem["status"]
                      )
                    }
                    className="mt-1 w-full bg-transparent text-sm font-bold outline-none"
                  >
                    <option value="open">
                      Offen
                    </option>
                    <option value="in_progress">
                      In Arbeit
                    </option>
                    <option value="completed">
                      Erledigt
                    </option>
                  </select>
                </div>

                <div className="rounded-[18px] border border-[#e0e1e3] bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ba1a8]">
                    Priorität
                  </p>

                  <p
                    className={`mt-1 text-sm font-bold ${priorityConfig[selectedItem.priority].className}`}
                  >
                    {
                      priorityConfig[
                        selectedItem.priority
                      ].label
                    }
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-[18px] border border-[#e0e1e3] bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ba1a8]">
                    Termin
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                    <CalendarDays size={14} />
                    {formatFullDate(
                      selectedItem.deadline
                    )}
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#e0e1e3] bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ba1a8]">
                    Verantwortlich
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                    <UserRound size={14} />

                    {getMember(
                      selectedItem.assigned_to
                    )
                      ? getMember(
                          selectedItem.assigned_to
                        )!.first_name
                      : "Noch offen"}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9299a1]">
                      Checkliste
                    </p>

                    <h3 className="mt-1 text-base font-bold">
                      Was muss noch gemacht werden?
                    </h3>
                  </div>

                  <CheckCircle2
                    size={20}
                    className="text-[#818991]"
                  />
                </div>

                <div className="space-y-2">
                  {selectedChecklist.map(
                    (item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          toggleChecklist(
                            item
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-[18px] border border-[#e0e1e3] bg-white p-3 text-left"
                      >
                        {item.is_completed ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111820] text-white">
                            <Check size={14} />
                          </span>
                        ) : (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#c9cdd1]">
                            <Circle
                              size={12}
                              className="text-transparent"
                            />
                          </span>
                        )}

                        <span
                          className={`text-sm font-semibold ${
                            item.is_completed
                              ? "text-[#9aa0a6] line-through"
                              : "text-[#3b444d]"
                          }`}
                        >
                          {item.title}
                        </span>
                      </button>
                    )
                  )}
                </div>

                <div className="mt-2 flex gap-2">
                  <input
                    value={checklistText}
                    onChange={(event) =>
                      setChecklistText(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.preventDefault();
                        addChecklistItem();
                      }
                    }}
                    placeholder="Neuen Punkt hinzufügen..."
                    className="min-w-0 flex-1 rounded-[18px] border border-[#dedfe1] bg-white px-4 py-3 text-sm outline-none focus:border-[#111820]"
                  />

                  <button
                    type="button"
                    onClick={
                      addChecklistItem
                    }
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#111820] text-white"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    openEditTask(
                      selectedItem
                    )
                  }
                  className="flex h-13 items-center justify-center gap-2 rounded-[20px] border border-[#dedfe1] bg-white text-sm font-bold text-[#3d4650]"
                >
                  <Pencil size={16} />
                  Bearbeiten
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDeleteTaskOpen(true)
                  }
                  className="flex h-13 items-center justify-center gap-2 rounded-[20px] bg-red-50 text-sm font-bold text-red-600"
                >
                  <Trash2 size={16} />
                  Löschen
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  changeStatus(
                    selectedItem,
                    selectedItem.status ===
                      "completed"
                      ? "open"
                      : "completed"
                  )
                }
                className="mt-3 flex min-h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-[#111820] text-sm font-bold text-white"
              >
                {selectedItem.status ===
                "completed" ? (
                  <>
                    <Circle size={17} />
                    Wieder öffnen
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    Als erledigt markieren
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* EDIT TASK */}
      {editTaskOpen && selectedItem && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => {
              if (!saving)
                setEditTaskOpen(
                  false
                );
            }}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
          />

          <section className="absolute inset-x-0 bottom-0 mx-auto max-h-[calc(100dvh-12px)] max-w-[620px] overflow-hidden rounded-t-[30px] bg-[#f7f7f5]">
            <div className="max-h-[calc(100dvh-12px)] overflow-y-auto px-5 pb-8 pt-5">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#d4d6d8]" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9299a1]">
                    Aufgabe bearbeiten
                  </p>

                  <h2 className="mt-1 text-[22px] font-bold">
                    Aufgabe
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditTaskOpen(
                      false
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#555f69]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-[#59636f]">
                    Aufgabe
                  </label>

                  <input
                    value={editTitle}
                    onChange={(event) =>
                      setEditTitle(
                        event.target.value
                      )
                    }
                    className="h-13 w-full rounded-[18px] border border-[#dedfe1] bg-white px-4 text-sm outline-none focus:border-[#111820]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-[#59636f]">
                    Beschreibung
                  </label>

                  <textarea
                    value={editDescription}
                    onChange={(event) =>
                      setEditDescription(
                        event.target.value
                      )
                    }
                    rows={4}
                    className="w-full resize-none rounded-[18px] border border-[#dedfe1] bg-white px-4 py-3 text-sm outline-none focus:border-[#111820]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#59636f]">
                      Status
                    </label>

                    <select
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(
                          event.target.value as WorkItem["status"]
                        )
                      }
                      className="h-12 w-full rounded-[18px] border border-[#dedfe1] bg-white px-3 text-sm outline-none"
                    >
                      <option value="open">
                        Offen
                      </option>
                      <option value="in_progress">
                        In Arbeit
                      </option>
                      <option value="completed">
                        Erledigt
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#59636f]">
                      Priorität
                    </label>

                    <select
                      value={editPriority}
                      onChange={(event) =>
                        setEditPriority(
                          event.target.value as WorkItem["priority"]
                        )
                      }
                      className="h-12 w-full rounded-[18px] border border-[#dedfe1] bg-white px-3 text-sm outline-none"
                    >
                      <option value="low">
                        Niedrig
                      </option>
                      <option value="normal">
                        Normal
                      </option>
                      <option value="high">
                        Hoch
                      </option>
                      <option value="urgent">
                        Dringend
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-[#59636f]">
                    Deadline
                  </label>

                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(event) =>
                      setEditDeadline(
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-[18px] border border-[#dedfe1] bg-white px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-[#59636f]">
                    Verantwortlich
                  </label>

                  <select
                    value={editAssignee}
                    onChange={(event) =>
                      setEditAssignee(
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-[18px] border border-[#dedfe1] bg-white px-3 text-sm outline-none"
                  >
                    <option value="">
                      Noch offen
                    </option>

                    {team.map(
                      (member) => (
                        <option
                          key={member.id}
                          value={
                            member.id
                          }
                        >
                          {
                            member.first_name
                          }{" "}
                          {
                            member.last_name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={
                    !editTitle.trim() ||
                    saving
                  }
                  onClick={updateTask}
                  className="flex h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-[#111820] text-sm font-bold text-white disabled:opacity-40"
                >
                  <Pencil size={17} />

                  {saving
                    ? "Wird gespeichert..."
                    : "Änderungen speichern"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* NEW TASK */}
      {newTaskOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => {
              if (!saving)
                setNewTaskOpen(
                  false
                );
            }}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
          />

          <section className="absolute inset-x-0 bottom-0 mx-auto max-h-[calc(100dvh-12px)] max-w-[620px] overflow-hidden rounded-t-[30px] bg-[#f7f7f5]">
            <div className="max-h-[calc(100dvh-12px)] overflow-y-auto px-5 pb-8 pt-5">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#d4d6d8]" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9299a1]">
                    Team Work
                  </p>

                  <h2 className="mt-1 text-[22px] font-bold">
                    Neue Aufgabe
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setNewTaskOpen(
                      false
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#555f69]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-[#59636f]">
                    Aufgabe
                  </label>

                  <input
                    value={newTitle}
                    onChange={(event) =>
                      setNewTitle(
                        event.target.value
                      )
                    }
                    placeholder="z. B. Weihnachtsdeko besorgen"
                    autoFocus
                    className="h-13 w-full rounded-[18px] border border-[#dedfe1] bg-white px-4 text-sm outline-none focus:border-[#111820]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-[#59636f]">
                    Beschreibung
                  </label>

                  <textarea
                    value={
                      newDescription
                    }
                    onChange={(event) =>
                      setNewDescription(
                        event.target.value
                      )
                    }
                    placeholder="Was genau soll gemacht werden?"
                    rows={4}
                    className="w-full resize-none rounded-[18px] border border-[#dedfe1] bg-white px-4 py-3 text-sm outline-none focus:border-[#111820]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#59636f]">
                      Deadline
                    </label>

                    <input
                      type="date"
                      value={
                        newDeadline
                      }
                      onChange={(event) =>
                        setNewDeadline(
                          event.target
                            .value
                        )
                      }
                      className="h-12 w-full rounded-[18px] border border-[#dedfe1] bg-white px-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#59636f]">
                      Priorität
                    </label>

                    <select
                      value={
                        newPriority
                      }
                      onChange={(event) =>
                        setNewPriority(
                          event.target
                            .value as WorkItem["priority"]
                        )
                      }
                      className="h-12 w-full rounded-[18px] border border-[#dedfe1] bg-white px-3 text-sm outline-none"
                    >
                      <option value="low">
                        Niedrig
                      </option>
                      <option value="normal">
                        Normal
                      </option>
                      <option value="high">
                        Hoch
                      </option>
                      <option value="urgent">
                        Dringend
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-[#59636f]">
                    Verantwortlich
                  </label>

                  <select
                    value={
                      newAssignee
                    }
                    onChange={(event) =>
                      setNewAssignee(
                        event.target
                          .value
                      )
                    }
                    className="h-12 w-full rounded-[18px] border border-[#dedfe1] bg-white px-3 text-sm outline-none"
                  >
                    <option value="">
                      Noch offen
                    </option>

                    {team.map(
                      (member) => (
                        <option
                          key={
                            member.id
                          }
                          value={
                            member.id
                          }
                        >
                          {
                            member.first_name
                          }{" "}
                          {
                            member.last_name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={
                    saving ||
                    !newTitle.trim()
                  }
                  onClick={
                    createTask
                  }
                  className="flex h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-[#111820] text-sm font-bold text-white disabled:opacity-40"
                >
                  <Plus size={18} />

                  {saving
                    ? "Wird erstellt..."
                    : "Aufgabe erstellen"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* DELETE TASK */}
      {deleteTaskOpen &&
        selectedItem && (
          <div className="fixed inset-0 z-[100]">
            <button
              type="button"
              aria-label="Schließen"
              disabled={
                deletingTask
              }
              onClick={() => {
                if (
                  !deletingTask
                )
                  setDeleteTaskOpen(
                    false
                  );
              }}
              className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            />

            <section className="absolute inset-x-0 bottom-0 mx-auto max-w-[620px] overflow-hidden rounded-t-[32px] bg-white">
              <div className="px-5 pb-6 pt-5">
                <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#d8dadd]" />

                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Trash2 size={21} />
                  </div>

                  <button
                    type="button"
                    disabled={
                      deletingTask
                    }
                    onClick={() =>
                      setDeleteTaskOpen(
                        false
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f3] text-[#69727b]"
                  >
                    <X size={18} />
                  </button>
                </div>

                <h2 className="mt-5 text-[23px] font-bold">
                  Aufgabe löschen?
                </h2>

                <p className="mt-2 text-[15px] leading-6 text-[#68727c]">
                  Möchtest du{" "}
                  <span className="font-bold text-[#303841]">
                    „
                    {
                      selectedItem.title
                    }
                    “
                  </span>{" "}
                  wirklich löschen?
                </p>

                <div className="mt-5 rounded-[20px] border border-red-100 bg-red-50 px-4 py-4">
                  <p className="text-[13px] font-bold text-red-700">
                    Die Aufgabe wird
                    dauerhaft entfernt.
                  </p>

                  <p className="mt-1 text-[12px] leading-5 text-red-600/85">
                    Die zugehörige
                    Checkliste wird
                    ebenfalls entfernt.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={
                      deletingTask
                    }
                    onClick={() =>
                      setDeleteTaskOpen(
                        false
                      )
                    }
                    className="h-13 rounded-[19px] border border-[#dedfe1] bg-white text-sm font-bold text-[#59636f]"
                  >
                    Abbrechen
                  </button>

                  <button
                    type="button"
                    disabled={
                      deletingTask
                    }
                    onClick={
                      deleteTask
                    }
                    className="flex h-13 items-center justify-center gap-2 rounded-[19px] bg-red-600 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <Trash2 size={16} />

                    {deletingTask
                      ? "Wird gelöscht..."
                      : "Löschen"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

      {/* DELETE PROJECT */}
      {deleteOpen && isAdmin && (
        <div className="fixed inset-0 z-[110]">
          <button
            type="button"
            aria-label="Schließen"
            disabled={deleting}
            onClick={() => {
              if (!deleting)
                setDeleteOpen(
                  false
                );
            }}
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
          />

          <section className="absolute inset-x-0 bottom-0 mx-auto max-w-[620px] overflow-hidden rounded-t-[32px] bg-white">
            <div className="px-5 pb-6 pt-5">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#d8dadd]" />

              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Trash2 size={21} />
                </div>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() =>
                    setDeleteOpen(
                      false
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f3] text-[#69727b]"
                >
                  <X size={18} />
                </button>
              </div>

              <h2 className="mt-5 text-[23px] font-bold">
                Arbeit löschen?
              </h2>

              <p className="mt-2 text-[15px] leading-6 text-[#68727c]">
                Möchtest du{" "}
                <span className="font-bold text-[#303841]">
                  „{project.title}“
                </span>{" "}
                wirklich löschen?
              </p>

              <div className="mt-5 rounded-[20px] border border-red-100 bg-red-50 px-4 py-4">
                <p className="text-[13px] font-bold text-red-700">
                  Diese Aktion kann nicht
                  rückgängig gemacht
                  werden.
                </p>

                <p className="mt-1 text-[12px] leading-5 text-red-600/85">
                  Alle Aufgaben und
                  Checklisten dieser
                  Arbeit werden
                  ebenfalls gelöscht.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() =>
                    setDeleteOpen(
                      false
                    )
                  }
                  className="h-13 rounded-[19px] border border-[#dedfe1] bg-white text-sm font-bold text-[#59636f]"
                >
                  Abbrechen
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={
                    deleteProject
                  }
                  className="flex h-13 items-center justify-center gap-2 rounded-[19px] bg-red-600 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Trash2 size={16} />

                  {deleting
                    ? "Wird gelöscht..."
                    : "Endgültig löschen"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}