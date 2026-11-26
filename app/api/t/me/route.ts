import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";
import { berlinToday } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

/*
 * Данные подростка для приложения /t: кто он, на какие уроки отмечен,
 * какие уроки его служения уже проходили (для серии подряд).
 */
export async function GET(request: NextRequest) {
  try {
    const p = await getParticipant();
    if (!p) return NextResponse.json({ participant: null }, { headers: { "Cache-Control": "no-store" } });

    const service = request.nextUrl.searchParams.get("service") === "12:30" ? "12:30" : "10:00";
    const sb = getSupabaseAdmin();
    const today = berlinToday();

    const from = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);

    // все уроки этого служения за последний год
    const { data: lessons } = await sb
      .from("schedule_entries")
      .select("id, schedule_date")
      .eq("entry_type", "lesson")
      .eq("service_time", service)
      .gte("schedule_date", from)
      .order("schedule_date", { ascending: true })
      .limit(500);

    // отметки подростка: по привязке к базе и по имени (для старых отметок без привязки)
    const rsvpIds = new Set<number>();

    if (p.teen_id) {
      const { data } = await sb.from("lesson_rsvp").select("schedule_entry_id").eq("teen_id", p.teen_id);
      for (const row of data ?? []) rsvpIds.add(row.schedule_entry_id as number);
    }

    const { data: byName } = await sb
      .from("lesson_rsvp")
      .select("schedule_entry_id")
      .is("teen_id", null)
      .ilike("first_name", escapeLike(p.first_name))
      .ilike("last_name", escapeLike(p.last_name));
    for (const row of byName ?? []) rsvpIds.add(row.schedule_entry_id as number);

    let attended: string[] = [];
    const going: number[] = [];

    if (rsvpIds.size > 0) {
      const { data: entries } = await sb
        .from("schedule_entries")
        .select("id, schedule_date, entry_type")
        .in("id", Array.from(rsvpIds));

      for (const entry of entries ?? []) {
        if (entry.entry_type !== "lesson") continue;
        attended.push(entry.schedule_date as string);
        if ((entry.schedule_date as string) >= today) going.push(entry.id as number);
      }
      attended = Array.from(new Set(attended)).sort();
    }

    return NextResponse.json(
      {
        participant: {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          nickname: p.nickname,
          lang: p.lang,
          avatar_url: p.avatar_url,
        },
        lessonDates: (lessons ?? []).map((l) => l.schedule_date as string).filter((d) => d <= today),
        attended,
        going,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("teens me error:", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}