"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { notifyEvent } from "@/lib/notify";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { shortTitle } from "@/lib/shortTitle";

type Entry = {
  id: number;
  schedule_date: string;
  service_time: string;
  title_de: string | null;
  title_ru: string | null;
  teen_title_de: string | null;
  teen_title_ru: string | null;
  teen_text_de: string | null;
  teen_text_ru: string | null;
};

type Rsvp = {
  id: number;
  schedule_entry_id: number;
  first_name: string;
  last_name: string;
  teen_id: number | null;
};

type EventRow = {
  id: number;
  title: string;
  start_at: string;
  category: string;
  show_teens: boolean | null;
};

type Draft = { title: string; text: string };

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const byName = (a: { first_name: string; last_name: string }, b: { first_name: string; last_name: string }) =>
  `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, "de", {
    sensitivity: "base",
  });

export default function TeensHubAdminPage() {
  const router = useRouter();
  const toast = useToast();
  const { language } = useLanguage();
  const isRu = language === "ru";

  const [isAdmin, setIsAdmin] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [serving, setServing] = useState<Record<number, string[]>>({});
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [openId, setOpenId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setIsAdmin(profile?.role === "admin");
    }

    const { data: entryData } = await supabase
      .from("schedule_entries")
      .select(
        "id, schedule_date, service_time, title_de, title_ru, teen_title_de, teen_title_ru, teen_text_de, teen_text_ru",
      )
      .eq("entry_type", "lesson")
      .gte("schedule_date", todayKey())
      .order("schedule_date", { ascending: true })
      .order("service_time", { ascending: true })
      .limit(8);

    const list = (entryData ?? []) as Entry[];
    setEntries(list);

    if (list.length > 0) {
      const ids = list.map((entry) => entry.id);

      const [{ data: rsvpData }, { data: links }] = await Promise.all([
        supabase
          .from("lesson_rsvp")
          .select("id, schedule_entry_id, first_name, last_name, teen_id")
          .in("schedule_entry_id", ids),
        supabase.from("schedule_entry_members").select("schedule_entry_id, team_member_id").in("schedule_entry_id", ids),
      ]);

      setRsvps(((rsvpData ?? []) as Rsvp[]).sort(byName));

      const memberIds = Array.from(new Set((links ?? []).map((row) => row.team_member_id as number)));
      const names = new Map<number, string>();

      if (memberIds.length > 0) {
        const { data: members } = await supabase
          .from("team_members")
          .select("id, first_name, last_name")
          .in("id", memberIds);

        for (const member of members ?? []) {
          names.set(member.id as number, `${member.first_name} ${member.last_name}`.trim());
        }
      }

      const map: Record<number, string[]> = {};
      for (const link of links ?? []) {
        const name = names.get(link.team_member_id as number);
        if (name) (map[link.schedule_entry_id as number] ??= []).push(name);
      }
      setServing(map);
    } else {
      setRsvps([]);
      setServing({});
    }

    const { data: eventData } = await supabase
      .from("events")
      .select("id, title, start_at, category, show_teens")
      .gte("end_at", new Date().toISOString())
      .neq("category", "work")
      .order("start_at", { ascending: true })
      .limit(40);

    setEvents((eventData ?? []) as EventRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/t`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* без буфера обмена ничего не делаем */
    }
  }

  function openEditor(entry: Entry) {
    if (openId === entry.id) {
      setOpenId(null);
      return;
    }

    const german = entry.service_time === "10:00";

    setDrafts((current) => ({
      ...current,
      [entry.id]: {
        title: (german ? entry.teen_title_de : entry.teen_title_ru) ?? "",
        text: (german ? entry.teen_text_de : entry.teen_text_ru) ?? "",
      },
    }));
    setOpenId(entry.id);
  }

  async function saveTexts(entry: Entry) {
    const draft = drafts[entry.id];
    if (!draft) return;

    const german = entry.service_time === "10:00";
    setSavingId(entry.id);

    const payload = german
      ? { teen_title_de: draft.title.trim() || null, teen_text_de: draft.text.trim() || null }
      : { teen_title_ru: draft.title.trim() || null, teen_text_ru: draft.text.trim() || null };

    const { error } = await supabase.from("schedule_entries").update(payload).eq("id", entry.id);

    setSavingId(null);

    if (error) {
      console.error("Save teen text error:", error);
      toast.error(isRu ? "Не удалось сохранить." : "Speichern fehlgeschlagen.");
      return;
    }

    toast.success(isRu ? "Сохранено" : "Gespeichert");
    setOpenId(null);
    await load();
  }

  async function removeRsvp(id: number) {
    setRsvps((current) => current.filter((row) => row.id !== id));
    await supabase.from("lesson_rsvp").delete().eq("id", id);
  }

  async function toggleEvent(event: EventRow) {
    const next = !event.show_teens;

    setEvents((current) => current.map((row) => (row.id === event.id ? { ...row, show_teens: next } : row)));

    const { error } = await supabase.from("events").update({ show_teens: next }).eq("id", event.id);

    if (error) {
      console.error("Toggle show_teens error:", error);
      toast.error(isRu ? "Не удалось изменить." : "Änderung fehlgeschlagen.");
      load();
    }
  }

  async function notifyTeens(event: EventRow) {
    const ok = window.confirm(
      isRu
        ? `Отправить подросткам уведомление о событии «${event.title}»?`
        : `Teens über „${event.title}“ benachrichtigen?`,
    );

    if (!ok) return;

    await notifyEvent({ type: "teen-event", eventId: event.id });
    toast.success(isRu ? "Уведомление отправлено" : "Benachrichtigung gesendet");
  }

  const locale = isRu ? "ru-RU" : "de-DE";

  const dateLabel = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  const eventDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Berlin" });

  const card = "rounded-[22px] border border-[#e9e3d3] bg-white";
  const label = "text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9585]";
  const input =
    "w-full rounded-xl border border-[#e4e2d9] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1b2431]";

  return (
    <main className="min-h-screen bg-[#faf8f3] px-4 pb-28 pt-6 text-[#1b2431]">
      <div className="mx-auto max-w-[620px]">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-4 flex items-center gap-1.5 text-[13px] font-semibold text-[#6f6a5c]"
        >
          <ArrowLeft size={15} />
          {isRu ? "Назад" : "Zurück"}
        </button>

        <p className={label}>{isRu ? "Для команды" : "Für das Team"}</p>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-[-0.02em]">
          {isRu ? "Страница подростков" : "Teens-Seite"}
        </h1>

        {/* что видят подростки */}
        <section className="mt-5">
          <p className={`${label} mb-2`}>{isRu ? "Что видят подростки" : "Was Teens sehen"}</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => router.push("/t?service=10:00")}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#1b2431] text-[14px] font-bold text-[#ffc93c] active:scale-[0.98]"
            >
              <ExternalLink size={15} />
              10:00 · Deutsch
            </button>

            <button
              type="button"
              onClick={() => router.push("/t?service=12:30")}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#1b2431] text-[14px] font-bold text-[#ffc93c] active:scale-[0.98]"
            >
              <ExternalLink size={15} />
              12:30 · Русский
            </button>
          </div>

          <button
            type="button"
            onClick={copyLink}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#e9e3d3] bg-white text-[13px] font-bold active:scale-[0.99]"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied
              ? isRu ? "Ссылка скопирована" : "Link kopiert"
              : isRu ? "Скопировать ссылку для подростков" : "Link für Teens kopieren"}
          </button>
        </section>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 size={22} className="animate-spin text-[#8a8678]" />
          </div>
        ) : (
          <>
            {/* уроки */}
            <section className="mt-8">
              <div className="mb-2 flex items-center justify-between">
                <p className={label}>{isRu ? "Ближайшие уроки" : "Nächste Unterrichte"}</p>
                <button
                  type="button"
                  onClick={() => router.push("/schedule")}
                  className="text-[12px] font-bold text-[#9a6b00] underline"
                >
                  {isRu ? "Открыть расписание" : "Dienstplan öffnen"}
                </button>
              </div>

              {entries.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#d9d3c1] bg-white px-5 py-8 text-center text-sm text-[#8a8678]">
                  {isRu ? "Ближайших уроков в расписании нет." : "Keine kommenden Unterrichte im Plan."}
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const german = entry.service_time === "10:00";
                    const topic =
                      (german ? entry.title_de || entry.title_ru : entry.title_ru || entry.title_de) || "";
                    const teenTitle = (german ? entry.teen_title_de : entry.teen_title_ru) || "";
                    const rows = rsvps.filter((row) => row.schedule_entry_id === entry.id);
                    const open = openId === entry.id;
                    const draft = drafts[entry.id];

                    return (
                      <div key={entry.id} className={`${card} overflow-hidden`}>
                        <div className="flex items-center justify-between gap-3 bg-[#1b2431] px-4 py-3.5 text-white">
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold capitalize text-[#ffc93c]">
                              {dateLabel(entry.schedule_date)} · {entry.service_time} · {german ? "DE" : "RU"}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[14px] font-bold leading-snug">{topic}</p>
                          </div>

                          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#ffc93c] px-3 py-1 text-[13px] font-extrabold text-[#1b2431]">
                            <Users size={13} />
                            {rows.length}
                          </span>
                        </div>

                        <div className="space-y-3 p-4">
                          <div>
                            <p className={label}>{isRu ? "Служат" : "Es dienen"}</p>
                            <p className="mt-0.5 text-[14px] font-semibold">
                              {(serving[entry.id] ?? []).length > 0
                                ? (serving[entry.id] ?? []).join(", ")
                                : isRu ? "Не назначены" : "Nicht festgelegt"}
                            </p>
                          </div>

                          <div>
                            <p className={label}>{isRu ? "Подростки видят" : "Teens sehen"}</p>
                            <p className="mt-0.5 text-[14px] font-semibold">
                              {teenTitle || shortTitle(topic)}
                              {!teenTitle && (
                                <span className="ml-1.5 text-[11px] font-medium text-[#9a9585]">
                                  {isRu ? "(сокращено автоматически)" : "(automatisch gekürzt)"}
                                </span>
                              )}
                            </p>
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openEditor(entry)}
                              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e9e3d3] text-[13px] font-bold active:scale-[0.99]"
                            >
                              <Pencil size={14} />
                              {isRu ? "Текст для подростков" : "Text für Teens"}
                              <ChevronDown size={14} className={open ? "rotate-180" : ""} />
                            </button>
                          )}

                          {open && draft && (
                            <div className="space-y-2.5 rounded-2xl bg-[#faf8f3] p-3">
                              <div>
                                <p className={`${label} mb-1`}>
                                  {isRu ? "Короткое название" : "Kurzer Titel"}
                                </p>
                                <input
                                  value={draft.title}
                                  onChange={(event) =>
                                    setDrafts((current) => ({
                                      ...current,
                                      [entry.id]: { ...draft, title: event.target.value },
                                    }))
                                  }
                                  placeholder={shortTitle(topic)}
                                  className={input}
                                />
                              </div>

                              <div>
                                <p className={`${label} mb-1`}>
                                  {isRu ? "Описание или вопрос недели" : "Beschreibung oder Frage der Woche"}
                                </p>
                                <textarea
                                  value={draft.text}
                                  onChange={(event) =>
                                    setDrafts((current) => ({
                                      ...current,
                                      [entry.id]: { ...draft, text: event.target.value },
                                    }))
                                  }
                                  rows={3}
                                  className={input}
                                />
                              </div>

                              <p className="text-[11px] leading-4 text-[#9a9585]">
                                {isRu
                                  ? "Если оставить пустым, название сократится автоматически из темы расписания."
                                  : "Bleibt es leer, wird das Thema aus dem Plan automatisch gekürzt."}
                              </p>

                              <button
                                type="button"
                                disabled={savingId === entry.id}
                                onClick={() => saveTexts(entry)}
                                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#1b2431] text-[14px] font-bold text-[#ffc93c] disabled:opacity-50"
                              >
                                {savingId === entry.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : isRu ? "Сохранить" : "Speichern"}
                              </button>
                            </div>
                          )}

                          <div>
                            <p className={`${label} mb-1`}>
                              {isRu ? "Кто отметился" : "Wer sich eingetragen hat"}
                            </p>

                            {rows.length === 0 ? (
                              <p className="text-[13px] text-[#8a8678]">
                                {isRu ? "Пока никто." : "Noch niemand."}
                              </p>
                            ) : (
                              <ul className="divide-y divide-[#f0ebdc] rounded-2xl border border-[#f0ebdc]">
                                {rows.map((row) => (
                                  <li key={row.id} className="flex items-center gap-3 px-3 py-2">
                                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                                      {row.first_name} {row.last_name}
                                    </span>

                                    {row.teen_id && (
                                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                        <UserCheck size={11} />
                                        {isRu ? "в базе" : "in DB"}
                                      </span>
                                    )}

                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => removeRsvp(row.id)}
                                        aria-label={isRu ? "Удалить" : "Löschen"}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#a1a4a0] active:bg-black/5"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* события */}
            <section className="mt-8">
              <div className="mb-2 flex items-center justify-between">
                <p className={label}>{isRu ? "События для подростков" : "Termine für Teens"}</p>
                <button
                  type="button"
                  onClick={() => router.push("/calendar")}
                  className="flex items-center gap-1 text-[12px] font-bold text-[#9a6b00] underline"
                >
                  <CalendarDays size={12} />
                  {isRu ? "Календарь" : "Kalender"}
                </button>
              </div>

              {events.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#d9d3c1] bg-white px-5 py-8 text-center text-sm text-[#8a8678]">
                  {isRu ? "Ближайших событий нет." : "Keine kommenden Termine."}
                </div>
              ) : (
                <ul className={`${card} divide-y divide-[#f0ebdc] overflow-hidden`}>
                  {events.map((event) => (
                    <li key={event.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold">{event.title}</p>
                        <p className="text-[12px] capitalize text-[#8a8678]">{eventDate(event.start_at)}</p>
                      </div>

                      {isAdmin && event.show_teens && (
                        <button
                          type="button"
                          onClick={() => notifyTeens(event)}
                          aria-label={isRu ? "Отправить уведомление" : "Benachrichtigung senden"}
                          title={isRu ? "Отправить уведомление подросткам" : "Teens benachrichtigen"}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff4d1] text-[#9a6b00] active:scale-95"
                        >
                          <Bell size={15} />
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => toggleEvent(event)}
                        aria-label={isRu ? "Показывать подросткам" : "Teens anzeigen"}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                          event.show_teens ? "bg-[#1b2431]" : "bg-[#d6d2c3]"
                        } ${isAdmin ? "" : "opacity-60"}`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                            event.show_teens ? "left-[26px]" : "left-1"
                          }`}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-2 text-[12px] leading-5 text-[#8a8678]">
                {isRu
                  ? "Включённое событие видят подростки. Колокольчик отправляет им уведомление вручную."
                  : "Eingeschaltete Termine sehen Teens. Die Glocke sendet ihnen manuell eine Benachrichtigung."}
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}