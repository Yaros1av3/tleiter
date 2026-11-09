import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: season } = await sb
    .from("bc_seasons")
    .select("id, title_de, title_ru")
    .eq("status", "active")
    .maybeSingle();
  if (!season) return NextResponse.json({ season: null, rows: [] });

  const [partsRes, ptsRes, ranksRes] = await Promise.all([
    sb
      .from("bc_participants")
      .select("id, nickname, avatar_url")
      .eq("status", "active")
      .eq("hide_in_ranking", false),
    sb.from("bc_season_points").select("participant_id, points").eq("season_id", season.id),
    sb.from("bc_ranks").select("min_points, name_de, name_ru").order("min_points"),
  ]);

  const pts = new Map<number, number>(
    (ptsRes.data ?? []).map((r) => [r.participant_id as number, r.points as number]),
  );
  const ranks = ranksRes.data ?? [];
  const rankName = (points: number) => {
    const r = [...ranks].reverse().find((x) => points >= x.min_points) ?? ranks[0];
    return r ? (p.lang === "ru" ? r.name_ru : r.name_de) : "";
  };

  const sorted = (partsRes.data ?? [])
    .map((x) => ({ ...x, points: pts.get(x.id) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname));

  let pos = 0;
  let prev = -1;
  const rows = sorted.map((x, i) => {
    if (x.points !== prev) {
      pos = i + 1;
      prev = x.points;
    }
    return {
      id: x.id,
      nickname: x.nickname,
      avatar_url: x.avatar_url,
      points: x.points,
      position: pos,
      rank: rankName(x.points),
      me: x.id === p.id,
    };
  });

  return NextResponse.json({
    season: { id: season.id, title: p.lang === "ru" ? season.title_ru : season.title_de },
    rows: rows.slice(0, 300),
  });
}