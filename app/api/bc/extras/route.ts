import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";

export const dynamic = "force-dynamic";

const MAX_PHOTO = 1500 * 1024;
const berlinToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

function detect(buf: Buffer): { ext: string; type: string } | null {
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) return { ext: "jpg", type: "image/jpeg" };
  if (buf.length > 8 && buf.subarray(1, 4).toString() === "PNG") return { ext: "png", type: "image/png" };
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP")
    return { ext: "webp", type: "image/webp" };
  return null;
}

async function cfgOf(sb: ReturnType<typeof getSupabaseAdmin>) {
  const { data } = await sb.from("bc_settings").select("key, value");
  const cfg = Object.fromEntries((data ?? []).map((r) => [r.key, Number(r.value)]));
  return { story: cfg.pts_story ?? 10, verse: cfg.pts_verse ?? 20 };
}

/* Доп. задания подростка: текст на сегодня, сторис за сегодня, выученные стихи */
export async function GET() {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: season } = await sb.from("bc_seasons").select("id").eq("status", "active").maybeSingle();
  if (!season) return NextResponse.json({ active: false });

  const today = berlinToday();
  const [pts, taskRes, extrasRes] = await Promise.all([
    cfgOf(sb),
    sb
      .from("bc_tasks")
      .select("extra_de, extra_ru")
      .eq("season_id", season.id)
      .eq("is_published", true)
      .eq("task_date", today)
      .maybeSingle(),
    sb
      .from("bc_extras")
      .select("id, kind, day, channel, verse_ref, points")
      .eq("participant_id", p.id)
      .eq("season_id", season.id)
      .order("day", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  const ru = p.lang === "ru";
  const task = taskRes.data as { extra_de: string | null; extra_ru: string | null } | null;
  const rows = (extrasRes.data ?? []) as {
    id: number;
    kind: "story" | "verse";
    day: string;
    channel: string | null;
    verse_ref: string | null;
    points: number;
  }[];

  return NextResponse.json({
    active: true,
    text: task ? (ru ? task.extra_ru : task.extra_de) : null,
    points: pts,
    storyToday: rows.some((r) => r.kind === "story" && r.day === today),
    stories: rows.filter((r) => r.kind === "story").length,
    verses: rows.filter((r) => r.kind === "verse").map((r) => ({ id: r.id, ref: r.verse_ref, day: r.day })),
    earned: rows.reduce((a, r) => a + r.points, 0),
  });
}

/* Сторис: один в день, скриншот обязателен */
export async function POST(req: Request) {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad" }, { status: 400 });
  const channelRaw = String(form.get("channel") ?? "");
  const channel = ["whatsapp", "instagram", "both"].includes(channelRaw) ? channelRaw : null;
  const photo = form.get("photo");
  if (!channel || !(photo instanceof File) || photo.size === 0)
    return NextResponse.json({ error: "bad" }, { status: 400 });
  if (photo.size > MAX_PHOTO) return NextResponse.json({ error: "big" }, { status: 413 });

  const sb = getSupabaseAdmin();
  const { data: season } = await sb.from("bc_seasons").select("id").eq("status", "active").maybeSingle();
  if (!season) return NextResponse.json({ error: "closed" }, { status: 403 });

  const today = berlinToday();
  const { data: have } = await sb
    .from("bc_extras")
    .select("id")
    .eq("participant_id", p.id)
    .eq("season_id", season.id)
    .eq("kind", "story")
    .eq("day", today)
    .maybeSingle();
  if (have) return NextResponse.json({ error: "exists" }, { status: 409 });

  const buf = Buffer.from(await photo.arrayBuffer());
  const kind = detect(buf);
  if (!kind) return NextResponse.json({ error: "type" }, { status: 400 });
  const path = `${p.id}/story-${today}-${Date.now()}.${kind.ext}`;
  const up = await sb.storage.from("bc-photos").upload(path, buf, { contentType: kind.type });
  if (up.error) return NextResponse.json({ error: "upload" }, { status: 500 });

  const pts = await cfgOf(sb);
  const { error } = await sb.from("bc_extras").insert({
    participant_id: p.id,
    season_id: season.id,
    kind: "story",
    day: today,
    channel,
    photo_path: path,
    points: pts.story,
  });
  if (error) {
    await sb.storage.from("bc-photos").remove([path]);
    return NextResponse.json({ error: error.code === "23505" ? "exists" : "db" }, { status: error.code === "23505" ? 409 : 500 });
  }
  return NextResponse.json({ ok: true, points: pts.story });
}