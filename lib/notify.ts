"use client";

import { supabase } from "@/lib/supabase";

/*
 * Сообщает серверу о событии (кого поставили в служение, взял задачу и т.п.),
 * а сервер сам отправляет push. Ошибки не мешают работе приложения.
 */
export async function notifyEvent(payload: Record<string, unknown>) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return;

    await fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("notify error:", error);
  }
}