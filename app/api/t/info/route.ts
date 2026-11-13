import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { berlinToday } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Публичные данные для страницы подростков (/t): ближайший урок, кто служит,
 * ближайшие события. Отдаём только то, что нужно, без внутренних заметок.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const today = berlinToday();

    const { data: entries, error: entriesError } = await supabase
      .from("schedule_entries")
      .select("id, schedule_date, service_time, title_de, title_ru, bible_text, series, teen_title_de, teen_title_ru, teen_text_de, teen_text_ru")
      .eq("entry_type", "lesson")
      .gte("schedule_date", today)
      .order("schedule_date", { ascending: true })
      .order("service_time", { ascending: true })
      .limit(30);

    if (entriesError) {
      throw new Error(`schedule_entries: ${entriesError.message}`);
    }

    // для каждого служения (10:00 и 12:30) берём ближайший урок
    const firstByTime = new Map<string, string>();
    for (const entry of entries ?? []) {
      const key = String(entry.service_time);
      if (!firstByTime.has(key)) firstByTime.set(key, entry.schedule_date as string);
    }

    const lessonRows = (entries ?? []).filter(
      (entry) => firstByTime.get(String(entry.service_time)) === entry.schedule_date,
    );

    // записи типа «событие» (например, «подростки в зале»), которые идут РАНЬШЕ ближайшего урока:
    // подросток должен видеть, что в этот день урока нет и почему
    const { data: eventEntries, error: eventEntriesError } = await supabase
      .from("schedule_entries")
      .select("id, schedule_date, service_time, title_de, title_ru")
      .eq("entry_type", "event")
      .gte("schedule_date", today)
      .order("schedule_date", { ascending: true })
      .limit(30);

    if (eventEntriesError) {
      throw new Error(`schedule_entries events: ${eventEntriesError.message}`);
    }

    const noticeSeen = new Set<string>();
    const notices = (eventEntries ?? []).filter((entry) => {
      const key = String(entry.service_time);
      if (noticeSeen.has(key)) return false;
      const firstLesson = firstByTime.get(key);
      if (firstLesson && (entry.schedule_date as string) >= firstLesson) return false;
      noticeSeen.add(key);
      return true;
    });

    const ids = lessonRows.map((entry) => entry.id as number);

    const serving = new Map<number, string[]>();
    const going = new Map<number, number>();

    if (ids.length > 0) {
      const { data: links } = await supabase
        .from("schedule_entry_members")
        .select("schedule_entry_id, team_member_id")
        .in("schedule_entry_id", ids);

      const memberIds = Array.from(
        new Set((links ?? []).map((row) => row.team_member_id as number)),
      );

      const names = new Map<number, string>();

      if (memberIds.length > 0) {
        const { data: members } = await supabase
          .from("team_members")
          .select("id, first_name, last_name")
          .in("id", memberIds);

        for (const member of members ?? []) {
          names.set(
            member.id as number,
            `${String(member.first_name ?? "").trim()} ${String(member.last_name ?? "").trim()}`.trim(),
          );
        }
      }

      for (const link of links ?? []) {
        const name = names.get(link.team_member_id as number);
        if (!name) continue;
        const list = serving.get(link.schedule_entry_id as number) ?? [];
        list.push(name);
        serving.set(link.schedule_entry_id as number, list);
      }

      const { data: rsvps } = await supabase
        .from("lesson_rsvp")
        .select("schedule_entry_id")
        .in("schedule_entry_id", ids);

      for (const row of rsvps ?? []) {
        const key = row.schedule_entry_id as number;
        going.set(key, (going.get(key) ?? 0) + 1);
      }
    }

    const { data: events } = await supabase
      .from("events")
      .select("id, title, description, start_at, end_at, location, link_url")
      .eq("show_teens", true)
      .gte("end_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(8);

    return NextResponse.json(
      {
        lessons: lessonRows.map((entry) => ({
          id: entry.id,
          date: entry.schedule_date,
          time: entry.service_time,
          title_de: entry.title_de,
          title_ru: entry.title_ru,
          bible_text: entry.bible_text,
          series: entry.series,
          teen_title_de: entry.teen_title_de,
          teen_title_ru: entry.teen_title_ru,
          teen_text_de: entry.teen_text_de,
          teen_text_ru: entry.teen_text_ru,
          serving: serving.get(entry.id as number) ?? [],
          going: going.get(entry.id as number) ?? 0,
        })),
        notices: notices.map((entry) => ({
          id: entry.id,
          date: entry.schedule_date,
          time: entry.service_time,
          title_de: entry.title_de,
          title_ru: entry.title_ru,
        })),
        events: (events ?? []).map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          start_at: event.start_at,
          end_at: event.end_at,
          location: event.location,
          link_url: event.link_url,
          form: null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("teens info error:", error);

    // в разработке показываем причину, на сайте — нет
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? error.message
        : undefined;

    return NextResponse.json({ error: "server", detail }, { status: 500 });
  }
}