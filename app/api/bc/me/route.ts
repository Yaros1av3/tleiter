import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";

export const dynamic = "force-dynamic";

/* номер в международном формате; 0176... считаем немецким (+49) */
function whatsappLink(phone: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return null;
  let intl = digits;
  if (trimmed.startsWith("+")) intl = digits;
  else if (digits.startsWith("00")) intl = digits.slice(2);
  else if (digits.startsWith("0")) intl = `49${digits.slice(1)}`;
  return `https://wa.me/${intl}`;
}

export async function GET() {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ participant: null });

  const sb = getSupabaseAdmin();
  const [seasonRes, ranksRes] = await Promise.all([
    sb.from("bc_seasons").select("id, title_de, title_ru").eq("status", "active").maybeSingle(),
    sb.from("bc_ranks").select("min_points, name_de, name_ru").order("min_points"),
  ]);
  const season = seasonRes.data;

  /* ответственный служитель и ссылка на WhatsApp */
  let mentor: { name: string; whatsapp: string | null } | null = null;
  if (p.mentor_id) {
    const { data: mm } = await sb
      .from("team_members")
      .select("first_name, last_name, phone")
      .eq("id", p.mentor_id)
      .maybeSingle();
    if (mm) {
      mentor = {
        name: `${mm.first_name ?? ""} ${mm.last_name ?? ""}`.trim(),
        whatsapp: whatsappLink(mm.phone as string | null),
      };
    }
  }

  let points = 0;
  if (season) {
    const { data } = await sb
      .from("bc_season_points")
      .select("points")
      .eq("participant_id", p.id)
      .eq("season_id", season.id)
      .maybeSingle();
    points = data?.points ?? 0;
  }

  const ranks = (ranksRes.data ?? []).map((r) => ({
    min: r.min_points as number,
    name: p.lang === "ru" ? (r.name_ru as string) : (r.name_de as string),
  }));
  const current = [...ranks].reverse().find((r) => points >= r.min) ?? ranks[0] ?? null;
  const next = ranks.find((r) => r.min > points) ?? null;

  return NextResponse.json({
    participant: {
      id: p.id,
      nickname: p.nickname,
      first_name: p.first_name,
      last_name: p.last_name,
      lang: p.lang,
      avatar_url: p.avatar_url,
      is_guest: p.is_guest,
    },
    season: season
      ? { id: season.id, title: p.lang === "ru" ? season.title_ru : season.title_de }
      : null,
    mentor,
    points,
    rank: current,
    nextRank: next,
  });
}