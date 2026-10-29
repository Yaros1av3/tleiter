"use client";

import DatePicker from "@/components/DatePicker";

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
  Share2,
  Bell,
  Hand,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { markWorkSeen } from "@/lib/useWorkUnread";

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
    dot: "bg-[#a2a6a7]",
  },
  in_progress: {
    dot: "bg-[#f59e0b]",
  },
  completed: {
    dot: "bg-[#22c55e]",
  },
};

const projectStatusConfig = {
  planned: {
    className:
      "bg-[#f3efe3] text-[#6e7574]",
  },
  active: {
    className:
      "bg-[#eef6ef] text-[#32804a]",
  },
  completed: {
    className:
      "bg-[#f4f4eb] text-[#6e7574]",
  },
  archived: {
    className:
      "bg-[#f7f4e9] text-[#9ca09d]",
  },
};

const priorityConfig = {
  low: {
    className: "text-[#7f796a]",
  },
  normal: {
    className: "text-[#5f6667]",
  },
  high: {
    className: "text-[#d97706]",
  },
  urgent: {
    className: "text-[#dc2626]",
  },
};

function formatDate(
  date: string | null,
  language: "de" | "ru",
  noDate: string
) {
  if (!date) return noDate;

  return new Intl.DateTimeFormat(
    language === "ru" ? "ru-RU" : "de-DE",
    {
      day: "2-digit",
      month: "short",
    }
  ).format(
    new Date(`${date}T12:00:00`)
  );
}

function formatFullDate(
  date: string | null,
  language: "de" | "ru",
  noDate: string
) {
  if (!date) return noDate;

  return new Intl.DateTimeFormat(
    language === "ru" ? "ru-RU" : "de-DE",
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
  project: Project,
  language: "de" | "ru",
  text: {
    noPeriod: string;
    noDate: string;
  }
) {
  if (
    !project.start_date &&
    !project.end_date
  ) {
    return text.noPeriod;
  }

  if (
    project.start_date &&
    project.end_date &&
    project.start_date !==
      project.end_date
  ) {
    return `${formatDate(
      project.start_date,
      language,
      text.noDate
    )} – ${formatDate(
      project.end_date,
      language,
      text.noDate
    )}`;
  }

  return formatDate(
    project.start_date ??
      project.end_date,
    language,
    text.noDate
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
  const { language } = useLanguage();

  const text =
    language === "ru"
      ? {
          teamWork: "Командные проекты",
          work: "Проект",

          notFound: "Проект не найден",
          allWorks: "Ко всем проектам",

          deleteWork: "Удалить проект",
          addTask: "Добавить задачу",

          planned: "Запланировано",
          active: "В работе",
          completed: "Завершено",
          archived: "В архиве",

          total: "Всего",
          open: "Открыто",
          progress: "Активно",
          finished: "Готово",

          overview: "Обзор",
          board: "Доска",

          nextSteps: "Следующие шаги",
          tasks: "Задачи",
          noTasks: "Пока нет задач",
          addTaskButton: "Добавить задачу",

          workStatus: "Статус проекта",
          noTasksColumn: "Нет задач",

          task: "Задача",
          status: "Статус",
          priority: "Приоритет",
          deadline: "Дедлайн",
          responsible: "Ответственный",
          stillOpen: "Пока не назначено",

          low: "Низкий",
          normal: "Обычный",
          high: "Высокий",
          urgent: "Срочный",

          openStatus: "Открыто",
          inProgress: "В работе",
          doneStatus: "Выполнено",

          checklist: "Чек-лист",
          checklistQuestion:
            "Что ещё нужно сделать?",
          addChecklist:
            "Добавить новый пункт...",

          edit: "Редактировать",
          delete: "Удалить",

          reopen: "Открыть снова",
          markCompleted:
            "Отметить как выполненное",

          close: "Закрыть",

          editTask: "Редактирование задачи",

          taskLabel: "Задача",
          description: "Описание",

          saveChanges: "Сохранить изменения",
          saving: "Сохранение...",

          newTask: "Новая задача",
          createTask: "Создать задачу",
          creating: "Создание...",

          titlePlaceholder:
            "например, Купить рождественский декор",
          descriptionPlaceholder:
            "Что именно нужно сделать?",

          deleteTaskTitle:
            "Удалить задачу?",
          deleteTaskQuestion:
            "Ты действительно хочешь удалить",
          taskRemoved:
            "Задача будет удалена навсегда.",
          checklistRemoved:
            "Связанный чек-лист также будет удалён.",

          cancel: "Отмена",
          deleting: "Удаление...",

          deleteProjectTitle:
            "Удалить проект?",
          deleteProjectQuestion:
            "Ты действительно хочешь удалить",
          deleteProjectWarning:
            "Это действие нельзя отменить.",
          deleteProjectDescription:
            "Все задачи и чек-листы этого проекта также будут удалены.",
          deleteForever:
            "Удалить окончательно",

          noDate: "Нет даты",
          noPeriod: "Период не указан",

          adminRoleError:
            "Ошибка при проверке роли администратора:",

          taskCreateError:
            "Не удалось создать задачу.",
          taskUpdateError:
            "Не удалось сохранить задачу.",
          taskDeleteError:
            "Не удалось удалить задачу.",
          projectDeleteError:
            "Не удалось удалить проект.",
          checklistError:
            "Не удалось изменить чек-лист.",
        }
      : {
          teamWork: "Team Projekte",
          work: "Projekt",

          notFound: "Projekt nicht gefunden",
          allWorks: "Zu allen Projekten",

          deleteWork: "Projekt löschen",
          addTask: "Aufgabe hinzufügen",

          planned: "Geplant",
          active: "Aktiv",
          completed: "Abgeschlossen",
          archived: "Archiviert",

          total: "Gesamt",
          open: "Offen",
          progress: "Aktiv",
          finished: "Fertig",

          overview: "Übersicht",
          board: "Board",

          nextSteps: "Nächste Schritte",
          tasks: "Aufgaben",
          noTasks: "Noch keine Aufgaben",
          addTaskButton: "Aufgabe hinzufügen",

          workStatus: "Projektstatus",
          noTasksColumn: "Keine Aufgaben",

          task: "Aufgabe",
          status: "Status",
          priority: "Priorität",
          deadline: "Deadline",
          responsible: "Verantwortlich",
          stillOpen: "Noch offen",

          low: "Niedrig",
          normal: "Normal",
          high: "Hoch",
          urgent: "Dringend",

          openStatus: "Offen",
          inProgress: "In Arbeit",
          doneStatus: "Erledigt",

          checklist: "Checkliste",
          checklistQuestion:
            "Was muss noch gemacht werden?",
          addChecklist:
            "Neuen Punkt hinzufügen...",

          edit: "Bearbeiten",
          delete: "Löschen",

          reopen: "Wieder öffnen",
          markCompleted:
            "Als erledigt markieren",

          close: "Schließen",

          editTask: "Aufgabe bearbeiten",

          taskLabel: "Aufgabe",
          description: "Beschreibung",

          saveChanges: "Änderungen speichern",
          saving: "Wird gespeichert...",

          newTask: "Neue Aufgabe",
          createTask: "Aufgabe erstellen",
          creating: "Wird erstellt...",

          titlePlaceholder:
            "z. B. Weihnachtsdeko besorgen",
          descriptionPlaceholder:
            "Was genau soll gemacht werden?",

          deleteTaskTitle:
            "Aufgabe löschen?",
          deleteTaskQuestion:
            "Möchtest du",
          taskRemoved:
            "Die Aufgabe wird dauerhaft entfernt.",
          checklistRemoved:
            "Die zugehörige Checkliste wird ebenfalls entfernt.",

          cancel: "Abbrechen",
          deleting: "Wird gelöscht...",

          deleteProjectTitle:
            "Projekt löschen?",
          deleteProjectQuestion:
            "Möchtest du",
          deleteProjectWarning:
            "Diese Aktion kann nicht rückgängig gemacht werden.",
          deleteProjectDescription:
            "Alle Aufgaben und Checklisten dieses Projekts werden ebenfalls gelöscht.",
          deleteForever:
            "Endgültig löschen",

          noDate: "Kein Termin",
          noPeriod: "Kein Zeitraum",

          adminRoleError:
            "Fehler beim Prüfen der Admin-Rolle:",

          taskCreateError:
            "Die Aufgabe konnte nicht erstellt werden.",
          taskUpdateError:
            "Die Aufgabe konnte nicht gespeichert werden.",
          taskDeleteError:
            "Die Aufgabe konnte nicht gelöscht werden.",
          projectDeleteError:
            "Das Projekt konnte nicht gelöscht werden.",
          checklistError:
            "Die Checkliste konnte nicht geändert werden.",
        };

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

  const [takers, setTakers] =
    useState<Record<number, number[]>>({});
  const [myMemberId, setMyMemberId] =
    useState<number | null>(null);
  const [claimBusy, setClaimBusy] =
    useState<number | null>(null);
  const [notifyInfo, setNotifyInfo] =
    useState("");
  const [shareInfo, setShareInfo] =
    useState("");
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
      const { data: myMember } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      setMyMemberId(
        myMember ? (myMember.id as number) : null
      );

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
          text.adminRoleError,
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

    if (loadedItems.length > 0) {
      const { data: takerRows } = await supabase
        .from("work_item_members")
        .select("item_id, member_id")
        .in(
          "item_id",
          loadedItems.map((item) => item.id)
        );

      const map: Record<number, number[]> = {};

      for (const row of takerRows ?? []) {
        const key = row.item_id as number;
        (map[key] ??= []).push(row.member_id as number);
      }

      setTakers(map);
    } else {
      setTakers({});
    }
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
    void markWorkSeen();
  }, [projectId]);

  const isRuLang = language === "ru";

  // задачи, на которые можно записаться: без назначенного админом исполнителя
  const joinable = items.filter(
    (item) =>
      item.assigned_to === null &&
      item.status !== "completed"
  );

  // из них те, на которые пока никто не записался
  const openRoles = joinable.filter(
    (item) => (takers[item.id] ?? []).length === 0
  );

  function ownerNames(item: WorkItem) {
    const ids = [
      ...(item.assigned_to ? [item.assigned_to] : []),
      ...(takers[item.id] ?? []),
    ];

    return ids
      .map((id) => getMember(id)?.first_name)
      .filter(Boolean) as string[];
  }

  function isMine(item: WorkItem) {
    return (
      myMemberId !== null &&
      (takers[item.id] ?? []).includes(myMemberId)
    );
  }

  async function claimItem(itemId: number) {
    if (claimBusy !== null) return;
    setClaimBusy(itemId);

    const { data, error } = await supabase.rpc(
      "claim_work_item",
      { p_item_id: itemId }
    );

    if (error || data !== true) {
      setNotifyInfo(
        isRuLang
          ? "Не получилось записаться. Попробуй ещё раз."
          : "Eintragen nicht möglich. Bitte versuche es noch einmal."
      );
    } else {
      setNotifyInfo(
        isRuLang
          ? "Готово, задача записана на тебя."
          : "Erledigt, die Aufgabe ist jetzt bei dir eingetragen."
      );
    }

    setClaimBusy(null);
    await loadProject();
  }

  async function releaseItem(itemId: number) {
    if (claimBusy !== null) return;
    setClaimBusy(itemId);

    await supabase.rpc("release_work_item", {
      p_item_id: itemId,
    });

    setClaimBusy(null);
    await loadProject();
  }

  async function shareProject() {
    if (!project) return;

    const link = `${window.location.origin}/work/${project.id}`;
    const lines = [
      `*${project.title}*`,
      project.description
        ? project.description.length > 220
          ? `${project.description.slice(0, 220)}…`
          : project.description
        : "",
      openRoles.length > 0
        ? isRuLang
          ? `Свободных задач: ${openRoles.length}. Открой и отметь, что берёшь на себя:`
          : `Offene Aufgaben: ${openRoles.length}. Öffne den Link und trag dich ein:`
        : isRuLang
          ? "Открой проект в приложении:"
          : "Projekt in der App öffnen:",
      link,
    ].filter(Boolean);

    window.open(
      `https://wa.me/?text=${encodeURIComponent(lines.join("\n\n"))}`,
      "_blank"
    );
  }

  async function copyProjectLink() {
    if (!project) return;

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/work/${project.id}`
      );
      setShareInfo(
        isRuLang ? "Ссылка скопирована." : "Link kopiert."
      );
    } catch {
      setShareInfo(
        isRuLang
          ? "Не удалось скопировать."
          : "Kopieren nicht möglich."
      );
    }
  }

  async function notifyTeam() {
    if (!project) return;

    setNotifyInfo(
      isRuLang ? "Отправляю…" : "Sende…"
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/work-notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({
        projectId: project.id,
        reminder: true,
      }),
    }).catch(() => null);

    if (!response || !response.ok) {
      setNotifyInfo(
        isRuLang
          ? "Не удалось отправить уведомление."
          : "Benachrichtigung konnte nicht gesendet werden."
      );
      return;
    }

    const result = (await response.json()) as {
      sent?: number;
    };

    setNotifyInfo(
      isRuLang
        ? `Уведомление отправлено: ${result.sent ?? 0} чел.`
        : `Benachrichtigung gesendet: ${result.sent ?? 0} Personen.`
    );
  }

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
      console.error(
        text.projectDeleteError,
        error
      );
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

  function getStatusLabel(
    status: WorkItem["status"]
  ) {
    if (status === "open")
      return text.openStatus;

    if (status === "in_progress")
      return text.inProgress;

    return text.doneStatus;
  }

  function getProjectStatusLabel(
    status: Project["status"]
  ) {
    if (status === "planned")
      return text.planned;

    if (status === "active")
      return text.active;

    if (status === "completed")
      return text.completed;

    return text.archived;
  }

  function getPriorityLabel(
    priority: WorkItem["priority"]
  ) {
    if (priority === "low")
      return text.low;

    if (priority === "normal")
      return text.normal;

    if (priority === "high")
      return text.high;

    return text.urgent;
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
      console.error(
        text.taskUpdateError,
        error
      );
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
      console.error(
        text.taskDeleteError,
        error
      );
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
      console.error(
        text.checklistError,
        error
      );
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
      console.error(
        text.checklistError,
        error
      );
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
      console.error(
        text.taskCreateError,
        error
      );
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
            <div className="h-12 w-32 rounded-2xl bg-[#edebe1]" />
            <div className="h-36 rounded-[28px] bg-[#edebe1]" />
            <div className="h-24 rounded-[24px] bg-[#edebe1]" />
            <div className="h-24 rounded-[24px] bg-[#edebe1]" />
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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e4e2d9] bg-white text-[#363b39] active:scale-95"
              aria-label={text.close}
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#9ca09d]">
                {text.teamWork}
              </p>

              <h1 className="text-[22px] font-bold text-[#1b2431]">
                {text.work}
              </h1>
            </div>
          </header>

          <section className="rounded-[26px] border border-[#e6e4db] bg-white p-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3efe3] text-[#828886]">
              <FolderKanban size={21} />
            </div>

            <p className="mt-3 text-sm font-bold text-[#424847]">
              {text.notFound}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/work")
              }
              className="mt-5 rounded-[18px] bg-[#1b2431] px-5 py-3 text-sm font-bold text-[#ffc93c]"
            >
              {text.allWorks}
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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e4e2d9] bg-white text-[#363b39] active:scale-95"
              aria-label={text.allWorks}
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 px-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#9ca09d]">
                {text.teamWork}
              </p>

              <h1 className="truncate text-[19px] font-bold text-[#1b2431]">
                {text.work}
              </h1>
            </div>

            <button
              type="button"
              onClick={() =>
                setNewTaskOpen(true)
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1b2431] text-[#ffc93c] shadow-[0_5px_18px_rgba(27,36,49,0.18)] active:scale-95"
              aria-label={text.addTask}
            >
              <Plus size={21} />
            </button>
          </header>

          <section className="overflow-hidden rounded-[30px] bg-[#1b2431] p-6 text-[#ffc93c]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <FolderKanban size={23} />
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/80">
                  {
                    getProjectStatusLabel(
                      project.status
                    )
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
                    aria-label={
                      text.deleteWork
                    }
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
              {formatProjectPeriod(
                project,
                language,
                {
                  noPeriod: text.noPeriod,
                  noDate: text.noDate,
                }
              )}
            </div>
          </section>

          <section className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={shareProject}
              className="flex h-11 items-center gap-2 rounded-full bg-[#ffc93c] px-5 text-[13px] font-bold text-[#1b2431] active:scale-95"
            >
              <Share2 size={16} />
              {isRuLang ? "Поделиться в WhatsApp" : "In WhatsApp teilen"}
            </button>

            <button
              type="button"
              onClick={copyProjectLink}
              className="flex h-11 items-center gap-2 rounded-full border border-[#e9e3d3] bg-white px-4 text-[13px] font-semibold text-[#1b2431] active:scale-95"
            >
              {isRuLang ? "Копировать ссылку" : "Link kopieren"}
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={notifyTeam}
                className="flex h-11 items-center gap-2 rounded-full border border-[#e9e3d3] bg-white px-4 text-[13px] font-semibold text-[#1b2431] active:scale-95"
              >
                <Bell size={16} />
                {isRuLang ? "Уведомить команду" : "Team benachrichtigen"}
              </button>
            )}
          </section>

          {(notifyInfo || shareInfo) && (
            <p className="mt-2 px-1 text-[12px] font-semibold text-[#6f6a5c]">
              {notifyInfo || shareInfo}
            </p>
          )}

          {joinable.length > 0 && (
            <section className="mt-4 overflow-hidden rounded-[24px] border border-[#e9e3d3] bg-white">
              <div className="flex items-center gap-3 border-b border-[#ece6d6] bg-[#fff4d1] px-4 py-3">
                <Hand size={18} className="text-[#9a6b00]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-[#1b2431]">
                    {isRuLang ? "Запишись на задачу" : "Für Aufgabe eintragen"} · {joinable.length}
                  </p>
                  <p className="text-[12px] text-[#9a6b00]">
                    {isRuLang
                      ? `Без исполнителя: ${openRoles.length}. Одну задачу могут взять несколько человек`
                      : `Ohne Person: ${openRoles.length}. Mehrere Personen können eine Aufgabe übernehmen`}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#ece6d6]">
                {joinable.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[14px] font-semibold text-[#1b2431]">
                        {item.title}
                      </p>

                      {item.description && (
                        <p className="mt-1 whitespace-pre-line break-words text-[12px] leading-[1.45] text-[#6f6a5c]">
                          {item.description}
                        </p>
                      )}

                      {(takers[item.id] ?? []).length > 0 && (
                        <p className="mt-1.5 flex flex-wrap gap-1">
                          {ownerNames(item).map((name, index) => (
                            <span
                              key={`${item.id}-${index}`}
                              className="rounded-full bg-[#fff4d1] px-2.5 py-1 text-[11px] font-semibold text-[#9a6b00]"
                            >
                              {name}
                            </span>
                          ))}
                        </p>
                      )}

                      {item.deadline && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#8f897a]">
                          <Clock3 size={11} />
                          {formatDate(item.deadline, language, text.noDate)}
                        </p>
                      )}
                    </div>

                    {myMemberId !== null ? (
                      isMine(item) ? (
                        <button
                          type="button"
                          onClick={() => releaseItem(item.id)}
                          disabled={claimBusy !== null}
                          className="h-10 shrink-0 rounded-full border border-[#e9e3d3] px-4 text-[12px] font-semibold text-[#6f6a5c] active:scale-95 disabled:opacity-50"
                        >
                          {isRuLang ? "Отказаться" : "Abgeben"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => claimItem(item.id)}
                          disabled={claimBusy !== null}
                          className="h-10 shrink-0 rounded-full bg-[#1b2431] px-5 text-[13px] font-bold text-[#ffc93c] active:scale-95 disabled:opacity-50"
                        >
                          {isRuLang ? "Беру" : "Übernehmen"}
                        </button>
                      )
                    ) : (
                      <span className="max-w-[120px] text-right text-[11px] leading-4 text-[#8f897a]">
                        {isRuLang
                          ? "Нужна карточка в «Команде»"
                          : "Karte im Bereich „Team“ nötig"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-4 grid grid-cols-4 gap-2">
            {[
              {
                label: text.total,
                value: stats.total,
                color: "text-[#1b2431]",
              },
              {
                label: text.open,
                value: stats.open,
                color: "text-[#1b2431]",
              },
              {
                label: text.progress,
                value: stats.progress,
                color: "text-[#d97706]",
              },
              {
                label: text.finished,
                value: stats.completed,
                color: "text-[#16a34a]",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[20px] border border-[#e7e5dc] bg-white p-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#a1a4a0]">
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

          <div className="mt-6 flex rounded-2xl border border-[#e4e2d9] bg-white p-1">
            <button
              type="button"
              onClick={() =>
                setView("overview")
              }
              className={`flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-bold ${
                view === "overview"
                  ? "bg-[#1b2431] text-[#ffc93c]"
                  : "text-[#797f7e]"
              }`}
            >
              {text.overview}
            </button>

            <button
              type="button"
              onClick={() =>
                setView("board")
              }
              className={`flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-bold ${
                view === "board"
                  ? "bg-[#1b2431] text-[#ffc93c]"
                  : "text-[#797f7e]"
              }`}
            >
              {text.board}
            </button>
          </div>

          {view === "overview" && (
            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a4a0]">
                    {text.nextSteps}
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-[#1b2431]">
                    {text.tasks}
                  </h3>
                </div>

                <ListTodo
                  size={20}
                  className="text-[#919694]"
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
                      className="w-full rounded-[24px] border border-[#e6e4db] bg-white p-4 text-left active:scale-[0.99]"
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
                              className="mt-0.5 shrink-0 text-[#b6b8b3]"
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
                                getPriorityLabel(
                                  item.priority
                                )
                              }
                            </span>

                            {item.deadline && (
                              <span
                                className={`flex items-center gap-1 text-[11px] font-semibold ${
                                  overdue
                                    ? "text-[#dc2626]"
                                    : "text-[#828886]"
                                }`}
                              >
                                <Clock3 size={12} />
                                {formatDate(
                                  item.deadline,
                                  language,
                                  text.noDate
                                )}
                              </span>
                            )}

                            {ownerNames(item).length > 0 && (
                              <span className="flex min-w-0 items-center gap-1 text-[11px] font-semibold text-[#828886]">
                                <UserRound
                                  size={12}
                                  className="shrink-0"
                                />
                                <span className="truncate">
                                  {ownerNames(item).join(", ")}
                                </span>
                              </span>
                            )}
                          </div>

                          {itemChecklist.length >
                            0 && (
                            <div className="mt-3 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ece6d6]">
                                <div
                                  className="h-full rounded-full bg-[#1b2431]"
                                  style={{
                                    width: `${
                                      (completedChecklist /
                                        itemChecklist.length) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>

                              <span className="text-[10px] font-bold text-[#8b908e]">
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
                <div className="rounded-[24px] border border-dashed border-[#d5d5cd] bg-white p-7 text-center">
                  <ListTodo
                    size={21}
                    className="mx-auto text-[#828886]"
                  />

                  <p className="mt-3 text-sm font-bold text-[#424847]">
                    {text.noTasks}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  setNewTaskOpen(true)
                }
                className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-[#d5d5cd] bg-white text-sm font-bold text-[#5f6667]"
              >
                <Plus size={18} />
                {text.addTaskButton}
              </button>
            </section>
          )}

          {view === "board" && (
            <section className="mt-6">
              <div className="mb-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a4a0]">
                  {text.workStatus}
                </p>

                <h3 className="mt-1 text-lg font-bold">
                  {text.board}
                </h3>
              </div>

              <div className="-mx-4 overflow-x-auto px-4 pb-4">
                <div className="flex w-max gap-3">
                  {[
                    {
                      key: "open" as const,
                      title:
                        text.openStatus,
                      items:
                        openItems,
                    },
                    {
                      key: "in_progress" as const,
                      title:
                        text.inProgress,
                      items:
                        progressItems,
                    },
                    {
                      key: "completed" as const,
                      title:
                        text.doneStatus,
                      items:
                        completedItems,
                    },
                  ].map(
                    (column) => (
                      <div
                        key={
                          column.key
                        }
                        className="w-[285px] rounded-[26px] bg-[#f2f1e5] p-3"
                      >
                        <div className="mb-3 flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${statusConfig[column.key].dot}`}
                            />

                            <span className="text-sm font-bold text-[#424847]">
                              {
                                column.title
                              }
                            </span>
                          </div>

                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#878c89]">
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
                                className="w-full rounded-[20px] border border-[#e7e5dc] bg-white p-4 text-left"
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
                                      getPriorityLabel(
                                        item.priority
                                      )
                                    }
                                  </span>

                                  {ownerNames(item).length > 0 && (
                                    <span className="max-w-[60%] truncate text-[10px] font-semibold text-[#848a88]">
                                      {ownerNames(item).join(", ")}
                                    </span>
                                  )}
                                </div>

                                {item.deadline && (
                                  <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#8b908d]">
                                    <Clock3 size={11} />
                                    {formatDate(
                                      item.deadline,
                                      language,
                                      text.noDate
                                    )}
                                  </div>
                                )}
                              </button>
                            )
                          )}

                          {column.items
                            .length ===
                            0 && (
                            <div className="rounded-[20px] border border-dashed border-[#d3d3cb] px-4 py-7 text-center text-xs font-semibold text-[#989c99]">
                              {
                                text.noTasksColumn
                              }
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
            aria-label={text.close}
            onClick={() =>
              setSelectedItem(null)
            }
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
          />

          <section className="absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-12px)] flex-col overflow-hidden rounded-t-[30px] bg-[#f7f7f5] shadow-[0_-10px_45px_rgba(0,0,0,0.16)] sm:left-1/2 sm:max-w-[620px] sm:-translate-x-1/2">
            <div className="px-5 pt-4">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-[#dad9d0]" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#989c99]">
                    {text.task}
                  </p>

                  <h2 className="text-[22px] font-bold leading-tight text-[#1b2431]">
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
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e4e2d9] bg-white text-[#5b6261]"
                  aria-label={text.close}
                >
                  <X size={18} />
                </button>
              </div>

              {selectedItem.description && (
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#6e7574]">
                  {
                    selectedItem.description
                  }
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-[18px] border border-[#e6e4db] bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#a1a4a0]">
                    {text.status}
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
                      {text.openStatus}
                    </option>

                    <option value="in_progress">
                      {text.inProgress}
                    </option>

                    <option value="completed">
                      {text.doneStatus}
                    </option>
                  </select>
                </div>

                <div className="rounded-[18px] border border-[#e6e4db] bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#a1a4a0]">
                    {text.priority}
                  </p>

                  <p
                    className={`mt-1 text-sm font-bold ${priorityConfig[selectedItem.priority].className}`}
                  >
                    {
                      getPriorityLabel(
                        selectedItem.priority
                      )
                    }
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-[18px] border border-[#e6e4db] bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#a1a4a0]">
                    {text.deadline}
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                    <CalendarDays size={14} />

                    {formatFullDate(
                      selectedItem.deadline,
                      language,
                      text.noDate
                    )}
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#e6e4db] bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#a1a4a0]">
                    {text.responsible}
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                    <UserRound size={14} />

                    {ownerNames(selectedItem).length > 0
                      ? ownerNames(selectedItem).join(", ")
                      : text.stillOpen}
                  </p>

                  {myMemberId !== null &&
                    selectedItem.assigned_to === null &&
                    !isMine(selectedItem) && (
                      <button
                        type="button"
                        onClick={() => claimItem(selectedItem.id)}
                        disabled={claimBusy !== null}
                        className="mt-2 h-9 rounded-full bg-[#1b2431] px-4 text-[12px] font-bold text-[#ffc93c] disabled:opacity-50"
                      >
                        {isRuLang ? "Беру" : "Übernehmen"}
                      </button>
                    )}

                  {isMine(selectedItem) && (
                      <button
                        type="button"
                        onClick={() => releaseItem(selectedItem.id)}
                        disabled={claimBusy !== null}
                        className="mt-2 h-9 rounded-full border border-[#e9e3d3] px-4 text-[12px] font-semibold text-[#6f6a5c] disabled:opacity-50"
                      >
                        {isRuLang ? "Отказаться" : "Abgeben"}
                      </button>
                    )}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#989c99]">
                      {text.checklist}
                    </p>

                    <h3 className="mt-1 text-base font-bold">
                      {
                        text.checklistQuestion
                      }
                    </h3>
                  </div>

                  <CheckCircle2
                    size={20}
                    className="text-[#878c89]"
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
                        className="flex w-full items-center gap-3 rounded-[18px] border border-[#e6e4db] bg-white p-3 text-left"
                      >
                        {item.is_completed ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1b2431] text-[#ffc93c]">
                            <Check size={14} />
                          </span>
                        ) : (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#cfd0c9]">
                            <Circle
                              size={12}
                              className="text-transparent"
                            />
                          </span>
                        )}

                        <span
                          className={`text-sm font-semibold ${
                            item.is_completed
                              ? "text-[#a0a39e] line-through"
                              : "text-[#414745]"
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
                    placeholder={
                      text.addChecklist
                    }
                    className="min-w-0 flex-1 rounded-[18px] border border-[#e4e2d9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1b2431]"
                  />

                  <button
                    type="button"
                    onClick={
                      addChecklistItem
                    }
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#1b2431] text-[#ffc93c]"
                    aria-label={
                      text.addChecklist
                    }
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
                  className="flex h-13 items-center justify-center gap-2 rounded-[20px] border border-[#e4e2d9] bg-white text-sm font-bold text-[#434948]"
                >
                  <Pencil size={16} />
                  {text.edit}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDeleteTaskOpen(true)
                  }
                  className="flex h-13 items-center justify-center gap-2 rounded-[20px] bg-red-50 text-sm font-bold text-red-600"
                >
                  <Trash2 size={16} />
                  {text.delete}
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
                className="mt-3 flex min-h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-[#1b2431] text-sm font-bold text-[#ffc93c]"
              >
                {selectedItem.status ===
                "completed" ? (
                  <>
                    <Circle size={17} />
                    {text.reopen}
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    {
                      text.markCompleted
                    }
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
            aria-label={text.close}
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
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#dad9d0]" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#989c99]">
                    {text.editTask}
                  </p>

                  <h2 className="mt-1 text-[22px] font-bold">
                    {text.task}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditTaskOpen(
                      false
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#5b6261]"
                  aria-label={text.close}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-[#5f6667]">
                    {text.taskLabel}
                  </label>

                  <input
                    value={editTitle}
                    onChange={(event) =>
                      setEditTitle(
                        event.target.value
                      )
                    }
                    className="h-13 w-full rounded-[18px] border border-[#e4e2d9] bg-white px-4 text-sm outline-none focus:border-[#1b2431]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-[#5f6667]">
                    {text.description}
                  </label>

                  <textarea
                    value={editDescription}
                    onChange={(event) =>
                      setEditDescription(
                        event.target.value
                      )
                    }
                    rows={4}
                    className="w-full resize-none rounded-[18px] border border-[#e4e2d9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1b2431]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#5f6667]">
                      {text.status}
                    </label>

                    <select
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(
                          event.target.value as WorkItem["status"]
                        )
                      }
                      className="h-12 w-full rounded-[18px] border border-[#e4e2d9] bg-white px-3 text-sm outline-none"
                    >
                      <option value="open">
                        {text.openStatus}
                      </option>

                      <option value="in_progress">
                        {text.inProgress}
                      </option>

                      <option value="completed">
                        {text.doneStatus}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#5f6667]">
                      {text.priority}
                    </label>

                    <select
                      value={editPriority}
                      onChange={(event) =>
                        setEditPriority(
                          event.target.value as WorkItem["priority"]
                        )
                      }
                      className="h-12 w-full rounded-[18px] border border-[#e4e2d9] bg-white px-3 text-sm outline-none"
                    >
                      <option value="low">
                        {text.low}
                      </option>

                      <option value="normal">
                        {text.normal}
                      </option>

                      <option value="high">
                        {text.high}
                      </option>

                      <option value="urgent">
                        {text.urgent}
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-[#5f6667]">
                    {text.deadline}
                  </label>

                  <DatePicker value={editDeadline} onChange={(__value: string) => setEditDeadline(
                        __value
                      )} className="h-12 w-full rounded-[18px] border border-[#e4e2d9] bg-white px-3 text-sm outline-none" />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-[#5f6667]">
                    {text.responsible}
                  </label>

                  <select
                    value={editAssignee}
                    onChange={(event) =>
                      setEditAssignee(
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-[18px] border border-[#e4e2d9] bg-white px-3 text-sm outline-none"
                  >
                    <option value="">
                      {text.stillOpen}
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
                  className="flex h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-[#1b2431] text-sm font-bold text-[#ffc93c] disabled:opacity-40"
                >
                  <Pencil size={17} />

                  {saving
                    ? text.saving
                    : text.saveChanges}
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
            aria-label={text.close}
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
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#dad9d0]" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#989c99]">
                    {text.teamWork}
                  </p>

                  <h2 className="mt-1 text-[22px] font-bold">
                    {text.newTask}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setNewTaskOpen(
                      false
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#5b6261]"
                  aria-label={text.close}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-[#5f6667]">
                    {text.taskLabel}
                  </label>

                  <input
                    value={newTitle}
                    onChange={(event) =>
                      setNewTitle(
                        event.target.value
                      )
                    }
                    placeholder={
                      text.titlePlaceholder
                    }
                    autoFocus
                    className="h-13 w-full rounded-[18px] border border-[#e4e2d9] bg-white px-4 text-sm outline-none focus:border-[#1b2431]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-[#5f6667]">
                    {text.description}
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
                    placeholder={
                      text.descriptionPlaceholder
                    }
                    rows={4}
                    className="w-full resize-none rounded-[18px] border border-[#e4e2d9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1b2431]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#5f6667]">
                      {text.deadline}
                    </label>

                    <DatePicker value={newDeadline} onChange={(__value: string) => setNewDeadline(
                          __value
                        )} className="h-12 w-full rounded-[18px] border border-[#e4e2d9] bg-white px-3 text-sm outline-none" />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#5f6667]">
                      {text.priority}
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
                      className="h-12 w-full rounded-[18px] border border-[#e4e2d9] bg-white px-3 text-sm outline-none"
                    >
                      <option value="low">
                        {text.low}
                      </option>

                      <option value="normal">
                        {text.normal}
                      </option>

                      <option value="high">
                        {text.high}
                      </option>

                      <option value="urgent">
                        {text.urgent}
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-[#5f6667]">
                    {text.responsible}
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
                    className="h-12 w-full rounded-[18px] border border-[#e4e2d9] bg-white px-3 text-sm outline-none"
                  >
                    <option value="">
                      {text.stillOpen}
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
                  className="flex h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-[#1b2431] text-sm font-bold text-[#ffc93c] disabled:opacity-40"
                >
                  <Plus size={18} />

                  {saving
                    ? text.creating
                    : text.createTask}
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
              aria-label={text.close}
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
                <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#deddd5]" />

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
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f3] text-[#6f7573]"
                    aria-label={
                      text.close
                    }
                  >
                    <X size={18} />
                  </button>
                </div>

                <h2 className="mt-5 text-[23px] font-bold">
                  {text.deleteTaskTitle}
                </h2>

                <p className="mt-2 text-[15px] leading-6 text-[#6e7574]">
                  {text.deleteTaskQuestion}{" "}
                  <span className="font-bold text-[#363b39]">
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
                    {text.taskRemoved}
                  </p>

                  <p className="mt-1 text-[12px] leading-5 text-red-600/85">
                    {
                      text.checklistRemoved
                    }
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
                    className="h-13 rounded-[19px] border border-[#e4e2d9] bg-white text-sm font-bold text-[#5f6667]"
                  >
                    {text.cancel}
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
                      ? text.deleting
                      : text.delete}
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
            aria-label={text.close}
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
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#deddd5]" />

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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f3] text-[#6f7573]"
                  aria-label={
                    text.close
                  }
                >
                  <X size={18} />
                </button>
              </div>

              <h2 className="mt-5 text-[23px] font-bold">
                {text.deleteProjectTitle}
              </h2>

              <p className="mt-2 text-[15px] leading-6 text-[#6e7574]">
                {text.deleteProjectQuestion}{" "}
                <span className="font-bold text-[#363b39]">
                  „{project.title}“
                </span>{" "}
                wirklich löschen?
              </p>

              <div className="mt-5 rounded-[20px] border border-red-100 bg-red-50 px-4 py-4">
                <p className="text-[13px] font-bold text-red-700">
                  {
                    text.deleteProjectWarning
                  }
                </p>

                <p className="mt-1 text-[12px] leading-5 text-red-600/85">
                  {
                    text.deleteProjectDescription
                  }
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
                  className="h-13 rounded-[19px] border border-[#e4e2d9] bg-white text-sm font-bold text-[#5f6667]"
                >
                  {text.cancel}
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
                    ? text.deleting
                    : text.deleteForever}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}