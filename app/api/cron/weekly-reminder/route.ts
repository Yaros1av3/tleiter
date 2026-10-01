import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Вызывается Vercel Cron (см. vercel.json) раз в неделю.
 * Находит ближайшее воскресенье, смотрит, кто стоит в плане
 * (schedule_entries + schedule_entry_members), и шлёт push
 * каждому служителю, у которого team_members.user_id привязан
 * к аккаунту и есть активная push-подписка.
 */

type ScheduleRow = {
  id: number;
  schedule_date: string;
  service_time: string;
  title_de: string | null;
  title_ru: string | null;
};

type MemberRow = {
  schedule_entry_id: number;
  team_member_id: number;
};

type TeamMemberRow = {
  id: number;
  first_name: string;
  user_id: string | null;
};

type SubscriptionRow = {
  id: number;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function nextSundayDateString(from: Date) {
  const daysUntilSunday = (7 - from.getDay()) % 7;
  const target = new Date(from);
  target.setDate(target.getDate() + daysUntilSunday);

  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:info@example.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { error: "VAPID keys are not configured" },
      { status: 500 },
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = getSupabaseAdmin();
  const sundayDate = nextSundayDateString(new Date());

  const { data: entries, error: entriesError } = await supabase
    .from("schedule_entries")
    .select("id, schedule_date, service_time, title_de, title_ru")
    .eq("schedule_date", sundayDate);

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  const scheduleEntries = (entries ?? []) as ScheduleRow[];

  if (scheduleEntries.length === 0) {
    return NextResponse.json({ sundayDate, sent: 0, note: "no entries" });
  }

  const entryIds = scheduleEntries.map((entry) => entry.id);

  const { data: members, error: membersError } = await supabase
    .from("schedule_entry_members")
    .select("schedule_entry_id, team_member_id")
    .in("schedule_entry_id", entryIds);

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  const scheduleMembers = (members ?? []) as MemberRow[];

  if (scheduleMembers.length === 0) {
    return NextResponse.json({ sundayDate, sent: 0, note: "no members assigned" });
  }

  const teamMemberIds = Array.from(
    new Set(scheduleMembers.map((row) => row.team_member_id)),
  );

  const { data: teamMembers, error: teamError } = await supabase
    .from("team_members")
    .select("id, first_name, user_id")
    .in("id", teamMemberIds)
    .not("user_id", "is", null);

  if (teamError) {
    return NextResponse.json({ error: teamError.message }, { status: 500 });
  }

  const linkedMembers = (teamMembers ?? []) as TeamMemberRow[];

  if (linkedMembers.length === 0) {
    return NextResponse.json({
      sundayDate,
      sent: 0,
      note: "no team members linked to a user account yet",
    });
  }

  const userIds = Array.from(
    new Set(linkedMembers.map((member) => member.user_id as string)),
  );

  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  const pushSubscriptions = (subscriptions ?? []) as SubscriptionRow[];

  const entryById = new Map(scheduleEntries.map((entry) => [entry.id, entry]));

  const memberTimes = new Map<number, string[]>();

  for (const row of scheduleMembers) {
    const entry = entryById.get(row.schedule_entry_id);
    if (!entry) continue;

    const list = memberTimes.get(row.team_member_id) ?? [];
    list.push(entry.service_time);
    memberTimes.set(row.team_member_id, list);
  }

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  for (const member of linkedMembers) {
    const times = memberTimes.get(member.id);
    if (!times || times.length === 0) continue;

    const subs = pushSubscriptions.filter(
      (sub) => sub.user_id === member.user_id,
    );

    if (subs.length === 0) continue;

    const title = "TLight — Служение в воскресенье";
    const body = `${member.first_name}, ты служишь в это воскресенье (${times.sort().join(", ")}).`;

    const payload = JSON.stringify({
      title,
      body,
      url: "/schedule",
      tag: `sunday-${sundayDate}`,
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );

        sent += 1;
      } catch (error) {
        failed += 1;

        const statusCode = (error as { statusCode?: number })?.statusCode;

        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.error("web-push error:", error);
        }
      }
    }
  }

  if (expiredEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return NextResponse.json({
    sundayDate,
    sent,
    failed,
    removedExpired: expiredEndpoints.length,
  });
}