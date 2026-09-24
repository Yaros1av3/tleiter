"use client";

import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Link as LinkIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { type Language } from "@/lib/translations";

type MaterialFolder = {
  id: number;
  name: string;
  name_de: string | null;
  name_ru: string | null;
  description: string | null;
  parent_id: number | null;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type Material = {
  id: number;
  folder_id: number | null;
  title: string;
  description: string | null;
  material_type:
    | "pdf"
    | "word"
    | "powerpoint"
    | "excel"
    | "image"
    | "text"
    | "link"
    | "other";
  file_url: string | null;
  external_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  source: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type FolderForm = {
  name_de: string;
  name_ru: string;
  description: string;
};

type MaterialForm = {
  title: string;
  description: string;
  material_type: Material["material_type"];
  external_url: string;
  notes: string;
};

type Breadcrumb = {
  id: number;
  name: string;
};

type ContentLanguage = "de" | "ru" | null;

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function getFolderNumber(folder: MaterialFolder) {
  const names = [
    folder.name_de,
    folder.name_ru,
    folder.name,
  ].filter(Boolean);

  for (const name of names) {
    const match = name?.trim().match(/^(\d+)/);

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function getOwnFolderLanguage(
  folder: MaterialFolder,
): ContentLanguage {
  const names = [
    folder.name,
    folder.name_de,
    folder.name_ru,
  ]
    .filter(Boolean)
    .map(normalize);

  if (
    names.includes("deutsch") ||
    names.includes("немецкий") ||
    names.includes("немецкая")
  ) {
    return "de";
  }

  if (
    names.includes("russisch") ||
    names.includes("русский") ||
    names.includes("русская")
  ) {
    return "ru";
  }

  return null;
}

function getFolderContentLanguage(
  folderId: number | null,
  folders: MaterialFolder[],
): ContentLanguage {
  if (folderId == null) {
    return null;
  }

  let current =
    folders.find((folder) => folder.id === folderId) ?? null;

  while (current) {
    const ownLanguage = getOwnFolderLanguage(current);

    if (ownLanguage) {
      return ownLanguage;
    }

    if (current.parent_id == null) {
      break;
    }

    current =
      folders.find(
        (folder) => folder.id === current?.parent_id,
      ) ?? null;
  }

  return null;
}

function getFolderName(
  folder: MaterialFolder,
  uiLanguage: Language,
  folders: MaterialFolder[],
) {
  const contentLanguage = getFolderContentLanguage(
    folder.id,
    folders,
  );

  if (contentLanguage === "de") {
    return (
      folder.name_de?.trim() ||
      folder.name?.trim() ||
      "Ordner"
    );
  }

  if (contentLanguage === "ru") {
    return (
      folder.name_ru?.trim() ||
      folder.name?.trim() ||
      "Папка"
    );
  }

  if (uiLanguage === "de") {
    return (
      folder.name_de?.trim() ||
      folder.name?.trim() ||
      "Ordner"
    );
  }

  return (
    folder.name_ru?.trim() ||
    folder.name?.trim() ||
    "Папка"
  );
}

function compareFolders(
  a: MaterialFolder,
  b: MaterialFolder,
  language: Language,
  folders: MaterialFolder[],
) {
  const aNumber = getFolderNumber(a);
  const bNumber = getFolderNumber(b);

  if (aNumber !== null && bNumber !== null) {
    return aNumber - bNumber;
  }

  if (aNumber !== null) {
    return -1;
  }

  if (bNumber !== null) {
    return 1;
  }

  return getFolderName(a, language, folders).localeCompare(
    getFolderName(b, language, folders),
    language === "ru" ? "ru" : "de",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function formatFileSize(size: number | null) {
  if (!size || size <= 0) {
    return "—";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(
    size /
    (1024 * 1024 * 1024)
  ).toFixed(1)} GB`;
}

function formatDate(
  value: string,
  language: Language,
) {
  return new Intl.DateTimeFormat(
    language === "ru" ? "ru-RU" : "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(new Date(value));
}

function getMaterialIcon(
  type: Material["material_type"],
  size = 18,
) {
  switch (type) {
    case "pdf":
    case "word":
    case "powerpoint":
    case "text":
      return (
        <FileText
          size={size}
          strokeWidth={1.8}
        />
      );

    case "excel":
      return (
        <FileSpreadsheet
          size={size}
          strokeWidth={1.8}
        />
      );

    case "image":
      return (
        <FileImage
          size={size}
          strokeWidth={1.8}
        />
      );

    case "link":
      return (
        <LinkIcon
          size={size}
          strokeWidth={1.8}
        />
      );

    default:
      return (
        <File
          size={size}
          strokeWidth={1.8}
        />
      );
  }
}

function materialTypeLabel(
  type: Material["material_type"],
  language: Language,
) {
  const labels: Record<
    Material["material_type"],
    { de: string; ru: string }
  > = {
    pdf: {
      de: "PDF",
      ru: "PDF",
    },
    word: {
      de: "Word",
      ru: "Word",
    },
    powerpoint: {
      de: "PowerPoint",
      ru: "PowerPoint",
    },
    excel: {
      de: "Excel",
      ru: "Excel",
    },
    image: {
      de: "Bild",
      ru: "Изображение",
    },
    text: {
      de: "Text",
      ru: "Текст",
    },
    link: {
      de: "Link",
      ru: "Ссылка",
    },
    other: {
      de: "Datei",
      ru: "Файл",
    },
  };

  return labels[type][language];
}

export default function MaterialsPage() {
  const language: Language = "de";

  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [currentFolderId, setCurrentFolderId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  /*
   * Deep-link из расписания: /materials?folder=..&material=..
   * Открывает нужную папку и подсвечивает файл темы.
   */
  const [highlightedMaterialId, setHighlightedMaterialId] =
    useState<number | null>(null);

  const highlightedMaterialRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * WICHTIG:
   * Admin wird nicht mehr über den profiles-SELECT
   * erkannt, sondern über die SECURITY DEFINER Funktion
   * public.is_admin().
   */
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecking, setAdminChecking] = useState(true);

  const [search, setSearch] = useState("");

  const [folderModalOpen, setFolderModalOpen] =
    useState(false);

  const [materialModalOpen, setMaterialModalOpen] =
    useState(false);

  const [editingFolder, setEditingFolder] =
    useState<MaterialFolder | null>(null);

  const [editingMaterial, setEditingMaterial] =
    useState<Material | null>(null);

  const [folderForm, setFolderForm] =
    useState<FolderForm>({
      name_de: "",
      name_ru: "",
      description: "",
    });

  const [materialForm, setMaterialForm] =
    useState<MaterialForm>({
      title: "",
      description: "",
      material_type: "other",
      external_url: "",
      notes: "",
    });

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [deleteFolderTarget, setDeleteFolderTarget] =
    useState<MaterialFolder | null>(null);

  const [deleteMaterialTarget, setDeleteMaterialTarget] =
    useState<Material | null>(null);

  const [deleteAllFoldersOpen, setDeleteAllFoldersOpen] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const ui = {
    title: "Materialien",
    subtitle:
      "Materialien für den Teeniedienst",

    search:
      "Materialien und Ordner suchen...",

    root: "Teeniedienst",

    back: "Zurück",
    newFolder: "Neuer Ordner",
    upload: "Material hinzufügen",

    folders: "Ordner",
    files: "Materialien",

    empty:
      "Dieser Ordner ist noch leer",

    noResults:
      "Keine Ergebnisse gefunden",

    folder: "Ordner",
    file: "Material",

    edit: "Bearbeiten",
    delete: "Löschen",

    cancel: "Abbrechen",
    save: "Speichern",
    create: "Erstellen",

    nameGerman: "Deutscher Name",
    nameRussian: "Russischer Name",
    description: "Beschreibung",

    titleField: "Titel",
    materialType: "Materialtyp",

    externalLink: "Externer Link",
    notes: "Notizen",

    chooseFile: "Datei auswählen",
    noFile: "Keine Datei ausgewählt",

    deleteFolderTitle:
      "Ordner löschen?",

    deleteMaterialTitle:
      "Material löschen?",

    deleteFolderText:
      "Der Ordner und alle darin enthaltenen Elemente werden gelöscht.",

    deleteMaterialText:
      "Das Material wird dauerhaft gelöscht.",

    deleteAllFolders:
      "Alle Ordner löschen",

    deleteAllFoldersTitle:
      "Alle Ordner löschen?",

    deleteAllFoldersText:
      "Alle Ordner innerhalb des aktuellen Ordners, alle Unterordner und Materialien werden dauerhaft gelöscht. Der aktuelle Ordner bleibt erhalten.",

    deleteAllFoldersConfirm:
      "Alles löschen",

    saving:
      "Wird gespeichert...",

    deleting:
      "Wird gelöscht...",

    deletingAll:
      "Alle Ordner werden gelöscht...",
  };

  /*
   * ============================================
   * ADMIN CHECK
   * ============================================
   *
   * Используем:
   *
   * supabase.rpc("is_admin")
   *
   * а не:
   *
   * from("profiles").select(...)
   *
   * Поэтому RLS profiles больше не мешает
   * определить администратора.
   */
  async function checkAdmin() {
    setAdminChecking(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase.rpc("is_admin");

      if (error) {
        console.error(
          "is_admin RPC error:",
          error,
        );

        setIsAdmin(false);
        return;
      }

      setIsAdmin(data === true);
    } catch (error) {
      console.error(
        "Admin check failed:",
        error,
      );

      setIsAdmin(false);
    } finally {
      setAdminChecking(false);
    }
  }

  async function loadData() {
    setLoading(true);

    const [
      folderResult,
      materialResult,
    ] = await Promise.all([
      supabase
        .from("material_folders")
        .select("*")
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("materials")
        .select("*")
        .order("sort_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (folderResult.error) {
      console.error(
        "Folders:",
        folderResult.error,
      );
    }

    if (materialResult.error) {
      console.error(
        "Materials:",
        materialResult.error,
      );
    }

    setFolders(folderResult.data ?? []);
    setMaterials(materialResult.data ?? []);

    setLoading(false);
  }

  useEffect(() => {
    checkAdmin();
    loadData();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      () => {
        checkAdmin();
      },
    );

    /*
     * Читаем query-параметры вручную (window.location), а не
     * через useSearchParams — это client-only компонент, и так
     * не нужен Suspense boundary.
     */
    const params = new URLSearchParams(
      window.location.search,
    );

    const folderParam = params.get("folder");
    const materialParam = params.get("material");

    if (folderParam) {
      const folderId = Number(folderParam);

      if (!Number.isNaN(folderId)) {
        setCurrentFolderId(folderId);
      }
    }

    if (materialParam) {
      const materialId = Number(materialParam);

      if (!Number.isNaN(materialId)) {
        setHighlightedMaterialId(materialId);
      }
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (
      highlightedMaterialId == null ||
      loading
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      highlightedMaterialRef.current?.scrollIntoView(
        {
          behavior: "smooth",
          block: "center",
        },
      );
    }, 150);

    const clearHighlight = setTimeout(() => {
      setHighlightedMaterialId(null);
    }, 4000);

    return () => {
      clearTimeout(timeout);
      clearTimeout(clearHighlight);
    };
  }, [highlightedMaterialId, loading]);

  const currentFolder = useMemo(() => {
    if (currentFolderId == null) {
      return null;
    }

    return (
      folders.find(
        (folder) =>
          folder.id === currentFolderId,
      ) ?? null
    );
  }, [
    folders,
    currentFolderId,
  ]);

  const currentContentLanguage =
    useMemo(
      () =>
        getFolderContentLanguage(
          currentFolderId,
          folders,
        ),
      [
        currentFolderId,
        folders,
      ],
    );

  const breadcrumbs =
    useMemo<Breadcrumb[]>(() => {
      const result: Breadcrumb[] = [];

      let current =
        currentFolderId == null
          ? null
          : folders.find(
              (folder) =>
                folder.id ===
                currentFolderId,
            ) ?? null;

      while (current) {
        result.unshift({
          id: current.id,
          name: getFolderName(
            current,
            language,
            folders,
          ),
        });

        if (current.parent_id == null) {
          break;
        }

        current =
          folders.find(
            (folder) =>
              folder.id ===
              current?.parent_id,
          ) ?? null;
      }

      return result;
    }, [
      currentFolderId,
      folders,
    ]);

  const visibleFolders = useMemo(() => {
    const query =
      search.trim().toLocaleLowerCase();

    const result = folders.filter(
      (folder) =>
        folder.parent_id ===
        currentFolderId,
    );

    const filtered = query
      ? result.filter((folder) =>
          [
            folder.name,
            folder.name_de,
            folder.name_ru,
            folder.description,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase()
            .includes(query),
        )
      : result;

    return [...filtered].sort(
      (a, b) =>
        compareFolders(
          a,
          b,
          language,
          folders,
        ),
    );
  }, [
    folders,
    currentFolderId,
    search,
  ]);

  const visibleMaterials =
    useMemo(() => {
      const query =
        search.trim().toLocaleLowerCase();

      const result =
        materials.filter(
          (material) =>
            material.folder_id ===
            currentFolderId,
        );

      if (!query) {
        return result;
      }

      return result.filter((material) =>
        [
          material.title,
          material.description,
          material.file_name,
          material.notes,
          material.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(query),
      );
    }, [
      materials,
      currentFolderId,
      search,
    ]);

  const totalItems =
    visibleFolders.length +
    visibleMaterials.length;

  function goToFolder(id: number) {
    setCurrentFolderId(id);
    setSearch("");
  }

  function goHome() {
    setCurrentFolderId(null);
    setSearch("");
  }

  function goBack() {
    if (!currentFolder) {
      return;
    }

    setCurrentFolderId(
      currentFolder.parent_id,
    );

    setSearch("");
  }

  /*
   * ============================================
   * FOLDER
   * ============================================
   */

  function openCreateFolderModal() {
    if (!isAdmin || currentFolderId == null) {
      return;
    }

    setEditingFolder(null);

    setFolderForm({
      name_de: "",
      name_ru: "",
      description: "",
    });

    setFolderModalOpen(true);
  }

  function openEditFolderModal(
    folder: MaterialFolder,
  ) {
    if (!isAdmin) {
      return;
    }

    setEditingFolder(folder);

    setFolderForm({
      name_de: folder.name_de ?? "",
      name_ru: folder.name_ru ?? "",
      description:
        folder.description ?? "",
    });

    setFolderModalOpen(true);
  }

  function closeFolderModal() {
    if (saving) {
      return;
    }

    setFolderModalOpen(false);
    setEditingFolder(null);
  }

  async function saveFolder() {
    if (!isAdmin) {
      return;
    }

    const nameDe =
      folderForm.name_de.trim();

    const nameRu =
      folderForm.name_ru.trim();

    if (!nameDe && !nameRu) {
      return;
    }

    setSaving(true);

    try {
      if (editingFolder) {
        const { error } =
          await supabase
            .from("material_folders")
            .update({
              name:
                nameDe ||
                nameRu,

              name_de:
                nameDe ||
                nameRu,

              name_ru:
                nameRu ||
                nameDe,

              description:
                folderForm.description.trim() ||
                null,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              editingFolder.id,
            );

        if (error) {
          throw error;
        }
      } else {
        if (currentFolderId == null) {
          throw new Error(
            "Folders can only be created inside another folder.",
          );
        }

        const { error } =
          await supabase
            .from("material_folders")
            .insert({
              name:
                nameDe ||
                nameRu,

              name_de:
                nameDe ||
                nameRu,

              name_ru:
                nameRu ||
                nameDe,

              description:
                folderForm.description.trim() ||
                null,

              parent_id:
                currentFolderId,

              icon: "folder",
              sort_order: 0,
            });

        if (error) {
          throw error;
        }
      }

      await loadData();
      closeFolderModal();
    } catch (error) {
      console.error(error);

      alert(
        "Der Ordner konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteFolder() {
    if (
      !isAdmin ||
      !deleteFolderTarget
    ) {
      return;
    }

    setDeleting(true);

    try {
      const {
        error,
      } = await supabase
        .from("material_folders")
        .delete()
        .eq(
          "id",
          deleteFolderTarget.id,
        );

      if (error) {
        throw error;
      }

      const deletedId =
        deleteFolderTarget.id;

      const parentId =
        deleteFolderTarget.parent_id;

      setDeleteFolderTarget(null);

      await loadData();

      if (
        currentFolderId ===
        deletedId
      ) {
        setCurrentFolderId(
          parentId,
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        "Der Ordner konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function getDescendantFolderIds(
    parentId: number,
  ) {
    const result: number[] = [];
    const queue = [parentId];

    while (queue.length > 0) {
      const id = queue.shift();

      if (id == null) {
        continue;
      }

      const children =
        folders.filter(
          (folder) =>
            folder.parent_id === id,
        );

      for (const child of children) {
        result.push(child.id);
        queue.push(child.id);
      }
    }

    return result;
  }

  async function deleteAllChildFolders() {
    if (
      !isAdmin ||
      currentFolderId == null
    ) {
      return;
    }

    setDeleting(true);

    try {
      const childFolderIds =
        folders
          .filter(
            (folder) =>
              folder.parent_id ===
              currentFolderId,
          )
          .map(
            (folder) =>
              folder.id,
          );

      if (
        childFolderIds.length ===
        0
      ) {
        setDeleteAllFoldersOpen(
          false,
        );
        return;
      }

      const descendantIds =
        getDescendantFolderIds(
          currentFolderId,
        );

      const materialsToDelete =
        materials.filter(
          (material) =>
            material.folder_id !=
              null &&
            descendantIds.includes(
              material.folder_id,
            ),
        );

      const storagePaths =
        materialsToDelete
          .map(
            (material) =>
              material.storage_path,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          );

      if (
        storagePaths.length > 0
      ) {
        const {
          error,
        } =
          await supabase.storage
            .from("materials")
            .remove(
              storagePaths,
            );

        if (error) {
          console.warn(
            "Storage cleanup:",
            error,
          );
        }
      }

      const {
        error,
      } = await supabase
        .from("material_folders")
        .delete()
        .in(
          "id",
          childFolderIds,
        );

      if (error) {
        throw error;
      }

      setDeleteAllFoldersOpen(
        false,
      );

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        "Die Ordner konnten nicht vollständig gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  }

  /*
   * ============================================
   * MATERIAL
   * ============================================
   */

  function openCreateMaterialModal() {
    if (
      !isAdmin ||
      currentFolderId == null
    ) {
      return;
    }

    setEditingMaterial(null);

    setMaterialForm({
      title: "",
      description: "",
      material_type: "other",
      external_url: "",
      notes: "",
    });

    setSelectedFile(null);
    setMaterialModalOpen(true);
  }

  function openEditMaterialModal(
    material: Material,
  ) {
    if (!isAdmin) {
      return;
    }

    setEditingMaterial(material);

    setMaterialForm({
      title: material.title,
      description:
        material.description ?? "",
      material_type:
        material.material_type,
      external_url:
        material.external_url ?? "",
      notes:
        material.notes ?? "",
    });

    setSelectedFile(null);
    setMaterialModalOpen(true);
  }

  function closeMaterialModal() {
    if (saving) {
      return;
    }

    setMaterialModalOpen(false);
    setEditingMaterial(null);
    setSelectedFile(null);
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ??
      null;

    setSelectedFile(file);

    if (!file) {
      return;
    }

    if (
      !materialForm.title.trim()
    ) {
      setMaterialForm(
        (previous) => ({
          ...previous,
          title:
            file.name.replace(
              /\.[^/.]+$/,
              "",
            ),
        }),
      );
    }

    const lower =
      file.name.toLocaleLowerCase();

    let type:
      Material["material_type"] =
      "other";

    if (
      lower.endsWith(".pdf")
    ) {
      type = "pdf";
    } else if (
      lower.endsWith(".doc") ||
      lower.endsWith(".docx")
    ) {
      type = "word";
    } else if (
      lower.endsWith(".ppt") ||
      lower.endsWith(".pptx")
    ) {
      type = "powerpoint";
    } else if (
      lower.endsWith(".xls") ||
      lower.endsWith(".xlsx")
    ) {
      type = "excel";
    } else if (
      [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
      ].some((extension) =>
        lower.endsWith(extension),
      )
    ) {
      type = "image";
    } else if (
      lower.endsWith(".txt") ||
      lower.endsWith(".md")
    ) {
      type = "text";
    }

    setMaterialForm(
      (previous) => ({
        ...previous,
        material_type: type,
      }),
    );
  }

  async function saveMaterial() {
    if (
      !isAdmin ||
      currentFolderId == null
    ) {
      return;
    }

    const title =
      materialForm.title.trim();

    if (!title) {
      return;
    }

    if (
      !editingMaterial &&
      !selectedFile &&
      !materialForm.external_url.trim()
    ) {
      return;
    }

    setSaving(true);

    let uploadedNewPath:
      string | null = null;

    try {
      let storagePath =
        editingMaterial?.storage_path ??
        null;

      let fileUrl =
        editingMaterial?.file_url ??
        null;

      let fileName =
        editingMaterial?.file_name ??
        null;

      let mimeType =
        editingMaterial?.mime_type ??
        null;

      let fileSize =
        editingMaterial?.file_size ??
        null;

      let materialType =
        materialForm.material_type;

      if (selectedFile) {
        const extension =
          selectedFile.name.match(
            /(\.[^./\\]+)$/,
          )?.[1]?.toLowerCase() ??
          "";

        const uniqueName =
          `${Date.now()}_${crypto.randomUUID()}${extension}`;

        storagePath =
          `${currentFolderId}/${uniqueName}`;

        uploadedNewPath =
          storagePath;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("materials")
            .upload(
              storagePath,
              selectedFile,
              {
                upsert: false,
              },
            );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: publicUrlData,
        } =
          supabase.storage
            .from("materials")
            .getPublicUrl(
              storagePath,
            );

        fileUrl =
          publicUrlData.publicUrl;

        fileName =
          selectedFile.name;

        mimeType =
          selectedFile.type ||
          null;

        fileSize =
          selectedFile.size;

        const lower =
          selectedFile.name.toLocaleLowerCase();

        if (
          lower.endsWith(".pdf")
        ) {
          materialType = "pdf";
        } else if (
          lower.endsWith(".doc") ||
          lower.endsWith(".docx")
        ) {
          materialType = "word";
        } else if (
          lower.endsWith(".ppt") ||
          lower.endsWith(".pptx")
        ) {
          materialType =
            "powerpoint";
        } else if (
          lower.endsWith(".xls") ||
          lower.endsWith(".xlsx")
        ) {
          materialType = "excel";
        } else if (
          [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif",
          ].some((extension) =>
            lower.endsWith(extension),
          )
        ) {
          materialType = "image";
        } else if (
          lower.endsWith(".txt") ||
          lower.endsWith(".md")
        ) {
          materialType = "text";
        }
      }

      const payload = {
        folder_id:
          currentFolderId,

        title,

        description:
          materialForm.description.trim() ||
          null,

        material_type:
          materialType,

        file_url:
          fileUrl,

        external_url:
          materialForm.external_url.trim() ||
          null,

        file_name:
          fileName,

        mime_type:
          mimeType,

        file_size:
          fileSize,

        storage_path:
          storagePath,

        source:
          "TLeiter",

        notes:
          materialForm.notes.trim() ||
          null,

        updated_at:
          new Date().toISOString(),
      };

      if (editingMaterial) {
        const {
          error,
        } =
          await supabase
            .from("materials")
            .update(payload)
            .eq(
              "id",
              editingMaterial.id,
            );

        if (error) {
          throw error;
        }

        /*
         * Если загрузили новый файл при редактировании,
         * старый файл больше не нужен.
         */
        if (
          selectedFile &&
          editingMaterial.storage_path &&
          editingMaterial.storage_path !==
            storagePath
        ) {
          await supabase.storage
            .from("materials")
            .remove([
              editingMaterial.storage_path,
            ]);
        }
      } else {
        const {
          error,
        } =
          await supabase
            .from("materials")
            .insert({
              ...payload,
              sort_order: 0,
            });

        if (error) {
          throw error;
        }
      }

      await loadData();
      closeMaterialModal();
    } catch (error) {
      console.error(
        "Save material:",
        error,
      );

      /*
       * Если Storage upload прошёл,
       * но INSERT/UPDATE базы упал,
       * удаляем уже загруженный файл.
       */
      if (uploadedNewPath) {
        await supabase.storage
          .from("materials")
          .remove([
            uploadedNewPath,
          ]);
      }

      alert(
        "Das Material konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteMaterial() {
    if (
      !isAdmin ||
      !deleteMaterialTarget
    ) {
      return;
    }

    setDeleting(true);

    try {
      if (
        deleteMaterialTarget.storage_path
      ) {
        const {
          error,
        } =
          await supabase.storage
            .from("materials")
            .remove([
              deleteMaterialTarget.storage_path,
            ]);

        if (error) {
          console.warn(
            "Storage:",
            error,
          );
        }
      }

      const {
        error,
      } = await supabase
        .from("materials")
        .delete()
        .eq(
          "id",
          deleteMaterialTarget.id,
        );

      if (error) {
        throw error;
      }

      setDeleteMaterialTarget(null);

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        "Das Material konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function openMaterial(
    material: Material,
  ) {
    const url =
      material.file_url ||
      material.external_url;

    if (!url) {
      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const canManage =
    isAdmin &&
    !adminChecking;

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-neutral-900">
      <main className="mx-auto w-full max-w-[1500px] px-3 pb-24 pt-3 sm:px-6 sm:pb-12 sm:pt-5 lg:px-8">

        {/* Home */}
        

        {/* HERO */}
        <section className="mb-5 overflow-hidden rounded-[26px] bg-neutral-950 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-neutral-900">
                  <BookOpen
                    size={18}
                    strokeWidth={1.8}
                  />
                </div>

                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                  {currentContentLanguage ===
                  "de"
                    ? "Deutsch"
                    : currentContentLanguage ===
                        "ru"
                      ? "Русский"
                      : "Materialien"}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
                {currentFolder
                  ? getFolderName(
                      currentFolder,
                      language,
                      folders,
                    )
                  : ui.title}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-5 text-white/60">
                {currentFolder?.description ||
                  ui.subtitle}
              </p>
            </div>

            {canManage &&
              currentFolderId !=
                null && (
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={
                      openCreateFolderModal
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/15"
                  >
                    <Folder
                      size={16}
                    />
                    {ui.newFolder}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDeleteAllFoldersOpen(
                        true,
                      )
                    }
                    disabled={
                      visibleFolders.length ===
                      0
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 text-sm font-semibold text-red-200 hover:bg-red-500/15 disabled:opacity-30"
                  >
                    <Trash2
                      size={16}
                    />
                    {ui.deleteAllFolders}
                  </button>

                  <button
                    type="button"
                    onClick={
                      openCreateMaterialModal
                    }
                    className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-neutral-950 hover:bg-neutral-100 sm:col-span-1"
                  >
                    <Plus
                      size={17}
                    />
                    {ui.upload}
                  </button>
                </div>
              )}
          </div>
        </section>

        {/* ADMIN STATUS */}
        {!adminChecking && (
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs">
            <span className="text-neutral-400">
              TLeiter Materialien
            </span>

            <span
              className={
                canManage
                  ? "font-semibold text-emerald-600"
                  : "font-medium text-neutral-400"
              }
            >
              {canManage
                ? "Admin"
                : "Nur ansehen"}
            </span>
          </div>
        )}

        {/* SEARCH */}
        <section className="mb-3">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder={ui.search}
              className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-10 pr-4 text-sm outline-none shadow-sm focus:border-neutral-400"
            />
          </div>
        </section>

        {/* BREADCRUMBS */}
        <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-2xl border border-neutral-200 bg-white px-2 py-1.5 whitespace-nowrap shadow-sm">
          <button
            type="button"
            onClick={goHome}
            className={`rounded-lg px-2 py-1.5 text-sm ${
              currentFolderId == null
                ? "font-semibold text-neutral-900"
                : "text-neutral-500"
            }`}
          >
            {ui.root}
          </button>

          {breadcrumbs.map(
            (breadcrumb, index) => (
              <div
                key={breadcrumb.id}
                className="flex items-center gap-1"
              >
                <ChevronRight
                  size={14}
                  className="text-neutral-300"
                />

                <button
                  type="button"
                  onClick={() =>
                    goToFolder(
                      breadcrumb.id,
                    )
                  }
                  className={`rounded-lg px-2 py-1.5 text-sm ${
                    index ===
                    breadcrumbs.length -
                      1
                      ? "font-semibold text-neutral-900"
                      : "text-neutral-500"
                  }`}
                >
                  {
                    breadcrumb.name
                  }
                </button>
              </div>
            ),
          )}
        </div>

        {currentFolder && (
          <button
            type="button"
            onClick={goBack}
            className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-medium text-neutral-600 shadow-sm"
          >
            <ArrowLeft size={15} />
            {ui.back}
          </button>
        )}

        {/* CONTENT */}
        <section className="overflow-hidden rounded-[26px] border border-neutral-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center text-sm text-neutral-400">
              Wird geladen...
            </div>
          ) : totalItems === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                {search ? (
                  <Search size={20} />
                ) : (
                  <FolderOpen
                    size={20}
                  />
                )}
              </div>

              <p className="text-sm font-medium text-neutral-700">
                {search
                  ? ui.noResults
                  : ui.empty}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {visibleFolders.map(
                (folder) => (
                  <div
                    key={`folder-${folder.id}`}
                    className="flex items-center gap-3 px-3 py-4 sm:px-5"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        goToFolder(
                          folder.id,
                        )
                      }
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
                        <Folder
                          size={19}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold">
                          {getFolderName(
                            folder,
                            language,
                            folders,
                          )}
                        </div>

                        <div className="mt-1 text-xs text-neutral-400">
                          {ui.folder}
                        </div>
                      </div>

                      <ChevronRight
                        size={17}
                        className="shrink-0 text-neutral-300"
                      />
                    </button>

                    {canManage && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openEditFolderModal(
                              folder,
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                        >
                          <Pencil
                            size={14}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteFolderTarget(
                              folder,
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2
                            size={14}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                ),
              )}

              {visibleMaterials.map(
                (material) => (
                  <div
                    key={`material-${material.id}`}
                    ref={
                      material.id ===
                      highlightedMaterialId
                        ? highlightedMaterialRef
                        : undefined
                    }
                    className={`flex items-center gap-3 px-3 py-4 transition-colors sm:px-5 ${
                      material.id ===
                      highlightedMaterialId
                        ? "bg-amber-50 ring-2 ring-inset ring-amber-300"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openMaterial(
                          material,
                        )
                      }
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
                        {getMaterialIcon(
                          material.material_type,
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold">
                          {
                            material.title
                          }
                        </div>

                        <div className="mt-1 truncate text-xs text-neutral-400">
                          {materialTypeLabel(
                            material.material_type,
                            language,
                          )}

                          {material.file_size
                            ? ` · ${formatFileSize(
                                material.file_size,
                              )}`
                            : ""}
                        </div>
                      </div>

                      <ChevronRight
                        size={17}
                        className="shrink-0 text-neutral-300"
                      />
                    </button>

                    {canManage && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openEditMaterialModal(
                              material,
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                        >
                          <Pencil
                            size={14}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteMaterialTarget(
                              material,
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2
                            size={14}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </main>

      {/* FOLDER MODAL */}
      {folderModalOpen &&
        canManage && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                <div>
                  <h2 className="font-semibold">
                    {editingFolder
                      ? ui.edit
                      : ui.newFolder}
                  </h2>

                  <p className="mt-1 text-xs text-neutral-400">
                    {ui.folder}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeFolderModal
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                    {ui.nameGerman}
                  </label>

                  <input
                    value={
                      folderForm.name_de
                    }
                    onChange={(event) =>
                      setFolderForm(
                        (previous) => ({
                          ...previous,
                          name_de:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="z. B. 3. Jahr"
                    className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                    {ui.nameRussian}
                  </label>

                  <input
                    value={
                      folderForm.name_ru
                    }
                    onChange={(event) =>
                      setFolderForm(
                        (previous) => ({
                          ...previous,
                          name_ru:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="например 3. Год"
                    className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                    {ui.description}
                  </label>

                  <textarea
                    value={
                      folderForm.description
                    }
                    onChange={(event) =>
                      setFolderForm(
                        (previous) => ({
                          ...previous,
                          description:
                            event.target
                              .value,
                        }),
                      )
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4">
                <button
                  type="button"
                  onClick={
                    closeFolderModal
                  }
                  disabled={saving}
                  className="h-11 rounded-xl px-4 text-sm text-neutral-500"
                >
                  {ui.cancel}
                </button>

                <button
                  type="button"
                  onClick={saveFolder}
                  disabled={
                    saving ||
                    (!folderForm.name_de.trim() &&
                      !folderForm.name_ru.trim())
                  }
                  className="h-11 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving
                    ? ui.saving
                    : editingFolder
                      ? ui.save
                      : ui.create}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* MATERIAL MODAL */}
      {materialModalOpen &&
        canManage && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                <div>
                  <h2 className="font-semibold">
                    {editingMaterial
                      ? ui.edit
                      : ui.upload}
                  </h2>

                  <p className="mt-1 text-xs text-neutral-400">
                    {currentFolder
                      ? getFolderName(
                          currentFolder,
                          language,
                          folders,
                        )
                      : ui.root}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeMaterialModal
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                    {ui.titleField} *
                  </label>

                  <input
                    value={
                      materialForm.title
                    }
                    onChange={(event) =>
                      setMaterialForm(
                        (previous) => ({
                          ...previous,
                          title:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                    {ui.materialType}
                  </label>

                  <select
                    value={
                      materialForm.material_type
                    }
                    onChange={(event) =>
                      setMaterialForm(
                        (previous) => ({
                          ...previous,
                          material_type:
                            event.target
                              .value as Material["material_type"],
                        }),
                      )
                    }
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
                  >
                    <option value="other">
                      Datei
                    </option>
                    <option value="pdf">
                      PDF
                    </option>
                    <option value="word">
                      Word
                    </option>
                    <option value="powerpoint">
                      PowerPoint
                    </option>
                    <option value="excel">
                      Excel
                    </option>
                    <option value="image">
                      Bild
                    </option>
                    <option value="text">
                      Text
                    </option>
                    <option value="link">
                      Link
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                    {ui.upload}
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={
                      handleFileChange
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-medium hover:bg-neutral-50"
                  >
                    <Upload size={15} />
                    {ui.chooseFile}
                  </button>

                  <p className="mt-2 truncate text-xs text-neutral-400">
                    {selectedFile
                      ? selectedFile.name
                      : editingMaterial?.file_name ||
                        ui.noFile}
                  </p>
                </div>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-neutral-100" />

                  <span className="text-[10px] font-semibold uppercase text-neutral-300">
                    oder
                  </span>

                  <div className="h-px flex-1 bg-neutral-100" />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                    {ui.externalLink}
                  </label>

                  <input
                    value={
                      materialForm.external_url
                    }
                    onChange={(event) =>
                      setMaterialForm(
                        (previous) => ({
                          ...previous,
                          external_url:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="https://..."
                    className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                    {ui.description}
                  </label>

                  <textarea
                    value={
                      materialForm.description
                    }
                    onChange={(event) =>
                      setMaterialForm(
                        (previous) => ({
                          ...previous,
                          description:
                            event.target
                              .value,
                        }),
                      )
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                    {ui.notes}
                  </label>

                  <textarea
                    value={
                      materialForm.notes
                    }
                    onChange={(event) =>
                      setMaterialForm(
                        (previous) => ({
                          ...previous,
                          notes:
                            event.target
                              .value,
                        }),
                      )
                    }
                    rows={2}
                    className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4">
                <button
                  type="button"
                  onClick={
                    closeMaterialModal
                  }
                  disabled={saving}
                  className="h-11 rounded-xl px-4 text-sm text-neutral-500"
                >
                  {ui.cancel}
                </button>

                <button
                  type="button"
                  onClick={
                    saveMaterial
                  }
                  disabled={
                    saving ||
                    !materialForm.title.trim() ||
                    (!editingMaterial &&
                      !selectedFile &&
                      !materialForm.external_url.trim())
                  }
                  className="h-11 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving
                    ? ui.saving
                    : editingMaterial
                      ? ui.save
                      : ui.create}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* DELETE FOLDER */}
      {deleteFolderTarget &&
        canManage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Trash2 size={18} />
                </div>

                <div>
                  <h2 className="font-semibold">
                    {ui.deleteFolderTitle}
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    {ui.deleteFolderText}
                  </p>

                  <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm font-medium">
                    {getFolderName(
                      deleteFolderTarget,
                      language,
                      folders,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteFolderTarget(
                      null,
                    )
                  }
                  disabled={deleting}
                  className="h-11 rounded-xl px-4 text-sm text-neutral-500"
                >
                  {ui.cancel}
                </button>

                <button
                  type="button"
                  onClick={
                    deleteFolder
                  }
                  disabled={deleting}
                  className="h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {deleting
                    ? ui.deleting
                    : ui.delete}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* DELETE ALL */}
      {deleteAllFoldersOpen &&
        canManage && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Trash2 size={19} />
                </div>

                <div>
                  <h2 className="font-semibold">
                    {
                      ui.deleteAllFoldersTitle
                    }
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-neutral-500">
                    {
                      ui.deleteAllFoldersText
                    }
                  </p>

                  <p className="mt-3 text-sm font-medium text-red-600">
                    {visibleFolders.length}{" "}
                    Ordner
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteAllFoldersOpen(
                      false,
                    )
                  }
                  disabled={deleting}
                  className="h-11 rounded-xl px-4 text-sm text-neutral-500"
                >
                  {ui.cancel}
                </button>

                <button
                  type="button"
                  onClick={
                    deleteAllChildFolders
                  }
                  disabled={deleting}
                  className="h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {deleting
                    ? ui.deletingAll
                    : ui.deleteAllFoldersConfirm}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* DELETE MATERIAL */}
      {deleteMaterialTarget &&
        canManage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Trash2 size={18} />
                </div>

                <div>
                  <h2 className="font-semibold">
                    {
                      ui.deleteMaterialTitle
                    }
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    {
                      ui.deleteMaterialText
                    }
                  </p>

                  <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm font-medium">
                    {
                      deleteMaterialTarget.title
                    }
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteMaterialTarget(
                      null,
                    )
                  }
                  disabled={deleting}
                  className="h-11 rounded-xl px-4 text-sm text-neutral-500"
                >
                  {ui.cancel}
                </button>

                <button
                  type="button"
                  onClick={
                    deleteMaterial
                  }
                  disabled={deleting}
                  className="h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {deleting
                    ? ui.deleting
                    : ui.delete}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}