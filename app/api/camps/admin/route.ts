import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { BUCKET, getCampStaff, randomId, safeExt } from "@/lib/campsServer";
import { REG_FIELDS } from "@/lib/campReg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const txt = (v: unknown, max: number) => {
  const s = String(v ?? "").trim().slice(0, max);
  return s === "" ? null : s;
};

/* Настройки регистрации, документы и заявки лагеря (для служителей с правом «T-Camps») */
export async function GET(req: Request) {
  if (!(await getCampStaff(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const sb = getSupabaseAdmin();
  const url = new URL(req.url);

  // детали одной заявки: загруженные файлы
  const regId = Number(url.searchParams.get("reg_id"));
  if (regId) {
    const { data: files } = await sb
      .from("camp_registration_files")
      .select("id, document_id, file_path, file_name, created_at")
      .eq("registration_id", regId)
      .order("id");
    const out = await Promise.all(
      (files ?? []).map(async (f) => {
        const s = await sb.storage.from(BUCKET).createSignedUrl(f.file_path as string, 3600, {
          download: (f.file_name as string) || true,
        });
        return { id: f.id, document_id: f.document_id, file_name: f.file_name, url: s.data?.signedUrl ?? null };
      }),
    );
    return NextResponse.json({ files: out });
  }

  const campId = Number(url.searchParams.get("camp_id"));
  if (!campId) return NextResponse.json({ error: "bad" }, { status: 400 });

  const [campR, docsR, regsR] = await Promise.all([
    sb.from("camps").select("id, reg_open, reg_deadline, reg_intro_ru, reg_intro_de, reg_slug").eq("id", campId).maybeSingle(),
    sb.from("camp_documents").select("*").eq("camp_id", campId).order("sort").order("id"),
    sb.from("camp_registrations").select("*").eq("camp_id", campId).order("created_at", { ascending: false }),
  ]);
  if (!campR.data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const documents = await Promise.all(
    (docsR.data ?? []).map(async (d) => {
      let template_url: string | null = null;
      if (d.template_path) {
        const s = await sb.storage.from(BUCKET).createSignedUrl(d.template_path as string, 3600, {
          download: (d.template_name as string) || true,
        });
        template_url = s.data?.signedUrl ?? null;
      }
      return { ...d, template_url };
    }),
  );

  // сколько файлов у каждой заявки
  const ids = (regsR.data ?? []).map((r) => r.id as number);
  const counts: Record<number, number> = {};
  if (ids.length > 0) {
    const { data: fl } = await sb.from("camp_registration_files").select("registration_id").in("registration_id", ids);
    (fl ?? []).forEach((f) => {
      counts[f.registration_id as number] = (counts[f.registration_id as number] ?? 0) + 1;
    });
  }

  return NextResponse.json({
    settings: campR.data,
    documents,
    registrations: (regsR.data ?? []).map((r) => ({ ...r, files_count: counts[r.id as number] ?? 0 })),
  });
}

export async function POST(req: Request) {
  if (!(await getCampStaff(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad" }, { status: 400 });
  const sb = getSupabaseAdmin();
  const action = String(body.action ?? "");

  if (action === "settings_save") {
    const { error } = await sb
      .from("camps")
      .update({
        reg_open: body.reg_open === true,
        reg_deadline: txt(body.reg_deadline, 10),
        reg_intro_ru: txt(body.reg_intro_ru, 2000),
        reg_intro_de: txt(body.reg_intro_de, 2000),
      })
      .eq("id", Number(body.camp_id));
    return error ? NextResponse.json({ error: "db" }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (action === "doc_save") {
    const campId = Number(body.camp_id);
    const title = txt(body.title, 120);
    if (!title) return NextResponse.json({ error: "bad" }, { status: 400 });
    const fields = {
      title,
      description: txt(body.description, 600),
      needs_upload: body.needs_upload === true,
      required: body.needs_upload === true && body.required === true,
    };
    const fileName = txt(body.file_name, 120);
    const id = Number(body.id) || null;

    let docId = id;
    let oldPath: string | null = null;
    if (id) {
      const { data: cur } = await sb.from("camp_documents").select("template_path").eq("id", id).maybeSingle();
      oldPath = (cur?.template_path as string | null) ?? null;
      const { error } = await sb.from("camp_documents").update(fields).eq("id", id);
      if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    } else {
      const { data, error } = await sb.from("camp_documents").insert({ ...fields, camp_id: campId }).select("id").single();
      if (error || !data) return NextResponse.json({ error: "db" }, { status: 500 });
      docId = data.id as number;
    }

    let upload: { path: string; token: string } | null = null;
    if (fileName && docId) {
      const path = `templates/${campId || "x"}/${docId}-${randomId()}.${safeExt(fileName)}`;
      const signed = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
      if (signed.error || !signed.data) return NextResponse.json({ error: "upload" }, { status: 500 });
      await sb.from("camp_documents").update({ template_path: path, template_name: fileName }).eq("id", docId);
      if (oldPath) await sb.storage.from(BUCKET).remove([oldPath]);
      upload = { path, token: signed.data.token };
    }
    if (body.remove_file === true && docId && !fileName) {
      if (oldPath) await sb.storage.from(BUCKET).remove([oldPath]);
      await sb.from("camp_documents").update({ template_path: null, template_name: null }).eq("id", docId);
    }
    return NextResponse.json({ ok: true, upload });
  }

  if (action === "doc_delete") {
    const id = Number(body.id);
    const { data: cur } = await sb.from("camp_documents").select("template_path").eq("id", id).maybeSingle();
    if (cur?.template_path) await sb.storage.from(BUCKET).remove([cur.template_path as string]);
    const { error } = await sb.from("camp_documents").delete().eq("id", id);
    return error ? NextResponse.json({ error: "db" }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (action === "reg_save") {
    const data = (body.data ?? {}) as Record<string, unknown>;
    const row: Record<string, unknown> = {};
    for (const key of REG_FIELDS) {
      if (!(key in data)) continue;
      const v = data[key];
      if (key === "photo_consent" || key === "rules_accepted") row[key] = v === true;
      else if (key === "gender") row[key] = v === "m" || v === "f" ? v : null;
      else if (key === "can_swim") row[key] = ["yes", "limited", "no"].includes(String(v)) ? v : null;
      else if (key === "birth_date") row[key] = /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? v : null;
      else row[key] = txt(v, 600);
    }
    if ("status" in data && ["new", "confirmed", "waitlist", "declined"].includes(String(data.status))) row.status = data.status;
    if ("internal_note" in data) row.internal_note = txt(data.internal_note, 1000);
    if ("paid_amount" in data) {
      const n = Number(String(data.paid_amount ?? "").replace(",", "."));
      row.paid_amount = String(data.paid_amount ?? "").trim() === "" || Number.isNaN(n) ? null : n;
    }

    const id = Number(body.id) || null;
    if (id) {
      const { error } = await sb.from("camp_registrations").update(row).eq("id", id);
      return error ? NextResponse.json({ error: "db" }, { status: 500 }) : NextResponse.json({ ok: true });
    }
    if (!row.first_name || !row.last_name) return NextResponse.json({ error: "name" }, { status: 400 });
    const { error } = await sb.from("camp_registrations").insert({ ...row, camp_id: Number(body.camp_id), lang: "ru" });
    return error ? NextResponse.json({ error: "db" }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  /* Заезд: приехал, карта, деньги, оплата, отъезд */
  if (action === "checkin") {
    const id = Number(body.id);
    const p = (body.patch ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if ("arrived" in p) patch.arrived_at = p.arrived === true ? new Date().toISOString() : null;
    if ("departed" in p) patch.departed_at = p.departed === true ? new Date().toISOString() : null;
    if ("card_taken" in p) patch.card_taken = p.card_taken === true;
    if ("cash_taken" in p) patch.cash_taken = p.cash_taken === true;
    for (const key of ["cash_amount", "paid_amount"] as const) {
      if (!(key in p)) continue;
      const raw = String(p[key] ?? "").trim().replace(",", ".");
      const n = Number(raw);
      patch[key] = raw === "" || Number.isNaN(n) ? null : n;
    }
    if (!id || Object.keys(patch).length === 0) return NextResponse.json({ error: "bad" }, { status: 400 });
    const { error } = await sb.from("camp_registrations").update(patch).eq("id", id);
    return error ? NextResponse.json({ error: "db" }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  /* Назначить подростков в отряд или домик (null = убрать) */
  if (action === "assign") {
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(Number).filter(Boolean).slice(0, 300);
    const patch: Record<string, number | null> = {};
    if ("group_id" in body) patch.group_id = body.group_id === null ? null : Number(body.group_id) || null;
    if ("cabin_id" in body) patch.cabin_id = body.cabin_id === null ? null : Number(body.cabin_id) || null;
    if (ids.length === 0 || Object.keys(patch).length === 0) return NextResponse.json({ error: "bad" }, { status: 400 });
    const { error } = await sb.from("camp_registrations").update(patch).in("id", ids);
    return error ? NextResponse.json({ error: "db" }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (action === "reg_delete") {
    const id = Number(body.id);
    const { data: files } = await sb.from("camp_registration_files").select("file_path").eq("registration_id", id);
    const paths = (files ?? []).map((f) => f.file_path as string);
    if (paths.length > 0) await sb.storage.from(BUCKET).remove(paths);
    const { error } = await sb.from("camp_registrations").delete().eq("id", id);
    return error ? NextResponse.json({ error: "db" }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad" }, { status: 400 });
}