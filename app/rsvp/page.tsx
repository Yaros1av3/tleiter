"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Pencil,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Entry = {
  id: number;
  schedule_date: string;
  service_time: string;
  title_de: string | null;
  title_ru: string | null;
};

type Rsvp = {
  id: number;
  schedule_entry_id: number;
  first_name: string;
  last_name: string;
  teen_id: number | null;
  created_at: string;
};

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return parts;
}

export default function RsvpPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isRu = language === "ru";

  const [entries, setEntries] = useState<Entry[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/t`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* без буфера обмена просто ничего не делаем */
    }
  }

  async function load() {
    const { data: entryData } = await supabase
      .from("schedule_entries")
      .select("id, schedule_date, service_time, title_de, title_ru")
      .eq("entry_type", "lesson")
      .gte("schedule_date", todayKey())
      .order("schedule_date", { ascending: true })
      .order("service_time", { ascending: true })
      .limit(8);

    const list = (entryData ?? []) as Entry[];
    setEntries(list);

    if (list.length > 0) {
      const { data: rsvpData } = await supabase
        .from("lesson_rsvp")
        .select("id, schedule_entry_id, first_name, last_name, teen_id, created_at")
        .in("schedule_entry_id", list.map((entry) => entry.id));

      setRsvps(
        ((rsvpData ?? []) as Rsvp[]).sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, "de", {
            sensitivity: "base",
          }),
        ),
      );
    } else {
      setRsvps([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(id: number) {
    setRsvps((current) => current.filter((row) => row.id !== id));
    await supabase.from("lesson_rsvp").delete().eq("id", id);
  }

  const dateLabel = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(isRu ? "ru-RU" : "de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

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

        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9585]">
          {isRu ? "Страница подростков" : "Teens-Seite"}
        </p>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-[-0.02em]">
          {isRu ? "Кто придёт на урок" : "Wer zum Unterricht kommt"}
        </h1>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => router.push("/t")}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1b2431] text-[13px] font-bold text-[#ffc93c] active:scale-[0.98]"
          >
            <ExternalLink size={15} />
            {isRu ? "Как видят подростки" : "So sehen es Teens"}
          </button>

          <button
            type="button"
            onClick={copyLink}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#e9e3d3] bg-white text-[13px] font-bold active:scale-[0.98]"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied
              ? isRu ? "Скопировано" : "Kopiert"
              : isRu ? "Копировать ссылку" : "Link kopieren"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/schedule")}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#e9e3d3] bg-white text-[13px] font-bold active:scale-[0.98]"
          >
            <Pencil size={15} />
            {isRu ? "Тема и служители" : "Thema & Dienste"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/calendar")}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#e9e3d3] bg-white text-[13px] font-bold active:scale-[0.98]"
          >
            <CalendarDays size={15} />
            {isRu ? "События" : "Termine"}
          </button>
        </div>

        <p className="mt-2 text-[12px] leading-5 text-[#8a8678]">
          {isRu
            ? "Тему и служителей урока меняйте в расписании. События для подростков добавляйте в календаре (включите «Показывать подросткам»)."
            : "Thema und Dienste im Dienstplan ändern. Termine für Teens im Kalender anlegen („Teens anzeigen“ einschalten)."}
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-[#8a8678]">{isRu ? "Загрузка..." : "Lädt..."}</p>
        ) : entries.length === 0 ? (
          <div className="mt-6 rounded-[22px] border border-dashed border-[#d9d3c1] bg-white px-5 py-8 text-center text-sm text-[#8a8678]">
            {isRu ? "Ближайших уроков в расписании нет." : "Keine kommenden Unterrichte im Plan."}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {entries.map((entry) => {
              const rows = rsvps.filter((row) => row.schedule_entry_id === entry.id);
              const topic = (isRu ? entry.title_ru || entry.title_de : entry.title_de || entry.title_ru) || "";

              return (
                <section key={entry.id} className="overflow-hidden rounded-[22px] border border-[#e9e3d3] bg-white">
                  <div className="flex items-center justify-between gap-3 bg-[#1b2431] px-4 py-3.5 text-white">
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold capitalize text-[#ffc93c]">
                        {dateLabel(entry.schedule_date)} · {entry.service_time}
                      </p>
                      {topic && <p className="mt-0.5 truncate text-[15px] font-bold">{topic}</p>}
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#ffc93c] px-3 py-1 text-[13px] font-extrabold text-[#1b2431]">
                      <Users size={13} />
                      {rows.length}
                    </span>
                  </div>

                  {rows.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-[#8a8678]">
                      {isRu ? "Пока никто не отметился." : "Noch niemand eingetragen."}
                    </p>
                  ) : (
                    <ul className="divide-y divide-[#f0ebdc]">
                      {rows.map((row) => (
                        <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                            {row.first_name} {row.last_name}
                          </span>
                          {row.teen_id && (
                            <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <UserCheck size={11} />
                              {isRu ? "в базе" : "in Datenbank"}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => remove(row.id)}
                            aria-label={isRu ? "Удалить" : "Löschen"}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#a1a4a0] active:bg-black/5"
                          >
                            <Trash2 size={15} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}