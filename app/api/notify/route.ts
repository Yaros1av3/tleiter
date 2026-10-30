import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  berlinToday,
  configurePush,
  getAdminIds,
  getCaller,
  getMutedIds,
  getProjectAdminIds,
  sendToUsers,
  serviceTimeLabel,
  shortDate,
  userIdOfMember,
} from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Уведомления о событиях в приложении. Приложение сообщает «что произошло»,
 * а сервер сам проверяет по базе, что это правда, и решает, кому отправить.
 *
 * type:
 *  schedule-change   — кого-то поставили в служение / сняли
 *  replacement-found — для замены нашли человека
 *  task-assigned     — задача назначена человеку
 *  task-claimed      — человек нажал «Беру»
 *  task-done         — задача выполнена (и, возможно, весь проект)
 *  idea-new          — новая идея
 *  idea-reaction     — реакция на чью-то идею
 */
export async function POST(request: NextRequest) {
  if (!configurePush()) {
    return NextResponse.json({ error: "VAPID not configured" }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const caller = await getCaller(request, supabase);

  if (!caller) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body || typeof body.type !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  let sent = 0;

  /* ---------- 1–2) поставили в служение / сняли ---------- */
  if (body.type === "schedule-change") {
    const entryId = Number(body.entryId);
    const added = ((body.added as number[]) ?? []).map(Number);
    const removed = ((body.removed as number[]) ?? []).map(Number);

    const { data: entry } = await supabase
      .from("schedule_entries")
      .select("schedule_date, service_time")
      .eq("id", entryId)
      .maybeSingle();

    if (!entry || entry.schedule_date < berlinToday()) {
      return NextResponse.json({ sent: 0 });
    }

    const { data: current } = await supabase
      .from("schedule_entry_members")
      .select("team_member_id")
      .eq("schedule_entry_id", entryId);

    const currentIds = new Set((current ?? []).map((row) => row.team_member_id as number));

    const when = `${shortDate(entry.schedule_date)} (${serviceTimeLabel(entry.service_time)})`;

    for (const memberId of added.filter((id) => currentIds.has(id))) {
      const member = await userIdOfMember(supabase, memberId);
      if (!member.userId || member.userId === caller.id) continue;

      sent += await sendToUsers(supabase, [member.userId], {
        title: "TLight — ты в служении",
        body: `${member.firstName}, тебя поставили в служение ${when}.`,
        url: "/schedule",
        tag: `sched-add-${entryId}-${memberId}`,
      });
    }

    for (const memberId of removed.filter((id) => !currentIds.has(id))) {
      const member = await userIdOfMember(supabase, memberId);
      if (!member.userId || member.userId === caller.id) continue;

      sent += await sendToUsers(supabase, [member.userId], {
        title: "TLight — изменение в плане",
        body: `${member.firstName}, тебя убрали из служения ${when}.`,
        url: "/schedule",
        tag: `sched-del-${entryId}-${memberId}`,
      });
    }

    return NextResponse.json({ sent });
  }

  /* ---------- 3) замену нашли ---------- */
  if (body.type === "replacement-found") {
    const entryId = Number(body.entryId);
    const oldMemberId = Number(body.oldMemberId);
    const newMemberId = Number(body.newMemberId);

    const { data: entry } = await supabase
      .from("schedule_entries")
      .select("schedule_date, service_time")
      .eq("id", entryId)
      .maybeSingle();

    const { data: inPlan } = await supabase
      .from("schedule_entry_members")
      .select("team_member_id")
      .eq("schedule_entry_id", entryId)
      .eq("team_member_id", newMemberId)
      .maybeSingle();

    if (!entry || !inPlan) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const [oldM, newM, admins] = await Promise.all([
      userIdOfMember(supabase, oldMemberId),
      userIdOfMember(supabase, newMemberId),
      getAdminIds(supabase),
    ]);

    const when = `${shortDate(entry.schedule_date)} (${serviceTimeLabel(entry.service_time)})`;

    sent += await sendToUsers(supabase, [newM.userId].filter((id) => id !== caller.id), {
      title: "TLight — ты заменяешь",
      body: `${newM.firstName}, ты заменяешь ${oldM.firstName || "служителя"} ${when}. Спасибо!`,
      url: "/schedule",
      tag: `replace-new-${entryId}-${newMemberId}`,
    });

    sent += await sendToUsers(
      supabase,
      [oldM.userId, ...admins].filter((id) => id !== caller.id && id !== newM.userId),
      {
        title: "TLight — замена найдена",
        body: `${oldM.name || "Служитель"}: ${when} заменит ${newM.name}.`,
        url: "/schedule",
        tag: `replace-found-${entryId}-${oldMemberId}`,
      },
    );

    return NextResponse.json({ sent });
  }

  /* ---------- задачи проектов ---------- */
  if (
    body.type === "task-assigned" ||
    body.type === "task-claimed" ||
    body.type === "task-done"
  ) {
    const itemId = Number(body.itemId);

    const { data: item } = await supabase
      .from("work_items")
      .select("id, title, status, assigned_to, project_id")
      .eq("id", itemId)
      .maybeSingle();

    if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

    const { data: project } = await supabase
      .from("work_projects")
      .select("id, title, created_by")
      .eq("id", item.project_id)
      .maybeSingle();

    const projectTitle = project?.title ?? "";
    const url = `/work/${item.project_id}`;

    /* 4) задача назначена */
    if (body.type === "task-assigned") {
      if (!item.assigned_to) return NextResponse.json({ sent: 0 });

      const member = await userIdOfMember(supabase, item.assigned_to as number);

      if (member.userId && member.userId !== caller.id) {
        sent += await sendToUsers(supabase, [member.userId], {
          title: "TLight — тебе задача",
          body: `${member.firstName}, тебе назначена задача «${item.title}» (${projectTitle}).`,
          url,
          tag: `task-assigned-${item.id}`,
        });
      }

      return NextResponse.json({ sent });
    }

    /* 6) человек записался на задачу */
    if (body.type === "task-claimed") {
      const { data: me } = await supabase
        .from("team_members")
        .select("id, first_name, last_name")
        .eq("user_id", caller.id)
        .maybeSingle();

      if (!me) return NextResponse.json({ sent: 0 });

      const { data: row } = await supabase
        .from("work_item_members")
        .select("item_id")
        .eq("item_id", itemId)
        .eq("member_id", me.id)
        .maybeSingle();

      if (!row) return NextResponse.json({ sent: 0 });

      const recipients = await getProjectAdminIds(supabase, caller.id);

      sent += await sendToUsers(supabase, recipients, {
        title: "TLight — записались на задачу",
        body: `${me.first_name} ${me.last_name} взял(а): «${item.title}» (${projectTitle}).`,
        url,
        tag: `task-claimed-${item.id}-${me.id}`,
      });

      return NextResponse.json({ sent });
    }

    /* 7) задача выполнена (и проект завершён) */
    if (item.status !== "completed") return NextResponse.json({ sent: 0 });

    const muted = await getMutedIds(supabase);
    const admins = await getProjectAdminIds(supabase, caller.id);
    const creator = project?.created_by as string | null | undefined;

    const recipients = [
      ...admins,
      ...(creator && creator !== caller.id && !muted.has(creator) ? [creator] : []),
    ];

    const { data: who } = await supabase
      .from("team_members")
      .select("first_name")
      .eq("user_id", caller.id)
      .maybeSingle();

    sent += await sendToUsers(supabase, recipients, {
      title: "TLight — задача выполнена",
      body: `${who?.first_name ?? "Кто-то"} выполнил(а): «${item.title}» (${projectTitle}).`,
      url,
      tag: `task-done-${item.id}`,
    });

    const { data: siblings } = await supabase
      .from("work_items")
      .select("status")
      .eq("project_id", item.project_id);

    if (siblings && siblings.length > 0 && siblings.every((row) => row.status === "completed")) {
      sent += await sendToUsers(supabase, recipients, {
        title: "TLight — проект завершён",
        body: `Все задачи проекта «${projectTitle}» выполнены.`,
        url,
        tag: `project-done-${item.project_id}`,
      });
    }

    return NextResponse.json({ sent });
  }

  /* ---------- 8) идеи ---------- */
  if (body.type === "idea-new") {
    const ideaId = Number(body.ideaId);

    const { data: idea } = await supabase
      .from("team_ideas")
      .select("id, body, author_id, author_name")
      .eq("id", ideaId)
      .maybeSingle();

    if (!idea || idea.author_id !== caller.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const recipients = await getProjectAdminIds(supabase, caller.id);
    const preview =
      idea.body.length > 90 ? `${idea.body.slice(0, 90)}…` : idea.body;

    sent += await sendToUsers(supabase, recipients, {
      title: "TLight — новая идея",
      body: `${idea.author_name || "Кто-то"}: ${preview}`,
      url: "/ideas",
      tag: `idea-${idea.id}`,
    });

    return NextResponse.json({ sent });
  }

  if (body.type === "idea-reaction") {
    const ideaId = Number(body.ideaId);
    const emoji = String(body.emoji ?? "");

    const { data: reaction } = await supabase
      .from("team_idea_reactions")
      .select("idea_id")
      .eq("idea_id", ideaId)
      .eq("user_id", caller.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (!reaction) return NextResponse.json({ sent: 0 });

    const { data: idea } = await supabase
      .from("team_ideas")
      .select("id, author_id")
      .eq("id", ideaId)
      .maybeSingle();

    const muted = await getMutedIds(supabase);

    if (!idea?.author_id || idea.author_id === caller.id || muted.has(idea.author_id as string)) {
      return NextResponse.json({ sent: 0 });
    }

    const { data: who } = await supabase
      .from("team_members")
      .select("first_name")
      .eq("user_id", caller.id)
      .maybeSingle();

    sent += await sendToUsers(supabase, [idea.author_id as string], {
      title: "TLight — реакция на твою идею",
      body: `${who?.first_name ?? "Кто-то"} отреагировал(а) на твою идею.`,
      url: "/ideas",
      tag: `idea-reaction-${idea.id}`,
    });

    return NextResponse.json({ sent });
  }

  return NextResponse.json({ error: "unknown type" }, { status: 400 });
}