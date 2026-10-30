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
 *  5) каждый день 16:00 — срок задач проектов: «завтра» и «сегодня»;
 *  6) в воскресенье в 8:00 — «сегодня служишь»;
 *  4) по понедельникам — напоминает о задачах проектов, которые всё ещё «в работе».
 *
 * Ручной тест: ?force=1 (+ &only=weekly, &only=availability или &only=tasks). Секрет нужен всегда.
 */

const REMINDER_TIMEZONE = "Europe/Berlin";
/*
 * Два запуска в сутки (06:00 и 14:00 UTC). В Берлине это:
 *   зимой  — 07:00 и 15:00,
 *   летом  — 08:00 и 16:00.
 * Утренние дела идут при 7–8 часах, вечерние — при 15–16.
 */
const MORNING_HOURS = [7, 8]; // утреннее напоминание «сегодня служишь»
const EVENING_HOURS = [15, 16];
const WEEKLY_WEEKDAY = 2; // вторник
const TASKS_WEEKDAY = 1; // понедельник — напоминание о задачах проектов «в работе»

/* За сколько дней до конца месяца напоминать про «Когда могу служить» */
const AVAILABILITY_FIRST_DAYS_BEFORE_END = 13;
/* Повтор для не ответивших; поставь null, чтобы отключить */
const AVAILABILITY_REPEAT_DAYS_BEFORE_END: number | null = 5;
/* Последнее личное напоминание не ответившим; null — отключить */
const AVAILABILITY_FINAL_DAYS_BEFORE_END: number | null = 2;

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
  final = false,
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

  if (final) {
    const { data: names } = await supabase
      .from("team_members")
      .select("user_id, first_name")
      .in("user_id", pending.length > 0 ? pending : ["00000000-0000-0000-0000-000000000000"]);

    const nameById = new Map(
      (names ?? []).map((row) => [row.user_id as string, row.first_name as string]),
    );

    const finalResult = await sendToUsers(supabase, pending, {}, (userId) => ({
      title: "TLight — осталось 2 дня",
      body: `${nameById.get(userId) ?? ""}, до конца месяца 2 дня, а воскресенья на ${ruMonth} ещё не отмечены. Отметь, пожалуйста · Trage deine Sonntage für ${deMonth} ein`.trim(),
      url: "/availability",
      tag: `availability-final-${nextYear}-${pad(monthIndex + 1)}`,
    }));

    return { month: `${nextYear}-${pad(monthIndex + 1)}`, recipients: pending.length, final: true, ...finalResult };
  }

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

/* ---------- 5) Срок задач проектов: завтра / сегодня ---------- */

async function runDeadlines(
  supabase: Supabase,
  berlin: { year: number; month: number; day: number },
) {
  const today = `${berlin.year}-${pad(berlin.month)}-${pad(berlin.day)}`;
  const tomorrowDate = new Date(Date.UTC(berlin.year, berlin.month - 1, berlin.day + 1));
  const tomorrow = `${tomorrowDate.getUTCFullYear()}-${pad(tomorrowDate.getUTCMonth() + 1)}-${pad(tomorrowDate.getUTCDate())}`;

  const { data: projects } = await supabase
    .from("work_projects")
    .select("id")
    .in("status", ["planned", "active"]);

  const projectIds = (projects ?? []).map((project) => project.id as number);

  if (projectIds.length === 0) return { sent: 0, note: "no active projects" };

  const { data: items } = await supabase
    .from("work_items")
    .select("id, title, project_id, assigned_to, deadline")
    .neq("status", "completed")
    .in("deadline", [today, tomorrow])
    .in("project_id", projectIds);

  const list = items ?? [];

  if (list.length === 0) return { sent: 0, note: "no deadlines" };

  const { data: takers } = await supabase
    .from("work_item_members")
    .select("item_id, member_id")
    .in("item_id", list.map((item) => item.id));

  const owners = new Map<number, Set<number>>();

  for (const item of list) {
    owners.set(item.id as number, new Set(item.assigned_to ? [item.assigned_to as number] : []));
  }

  for (const row of takers ?? []) owners.get(row.item_id as number)?.add(row.member_id as number);

  const memberIds = Array.from(new Set(Array.from(owners.values()).flatMap((set) => Array.from(set))));

  if (memberIds.length === 0) return { sent: 0, note: "no owners" };

  const { data: members } = await supabase
    .from("team_members")
    .select("id, first_name, user_id")
    .in("id", memberIds)
    .not("user_id", "is", null);

  const byUser = new Map<string, { name: string; today: string[]; tomorrow: string[]; projectIds: Set<number>; firstProject: number }>();

  for (const member of members ?? []) {
    const mine = list.filter((item) => owners.get(item.id as number)?.has(member.id as number));
    if (mine.length === 0) continue;

    byUser.set(member.user_id as string, {
      name: member.first_name as string,
      today: mine.filter((item) => item.deadline === today).map((item) => item.title as string),
      tomorrow: mine.filter((item) => item.deadline === tomorrow).map((item) => item.title as string),
      projectIds: new Set(mine.map((item) => item.project_id as number)),
      firstProject: mine[0].project_id as number,
    });
  }

  const result = await sendToUsers(supabase, Array.from(byUser.keys()), {}, (userId) => {
    const info = byUser.get(userId)!;
    const parts: string[] = [];

    if (info.today.length > 0) parts.push(`сегодня срок: ${info.today.slice(0, 3).join(", ")}`);
    if (info.tomorrow.length > 0) parts.push(`завтра срок: ${info.tomorrow.slice(0, 3).join(", ")}`);

    return {
      title: info.today.length > 0 ? "TLight — срок задачи сегодня" : "TLight — срок задачи завтра",
      body: `${info.name}, ${parts.join("; ")}.`,
      url: info.projectIds.size === 1 ? `/work/${info.firstProject}` : "/work",
      tag: `work-deadline-${today}`,
    };
  });

  return { recipients: byUser.size, ...result };
}

/* ---------- 6) Утро воскресенья: «сегодня служишь» ---------- */

async function runSundayMorning(
  supabase: Supabase,
  berlin: { year: number; month: number; day: number },
) {
  const today = `${berlin.year}-${pad(berlin.month)}-${pad(berlin.day)}`;

  const { data: entries } = await supabase
    .from("schedule_entries")
    .select("id, service_time")
    .eq("schedule_date", today);

  const list = entries ?? [];

  if (list.length === 0) return { sent: 0, note: "no entries today" };

  const { data: rows } = await supabase
    .from("schedule_entry_members")
    .select("schedule_entry_id, team_member_id")
    .in("schedule_entry_id", list.map((entry) => entry.id));

  const timeByEntry = new Map(
    list.map((entry) => [
      entry.id as number,
      String(entry.service_time).slice(0, 5).replace("13:00", "12:30"),
    ]),
  );

  const timesByMember = new Map<number, string[]>();

  for (const row of rows ?? []) {
    const time = timeByEntry.get(row.schedule_entry_id as number);
    if (!time) continue;
    timesByMember.set(row.team_member_id as number, [
      ...(timesByMember.get(row.team_member_id as number) ?? []),
      time,
    ]);
  }

  if (timesByMember.size === 0) return { sent: 0, note: "no members" };

  const { data: members } = await supabase
    .from("team_members")
    .select("id, first_name, user_id")
    .in("id", Array.from(timesByMember.keys()))
    .not("user_id", "is", null);

  const byUser = new Map<string, { name: string; times: string[] }>();

  for (const member of members ?? []) {
    byUser.set(member.user_id as string, {
      name: member.first_name as string,
      times: (timesByMember.get(member.id as number) ?? []).sort(),
    });
  }

  const result = await sendToUsers(supabase, Array.from(byUser.keys()), {}, (userId) => {
    const info = byUser.get(userId)!;

    return {
      title: "TLight — сегодня служение",
      body: `${info.name}, сегодня ты служишь (${info.times.join(", ")}). Хорошего служения!`,
      url: "/schedule",
      tag: `sunday-morning-${today}`,
    };
  });

  return { recipients: byUser.size, ...result };
}

/* ---------- 4) Напоминание о задачах проектов, которые «в работе» ---------- */

async function runTasks(supabase: Supabase) {
  const { data: projects } = await supabase
    .from("work_projects")
    .select("id, title")
    .in("status", ["planned", "active"]);

  const projectById = new Map(
    (projects ?? []).map((project) => [project.id as number, project.title as string]),
  );

  if (projectById.size === 0) return { sent: 0, note: "no active projects" };

  const { data: items } = await supabase
    .from("work_items")
    .select("id, title, project_id, assigned_to")
    .eq("status", "in_progress")
    .in("project_id", Array.from(projectById.keys()));

  const list = items ?? [];

  if (list.length === 0) return { sent: 0, note: "no tasks in progress" };

  const { data: takers } = await supabase
    .from("work_item_members")
    .select("item_id, member_id")
    .in("item_id", list.map((item) => item.id));

  // задача → все ответственные (назначенный + записавшиеся)
  const ownersByItem = new Map<number, Set<number>>();

  for (const item of list) {
    const set = new Set<number>();
    if (item.assigned_to) set.add(item.assigned_to as number);
    ownersByItem.set(item.id as number, set);
  }

  for (const row of takers ?? []) {
    ownersByItem.get(row.item_id as number)?.add(row.member_id as number);
  }

  const memberIds = Array.from(
    new Set(Array.from(ownersByItem.values()).flatMap((set) => Array.from(set))),
  );

  if (memberIds.length === 0) return { sent: 0, note: "no owners" };

  const { data: members } = await supabase
    .from("team_members")
    .select("id, first_name, user_id")
    .in("id", memberIds)
    .not("user_id", "is", null);

  const byUser = new Map<string, { name: string; titles: string[]; projectId: number; projects: Set<number> }>();

  for (const member of members ?? []) {
    const mine = list.filter((item) => ownersByItem.get(item.id as number)?.has(member.id as number));
    if (mine.length === 0) continue;

    byUser.set(member.user_id as string, {
      name: member.first_name as string,
      titles: mine.map((item) => item.title as string),
      projectId: mine[0].project_id as number,
      projects: new Set(mine.map((item) => item.project_id as number)),
    });
  }

  const result = await sendToUsers(supabase, Array.from(byUser.keys()), {}, (userId) => {
    const info = byUser.get(userId)!;
    const shown = info.titles.slice(0, 3).join(", ");
    const more = info.titles.length > 3 ? ` +${info.titles.length - 3}` : "";

    return {
      title: "TLight — задачи в работе",
      body: `${info.name}, не забудь про свои задачи: ${shown}${more}. Отметь, когда будет готово.`,
      url: info.projects.size === 1 ? `/work/${info.projectId}` : "/work",
      tag: "work-in-progress",
    };
  });

  return { recipients: byUser.size, ...result };
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

  const isEvening = EVENING_HOURS.includes(berlin.hour);
  const isMorning = MORNING_HOURS.includes(berlin.hour);

  if (!force && !isEvening && !isMorning) {
    return NextResponse.json({
      skipped: true,
      note: `Berlin hour is ${berlin.hour}, waiting for ${MORNING_HOURS.join("/")} or ${EVENING_HOURS.join("/")}`,
    });
  }

  // вечерние напоминания (16:00) идут при isEvening или ручном запуске
  const evening = force || isEvening;

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

  if (only === "sunday" || (!only && isMorning && weekday === 0)) {
    output.sunday = await runSundayMorning(supabase, berlin);
  }

  if (only === "deadlines" || (!only && evening)) {
    output.deadlines = await runDeadlines(supabase, berlin);
  }

  if (only === "weekly" || (!only && evening && weekday === WEEKLY_WEEKDAY)) {
    output.weekly = await runWeekly(supabase, berlin);
  }

  if (only === "tasks" || (!only && evening && weekday === TASKS_WEEKDAY)) {
    output.tasks = await runTasks(supabase);
  }

  const isFirst = daysLeft === AVAILABILITY_FIRST_DAYS_BEFORE_END;
  const isRepeat =
    AVAILABILITY_REPEAT_DAYS_BEFORE_END !== null &&
    daysLeft === AVAILABILITY_REPEAT_DAYS_BEFORE_END;

  const isFinal =
    AVAILABILITY_FINAL_DAYS_BEFORE_END !== null &&
    daysLeft === AVAILABILITY_FINAL_DAYS_BEFORE_END;

  if (only === "availability" || (!only && evening && (isFirst || isRepeat || isFinal))) {
    output.availability = await runAvailability(
      supabase,
      berlin,
      !isFirst && isRepeat,
      isFinal && !isFirst && !isRepeat,
    );
  }

  return NextResponse.json(output);
}