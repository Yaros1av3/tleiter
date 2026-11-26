import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normName } from "@/lib/bcNames";
import { cleanText, clientIp, rateLimit, signToken } from "@/lib/bcAuth";
import { NAME_RE, maskEmail, maskPhone, validBirth } from "@/lib/teensAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Шаг 1 регистрации: ищем подростка в базе по имени, фамилии и дате рождения */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const first = cleanText(body?.first, 40);
  const last = cleanText(body?.last, 40);
  const birth = validBirth(body?.birth);

  if (!first || !last || !NAME_RE.test(first) || !NAME_RE.test(last)) {
    return NextResponse.json({ error: "name_format" }, { status: 400 });
  }
  if (!birth) return NextResponse.json({ error: "birth" }, { status: 400 });
  if (!rateLimit(`tlookup:${clientIp(req)}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }

  const sb = getSupabaseAdmin();

  const { data: teens, error } = await sb
    .from("teens")
    .select("id, first_name, last_name, gender, phone, email, parent1_name, parent1_phone")
    .eq("birth_date", birth);

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  const a = normName(first);
  const b = normName(last);
  const matches = (teens ?? []).filter((t) => {
    const f = normName(t.first_name ?? "");
    const l = normName(t.last_name ?? "");
    return (f === a && l === b) || (f === b && l === a);
  });

  if (!matches.length) return NextResponse.json({ status: "notfound" });

  const { data: taken } = await sb
    .from("bc_participants")
    .select("teen_id")
    .in("teen_id", matches.map((m) => m.id as number));
  const takenIds = new Set((taken ?? []).map((p) => p.teen_id as number));
  const free = matches.filter((m) => !takenIds.has(m.id as number));

  if (!free.length) return NextResponse.json({ status: "exists" });

  const teen = free[0];
  const ticket = signToken({ id: teen.id, birth }, 20 * 60);

  // в ответ отдаём только «замаскированные» подсказки: человек, знающий имя и дату рождения, не увидит чужие номера целиком
  return NextResponse.json({
    status: "found",
    ticket,
    firstName: teen.first_name,
    gender: teen.gender === "female" || teen.gender === "male" ? teen.gender : null,
    has: {
      phone: maskPhone(teen.phone),
      parentName: teen.parent1_name ? String(teen.parent1_name).split(" ")[0] : "",
      parentPhone: maskPhone(teen.parent1_phone),
      email: maskEmail(teen.email),
    },
  });
}