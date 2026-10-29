"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

/*
 * Точка «новый проект»: горит, пока есть проекты, созданные не тобой
 * позже, чем ты последний раз открывал раздел «Проекты».
 * Если ты ещё ни разу не открывал раздел — считаем проекты за последние 7 дней.
 */

export const WORK_SEEN_EVENT = "work-seen";

export async function markWorkSeen() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("work_project_reads")
    .upsert({ user_id: user.id, last_seen: new Date().toISOString() });

  window.dispatchEvent(new Event(WORK_SEEN_EVENT));
}

export function useWorkUnread() {
  const [count, setCount] = useState(0);
  const [latest, setLatest] = useState<{ id: number; title: string } | null>(null);

  const check = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCount(0);
      return;
    }

    const { data: read } = await supabase
      .from("work_project_reads")
      .select("last_seen")
      .eq("user_id", user.id)
      .maybeSingle();

    const since =
      read?.last_seen ??
      new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const { data, count: total, error } = await supabase
      .from("work_projects")
      .select("id, title", { count: "exact" })
      .or(`created_by.is.null,created_by.neq.${user.id}`)
      .in("status", ["planned", "active"])
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      setCount(0);
      return;
    }

    setCount(total ?? 0);
    setLatest(data?.[0] ? { id: data[0].id as number, title: data[0].title as string } : null);
  }, []);

  useEffect(() => {
    check();

    const onChange = () => check();
    window.addEventListener(WORK_SEEN_EVENT, onChange);
    window.addEventListener("focus", onChange);

    return () => {
      window.removeEventListener(WORK_SEEN_EVENT, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [check]);

  return { count, unread: count > 0, latest };
}