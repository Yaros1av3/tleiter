import { NextResponse } from "next/server";
import { clearSession } from "@/lib/bcAuth";

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}