import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanText, clientIp, rateLimit, setSession, verifyPassword } from "@/lib/bcAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nickname = cleanText(body?.nickname, 20);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!nickname || !password) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (!rateLimit(`login:${clientIp(req)}:${nickname.toLowerCase()}`, 8, 10 * 60_000))
    return NextResponse.json({ error: "rate" }, { status: 429 });

  const escaped = nickname.replace(/[\\%_]/g, (c) => "\\" + c);
  const sb = getSupabaseAdmin();
  const { data: row } = await sb
    .from("bc_participants")
    .select("id, password_hash, status")
    .ilike("nickname", escaped)
    .maybeSingle();

  if (!row || !verifyPassword(password, row.password_hash))
    return NextResponse.json({ error: "wrong" }, { status: 401 });
  if (row.status !== "active") return NextResponse.json({ error: "blocked" }, { status: 403 });

  await sb.from("bc_participants").update({ last_login_at: new Date().toISOString() }).eq("id", row.id);
  await setSession(row.id);
  return NextResponse.json({ ok: true });
}