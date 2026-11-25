import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/* Кто вызывает админ-API лагеря: админ или служитель с правом «T-Camps» в роли */
export async function getCampStaff(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (!profile) return null;
  if (profile.role === "admin") return { userId: data.user.id };

  const { data: member } = await sb
    .from("team_members")
    .select("role_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!member?.role_id) return null;
  const { data: role } = await sb.from("app_roles").select("permissions").eq("id", member.role_id).maybeSingle();
  const perms = (role?.permissions ?? []) as string[];
  return perms.includes("camps") ? { userId: data.user.id } : null;
}

export const BUCKET = "camp-files";

export function safeExt(name: string) {
  const m = /\.([A-Za-z0-9]{1,6})$/.exec(name);
  return m ? m[1].toLowerCase() : "bin";
}

export function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

/* Любой вошедший член команды (для просмотра материалов лагеря) */
export async function getTeamUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await sb.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  return profile ? { userId: data.user.id } : null;
}