import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";

export const dynamic = "force-dynamic";

/* Публичный профиль подростка: ник, аватар, ранг, награды. ?id=число или ?id=me */
export async function GET(req: Request) {
  const me = await getParticipant();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });

  const raw = new URL(req.url).searchParams.get("id");
  const id = raw === "me" ? me.id : Number(raw);
  if (!id) return NextResponse.json({ error: "bad" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: target } = await sb
    .from("bc_participants")
    .select("id, nickname, avatar_url, status, hide_in_ranking")
    .eq("id", id)
    .maybeSingle();
  if (!target || target.status !== "active" || (target.hide_in_ranking && target.id !== me.id))
    return NextResponse.json({ error: "notfound" }, { status: 404 });

  const [seasonRes, awardsRes, ranksRes] = await Promise.all([
    sb.from("bc_seasons").select("id").eq("status", "active").maybeSingle(),
    sb
      .from("bc_awards")
      .select("kind, awarded_at, bc_seasons(year, number)")
      .eq("participant_id", id)
      .order("awarded_at", { ascending: false }),
    sb.from("bc_ranks").select("min_points, name_de, name_ru").order("min_points"),
  ]);

  let points = 0;
  let daysDone = 0;
  if (seasonRes.data) {
    const { data } = await sb
      .from("bc_season_points")
      .select("points, days_done")
      .eq("participant_id", id)
      .eq("season_id", seasonRes.data.id)
      .maybeSingle();
    points = data?.points ?? 0;
    daysDone = data?.days_done ?? 0;
  }

  const ranks = ranksRes.data ?? [];
  const r = [...ranks].reverse().find((x) => points >= x.min_points) ?? ranks[0];

  const awards = (awardsRes.data ?? []).map((a) => {
    const s = (a as unknown as { bc_seasons?: { year: number; number: number } | null }).bc_seasons;
    return { kind: a.kind as string, season: s ? `${s.year} · ${s.number}` : "" };
  });

  return NextResponse.json({
    player: {
      id: target.id,
      nickname: target.nickname,
      avatar_url: target.avatar_url,
      points,
      daysDone,
      rank: r ? (me.lang === "ru" ? r.name_ru : r.name_de) : "",
      awards,
    },
  });
}