import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanText, clientIp, rateLimit, setSession, verifyPassword } from "@/lib/bcAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Вход по email и паролю (старые профили могут войти и по нику) */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ident = cleanText(body?.identifier, 120);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!ident || !password) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (!rateLimit(`tlogin:${clientIp(req)}:${ident.toLowerCase()}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }

  const escaped = ident.replace(/[\\%_]/g, (c) => "\\" + c);
  const column = ident.includes("@") ? "email" : "nickname";

  const sb = getSupabaseAdmin();
  const { data: row } = await sb
    .from("bc_participants")
    .select("id, password_hash, status")
    .ilike(column, escaped)
    .maybeSingle();

  if (!row || !verifyPassword(password, row.password_hash as string)) {
    return NextResponse.json({ error: "wrong" }, { status: 401 });
  }
  if (row.status !== "active") return NextResponse.json({ error: "blocked" }, { status: 403 });

  await sb.from("bc_participants").update({ last_login_at: new Date().toISOString() }).eq("id", row.id);
  await setSession(row.id as number);
  return NextResponse.json({ ok: true });
}