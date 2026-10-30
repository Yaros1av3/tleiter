"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

/*
 * Мои задачи из проектов: те, что назначены мне или на которые я записался
 * кнопкой «Беру». Показываются, пока проект не завершён и задача не выполнена.
 */

export type MyWorkTask = {
  id: number;
  title: string;
  status: "open" | "in_progress" | "completed";
  deadline: string | null;
  project_id: number;
  project_title: string;
};

export function useMyWorkTasks() {
  const [tasks, setTasks] = useState<MyWorkTask[]>([]);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTasks([]);
      return;
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      setTasks([]);
      return;
    }

    const memberId = member.id as number;

    const { data: taken } = await supabase
      .from("work_item_members")
      .select("item_id")
      .eq("member_id", memberId);

    const takenIds = (taken ?? []).map((row) => row.item_id as number);

    const filter = takenIds.length
      ? `assigned_to.eq.${memberId},id.in.(${takenIds.join(",")})`
      : `assigned_to.eq.${memberId}`;

    const { data: items } = await supabase
      .from("work_items")
      .select("id, title, status, deadline, project_id")
      .or(filter)
      .neq("status", "completed")
      .order("deadline", { ascending: true, nullsFirst: false });

    const list = items ?? [];

    if (list.length === 0) {
      setTasks([]);
      return;
    }

    const projectIds = Array.from(
      new Set(list.map((item) => item.project_id as number)),
    );

    const { data: projects } = await supabase
      .from("work_projects")
      .select("id, title, status")
      .in("id", projectIds)
      .in("status", ["planned", "active"]);

    const titleById = new Map(
      (projects ?? []).map((project) => [
        project.id as number,
        project.title as string,
      ]),
    );

    setTasks(
      list
        .filter((item) => titleById.has(item.project_id as number))
        .map((item) => ({
          id: item.id as number,
          title: item.title as string,
          status: item.status as MyWorkTask["status"],
          deadline: (item.deadline as string | null) ?? null,
          project_id: item.project_id as number,
          project_title: titleById.get(item.project_id as number) as string,
        })),
    );
  }, []);

  useEffect(() => {
    load();

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  return tasks;
}