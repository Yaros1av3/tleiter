import "server-only";

import webpush from "web-push";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type Supabase = ReturnType<typeof getSupabaseAdmin>;

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

/* включает VAPID; false — если ключи не настроены */
export function configurePush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:info@example.com";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/* кто вызывает API (по токену из приложения) */
export async function getCaller(request: Request, supabase: Supabase) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

/* отправка одного сообщения списку пользователей (дубликаты убираются) */
export async function sendToUsers(
  supabase: Supabase,
  userIds: Array<string | null | undefined>,
  payload: PushPayload,
) {
  const ids = Array.from(
    new Set(userIds.filter((id): id is string => Boolean(id))),
  );

  if (ids.length === 0) return 0;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", ids);

  const body = JSON.stringify(payload);
  let sent = 0;
  const expired: string[] = [];

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
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

  return sent;
}

/* user_id всех админов */
export async function getAdminIds(supabase: Supabase) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  return (data ?? []).map((row) => row.id as string);
}

/* те, кому не нужны уведомления о проектах и идеях (например, секретарь) */
export async function getMutedIds(supabase: Supabase) {
  const { data } = await supabase
    .from("push_work_exempt")
    .select("user_id");

  return new Set((data ?? []).map((row) => row.user_id as string));
}

/* админы без тех, кто отключил проектные уведомления, и без самого автора действия */
export async function getProjectAdminIds(
  supabase: Supabase,
  actorId?: string | null,
) {
  const [admins, muted] = await Promise.all([
    getAdminIds(supabase),
    getMutedIds(supabase),
  ]);

  return admins.filter((id) => !muted.has(id) && id !== actorId);
}

/* user_id служителя по его карточке */
export async function userIdOfMember(supabase: Supabase, memberId: number) {
  const { data } = await supabase
    .from("team_members")
    .select("user_id, first_name, last_name")
    .eq("id", memberId)
    .maybeSingle();

  return {
    userId: (data?.user_id as string | null) ?? null,
    name: data ? `${data.first_name} ${data.last_name}`.trim() : "",
    firstName: (data?.first_name as string | undefined) ?? "",
  };
}

export function shortDate(date: string) {
  const [, m, d] = String(date).split("-");
  return `${d}.${m}`;
}

export function serviceTimeLabel(time: string) {
  return String(time).slice(0, 5).replace("13:00", "12:30");
}

export function berlinToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
  }).format(new Date());
}