import { NextRequest, NextResponse } from "next/server";

import { isEmail, isLatinName, isPhone } from "@/lib/forms";
import {
  emailFromNotes,
  findTeens,
  ipHash,
  loadFormBySlug,
  loadTeenPrefill,
  maskEmail,
  maskPhone,
} from "@/lib/formsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();

/*
 * «Да, это я»: подставляем данные подростка из нашей базы.
 * Телефоны и почта уходят наружу наполовину скрытыми (+49 ••• ••• 123):
 * настоящие значения остаются на сервере и подставляются при отправке формы.
 * Подросток должен совпасть с введённым именем и фамилией.
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

    if (recent.length >= 8) {
      return NextResponse.json({ error: "too_many" }, { status: 429 });
    }

    hits.set(key, [...recent, now]);

    const body = (await request.json().catch(() => ({}))) as {
      teen_id?: number;
      first_name?: string;
      last_name?: string;
    };

    const first = String(body.first_name ?? "").trim().slice(0, 60);
    const last = String(body.last_name ?? "").trim().slice(0, 60);
    const teenId = Number(body.teen_id);

    if (!Number.isFinite(teenId) || !isLatinName(first) || !isLatinName(last)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const candidates = await findTeens(first, last, null);

    if (!candidates.some((item) => item.id === teenId)) {
      return NextResponse.json({ error: "no_match" }, { status: 404 });
    }

    const teen = await loadTeenPrefill(teenId);

    if (!teen) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const email = (teen.email ?? "").trim() || emailFromNotes(teen.notes);
    const parentName = (teen.parent1_name ?? "").trim();

    return NextResponse.json({
      birth_date: teen.birth_date ? String(teen.birth_date).slice(0, 10) : null,
      phone: teen.phone && isPhone(teen.phone) ? maskPhone(teen.phone) : null,
      parent_name: parentName && isLatinName(parentName) ? parentName : null,
      parent_phone:
        teen.parent1_phone && isPhone(teen.parent1_phone)
          ? maskPhone(teen.parent1_phone)
          : null,
      email: email && isEmail(email) ? maskEmail(email) : null,
    });
  } catch (error) {
    console.error("Form prefill error:", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}