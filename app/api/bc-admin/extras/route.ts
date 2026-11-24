import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaff } from "@/lib/bcStaff";

export const dynamic = "force-dynamic";

type Sb = ReturnType<typeof getSupabaseAdmin>;

/* Админу доступны все подростки, служителю только свои подопечные */
async function scopeIds(sb: Sb, staff: { isAdmin: boolean; memberId: number | null }) {
  if (staff.isAdmin) return null;
  if (!staff.memberId) return [];
  const { data } = await sb.from("bc_participants").select("id").eq("mentor_id", staff.memberId);
  return (data ?? []).map((r) => r.id as number);
}

async function activeSeason(sb: Sb, raw: string | number | null) {
  const wanted = Number(raw);
  if (wanted) {
    const { data } = await sb.from("bc_seasons").select("id").eq("id", wanted).maybeSingle();
    if (data) return data as { id: number };
  }
  const { data } = await sb.from("bc_seasons").select("id").eq("status", "active").maybeSingle();
  return data as { id: number } | null;
}

/* Список подростков (для выбора) и последние доп. баллы сезона */
export async function GET(req: Request) {
  const staff = await getStaff(req);
  if (!staff) return NextResponse.json({ error: "auth" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const season = await activeSeason(sb, new URL(req.url).searchParams.get("season"));
  if (!season) return NextResponse.json({ people: [], items: [] });

  const ids = await scopeIds(sb, staff);
  if (ids && ids.length === 0) return NextResponse.json({ people: [], items: [] });

  let pq = sb.from("bc_participants").select("id, first_name, last_name, nickname").eq("status", "active").order("first_name");
  let eq = sb
    .from("bc_extras")
    .select("id, kind, day, channel, verse_ref, points, photo_path, participant_id, bc_participants!inner(first_name, last_name, nickname)")
    .eq("season_id", season.id)
    .order("created_at", { ascending: false })
    .limit(60);
  if (ids) {
    pq = pq.in("id", ids);
    eq = eq.in("participant_id", ids);
  }
  const [{ data: people }, { data: extras }] = await Promise.all([pq, eq]);

  const items = await Promise.all(
    (extras ?? []).map(async (e) => {
      let photo_url: string | null = null;
      if (e.photo_path) {
        const s = await sb.storage.from("bc-photos").createSignedUrl(e.photo_path as string, 3600);
        photo_url = s.data?.signedUrl ?? null;
      }
      const who = e.bc_participants as unknown as { first_name: string; last_name: string; nickname: string };
      return {
        id: e.id,
        kind: e.kind,
        day: e.day,
        channel: e.channel,
        verse_ref: e.verse_ref,
        points: e.points,
        photo_url,
        name: `${who.first_name} ${who.last_name}`.trim(),
        nickname: who.nickname,
      };
    }),
  );
  return NextResponse.json({ people: people ?? [], items });
}

export async function POST(req: Request) {
  const staff = await getStaff(req);
  if (!staff) return NextResponse.json({ error: "auth" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad" }, { status: 400 });
  const ids = await scopeIds(sb, staff);

  /* зачесть выученный стих */
  if (body.action === "verse_add") {
    const pid = Number(body.participant_id);
    const ref = String(body.verse_ref ?? "").trim().slice(0, 120);
    if (!pid || ref.length < 3) return NextResponse.json({ error: "bad" }, { status: 400 });
    if (ids && !ids.includes(pid)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const season = await activeSeason(sb, null);
    if (!season) return NextResponse.json({ error: "no_season" }, { status: 400 });
    const { data: cfg } = await sb.from("bc_settings").select("value").eq("key", "pts_verse").maybeSingle();
    const pts = Number(cfg?.value ?? 20);
    const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
    const { error } = await sb.from("bc_extras").insert({
      participant_id: pid,
      season_id: season.id,
      kind: "verse",
      day,
      verse_ref: ref,
      points: pts,
      created_by: staff.userId,
    });
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* убрать запись (ошибка или ненастоящий сторис) */
  if (body.action === "extra_delete") {
    const id = Number(body.id);
    const { data: row } = await sb.from("bc_extras").select("id, participant_id, photo_path").eq("id", id).maybeSingle();
    if (!row) return NextResponse.json({ error: "bad" }, { status: 404 });
    if (ids && !ids.includes(row.participant_id as number)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (row.photo_path) await sb.storage.from("bc-photos").remove([row.photo_path as string]);
    const { error } = await sb.from("bc_extras").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad" }, { status: 400 });
}