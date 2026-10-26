import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { FormQuestion } from "@/lib/forms";
import {
  countResponses,
  ipHash,
  isClosed,
  loadFormBySlug,
} from "@/lib/formsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  first_name?: string;
  last_name?: string;
  answers?: Record<string, unknown>;
  teen_id?: number | null;
  lang?: string;
  website?: string; // ловушка для ботов: настоящие люди её не видят и не заполняют
  elapsed?: number; // сколько секунд форма была открыта
};

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const form = await loadFormBySlug(slug);

  if (!form) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;

  if (!body) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // бот: ловушка заполнена или форма «отправлена» быстрее чем за 3 секунды.
  // Отвечаем «успешно», чтобы бот не искал обход, но ничего не сохраняем.
  if (clean(body.website, 50) || Number(body.elapsed ?? 0) < 3) {
    return NextResponse.json({ ok: true });
  }

  if (isClosed(form)) {
    return NextResponse.json({ error: "closed" }, { status: 409 });
  }

  const first = clean(body.first_name, 60);
  const last = clean(body.last_name, 60);

  if (first.length < 2 || last.length < 2) {
    return NextResponse.json({ error: "name" }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  const hash = ipHash(request);

  // не больше 6 записей за 10 минут с одного адреса
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count: recentCount } = await admin
    .from("form_responses")
    .select("id", { count: "exact", head: true })
    .eq("form_id", form.id)
    .eq("ip_hash", hash)
    .gte("created_at", since);

  if ((recentCount ?? 0) >= 6) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }

  // места
  if (form.capacity != null) {
    const taken = await countResponses(form.id);
    if (taken >= form.capacity) {
      return NextResponse.json({ error: "full" }, { status: 409 });
    }
  }

  // уже записан(а)?
  const { data: same } = await admin
    .from("form_responses")
    .select("id")
    .eq("form_id", form.id)
    .ilike("first_name", first.replace(/[%_]/g, ""))
    .ilike("last_name", last.replace(/[%_]/g, ""))
    .limit(1);

  if ((same ?? []).length > 0) {
    return NextResponse.json({ error: "duplicate" }, { status: 409 });
  }

  // проверяем ответы по вопросам формы
  const raw = body.answers ?? {};
  const answers: Record<string, unknown> = {};

  for (const q of form.questions as FormQuestion[]) {
    const value = raw[q.id];
    const optionsDe = (q.options ?? []).map((o) => o.de || o.ru);
    const optionsRu = (q.options ?? []).map((o) => o.ru || o.de);

    let result: unknown = undefined;

    if (q.type === "short" || q.type === "phone") {
      const text = clean(value, 200);
      if (text) result = text;
    } else if (q.type === "long") {
      const text = String(value ?? "").trim().slice(0, 2000);
      if (text) result = text;
    } else if (q.type === "number") {
      const n = Number(value);
      if (value !== "" && value != null && Number.isFinite(n)) result = n;
    } else if (q.type === "yesno") {
      if (value === true || value === false) result = value;
    } else if (q.type === "single") {
      const text = clean(value, 200);
      if (text && (optionsDe.includes(text) || optionsRu.includes(text))) {
        result = text;
      }
    } else if (q.type === "multi") {
      if (Array.isArray(value)) {
        const picked = value
          .map((item) => clean(item, 200))
          .filter((item) => optionsDe.includes(item) || optionsRu.includes(item));
        if (picked.length > 0) result = Array.from(new Set(picked));
      }
    }

    if (result === undefined) {
      if (q.required) {
        return NextResponse.json(
          { error: "required", question: q.id },
          { status: 422 },
        );
      }
      continue;
    }

    answers[q.id] = result;
  }

  // привязка к подростку из базы — только если имя и фамилия совпали
  let teenId: number | null = null;

  if (typeof body.teen_id === "number") {
    const { data: teen } = await admin
      .from("teens")
      .select("id, first_name, last_name")
      .eq("id", body.teen_id)
      .maybeSingle();

    if (
      teen &&
      String(teen.first_name).trim().toLowerCase() === first.toLowerCase() &&
      String(teen.last_name).trim().toLowerCase() === last.toLowerCase()
    ) {
      teenId = teen.id as number;
    }
  }

  const { error } = await admin.from("form_responses").insert({
    form_id: form.id,
    first_name: first,
    last_name: last,
    teen_id: teenId,
    answers,
    source: "link",
    lang: body.lang === "ru" ? "ru" : "de",
    ip_hash: hash,
  });

  if (error) {
    console.error("Form submit error:", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
