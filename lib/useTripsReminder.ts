"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { supabase } from "@/lib/supabase";

/*
 * Сколько открытых голосований о поездках ждут голоса этого человека.
 * Пока count > 0 — показываем красный кружок на «⋯», на пункте «Поездки»
 * и на самом голосовании. Как только человек проголосовал (или голосование
 * закрыли / срок прошёл) — кружок пропадает.
 */
export const TRIPS_UPDATED_EVENT = "trips-updated";

export function useTripsReminder() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  const check = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCount(0);
        return;
      }

      const [pollsResult, votesResult] = await Promise.all([
        supabase.from("trip_polls").select("id, deadline").eq("status", "open"),
        supabase.from("trip_poll_votes").select("poll_id").eq("user_id", user.id),
      ]);

      if (pollsResult.error || votesResult.error) {
        setCount(0);
        return;
      }

      const today = new Date();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const voted = new Set((votesResult.data ?? []).map((row) => row.poll_id));

      const waiting = (pollsResult.data ?? []).filter(
        (poll) => !voted.has(poll.id) && (!poll.deadline || poll.deadline >= todayString),
      );

      setCount(waiting.length);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
  }, [check, pathname]);

  useEffect(() => {
    window.addEventListener(TRIPS_UPDATED_EVENT, check);

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void check();
    });

    return () => {
      window.removeEventListener(TRIPS_UPDATED_EVENT, check);
      authListener.subscription.unsubscribe();
    };
  }, [check]);

  return { count, needed: count > 0 };
}