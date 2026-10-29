import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Уведомление команде о проекте. Отправлять может только админ.
 * Приходит всем, у кого включены уведомления, включая самого отправителя
 * (так видно, что уведомление ушло, и можно проверить его на своём телефоне).
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

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (me?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    projectId?: number;
    reminder?: boolean;
  } | null;

  if (!body?.projectId) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("work_projects")
    .select("id, title")
    .eq("id", body.projectId)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: freeItems } = await supabase
    .from("work_items")
    .select("id")
    .eq("project_id", project.id)
    .is("assigned_to", null)
    .neq("status", "completed");

  const freeIds = (freeItems ?? []).map((row) => row.id as number);

  const { data: taken } = freeIds.length
    ? await supabase
        .from("work_item_members")
        .select("item_id")
        .in("item_id", freeIds)
    : { data: [] as { item_id: number }[] };

  const takenSet = new Set((taken ?? []).map((row) => row.item_id));
  const openRoles = freeIds.filter((id) => !takenSet.has(id)).length;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const roles = openRoles
    ? ` Свободных задач: ${openRoles} — выбери, что возьмёшь.`
    : "";

  const payload = JSON.stringify({
    title: body.reminder ? "TLight — напоминание о проекте" : "TLight — новый проект",
    body: `${project.title}.${roles}`,
    url: `/work/${project.id}`,
    tag: `work-${project.id}`,
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