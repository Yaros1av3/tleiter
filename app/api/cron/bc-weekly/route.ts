import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { berlinTodayStr, streakOf } from "@/lib/bcProgress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Раз в неделю (понедельник, см. vercel.json) отправляем участникам Bibel-Challenge
 * личное напоминание: серия дней и сколько сдано. Только тем, кто включил уведомления
 * в своём профиле. Ручной тест: открыть этот адрес с заголовком Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: "VAPID keys are not configured" }, { status: 500 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@example.com", pub, priv);

  const sb = getSupabaseAdmin();
  const { data: season } = await sb.from("bc_seasons").select("id").eq("status", "active").maybeSingle();
  if (!season) return NextResponse.json({ sent: 0, note: "no active season" });

  const today = berlinTodayStr();
  const { data: tasksRaw } = await sb
    .from("bc_tasks")
    .select("id, task_date")
    .eq("season_id", season.id)
    .eq("is_published", true);
  const tasks = (tasksRaw ?? []) as { id: number; task_date: string }[];
  const total = tasks.length;
  if (tasks.filter((t) => t.task_date <= today).length === 0) return NextResponse.json({ sent: 0, note: "no tasks yet" });

  const { data: subs } = await sb
    .from("teen_push_subscriptions")
    .select("endpoint, p256dh, auth, lang, participant_id")
    .not("participant_id", "is", null);
  const list = subs ?? [];
  if (list.length === 0) return NextResponse.json({ sent: 0, note: "no subscribers" });

  const pids = Array.from(new Set(list.map((s) => s.participant_id as number)));
  const [{ data: parts }, { data: done }] = await Promise.all([
    sb.from("bc_participants").select("id, nickname, status").in("id", pids),
    sb.from("bc_submissions").select("participant_id, task_id").in("participant_id", pids).in("task_id", tasks.map((t) => t.id)),
  ]);
  const partById = new Map((parts ?? []).map((p) => [p.id as number, p]));
  const doneBy = new Map<number, Set<number>>();
  for (const s of done ?? []) {
    const set = doneBy.get(s.participant_id as number) ?? new Set<number>();
    set.add(s.task_id as number);
    doneBy.set(s.participant_id as number, set);
  }

  let sent = 0;
  const expired: string[] = [];

  for (const sub of list) {
    const part = partById.get(sub.participant_id as number);
    if (!part || part.status !== "active") continue;

    const submitted = doneBy.get(part.id as number) ?? new Set<number>();
    const streak = streakOf(tasks, submitted, today);
    const count = submitted.size;
    const ru = sub.lang === "ru";
    const nick = part.nickname as string;

    let body: string;
    if (streak >= 2) {
      body = ru
        ? `${nick}, у тебя серия ${streak} дн. подряд. Не прерывай её, новое задание ждёт.`
        : `${nick}, du bist seit ${streak} Tagen in Folge dabei. Unterbrich die Serie nicht, die neue Aufgabe wartet.`;
    } else if (count === 0) {
      body = ru
        ? `${nick}, новая неделя в Bibel-Challenge. Начни с сегодняшнего задания.`
        : `${nick}, neue Woche in der Bibel-Challenge. Starte mit der heutigen Aufgabe.`;
    } else {
      body = ru
        ? `${nick}, сдано ${count} из ${total}. Вернись и начни новую серию сегодня.`
        : `${nick}, ${count} von ${total} abgegeben. Komm zurück und starte heute eine neue Serie.`;
    }

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: "Bibel-Challenge", body, url: "/t/bc", tag: "bc-weekly" }),
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) expired.push(sub.endpoint);
      else console.error("bc weekly push error:", error);
    }
  }

  if (expired.length) await sb.from("teen_push_subscriptions").delete().in("endpoint", expired);
  return NextResponse.json({ sent, removedExpired: expired.length });
}