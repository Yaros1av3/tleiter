/*
 * Время служений — в ОДНОМ месте.
 * Чтобы снова поменять время, достаточно изменить SECOND_SERVICE здесь
 * (и выполнить SQL из update-service-time.sql для уже сохранённых записей).
 */

export const FIRST_SERVICE = "10:00";
export const SECOND_SERVICE = "12:30";

/** Старое значение, которое могло остаться в базе до обновления */
const LEGACY_SECOND_SERVICE = ["13:00", "13:00:00"];

export type ServiceTime = typeof FIRST_SERVICE | typeof SECOND_SERVICE;

/** "13:00" / "13:00:00" -> "12:30"; "10:00:00" -> "10:00" */
export function normalizeServiceTime(value: string | null | undefined): ServiceTime {
  if (!value) return FIRST_SERVICE;

  if (LEGACY_SECOND_SERVICE.includes(value)) return SECOND_SERVICE;

  const short = value.slice(0, 5);

  return short === SECOND_SERVICE ? SECOND_SERVICE : FIRST_SERVICE;
}

export function isSecondService(value: string | null | undefined) {
  return normalizeServiceTime(value) === SECOND_SERVICE;
}