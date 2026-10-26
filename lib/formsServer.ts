import "server-only";
import { createHash } from "crypto";
import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { FormRow } from "@/lib/forms";

/* Находит форму по ссылке. Возвращает null, если такой нет. */
export async function loadFormBySlug(slug: string): Promise<FormRow | null> {
  if (!/^[a-z0-9]{6,32}$/i.test(slug)) return null;

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("forms")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

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
