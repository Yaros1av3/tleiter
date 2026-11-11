import { NextResponse } from "next/server";
import webpush from "web-push";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { UPDATES } from "@/lib/updates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPER_ADMIN_EMAIL = "yargalaychuk@gmail.com";

async function authorize(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return false;
  return (data.user.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
}

/* Состояние для кнопки: какое обновление последнее, слали ли о нём, сколько подписчиков */
export async function GET(req: Request) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const sb = getSupabaseAdmin();
  const latest = UPDATES[0];
  const [{ data: state }, { count }] = await Promise.all([
    sb.from("app_state").select("value").eq("key", "last_update_push").maybeSingle(),
    sb.from("push_subscriptions").select("endpoint", { count: "exact", head: true }),
  ]);
  return NextResponse.json({
    id: latest?.id ?? null,
    title: latest?.title ?? null,
    alreadySent: Boolean(latest && state?.value === latest.id),
    subscribers: count ?? 0,
  });
}

/* Отправить push о последнем обновлении всем служителям с включёнными уведомлениями */
export async function POST(req: Request) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const latest = UPDATES[0];
  if (!latest) return NextResponse.json({ error: "no_update" }, { status: 400 });

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: "vapid" }, { status: 500 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@example.com", pub, priv);

  const sb = getSupabaseAdmin();
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

  return NextResponse.json({ sent });
}