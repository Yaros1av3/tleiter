"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export const REPLACEMENTS_UPDATED_EVENT = "replacements-updated";

export type ReplacementItem = {
  entryId: number;
  memberId: number;
  date: string;
  time: string;
  name: string;
  reason: string | null;
};

/** Открытые запросы на замену на сегодня и позже — для админов (карточка на главной). */
export function useReplacementRequests() {
  const [items, setItems] = useState<ReplacementItem[]>([]);

  const load = useCallback(async () => {
    try {
      const { data: isAdmin } = await supabase.rpc("is_admin");

      if (isAdmin !== true) {
        setItems([]);
        return;
      }

      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const { data: requests } = await supabase
        .from("replacement_requests")
        .select("schedule_entry_id, team_member_id, reason");

      if (!requests || requests.length === 0) {
        setItems([]);
        return;
      }

      const [{ data: entries }, { data: members }] = await Promise.all([
        supabase
          .from("schedule_entries")
          .select("id, schedule_date, service_time")
          .in("id", requests.map((r) => r.schedule_entry_id))
          .gte("schedule_date", todayKey),
        supabase
          .from("team_members")
          .select("id, first_name, last_name")
          .in("id", requests.map((r) => r.team_member_id)),
      ]);

      const result: ReplacementItem[] = [];

      for (const request of requests) {
        const entry = entries?.find((e) => e.id === request.schedule_entry_id);
        const member = members?.find((m) => m.id === request.team_member_id);
        if (!entry || !member) continue;

        result.push({
          entryId: entry.id,
          memberId: member.id,
          date: entry.schedule_date,
          time: String(entry.service_time).slice(0, 5).replace("13:00", "12:30"),
          name: `${member.first_name} ${member.last_name}`.trim(),
          reason: request.reason,
        });
      }

      result.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
      setItems(result);
    } catch (error) {
      console.error("Replacement requests error:", error);
    }
  }, []);

  useEffect(() => {
    load();

    window.addEventListener(REPLACEMENTS_UPDATED_EVENT, load);
    return () => window.removeEventListener(REPLACEMENTS_UPDATED_EVENT, load);
  }, [load]);

  return items;
}