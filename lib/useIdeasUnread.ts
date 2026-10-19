"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

/*
 * Лампочка на главной горит, пока есть идеи, которые ты ещё не видел
 * (написаны не тобой и позже, чем ты последний раз открывал страницу идей).
 */

export const IDEAS_UPDATED_EVENT = "ideas-updated";

export function useIdeasUnread() {
  const [count, setCount] = useState(0);
  const [latestAuthor, setLatestAuthor] = useState<string | null>(null);

  const check = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCount(0);
      return;
    }

    const { data: read } = await supabase
      .from("team_idea_reads")
      .select("last_seen")
      .eq("user_id", user.id)
      .maybeSingle();

    let query = supabase
      .from("team_ideas")
      .select("id, author_name", { count: "exact" })
      .neq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (read?.last_seen) {
      query = query.gt("created_at", read.last_seen);
    }

    const { data, count: total, error } = await query;

    if (error) {
      // таблицы может ещё не быть — тогда просто не горим
      setCount(0);
      return;
    }

    setCount(total ?? 0);
    setLatestAuthor(data?.[0]?.author_name ?? null);
  }, []);

  useEffect(() => {
    check();

    const onUpdate = () => check();
    const onFocus = () => check();

    window.addEventListener(IDEAS_UPDATED_EVENT, onUpdate);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener(IDEAS_UPDATED_EVENT, onUpdate);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  return { count, unread: count > 0, latestAuthor };
}