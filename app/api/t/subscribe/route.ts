import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Подписка (или отписка) устройства подростка на уведомления */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    endpoint?: string;
    unsubscribe?: boolean;
    lang?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (body.unsubscribe) {
    const endpoint = String(body.endpoint ?? "");

    if (endpoint) {
      await supabase.from("teen_push_subscriptions").delete().eq("endpoint", endpoint);
    }

    return NextResponse.json({ ok: true });
  }

  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { error } = await supabase.from("teen_push_subscriptions").upsert(
    {
      endpoint,
      p256dh,
      auth,
      lang: body.lang === "ru" ? "ru" : "de",
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error("teen subscribe error:", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}