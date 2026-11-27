import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findInvite(code: string) {
  const sb = getSupabaseAdmin();
  const { data: inv } = await sb
    .from("camp_invites")
    .select("id, camp_id, role_title, expires_at, revoked, uses")
    .eq("code", code)
    .maybeSingle();
  if (!inv || inv.revoked || new Date(inv.expires_at as string).getTime() < Date.now()) return null;
  const { data: camp } = await sb
    .from("camps")
    .select("id, title, start_date, end_date, location")
    .eq("id", inv.camp_id)
    .maybeSingle();
  if (!camp) return null;
  return { inv, camp };
}

/* Публично: показать, на какой лагерь приглашение (только название и даты) */
export async function GET(req: Request) {
  const code = String(new URL(req.url).searchParams.get("code") ?? "").slice(0, 64);
  if (!code) return NextResponse.json({ error: "bad" }, { status: 400 });
  const found = await findInvite(code);
  if (!found) return NextResponse.json({ error: "invalid" }, { status: 404 });
  return NextResponse.json({
    camp: found.camp,
    role_title: found.inv.role_title,
  });
}

/* Вошедший пользователь принимает приглашение: получает доступ к этому лагерю */
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const { data: u, error: uerr } = await sb.auth.getUser(token);
  if (uerr || !u.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = String(body?.code ?? "").slice(0, 64);
  const found = code ? await findInvite(code) : null;
  if (!found) return NextResponse.json({ error: "invalid" }, { status: 404 });

  const userId = u.user.id;
  const campId = Number(found.inv.camp_id);

  const { data: existing } = await sb
    .from("camp_access")
    .select("user_id")
    .eq("user_id", userId)
    .eq("camp_id", campId)
    .maybeSingle();

  if (!existing) {
    const { error } = await sb.from("camp_access").insert({ user_id: userId, camp_id: campId, invite_id: found.inv.id });
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    await sb.from("camp_invites").update({ uses: Number(found.inv.uses) + 1 }).eq("id", found.inv.id);

    /* человек сразу появляется в команде лагеря с ролью из приглашения */
    const { data: profile } = await sb.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    const { data: member } = await sb.from("team_members").select("id").eq("user_id", userId).maybeSingle();
    const name = String(profile?.full_name || u.user.user_metadata?.full_name || u.user.email || "").trim();
    if (!member && name) {
      const { data: dup } = await sb.from("camp_team").select("id").eq("camp_id", campId).eq("guest_name", name).maybeSingle();
      if (!dup) {
        await sb.from("camp_team").insert({
          camp_id: campId,
          guest_name: name,
          role_title: String(found.inv.role_title || "Помощник"),
          status: "confirmed",
        });
      }
    }
  }

  return NextResponse.json({ ok: true, camp_id: campId });
}