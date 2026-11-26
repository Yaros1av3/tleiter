import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";
import { berlinToday } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Вошедший подросток отмечает, что придёт на урок (или снимает отметку) */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { entry_id?: number; going?: boolean } | null;
  const entryId = Number(body?.entry_id);

  if (!body || !entryId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = getSupabaseAdmin();

  const { data: entry } = await sb
    .from("schedule_entries")
    .select("id, schedule_date, entry_type")
    .eq("id", entryId)
    .maybeSingle();

  if (!entry || entry.entry_type !== "lesson" || (entry.schedule_date as string) < berlinToday()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // все существующие отметки этого подростка на урок (по привязке и по имени)
  const { data: rows } = await sb
    .from("lesson_rsvp")
    .select("id, first_name, last_name, teen_id")
    .eq("schedule_entry_id", entryId);

  const mine = (rows ?? []).filter(
    (row) =>
      (p.teen_id && row.teen_id === p.teen_id) ||
      (String(row.first_name).toLowerCase() === p.first_name.toLowerCase() &&
        String(row.last_name).toLowerCase() === p.last_name.toLowerCase()),
  );

  if (body.going === false) {
    if (mine.length > 0) {
      await sb
        .from("lesson_rsvp")
        .delete()
        .in("id", mine.map((row) => row.id as number));
    }
    return NextResponse.json({ ok: true, going: false });
  }

  if (mine.length > 0) return NextResponse.json({ ok: true, going: true });

  if ((rows ?? []).length >= 300) return NextResponse.json({ error: "full" }, { status: 409 });

  const { error } = await sb.from("lesson_rsvp").insert({
    schedule_entry_id: entryId,
    first_name: p.first_name,
    last_name: p.last_name,
    teen_id: p.teen_id,
  });

  if (error && error.code !== "23505") {
    console.error("teens going insert error:", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, going: true });
}