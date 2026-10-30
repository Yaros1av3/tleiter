"use client";

import { CalendarDays, CalendarPlus, Check, Clock3, MapPin } from "lucide-react";

import EventIcon from "@/components/EventIcon";
import HeroScene from "@/components/HeroScene";
import {
  buildIcs,
  canAddToCalendar,
  formatEventDate,
  googleCalendarUrl,
  pickText,
  themeOf,
} from "@/lib/forms";

type Lang = "de" | "ru";

type TicketForm = {
  slug: string;
  title_de: string;
  title_ru: string;
  desc_de: string;
  desc_ru: string;
  event_date: string | null;
  event_time: string;
  location: string;
  emoji: string;
  theme: string;
};

const T = {
  de: {
    badge: "Du bist dabei!",
    guest: "Teilnehmer",
    date: "Datum",
    time: "Uhrzeit",
    place: "Ort",
    calendar: "In den Kalender eintragen",
    google: "Google Kalender",
    hint: "Mach einen Screenshot – dann hast du alles immer griffbereit.",
    reminder: "Der Kalender erinnert dich einen Tag vorher.",
    another: "Weitere Person anmelden",
  },
  ru: {
    badge: "Ты записан(а)!",
    guest: "Участник",
    date: "Дата",
    time: "Время",
    place: "Место",
    calendar: "Добавить в календарь",
    google: "Google Календарь",
    hint: "Сделай скриншот — и вся важная информация всегда под рукой.",
    reminder: "Календарь напомнит за день до события.",
    another: "Записать ещё одного человека",
  },
};

export default function TicketCard({
  form,
  name,
  lang,
  onAnother,
}: {
  form: TicketForm;
  name: string;
  lang: Lang;
  onAnother: () => void;
}) {
  const t = T[lang];
  const theme = themeOf(form.theme);
  const title = pickText(form.title_de, form.title_ru, lang);
  const dateLabel = form.event_date ? formatEventDate(form.event_date, lang) : "";
  const calendarOk = canAddToCalendar(form);

  function downloadIcs() {
    const content = buildIcs(form, lang);
    if (!content) return;

    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form.slug}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const rows = [
    dateLabel ? { icon: CalendarDays, label: t.date, value: dateLabel } : null,
    form.event_time ? { icon: Clock3, label: t.time, value: form.event_time } : null,
    form.location ? { icon: MapPin, label: t.place, value: form.location } : null,
  ].filter(Boolean) as { icon: typeof CalendarDays; label: string; value: string }[];

  return (
    <div className="mt-4">
      <div className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_14px_40px_rgba(17,24,32,0.14)]">
        {/* верх: название на фоне темы */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${theme.hero} px-6 pb-9 pt-6 text-white`}>
          <HeroScene scene={theme.scene} />

          <div className="relative flex items-center gap-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${theme.accent}`}>
              <Check size={20} strokeWidth={3} />
            </span>
            <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-white/90">
              {t.badge}
            </span>
          </div>

          <div className="relative mt-5 flex items-start justify-between gap-3">
            <h2 className="min-w-0 text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em]">
              {title}
            </h2>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <EventIcon name={form.emoji} size={24} />
            </span>
          </div>
        </div>

        {/* середина: имя и главное */}
        <div className="px-6 pb-6 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
            {t.guest}
          </p>
          <p className="mt-0.5 break-words text-[22px] font-extrabold tracking-[-0.02em] text-[#111820]">
            {name}
          </p>

          <div className="mt-5 space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.soft}`}
                >
                  <row.icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                    {row.label}
                  </p>
                  <p className="break-words text-[16px] font-bold text-[#111820]">
                    {row.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* перфорация */}
        <div className="relative">
          <div className="mx-6 border-t-2 border-dashed border-neutral-200" />
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#f7f7f6]" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#f7f7f6]" />
        </div>

        {/* низ: календарь */}
        <div className="space-y-2.5 px-6 pb-6 pt-5">
          {calendarOk && (
            <>
              <button
                type="button"
                onClick={downloadIcs}
                className={`flex h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl text-[15px] font-bold active:scale-[0.99] ${theme.accent}`}
              >
                <CalendarPlus size={19} />
                {t.calendar}
              </button>

              <a
                href={googleCalendarUrl(form, lang)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center rounded-2xl border border-neutral-200 text-[14px] font-semibold text-neutral-600 active:scale-[0.99]"
              >
                {t.google}
              </a>

              <p className="px-1 text-center text-[12px] text-neutral-400">{t.reminder}</p>
            </>
          )}

          <p className="px-1 pt-1 text-center text-[12px] text-neutral-400">{t.hint}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onAnother}
        className="mt-4 block w-full text-center text-[13px] font-semibold text-neutral-400 underline underline-offset-4"
      >
        {t.another}
      </button>
    </div>
  );
}