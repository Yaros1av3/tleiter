import { NextRequest, NextResponse } from "next/server";

import { isLatinName } from "@/lib/forms";
import { findTeens, ipHash, loadFormBySlug } from "@/lib/formsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* простое ограничение: не больше 12 проверок в минуту с одного адреса (в памяти сервера) */
const hits = new Map<string, number[]>();

/*
 * «Это ты?»: по имени и фамилии ищем подростка в нашей базе
 * (терпимо к умлаутам, регистру и мелким опечаткам).
 * Нужны ОБА поля — по одной фамилии никого не угадать.
 * Наружу уходит только номер и возраст, ничего личного.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
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
      birth_date?: string;
    };

    const first = String(body.first_name ?? "").trim().slice(0, 60);
    const last = String(body.last_name ?? "").trim().slice(0, 60);

    if (
      first.length < 2 ||
      last.length < 2 ||
      !isLatinName(first) ||
      !isLatinName(last)
    ) {
      return NextResponse.json({ matches: [] });
    }

    const birth = /^\d{4}-\d{2}-\d{2}$/.test(String(body.birth_date ?? ""))
      ? String(body.birth_date)
      : null;

    const matches = await findTeens(first, last, birth);

    return NextResponse.json({
      matches: matches.map((match) => ({ id: match.id, age: match.age })),
    });
  } catch (error) {
    console.error("Form lookup error:", error);
    return NextResponse.json({ matches: [] }, { status: 500 });
  }
}