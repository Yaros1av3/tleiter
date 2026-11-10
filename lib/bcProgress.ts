/* Серия дней подряд: считаем только дни, на которые было задание. */

export type DayState = "done" | "redo" | "missed" | "today" | "future";

export function berlinTodayStr(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

/* tasks — задания сезона (по датам), submitted — id заданий, на которые есть ответ */
export function streakOf(
  tasks: { id: number; task_date: string }[],
  submitted: Set<number>,
  today: string,
): number {
  const past = tasks.filter((t) => t.task_date <= today).sort((a, b) => (a.task_date < b.task_date ? 1 : -1));
  let n = 0;
  for (const t of past) {
    if (submitted.has(t.id)) n += 1;
    else if (t.task_date === today) continue; /* сегодня ещё можно сдать */
    else break;
  }
  return n;
}

/* сколько последних прошедших дней подряд без ответа (сегодня не считаем) */
export function missedOf(
  tasks: { id: number; task_date: string }[],
  submitted: Set<number>,
  today: string,
): number {
  const past = tasks.filter((t) => t.task_date < today).sort((a, b) => (a.task_date < b.task_date ? 1 : -1));
  let n = 0;
  for (const t of past) {
    if (submitted.has(t.id)) break;
    n += 1;
  }
  return n;
}