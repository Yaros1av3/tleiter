import { NextRequest, NextResponse } from "next/server";

import {
  countResponses,
  loadFormBySlug,
  publicView,
} from "@/lib/formsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const form = await loadFormBySlug(slug);

    if (!form) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const taken = await countResponses(form.id);

    return NextResponse.json(publicView(form, taken), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Public form load error:", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
