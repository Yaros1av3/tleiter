import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { UPDATES } from "@/lib/updates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Раз в сутки (см. vercel.json) проверяет, есть ли в lib/updates.ts новое обновление
 * с push: true, о котором ещё не рассылали. Если есть, шлёт всем служителям push
 * (на двух языках) и запоминает id. Ручной запуск: ?force=1 (с секретом).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const latest = UPDATES[0];
  if (!latest || !latest.push) return NextResponse.json({ sent: 0, note: "latest update has no push" });

  const sb = getSupabaseAdmin();
  const force = request.nextUrl.searchParams.get("force") === "1";

  const { data: state } = await sb.from("app_state").select("value").eq("key", "last_update_push").maybeSingle();
  if (!force && state?.value === latest.id) return NextResponse.json({ sent: 0, note: "already sent", id: latest.id });

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: "VAPID keys are not configured" }, { status: 500 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@example.com", pub, priv);

  const { data: subs } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth");

  const payload = JSON.stringify({
    title: "TLight — Что нового · Was ist neu",
    body: `${latest.pushBody.ru} · ${latest.pushBody.de}`,
    url: "/",
    tag: `update-${latest.id}`,
  });

  let sent = 0;
  const expired: string[] = [];

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) expired.push(sub.endpoint);
      else console.error("update push error:", error);
    }
  }

  if (expired.length) await sb.from("push_subscriptions").delete().in("endpoint", expired);
  await sb.from("app_state").upsert({ key: "last_update_push", value: latest.id, updated_at: new Date().toISOString() });

  return NextResponse.json({ sent, removedExpired: expired.length, id: latest.id });
}