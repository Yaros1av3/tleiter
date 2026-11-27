import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCampManager } from "@/lib/campsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const txt = (v: unknown, max: number) => {
  const s = String(v ?? "").trim().slice(0, max);
  return s === "" ? null : s;
};

/* Ссылки-приглашения и гости лагеря: только админ или служитель с правом «T-Camps» */
export async function GET(req: Request) {
  if (!(await getCampManager(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const campId = Number(new URL(req.url).searchParams.get("camp_id"));
  if (!campId) return NextResponse.json({ error: "bad" }, { status: 400 });
  const sb = getSupabaseAdmin();

  const [{ data: invites }, { data: access }] = await Promise.all([
    sb.from("camp_invites").select("id, code, role_title, expires_at, revoked, uses, created_at").eq("camp_id", campId).order("id", { ascending: false }),
    sb.from("camp_access").select("user_id, created_at").eq("camp_id", campId),
  ]);

  const ids = (access ?? []).map((a) => a.user_id as string);
  const { data: profiles } = ids.length
    ? await sb.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] as { id: string; full_name: string | null }[] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return NextResponse.json({
    invites: invites ?? [],
    guests: (access ?? []).map((a) => ({
      user_id: a.user_id,
      name: names.get(a.user_id as string) || "—",
      created_at: a.created_at,
    })),
  });
}

export async function POST(req: Request) {
  const staff = await getCampManager(req);
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad" }, { status: 400 });
  const sb = getSupabaseAdmin();

  if (body.action === "create") {
    const campId = Number(body.camp_id);
    if (!campId) return NextResponse.json({ error: "bad" }, { status: 400 });
    const days = Math.min(365, Math.max(1, Number(body.days) || 60));
    const code = randomBytes(9).toString("base64url");
    const { data, error } = await sb
      .from("camp_invites")
      .insert({
        camp_id: campId,
        code,
        role_title: txt(body.role_title, 80),
        expires_at: new Date(Date.now() + days * 86400000).toISOString(),
        created_by: staff.userId,
      })
      .select("id, code")
      .single();
    if (error || !data) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true, code: data.code });
  }

  if (body.action === "revoke") {
    const { error } = await sb.from("camp_invites").update({ revoked: true }).eq("id", Number(body.id));
    return error ? NextResponse.json({ error: "db" }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (body.action === "remove_guest") {
    const { error } = await sb
      .from("camp_access")
      .delete()
      .eq("camp_id", Number(body.camp_id))
      .eq("user_id", String(body.user_id));
    return error ? NextResponse.json({ error: "db" }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad" }, { status: 400 });
}