import "server-only";
import { createHash } from "crypto";
import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { calcAge, type FormRow } from "@/lib/forms";

/* Находит форму по ссылке. Возвращает null, если такой нет. */
export async function loadFormBySlug(slug: string): Promise<FormRow | null> {
  if (!/^[a-z0-9]{6,32}$/i.test(slug)) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("forms")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  // настоящая ошибка (например, не найден ключ) — не путаем с «формы нет»
  if (error) throw error;

  return (data as FormRow | null) ?? null;
}

/* Сколько мест занято */
export async function countResponses(formId: number) {
  const admin = getSupabaseAdmin();
  const { count } = await admin
    .from("form_responses")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId);
  return count ?? 0;
}

export function isClosed(form: FormRow) {
  if (!form.is_open) return true;
  if (form.closes_at && new Date(form.closes_at).getTime() < Date.now()) {
    return true;
  }
  return false;
}

/* Хэш IP, чтобы ограничивать частоту, не храня сам адрес */
export function ipHash(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 16) ?? "salt";
  return createHash("sha256").update(`${ip}|${salt}`).digest("hex").slice(0, 32);
}

/* Что можно показывать посторонним — без внутренних данных */
export function publicView(form: FormRow, taken: number) {
  return {
    slug: form.slug,
    title_de: form.title_de,
    title_ru: form.title_ru,
    desc_de: form.desc_de,
    desc_ru: form.desc_ru,
    event_date: form.event_date,
    event_time: form.event_time,
    location: form.location,
    emoji: form.emoji,
    theme: form.theme,
    questions: form.questions,
    closed: isClosed(form),
    full: form.capacity != null && taken >= form.capacity,
    spots_left:
      form.capacity != null ? Math.max(form.capacity - taken, 0) : null,
  };
}

/* ---------- умный поиск подростка по имени ---------- */

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "sch", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "ch", ц: "z", ч: "tsch", ш: "sch",
  щ: "sch", ы: "i", э: "e", ю: "ju", я: "ja", ь: "", ъ: "",
};

/* Приводим имя к «упрощённому виду»: Müller = Mueller = Muller, Anna-Lena = Anna Lena,
   русское написание тоже превращается в латиницу */
export function normName(input: string) {
  let s = String(input ?? "").toLowerCase();
  s = s
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
  s = s
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("");
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^a-z]/g, "");
  return s
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/th/g, "t")
    .replace(/tz/g, "z")
    .replace(/y/g, "i")
    .replace(/ie/g, "i")
    .replace(/(.)\1+/g, "$1");
}

function distance(a: string, b: string) {
  if (a === b) return 0;
  if (!a || !b) return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

function tolerance(a: string, b: string) {
  const len = Math.max(a.length, b.length);
  return len <= 3 ? 0 : len <= 7 ? 1 : 2;
}

export type TeenMatch = { id: number; age: number | null; score: number };

/*
 * Ищет подростка в базе по имени и фамилии: терпимо к регистру, умлаутам,
 * дефисам, мелким опечаткам и перестановке имени с фамилией.
 */
export async function findTeens(
  first: string,
  last: string,
  birth?: string | null,
): Promise<TeenMatch[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("teens")
    .select("id, first_name, last_name, birth_date")
    .limit(2000);

  if (error) throw error;

  const f = normName(first);
  const l = normName(last);

  if (f.length < 2 || l.length < 2) return [];

  const result: TeenMatch[] = [];

  for (const teen of data ?? []) {
    const tf = normName(teen.first_name as string);
    const tl = normName(teen.last_name as string);

    const direct =
      distance(f, tf) <= tolerance(f, tf) && distance(l, tl) <= tolerance(l, tl)
        ? distance(f, tf) + distance(l, tl)
        : null;

    const swapped =
      distance(f, tl) <= tolerance(f, tl) && distance(l, tf) <= tolerance(l, tf)
        ? distance(f, tl) + distance(l, tf) + 1
        : null;

    const base = [direct, swapped]
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)[0];

    if (base === undefined) continue;

    // совпала дата рождения — это почти наверняка он
    const score =
      birth && teen.birth_date && String(teen.birth_date).slice(0, 10) === birth
        ? base - 1
        : base;

    result.push({
      id: teen.id as number,
      age: teen.birth_date ? calcAge(teen.birth_date as string) : null,
      score,
    });
  }

  return result.sort((a, b) => a.score - b.score).slice(0, 3);
}

/* Однозначное совпадение: один лучший кандидат (двойников не привязываем автоматически) */
export function uniqueMatch(matches: TeenMatch[]) {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  return matches[0].score < matches[1].score ? matches[0] : null;
}