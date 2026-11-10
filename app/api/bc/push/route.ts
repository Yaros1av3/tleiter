import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Включить / выключить еженедельное напоминание Bibel-Challenge на этом устройстве */
export async function POST(req: NextRequest) {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    endpoint?: string;
    unlink?: boolean;
    check?: boolean;
    lang?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "bad" }, { status: 400 });

  const sb = getSupabaseAdmin();

  if (body.check) {
    const endpoint = String(body.endpoint ?? "");
    if (!endpoint) return NextResponse.json({ linked: false });
    const { data } = await sb
      .from("teen_push_subscriptions")
      .select("endpoint")
      .eq("endpoint", endpoint)
      .eq("participant_id", p.id)
      .maybeSingle();
    return NextResponse.json({ linked: Boolean(data) });
  }

  if (body.unlink) {
    const endpoint = String(body.endpoint ?? "");
    if (endpoint) {
      await sb
        .from("teen_push_subscriptions")
        .update({ participant_id: null })
        .eq("endpoint", endpoint)
        .eq("participant_id", p.id);
    }
    return NextResponse.json({ ok: true });
  }

  const s = body.subscription;
  if (!s?.endpoint || !s.keys?.p256dh || !s.keys?.auth || !s.endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  const { error } = await sb.from("teen_push_subscriptions").upsert(
    {
      endpoint: s.endpoint,
      p256dh: s.keys.p256dh,
      auth: s.keys.auth,
      lang: body.lang === "ru" ? "ru" : "de",
      participant_id: p.id,
    },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: "server" }, { status: 500 });
  return NextResponse.json({ ok: true });
}