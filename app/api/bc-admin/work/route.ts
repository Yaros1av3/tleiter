import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaff } from "@/lib/bcStaff";
import { berlinTodayStr, missedOf } from "@/lib/bcProgress";

export const dynamic = "force-dynamic";

type Sb = ReturnType<typeof getSupabaseAdmin>;

/* Какие подростки доступны: админу все (null), служителю только свои */
async function scopeIds(sb: Sb, staff: { isAdmin: boolean; memberId: number | null }) {
  if (staff.isAdmin) return null;
  if (!staff.memberId) return [];
  const { data } = await sb.from("bc_participants").select("id").eq("mentor_id", staff.memberId);
  return (data ?? []).map((r) => r.id as number);
}

async function seasonOf(sb: Sb, raw: string | null) {
  const wanted = Number(raw);
  if (wanted) {
    const { data } = await sb.from("bc_seasons").select("id, title_de, title_ru, status").eq("id", wanted).maybeSingle();
    if (data) return data;
  }
  const { data } = await sb
    .from("bc_seasons")
    .select("id, title_de, title_ru, status")
    .eq("status", "active")
    .maybeSingle();
  return data;
}

export async function GET(req: Request) {
  const staff = await getStaff(req);
  if (!staff) return NextResponse.json({ error: "auth" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const url = new URL(req.url);
  const view = url.searchParams.get("view");
  const ids = await scopeIds(sb, staff);
  if (ids && ids.length === 0) return NextResponse.json({ items: [], gifts: [], stats: null });

  /* ---- проверка ответов ---- */
  if (view === "review") {
    const season = await seasonOf(sb, url.searchParams.get("season"));
    if (!season) return NextResponse.json({ items: [] });
    const done = url.searchParams.get("status") === "done";
    let q = sb
      .from("bc_submissions")
      .select(
        "id, answer_text, photo_path, submitted_at, is_late, points_photo, points_time, points_quality, status, admin_comment, bc_tasks!inner(day_number, title_de, title_ru, season_id), bc_participants!inner(nickname, first_name, last_name)",
      )
      .eq("bc_tasks.season_id", season.id);
    q = done ? q.in("status", ["accepted", "rejected"]) : q.eq("status", "pending");
    if (ids) q = q.in("participant_id", ids);
    const { data } = await q.order(done ? "graded_at" : "submitted_at", { ascending: !done }).limit(80);

    const items = [];
    for (const s of data ?? []) {
      const row = s as unknown as {
        photo_path: string | null;
        bc_tasks: { day_number: number; title_de: string; title_ru: string };
        bc_participants: { nickname: string; first_name: string; last_name: string };
      } & Record<string, unknown>;
      let photo_url: string | null = null;
      if (row.photo_path) {
        const signed = await sb.storage.from("bc-photos").createSignedUrl(row.photo_path, 3600);
        photo_url = signed.data?.signedUrl ?? null;
      }
      const { photo_path: _p, ...rest } = row;
      void _p;
      items.push({ ...rest, photo_url });
    }
    return NextResponse.json({ items });
  }

  /* ---- подарки ---- */
  if (view === "gifts") {
    await sb.rpc("bc_expire_gifts");
    let q = sb
      .from("bc_gifts")
      .select(
        "id, status, opened_at, expires_at, gift_link, submitted_at, given_at, bc_participants!inner(nickname, first_name, last_name, mentor_id)",
      );
    if (ids) q = q.in("participant_id", ids);
    const { data } = await q.order("opened_at", { ascending: false }).limit(200);
    return NextResponse.json({ gifts: data ?? [] });
  }

  /* ---- статистика ---- */
  if (view === "stats") {
    const season = await seasonOf(sb, url.searchParams.get("season"));
    if (!season) return NextResponse.json({ stats: null });

    let pq = sb
      .from("bc_participants")
      .select("id, nickname, first_name, last_name, status, teen_id")
      .eq("status", "active");
    if (ids) pq = pq.in("id", ids);
    const [partsRes, tasksRes] = await Promise.all([
      pq,
      sb
        .from("bc_tasks")
        .select("id, day_number, task_date")
        .eq("season_id", season.id)
        .eq("is_published", true)
        .order("day_number"),
    ]);
    const parts = partsRes.data ?? [];
    const tasks = tasksRes.data ?? [];
    const taskIds = tasks.map((t) => t.id as number);

    let subs: { participant_id: number; task_id: number; status: string }[] = [];
    if (taskIds.length) {
      let sq = sb.from("bc_submissions").select("participant_id, task_id, status").in("task_id", taskIds);
      if (ids) sq = sq.in("participant_id", ids);
      subs = ((await sq).data ?? []) as typeof subs;
    }
    const { data: ptsRows } = await sb
      .from("bc_season_points")
      .select("participant_id, points, days_done")
      .eq("season_id", season.id);
    const pts = new Map((ptsRows ?? []).map((r) => [r.participant_id as number, r]));
    const allowed = new Set(parts.map((p) => p.id as number));

    const perDay = tasks.map((t) => ({
      day: t.day_number as number,
      count: subs.filter((s) => s.task_id === t.id).length,
    }));
    const people = parts.map((p) => ({
      id: p.id as number,
      nickname: p.nickname as string,
      name: `${p.first_name} ${p.last_name}`.trim(),
      points: (pts.get(p.id as number)?.points as number | undefined) ?? 0,
      days: (pts.get(p.id as number)?.days_done as number | undefined) ?? 0,
    }));
    const top = [...people].sort((a, b) => b.points - a.points).slice(0, 10);
    const silent = people.filter((p) => p.days === 0).sort((a, b) => a.name.localeCompare(b.name));
    const total = people.reduce((n, p) => n + p.points, 0);
    void allowed;

    /* кто пропал: 2 и больше последних дней подряд без ответа (только в идущем сезоне) */
    type Quiet = { id: number; nickname: string; name: string; missed: number; last: string | null; whatsapp: string | null };
    let quiet: Quiet[] = [];
    if ((season as { status?: string }).status === "active") {
      const today = berlinTodayStr();
      const taskList = tasks as { id: number; task_date: string }[];
      const dateOf = new Map(taskList.map((t) => [t.id, t.task_date]));
      const subsBy = new Map<number, Set<number>>();
      for (const sRow of subs) {
        const set = subsBy.get(sRow.participant_id) ?? new Set<number>();
        set.add(sRow.task_id);
        subsBy.set(sRow.participant_id, set);
      }
      const teenIds = parts.map((p) => p.teen_id as number | null).filter((v): v is number => !!v);
      const { data: teenRows } = teenIds.length
        ? await sb.from("teens").select("id, phone").in("id", teenIds)
        : { data: [] };
      const phoneOf = new Map((teenRows ?? []).map((t) => [t.id as number, (t.phone as string | null) ?? null]));
      const wa = (phone: string | null) => {
        if (!phone) return null;
        const trimmed = phone.trim();
        const digits = trimmed.replace(/\D/g, "");
        if (digits.length < 7) return null;
        let intl = digits;
        if (trimmed.startsWith("+")) intl = digits;
        else if (digits.startsWith("00")) intl = digits.slice(2);
        else if (digits.startsWith("0")) intl = `49${digits.slice(1)}`;
        return `https://wa.me/${intl}`;
      };
      quiet = parts
        .map((p) => {
          const mine = subsBy.get(p.id as number) ?? new Set<number>();
          const dates = Array.from(mine).map((id) => dateOf.get(id) ?? "").filter(Boolean).sort();
          return {
            id: p.id as number,
            nickname: p.nickname as string,
            name: `${p.first_name} ${p.last_name}`.trim(),
            missed: missedOf(taskList, mine, today),
            last: dates.length ? dates[dates.length - 1] : null,
            whatsapp: wa(p.teen_id ? phoneOf.get(p.teen_id as number) ?? null : null),
          };
        })
        .filter((q) => q.missed >= 2)
        .sort((a, b) => b.missed - a.missed || a.name.localeCompare(b.name));
    }

    return NextResponse.json({
      stats: {
        participants: people.length,
        submissions: subs.length,
        pending: subs.filter((s) => s.status === "pending").length,
        avgPoints: people.length ? Math.round(total / people.length) : 0,
        publishedDays: tasks.length,
        perDay,
        top,
        silent,
        quiet,
      },
    });
  }

  return NextResponse.json({ error: "bad" }, { status: 400 });
}

export async function POST(req: Request) {
  const staff = await getStaff(req);
  if (!staff) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "bad" }, { status: 400 });
  const sb = getSupabaseAdmin();
  const action = String(body.action);

  const canTouch = async (participantId: number) => {
    if (staff.isAdmin) return true;
    const { data } = await sb.from("bc_participants").select("mentor_id").eq("id", participantId).maybeSingle();
    return !!data && data.mentor_id === staff.memberId;
  };

  /* принять ответ с оценкой качества / отправить на доработку */
  if (action === "submission_grade" || action === "submission_reject") {
    const { data: sub } = await sb
      .from("bc_submissions")
      .select("id, participant_id")
      .eq("id", Number(body.id))
      .maybeSingle();
    if (!sub) return NextResponse.json({ error: "notfound" }, { status: 404 });
    if (!(await canTouch(sub.participant_id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) : "";
    const patch: Record<string, unknown> = {
      admin_comment: comment || null,
      graded_by: staff.userId,
      graded_at: new Date().toISOString(),
    };
    if (action === "submission_grade") {
      const { data: cfg } = await sb.from("bc_settings").select("value").eq("key", "pts_quality_max").maybeSingle();
      const max = Number(cfg?.value ?? 10);
      const q = Math.round(Number(body.quality));
      if (!Number.isFinite(q) || q < 0 || q > max) return NextResponse.json({ error: "bad" }, { status: 400 });
      patch.points_quality = q;
      patch.status = "accepted";
    } else {
      if (!comment) return NextResponse.json({ error: "comment" }, { status: 400 });
      patch.points_quality = null;
      patch.status = "rejected";
    }
    const { error } = await sb.from("bc_submissions").update(patch).eq("id", sub.id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* подарок выдан */
  if (action === "gift_given") {
    const { data: g } = await sb.from("bc_gifts").select("id, participant_id").eq("id", Number(body.id)).maybeSingle();
    if (!g) return NextResponse.json({ error: "notfound" }, { status: 404 });
    if (!(await canTouch(g.participant_id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { error } = await sb
      .from("bc_gifts")
      .update({ status: "given", given_at: new Date().toISOString() })
      .eq("id", g.id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* открыть окно подарка заново на новый срок */
  if (action === "gift_reopen") {
    const { data: g } = await sb.from("bc_gifts").select("id, participant_id").eq("id", Number(body.id)).maybeSingle();
    if (!g) return NextResponse.json({ error: "notfound" }, { status: 404 });
    if (!(await canTouch(g.participant_id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { data: cfg } = await sb.from("bc_settings").select("value").eq("key", "gift_days").maybeSingle();
    const days = Number(cfg?.value ?? 7);
    const { error } = await sb
      .from("bc_gifts")
      .update({
        status: "open",
        expires_at: new Date(Date.now() + days * 86400000).toISOString(),
        gift_link: null,
        submitted_at: null,
      })
      .eq("id", g.id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* завершить сезон: статус + награды (только админ) */
  if (action === "season_finish") {
    if (!staff.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { error } = await sb.rpc("bc_finish_season", { p_season: Number(body.id) });
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown" }, { status: 400 });
}