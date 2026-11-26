import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanText, getParticipant, rateLimit } from "@/lib/bcAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Вошедший подросток пишет служителям: идея, ошибка или вопрос */
export async function POST(request: Request) {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { kind?: string; message?: string } | null;
  const kind = body?.kind === "bug" || body?.kind === "question" ? body.kind : "idea";
  const message = cleanText(body?.message, 1500);

  if (message.length < 3) return NextResponse.json({ error: "empty" }, { status: 422 });

  // не больше 5 сообщений в час от одного подростка
  if (!rateLimit(`feedback:${p.id}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }

  const { error } = await getSupabaseAdmin().from("teen_feedback").insert({
    participant_id: p.id,
    teen_id: p.teen_id,
    first_name: p.first_name,
    last_name: p.last_name,
    kind,
    message,
  });

  if (error) {
    console.error("teen feedback insert error:", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}