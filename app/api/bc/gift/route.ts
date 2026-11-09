import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";

export const dynamic = "force-dynamic";

/* Разрешены только ссылки Amazon */
function isAmazon(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  return (
    /^([a-z0-9-]+\.)*amazon\.(de|com|co\.uk|fr|it|es|nl|pl|se|com\.be|com\.tr|ca)$/.test(h) ||
    h === "amzn.to" ||
    h === "amzn.eu" ||
    h === "a.co"
  );
}

export async function GET() {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });
  const sb = getSupabaseAdmin();
  await sb.rpc("bc_expire_gifts");
  const { data } = await sb
    .from("bc_gifts")
    .select("id, status, expires_at, gift_link")
    .eq("participant_id", p.id)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ gift: data ?? null });
}

export async function POST(req: Request) {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const link = typeof body?.link === "string" ? body.link.trim().slice(0, 600) : "";
  if (!link) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (!isAmazon(link)) return NextResponse.json({ error: "not_amazon" }, { status: 400 });

  const sb = getSupabaseAdmin();
  await sb.rpc("bc_expire_gifts");
  const { data: gift } = await sb
    .from("bc_gifts")
    .select("id, status")
    .eq("participant_id", p.id)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gift || gift.status !== "open") return NextResponse.json({ error: "closed" }, { status: 409 });

  const { error } = await sb
    .from("bc_gifts")
    .update({ status: "submitted", gift_link: link, submitted_at: new Date().toISOString() })
    .eq("id", gift.id)
    .eq("status", "open");
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}