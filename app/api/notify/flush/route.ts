import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  configurePush,
  getAdminIds,
  getMutedIds,
  sendToUsers,
} from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * Рассылка автоматических уведомлений команде.
 * Вызывается раз в минуту из базы данных (pg_cron), только с секретом NOTIFY_SECRET.
 * Берёт события из очереди notify_queue, которые «успокоились» (45 секунд без новых),
 * и отправляет по одному сообщению на группу событий.
 */

type Json = Record<string, unknown>;
type QueueRow = {
  id: number;
  kind: string;
  group_key: string;
  actor: string | null;
  cnt: number;
  payload: Json;
};
const CATEGORY: Record<string, string> = {
  event: "event",
  event_upd: "event",
  idea: "idea",
  teen: "teen",
  trip: "trip",
  poll: "trip",
  material: "material",
  camp: "camp",
  camp_reg: "camp_reg",
  feedback: "feedback",
};

type Msg = {
  title: string;
  body: string;
  url: string;
  audience: "all" | "admins";
  respectMute?: boolean;
};

const TZ = "Europe/Berlin";

function str(v: unknown) {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

function pick(j: Json, keys: string[]) {
  for (const k of keys) {
    const v = str(j[k]);
    if (v) return v;
  }
  return "";
}

function cut(text: string, max = 90) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${date} ${time}`;
}

function fmtDate(date: string) {
  const [, m, d] = String(date).split("-");
  return m && d ? `${d}.${m}` : "";
}

function fmtTime(time: string) {
  return String(time).slice(0, 5).replace("13:00", "12:30");
}

async function build(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  row: QueueRow,
): Promise<Msg | null> {
  const p = row.payload;
  const n = row.cnt;

  switch (row.kind) {
    case "event": {
      const title = pick(p, ["title"]);
      const when = fmtDateTime(str(p.start_at));
      const place = pick(p, ["location"]);
      return {
        title: "TLight — новый термин",
        body:
          n > 1
            ? `${title}: серия из ${n} терминов, ближайший — ${when}`
            : [title, when, place].filter(Boolean).join(" · "),
        url: "/calendar",
        audience: "all",
      };
    }
    case "event_upd": {
      const title = pick(p, ["title"]);
      return {
        title: "TLight — термин изменён",
        body:
          n > 1
            ? `${title}: изменено терминов — ${n}`
            : [title, fmtDateTime(str(p.start_at))].filter(Boolean).join(" · "),
        url: "/calendar",
        audience: "all",
      };
    }
    case "idea":
      return {
        title: "TLight — новая идея",
        body: n > 1 ? `Новых идей: ${n}` : cut(pick(p, ["title", "text", "content", "idea", "body", "description"]) || "Откройте приложение"),
        url: "/",
        audience: "all",
        respectMute: true,
      };
    case "teen": {
      const name = `${pick(p, ["first_name"])} ${pick(p, ["last_name"])}`.trim();
      return {
        title: "TLight — новый подросток",
        body: n > 1 ? `Добавлено подростков: ${n}` : name || "Добавлен подросток",
        url: "/teens",
        audience: "all",
      };
    }
    case "trip":
      return {
        title: "TLight — новая поездка",
        body: n > 1 ? `Добавлено поездок: ${n}` : cut(pick(p, ["title", "name", "destination"]) || "Откройте раздел «Поездки»"),
        url: "/trips",
        audience: "all",
      };
    case "poll":
      return {
        title: "TLight — новое голосование",
        body: n > 1 ? `Новых голосований: ${n}` : cut(pick(p, ["question", "title", "name"]) || "Откройте раздел «Поездки»"),
        url: "/trips",
        audience: "all",
      };
    case "material":
      return {
        title: "TLight — новый материал",
        body: n > 1 ? `Добавлено материалов: ${n}` : cut(pick(p, ["title", "name"]) || "Откройте раздел «Материалы»"),
        url: "/materials",
        audience: "all",
      };
    case "camp":
      return {
        title: "TLight — новый лагерь",
        body: cut(pick(p, ["title", "name"]) || "Создан лагерь"),
        url: "/camps",
        audience: "all",
      };
    case "camp_reg": {
      const name = `${pick(p, ["first_name"])} ${pick(p, ["last_name"])}`.trim() || pick(p, ["name", "teen_name"]);
      return {
        title: "TLight — заявка в лагерь",
        body: n > 1 ? `Новых заявок: ${n}` : name || "Новая заявка",
        url: "/camps",
        audience: "admins",
      };
    }
    case "feedback":
      return {
        title: "TLight Teens — сообщение от подростка",
        body: n > 1 ? `Новых сообщений: ${n}` : cut(pick(p, ["message", "text", "body", "content"]) || "Новое сообщение"),
        url: "/teens",
        audience: "admins",
      };
    default:
      return null;
  }
}

/*
 * Расписание: пишем только тем, кого это касается.
 * - поставили на служение -> «тебя поставили»
 * - сняли -> «тебя сняли»
 * - перенесли дату/время -> тем, кто остался
 * Если ничего не изменилось (просто пересохранили карточку), уведомлений нет.
 */
async function handleSchedules(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  queue: QueueRow[],
  mutes: Map<string, Set<string>>,
  includeActor: boolean,
) {
  const rows = queue.filter((r) => r.kind === "sched" || r.kind === "sched_new");
  const eids = new Map<string, { isNew: boolean; actor: string | null }>();

  for (const r of rows) {
    const eid = str(r.payload.schedule_entry_id) || str(r.payload.id);
    if (!eid) continue;
    const prev = eids.get(eid);
    eids.set(eid, { isNew: (prev?.isNew ?? false) || r.kind === "sched_new", actor: r.actor ?? prev?.actor ?? null });
  }

  let total = 0;
  const muted = mutes.get("schedule") ?? new Set<string>();

  for (const [eid, info] of eids) {
    try {
      const [{ data: entry }, { data: links }, { data: state }] = await Promise.all([
        supabase.from("schedule_entries").select("*").eq("id", eid).maybeSingle(),
        supabase.from("schedule_entry_members").select("team_member_id").eq("schedule_entry_id", eid),
        supabase.from("notify_sched_state").select("*").eq("entry_id", eid).maybeSingle(),
      ]);

      if (!entry) {
        await supabase.from("notify_sched_state").delete().eq("entry_id", eid);
        continue;
      }

      const cur = (links ?? []).map((l) => Number(l.team_member_id));
      const sdate = str(entry.schedule_date);
      const stime = str(entry.service_time);
      const when = [fmtDate(sdate), fmtTime(stime)].filter(Boolean).join(" · ");

      const old: number[] = info.isNew || !state ? [] : ((state.members ?? []) as number[]).map(Number);
      const moved = !!state && !info.isNew && (state.sdate !== sdate || state.stime !== stime);

      await supabase
        .from("notify_sched_state")
        .upsert({ entry_id: eid, members: cur, sdate, stime });

      const added = cur.filter((id) => !old.includes(id));
      const removed = old.filter((id) => !cur.includes(id));
      const stayed = cur.filter((id) => old.includes(id));

      const allIds = Array.from(new Set([...cur, ...old]));
      if (allIds.length === 0) continue;

      const { data: members } = await supabase
        .from("team_members")
        .select("id, user_id, first_name, last_name")
        .in("id", allIds);

      const byId = new Map((members ?? []).map((m) => [Number(m.id), m]));
      const userOf = (id: number) => (byId.get(id)?.user_id as string | null) ?? null;
      const ok = (uid: string | null): uid is string =>
        !!uid && !muted.has(uid) && (includeActor || uid !== info.actor);

      const names = cur
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((m) => `${m!.first_name ?? ""} ${String(m!.last_name ?? "").slice(0, 1)}.`.trim());
      const who = names.length ? ` Служат: ${names.slice(0, 8).join(", ")}${names.length > 8 ? ` и ещё ${names.length - 8}` : ""}.` : "";

      const send = async (ids: number[], title: string, body: string) => {
        const users = ids.map(userOf).filter(ok);
        if (users.length === 0) return;
        total += await sendToUsers(supabase, users, {
          title,
          body,
          url: "/schedule",
          tag: `sched-${eid}`,
        });
      };

      await send(added, "TLight — ты в расписании", `${when}.${who}`);
      await send(removed, "TLight — тебя сняли со служения", when || "Служение изменилось");
      if (moved) await send(stayed, "TLight — служение перенесено", `Теперь: ${when}.`);
    } catch (err) {
      console.error("notify schedule error:", eid, err);
    }
  }

  return total;
}

export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFY_SECRET;
  const given = request.headers.get("x-notify-secret");

  if (!secret || !given || given !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!configurePush()) {
    return NextResponse.json({ error: "VAPID not configured" }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 45_000).toISOString();

  /* забираем «успокоившиеся» события (помечаем отправленными сразу, чтобы не слать дважды) */
  const { data: rows, error } = await supabase
    .from("notify_queue")
    .update({ sent_at: new Date().toISOString() })
    .is("sent_at", null)
    .lt("updated_at", cutoff)
    .select("id, kind, group_key, actor, cnt, payload")
    .limit(50);

  if (error) {
    console.error("notify flush error:", error);
    return NextResponse.json({ error: "queue" }, { status: 500 });
  }

  const queue = (rows ?? []) as QueueRow[];
  if (queue.length === 0) return NextResponse.json({ sent: 0 });

  const { data: subRows } = await supabase.from("push_subscriptions").select("user_id");
  const subscribed = Array.from(
    new Set((subRows ?? []).map((r) => r.user_id as string).filter(Boolean)),
  );

  /* гости лагеря не получают командные уведомления */
  const [{ data: accessRows }, { data: cardRows }] = await Promise.all([
    supabase.from("camp_access").select("user_id"),
    supabase.from("team_members").select("user_id").not("user_id", "is", null),
  ]);
  const withCard = new Set((cardRows ?? []).map((r) => r.user_id as string));
  const guestIds = new Set(
    (accessRows ?? []).map((r) => r.user_id as string).filter((id) => !withCard.has(id)),
  );

  const [admins, muted] = await Promise.all([getAdminIds(supabase), getMutedIds(supabase)]);
  const adminSet = new Set(admins);
  const includeActor = process.env.NOTIFY_INCLUDE_ACTOR === "1";

  const { data: muteRows } = await supabase.from("notify_mutes").select("user_id, category");
  const mutes = new Map<string, Set<string>>();
  for (const m of muteRows ?? []) {
    const c = String(m.category);
    if (!mutes.has(c)) mutes.set(c, new Set());
    mutes.get(c)!.add(String(m.user_id));
  }

  let total = (await handleSchedules(supabase, queue, mutes, includeActor)) ?? 0;

  for (const row of queue) {
    try {
      const msg = await build(supabase, row);
      if (!msg) continue;

      const recipients = subscribed.filter((id) => {
        if (guestIds.has(id)) return false;
        if (!includeActor && id === row.actor) return false;
        if (msg.audience === "admins" && !adminSet.has(id)) return false;
        if (msg.respectMute && muted.has(id)) return false;
        if (mutes.get(CATEGORY[row.kind] ?? "")?.has(id)) return false;
        return true;
      });

      total += await sendToUsers(supabase, recipients, {
        title: msg.title,
        body: msg.body,
        url: msg.url,
        tag: `evt-${row.kind}-${row.id}`,
      });
    } catch (err) {
      console.error("notify send error:", row.kind, err);
    }
  }

  return NextResponse.json({ sent: total, groups: queue.length });
}