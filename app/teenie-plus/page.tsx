"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Cake,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ListChecks,
  MessageCircle,
  Plus,
  Settings2,
  Share2,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

/* =====================================================
   TYPES
===================================================== */

type AttendanceEntry = {
  id: number;
  entry_date: string;
  topic: string | null;
  attendee_count: number | null;
};

type ShoppingItem = {
  id: number;
  title: string;
  note: string | null;
  is_purchased: boolean;
  created_at: string;
};

type Teen = {
  id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
};

/* =====================================================
   HELPERS
===================================================== */

/* 0 = воскресенье ... 6 = суббота. По умолчанию — вторник. */
const DEFAULT_WEEKDAYS = [2];

const WEEKDAY_LABELS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const WEEKDAY_LABELS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getMatchingDatesInRange(
  start: Date,
  end: Date,
  weekdays: number[],
) {
  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    if (weekdays.includes(cursor.getDay())) {
      dates.push(toDateString(cursor));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function formatRowDate(dateString: string, labels: string[]) {
  const date = parseDate(dateString);

  return `${labels[date.getDay()]} ${pad(date.getDate())}.${pad(
    date.getMonth() + 1,
  )}`;
}

/* ---------- Текст списка покупок (для WhatsApp / буфера) ---------- */

function buildShoppingText(items: ShoppingItem[], isRu: boolean) {
  const date = new Date().toLocaleDateString(isRu ? "ru-RU" : "de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const head = isRu
    ? "🛒 *Список покупок — Teenie+*"
    : "🛒 *Einkaufsliste — Teenie+*";

  const lines = items.map(
    (item, index) =>
      `${index + 1}. ${item.title}${item.note ? ` — ${item.note}` : ""}`,
  );

  if (lines.length === 0) {
    lines.push(isRu ? "Список пуст." : "Die Liste ist leer.");
  }

  return [head, `📅 ${date}`, "", ...lines].join("\n");
}

/* ---------- Красивая картинка со списком (canvas, без библиотек) ---------- */

const CANVAS_FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;

    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (ctx.measureText(word).width > maxWidth) {
      let chunk = "";

      for (const char of word) {
        if (ctx.measureText(chunk + char).width > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }

      current = chunk;
    } else {
      current = word;
    }
  }

  if (current) lines.push(current);

  return lines.length > 0 ? lines : [""];
}

async function renderShoppingImage(
  items: ShoppingItem[],
  isRu: boolean,
): Promise<Blob | null> {
  const W = 1080;
  const OUTER = 40;
  const PAD = 56;
  const CARD_X = OUTER;
  const CARD_W = W - OUTER * 2;
  const HEADER_H = 250;
  const FOOTER_H = 130;

  const measureCtx = document.createElement("canvas").getContext("2d");

  if (!measureCtx) return null;

  const textX = CARD_X + PAD + 44 + 28;
  const maxTextW = CARD_X + CARD_W - PAD - textX;

  const rows = items.map((item) => {
    measureCtx.font = `600 40px ${CANVAS_FONT}`;
    const titleLines = wrapText(measureCtx, item.title, maxTextW);

    measureCtx.font = `400 30px ${CANVAS_FONT}`;
    const noteLines = item.note
      ? wrapText(measureCtx, item.note, maxTextW)
      : [];

    const height =
      34 * 2 +
      titleLines.length * 50 +
      (noteLines.length > 0 ? 8 + noteLines.length * 40 : 0);

    return { titleLines, noteLines, height: Math.max(height, 120) };
  });

  const bodyH =
    rows.length > 0 ? rows.reduce((sum, row) => sum + row.height, 0) : 200;

  const cardH = HEADER_H + bodyH + FOOTER_H;
  const H = cardH + OUTER * 2;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  ctx.textBaseline = "top";

  /* фон и карточка */
  ctx.fillStyle = "#f1f2f3";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.shadowColor = "rgba(17,24,32,0.10)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, CARD_X, OUTER, CARD_W, cardH, 48);
  ctx.fill();
  ctx.restore();

  /* тёмная шапка */
  const hx = CARD_X + 24;
  const hy = OUTER + 24;
  const hw = CARD_W - 48;
  const hh = 200;

  ctx.fillStyle = "#111820";
  roundRectPath(ctx, hx, hy, hw, hh, 36);
  ctx.fill();

  /* логотип */
  const logo = await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/tlite-logo.png";
  });

  const logoX = hx + 40;
  const logoY = hy + 50;

  ctx.save();
  roundRectPath(ctx, logoX, logoY, 100, 100, 26);
  ctx.clip();

  if (logo) {
    ctx.drawImage(logo, logoX, logoY, 100, 100);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(logoX, logoY, 100, 100);
  }

  ctx.restore();

  const headTextX = logoX + 100 + 32;

  ctx.fillStyle = "#8a939d";
  ctx.font = `700 24px ${CANVAS_FONT}`;
  ctx.fillText("TEENIE+  ·  TLIGHT", headTextX, hy + 46);

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 56px ${CANVAS_FONT}`;
  ctx.fillText(
    isRu ? "Список покупок" : "Einkaufsliste",
    headTextX,
    hy + 80,
  );

  ctx.fillStyle = "#9aa5b1";
  ctx.font = `500 28px ${CANVAS_FONT}`;
  ctx.fillText(
    new Date().toLocaleDateString(isRu ? "ru-RU" : "de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    headTextX,
    hy + 148,
  );

  /* пункты */
  let cursor = OUTER + HEADER_H;

  if (rows.length === 0) {
    ctx.fillStyle = "#9aa2ad";
    ctx.font = `500 34px ${CANVAS_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(
      isRu ? "Список пока пуст" : "Die Liste ist noch leer",
      W / 2,
      cursor + 80,
    );
    ctx.textAlign = "left";
  }

  rows.forEach((row, index) => {
    if (index > 0) {
      ctx.fillStyle = "#eceef0";
      ctx.fillRect(CARD_X + PAD, cursor, CARD_W - PAD * 2, 2);
    }

    /* чекбокс */
    ctx.strokeStyle = "#c9ced4";
    ctx.lineWidth = 3;
    roundRectPath(ctx, CARD_X + PAD, cursor + 35, 44, 44, 12);
    ctx.stroke();

    /* название */
    ctx.fillStyle = "#111820";
    ctx.font = `600 40px ${CANVAS_FONT}`;

    row.titleLines.forEach((line, lineIndex) => {
      ctx.fillText(line, textX, cursor + 34 + lineIndex * 50);
    });

    /* заметка */
    if (row.noteLines.length > 0) {
      ctx.fillStyle = "#8a939d";
      ctx.font = `400 30px ${CANVAS_FONT}`;

      row.noteLines.forEach((line, lineIndex) => {
        ctx.fillText(
          line,
          textX,
          cursor + 34 + row.titleLines.length * 50 + 8 + lineIndex * 40,
        );
      });
    }

    cursor += row.height;
  });

  /* подвал */
  const footerY = OUTER + HEADER_H + bodyH;

  ctx.fillStyle = "#eceef0";
  ctx.fillRect(CARD_X + PAD, footerY + 10, CARD_W - PAD * 2, 2);

  ctx.fillStyle = "#65707d";
  ctx.font = `600 30px ${CANVAS_FONT}`;
  ctx.fillText(
    isRu ? `Всего пунктов: ${items.length}` : `Punkte gesamt: ${items.length}`,
    CARD_X + PAD,
    footerY + 44,
  );

  ctx.fillStyle = "#b1b7bf";
  ctx.font = `500 26px ${CANVAS_FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("tlight-workspace.vercel.app", CARD_X + CARD_W - PAD, footerY + 47);
  ctx.textAlign = "left";

  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/png"),
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  /* revoke сразу может оборвать скачивание — даём браузеру время */
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

/* =====================================================
   PAGE
===================================================== */

export default function TeeniePlusPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isRu = language === "ru";
  const locale = isRu ? "ru-RU" : "de-DE";
  const weekdayLabels = isRu ? WEEKDAY_LABELS_RU : WEEKDAY_LABELS_DE;

  const [tab, setTab] = useState<"attendance" | "shopping">("attendance");

  /* ================= ПОСЕЩАЕМОСТЬ ================= */

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [attendanceError, setAttendanceError] = useState(false);

  const [weekdays, setWeekdays] = useState<number[]>(DEFAULT_WEEKDAYS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftWeekdays, setDraftWeekdays] =
    useState<number[]>(DEFAULT_WEEKDAYS);
  const [savingSettings, setSavingSettings] = useState(false);

  /* строки с другими днями недели скрыты, пока не нажмёшь «Показать» */
  const [showAllDays, setShowAllDays] = useState(false);

  /* строки, которые ты сам добавил или перенёс — не прячем */
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);

  const requestRef = useRef(0);

  const todayString = toDateString(new Date());

  const monthKey = `${viewMonth.getFullYear()}-${pad(
    viewMonth.getMonth() + 1,
  )}`;

  const isCurrentMonth = monthKey === todayString.slice(0, 7);

  const monthLabel = viewMonth.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase
        .from("teenie_attendance_settings")
        .select("weekdays")
        .eq("id", 1)
        .single();

      if (error) {
        console.error("Teenie+ settings:", error.message, error.code);
      }

      const days: number[] =
        Array.isArray(data?.weekdays) && data.weekdays.length > 0
          ? data.weekdays
          : DEFAULT_WEEKDAYS;

      setWeekdays(days);
      setDraftWeekdays(days);
      setSettingsLoaded(true);
    }

    loadSettings();
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;

    loadMonth(viewMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth, settingsLoaded]);

  function getMonthBounds(month: Date) {
    return {
      start: new Date(month.getFullYear(), month.getMonth(), 1),
      end: new Date(month.getFullYear(), month.getMonth() + 1, 0),
    };
  }

  async function fetchMonth(month: Date) {
    const { start, end } = getMonthBounds(month);

    const { data, error } = await supabase
      .from("teenie_attendance_entries")
      .select("id, entry_date, topic, attendee_count")
      .gte("entry_date", toDateString(start))
      .lte("entry_date", toDateString(end))
      .order("entry_date", { ascending: true });

    if (error) {
      console.error("Teenie+ fetchMonth:", error.message, error.code);
      return null;
    }

    return (data ?? []) as AttendanceEntry[];
  }

  async function ensureRecurringDates(
    start: Date,
    end: Date,
    activeWeekdays: number[],
  ) {
    const dates = getMatchingDatesInRange(start, end, activeWeekdays);

    if (dates.length === 0) return;

    const { error } = await supabase
      .from("teenie_attendance_entries")
      .upsert(
        dates.map((entry_date) => ({ entry_date })),
        { onConflict: "entry_date", ignoreDuplicates: true },
      );

    if (error) {
      console.error("Teenie+ ensure:", error.message, error.code);
    }
  }

  /*
   * Месяц открывается как одна таблица. Для каждого выбранного
   * дня недели, которого в месяце ещё нет, создаются строки.
   * (Отдельные удалённые вручную строки не возвращаются.)
   */
  async function loadMonth(month: Date, days: number[] = weekdays) {
    const requestId = ++requestRef.current;

    setLoadingAttendance(true);
    setAttendanceError(false);

    let rows = await fetchMonth(month);

    if (rows) {
      const existing = rows;

      /* для каждого выбранного дня недели, которого в месяце ещё нет — создаём строки */
      const missingDays = days.filter(
        (day) =>
          !existing.some((row) => parseDate(row.entry_date).getDay() === day),
      );

      if (missingDays.length > 0) {
        const { start, end } = getMonthBounds(month);

        await ensureRecurringDates(start, end, missingDays);
        rows = await fetchMonth(month);
      }
    }

    if (requestId !== requestRef.current) return;

    if (rows === null) {
      setAttendanceError(true);
      setEntries([]);
    } else {
      setEntries(rows);
    }

    setLoadingAttendance(false);
  }

  function shiftMonth(delta: number) {
    setViewMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  function goToCurrentMonth() {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  async function saveWeekdaySettings() {
    if (draftWeekdays.length === 0) return;

    setSavingSettings(true);

    const { error } = await supabase
      .from("teenie_attendance_settings")
      .update({
        weekdays: draftWeekdays,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error("Teenie+ save settings:", error.message, error.code);
      setSavingSettings(false);
      return;
    }

    setWeekdays(draftWeekdays);
    setShowAllDays(false);

    await loadMonth(viewMonth, draftWeekdays);

    setSavingSettings(false);
    setSettingsOpen(false);
  }

  function toggleDraftWeekday(day: number) {
    setDraftWeekdays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort(),
    );
  }

  async function updateEntry(id: number, patch: Partial<AttendanceEntry>) {
    const previous = entries;

    if (patch.entry_date) {
      setPinnedIds((current) =>
        current.includes(id) ? current : [...current, id],
      );
    }

    setEntries((current) =>
      current
        .map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
        .filter((entry) => entry.entry_date.slice(0, 7) === monthKey)
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
    );

    const { error } = await supabase
      .from("teenie_attendance_entries")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Teenie+ update:", error.message, error.code);

      if (error.code === "23505") {
        alert(
          isRu
            ? "Эта дата уже есть в таблице."
            : "Dieses Datum gibt es bereits in der Tabelle.",
        );
      }

      setEntries(previous);
    }
  }

  async function addRow() {
    const now = new Date();
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const used = new Set(entries.map((entry) => entry.entry_date));

    let day =
      now.getFullYear() === year && now.getMonth() === month
        ? now.getDate()
        : 1;

    let candidate = toDateString(new Date(year, month, day));
    let guard = 0;

    while (used.has(candidate) && guard < 40) {
      day = (day % daysInMonth) + 1;
      candidate = toDateString(new Date(year, month, day));
      guard += 1;
    }

    const { data, error } = await supabase
      .from("teenie_attendance_entries")
      .insert({ entry_date: candidate })
      .select("id, entry_date, topic, attendee_count")
      .single();

    if (error) {
      console.error("Teenie+ addRow:", error.message, error.code);
      return;
    }

    if (data) {
      const created = data as AttendanceEntry;

      setPinnedIds((current) => [...current, created.id]);

      setEntries((current) =>
        [...current, created].sort((a, b) =>
          a.entry_date.localeCompare(b.entry_date),
        ),
      );
    }
  }

  async function deleteEntry(id: number) {
    const confirmed = window.confirm(
      isRu ? "Удалить эту строку?" : "Diese Zeile löschen?",
    );

    if (!confirmed) return;

    setEntries((current) => current.filter((entry) => entry.id !== id));

    const { error } = await supabase
      .from("teenie_attendance_entries")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Teenie+ delete:", error.message, error.code);
      loadMonth(viewMonth);
    }
  }

  const matchesWeekdays = (entry: AttendanceEntry) =>
    weekdays.includes(parseDate(entry.entry_date).getDay()) ||
    pinnedIds.includes(entry.id);

  const visibleEntries = useMemo(
    () => (showAllDays ? entries : entries.filter(matchesWeekdays)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, showAllDays, weekdays, pinnedIds],
  );

  const otherDaysCount = useMemo(
    () => entries.filter((entry) => !matchesWeekdays(entry)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, weekdays, pinnedIds],
  );

  const stats = useMemo(() => {
    const counted = visibleEntries.filter(
      (entry) => entry.attendee_count != null,
    );
    const total = counted.reduce(
      (sum, entry) => sum + (entry.attendee_count ?? 0),
      0,
    );

    return {
      sessions: visibleEntries.length,
      total,
      average:
        counted.length > 0
          ? Math.round((total / counted.length) * 10) / 10
          : null,
    };
  }, [visibleEntries]);

  /* ================= ПОДРОСТКИ: ДНИ РОЖДЕНИЯ / ВОЗРАСТ ================= */

  const [teens, setTeens] = useState<Teen[]>([]);

  useEffect(() => {
    async function loadTeens() {
      const { data, error } = await supabase
        .from("teens")
        .select("id, first_name, last_name, birth_date")
        .eq("is_active", true)
        .order("last_name", { ascending: true });

      if (error) {
        console.error("Teenie+ teens:", error.message, error.code);
        return;
      }

      setTeens((data ?? []) as Teen[]);
    }

    loadTeens();
  }, []);

  const teenInfo = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    const list = teens.map((teen) => {
      const birth = parseDate(teen.birth_date);
      const birthMonth = birth.getMonth();
      const birthDay = birth.getDate();
      const birthYear = birth.getFullYear();

      const day =
        birthMonth === 1 && birthDay === 29 && !isLeapYear(year)
          ? 28
          : birthDay;

      let age = year - birthYear;

      if (month < birthMonth || (month === birthMonth && today < day)) {
        age -= 1;
      }

      return { teen, month: birthMonth, day, turning: year - birthYear, age };
    });

    return {
      today,
      monthName: now.toLocaleDateString(locale, { month: "long" }),
      thisMonth: list
        .filter((item) => item.month === month)
        .sort((a, b) => a.day - b.day),
      aged: list
        .filter((item) => item.age === 14 || item.age === 15)
        .sort(
          (a, b) =>
            a.age - b.age ||
            a.teen.last_name.localeCompare(b.teen.last_name),
        ),
    };
  }, [teens, locale]);

  /* ================= СПИСОК ПОКУПОК ================= */

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loadingShopping, setLoadingShopping] = useState(true);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemNote, setNewItemNote] = useState("");
  const [showPurchased, setShowPurchased] = useState(false);

  const [listOpen, setListOpen] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [listBlob, setListBlob] = useState<Blob | null>(null);
  const [listUrl, setListUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadShopping() {
      const { data, error } = await supabase
        .from("teenie_shopping_items")
        .select("id, title, note, is_purchased, created_at")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Teenie+ shopping:", error.message, error.code);
      } else {
        setItems((data ?? []) as ShoppingItem[]);
      }

      setLoadingShopping(false);
    }

    loadShopping();
  }, []);

  async function addItem() {
    const title = newItemTitle.trim();

    if (!title) return;

    const { data, error } = await supabase
      .from("teenie_shopping_items")
      .insert({ title, note: newItemNote.trim() || null })
      .select("id, title, note, is_purchased, created_at")
      .single();

    if (error) {
      console.error("Teenie+ addItem:", error.message, error.code);
      return;
    }

    if (data) {
      setItems((current) => [...current, data as ShoppingItem]);
    }

    setNewItemTitle("");
    setNewItemNote("");
  }

  async function togglePurchased(item: ShoppingItem) {
    const next = !item.is_purchased;

    setItems((current) =>
      current.map((row) =>
        row.id === item.id ? { ...row, is_purchased: next } : row,
      ),
    );

    const { error } = await supabase
      .from("teenie_shopping_items")
      .update({ is_purchased: next, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (error) {
      console.error("Teenie+ toggle:", error.message, error.code);
    }
  }

  async function deleteItem(id: number) {
    setItems((current) => current.filter((item) => item.id !== id));

    const { error } = await supabase
      .from("teenie_shopping_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Teenie+ deleteItem:", error.message, error.code);
    }
  }

  const pendingItems = items.filter((item) => !item.is_purchased);
  const purchasedItems = items.filter((item) => item.is_purchased);

  const progress =
    items.length > 0
      ? Math.round((purchasedItems.length / items.length) * 100)
      : 0;

  async function clearPurchased() {
    const confirmed = window.confirm(
      isRu
        ? "Удалить все купленные пункты?"
        : "Alle gekauften Punkte löschen?",
    );

    if (!confirmed) return;

    const ids = purchasedItems.map((item) => item.id);

    setItems((current) => current.filter((item) => !item.is_purchased));

    const { error } = await supabase
      .from("teenie_shopping_items")
      .delete()
      .in("id", ids);

    if (error) {
      console.error("Teenie+ clearPurchased:", error.message, error.code);
    }
  }

  const listFilename = `teenie-einkaufsliste-${toDateString(new Date())}.png`;

  async function openListModal() {
    setListOpen(true);
    setListBusy(true);
    setListBlob(null);
    setListUrl(null);

    const blob = await renderShoppingImage(pendingItems, isRu);

    setListBlob(blob);
    setListUrl(blob ? URL.createObjectURL(blob) : null);
    setListBusy(false);
  }

  function closeListModal() {
    if (listUrl) URL.revokeObjectURL(listUrl);

    setListOpen(false);
    setListUrl(null);
    setListBlob(null);
  }

  function downloadList() {
    if (!listBlob) return;

    downloadBlob(listBlob, listFilename);
  }

  function openWhatsApp() {
    const text = buildShoppingText(pendingItems, isRu);

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function shareList() {
    const text = buildShoppingText(pendingItems, isRu);
    const title = isRu ? "Список покупок" : "Einkaufsliste";

    try {
      if (listBlob) {
        const file = new File([listBlob], listFilename, {
          type: "image/png",
        });

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title, text });
          return;
        }
      }

      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }

      openWhatsApp();
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        console.error("Teenie+ share:", error);
        openWhatsApp();
      }
    }
  }

  async function copyListText() {
    const text = buildShoppingText(pendingItems, isRu);

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();

      try {
        document.execCommand("copy");
      } catch {
        /* ничего */
      }

      area.remove();
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ================= РЕНДЕР ================= */

  return (
    <main className="min-h-screen bg-[#f7f7f6] text-neutral-900">
      <header className="sticky top-0 z-30 border-b border-[#e6e7e8] bg-[#f7f7f6]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[760px] items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dfe2e5] bg-white text-[#374353]"
            aria-label={isRu ? "Назад" : "Zurück"}
          >
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0">
            <div className="text-[19px] font-bold leading-none tracking-[-0.03em] text-[#111820]">
              Teenie+
            </div>

            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a939d]">
              {isRu ? "Посещаемость и покупки" : "Anwesenheit und Einkauf"}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[760px] px-4 pb-32 pt-5 sm:px-6">
        {/* TABS */}
        <div className="mb-5 flex gap-2 rounded-[16px] border border-[#e2e5e8] bg-white p-1.5">
          <button
            type="button"
            onClick={() => setTab("attendance")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-[13px] font-semibold transition ${
              tab === "attendance"
                ? "bg-[#111820] text-white"
                : "text-[#65707d]"
            }`}
          >
            <Calendar size={15} />
            {isRu ? "Посещаемость" : "Anwesenheit"}
          </button>

          <button
            type="button"
            onClick={() => setTab("shopping")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-[13px] font-semibold transition ${
              tab === "shopping"
                ? "bg-[#111820] text-white"
                : "text-[#65707d]"
            }`}
          >
            <ShoppingCart size={15} />
            {isRu ? "Покупки" : "Einkauf"}
            {pendingItems.length > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10px] ${
                  tab === "shopping"
                    ? "bg-white/20 text-white"
                    : "bg-[#eceef0] text-[#65707d]"
                }`}
              >
                {pendingItems.length}
              </span>
            )}
          </button>
        </div>

        {/* ================= ATTENDANCE TAB ================= */}
        {tab === "attendance" && (
          <div>
            {/* MONTH NAV */}
            <div className="mb-3 flex items-center justify-between rounded-[20px] border border-[#e6e8ea] bg-white p-1.5">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[#374353] active:bg-[#f1f2f3]"
                aria-label={isRu ? "Предыдущий месяц" : "Vorheriger Monat"}
              >
                <ChevronLeft size={21} />
              </button>

              <div className="text-center">
                <div className="text-[17px] font-bold capitalize tracking-[-0.02em] text-[#111820]">
                  {monthLabel}
                </div>

                {!isCurrentMonth && (
                  <button
                    type="button"
                    onClick={goToCurrentMonth}
                    className="text-[11px] font-semibold text-[#8a939d] underline"
                  >
                    {isRu ? "К текущему месяцу" : "Zum aktuellen Monat"}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[#374353] active:bg-[#f1f2f3]"
                aria-label={isRu ? "Следующий месяц" : "Nächster Monat"}
              >
                <ChevronRight size={21} />
              </button>
            </div>

            {/* WEEKDAY SETTINGS */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => {
                  setDraftWeekdays(weekdays);
                  setSettingsOpen((value) => !value);
                }}
                className="flex w-full items-center justify-between rounded-[14px] border border-[#e6e8ea] bg-white px-3.5 py-2.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <Settings2 size={14} className="text-[#8a939d]" />

                  <span className="text-[12px] font-semibold text-[#65707d]">
                    {isRu ? "Дни занятий:" : "Tage der Treffen:"}{" "}
                    <span className="text-[#111820]">
                      {weekdays.map((day) => weekdayLabels[day]).join(", ")}
                    </span>
                  </span>
                </div>

                <span className="text-[11px] font-semibold text-[#9aa2ad]">
                  {isRu ? "Изменить" : "Ändern"}
                </span>
              </button>

              {settingsOpen && (
                <div className="mt-2 rounded-[14px] border border-[#e6e8ea] bg-white p-3.5">
                  <p className="mb-3 text-[11px] text-[#9aa2ad]">
                    {isRu
                      ? "Выбери один или несколько дней недели — по ним строки создаются автоматически. Уже созданные строки не меняются, а лишние можно удалить корзиной."
                      : "Wähle einen oder mehrere Wochentage — dafür werden Zeilen automatisch angelegt. Vorhandene Zeilen bleiben unverändert, überflüssige kannst du löschen."}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {weekdayLabels.map((label, day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDraftWeekday(day)}
                        className={`rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition ${
                          draftWeekdays.includes(day)
                            ? "bg-[#111820] text-white"
                            : "bg-[#f1f2f3] text-[#65707d]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[#9aa2ad]"
                    >
                      {isRu ? "Отмена" : "Abbrechen"}
                    </button>

                    <button
                      type="button"
                      disabled={savingSettings || draftWeekdays.length === 0}
                      onClick={saveWeekdaySettings}
                      className="rounded-[10px] bg-[#111820] px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      {savingSettings
                        ? isRu
                          ? "Сохранение..."
                          : "Speichern..."
                        : isRu
                          ? "Сохранить"
                          : "Speichern"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-[20px] border border-[#e6e8ea] bg-white">
              <div className="flex items-center gap-2 border-b border-[#eceef0] bg-[#fafafa] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#9aa2ad]">
                <div className="w-[70px] shrink-0">
                  {isRu ? "Дата" : "Datum"}
                </div>
                <div className="flex-1">{isRu ? "Тема" : "Thema"}</div>
                <div className="w-[52px] shrink-0 text-right">
                  {isRu ? "Чел." : "Anz."}
                </div>
                <div className="w-[28px] shrink-0" />
              </div>

              {loadingAttendance ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-10 animate-pulse rounded-[10px] bg-[#f4f5f5]"
                    />
                  ))}
                </div>
              ) : attendanceError ? (
                <div className="px-5 py-10 text-center text-[12px] text-red-500">
                  {isRu
                    ? "Не удалось загрузить таблицу. Проверь, что SQL-миграция выполнена в Supabase."
                    : "Die Tabelle konnte nicht geladen werden. Prüfe, ob die SQL-Migration in Supabase ausgeführt wurde."}
                </div>
              ) : visibleEntries.length === 0 ? (
                <div className="px-5 py-10 text-center text-[12px] text-[#9aa2ad]">
                  {isRu
                    ? "В этом месяце нет занятий в выбранные дни."
                    : "In diesem Monat gibt es keine Treffen an den gewählten Tagen."}
                </div>
              ) : (
                visibleEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-2 px-3 py-2 ${
                      index > 0 ? "border-t border-[#f0f1f2]" : ""
                    } ${entry.entry_date === todayString ? "bg-amber-50" : ""}`}
                  >
                    <label className="relative flex h-9 w-[70px] shrink-0 cursor-pointer items-center rounded-[10px] bg-[#f4f5f5] px-2 text-[12px] font-semibold text-[#374353]">
                      {formatRowDate(entry.entry_date, weekdayLabels)}

                      <input
                        type="date"
                        value={entry.entry_date}
                        onChange={(event) => {
                          if (event.target.value) {
                            updateEntry(entry.id, {
                              entry_date: event.target.value,
                            });
                          }
                        }}
                        onClick={(event) => {
                          try {
                            event.currentTarget.showPicker?.();
                          } catch {
                            /* не поддерживается — сработает нативное поведение */
                          }
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>

                    <input
                      type="text"
                      defaultValue={entry.topic ?? ""}
                      placeholder={isRu ? "Тема..." : "Thema..."}
                      onBlur={(event) => {
                        const value = event.target.value.trim();

                        if (value !== (entry.topic ?? "")) {
                          updateEntry(entry.id, { topic: value || null });
                        }
                      }}
                      className="min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-1.5 py-1.5 text-[13px] text-[#111820] outline-none placeholder:text-[#c7cbd1] focus:border-[#dfe1e4] focus:bg-[#fafafa]"
                    />

                    <input
                      type="number"
                      min={0}
                      defaultValue={entry.attendee_count ?? ""}
                      placeholder="—"
                      onBlur={(event) => {
                        const raw = event.target.value;
                        const value = raw === "" ? null : Number(raw);

                        if (value !== entry.attendee_count) {
                          updateEntry(entry.id, { attendee_count: value });
                        }
                      }}
                      className="w-[52px] shrink-0 rounded-[8px] border border-transparent bg-transparent px-1 py-1.5 text-right text-[13px] font-semibold text-[#111820] outline-none placeholder:text-[#c7cbd1] focus:border-[#dfe1e4] focus:bg-[#fafafa]"
                    />

                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.id)}
                      className="flex h-7 w-[28px] shrink-0 items-center justify-center rounded-[8px] text-[#d0d4d9] active:bg-[#f1f2f3]"
                      aria-label={isRu ? "Удалить строку" : "Zeile löschen"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}

              {/* TOTALS */}
              {!loadingAttendance &&
                !attendanceError &&
                visibleEntries.length > 0 && (
                <div className="flex items-center justify-between gap-2 border-t border-[#eceef0] bg-[#fafafa] px-3 py-2.5 text-[11px] font-semibold text-[#65707d]">
                  <span>
                    {isRu ? "Занятий" : "Treffen"}: {stats.sessions}
                  </span>
                  <span>
                    {isRu ? "Всего человек" : "Personen gesamt"}: {stats.total}
                  </span>
                  <span>
                    {isRu ? "В среднем" : "Ø"}: {stats.average ?? "—"}
                  </span>
                </div>
              )}
            </div>

            {otherDaysCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllDays((value) => !value)}
                className="mt-2.5 w-full text-center text-[11px] font-semibold text-[#8a939d] underline"
              >
                {showAllDays
                  ? isRu
                    ? "Скрыть строки с другими днями недели"
                    : "Zeilen mit anderen Wochentagen ausblenden"
                  : isRu
                    ? `Показать скрытые строки с другими днями (${otherDaysCount})`
                    : `Ausgeblendete Zeilen mit anderen Tagen anzeigen (${otherDaysCount})`}
              </button>
            )}

            <button
              type="button"
              onClick={addRow}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-[#d3d7dc] py-2.5 text-[12px] font-semibold text-[#8a939d] active:bg-white"
            >
              <Plus size={14} />
              {isRu ? "Добавить день" : "Tag hinzufügen"}
            </button>

            {/* TEENS: BIRTHDAYS + AGE */}
            <div className="mt-6 overflow-hidden rounded-[22px] border border-[#e6e8ea] bg-white">
              <div className="flex items-center gap-3 border-b border-[#f0f1f2] px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#111820] text-white">
                  <Cake size={18} strokeWidth={1.8} />
                </div>

                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#111820]">
                    {isRu
                      ? "Дни рождения в этом месяце"
                      : "Geburtstage in diesem Monat"}
                  </p>

                  <p className="mt-0.5 text-[11px] capitalize text-[#9aa2ad]">
                    {teenInfo.monthName}
                  </p>
                </div>
              </div>

              {teenInfo.thisMonth.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px] text-[#9aa2ad]">
                  {isRu
                    ? "В этом месяце дней рождения нет."
                    : "In diesem Monat gibt es keine Geburtstage."}
                </div>
              ) : (
                <div className="divide-y divide-[#f0f1f2]">
                  {teenInfo.thisMonth.map(({ teen, day, turning }) => {
                    const highlight = turning === 14 || turning === 15;
                    const diff = day - teenInfo.today;

                    const status =
                      diff === 0
                        ? isRu
                          ? "Сегодня!"
                          : "Heute!"
                        : diff > 0
                          ? isRu
                            ? `через ${diff} дн.`
                            : `in ${diff} Tg.`
                          : isRu
                            ? "уже было"
                            : "schon vorbei";

                    const dateLabel = new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      day,
                    ).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "long",
                    });

                    return (
                      <div
                        key={teen.id}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          highlight ? "bg-amber-50/70" : ""
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1f2f3] text-[13px] font-bold text-[#374353]">
                          {teen.first_name.charAt(0)}
                          {teen.last_name.charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-[#111820]">
                            {teen.first_name} {teen.last_name}
                          </p>

                          <p className="mt-0.5 text-[11px] text-[#9aa2ad]">
                            {dateLabel} ·{" "}
                            {diff < 0
                              ? isRu
                                ? `исполнилось ${turning}`
                                : `wurde ${turning}`
                              : isRu
                                ? `исполнится ${turning}`
                                : `wird ${turning}`}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {highlight && (
                            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                              {turning} {isRu ? "лет" : "Jahre"}
                            </span>
                          )}

                          <span
                            className={`text-[11px] font-semibold ${
                              diff === 0
                                ? "text-emerald-600"
                                : diff < 0
                                  ? "text-[#c7cbd1]"
                                  : "text-[#65707d]"
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* СЕЙЧАС 14–15 ЛЕТ */}
              <div className="border-t border-[#eceef0] bg-[#fafafa] px-4 py-3.5">
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]">
                  {isRu ? "Сейчас 14–15 лет" : "Aktuell 14–15 Jahre"}
                </p>

                {teenInfo.aged.length === 0 ? (
                  <p className="text-[12px] text-[#9aa2ad]">
                    {isRu
                      ? "Сейчас нет подростков в этом возрасте."
                      : "Aktuell gibt es keine Teens in diesem Alter."}
                  </p>
                ) : (
                  [14, 15].map((age) => {
                    const group = teenInfo.aged.filter(
                      (item) => item.age === age,
                    );

                    if (group.length === 0) return null;

                    return (
                      <div key={age} className="mb-2.5 last:mb-0">
                        <p className="mb-1.5 text-[12px] font-bold text-[#111820]">
                          {age} {isRu ? "лет" : "Jahre"} · {group.length}
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                          {group.map(({ teen }) => (
                            <span
                              key={teen.id}
                              className="rounded-full border border-[#e2e5e8] bg-white px-2.5 py-1 text-[11px] font-medium text-[#374353]"
                            >
                              {teen.first_name} {teen.last_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= SHOPPING TAB ================= */}
        {tab === "shopping" && (
          <div>
            {/* SUMMARY */}
            <div className="mb-4 overflow-hidden rounded-[24px] bg-[#111820] p-5 text-white shadow-[0_8px_24px_rgba(17,24,32,0.14)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    {isRu ? "Нужно купить" : "Noch zu kaufen"}
                  </div>

                  <div className="mt-1.5 text-[38px] font-bold leading-none tracking-[-0.04em]">
                    {pendingItems.length}
                  </div>

                  <div className="mt-2 text-[12px] text-neutral-400">
                    {purchasedItems.length}{" "}
                    {isRu ? "уже куплено" : "schon gekauft"}
                  </div>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/10">
                  <ShoppingCart size={22} />
                </div>
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <button
                type="button"
                onClick={openListModal}
                disabled={pendingItems.length === 0}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-[16px] bg-white py-3.5 text-[14px] font-bold text-[#111820] transition active:scale-[0.99] disabled:opacity-40"
              >
                <Sparkles size={16} />
                {isRu
                  ? "Красивый список для лидеров"
                  : "Schöne Liste für die Leiter"}
              </button>
            </div>

            {/* ADD FORM */}
            <div className="mb-4 rounded-[20px] border border-[#e6e8ea] bg-white p-3.5">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(event) => setNewItemTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addItem();
                  }}
                  placeholder={isRu ? "Что купить?" : "Was einkaufen?"}
                  className="h-[52px] w-full min-w-0 rounded-[14px] border border-[#e2e5e8] bg-[#fafafa] px-4 text-[15px] outline-none placeholder:text-[#b1b7bf] focus:border-[#111820] focus:bg-white sm:w-auto sm:flex-1"
                />

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemNote}
                    onChange={(event) => setNewItemNote(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addItem();
                    }}
                    placeholder={isRu ? "Кол-во / заметка" : "Menge / Notiz"}
                    className="h-[52px] min-w-0 flex-1 rounded-[14px] border border-[#e2e5e8] bg-[#fafafa] px-4 text-[15px] outline-none placeholder:text-[#b1b7bf] focus:border-[#111820] focus:bg-white sm:w-[150px] sm:flex-none"
                  />

                  <button
                    type="button"
                    onClick={addItem}
                    className="flex h-[52px] shrink-0 items-center gap-1.5 rounded-[14px] bg-[#111820] px-5 text-[14px] font-semibold text-white active:scale-95"
                  >
                    <Plus size={16} />
                    {isRu ? "Добавить" : "Hinzufügen"}
                  </button>
                </div>
              </div>
            </div>

            {loadingShopping ? (
              <div className="h-[200px] animate-pulse rounded-[20px] bg-white" />
            ) : items.length === 0 ? (
              <div className="rounded-[20px] border border-[#e6e8ea] bg-white px-6 py-12 text-center">
                <ListChecks size={28} className="mx-auto text-neutral-300" />

                <p className="mt-3 text-[13px] text-neutral-400">
                  {isRu
                    ? "Список пока пуст — добавь первый пункт выше."
                    : "Die Liste ist noch leer — füge oben den ersten Punkt hinzu."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingItems.length > 0 && (
                  <div className="overflow-hidden rounded-[20px] border border-[#e6e8ea] bg-white">
                    {pendingItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-3.5 py-3.5 ${
                          index > 0 ? "border-t border-[#f0f1f2]" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => togglePurchased(item)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#d3d7dc] text-transparent transition active:scale-90 active:border-[#111820] active:bg-[#111820] active:text-white"
                          aria-label={
                            isRu ? "Отметить купленным" : "Als gekauft markieren"
                          }
                        >
                          <Check size={15} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="break-words text-[15px] font-semibold leading-tight text-[#111820]">
                            {item.title}
                          </div>
                        </div>

                        {item.note && (
                          <span className="max-w-[40%] shrink-0 truncate rounded-full bg-[#f1f2f3] px-2.5 py-1 text-[11px] font-semibold text-[#65707d]">
                            {item.note}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[#d0d4d9] active:bg-[#f4f5f5]"
                          aria-label={isRu ? "Удалить" : "Löschen"}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {purchasedItems.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between px-1">
                      <button
                        type="button"
                        onClick={() => setShowPurchased((value) => !value)}
                        className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]"
                      >
                        {isRu ? "Уже куплено" : "Schon gekauft"} ·{" "}
                        {purchasedItems.length} {showPurchased ? "▴" : "▾"}
                      </button>

                      <button
                        type="button"
                        onClick={clearPurchased}
                        className="text-[11px] font-semibold text-[#b1b7bf] underline"
                      >
                        {isRu ? "Очистить" : "Leeren"}
                      </button>
                    </div>

                    {showPurchased && (
                      <div className="overflow-hidden rounded-[20px] border border-[#e6e8ea] bg-[#fafafa]">
                        {purchasedItems.map((item, index) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 px-3.5 py-3 ${
                              index > 0 ? "border-t border-[#eceef0]" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => togglePurchased(item)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111820] text-white active:scale-90"
                              aria-label={
                                isRu ? "Вернуть в список" : "Zurück in die Liste"
                              }
                            >
                              <Check size={15} />
                            </button>

                            <div className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#9aa2ad] line-through">
                              {item.title}
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteItem(item.id)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[#d0d4d9] active:bg-[#f0f1f2]"
                              aria-label={isRu ? "Удалить" : "Löschen"}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= LIST MODAL ================= */}
      {listOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label={isRu ? "Закрыть" : "Schließen"}
            onClick={closeListModal}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />

          <div className="relative z-10 flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-[#eceef0] px-5 py-4">
              <div>
                <p className="text-[17px] font-bold tracking-[-0.02em] text-[#111820]">
                  {isRu ? "Список для лидеров" : "Liste für die Leiter"}
                </p>

                <p className="mt-0.5 text-[12px] text-[#9aa2ad]">
                  {isRu
                    ? "Скачай картинку или отправь в WhatsApp"
                    : "Bild herunterladen oder per WhatsApp senden"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeListModal}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f5] text-[#4e5966]"
                aria-label={isRu ? "Закрыть" : "Schließen"}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#f1f2f3] p-4">
              {listBusy ? (
                <div className="flex h-[280px] items-center justify-center text-[13px] text-[#9aa2ad]">
                  {isRu ? "Собираю список..." : "Liste wird erstellt..."}
                </div>
              ) : listUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listUrl}
                  alt={isRu ? "Список покупок" : "Einkaufsliste"}
                  className="mx-auto w-full rounded-[18px] shadow-[0_6px_24px_rgba(17,24,32,0.10)]"
                />
              ) : (
                <div className="flex h-[200px] items-center justify-center text-[13px] text-red-500">
                  {isRu
                    ? "Не удалось создать картинку."
                    : "Das Bild konnte nicht erstellt werden."}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-[#eceef0] bg-white p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={openWhatsApp}
                className="flex items-center justify-center gap-2 rounded-[14px] bg-[#25d366] py-3 text-[13px] font-bold text-white active:scale-[0.98]"
              >
                <MessageCircle size={16} />
                WhatsApp
              </button>

              <button
                type="button"
                onClick={shareList}
                disabled={listBusy}
                className="flex items-center justify-center gap-2 rounded-[14px] bg-[#111820] py-3 text-[13px] font-bold text-white active:scale-[0.98] disabled:opacity-40"
              >
                <Share2 size={16} />
                {isRu ? "Поделиться" : "Teilen"}
              </button>

              <button
                type="button"
                onClick={downloadList}
                disabled={!listBlob}
                className="flex items-center justify-center gap-2 rounded-[14px] border border-[#e2e5e8] py-3 text-[13px] font-bold text-[#374353] active:bg-[#f4f5f5] disabled:opacity-40"
              >
                <Download size={16} />
                {isRu ? "Скачать" : "Herunterladen"}
              </button>

              <button
                type="button"
                onClick={copyListText}
                className="flex items-center justify-center gap-2 rounded-[14px] border border-[#e2e5e8] py-3 text-[13px] font-bold text-[#374353] active:bg-[#f4f5f5]"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied
                  ? isRu
                    ? "Скопировано"
                    : "Kopiert"
                  : isRu
                    ? "Копировать текст"
                    : "Text kopieren"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}