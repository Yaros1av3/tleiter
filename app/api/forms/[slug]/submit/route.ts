import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { configurePush, sendToUsers } from "@/lib/pushServer";
import {
  isEmail,
  isLatinName,
  isPhone,
  isPlausibleBirth,
  type FormQuestion,
} from "@/lib/forms";
import {
  countResponses,
  emailFromNotes,
  findTeens,
  loadTeenPrefill,
  uniqueMatch,
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
  birth_date?: string;
  phone?: string;
  parent_name?: string;
  parent_phone?: string;
  email?: string;
  use_db?: string[]; // какие поля взять из нашей базы (телефоны и почта подставлены скрыто)
  declined?: boolean; // подросток нажал «Нет, это не я» — тогда не привязываем
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

  // имя и фамилия — только латиницей (по-немецки), форма на русском тоже
  if (!isLatinName(first) || !isLatinName(last)) {
    return NextResponse.json({ error: "latin" }, { status: 422 });
  }

  // стандартные поля: дата рождения, телефоны, родитель
  const birth = clean(body.birth_date, 10);
  let phone = clean(body.phone, 30);
  const parentName = clean(body.parent_name, 80);
  let parentPhone = clean(body.parent_phone, 30);
  let email = clean(body.email, 120);

  // «Да, это я»: скрытые значения (+49 ••• 123) заменяем настоящими из нашей базы
  const useDb = Array.isArray(body.use_db) ? body.use_db : [];

  if (useDb.length > 0 && typeof body.teen_id === "number" && !body.declined) {
    try {
      const candidates = await findTeens(first, last, null);

      if (candidates.some((item) => item.id === body.teen_id)) {
        const teen = await loadTeenPrefill(body.teen_id);

        if (teen) {
          if (useDb.includes("phone") && teen.phone) phone = clean(teen.phone, 30);
          if (useDb.includes("parent_phone") && teen.parent1_phone) {
            parentPhone = clean(teen.parent1_phone, 30);
          }
          if (useDb.includes("email")) {
            const stored = (teen.email ?? "").trim() || emailFromNotes(teen.notes);
            if (stored) email = clean(stored, 120);
          }
        }
      }
    } catch (error) {
      console.error("Prefill from database error:", error);
    }
  }

  const invalid = (field: string) =>
    NextResponse.json({ error: "invalid", field }, { status: 422 });

  if (!isPlausibleBirth(birth)) return invalid("birth");
  if (!isPhone(phone)) return invalid("phone");
  if (parentName.length < 2) return invalid("parent_name");
  if (!isLatinName(parentName)) {
    return NextResponse.json({ error: "latin" }, { status: 422 });
  }
  if (!isPhone(parentPhone)) return invalid("parent_phone");
  if (!isEmail(email)) return invalid("email");

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

  // привязка к подростку из базы: подтверждённая («Да, это я») или автоматическая
  let teenId: number | null = null;

  if (!body.declined) {
    try {
      const candidates = await findTeens(first, last, birth);

      if (typeof body.teen_id === "number") {
        // подросток сам подтвердил — проверяем, что это действительно подходящий вариант
        teenId = candidates.some((item) => item.id === body.teen_id)
          ? body.teen_id
          : null;
      }

      if (teenId === null) {
        teenId = uniqueMatch(candidates)?.id ?? null;
      }
    } catch (error) {
      // без привязки запись всё равно сохранится
      console.error("Teen match error:", error);
    }
  }

  const { error } = await admin.from("form_responses").insert({
    form_id: form.id,
    first_name: first,
    last_name: last,
    teen_id: teenId,
    birth_date: birth,
    phone: phone || null,
    parent_name: parentName,
    parent_phone: parentPhone,
    email: email || null,
    answers,
    source: "link",
    lang: body.lang === "ru" ? "ru" : "de",
    ip_hash: hash,
  });

  if (error) {
    console.error("Form submit error:", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  // привязанному подростку записываем почту в карточку, если там её ещё нет
  if (teenId && email) {
    try {
      await admin
        .from("teens")
        .update({ email })
        .eq("id", teenId)
        .or("email.is.null,email.eq.");
    } catch (emailError) {
      console.error("Teen email update error:", emailError);
    }
  }

  // уведомляем тех, кто подписался на эту форму
  try {
    if (configurePush()) {
      const { data: subs } = await admin
        .from("form_notify")
        .select("user_id")
        .eq("form_id", form.id);

      const userIds = (subs ?? []).map((row) => row.user_id as string);

      if (userIds.length > 0) {
        await sendToUsers(admin, userIds, {
          title: "TLight — новая запись",
          body: `${first} ${last} записался(лась): «${form.title_ru || form.title_de}»`,
          url: `/forms/${form.id}`,
          tag: `form-${form.id}-${Date.now()}`,
        });
      }
    }
  } catch (notifyError) {
    console.error("Form notify error:", notifyError);
  }

  return NextResponse.json({ ok: true });
}