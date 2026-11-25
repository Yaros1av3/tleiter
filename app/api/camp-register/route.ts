import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { BUCKET, randomId, safeExt } from "@/lib/campsServer";
import { REG_FIELDS, isEmailLike, isPhoneLike } from "@/lib/campReg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[ \t]+/g, " ").trim().slice(0, max);

/* Публичная информация о лагере и документах для формы регистрации */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!slug) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const sb = getSupabaseAdmin();
  const { data: camp } = await sb
    .from("camps")
    .select("id, title, theme, start_date, end_date, location, price, reg_open, reg_deadline, reg_intro_ru, reg_intro_de")
    .eq("reg_slug", slug)
    .maybeSingle();
  if (!camp) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: docs } = await sb
    .from("camp_documents")
    .select("id, title, description, template_path, template_name, needs_upload, required")
    .eq("camp_id", camp.id)
    .order("sort")
    .order("id");

  const documents = await Promise.all(
    (docs ?? []).map(async (d) => {
      let url: string | null = null;
      if (d.template_path) {
        const s = await sb.storage.from(BUCKET).createSignedUrl(d.template_path as string, 3600, {
          download: (d.template_name as string) || true,
        });
        url = s.data?.signedUrl ?? null;
      }
      return {
        id: d.id,
        title: d.title,
        description: d.description,
        url,
        file_name: d.template_name,
        needs_upload: d.needs_upload,
        required: d.required,
      };
    }),
  );

  const closedByDate = camp.reg_deadline && camp.reg_deadline < new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  return NextResponse.json({
    camp: {
      title: camp.title,
      theme: camp.theme,
      start_date: camp.start_date,
      end_date: camp.end_date,
      location: camp.location,
      price: camp.price,
      intro_ru: camp.reg_intro_ru,
      intro_de: camp.reg_intro_de,
      deadline: camp.reg_deadline,
    },
    open: Boolean(camp.reg_open) && !closedByDate,
    documents,
  });
}

/* Отправка заявки. Файлы загружаются отдельно по одноразовым ссылкам, которые отдаёт этот ответ */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad" }, { status: 400 });

  // ловушка для ботов и слишком быстрые отправки
  if (clean(body.website, 50)) return NextResponse.json({ ok: true });
  if (Number(body.elapsed) < 4) return NextResponse.json({ error: "fast" }, { status: 429 });

  const sb = getSupabaseAdmin();
  const { data: camp } = await sb
    .from("camps")
    .select("id, max_participants, reg_open, reg_deadline")
    .eq("reg_slug", clean(body.slug, 40))
    .maybeSingle();
  if (!camp) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  if (!camp.reg_open || (camp.reg_deadline && camp.reg_deadline < today))
    return NextResponse.json({ error: "closed" }, { status: 403 });

  const first = clean(body.first_name, 60);
  const last = clean(body.last_name, 60);
  const birth = clean(body.birth_date, 10);
  const gender = body.gender === "m" || body.gender === "f" ? body.gender : null;
  const phone = clean(body.phone, 30);
  const parentPhone = clean(body.parent_phone, 30);
  const parentName = clean(body.parent_name, 100);
  const email = clean(body.email, 120);

  if (!first || !last) return NextResponse.json({ error: "name" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return NextResponse.json({ error: "birth" }, { status: 400 });
  if (!gender) return NextResponse.json({ error: "gender" }, { status: 400 });
  if (!parentName || !isPhoneLike(parentPhone)) return NextResponse.json({ error: "parent" }, { status: 400 });
  if (phone && !isPhoneLike(phone)) return NextResponse.json({ error: "phone" }, { status: 400 });
  if (email && !isEmailLike(email)) return NextResponse.json({ error: "email" }, { status: 400 });
  if (body.rules_accepted !== true) return NextResponse.json({ error: "rules" }, { status: 400 });

  // документы, которые нужно загрузить
  const { data: docs } = await sb
    .from("camp_documents")
    .select("id, required, needs_upload")
    .eq("camp_id", camp.id);
  const wanted = (Array.isArray(body.files) ? body.files : []) as { document_id?: number; name?: string }[];
  const byDoc = new Map<number, { document_id: number; name: string }>();
  for (const f of wanted.slice(0, 12)) {
    const id = Number(f.document_id);
    if (docs?.some((d) => d.id === id)) byDoc.set(id, { document_id: id, name: clean(f.name, 120) || "file" });
  }
  const missing = (docs ?? []).filter((d) => d.needs_upload && d.required && !byDoc.has(d.id as number));
  if (missing.length > 0) return NextResponse.json({ error: "files" }, { status: 400 });

  // места
  let status = "new";
  if (camp.max_participants) {
    const { count } = await sb
      .from("camp_registrations")
      .select("id", { count: "exact", head: true })
      .eq("camp_id", camp.id)
      .in("status", ["new", "confirmed"]);
    if ((count ?? 0) >= camp.max_participants) status = "waitlist";
  }

  const row: Record<string, unknown> = { camp_id: camp.id, status, lang: body.lang === "ru" ? "ru" : "de" };
  for (const key of REG_FIELDS) {
    const v = body[key];
    if (key === "photo_consent" || key === "rules_accepted") row[key] = v === true;
    else if (key === "birth_date") row[key] = birth;
    else if (key === "gender") row[key] = gender;
    else if (key === "can_swim") row[key] = ["yes", "limited", "no"].includes(String(v)) ? v : null;
    else row[key] = clean(v, key === "notes" || key === "health_notes" || key === "allergies" || key === "medications" ? 600 : 120) || null;
  }
  row.first_name = first;
  row.last_name = last;

  const { data: reg, error } = await sb.from("camp_registrations").insert(row).select("id").single();
  if (error || !reg) return NextResponse.json({ error: "db" }, { status: 500 });

  const uploads: { document_id: number; path: string; token: string }[] = [];
  for (const f of byDoc.values()) {
    const path = `reg/${camp.id}/${reg.id}/${f.document_id}-${randomId()}.${safeExt(f.name)}`;
    const signed = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (signed.error || !signed.data) continue;
    await sb.from("camp_registration_files").insert({
      registration_id: reg.id,
      document_id: f.document_id,
      file_path: path,
      file_name: f.name,
    });
    uploads.push({ document_id: f.document_id, path, token: signed.data.token });
  }
  return NextResponse.json({ ok: true, status, uploads });
}