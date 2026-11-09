"use client";

import { supabase } from "@/lib/supabase";

/* Запрос к админ-API Bibel-Challenge с токеном вошедшего служителя */
export async function bcCall<R = Record<string, unknown>>(
  method: "GET" | "POST",
  url: string,
  body?: unknown,
): Promise<{ ok: boolean; data: R & { error?: string } }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: "network" } as R & { error?: string } };
  }
}