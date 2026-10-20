"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { nextBirthday, BIRTHDAYS_UPDATED_EVENT } from "@/lib/birthdays";

export type MyBirthday = {
  teenId: number;
  name: string;
  days: number;
  turns: number;
};

const WINDOW_DAYS = 7;

/**
 * Подростки текущего служителя, у которых день рождения в ближайшие 7 дней
 * и которых он ещё не отметил как поздравленных.
 */
export function useMyTeenBirthdays() {
  const [items, setItems] = useState<MyBirthday[]>([]);

  const load = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        setItems([]);
        return;
      }

      const { data: links } = await supabase
        .from("teen_mentors")
        .select("teen_id")
        .eq("team_member_id", member.id);

      const ids = (links ?? []).map((l) => l.teen_id as number);
      if (ids.length === 0) {
        setItems([]);
        return;
      }

      const year = new Date().getFullYear();

      const [{ data: teens }, { data: done }] = await Promise.all([
        supabase
          .from("teens")
          .select("id, first_name, last_name, birth_date, is_active")
          .in("id", ids),
        supabase
          .from("teen_birthday_celebrations")
          .select("teen_id, birthday_year, celebrated")
          .in("teen_id", ids)
          .in("birthday_year", [year, year + 1]),
      ]);

      const celebrated = new Set(
        (done ?? [])
          .filter((row) => row.celebrated)
          .map((row) => `${row.teen_id}-${row.birthday_year}`),
      );

      const result: MyBirthday[] = [];

      for (const teen of teens ?? []) {
        if (!teen.is_active || !teen.birth_date) continue;

        const next = nextBirthday(teen.birth_date);

        if (next.days > WINDOW_DAYS) continue;
        if (celebrated.has(`${teen.id}-${next.year}`)) continue;

        result.push({
          teenId: teen.id,
          name: `${teen.first_name} ${teen.last_name}`.trim(),
          days: next.days,
          turns: next.turns,
        });
      }

      result.sort((a, b) => a.days - b.days);
      setItems(result);
    } catch (error) {
      console.error("My teen birthdays error:", error);
    }
  }, []);

  useEffect(() => {
    load();

    window.addEventListener(BIRTHDAYS_UPDATED_EVENT, load);
    return () => window.removeEventListener(BIRTHDAYS_UPDATED_EVENT, load);
  }, [load]);

  return items;
}