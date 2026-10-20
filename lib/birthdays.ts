import { dateKey } from "@/lib/dates";

export const BIRTHDAYS_UPDATED_EVENT = "birthdays-updated";

/** Ближайшее (или сегодняшнее) день рождения от даты `from`. */
export function nextBirthday(birthDate: string, from = new Date()) {
  const [y, m, d] = birthDate.slice(0, 10).split("-").map(Number);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  function inYear(year: number) {
    // 29 февраля в невисокосный год → 28 февраля
    const date = new Date(year, m - 1, d);
    if (date.getMonth() !== m - 1) return new Date(year, m - 1, d - 1);
    return date;
  }

  let date = inYear(start.getFullYear());
  if (date < start) date = inYear(start.getFullYear() + 1);

  const days = Math.round((date.getTime() - start.getTime()) / 86400000);

  return {
    date,
    key: dateKey(date),
    year: date.getFullYear(),
    days,
    turns: date.getFullYear() - y,
  };
}

export function shortDays(days: number, isRu: boolean) {
  if (days === 0) return isRu ? "сегодня" : "heute";
  if (days === 1) return isRu ? "завтра" : "morgen";
  return isRu ? `через ${days} дн.` : `in ${days} Tg.`;
}