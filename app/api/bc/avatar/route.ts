import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getParticipant } from "@/lib/bcAuth";

const MAX_BYTES = 400 * 1024;

function detect(buf: Buffer): { ext: string; type: string } | null {
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) return { ext: "jpg", type: "image/jpeg" };
  if (buf.length > 8 && buf.subarray(1, 4).toString() === "PNG") return { ext: "png", type: "image/png" };
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP")
    return { ext: "webp", type: "image/webp" };
  return null;
}

function pathOf(url: string | null): string | null {
  const m = url?.split("/bc-avatars/")[1];
  return m ? decodeURIComponent(m.split("?")[0]) : null;
}

export async function POST(req: Request) {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "bad" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "big" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const kind = detect(buf);
  if (!kind) return NextResponse.json({ error: "type" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const path = `${p.id}/${Date.now()}.${kind.ext}`;
  const up = await sb.storage.from("bc-avatars").upload(path, buf, { contentType: kind.type });
  if (up.error) return NextResponse.json({ error: "upload" }, { status: 500 });

  const url = sb.storage.from("bc-avatars").getPublicUrl(path).data.publicUrl;
  const { error } = await sb.from("bc_participants").update({ avatar_url: url }).eq("id", p.id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  const old = pathOf(p.avatar_url);
  if (old) await sb.storage.from("bc-avatars").remove([old]);
  return NextResponse.json({ ok: true, avatar_url: url });
}

export async function DELETE() {
  const p = await getParticipant();
  if (!p) return NextResponse.json({ error: "auth" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const old = pathOf(p.avatar_url);
  if (old) await sb.storage.from("bc-avatars").remove([old]);
  await sb.from("bc_participants").update({ avatar_url: null }).eq("id", p.id);
  return NextResponse.json({ ok: true });
}