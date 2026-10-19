/*
 * Общие функции дат. Раньше они были скопированы в каждой странице.
 *
 * ВАЖНО: ключ даты ("2026-10-18") всегда считается по ЛОКАЛЬНОМУ времени,
 * а не через toISOString() — иначе вечером дата «съезжает» на день.
 */

import type { Language } from "@/lib/translations";

export function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Date -> "YYYY-MM-DD" (локальная дата) */
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" -> Date (полдень, чтобы не ловить сдвиги часовых поясов) */
export function localDateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function todayKey() {
  return dateKey(new Date());
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Начало недели (понедельник) */
export function startOfWeek(date: Date) {
  const result = new Date(date);
  const shift = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - shift);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function isSameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

/** Все воскресенья месяца в виде "YYYY-MM-DD" */
export function getSundaysOfMonth(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const result: string[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, monthIndex, day).getDay() === 0) {
      result.push(dateKey(new Date(year, monthIndex, day)));
    }
  }

  return result;
}

export function localeFor(language: Language) {
  return language === "ru" ? "ru-RU" : "de-DE";
}

/** "18 октября 2026" / "18. Oktober 2026" (+ день недели при withWeekday) */
export function formatDate(
  value: string | Date | null | undefined,
  language: Language,
  withWeekday = false,
) {
  if (!value) return "";

  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? localDateFromKey(value)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(localeFor(language), {
    weekday: withWeekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "10:00" */
export function formatTime(value: string | Date, language: Language) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString(localeFor(language), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "октябрь 2026" / "Oktober 2026" */
export function formatMonth(date: Date, language: Language) {
  return date.toLocaleDateString(localeFor(language), {
    month: "long",
    year: "numeric",
  });
}