import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Ручная отправка напоминания «Отметь, когда можешь служить в следующем месяце».
 * Только для админов. Получают: все активные служители с аккаунтом, кто ещё
 * не ответил на все воскресенья следующего месяца (кроме «не служит»),
 * и сам админ, который нажал кнопку (копия — чтобы видеть, как выглядит уведомление).
 */

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function berlinYearMonth(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: get("year"), month: get("month") };
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:info@example.com";

  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID not configured" }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // проверяем админа так же, как приложение: функцией is_admin() от имени самого пользователя
  let isAdmin = false;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (publishableKey && supabaseUrl) {
    const asUser = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: adminFlag } = await asUser.rpc("is_admin");
    isAdmin = adminFlag === true;
  }

  if (!isAdmin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    isAdmin = profile?.role === "admin";
  }

  if (!isAdmin) {
    return NextResponse.json(
      { error: "forbidden (not admin)" },
      { status: 403 },
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  // следующий месяц по берлинскому времени
  const now = berlinYearMonth(new Date());
  const nextYear = now.month === 12 ? now.year + 1 : now.year;
  const monthIndex = now.month % 12;

  const sundays: string[] = [];
  const daysInMonth = new Date(Date.UTC(nextYear, monthIndex + 1, 0)).getUTCDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(Date.UTC(nextYear, monthIndex, day)).getUTCDay() === 0) {
      sundays.push(`${nextYear}-${pad(monthIndex + 1)}-${pad(day)}`);
    }
  }

  const { data: members } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("status", "active")
    .not("user_id", "is", null);

  let userIds = Array.from(new Set((members ?? []).map((row) => row.user_id as string)));

  const { data: exempt } = await supabase.from("availability_exempt").select("user_id");
  const exemptIds = new Set((exempt ?? []).map((row) => row.user_id as string));
  userIds = userIds.filter((id) => !exemptIds.has(id));

  const { data: answers } = await supabase
    .from("service_availability")
    .select("user_id, sunday_date")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])
    .in("sunday_date", sundays);

  const answered = new Map<string, number>();

  for (const row of answers ?? []) {
    answered.set(row.user_id as string, (answered.get(row.user_id as string) ?? 0) + 1);
  }

  const pending = userIds.filter((id) => (answered.get(id) ?? 0) < sundays.length);

  const recipients = Array.from(new Set([...pending, userData.user.id]));

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", recipients);

  const ruMonth = new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(nextYear, monthIndex, 1)),
  );
  const deMonth = new Intl.DateTimeFormat("de-DE", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(nextYear, monthIndex, 1)),
  );

  const payload = JSON.stringify({
    title: "TLight — Когда можешь служить?",
    body: `Отметь воскресенья на ${ruMonth} · Trage deine Sonntage für ${deMonth} ein`,
    url: "/availability",
    tag: `availability-${nextYear}-${pad(monthIndex + 1)}`,
  });

  let sent = 0;
  const expired: string[] = [];
  const reached = new Set<string>();

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent += 1;
      reached.add(sub.user_id as string);
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) expired.push(sub.endpoint);
      else console.error("web-push error:", error);
    }
  }

  if (expired.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }

  return NextResponse.json({
    month: `${nextYear}-${pad(monthIndex + 1)}`,
    pending: pending.length,
    pendingReached: pending.filter((id) => reached.has(id)).length,
    sent,
  });
}