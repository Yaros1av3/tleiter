import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { hasBadWord } from "@/lib/badWords";
import {
  NICK_RE,
  cleanText,
  clientIp,
  hashPassword,
  rateLimit,
  setSession,
  verifyToken,
} from "@/lib/bcAuth";

/* Шаг 2 регистрации: подтверждение датой рождения (или гость), ник, пароль, язык */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad" }, { status: 400 });
  if (!rateLimit(`reg:${clientIp(req)}`, 15, 15 * 60_000))
    return NextResponse.json({ error: "rate" }, { status: 429 });

  const nickname = cleanText(body.nickname, 20);
  const password = typeof body.password === "string" ? body.password : "";
  const lang = body.lang === "ru" ? "ru" : "de";

  if (!NICK_RE.test(nickname)) return NextResponse.json({ error: "nick_format" }, { status: 400 });
  if (hasBadWord(nickname)) return NextResponse.json({ error: "nick_bad" }, { status: 400 });
  if (password.length < 6 || password.length > 72)
    return NextResponse.json({ error: "pw_short" }, { status: 400 });

  const sb = getSupabaseAdmin();
  let teenId: number | null = null;
  let first = cleanText(body.first);
  let last = cleanText(body.last);
  let mentorId: number | null = null;
  let isGuest = false;

  if (typeof body.ticket === "string" && body.ticket) {
    const t = verifyToken<{ ids: number[] }>(body.ticket);
    if (!t?.ids?.length) return NextResponse.json({ error: "ticket" }, { status: 400 });
    if (!rateLimit(`birth:${body.ticket.slice(-24)}`, 5, 15 * 60_000))
      return NextResponse.json({ error: "rate" }, { status: 429 });

    const day = Number(body.day);
    const month = Number(body.month);
    const { data: teens } = await sb
      .from("teens")
      .select("id, first_name, last_name, birth_date")
      .in("id", t.ids);
    const hit = (teens ?? []).find((x) => {
      const d = String(x.birth_date ?? "");
      return Number(d.slice(5, 7)) === month && Number(d.slice(8, 10)) === day;
    });
    if (!hit) return NextResponse.json({ error: "birth" }, { status: 403 });

    teenId = hit.id;
    first = hit.first_name;
    last = hit.last_name;
    const { data: m } = await sb
      .from("teen_mentors")
      .select("team_member_id")
      .eq("teen_id", hit.id)
      .maybeSingle();
    mentorId = m?.team_member_id ?? null;
  } else {
    if (!first || !last) return NextResponse.json({ error: "empty" }, { status: 400 });
    isGuest = true;
  }

  const { data: row, error } = await sb
    .from("bc_participants")
    .insert({
      teen_id: teenId,
      first_name: first,
      last_name: last,
      nickname,
      password_hash: hashPassword(password),
      lang,
      mentor_id: mentorId,
      is_guest: isGuest,
    })
    .select("id")
    .single();

  if (error || !row) {
    if (error?.code === "23505") {
      const msg = `${error.message} ${error.details ?? ""}`;
      return NextResponse.json(
        { error: msg.includes("nick") ? "nick_taken" : "exists" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  await setSession(row.id);
  return NextResponse.json({ ok: true });
}