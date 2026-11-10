import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";
import { berlinTodayStr, streakOf, type DayState } from "@/lib/bcProgress";

export const dynamic = "force-dynamic";

/* Прогресс сезона: серия дней подряд, сколько сдано, календарь */
export async function GET() {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: season } = await sb.from("bc_seasons").select("id").eq("status", "active").maybeSingle();
  if (!season) return NextResponse.json({ total: 0, done: 0, streak: 0, days: [] });

  const { data: tasks } = await sb
    .from("bc_tasks")
    .select("id, day_number, task_date")
    .eq("season_id", season.id)
    .eq("is_published", true)
    .order("task_date");
  const list = (tasks ?? []) as { id: number; day_number: number; task_date: string }[];
  const ids = list.map((t) => t.id);

  const { data: subs } = ids.length
    ? await sb.from("bc_submissions").select("task_id, status").eq("participant_id", p.id).in("task_id", ids)
    : { data: [] };
  const statusOf = new Map((subs ?? []).map((s) => [s.task_id as number, s.status as string]));
  const submitted = new Set(statusOf.keys());

  const today = berlinTodayStr();
  const days = list.map((t) => {
    const st = statusOf.get(t.id);
    let state: DayState;
    if (st === "rejected") state = "redo";
    else if (st) state = "done";
    else if (t.task_date < today) state = "missed";
    else if (t.task_date === today) state = "today";
    else state = "future";
    return { day: t.day_number, date: t.task_date, state };
  });

  return NextResponse.json({
    total: list.length,
    done: days.filter((d) => d.state === "done" || d.state === "redo").length,
    streak: streakOf(list, submitted, today),
    days,
  });
}