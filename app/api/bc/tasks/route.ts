import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";

export const dynamic = "force-dynamic";

const berlinToday = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

/* Задания сезона: только сегодняшнее и прошлые, с моими ответами */
export async function GET() {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: season } = await sb
    .from("bc_seasons")
    .select("id")
    .eq("status", "active")
    .maybeSingle();
  if (!season) return NextResponse.json({ tasks: [], totalDays: 0 });

  const today = berlinToday();
  const [tasksRes, totalRes, settingsRes] = await Promise.all([
    sb
      .from("bc_tasks")
      .select("id, day_number, task_date, deadline, bible_ref, title_de, title_ru, text_de, text_ru")
      .eq("season_id", season.id)
      .eq("is_published", true)
      .lte("task_date", today)
      .order("task_date", { ascending: false }),
    sb
      .from("bc_tasks")
      .select("id", { count: "exact", head: true })
      .eq("season_id", season.id)
      .eq("is_published", true),
    sb.from("bc_settings").select("key, value"),
  ]);

  const tasks = tasksRes.data ?? [];
  const ids = tasks.map((t) => t.id);
  const { data: subs } = ids.length
    ? await sb
        .from("bc_submissions")
        .select(
          "task_id, answer_text, photo_path, submitted_at, is_late, points_photo, points_time, points_quality, status, admin_comment",
        )
        .eq("participant_id", p.id)
        .in("task_id", ids)
    : { data: [] };

  const subMap = new Map<number, Record<string, unknown>>();
  for (const s of subs ?? []) {
    let photo_url: string | null = null;
    if (s.photo_path) {
      const signed = await sb.storage.from("bc-photos").createSignedUrl(s.photo_path, 3600);
      photo_url = signed.data?.signedUrl ?? null;
    }
    const { photo_path: _omit, ...rest } = s;
    void _omit;
    subMap.set(s.task_id, { ...rest, photo_url });
  }

  const cfg = Object.fromEntries((settingsRes.data ?? []).map((r) => [r.key, Number(r.value)]));
  const ru = p.lang === "ru";

  return NextResponse.json({
    totalDays: totalRes.count ?? 0,
    points: {
      photo: cfg.pts_photo ?? 5,
      onTime: cfg.pts_on_time ?? 10,
      late: cfg.pts_late ?? 5,
      quality: cfg.pts_quality_max ?? 10,
    },
    tasks: tasks.map((t) => ({
      id: t.id,
      day: t.day_number,
      date: t.task_date,
      deadline: t.deadline,
      ref: t.bible_ref,
      title: ru ? t.title_ru : t.title_de,
      text: ru ? t.text_ru : t.text_de,
      submission: subMap.get(t.id) ?? null,
    })),
  });
}