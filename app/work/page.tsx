"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  FolderKanban,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Project = {
  id: number;
  title: string;
  description: string | null;
  status: "planned" | "active" | "completed" | "archived";
  start_date: string | null;
  end_date: string | null;
};

type WorkItem = {
  id: number;
  project_id: number;
  title: string;
  status: "open" | "in_progress" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  deadline: string | null;
  assigned_to: number | null;
};

type ProjectWithStats = Project & {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
};

const projectStatusConfig = {
  planned: {
    label: "Geplant",
    className: "bg-white/[0.07] text-slate-300",
  },
  active: {
    label: "Aktiv",
    className: "bg-emerald-400/10 text-emerald-300",
  },
  completed: {
    label: "Abgeschlossen",
    className: "bg-blue-400/10 text-blue-300",
  },
  archived: {
    label: "Archiviert",
    className: "bg-white/[0.07] text-slate-400",
  },
};

function formatDate(date: string | null) {
  if (!date) return null;

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatProjectPeriod(project: Project) {
  if (!project.start_date && !project.end_date) {
    return "Kein Zeitraum festgelegt";
  }

  if (
    project.start_date &&
    project.end_date &&
    project.start_date === project.end_date
  ) {
    return formatDate(project.start_date);
  }

  if (project.start_date && project.end_date) {
    return `${formatDate(project.start_date)} – ${formatDate(
      project.end_date
    )}`;
  }

  if (project.start_date) {
    return `Ab ${formatDate(project.start_date)}`;
  }

  return `Bis ${formatDate(project.end_date)}`;
}

export default function WorkPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);

  const [selectedProject, setSelectedProject] =
    useState<ProjectWithStats | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] =
    useState<Project["status"]>("active");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const sheetOpen =
      newProjectOpen ||
      editProjectOpen ||
      deleteProjectOpen;

    if (!sheetOpen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    newProjectOpen,
    editProjectOpen,
    deleteProjectOpen,
  ]);

  async function loadProjects() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      setIsAdmin(profileData?.role === "admin");
    } else {
      setIsAdmin(false);
    }

    const {
      data: projectData,
      error: projectError,
    } = await supabase
      .from("work_projects")
      .select("*")
      .order("status", { ascending: true })
      .order("start_date", {
        ascending: true,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (projectError) {
      console.error(
        "Fehler beim Laden der Arbeiten:",
        projectError
      );

      setProjects([]);
      setLoading(false);
      return;
    }

    const loadedProjects =
      (projectData ?? []) as Project[];

    if (loadedProjects.length === 0) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const projectIds =
      loadedProjects.map(
        (project) => project.id
      );

    const {
      data: itemsData,
      error: itemsError,
    } = await supabase
      .from("work_items")
      .select(
        "id, project_id, title, status, priority, deadline, assigned_to"
      )
      .in("project_id", projectIds);

    if (itemsError) {
      console.error(
        "Fehler beim Laden der Aufgaben:",
        itemsError
      );
    }

    const items =
      (itemsData ?? []) as WorkItem[];

    const projectsWithStats =
      loadedProjects.map((project) => {
        const projectItems =
          items.filter(
            (item) =>
              item.project_id === project.id
          );

        return {
          ...project,
          total: projectItems.length,
          open: projectItems.filter(
            (item) =>
              item.status === "open"
          ).length,
          inProgress: projectItems.filter(
            (item) =>
              item.status === "in_progress"
          ).length,
          completed: projectItems.filter(
            (item) =>
              item.status === "completed"
          ).length,
        };
      });

    setProjects(projectsWithStats);
    setLoading(false);
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const activeProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.status === "active"
      ),
    [projects]
  );

  const otherProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.status !== "active"
      ),
    [projects]
  );

  async function createProject() {
    const title = newTitle.trim();

    if (!title || saving) return;

    if (
      newStartDate &&
      newEndDate &&
      newEndDate < newStartDate
    ) {
      setErrorMessage(
        "Das Enddatum darf nicht vor dem Startdatum liegen."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage(
        "Kein eingeloggter Benutzer gefunden."
      );
      setSaving(false);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("work_projects")
      .insert({
        title,
        description:
          newDescription.trim() || null,
        status: "planned",
        start_date:
          newStartDate || null,
        end_date:
          newEndDate || null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      setErrorMessage(
        "Die Arbeit konnte nicht erstellt werden."
      );
      setSaving(false);
      return;
    }

    setNewTitle("");
    setNewDescription("");
    setNewStartDate("");
    setNewEndDate("");
    setSaving(false);
    setNewProjectOpen(false);

    if (data?.id) {
      router.push(`/work/${data.id}`);
      return;
    }

    await loadProjects();
  }

  function openEditProject(
    project: ProjectWithStats
  ) {
    setSelectedProject(project);
    setEditTitle(project.title);
    setEditDescription(
      project.description ?? ""
    );
    setEditStatus(project.status);
    setEditStartDate(
      project.start_date ?? ""
    );
    setEditEndDate(
      project.end_date ?? ""
    );
    setErrorMessage("");
    setEditProjectOpen(true);
  }

  async function updateProject() {
    if (
      !selectedProject ||
      !editTitle.trim() ||
      saving
    ) {
      return;
    }

    if (
      editStartDate &&
      editEndDate &&
      editEndDate < editStartDate
    ) {
      setErrorMessage(
        "Das Enddatum darf nicht vor dem Startdatum liegen."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const {
      data,
      error,
    } = await supabase
      .from("work_projects")
      .update({
        title: editTitle.trim(),
        description:
          editDescription.trim() || null,
        status: editStatus,
        start_date:
          editStartDate || null,
        end_date:
          editEndDate || null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", selectedProject.id)
      .select("*")
      .single();

    if (error) {
      console.error(error);
      setErrorMessage(
        "Die Arbeit konnte nicht gespeichert werden."
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditProjectOpen(false);
    setSelectedProject(null);

    await loadProjects();
  }

  function openDeleteProject(
    project: ProjectWithStats
  ) {
    if (!isAdmin) return;

    setSelectedProject(project);
    setDeleteProjectOpen(true);
  }

  async function deleteProject() {
    if (
      !selectedProject ||
      !isAdmin ||
      deleting
    ) {
      return;
    }

    setDeleting(true);

    const { error } = await supabase
      .from("work_projects")
      .delete()
      .eq("id", selectedProject.id);

    if (error) {
      console.error(error);
      setDeleting(false);
      return;
    }

    setProjects((current) =>
      current.filter(
        (project) =>
          project.id !==
          selectedProject.id
      )
    );

    setDeleting(false);
    setDeleteProjectOpen(false);
    setSelectedProject(null);
  }

  function ProjectCard({
    project,
  }: {
    project: ProjectWithStats;
  }) {
    const status =
      projectStatusConfig[
        project.status
      ];

    const progress =
      project.total > 0
        ? Math.round(
            (project.completed /
              project.total) *
              100
          )
        : 0;

    const isCompleted =
      progress === 100 &&
      project.total > 0;

    return (
      <div className="group relative overflow-hidden rounded-[28px] bg-[#111820] text-white shadow-[0_12px_30px_rgba(17,24,32,0.12)]">
        <Link
          href={`/work/${project.id}`}
          className="block active:scale-[0.99]"
        >
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-white/[0.08]">
                <FolderKanban
                  size={22}
                  strokeWidth={1.8}
                />
              </div>

              <div className="min-w-0 flex-1 pr-10">
                <div className="flex items-start gap-2">
                  <h3 className="min-w-0 flex-1 text-[17px] font-semibold leading-[1.25] tracking-[-0.01em]">
                    {project.title}
                  </h3>

                  <ChevronRight
                    size={21}
                    className="mt-0.5 shrink-0 text-slate-500"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${status.className}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        project.status ===
                        "active"
                          ? "bg-emerald-400"
                          : project.status ===
                            "completed"
                          ? "bg-blue-400"
                          : "bg-slate-400"
                      }`}
                    />

                    {status.label}
                  </span>

                  {(project.start_date ||
                    project.end_date) && (
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <CalendarDays
                        size={13}
                      />
                      {formatProjectPeriod(
                        project
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {project.description && (
              <p className="mt-4 line-clamp-2 text-[13px] leading-[1.55] text-slate-400">
                {project.description}
              </p>
            )}

            <div className="mt-5">
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-slate-400">
                    Fortschritt
                  </p>

                  <p className="mt-0.5 text-[13px] font-medium text-slate-200">
                    {project.completed} von{" "}
                    {project.total} Aufgaben
                    erledigt
                  </p>
                </div>

                <span
                  className={`text-[15px] font-semibold ${
                    isCompleted
                      ? "text-emerald-300"
                      : "text-white"
                  }`}
                >
                  {progress}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCompleted
                      ? "bg-emerald-300"
                      : "bg-emerald-400"
                  }`}
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-[20px] border border-white/[0.06] bg-white/[0.035]">
              <div className="px-1.5 py-3 text-center">
                <div className="flex justify-center text-slate-300">
                  <ListTodo size={17} />
                </div>

                <div className="mt-1.5 text-[17px] font-semibold">
                  {project.total}
                </div>

                <div className="mt-0.5 text-[10px] text-slate-500">
                  Aufgaben
                </div>
              </div>

              <div className="border-l border-white/[0.06] px-1.5 py-3 text-center">
                <div className="flex justify-center text-slate-400">
                  <Circle size={16} />
                </div>

                <div className="mt-1.5 text-[17px] font-semibold text-slate-200">
                  {project.open}
                </div>

                <div className="mt-0.5 text-[10px] text-slate-500">
                  Offen
                </div>
              </div>

              <div className="border-l border-white/[0.06] px-1.5 py-3 text-center">
                <div className="flex justify-center text-amber-400">
                  <Clock3 size={17} />
                </div>

                <div className="mt-1.5 text-[17px] font-semibold text-amber-300">
                  {project.inProgress}
                </div>

                <div className="mt-0.5 text-[10px] text-slate-500">
                  Aktiv
                </div>
              </div>

              <div className="border-l border-white/[0.06] px-1.5 py-3 text-center">
                <div className="flex justify-center text-emerald-400">
                  <CheckCircle2 size={17} />
                </div>

                <div className="mt-1.5 text-[17px] font-semibold text-emerald-300">
                  {project.completed}
                </div>

                <div className="mt-0.5 text-[10px] text-slate-500">
                  Fertig
                </div>
              </div>
            </div>
          </div>
        </Link>

        <div className="absolute right-4 top-4 flex gap-2">
          <button
            type="button"
            onClick={() =>
              openEditProject(project)
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/80 active:scale-95"
            aria-label="Arbeit bearbeiten"
          >
            <Pencil size={15} />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() =>
                openDeleteProject(project)
              }
              className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 text-red-300 active:scale-95"
              aria-label="Arbeit löschen"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#111820]">
      <div className="mx-auto min-h-screen w-full max-w-[720px] px-4 pb-28">
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#111820] active:scale-95"
              aria-label="Zurück"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Team Work
              </p>

              <h1 className="mt-0.5 text-[24px] font-bold tracking-tight">
                Arbeit
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setNewProjectOpen(true)
            }
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111820] text-white active:scale-95"
            aria-label="Neue Arbeit"
          >
            <Plus size={21} />
          </button>
        </header>

        <section className="mb-5">
          <p className="max-w-[560px] text-[14px] leading-6 text-slate-500">
            Hier seht ihr alle gemeinsamen
            Arbeiten, Projekte und
            Vorbereitungen des Teams.
          </p>
        </section>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-[28px] bg-[#111820] p-5"
              >
                <div className="flex gap-3">
                  <div className="h-12 w-12 rounded-[17px] bg-white/[0.08]" />

                  <div className="flex-1">
                    <div className="h-5 w-3/5 rounded bg-white/[0.08]" />
                    <div className="mt-3 h-4 w-2/5 rounded bg-white/[0.08]" />
                  </div>
                </div>

                <div className="mt-5 h-2 rounded-full bg-white/[0.08]" />

                <div className="mt-5 h-16 rounded-[20px] bg-white/[0.05]" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <section className="rounded-[28px] bg-white px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111820] text-white">
              <FolderKanban size={25} />
            </div>

            <h2 className="mt-5 text-[19px] font-semibold">
              Noch keine Arbeiten
            </h2>

            <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-5 text-slate-500">
              Erstellt eure erste gemeinsame
              Arbeit, zum Beispiel für einen
              Event, eine Freizeit oder ein
              anderes Vorhaben.
            </p>

            <button
              type="button"
              onClick={() =>
                setNewProjectOpen(true)
              }
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#111820] px-5 text-[13px] font-semibold text-white active:scale-[0.98]"
            >
              <Plus size={17} />
              Neue Arbeit
            </button>
          </section>
        ) : (
          <div className="space-y-7">
            {activeProjects.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between px-1">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                      Aktuell
                    </p>

                    <h2 className="mt-1 text-[18px] font-semibold">
                      Laufende Arbeiten
                    </h2>
                  </div>

                  <div className="flex h-8 items-center gap-1 rounded-full bg-white px-2.5 text-[11px] text-slate-400">
                    <Circle
                      size={8}
                      fill="currentColor"
                      className="text-emerald-500"
                    />
                    {activeProjects.length}
                  </div>
                </div>

                <div className="space-y-3">
                  {activeProjects.map(
                    (project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                      />
                    )
                  )}
                </div>
              </section>
            )}

            <section>
              <div className="mb-3 px-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                  Übersicht
                </p>

                <h2 className="mt-1 text-[18px] font-semibold">
                  Alle Arbeiten
                </h2>
              </div>

              <div className="space-y-3">
                {otherProjects.length > 0 ? (
                  otherProjects.map(
                    (project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                      />
                    )
                  )
                ) : activeProjects.length > 0 ? (
                  <div className="rounded-[24px] bg-white px-5 py-6 text-center">
                    <p className="text-[13px] text-slate-400">
                      Keine weiteren Arbeiten
                      vorhanden.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <button
              type="button"
              onClick={() =>
                setNewProjectOpen(true)
              }
              className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-slate-300 bg-transparent py-4 text-[13px] font-semibold text-slate-500 active:scale-[0.99]"
            >
              <Plus size={17} />
              Neue Arbeit
            </button>
          </div>
        )}
      </div>

      {/* NEW PROJECT */}
      {newProjectOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => {
              if (!saving)
                setNewProjectOpen(false);
            }}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
          />

          <section className="absolute inset-x-0 bottom-0 mx-auto max-h-[calc(100dvh-12px)] max-w-[620px] overflow-hidden rounded-t-[30px] bg-white shadow-[0_-10px_45px_rgba(0,0,0,0.16)]">
            <div className="max-h-[calc(100dvh-12px)] overflow-y-auto px-5 pb-8 pt-5">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    Team Work
                  </p>

                  <h2 className="mt-1 text-[22px] font-bold">
                    Neue Arbeit
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!saving)
                      setNewProjectOpen(
                        false
                      );
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f7f5] text-slate-500 active:scale-95"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-[12px] font-semibold text-slate-600">
                    Titel
                  </label>

                  <input
                    value={newTitle}
                    onChange={(event) =>
                      setNewTitle(
                        event.target.value
                      )
                    }
                    placeholder="z. B. Weihnachtsabend 2026"
                    autoFocus
                    className="h-12 w-full rounded-2xl bg-[#f7f7f5] px-4 text-[14px] outline-none focus:ring-2 focus:ring-[#111820]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-semibold text-slate-600">
                    Beschreibung
                  </label>

                  <textarea
                    value={newDescription}
                    onChange={(event) =>
                      setNewDescription(
                        event.target.value
                      )
                    }
                    placeholder="Worum geht es bei dieser Arbeit?"
                    rows={4}
                    className="w-full resize-none rounded-2xl bg-[#f7f7f5] px-4 py-3 text-[14px] leading-5 outline-none focus:ring-2 focus:ring-[#111820]/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-slate-600">
                      Start
                    </label>

                    <div className="relative">
                      <CalendarDays
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="date"
                        value={newStartDate}
                        onChange={(event) =>
                          setNewStartDate(
                            event.target.value
                          )
                        }
                        className="h-12 w-full rounded-2xl bg-[#f7f7f5] pl-11 pr-3 text-[13px] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-slate-600">
                      Ende
                    </label>

                    <div className="relative">
                      <Clock3
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="date"
                        value={newEndDate}
                        onChange={(event) =>
                          setNewEndDate(
                            event.target.value
                          )
                        }
                        className="h-12 w-full rounded-2xl bg-[#f7f7f5] pl-11 pr-3 text-[13px] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="button"
                  disabled={
                    !newTitle.trim() ||
                    saving
                  }
                  onClick={createProject}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#111820] text-[14px] font-semibold text-white disabled:opacity-40"
                >
                  <Plus size={18} />
                  {saving
                    ? "Wird erstellt..."
                    : "Arbeit erstellen"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* EDIT PROJECT */}
      {editProjectOpen &&
        selectedProject && (
          <div className="fixed inset-0 z-[60]">
            <button
              type="button"
              aria-label="Schließen"
              onClick={() => {
                if (!saving)
                  setEditProjectOpen(
                    false
                  );
              }}
              className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            />

            <section className="absolute inset-x-0 bottom-0 mx-auto max-h-[calc(100dvh-12px)] max-w-[620px] overflow-hidden rounded-t-[30px] bg-white">
              <div className="max-h-[calc(100dvh-12px)] overflow-y-auto px-5 pb-8 pt-5">
                <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                      Arbeit bearbeiten
                    </p>

                    <h2 className="mt-1 text-[22px] font-bold">
                      Arbeit
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!saving)
                        setEditProjectOpen(
                          false
                        );
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f7f5] text-slate-500"
                  >
                    <X size={19} />
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-slate-600">
                      Titel
                    </label>

                    <input
                      value={editTitle}
                      onChange={(event) =>
                        setEditTitle(
                          event.target.value
                        )
                      }
                      className="h-12 w-full rounded-2xl bg-[#f7f7f5] px-4 text-[14px] outline-none focus:ring-2 focus:ring-[#111820]/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-slate-600">
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
                      className="w-full resize-none rounded-2xl bg-[#f7f7f5] px-4 py-3 text-[14px] leading-5 outline-none focus:ring-2 focus:ring-[#111820]/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-slate-600">
                      Status
                    </label>

                    <select
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(
                          event.target.value as Project["status"]
                        )
                      }
                      className="h-12 w-full rounded-2xl bg-[#f7f7f5] px-4 text-[14px] outline-none"
                    >
                      <option value="planned">
                        Geplant
                      </option>
                      <option value="active">
                        Aktiv
                      </option>
                      <option value="completed">
                        Abgeschlossen
                      </option>
                      <option value="archived">
                        Archiviert
                      </option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-[12px] font-semibold text-slate-600">
                        Start
                      </label>

                      <input
                        type="date"
                        value={editStartDate}
                        onChange={(event) =>
                          setEditStartDate(
                            event.target.value
                          )
                        }
                        className="h-12 w-full rounded-2xl bg-[#f7f7f5] px-3 text-[13px] outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[12px] font-semibold text-slate-600">
                        Ende
                      </label>

                      <input
                        type="date"
                        value={editEndDate}
                        onChange={(event) =>
                          setEditEndDate(
                            event.target.value
                          )
                        }
                        className="h-12 w-full rounded-2xl bg-[#f7f7f5] px-3 text-[13px] outline-none"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                      {errorMessage}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={
                      !editTitle.trim() ||
                      saving
                    }
                    onClick={updateProject}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#111820] text-[14px] font-semibold text-white disabled:opacity-40"
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

      {/* DELETE PROJECT */}
      {deleteProjectOpen &&
        selectedProject &&
        isAdmin && (
          <div className="fixed inset-0 z-[100]">
            <button
              type="button"
              aria-label="Schließen"
              disabled={deleting}
              onClick={() => {
                if (!deleting)
                  setDeleteProjectOpen(
                    false
                  );
              }}
              className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            />

            <section className="absolute inset-x-0 bottom-0 mx-auto max-h-[calc(100dvh-12px)] max-w-[620px] overflow-hidden rounded-t-[32px] bg-white shadow-[0_-15px_60px_rgba(0,0,0,0.25)]">
              <div className="px-5 pb-5 pt-5">
                <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#d8dadd]" />

                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Trash2 size={21} />
                  </div>

                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() =>
                      setDeleteProjectOpen(
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
                    „{selectedProject.title}“
                  </span>{" "}
                  wirklich löschen?
                </p>

                <div className="mt-5 rounded-[20px] border border-red-100 bg-red-50 px-4 py-4">
                  <p className="text-[13px] font-bold text-red-700">
                    Diese Aktion kann nicht
                    rückgängig gemacht werden.
                  </p>

                  <p className="mt-1 text-[12px] leading-5 text-red-600/85">
                    Alle Aufgaben,
                    Checklisten und
                    zugehörigen Daten dieser
                    Arbeit werden ebenfalls
                    gelöscht.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() =>
                      setDeleteProjectOpen(
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
                    onClick={deleteProject}
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
    </main>
  );
}