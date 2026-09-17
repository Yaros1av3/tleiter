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

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { type Language } from "@/lib/translations";

type ContentLanguage = "de" | "ru" | null;

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
  material_type:
    | "pdf"
    | "word"
    | "powerpoint"
    | "excel"
    | "image"
    | "text"
    | "link"
    | "other";
  external_url: string;
  notes: string;
};

type Breadcrumb = {
  id: number;
  name: string;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

/**
 * Extracts the first number from a folder name.
 *
 * Examples:
 * "1. Jahr" -> 1
 * "2. Год" -> 2
 * "10. Genesis" -> 10
 * "66. Offenbarung" -> 66
 *
 * Folders without a number are sorted after numbered folders.
 */
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

/**
 * Sort folders naturally by the number written in their name.
 *
 * 1, 2, 3, 10, 11
 * instead of
 * 1, 10, 11, 2, 3
 */
function compareFoldersByNumber(
  a: MaterialFolder,
  b: MaterialFolder,
  language: Language,
  folders: MaterialFolder[],
) {
  const numberA = getFolderNumber(a);
  const numberB = getFolderNumber(b);

  if (numberA !== null && numberB !== null) {
    if (numberA !== numberB) {
      return numberA - numberB;
    }
  } else if (numberA !== null) {
    return -1;
  } else if (numberB !== null) {
    return 1;
  }

  return getFolderName(
    a,
    language,
    folders,
  ).localeCompare(
    getFolderName(
      b,
      language,
      folders,
    ),
    language === "ru" ? "ru" : "de",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

/**
 * Determines whether a folder belongs to the German or Russian branch.
 *
 * The language is inherited from the nearest ancestor named:
 * - Deutsch / Немецкий
 * - Russisch / Русский
 */
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

  let current = folders.find(
    (folder) => folder.id === folderId,
  );

  while (current) {
    const ownLanguage =
      getOwnFolderLanguage(current);

    if (ownLanguage) {
      return ownLanguage;
    }

    if (current.parent_id == null) {
      break;
    }

    current = folders.find(
      (folder) =>
        folder.id === current?.parent_id,
    );
  }

  return null;
}

function getFolderName(
  folder: MaterialFolder,
  uiLanguage: Language,
  folders: MaterialFolder[],
) {
  const contentLanguage =
    getFolderContentLanguage(
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
  date: string,
  language: Language,
) {
  return new Intl.DateTimeFormat(
    language === "ru"
      ? "ru-RU"
      : "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(new Date(date));
}

function getMaterialIcon(
  type: Material["material_type"],
  size = 19,
) {
  if (type === "pdf") {
    return (
      <FileText
        size={size}
        strokeWidth={1.8}
      />
    );
  }

  if (type === "word") {
    return (
      <FileText
        size={size}
        strokeWidth={1.8}
      />
    );
  }

  if (type === "powerpoint") {
    return (
      <FileText
        size={size}
        strokeWidth={1.8}
      />
    );
  }

  if (type === "excel") {
    return (
      <FileSpreadsheet
        size={size}
        strokeWidth={1.8}
      />
    );
  }

  if (type === "image") {
    return (
      <FileImage
        size={size}
        strokeWidth={1.8}
      />
    );
  }

  if (type === "link") {
    return (
      <LinkIcon
        size={size}
        strokeWidth={1.8}
      />
    );
  }

  if (type === "text") {
    return (
      <FileText
        size={size}
        strokeWidth={1.8}
      />
    );
  }

  return (
    <File
      size={size}
      strokeWidth={1.8}
    />
  );
}

function getMaterialTypeLabel(
  type: Material["material_type"],
  language: Language,
) {
  const labels: Record<
    Material["material_type"],
    { ru: string; de: string }
  > = {
    pdf: {
      ru: "PDF",
      de: "PDF",
    },
    word: {
      ru: "Word",
      de: "Word",
    },
    powerpoint: {
      ru: "PowerPoint",
      de: "PowerPoint",
    },
    excel: {
      ru: "Excel",
      de: "Excel",
    },
    image: {
      ru: "Изображение",
      de: "Bild",
    },
    text: {
      ru: "Текст",
      de: "Text",
    },
    link: {
      ru: "Ссылка",
      de: "Link",
    },
    other: {
      ru: "Файл",
      de: "Datei",
    },
  };

  return labels[type][language];
}

export default function MaterialsPage() {
  const [language, setLanguage] =
    useState<Language>("ru");

  const [folders, setFolders] =
    useState<MaterialFolder[]>([]);

  const [materials, setMaterials] =
    useState<Material[]>([]);

  const [currentFolderId, setCurrentFolderId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [folderModalOpen, setFolderModalOpen] =
    useState(false);

  const [
    materialModalOpen,
    setMaterialModalOpen,
  ] = useState(false);

  const [editingFolder, setEditingFolder] =
    useState<MaterialFolder | null>(null);

  const [
    editingMaterial,
    setEditingMaterial,
  ] = useState<Material | null>(null);

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

  const [saving, setSaving] =
    useState(false);

  const [
    deleteFolderTarget,
    setDeleteFolderTarget,
  ] = useState<MaterialFolder | null>(null);

  const [
    deleteMaterialTarget,
    setDeleteMaterialTarget,
  ] = useState<Material | null>(null);

  const [
    deleteAllFoldersOpen,
    setDeleteAllFoldersOpen,
  ] = useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const ui = {
    title:
      language === "ru"
        ? "Материалы"
        : "Materialien",

    subtitle:
      language === "ru"
        ? "Материалы для служения подростков"
        : "Materialien für den Teeniedienst",

    search:
      language === "ru"
        ? "Поиск материалов и папок..."
        : "Materialien und Ordner suchen...",

    root: "Teeniedienst",

    back:
      language === "ru"
        ? "Назад"
        : "Zurück",

    newFolder:
      language === "ru"
        ? "Новая папка"
        : "Neuer Ordner",

    upload:
      language === "ru"
        ? "Добавить материал"
        : "Material hinzufügen",

    deleteAllFolders:
      language === "ru"
        ? "Удалить все папки"
        : "Alle Ordner löschen",

    deleteAllFoldersTitle:
      language === "ru"
        ? "Удалить все папки?"
        : "Alle Ordner löschen?",

    deleteAllFoldersText:
      language === "ru"
        ? "Все папки внутри текущей папки, все вложенные папки и материалы будут удалены без возможности восстановления. Текущая папка останется."
        : "Alle Ordner innerhalb des aktuellen Ordners, alle Unterordner und Materialien werden dauerhaft gelöscht. Der aktuelle Ordner bleibt erhalten.",

    deleteAllFoldersConfirm:
      language === "ru"
        ? "Удалить всё"
        : "Alles löschen",

    folders:
      language === "ru"
        ? "Папки"
        : "Ordner",

    files:
      language === "ru"
        ? "Материалы"
        : "Materialien",

    empty:
      language === "ru"
        ? "В этой папке пока ничего нет"
        : "Dieser Ordner ist noch leer",

    noResults:
      language === "ru"
        ? "Ничего не найдено"
        : "Keine Ergebnisse gefunden",

    folder:
      language === "ru"
        ? "Папка"
        : "Ordner",

    file:
      language === "ru"
        ? "Материал"
        : "Material",

    edit:
      language === "ru"
        ? "Редактировать"
        : "Bearbeiten",

    delete:
      language === "ru"
        ? "Удалить"
        : "Löschen",

    cancel:
      language === "ru"
        ? "Отмена"
        : "Abbrechen",

    save:
      language === "ru"
        ? "Сохранить"
        : "Speichern",

    create:
      language === "ru"
        ? "Создать"
        : "Erstellen",

    nameGerman:
      language === "ru"
        ? "Название на немецком"
        : "Deutscher Name",

    nameRussian:
      language === "ru"
        ? "Название на русском"
        : "Russischer Name",

    description:
      language === "ru"
        ? "Описание"
        : "Beschreibung",

    titleField:
      language === "ru"
        ? "Название"
        : "Titel",

    materialType:
      language === "ru"
        ? "Тип материала"
        : "Materialtyp",

    externalLink:
      language === "ru"
        ? "Внешняя ссылка"
        : "Externer Link",

    notes:
      language === "ru"
        ? "Заметки"
        : "Notizen",

    chooseFile:
      language === "ru"
        ? "Выбрать файл"
        : "Datei auswählen",

    noFile:
      language === "ru"
        ? "Файл не выбран"
        : "Keine Datei ausgewählt",

    uploadFile:
      language === "ru"
        ? "Загрузить файл"
        : "Datei hochladen",

    deleteFolderTitle:
      language === "ru"
        ? "Удалить папку?"
        : "Ordner löschen?",

    deleteMaterialTitle:
      language === "ru"
        ? "Удалить материал?"
        : "Material löschen?",

    deleteFolderText:
      language === "ru"
        ? "Папка и все её вложенные элементы будут удалены."
        : "Der Ordner und alle darin enthaltenen Elemente werden gelöscht.",

    deleteMaterialText:
      language === "ru"
        ? "Материал будет удалён без возможности восстановления."
        : "Das Material wird dauerhaft gelöscht.",

    deleting:
      language === "ru"
        ? "Удаление..."
        : "Wird gelöscht...",

    deletingAll:
      language === "ru"
        ? "Удаление всех папок..."
        : "Alle Ordner werden gelöscht...",

    saving:
      language === "ru"
        ? "Сохранение..."
        : "Wird gespeichert...",
  };

  async function loadData() {
    setLoading(true);

    const [
      {
        data: folderData,
        error: folderError,
      },
      {
        data: materialData,
        error: materialError,
      },
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

    if (folderError) {
      console.error(folderError);
    }

    if (materialError) {
      console.error(materialError);
    }

    setFolders(folderData ?? []);
    setMaterials(materialData ?? []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

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
    currentFolderId,
    folders,
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
            );

      while (current) {
        result.unshift({
          id: current.id,
          name: getFolderName(
            current,
            language,
            folders,
          ),
        });

        if (
          current.parent_id == null
        ) {
          break;
        }

        current = folders.find(
          (folder) =>
            folder.id ===
            current?.parent_id,
        );
      }

      return result;
    }, [
      currentFolderId,
      folders,
      language,
    ]);

  const visibleFolders =
    useMemo(() => {
      const result = folders.filter(
        (folder) =>
          folder.parent_id ===
          currentFolderId,
      );

      const query = search
        .trim()
        .toLocaleLowerCase();

      const filtered = query
        ? result.filter((folder) => {
            const text = [
              folder.name,
              folder.name_de,
              folder.name_ru,
              folder.description,
            ]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase();

            return text.includes(query);
          })
        : result;

      return [...filtered].sort(
        (a, b) =>
          compareFoldersByNumber(
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
      language,
    ]);

  const visibleMaterials =
    useMemo(() => {
      const result = materials.filter(
        (material) =>
          material.folder_id ===
          currentFolderId,
      );

      const query = search
        .trim()
        .toLocaleLowerCase();

      if (!query) {
        return result;
      }

      return result.filter(
        (material) => {
          const text = [
            material.title,
            material.description,
            material.file_name,
            material.notes,
            material.source,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase();

          return text.includes(query);
        },
      );
    }, [
      materials,
      currentFolderId,
      search,
    ]);

  const totalItems =
    visibleFolders.length +
    visibleMaterials.length;

  function goToFolder(folderId: number) {
    setCurrentFolderId(folderId);
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

  function openCreateFolderModal() {
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
    setEditingFolder(folder);

    setFolderForm({
      name_de:
        folder.name_de ?? "",
      name_ru:
        folder.name_ru ?? "",
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
                nameRu ||
                nameDe,
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
        const { error } =
          await supabase
            .from("material_folders")
            .insert({
              name:
                nameRu ||
                nameDe,
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
        language === "ru"
          ? "Не удалось сохранить папку."
          : "Der Ordner konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteFolder() {
    if (!deleteFolderTarget) {
      return;
    }

    setDeleting(true);

    try {
      const { error } =
        await supabase
          .from("material_folders")
          .delete()
          .eq(
            "id",
            deleteFolderTarget.id,
          );

      if (error) {
        throw error;
      }

      setDeleteFolderTarget(null);

      await loadData();

      if (
        currentFolderId ===
        deleteFolderTarget.id
      ) {
        setCurrentFolderId(
          deleteFolderTarget.parent_id,
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        language === "ru"
          ? "Не удалось удалить папку."
          : "Der Ordner konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  }

  /**
   * Returns all descendant folder IDs,
   * including the selected child folders.
   *
   * Example:
   *
   * Current folder
   * ├── 1. Jahr
   * │   ├── 1. Mose
   * │   └── 2. Mose
   * └── 2. Jahr
   *     ├── 1. Mose
   *     └── 2. Mose
   *
   * When deleting all folders from Current folder,
   * every folder shown above is returned.
   */
  function getAllDescendantFolderIds(
    parentId: number,
  ) {
    const result: number[] = [];
    const queue: number[] = [parentId];

    while (queue.length > 0) {
      const currentId =
        queue.shift();

      if (
        currentId === undefined
      ) {
        continue;
      }

      const children =
        folders.filter(
          (folder) =>
            folder.parent_id ===
            currentId,
        );

      for (const child of children) {
        result.push(child.id);
        queue.push(child.id);
      }
    }

    return result;
  }

  /**
   * Deletes all child folders of the current folder.
   *
   * Important:
   * - The current folder itself stays.
   * - All nested folders are deleted.
   * - All DB materials inside them are deleted.
   * - Files belonging to those materials are also
   *   removed from Supabase Storage.
   */
  async function deleteAllChildFolders() {
    if (currentFolderId == null) {
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
            (folder) => folder.id,
          );

      if (
        childFolderIds.length === 0
      ) {
        setDeleteAllFoldersOpen(false);
        setDeleting(false);
        return;
      }

      const descendantFolderIds =
        getAllDescendantFolderIds(
          currentFolderId,
        );

      if (
        descendantFolderIds.length === 0
      ) {
        setDeleteAllFoldersOpen(false);
        setDeleting(false);
        return;
      }

      const materialsToDelete =
        materials.filter(
          (material) =>
            material.folder_id != null &&
            descendantFolderIds.includes(
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
              path,
            ): path is string =>
              Boolean(path),
          );

      /**
       * Remove physical files from Storage.
       *
       * Supabase allows removing multiple
       * objects in one request.
       */
      if (
        storagePaths.length > 0
      ) {
        const {
          error: storageError,
        } = await supabase.storage
          .from("materials")
          .remove(
            storagePaths,
          );

        if (storageError) {
          console.warn(
            "Storage cleanup warning:",
            storageError,
          );
        }
      }

      /**
       * Delete the top-level child folders.
       *
       * Because material_folders.parent_id
       * uses ON DELETE CASCADE, this removes
       * the complete nested tree and the
       * materials belonging to it.
       */
      const {
        error: folderDeleteError,
      } = await supabase
        .from("material_folders")
        .delete()
        .in(
          "id",
          childFolderIds,
        );

      if (folderDeleteError) {
        throw folderDeleteError;
      }

      setDeleteAllFoldersOpen(false);

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        language === "ru"
          ? "Не удалось удалить все папки."
          : "Die Ordner konnten nicht vollständig gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function openCreateMaterialModal() {
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
    setEditingMaterial(material);

    setMaterialForm({
      title: material.title,
      description:
        material.description ??
        "",
      material_type:
        material.material_type,
      external_url:
        material.external_url ??
        "",
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

    if (
      file &&
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

    if (file) {
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
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".gif")
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
          material_type:
            type,
        }),
      );
    }
  }

  async function saveMaterial() {
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
        const originalFileName = selectedFile.name;

const extensionMatch =
  originalFileName.match(
    /(\.[^./\\]+)$/,
  );

const extension =
  extensionMatch?.[1]
    ?.toLowerCase() ?? "";

const uniqueName =
  `${Date.now()}_${crypto.randomUUID()}${extension}`;

        const folderPath =
          currentFolderId != null
            ? String(
                currentFolderId,
              )
            : "root";

        storagePath =
          `${folderPath}/${uniqueName}`;

        const {
          error: uploadError,
        } = await supabase.storage
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
        } = supabase.storage
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
          lower.endsWith(".jpg") ||
          lower.endsWith(".jpeg") ||
          lower.endsWith(".png") ||
          lower.endsWith(".webp") ||
          lower.endsWith(".gif")
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
        const { error } =
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
      } else {
        const { error } =
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
      console.error(error);

      alert(
        language === "ru"
          ? "Не удалось сохранить материал."
          : "Das Material konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteMaterial() {
    if (!deleteMaterialTarget) {
      return;
    }

    setDeleting(true);

    try {
      if (
        deleteMaterialTarget.storage_path
      ) {
        const {
          error: storageError,
        } = await supabase.storage
          .from("materials")
          .remove([
            deleteMaterialTarget.storage_path,
          ]);

        if (storageError) {
          console.warn(
            storageError,
          );
        }
      }

      const { error } =
        await supabase
          .from("materials")
          .delete()
          .eq(
            "id",
            deleteMaterialTarget.id,
          );

      if (error) {
        throw error;
      }

      setDeleteMaterialTarget(
        null,
      );

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        language === "ru"
          ? "Не удалось удалить материал."
          : "Das Material konnte nicht gelöscht werden.",
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

  return (
    <div className="min-h-screen bg-[#f5f5f4]">
      <Sidebar
        language={language}
      />

      <div className="min-h-screen pl-[72px]">
        <Header
          language={language}
          setLanguage={setLanguage}
        />

        <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="mb-5">
            <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white">
                    <BookOpen
                      size={18}
                      strokeWidth={1.8}
                    />
                  </div>

                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    {currentContentLanguage ===
                    "de"
                      ? "Deutsch"
                      : currentContentLanguage ===
                          "ru"
                        ? "Русский"
                        : language ===
                            "de"
                          ? "Materialien"
                          : "Материалы"}
                  </span>
                </div>

                <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
                  {currentFolder
                    ? getFolderName(
                        currentFolder,
                        language,
                        folders,
                      )
                    : ui.title}
                </h1>

                <p className="mt-1 text-sm text-neutral-500">
                  {currentFolder
                    ? currentFolder.description ||
                      ui.subtitle
                    : ui.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={
                    openCreateFolderModal
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <Folder
                    size={16}
                    strokeWidth={1.8}
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
                    currentFolderId ==
                      null ||
                    visibleFolders.length ===
                      0
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-3.5 text-sm font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2
                    size={16}
                    strokeWidth={1.8}
                  />

                  {ui.deleteAllFolders}
                </button>

                <button
                  type="button"
                  onClick={
                    openCreateMaterialModal
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-3.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  <Plus
                    size={16}
                    strokeWidth={2}
                  />

                  {ui.upload}
                </button>
              </div>
            </div>
          </section>

          {/* Toolbar */}
          <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search
                size={16}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder={
                  ui.search
                }
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span>
                {totalItems}{" "}
                {language === "ru"
                  ? "элементов"
                  : "Elemente"}
              </span>
            </div>
          </section>

          {/* Breadcrumbs */}
          <div className="mb-4 flex items-center gap-1 overflow-x-auto whitespace-nowrap text-sm">
            <button
              type="button"
              onClick={() => {
                setCurrentFolderId(
                  null,
                );
                setSearch("");
              }}
              className={`shrink-0 rounded-lg px-2 py-1.5 transition ${
                currentFolderId ===
                null
                  ? "font-medium text-neutral-900"
                  : "text-neutral-500 hover:bg-white hover:text-neutral-900"
              }`}
            >
              {ui.root}
            </button>

            {breadcrumbs.map(
              (
                breadcrumb,
                index,
              ) => (
                <div
                  key={
                    breadcrumb.id
                  }
                  className="flex shrink-0 items-center gap-1"
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
                    className={`rounded-lg px-2 py-1.5 transition ${
                      index ===
                      breadcrumbs.length -
                        1
                        ? "font-medium text-neutral-900"
                        : "text-neutral-500 hover:bg-white hover:text-neutral-900"
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

          {/* Back */}
          {currentFolder && (
            <button
              type="button"
              onClick={
                goBack
              }
              className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-500 transition hover:bg-white hover:text-neutral-900"
            >
              <ArrowLeft
                size={15}
                strokeWidth={1.8}
              />

              {ui.back}
            </button>
          )}

          {/* Content */}
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-neutral-400">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-700" />

                  {language ===
                  "ru"
                    ? "Загрузка..."
                    : "Wird geladen..."}
                </div>
              </div>
            ) : totalItems ===
              0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                  {search ? (
                    <Search
                      size={20}
                      strokeWidth={1.7}
                    />
                  ) : (
                    <FolderOpen
                      size={20}
                      strokeWidth={1.7}
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
              <>
                {/* Desktop */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-[minmax(0,1fr)_130px_150px_54px] border-b border-neutral-200 bg-neutral-50/70 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                    <span>
                      {ui.file}
                    </span>

                    <span>
                      {language ===
                      "ru"
                        ? "Изменено"
                        : "Geändert"}
                    </span>

                    <span>
                      {language ===
                      "ru"
                        ? "Источник"
                        : "Quelle"}
                    </span>

                    <span />
                  </div>

                  <div className="divide-y divide-neutral-100">
                    {visibleFolders.map(
                      (folder) => (
                        <div
                          key={`folder-${folder.id}`}
                          className="group grid grid-cols-[minmax(0,1fr)_130px_150px_54px] items-center px-5 py-3.5 transition hover:bg-neutral-50"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              goToFolder(
                                folder.id,
                              )
                            }
                            className="flex min-w-0 items-center gap-3 text-left"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                              <Folder
                                size={
                                  18
                                }
                                strokeWidth={
                                  1.7
                                }
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-neutral-800">
                                {getFolderName(
                                  folder,
                                  language,
                                  folders,
                                )}
                              </div>

                              {folder.description && (
                                <div className="mt-0.5 truncate text-xs text-neutral-400">
                                  {
                                    folder.description
                                  }
                                </div>
                              )}
                            </div>
                          </button>

                          <span className="text-xs text-neutral-400">
                            {formatDate(
                              folder.updated_at,
                              language,
                            )}
                          </span>

                          <span className="text-xs text-neutral-400">
                            TLeiter
                          </span>

                          <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() =>
                                openEditFolderModal(
                                  folder,
                                )
                              }
                              title={
                                ui.edit
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                            >
                              <Pencil
                                size={
                                  14
                                }
                                strokeWidth={
                                  1.8
                                }
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDeleteFolderTarget(
                                  folder,
                                )
                              }
                              title={
                                ui.delete
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2
                                size={
                                  14
                                }
                                strokeWidth={
                                  1.8
                                }
                              />
                            </button>
                          </div>
                        </div>
                      ),
                    )}

                    {visibleMaterials.map(
                      (material) => (
                        <div
                          key={`material-${material.id}`}
                          className="group grid grid-cols-[minmax(0,1fr)_130px_150px_54px] items-center px-5 py-3.5 transition hover:bg-neutral-50"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openMaterial(
                                material,
                              )
                            }
                            className="flex min-w-0 items-center gap-3 text-left"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                              {getMaterialIcon(
                                material.material_type,
                                18,
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-neutral-800">
                                {
                                  material.title
                                }
                              </div>

                              <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-neutral-400">
                                <span>
                                  {getMaterialTypeLabel(
                                    material.material_type,
                                    language,
                                  )}
                                </span>

                                {material.file_name && (
                                  <>
                                    <span>
                                      ·
                                    </span>

                                    <span className="truncate">
                                      {
                                        material.file_name
                                      }
                                    </span>
                                  </>
                                )}

                                {material.file_size && (
                                  <>
                                    <span>
                                      ·
                                    </span>

                                    <span>
                                      {formatFileSize(
                                        material.file_size,
                                      )}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>

                          <span className="text-xs text-neutral-400">
                            {formatDate(
                              material.updated_at,
                              language,
                            )}
                          </span>

                          <span className="truncate text-xs text-neutral-400">
                            {material.source ||
                              "TLeiter"}
                          </span>

                          <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() =>
                                openEditMaterialModal(
                                  material,
                                )
                              }
                              title={
                                ui.edit
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                            >
                              <Pencil
                                size={
                                  14
                                }
                                strokeWidth={
                                  1.8
                                }
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDeleteMaterialTarget(
                                  material,
                                )
                              }
                              title={
                                ui.delete
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2
                                size={
                                  14
                                }
                                strokeWidth={
                                  1.8
                                }
                              />
                            </button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Mobile */}
                <div className="divide-y divide-neutral-100 md:hidden">
                  {visibleFolders.map(
                    (folder) => (
                      <div
                        key={`mobile-folder-${folder.id}`}
                        className="flex items-center gap-3 p-4"
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
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                            <Folder
                              size={
                                19
                              }
                              strokeWidth={
                                1.7
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-neutral-800">
                              {getFolderName(
                                folder,
                                language,
                                folders,
                              )}
                            </div>

                            <div className="mt-0.5 text-xs text-neutral-400">
                              {
                                ui.folder
                              }
                            </div>
                          </div>

                          <ChevronRight
                            size={
                              17
                            }
                            className="shrink-0 text-neutral-300"
                          />
                        </button>

                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              openEditFolderModal(
                                folder,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                          >
                            <Pencil
                              size={
                                14
                              }
                              strokeWidth={
                                1.8
                              }
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteFolderTarget(
                                folder,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2
                              size={
                                14
                              }
                              strokeWidth={
                                1.8
                              }
                            />
                          </button>
                        </div>
                      </div>
                    ),
                  )}

                  {visibleMaterials.map(
                    (material) => (
                      <div
                        key={`mobile-material-${material.id}`}
                        className="flex items-center gap-3 p-4"
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
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                            {getMaterialIcon(
                              material.material_type,
                              18,
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-neutral-800">
                              {
                                material.title
                              }
                            </div>

                            <div className="mt-0.5 truncate text-xs text-neutral-400">
                              {getMaterialTypeLabel(
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
                            size={
                              17
                            }
                            className="shrink-0 text-neutral-300"
                          />
                        </button>

                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              openEditMaterialModal(
                                material,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                          >
                            <Pencil
                              size={
                                14
                              }
                              strokeWidth={
                                1.8
                              }
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteMaterialTarget(
                                material,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2
                              size={
                                14
                              }
                              strokeWidth={
                                1.8
                              }
                            />
                          </button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      {/* Folder modal */}
      {folderModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  {editingFolder
                    ? ui.edit
                    : ui.newFolder}
                </h2>

                <p className="mt-0.5 text-xs text-neutral-400">
                  {ui.folder}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeFolderModal
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X
                  size={17}
                  strokeWidth={1.8}
                />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                  {
                    ui.nameGerman
                  }
                </label>

                <input
                  value={
                    folderForm.name_de
                  }
                  onChange={(
                    event,
                  ) =>
                    setFolderForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        name_de:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="z. B. 1. Jahr"
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                  {
                    ui.nameRussian
                  }
                </label>

                <input
                  value={
                    folderForm.name_ru
                  }
                  onChange={(
                    event,
                  ) =>
                    setFolderForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        name_ru:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="например 1. Год"
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                  {
                    ui.description
                  }
                </label>

                <textarea
                  value={
                    folderForm.description
                  }
                  onChange={(
                    event,
                  ) =>
                    setFolderForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        description:
                          event.target.value,
                      }),
                    )
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50/70 px-5 py-4">
              <button
                type="button"
                onClick={
                  closeFolderModal
                }
                disabled={saving}
                className="h-10 rounded-xl px-4 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                {ui.cancel}
              </button>

              <button
                type="button"
                onClick={
                  saveFolder
                }
                disabled={
                  saving ||
                  (!folderForm.name_de.trim() &&
                    !folderForm.name_ru.trim())
                }
                className="h-10 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Material modal */}
      {materialModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  {editingMaterial
                    ? ui.edit
                    : ui.upload}
                </h2>

                <p className="mt-0.5 text-xs text-neutral-400">
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
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X
                  size={17}
                  strokeWidth={1.8}
                />
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
                  onChange={(
                    event,
                  ) =>
                    setMaterialForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        title:
                          event.target.value,
                      }),
                    )
                  }
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                  {
                    ui.materialType
                  }
                </label>

                <select
                  value={
                    materialForm.material_type
                  }
                  onChange={(
                    event,
                  ) =>
                    setMaterialForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        material_type:
                          event.target
                            .value as Material["material_type"],
                      }),
                    )
                  }
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
                >
                  <option value="other">
                    {getMaterialTypeLabel(
                      "other",
                      language,
                    )}
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
                    {getMaterialTypeLabel(
                      "image",
                      language,
                    )}
                  </option>

                  <option value="text">
                    {getMaterialTypeLabel(
                      "text",
                      language,
                    )}
                  </option>

                  <option value="link">
                    {getMaterialTypeLabel(
                      "link",
                      language,
                    )}
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                  {
                    ui.uploadFile
                  }
                </label>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  className="hidden"
                  onChange={
                    handleFileChange
                  }
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <Upload
                      size={15}
                      strokeWidth={1.8}
                    />

                    {
                      ui.chooseFile
                    }
                  </button>

                  <span className="min-w-0 truncate text-xs text-neutral-400">
                    {selectedFile
                      ? selectedFile.name
                      : editingMaterial?.file_name ||
                        ui.noFile}
                  </span>
                </div>
              </div>

              <div className="relative flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-neutral-100" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-300">
                  {language ===
                  "ru"
                    ? "или"
                    : "oder"}
                </span>

                <div className="h-px flex-1 bg-neutral-100" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                  {
                    ui.externalLink
                  }
                </label>

                <input
                  value={
                    materialForm.external_url
                  }
                  onChange={(
                    event,
                  ) =>
                    setMaterialForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        external_url:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="https://..."
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                  {
                    ui.description
                  }
                </label>

                <textarea
                  value={
                    materialForm.description
                  }
                  onChange={(
                    event,
                  ) =>
                    setMaterialForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        description:
                          event.target.value,
                      }),
                    )
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
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
                  onChange={(
                    event,
                  ) =>
                    setMaterialForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                  rows={2}
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                />
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50/90 px-5 py-4 backdrop-blur">
              <button
                type="button"
                onClick={
                  closeMaterialModal
                }
                disabled={saving}
                className="h-10 rounded-xl px-4 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
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
                className="h-10 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Delete folder */}
      {deleteFolderTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trash2
                  size={18}
                  strokeWidth={1.8}
                />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-semibold text-neutral-900">
                  {
                    ui.deleteFolderTitle
                  }
                </h2>

                <p className="mt-1 text-sm leading-5 text-neutral-500">
                  {
                    ui.deleteFolderText
                  }
                </p>

                <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800">
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
                className="h-10 rounded-xl px-4 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                {ui.cancel}
              </button>

              <button
                type="button"
                onClick={
                  deleteFolder
                }
                disabled={deleting}
                className="h-10 rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting
                  ? ui.deleting
                  : ui.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete ALL folders */}
      {deleteAllFoldersOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[3px]">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl">
            <div className="border-b border-red-100 bg-red-50/70 px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Trash2
                    size={20}
                    strokeWidth={1.8}
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-neutral-900">
                    {
                      ui.deleteAllFoldersTitle
                    }
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-neutral-500">
                    {
                      ui.deleteAllFoldersText
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-red-500">
                  {currentFolder
                    ? getFolderName(
                        currentFolder,
                        language,
                        folders,
                      )
                    : ui.root}
                </div>

                <div className="mt-2 text-sm text-neutral-700">
                  {language ===
                  "ru"
                    ? `Будет удалено папок: ${visibleFolders.length}`
                    : `Zu löschende Ordner: ${visibleFolders.length}`}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 bg-neutral-50/70 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setDeleteAllFoldersOpen(
                    false,
                  )
                }
                disabled={deleting}
                className="h-10 rounded-xl px-4 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                {ui.cancel}
              </button>

              <button
                type="button"
                onClick={
                  deleteAllChildFolders
                }
                disabled={deleting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2
                  size={15}
                  strokeWidth={1.8}
                />

                {deleting
                  ? ui.deletingAll
                  : ui.deleteAllFoldersConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete material */}
      {deleteMaterialTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trash2
                  size={18}
                  strokeWidth={1.8}
                />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-semibold text-neutral-900">
                  {
                    ui.deleteMaterialTitle
                  }
                </h2>

                <p className="mt-1 text-sm leading-5 text-neutral-500">
                  {
                    ui.deleteMaterialText
                  }
                </p>

                <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800">
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
                className="h-10 rounded-xl px-4 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                {ui.cancel}
              </button>

              <button
                type="button"
                onClick={
                  deleteMaterial
                }
                disabled={deleting}
                className="h-10 rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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