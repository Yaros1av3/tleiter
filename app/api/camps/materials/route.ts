import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { BUCKET, getCampStaff, getTeamUser, randomId, safeExt } from "@/lib/campsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const txt = (v: unknown, max: number) => {
  const s = String(v ?? "").trim().slice(0, max);
  return s === "" ? null : s;
};
const CATEGORIES = ["program", "lessons", "slides", "docs", "music", "games", "other"];

/* Материалы лагеря видят все служители */
export async function GET(req: Request) {
  if (!(await getTeamUser(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const campId = Number(new URL(req.url).searchParams.get("camp_id"));
  if (!campId) return NextResponse.json({ error: "bad" }, { status: 400 });
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("camp_materials").select("*").eq("camp_id", campId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  const materials = await Promise.all(
    (data ?? []).map(async (m) => {
      let file_url: string | null = null;
      if (m.file_path) {
        const s = await sb.storage.from(BUCKET).createSignedUrl(m.file_path as string, 3600, { download: (m.file_name as string) || true });
        file_url = s.data?.signedUrl ?? null;
      }
      return { ...m, file_url };
    }),
  );
  return NextResponse.json({ materials });
}

/* Добавлять и менять могут организаторы лагеря */
export async function POST(req: Request) {
  if (!(await getCampStaff(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad" }, { status: 400 });
  const sb = getSupabaseAdmin();

  if (body.action === "material_save") {
    const title = txt(body.title, 120);
    if (!title) return NextResponse.json({ error: "bad" }, { status: 400 });
    const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : "other";
    const kind = body.kind === "link" ? "link" : "file";
    let url: string | null = null;
    if (kind === "link") {
      url = txt(body.url, 500);
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
      if (!url) return NextResponse.json({ error: "url" }, { status: 400 });
    }
    const fields = { title, description: txt(body.description, 600), category, kind, url };
    const id = Number(body.id) || null;
    const campId = Number(body.camp_id);
    const fileName = kind === "file" ? txt(body.file_name, 160) : null;

    let rowId = id;
    let oldPath: string | null = null;
    if (id) {
      const { data: cur } = await sb.from("camp_materials").select("file_path").eq("id", id).maybeSingle();
      oldPath = (cur?.file_path as string | null) ?? null;
      const { error } = await sb.from("camp_materials").update(fields).eq("id", id);
      if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    } else {
      if (kind === "file" && !fileName) return NextResponse.json({ error: "file" }, { status: 400 });
      const { data, error } = await sb.from("camp_materials").insert({ ...fields, camp_id: campId }).select("id").single();
      if (error || !data) return NextResponse.json({ error: "db" }, { status: 500 });
      rowId = data.id as number;
    }

    let upload: { path: string; token: string } | null = null;
    if (fileName && rowId) {
      const path = `materials/${campId || "x"}/${rowId}-${randomId()}.${safeExt(fileName)}`;
      const signed = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
      if (signed.error || !signed.data) return NextResponse.json({ error: "upload" }, { status: 500 });
      await sb.from("camp_materials").update({ file_path: path, file_name: fileName, file_size: Number(body.file_size) || null }).eq("id", rowId);
      if (oldPath) await sb.storage.from(BUCKET).remove([oldPath]);
      upload = { path, token: signed.data.token };
    }
    if (kind === "link" && rowId && oldPath) {
      await sb.storage.from(BUCKET).remove([oldPath]);
      await sb.from("camp_materials").update({ file_path: null, file_name: null, file_size: null }).eq("id", rowId);
    }
    return NextResponse.json({ ok: true, upload });
  }

  if (body.action === "material_delete") {
    const id = Number(body.id);
    const { data: cur } = await sb.from("camp_materials").select("file_path").eq("id", id).maybeSingle();
    if (cur?.file_path) await sb.storage.from(BUCKET).remove([cur.file_path as string]);
    const { error } = await sb.from("camp_materials").delete().eq("id", id);
    return error ? NextResponse.json({ error: "db" }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad" }, { status: 400 });
}