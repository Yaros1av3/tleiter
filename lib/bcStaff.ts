import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/*
 * Кто вызывает админ-API Bibel-Challenge (служитель по токену приложения).
 * Подростки не пользователи Supabase, поэтому любой вошедший пользователь — из команды.
 * isAdmin: полный доступ. Остальные служители видят только своих подопечных.
 */
export async function getStaff(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;

  const [{ data: profile }, { data: member }] = await Promise.all([
    sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle(),
    sb.from("team_members").select("id").eq("user_id", data.user.id).maybeSingle(),
  ]);
  if (!profile) return null;

  return {
    userId: data.user.id,
    isAdmin: profile.role === "admin",
    memberId: (member?.id as number | undefined) ?? null,
  };
}

/* "2026-11-10" + 23:59 по Берлину -> ISO в UTC */
export function berlinToUtc(date: string, hour: number, minute: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asBerlin = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (asBerlin - guess)).toISOString();
}