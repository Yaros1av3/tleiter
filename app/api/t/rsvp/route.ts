import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { berlinToday } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAME = /^\p{L}[\p{L}\s'.-]*$/u;

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

/* Подросток отмечает, что придёт на урок (или снимает отметку) */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    entry_id?: number;
    first_name?: string;
    last_name?: string;
    going?: boolean;
    website?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // бот: скрытое поле заполнено
  if (clean(body.website)) {
    return NextResponse.json({ ok: true });
  }

  const first = clean(body.first_name);
  const last = clean(body.last_name);
  const entryId = Number(body.entry_id);

  if (!entryId || !first || !last || !NAME.test(first) || !NAME.test(last)) {
    return NextResponse.json({ error: "name" }, { status: 422 });
  }

  const supabase = getSupabaseAdmin();

  const { data: entry } = await supabase
    .from("schedule_entries")
    .select("id, schedule_date, entry_type")
    .eq("id", entryId)
    .maybeSingle();

  if (!entry || entry.entry_type !== "lesson" || entry.schedule_date < berlinToday()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("lesson_rsvp")
    .select("id, first_name, last_name")
    .eq("schedule_entry_id", entryId);

  const same = (existing ?? []).filter(
    (row) =>
      String(row.first_name).toLowerCase() === first.toLowerCase() &&
      String(row.last_name).toLowerCase() === last.toLowerCase(),
  );

  if (body.going === false) {
    if (same.length > 0) {
      await supabase
        .from("lesson_rsvp")
        .delete()
        .in("id", same.map((row) => row.id as number));
    }

    return NextResponse.json({ ok: true, going: false });
  }

  if (same.length > 0) {
    return NextResponse.json({ ok: true, going: true });
  }

  if ((existing ?? []).length >= 300) {
    return NextResponse.json({ error: "full" }, { status: 409 });
  }

  // если по имени находится ровно один подросток из базы — привязываем
  let teenId: number | null = null;

  try {
    const { data: matches } = await supabase
      .from("teens")
      .select("id")
      .ilike("first_name", escapeLike(first))
      .ilike("last_name", escapeLike(last));

    if (matches && matches.length === 1) teenId = matches[0].id as number;
  } catch (error) {
    console.error("rsvp teen match error:", error);
  }

  const { error } = await supabase.from("lesson_rsvp").insert({
    schedule_entry_id: entryId,
    first_name: first,
    last_name: last,
    teen_id: teenId,
  });

  if (error && error.code !== "23505") {
    console.error("rsvp insert error:", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, going: true });
}