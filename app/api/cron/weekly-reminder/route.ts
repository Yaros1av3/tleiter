import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Ежедневный запуск Vercel Cron (см. vercel.json): 14:00 и 15:00 UTC.
 * Отправляем только когда в Берлине 16:xx (два запуска нужны из-за перехода
 * на зимнее/летнее время).
 *
 * Что делает в 16:00 по Берлину:
 *  1) по вторникам — напоминает тем, кто стоит в плане на ближайшее воскресенье;
 *  2) за 13 дней до конца месяца — просит отметить, когда можно служить
 *     в следующем месяце (всем активным служителям с аккаунтом, кроме тех,
 *     кто «не служит», и тех, кто уже ответил на все воскресенья);
 *  3) за 5 дней до конца месяца — повторное напоминание тем, кто всё ещё не ответил.
 *
 * Ручной тест: ?force=1 (+ &only=weekly или &only=availability). Секрет нужен всегда.
 */

const REMINDER_TIMEZONE = "Europe/Berlin";
const REMINDER_HOUR = 16;
const WEEKLY_WEEKDAY = 2; // вторник

/* За сколько дней до конца месяца напоминать про «Когда могу служить» */
const AVAILABILITY_FIRST_DAYS_BEFORE_END = 13;
/* Повтор для не ответивших; поставь null, чтобы отключить */
const AVAILABILITY_REPEAT_DAYS_BEFORE_END: number | null = 5;

type SubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function getBerlinNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: REMINDER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function nextSundayFrom(year: number, month: number, day: number) {
  const base = new Date(Date.UTC(year, month - 1, day));
  const daysUntilSunday = (7 - base.getUTCDay()) % 7;
  base.setUTCDate(base.getUTCDate() + daysUntilSunday);

  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`;
}

function sundaysOfMonth(year: number, monthIndex: number) {
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const result: string[] = [];

  for (let day = 1; day <= days; day += 1) {
    if (new Date(Date.UTC(year, monthIndex, day)).getUTCDay() === 0) {
      result.push(`${year}-${pad(monthIndex + 1)}-${pad(day)}`);
    }
  }

  return result;
}

type Supabase = ReturnType<typeof getSupabaseAdmin>;

/* отправка одного и того же сообщения нескольким пользователям */
async function sendToUsers(
  supabase: Supabase,
  userIds: string[],
  payload: Record<string, string>,
  payloadFor?: (userId: string) => Record<string, string>,
) {
  if (userIds.length === 0) return { sent: 0, failed: 0, removedExpired: 0 };

  const { data } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const subs = (data ?? []) as SubscriptionRow[];

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];

  for (const sub of subs) {
    const body = JSON.stringify(payloadFor ? payloadFor(sub.user_id) : payload);

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
      );
      sent += 1;
    } catch (error) {
      failed += 1;

      const status = (error as { statusCode?: number })?.statusCode;

      if (status === 404 || status === 410) expired.push(sub.endpoint);
      else console.error("web-push error:", error);
    }
  }

  if (expired.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }

  return { sent, failed, removedExpired: expired.length };
}

/* ---------- 1) Напоминание «ты служишь в воскресенье» ---------- */

async function runWeekly(
  supabase: Supabase,
  berlin: { year: number; month: number; day: number },
) {
  const sundayDate = nextSundayFrom(berlin.year, berlin.month, berlin.day);

  const { data: entries, error: entriesError } = await supabase
    .from("schedule_entries")
    .select("id, schedule_date, service_time")
    .eq("schedule_date", sundayDate);

  if (entriesError) return { error: entriesError.message };

  const scheduleEntries = entries ?? [];

  if (scheduleEntries.length === 0) {
    return { sundayDate, sent: 0, note: "no entries" };
  }

  const { data: members, error: membersError } = await supabase
    .from("schedule_entry_members")
    .select("schedule_entry_id, team_member_id")
    .in("schedule_entry_id", scheduleEntries.map((entry) => entry.id));

  if (membersError) return { error: membersError.message };

  const scheduleMembers = members ?? [];

  if (scheduleMembers.length === 0) {
    return { sundayDate, sent: 0, note: "no members assigned" };
  }

  const memberIds = Array.from(new Set(scheduleMembers.map((row) => row.team_member_id)));

  const { data: teamMembers, error: teamError } = await supabase
    .from("team_members")
    .select("id, first_name, user_id")
    .in("id", memberIds)
    .not("user_id", "is", null);

  if (teamError) return { error: teamError.message };

  const linked = teamMembers ?? [];

  if (linked.length === 0) {
    return { sundayDate, sent: 0, note: "no team members linked to an account" };
  }

  const entryById = new Map(scheduleEntries.map((entry) => [entry.id, entry]));
  const timesByMember = new Map<number, string[]>();

  for (const row of scheduleMembers) {
    const entry = entryById.get(row.schedule_entry_id);
    if (!entry) continue;

    const time = String(entry.service_time).slice(0, 5).replace("13:00", "12:30");
    timesByMember.set(row.team_member_id, [...(timesByMember.get(row.team_member_id) ?? []), time]);
  }

  const byUser = new Map<string, { name: string; times: string[] }>();

  for (const member of linked) {
    const times = timesByMember.get(member.id);
    if (!times || times.length === 0) continue;

    byUser.set(member.user_id as string, {
      name: member.first_name as string,
      times: times.sort(),
    });
  }

  const result = await sendToUsers(
    supabase,
    Array.from(byUser.keys()),
    {},
    (userId) => {
      const info = byUser.get(userId)!;

      return {
        title: "TLight — Служение в воскресенье",
        body: `${info.name}, ты служишь в это воскресенье (${info.times.join(", ")}).`,
        url: "/schedule",
        tag: `sunday-${sundayDate}`,
      };
    },
  );

  return { sundayDate, ...result };
}

/* ---------- 2) Напоминание «отметь, когда можешь служить в следующем месяце» ---------- */

async function runAvailability(
  supabase: Supabase,
  berlin: { year: number; month: number },
  repeat: boolean,
) {
  const nextMonthIndex = berlin.month; // month 1..12 → индекс следующего месяца
  const nextYear = nextMonthIndex === 12 ? berlin.year + 1 : berlin.year;
  const monthIndex = nextMonthIndex % 12;

  const sundays = sundaysOfMonth(nextYear, monthIndex);

  if (sundays.length === 0) return { sent: 0, note: "no sundays" };

  // активные служители с аккаунтом
  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("status", "active")
    .not("user_id", "is", null);

  if (membersError) return { error: membersError.message };

  let userIds = Array.from(new Set((members ?? []).map((row) => row.user_id as string)));

  // «не служит» (секретарь и т.п.) — не беспокоим
  const { data: exempt } = await supabase.from("availability_exempt").select("user_id");
  const exemptIds = new Set((exempt ?? []).map((row) => row.user_id as string));
  userIds = userIds.filter((id) => !exemptIds.has(id));

  // уже ответившим на все воскресенья — не напоминаем
  const { data: answers } = await supabase
    .from("service_availability")
    .select("user_id, sunday_date")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])
    .in("sunday_date", sundays);

  const answeredCount = new Map<string, number>();

  for (const row of answers ?? []) {
    answeredCount.set(row.user_id as string, (answeredCount.get(row.user_id as string) ?? 0) + 1);
  }

  const pending = userIds.filter((id) => (answeredCount.get(id) ?? 0) < sundays.length);

  const ruMonth = new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(nextYear, monthIndex, 1)),
  );
  const deMonth = new Intl.DateTimeFormat("de-DE", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(nextYear, monthIndex, 1)),
  );

  const result = await sendToUsers(supabase, pending, {
    title: repeat
      ? "TLight — Ты ещё не отметил(а) воскресенья"
      : "TLight — Когда можешь служить?",
    body: `Отметь воскресенья на ${ruMonth} · Trage deine Sonntage für ${deMonth} ein`,
    url: "/availability",
    tag: `availability-${nextYear}-${pad(monthIndex + 1)}`,
  });

  return { month: `${nextYear}-${pad(monthIndex + 1)}`, recipients: pending.length, repeat, ...result };
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const berlin = getBerlinNow(new Date());
  const force = request.nextUrl.searchParams.get("force") === "1";
  const only = request.nextUrl.searchParams.get("only");

  if (!force && berlin.hour !== REMINDER_HOUR) {
    return NextResponse.json({
      skipped: true,
      note: `Berlin hour is ${berlin.hour}, waiting for ${REMINDER_HOUR}`,
    });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:info@example.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "VAPID keys are not configured" }, { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = getSupabaseAdmin();

  const weekday = new Date(Date.UTC(berlin.year, berlin.month - 1, berlin.day)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(berlin.year, berlin.month, 0)).getUTCDate();
  const daysLeft = daysInMonth - berlin.day;

  const output: Record<string, unknown> = { berlinDate: `${berlin.year}-${pad(berlin.month)}-${pad(berlin.day)}` };

  if (only === "weekly" || (!only && weekday === WEEKLY_WEEKDAY)) {
    output.weekly = await runWeekly(supabase, berlin);
  }

  const isFirst = daysLeft === AVAILABILITY_FIRST_DAYS_BEFORE_END;
  const isRepeat =
    AVAILABILITY_REPEAT_DAYS_BEFORE_END !== null &&
    daysLeft === AVAILABILITY_REPEAT_DAYS_BEFORE_END;

  if (only === "availability" || (!only && (isFirst || isRepeat))) {
    output.availability = await runAvailability(supabase, berlin, !isFirst && isRepeat);
  }

  return NextResponse.json(output);
}