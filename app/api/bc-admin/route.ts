import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { berlinToUtc, getStaff } from "@/lib/bcStaff";
import { hashPassword } from "@/lib/bcAuth";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const str = (v: unknown, max = 4000) => (typeof v === "string" ? v.trim().slice(0, max) : "");

type Sb = ReturnType<typeof getSupabaseAdmin>;

/* удалить файлы из хранилища пачками */
async function removeFiles(sb: Sb, bucket: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    await sb.storage.from(bucket).remove(paths.slice(i, i + 100));
  }
}

async function photoPathsOfTasks(sb: Sb, taskIds: number[]) {
  if (!taskIds.length) return [];
  const { data } = await sb
    .from("bc_submissions")
    .select("photo_path")
    .in("task_id", taskIds)
    .not("photo_path", "is", null);
  return (data ?? []).map((r) => r.photo_path as string);
}

/* Обзор для админ-панели: сезоны, задания, участники, команда */
export async function GET(req: Request) {
  const staff = await getStaff(req);
  if (!staff) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: seasons } = await sb
    .from("bc_seasons")
    .select("*")
    .order("year", { ascending: false })
    .order("number", { ascending: false });

  const wanted = Number(new URL(req.url).searchParams.get("season"));
  const season =
    (seasons ?? []).find((s) => s.id === wanted) ??
    (seasons ?? []).find((s) => s.status === "active") ??
    (seasons ?? [])[0] ??
    null;

  let partQuery = sb
    .from("bc_participants")
    .select(
      "id, first_name, last_name, nickname, avatar_url, mentor_id, status, hide_in_ranking, is_guest, teen_id, created_at",
    )
    .order("nickname");
  if (!staff.isAdmin) {
    if (!staff.memberId) return NextResponse.json({ me: staff, seasons: seasons ?? [], season, tasks: [], participants: [], team: [] });
    partQuery = partQuery.eq("mentor_id", staff.memberId);
  }

  const [tasksRes, partsRes, teamRes, ptsRes] = await Promise.all([
    season
      ? sb.from("bc_tasks").select("*").eq("season_id", season.id).order("day_number")
      : Promise.resolve({ data: [] }),
    partQuery,
    sb.from("team_members").select("id, first_name, last_name, user_id").order("first_name"),
    season
      ? sb.from("bc_season_points").select("participant_id, points, days_done").eq("season_id", season.id)
      : Promise.resolve({ data: [] }),
  ]);

  /* сколько ответов ждут проверки (для значка на вкладке) */
  let pending = 0;
  if (season) {
    let pq = sb
      .from("bc_submissions")
      .select("id, bc_tasks!inner(season_id)", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("bc_tasks.season_id", season.id);
    if (!staff.isAdmin) pq = pq.in("participant_id", (partsRes.data ?? []).map((p) => p.id as number));
    pending = (await pq).count ?? 0;
  }

  const pts = new Map(
    ((ptsRes.data ?? []) as { participant_id: number; points: number; days_done: number }[]).map((r) => [
      r.participant_id,
      r,
    ]),
  );

  return NextResponse.json({
    me: { isAdmin: staff.isAdmin, memberId: staff.memberId },
    seasons: seasons ?? [],
    season,
    pending,
    tasks: tasksRes.data ?? [],
    participants: (partsRes.data ?? []).map((p) => ({
      ...p,
      points: pts.get(p.id)?.points ?? 0,
      days_done: pts.get(p.id)?.days_done ?? 0,
    })),
    team: (teamRes.data ?? []).map((m) => ({
      id: m.id,
      name: `${m.first_name} ${m.last_name}`.trim(),
      has_account: Boolean(m.user_id),
    })),
  });
}

export async function POST(req: Request) {
  const staff = await getStaff(req);
  if (!staff) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "bad" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const action = String(body.action);

  /* сброс пароля: админ или ответственный служитель этого подростка */
  if (action === "participant_reset_password") {
    const { data: p } = await sb
      .from("bc_participants")
      .select("id, mentor_id")
      .eq("id", Number(body.id))
      .maybeSingle();
    if (!p) return NextResponse.json({ error: "notfound" }, { status: 404 });
    if (!staff.isAdmin && p.mentor_id !== staff.memberId)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
    const password = Array.from(crypto.randomBytes(8))
      .map((b) => alphabet[b % alphabet.length])
      .join("");
    const { error } = await sb
      .from("bc_participants")
      .update({ password_hash: hashPassword(password) })
      .eq("id", p.id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true, password });
  }

  if (!staff.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (action === "season_save") {
    const row = {
      year: Number(body.year),
      number: Number(body.number) || 1,
      title_de: str(body.title_de, 120),
      title_ru: str(body.title_ru, 120),
      start_date: str(body.start_date, 10) || null,
      end_date: str(body.end_date, 10) || null,
    };
    if (!row.year || !row.title_de || !row.title_ru) return NextResponse.json({ error: "empty" }, { status: 400 });
    const q = body.id
      ? sb.from("bc_seasons").update(row).eq("id", Number(body.id)).select("id").single()
      : sb.from("bc_seasons").insert(row).select("id").single();
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.code === "23505" ? "season_exists" : "db" }, { status: 400 });
    return NextResponse.json({ ok: true, id: data.id });
  }

  if (action === "season_status") {
    const id = Number(body.id);
    const status = body.status === "active" ? "active" : "draft";
    if (status === "active") {
      await sb.from("bc_seasons").update({ status: "draft" }).eq("status", "active").neq("id", id);
    }
    const { error } = await sb.from("bc_seasons").update({ status }).eq("id", id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "task_save") {
    const row = {
      season_id: Number(body.season_id),
      day_number: Number(body.day_number),
      task_date: str(body.task_date, 10),
      deadline: str(body.deadline, 40),
      bible_ref: str(body.bible_ref, 120) || null,
      title_de: str(body.title_de, 160),
      title_ru: str(body.title_ru, 160),
      text_de: str(body.text_de) || null,
      text_ru: str(body.text_ru) || null,
      is_published: Boolean(body.is_published),
    };
    if (!row.season_id || !row.day_number || !row.task_date || !row.deadline || !row.title_de || !row.title_ru)
      return NextResponse.json({ error: "empty" }, { status: 400 });
    const q = body.id
      ? sb.from("bc_tasks").update(row).eq("id", Number(body.id))
      : sb.from("bc_tasks").insert(row);
    const { error } = await q;
    if (error) return NextResponse.json({ error: error.code === "23505" ? "day_exists" : "db" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "task_publish") {
    const { error } = await sb
      .from("bc_tasks")
      .update({ is_published: Boolean(body.value) })
      .eq("id", Number(body.id));
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "task_delete") {
    const id = Number(body.id);
    const { count } = await sb
      .from("bc_submissions")
      .select("id", { count: "exact", head: true })
      .eq("task_id", id);
    if ((count ?? 0) > 0) return NextResponse.json({ error: "has_submissions" }, { status: 409 });
    const { error } = await sb.from("bc_tasks").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* пустые задания на все дни сезона (потом их заполняют) */
  if (action === "tasks_generate") {
    const { data: s } = await sb
      .from("bc_seasons")
      .select("id, start_date, end_date")
      .eq("id", Number(body.season_id))
      .maybeSingle();
    if (!s?.start_date || !s?.end_date) return NextResponse.json({ error: "no_dates" }, { status: 400 });
    const { data: have } = await sb.from("bc_tasks").select("day_number").eq("season_id", s.id);
    const taken = new Set((have ?? []).map((t) => t.day_number as number));
    const rows = [];
    const start = new Date(`${s.start_date}T12:00:00Z`);
    for (let i = 0; i < 62; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const date = d.toISOString().slice(0, 10);
      if (date > s.end_date) break;
      if (taken.has(i + 1)) continue;
      rows.push({
        season_id: s.id,
        day_number: i + 1,
        task_date: date,
        deadline: berlinToUtc(date, 23, 59),
        title_de: `Tag ${i + 1}`,
        title_ru: `День ${i + 1}`,
        is_published: false,
      });
    }
    if (!rows.length) return NextResponse.json({ ok: true, created: 0 });
    const { error } = await sb.from("bc_tasks").insert(rows);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true, created: rows.length });
  }

  if (action === "participant_update") {
    const patch: Record<string, unknown> = {};
    if ("mentor_id" in body) patch.mentor_id = body.mentor_id ? Number(body.mentor_id) : null;
    if ("hide_in_ranking" in body) patch.hide_in_ranking = Boolean(body.hide_in_ranking);
    if (body.status === "active" || body.status === "blocked") patch.status = body.status;
    if (!Object.keys(patch).length) return NextResponse.json({ ok: true });
    const { error } = await sb.from("bc_participants").update(patch).eq("id", Number(body.id));
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* ---- удаление и распределение ---- */

  if (action === "season_delete") {
    const id = Number(body.id);
    const { data: tasks } = await sb.from("bc_tasks").select("id").eq("season_id", id);
    const taskIds = (tasks ?? []).map((t) => t.id as number);
    await removeFiles(sb, "bc-photos", await photoPathsOfTasks(sb, taskIds));
    const { error } = await sb.from("bc_seasons").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "tasks_bulk") {
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(Number).filter(Boolean) as number[];
    if (!ids.length) return NextResponse.json({ ok: true, changed: 0 });
    const op = String(body.op);

    if (op === "publish" || op === "hide") {
      const { error } = await sb.from("bc_tasks").update({ is_published: op === "publish" }).in("id", ids);
      if (error) return NextResponse.json({ error: "db" }, { status: 500 });
      return NextResponse.json({ ok: true, changed: ids.length });
    }

    if (op === "delete") {
      const force = Boolean(body.force);
      const { data: withSubs } = await sb.from("bc_submissions").select("task_id").in("task_id", ids);
      const blocked = new Set((withSubs ?? []).map((r) => r.task_id as number));
      const target = force ? ids : ids.filter((i) => !blocked.has(i));
      if (force) await removeFiles(sb, "bc-photos", await photoPathsOfTasks(sb, target));
      if (target.length) {
        const { error } = await sb.from("bc_tasks").delete().in("id", target);
        if (error) return NextResponse.json({ error: "db" }, { status: 500 });
      }
      const skippedIds = force ? [] : ids.filter((i) => blocked.has(i));
      return NextResponse.json({ ok: true, deleted: target.length, skippedIds });
    }
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }

  if (action === "participants_assign") {
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(Number).filter(Boolean) as number[];
    if (!ids.length) return NextResponse.json({ ok: true, changed: 0 });
    const mentor = body.mentor_id ? Number(body.mentor_id) : null;
    const { error } = await sb.from("bc_participants").update({ mentor_id: mentor }).in("id", ids);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true, changed: ids.length });
  }

  /* поровну между выбранными служителями: каждого следующего получает тот, у кого сейчас меньше всего */
  if (action === "participants_distribute") {
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(Number).filter(Boolean) as number[];
    const mentors = (Array.isArray(body.mentor_ids) ? body.mentor_ids : []).map(Number).filter(Boolean) as number[];
    if (!ids.length || !mentors.length) return NextResponse.json({ error: "empty" }, { status: 400 });

    const { data: all } = await sb.from("bc_participants").select("id, mentor_id");
    const idSet = new Set(ids);
    const load = new Map<number, number>(mentors.map((m) => [m, 0]));
    for (const p of all ?? []) {
      if (!idSet.has(p.id as number) && p.mentor_id && load.has(p.mentor_id as number)) {
        load.set(p.mentor_id as number, (load.get(p.mentor_id as number) ?? 0) + 1);
      }
    }
    const groups = new Map<number, number[]>(mentors.map((m) => [m, []]));
    for (const id of ids) {
      let best = mentors[0];
      for (const m of mentors) if ((load.get(m) ?? 0) < (load.get(best) ?? 0)) best = m;
      groups.get(best)!.push(id);
      load.set(best, (load.get(best) ?? 0) + 1);
    }
    for (const [m, list] of groups) {
      if (!list.length) continue;
      const { error } = await sb.from("bc_participants").update({ mentor_id: m }).in("id", list);
      if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, changed: ids.length });
  }

  if (action === "participant_delete") {
    const id = Number(body.id);
    const { data: p } = await sb.from("bc_participants").select("avatar_url").eq("id", id).maybeSingle();
    const { data: subs } = await sb
      .from("bc_submissions")
      .select("photo_path")
      .eq("participant_id", id)
      .not("photo_path", "is", null);
    await removeFiles(sb, "bc-photos", (subs ?? []).map((r) => r.photo_path as string));
    const avatar = p?.avatar_url?.split("/bc-avatars/")[1];
    if (avatar) await removeFiles(sb, "bc-avatars", [decodeURIComponent(avatar.split("?")[0])]);
    const { error } = await sb.from("bc_participants").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown" }, { status: 400 });
}