import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Вызывается из приложения, когда служитель нажал «Не смогу, нужна замена».
 * Проверяет, что запрос действительно создан этим человеком (или админом),
 * и отправляет push всем админам (включая секретаря, которая сама не служит).
 */
export async function POST(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

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

  const body = (await request.json().catch(() => null)) as {
    entryId?: number;
    memberId?: number;
  } | null;

  if (!body?.entryId || !body?.memberId) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { data: req } = await supabase
    .from("replacement_requests")
    .select("id, reason, requested_by")
    .eq("schedule_entry_id", body.entryId)
    .eq("team_member_id", body.memberId)
    .maybeSingle();

  if (!req || req.requested_by !== userData.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [{ data: entry }, { data: member }, { data: admins }] = await Promise.all([
    supabase
      .from("schedule_entries")
      .select("schedule_date, service_time")
      .eq("id", body.entryId)
      .maybeSingle(),
    supabase
      .from("team_members")
      .select("first_name, last_name")
      .eq("id", body.memberId)
      .maybeSingle(),
    supabase.from("profiles").select("id").eq("role", "admin"),
  ]);

  if (!entry || !member) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const adminIds = (admins ?? [])
    .map((row) => row.id as string)
    .filter((id) => id !== userData.user.id);

  if (adminIds.length === 0) {
    return NextResponse.json({ sent: 0, note: "no admins" });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", adminIds);

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const time = String(entry.service_time).slice(0, 5).replace("13:00", "12:30");
  const [y, m, d] = String(entry.schedule_date).split("-");
  const reason = req.reason ? ` Причина: ${req.reason}` : "";

  const payload = JSON.stringify({
    title: "TLight — нужна замена",
    body: `${member.first_name} ${member.last_name} не сможет служить ${d}.${m}.${y} (${time}).${reason}`,
    url: `/schedule?date=${entry.schedule_date}`,
    tag: `replacement-${body.entryId}-${body.memberId}`,
  });

  let sent = 0;
  const expired: string[] = [];

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) expired.push(sub.endpoint);
      else console.error("web-push error:", error);
    }
  }

  if (expired.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }

  return NextResponse.json({ sent });
}