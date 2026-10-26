import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { calcAge } from "@/lib/forms";
import { ipHash, loadFormBySlug } from "@/lib/formsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* простое ограничение: не больше 12 проверок в минуту с одного адреса (в памяти сервера) */
const hits = new Map<string, number[]>();

/*
 * «Это ты?»: по имени и фамилии ищем подростка в нашей базе.
 * Нужны ОБА поля целиком — по одной фамилии никого не угадать.
 * Наружу уходит только номер и возраст, ничего личного.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const form = await loadFormBySlug(slug);

  if (!form) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const key = ipHash(request);
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);

  if (recent.length >= 12) {
    return NextResponse.json({ matches: [] }, { status: 429 });
  }

  hits.set(key, [...recent, now]);

  const body = (await request.json().catch(() => ({}))) as {
    first_name?: string;
    last_name?: string;
  };

  const first = String(body.first_name ?? "").trim().slice(0, 60);
  const last = String(body.last_name ?? "").trim().slice(0, 60);

  if (first.length < 2 || last.length < 2) {
    return NextResponse.json({ matches: [] });
  }

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("teens")
    .select("id, first_name, last_name, birth_date, is_active")
    .ilike("last_name", last.replace(/[%_]/g, ""))
    .ilike("first_name", first.replace(/[%_]/g, ""))
    .limit(3);

  const matches = (data ?? []).map((teen) => ({
    id: teen.id as number,
    age: teen.birth_date ? calcAge(teen.birth_date as string) : null,
  }));

  return NextResponse.json({ matches });
}
