import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { hasBadWord } from "@/lib/badWords";
import { cleanText, clientIp, hashPassword, rateLimit, setSession, verifyToken } from "@/lib/bcAuth";
import { EMAIL_RE, NAME_RE, cleanPhone, nickCandidates, validBirth } from "@/lib/teensAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TeenRow = {
  id: number;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  parent1_name: string | null;
  parent1_phone: string | null;
};

/* Регистрация подростка: данные, email и пароль */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad" }, { status: 400 });
  if (!rateLimit(`treg:${clientIp(req)}`, 15, 15 * 60_000)) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }

  const lang = body.lang === "ru" ? "ru" : "de";
  const email = cleanText(body.email, 120).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const gender = body.gender === "female" || body.gender === "male" ? body.gender : null;
  const phone = cleanPhone(body.phone);
  const parentName = cleanText(body.parent_name, 60);
  const parentPhone = cleanPhone(body.parent_phone);
  const birth = validBirth(body.birth);

  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "email_format" }, { status: 400 });
  if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "pw_short" }, { status: 400 });
  if (!birth) return NextResponse.json({ error: "birth" }, { status: 400 });

  const sb = getSupabaseAdmin();

  const { data: emailTaken } = await sb.from("bc_participants").select("id").ilike("email", email.replace(/[\\%_]/g, (c) => "\\" + c)).maybeSingle();
  if (emailTaken) return NextResponse.json({ error: "email_taken" }, { status: 409 });

  let teenId: number | null = null;
  let first = cleanText(body.first, 40);
  let last = cleanText(body.last, 40);
  let mentorId: number | null = null;
  let isGuest = false;
  let teenRow = null as TeenRow | null;

  if (typeof body.ticket === "string" && body.ticket) {
    const ticket = verifyToken<{ id: number; birth: string }>(body.ticket);
    if (!ticket?.id || ticket.birth !== birth) return NextResponse.json({ error: "ticket" }, { status: 400 });

    const { data } = await sb
      .from("teens")
      .select("id, first_name, last_name, birth_date, gender, phone, email, parent1_name, parent1_phone")
      .eq("id", ticket.id)
      .maybeSingle();
    if (!data || String(data.birth_date ?? "") !== birth) return NextResponse.json({ error: "ticket" }, { status: 400 });

    teenRow = data as TeenRow;
    teenId = data.id as number;
    first = data.first_name as string;
    last = data.last_name as string;

    const { data: m } = await sb.from("teen_mentors").select("team_member_id").eq("teen_id", teenId).maybeSingle();
    mentorId = m?.team_member_id ?? null;
  } else {
    if (!first || !last || !NAME_RE.test(first) || !NAME_RE.test(last)) {
      return NextResponse.json({ error: "name_format" }, { status: 400 });
    }
    isGuest = true;
  }

  // данные, которых ещё нет в базе, обязательны
  const needParent = !(teenRow?.parent1_name && teenRow?.parent1_phone);
  if (!gender && !teenRow?.gender) return NextResponse.json({ error: "gender" }, { status: 400 });
  if (needParent && (!parentName || !parentPhone)) return NextResponse.json({ error: "parent" }, { status: 400 });

  // ник для рейтинга создаём сами, подросток сможет его поменять
  const candidates = nickCandidates(first, last).filter((n) => !hasBadWord(n));
  let rowId: number | null = null;

  for (const nickname of candidates) {
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
        email,
        phone: phone || null,
        birth_date: birth,
        gender: gender ?? teenRow?.gender ?? null,
        parent_name: parentName || teenRow?.parent1_name || null,
        parent_phone: parentPhone || teenRow?.parent1_phone || null,
      })
      .select("id")
      .single();

    if (row) {
      rowId = row.id as number;
      break;
    }

    if (error?.code === "23505") {
      const msg = `${error.message} ${error.details ?? ""}`;
      if (msg.includes("email")) return NextResponse.json({ error: "email_taken" }, { status: 409 });
      if (msg.includes("teen")) return NextResponse.json({ error: "exists" }, { status: 409 });
      continue; // ник занят, пробуем следующий
    }

    console.error("teens register insert error:", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  if (!rowId) return NextResponse.json({ error: "db" }, { status: 500 });

  // в базу подростков дописываем только то, что там было пустым
  if (teenRow) {
    const patch: Record<string, string> = {};
    if (!teenRow.gender && gender) patch.gender = gender;
    if (!teenRow.phone && phone) patch.phone = phone;
    if (!teenRow.email && email) patch.email = email;
    if (!teenRow.parent1_name && parentName) patch.parent1_name = parentName;
    if (!teenRow.parent1_phone && parentPhone) patch.parent1_phone = parentPhone;

    if (Object.keys(patch).length > 0) {
      const { error } = await sb.from("teens").update(patch).eq("id", teenRow.id);
      if (error) console.error("teens fill-in error:", error.message);
    }
  }

  await setSession(rowId);
  return NextResponse.json({ ok: true });
}