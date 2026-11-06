import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";

const MAX_PHOTO = 1500 * 1024;

function detect(buf: Buffer): { ext: string; type: string } | null {
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) return { ext: "jpg", type: "image/jpeg" };
  if (buf.length > 8 && buf.subarray(1, 4).toString() === "PNG") return { ext: "png", type: "image/png" };
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP")
    return { ext: "webp", type: "image/webp" };
  return null;
}

const berlinToday = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

/* Отправка или правка ответа. Баллы за фото и срок считаются здесь автоматически */
export async function POST(req: Request) {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad" }, { status: 400 });

  const taskId = Number(form.get("task_id"));
  const answer = String(form.get("answer") ?? "").trim().slice(0, 4000);
  const photo = form.get("photo");
  if (!taskId) return NextResponse.json({ error: "bad" }, { status: 400 });
  if (answer.length < 10) return NextResponse.json({ error: "short" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: task } = await sb
    .from("bc_tasks")
    .select("id, task_date, deadline, is_published, bc_seasons!inner(status)")
    .eq("id", taskId)
    .maybeSingle();
  const seasonStatus = (task as unknown as { bc_seasons?: { status?: string } } | null)?.bc_seasons?.status;
  if (!task || !task.is_published || seasonStatus !== "active" || task.task_date > berlinToday())
    return NextResponse.json({ error: "closed" }, { status: 403 });

  const { data: cfgRows } = await sb.from("bc_settings").select("key, value");
  const cfg = Object.fromEntries((cfgRows ?? []).map((r) => [r.key, Number(r.value)]));

  const { data: existing } = await sb
    .from("bc_submissions")
    .select("id, status, photo_path")
    .eq("task_id", taskId)
    .eq("participant_id", p.id)
    .maybeSingle();
  if (existing?.status === "accepted") return NextResponse.json({ error: "locked" }, { status: 409 });

  let photoPath: string | null = existing?.photo_path ?? null;
  let newPhoto = false;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_PHOTO) return NextResponse.json({ error: "big" }, { status: 413 });
    const buf = Buffer.from(await photo.arrayBuffer());
    const kind = detect(buf);
    if (!kind) return NextResponse.json({ error: "type" }, { status: 400 });
    const path = `${p.id}/${taskId}-${Date.now()}.${kind.ext}`;
    const up = await sb.storage.from("bc-photos").upload(path, buf, { contentType: kind.type });
    if (up.error) return NextResponse.json({ error: "upload" }, { status: 500 });
    newPhoto = true;
    if (photoPath) await sb.storage.from("bc-photos").remove([photoPath]);
    photoPath = path;
  }
  void newPhoto;

  const pointsPhoto = photoPath ? (cfg.pts_photo ?? 5) : 0;

  if (existing) {
    const { error } = await sb
      .from("bc_submissions")
      .update({
        answer_text: answer,
        photo_path: photoPath,
        points_photo: pointsPhoto,
        status: "pending",
        points_quality: null,
        graded_at: null,
        graded_by: null,
      })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  } else {
    const late = Date.now() > new Date(task.deadline).getTime();
    const { error } = await sb.from("bc_submissions").insert({
      task_id: taskId,
      participant_id: p.id,
      answer_text: answer,
      photo_path: photoPath,
      is_late: late,
      points_photo: pointsPhoto,
      points_time: late ? (cfg.pts_late ?? 5) : (cfg.pts_on_time ?? 10),
    });
    if (error) {
      return NextResponse.json({ error: error.code === "23505" ? "exists" : "db" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}