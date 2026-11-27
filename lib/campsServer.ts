import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Admin = ReturnType<typeof getSupabaseAdmin>;

/* userId + guestCamps: null — обычный служитель/админ; список — гость лагеря (видит только эти лагеря) */
export type CampStaff = { userId: string; guestCamps: number[] | null };

async function resolveUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { sb, user: data.user };
}

/* Гость лагеря: есть доступ к лагерю, но нет карточки служителя и не админ. Возвращает его лагеря или null */
async function guestCampsOf(sb: Admin, userId: string): Promise<number[] | null> {
  const { data: access } = await sb.from("camp_access").select("camp_id").eq("user_id", userId);
  if (!access || access.length === 0) return null;
  const { data: member } = await sb.from("team_members").select("id").eq("user_id", userId).maybeSingle();
  if (member) return null;
  const { data: profile } = await sb.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role === "admin") return null;
  return access.map((a) => Number(a.camp_id));
}

/* Кто вызывает админ-API лагеря: админ, служитель с правом «T-Camps» или гость лагеря */
export async function getCampStaff(request: Request): Promise<CampStaff | null> {
  const r = await resolveUser(request);
  if (!r) return null;
  const { sb, user } = r;

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile) return null;
  if (profile.role === "admin") return { userId: user.id, guestCamps: null };

  const guest = await guestCampsOf(sb, user.id);
  if (guest) return { userId: user.id, guestCamps: guest };

  const { data: member } = await sb
    .from("team_members")
    .select("role_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member?.role_id) return null;
  const { data: role } = await sb.from("app_roles").select("permissions").eq("id", member.role_id).maybeSingle();
  const perms = (role?.permissions ?? []) as string[];
  return perms.includes("camps") ? { userId: user.id, guestCamps: null } : null;
}

/* Только админ или служитель с правом «T-Camps» (не гость): для ссылок-приглашений */
export async function getCampManager(request: Request) {
  const s = await getCampStaff(request);
  return s && !s.guestCamps ? s : null;
}

/*
 * Проверка «этот лагерь доступен вызывающему». Для обычных служителей всегда true.
 * Для гостя каждая проверка должна попасть в его лагеря:
 *   { camp: 5 }  или  { table: "camp_registrations", ids: [1,2] }
 */
export async function inScope(
  staff: CampStaff,
  checks: Array<{ camp?: number; table?: string; ids?: number[] }>,
) {
  if (!staff.guestCamps) return true;
  const sb = getSupabaseAdmin();
  for (const c of checks) {
    if (c.camp !== undefined) {
      if (!staff.guestCamps.includes(Number(c.camp))) return false;
    }
    if (c.table && c.ids) {
      const ids = c.ids.filter(Boolean);
      if (ids.length === 0) continue;
      const { data } = await sb.from(c.table).select("camp_id").in("id", ids);
      if (!data || data.length !== ids.length) return false;
      if (!data.every((r) => staff.guestCamps!.includes(Number(r.camp_id)))) return false;
    }
  }
  return true;
}

export const BUCKET = "camp-files";

export function safeExt(name: string) {
  const m = /\.([A-Za-z0-9]{1,6})$/.exec(name);
  return m ? m[1].toLowerCase() : "bin";
}

export function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

/* Любой вошедший (команда или гость лагеря); для гостя возвращается список его лагерей */
export async function getTeamUser(request: Request): Promise<CampStaff | null> {
  const r = await resolveUser(request);
  if (!r) return null;
  const { sb, user } = r;
  const { data: profile } = await sb.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) return null;
  return { userId: user.id, guestCamps: await guestCampsOf(sb, user.id) };
}