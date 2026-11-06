import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { hasBadWord } from "@/lib/badWords";
import { NICK_RE, cleanText, getParticipant, hashPassword, verifyPassword } from "@/lib/bcAuth";

/* Смена языка, ника или пароля */
export async function POST(req: Request) {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad" }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (body.lang === "de" || body.lang === "ru") patch.lang = body.lang;

  if (typeof body.nickname === "string") {
    const nick = cleanText(body.nickname, 20);
    if (!NICK_RE.test(nick)) return NextResponse.json({ error: "nick_format" }, { status: 400 });
    if (hasBadWord(nick)) return NextResponse.json({ error: "nick_bad" }, { status: 400 });
    patch.nickname = nick;
  }

  if (typeof body.newPassword === "string") {
    if (!verifyPassword(String(body.oldPassword ?? ""), p.password_hash))
      return NextResponse.json({ error: "wrong" }, { status: 403 });
    if (body.newPassword.length < 6 || body.newPassword.length > 72)
      return NextResponse.json({ error: "pw_short" }, { status: 400 });
    patch.password_hash = hashPassword(body.newPassword);
  }

  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });

  const { error } = await getSupabaseAdmin().from("bc_participants").update(patch).eq("id", p.id);
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "nick_taken" }, { status: 409 });
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}