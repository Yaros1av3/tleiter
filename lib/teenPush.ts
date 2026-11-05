import "server-only";

import webpush from "web-push";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Supabase = ReturnType<typeof getSupabaseAdmin>;

export type TeenPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

/*
 * Отправка уведомления всем подписанным подросткам.
 * Текст выбирается по языку, который подросток выбрал на странице (de / ru).
 * VAPID уже должен быть настроен (configurePush или setVapidDetails).
 */
export async function sendToTeens(
  supabase: Supabase,
  payloadFor: (lang: "de" | "ru") => TeenPayload,
) {
  const { data: subs } = await supabase
    .from("teen_push_subscriptions")
    .select("endpoint, p256dh, auth, lang");

  let sent = 0;
  const expired: string[] = [];

  for (const sub of subs ?? []) {
    const lang = sub.lang === "ru" ? "ru" : "de";

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payloadFor(lang)),
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) expired.push(sub.endpoint);
      else console.error("teen web-push error:", error);
    }
  }

  if (expired.length > 0) {
    await supabase
      .from("teen_push_subscriptions")
      .delete()
      .in("endpoint", expired);
  }

  return sent;
}