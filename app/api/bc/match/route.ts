import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normName } from "@/lib/bcNames";
import { cleanText, clientIp, rateLimit, signToken } from "@/lib/bcAuth";

/* Шаг 1 регистрации: ищем подростка в базе по имени и фамилии */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const first = cleanText(body?.first);
  const last = cleanText(body?.last);
  if (!first || !last) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (!rateLimit(`match:${clientIp(req)}`, 20, 10 * 60_000))
    return NextResponse.json({ error: "rate" }, { status: 429 });

  const sb = getSupabaseAdmin();
  const [teensRes, partsRes] = await Promise.all([
    sb.from("teens").select("id, first_name, last_name"),
    sb.from("bc_participants").select("teen_id").not("teen_id", "is", null),
  ]);
  if (teensRes.error) return NextResponse.json({ error: "db" }, { status: 500 });

  const taken = new Set((partsRes.data ?? []).map((p) => p.teen_id as number));
  const a = normName(first);
  const b = normName(last);
  const matches = (teensRes.data ?? []).filter((t) => {
    const f = normName(t.first_name ?? "");
    const l = normName(t.last_name ?? "");
    return (f === a && l === b) || (f === b && l === a);
  });

  if (!matches.length) return NextResponse.json({ status: "notfound" });
  const free = matches.filter((m) => !taken.has(m.id));
  if (!free.length) return NextResponse.json({ status: "exists" });

  const ticket = signToken({ ids: free.map((m) => m.id) }, 15 * 60);
  return NextResponse.json({ status: "found", ticket });
}