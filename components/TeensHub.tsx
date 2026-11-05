"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarDays,
  Check,
  ExternalLink,
  Loader2,
  Link2,
  MapPin,
  Share,
  Users,
} from "lucide-react";

type Lang = "de" | "ru";

type Lesson = {
  id: number;
  date: string;
  time: string;
  title_de: string | null;
  title_ru: string | null;
  bible_text: string | null;
  series: string | null;
  serving: string[];
  going: number;
};

type TeenEvent = {
  id: number;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string | null;
  link_url: string | null;
};

import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

const TEXT = {
  de: {
    label: "TLight Teens",
    next: "Nächster Unterricht",
    noLesson: "Noch kein Unterricht geplant.",
    topicOpen: "Thema folgt",
    serving: "Es dienen",
    nobody: "Wird noch festgelegt",
    imComing: "Ich komme",
    nameHint: "Trag deinen Namen ein",
    first: "Vorname",
    last: "Nachname",
    confirm: "Eintragen",
    youAre: "Du bist eingetragen",
    cancel: "Doch nicht",
    coming: "kommen",
    events: "Nächste Termine",
    noEvents: "Zurzeit keine Termine.",
    register: "Anmelden",
    notify: "Benachrichtigungen",
    notifyText: "Wir sagen dir Bescheid, wenn ein Unterricht ansteht oder ein neuer Termin dazukommt.",
    enable: "Einschalten",
    disable: "Ausschalten",
    enabled: "Benachrichtigungen sind an",
    iosTitle: "Zuerst auf den Home-Bildschirm",
    iosSteps: "Tippe unten auf Teilen, dann auf „Zum Home-Bildschirm“. Öffne die App von dort und schalte die Benachrichtigungen ein.",
    unsupported: "Dieser Browser unterstützt keine Benachrichtigungen.",
    denied: "Benachrichtigungen sind blockiert. Erlaube sie in den Einstellungen.",
    error: "Das hat nicht geklappt. Bitte versuche es nochmal.",
    nameError: "Bitte Vor- und Nachname eintragen.",
    loadError: "Konnte nicht geladen werden.",
    retry: "Nochmal",
    today: "Heute",
    locale: "de-DE",
  },
  ru: {
    label: "TLight Teens",
    next: "Ближайший урок",
    noLesson: "Урок пока не запланирован.",
    topicOpen: "Тема скоро появится",
    serving: "Служат",
    nobody: "Пока не назначены",
    imComing: "Я буду",
    nameHint: "Впиши своё имя",
    first: "Имя",
    last: "Фамилия",
    confirm: "Отметиться",
    youAre: "Ты отмечен(а)",
    cancel: "Не смогу",
    coming: "придут",
    events: "Ближайшие события",
    noEvents: "Пока нет событий.",
    register: "Записаться",
    notify: "Уведомления",
    notifyText: "Мы напомним про урок и расскажем, когда появится новое событие.",
    enable: "Включить",
    disable: "Выключить",
    enabled: "Уведомления включены",
    iosTitle: "Сначала на главный экран",
    iosSteps: "Нажми внизу «Поделиться», затем «На экран Домой». Открой приложение оттуда и включи уведомления.",
    unsupported: "Этот браузер не поддерживает уведомления.",
    denied: "Уведомления заблокированы. Разреши их в настройках.",
    error: "Не получилось. Попробуй ещё раз.",
    nameError: "Впиши имя и фамилию.",
    loadError: "Не удалось загрузить.",
    retry: "Ещё раз",
    today: "Сегодня",
    locale: "ru-RU",
  },
} as const;

function safeGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* без хранилища всё работает, просто не запоминаем */
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function isIosBrowser() {
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const standalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return ios && !standalone;
}

export default function TeensHub() {
  const [lang, setLang] = useState<Lang>("de");
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [events, setEvents] = useState<TeenEvent[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadDetail, setLoadDetail] = useState("");
  const [isTeam, setIsTeam] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [nameError, setNameError] = useState(false);

  const [supported, setSupported] = useState(true);
  const [iosInstall, setIosInstall] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState("");

  const t = TEXT[lang];

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/t/info", { cache: "no-store" });
      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as { detail?: string } | null;
        setLoadDetail(failure?.detail ?? "");
        throw new Error("load");
      }
      const data = (await response.json()) as { lessons: Lesson[]; events: TeenEvent[] };
      setLessons(data.lessons);
      setEvents(data.events);
      setLoadFailed(false);

      const stored: Record<number, boolean> = {};
      for (const lesson of data.lessons) {
        if (safeGet(`teens-rsvp-${lesson.id}`) === "1") stored[lesson.id] = true;
      }
      setMarked(stored);
    } catch {
      setLoadFailed(true);
      setLessons((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    const savedLang = safeGet("teens-lang");
    setLang(
      savedLang === "ru" || savedLang === "de"
        ? savedLang
        : navigator.language.toLowerCase().startsWith("ru")
          ? "ru"
          : "de",
    );

    setFirstName(safeGet("teens-first") ?? "");
    setLastName(safeGet("teens-last") ?? "");

    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    setIosInstall(isIosBrowser());

    if (ok) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setSubscribed(Boolean(subscription)))
        .catch(() => undefined);
    }

    // залогиненным служителям показываем ссылки на редактирование
    supabase.auth
      .getSession()
      .then(({ data }) => setIsTeam(Boolean(data.session)))
      .catch(() => undefined);

    load();
  }, [load]);

  function changeLang(next: Lang) {
    setLang(next);
    safeSet("teens-lang", next);
  }

  async function rsvp(lesson: Lesson, going: boolean) {
    const first = firstName.trim();
    const last = lastName.trim();

    if (going && (!first || !last)) {
      setNameError(true);
      return;
    }

    setNameError(false);
    setBusyId(lesson.id);

    // при отмене берём имя, под которым отмечались
    const sendFirst = going ? first : (safeGet("teens-first") ?? first);
    const sendLast = going ? last : (safeGet("teens-last") ?? last);

    try {
      const response = await fetch("/api/t/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_id: lesson.id,
          first_name: sendFirst,
          last_name: sendLast,
          going,
        }),
      });

      if (!response.ok) {
        setNameError(response.status === 422);
        if (response.status !== 422) setPushMessage(t.error);
        setBusyId(null);
        return;
      }

      if (going) {
        safeSet("teens-first", first);
        safeSet("teens-last", last);
      }

      safeSet(`teens-rsvp-${lesson.id}`, going ? "1" : null);
      setMarked((current) => ({ ...current, [lesson.id]: going }));
      await load();
    } catch {
      setPushMessage(t.error);
    }

    setBusyId(null);
  }

  async function enablePush() {
    setPushBusy(true);
    setPushMessage("");

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setPushMessage(t.denied);
        setPushBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const response = await fetch("/api/t/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), lang }),
      });

      if (!response.ok) throw new Error("subscribe");
      setSubscribed(true);
    } catch {
      setPushMessage(t.error);
    }

    setPushBusy(false);
  }

  async function disablePush() {
    setPushBusy(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/t/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unsubscribe: true, endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setSubscribed(false);
    } catch {
      setPushMessage(t.error);
    }

    setPushBusy(false);
  }

  const dateLabel = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(t.locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const eventDay = (iso: string) =>
    new Date(iso).toLocaleDateString(t.locale, { day: "numeric", timeZone: "Europe/Berlin" });

  const eventMonth = (iso: string) =>
    new Date(iso).toLocaleDateString(t.locale, { month: "short", timeZone: "Europe/Berlin" });

  const eventWhen = (event: TeenEvent) => {
    const start = new Date(event.start_at);
    const weekday = start.toLocaleDateString(t.locale, {
      weekday: "long",
      timeZone: "Europe/Berlin",
    });
    const time = start.toLocaleTimeString(t.locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });

    return time === "00:00" ? weekday : `${weekday}, ${time}`;
  };

  const title = (lesson: Lesson) =>
    (lang === "ru" ? lesson.title_ru || lesson.title_de : lesson.title_de || lesson.title_ru) || "";

  const card = "rounded-[22px] border border-[#e9e3d3] bg-white";

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-[#faf8f3] text-[#1b2431] [overflow-wrap:anywhere]">
      <div className="mx-auto w-full max-w-[520px] px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {/* шапка */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/tlite-logo.png"
              alt="TLight"
              width={44}
              height={44}
              priority
              className="h-11 w-11 shrink-0 rounded-[13px]"
            />
            <div>
              <div className="text-[19px] font-extrabold leading-none tracking-[-0.03em]">TLight</div>
              <div className="mt-1 text-[9px] font-bold uppercase leading-none tracking-[0.16em] text-[#9a9585]">
                Teens
              </div>
            </div>
          </div>

          <div className="flex rounded-full bg-white p-1 ring-1 ring-[#e9e3d3]">
            {(["de", "ru"] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => changeLang(code)}
                className={`h-7 min-w-9 rounded-full px-3 text-[11px] font-bold uppercase transition ${
                  lang === code ? "bg-[#1b2431] text-[#ffc93c]" : "text-[#8a8678]"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {isTeam && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-2xl bg-[#1b2431] px-3 py-2.5">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-[#ffc93c]">
              {lang === "ru" ? "Команде" : "Team"}
            </span>
            {[
              { href: "/schedule", label: lang === "ru" ? "Расписание" : "Dienstplan" },
              { href: "/calendar", label: lang === "ru" ? "События" : "Termine" },
              { href: "/rsvp", label: lang === "ru" ? "Кто придёт" : "Anmeldungen" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-white/12 px-3 text-[11px] font-bold text-white active:bg-white/20"
              >
                <Link2 size={11} />
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {lessons === null ? (
          <div className="mt-16 flex justify-center">
            <Loader2 size={24} className="animate-spin text-[#8a8678]" />
          </div>
        ) : (
          <>
            {loadFailed && (
              <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#fff4d1] px-4 py-3 text-[13px] font-semibold text-[#9a6b00]">
                {t.loadError}
                <button type="button" onClick={load} className="font-bold underline">
                  {t.retry}
                </button>
              </div>
            )}

            {loadFailed && loadDetail && (
              <p className="mt-2 break-words rounded-xl bg-white px-3 py-2 text-[11px] text-[#8a8678]">
                {loadDetail}
              </p>
            )}

            {/* ближайший урок */}
            <p className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9585]">
              {t.next}
            </p>

            {lessons.length === 0 ? (
              <div className={`${card} px-5 py-8 text-center text-[14px] text-[#8a8678]`}>
                {t.noLesson}
              </div>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson) => {
                  const done = marked[lesson.id];

                  return (
                    <div key={lesson.id} className="overflow-hidden rounded-[26px] bg-[#1b2431] text-white">
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[13px] font-bold capitalize text-[#ffc93c]">
                            {dateLabel(lesson.date)}
                          </span>
                          <span className="rounded-full bg-[#ffc93c] px-3 py-1 text-[12px] font-extrabold text-[#1b2431]">
                            {lesson.time}
                          </span>
                        </div>

                        <h1 className="mt-3 text-[24px] font-extrabold leading-tight tracking-[-0.02em]">
                          {title(lesson) || t.topicOpen}
                        </h1>

                        {(lesson.bible_text || lesson.series) && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {lesson.bible_text && (
                              <span className="rounded-full bg-white/12 px-3 py-1 text-[12px] font-semibold text-white/90">
                                {lesson.bible_text}
                              </span>
                            )}
                            {lesson.series && (
                              <span className="rounded-full bg-white/12 px-3 py-1 text-[12px] font-semibold text-white/90">
                                {lesson.series}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-4 border-t border-white/12 pt-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
                            {t.serving}
                          </p>
                          <p className="mt-1 text-[14px] font-semibold">
                            {lesson.serving.length > 0 ? lesson.serving.join(", ") : t.nobody}
                          </p>
                        </div>
                      </div>

                      {/* отметка */}
                      <div className="bg-[#fff4d1] p-4 text-[#1b2431]">
                        {done ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-[14px] font-bold">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1b2431] text-[#ffc93c]">
                                <Check size={15} strokeWidth={3} />
                              </span>
                              {t.youAre}
                            </div>
                            <button
                              type="button"
                              disabled={busyId === lesson.id}
                              onClick={() => rsvp(lesson, false)}
                              className="h-9 rounded-full border border-[#1b2431]/25 px-4 text-[12px] font-bold disabled:opacity-50"
                            >
                              {t.cancel}
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-[13px] font-bold">{t.imComing}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <input
                                value={firstName}
                                onChange={(event) => setFirstName(event.target.value)}
                                placeholder={t.first}
                                autoComplete="given-name"
                                className="h-11 min-w-0 rounded-xl border border-[#e9e3d3] bg-white px-3 text-[15px] outline-none focus:border-[#1b2431]"
                              />
                              <input
                                value={lastName}
                                onChange={(event) => setLastName(event.target.value)}
                                placeholder={t.last}
                                autoComplete="family-name"
                                className="h-11 min-w-0 rounded-xl border border-[#e9e3d3] bg-white px-3 text-[15px] outline-none focus:border-[#1b2431]"
                              />
                            </div>
                            {nameError && (
                              <p className="mt-2 text-[12px] font-semibold text-red-600">{t.nameError}</p>
                            )}
                            <button
                              type="button"
                              disabled={busyId === lesson.id}
                              onClick={() => rsvp(lesson, true)}
                              className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-[#1b2431] text-[14px] font-bold text-[#ffc93c] active:scale-[0.99] disabled:opacity-50"
                            >
                              {busyId === lesson.id ? <Loader2 size={16} className="animate-spin" /> : t.confirm}
                            </button>
                          </>
                        )}

                        {lesson.going > 0 && (
                          <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[#9a6b00]">
                            <Users size={13} />
                            {lesson.going} {t.coming}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* события */}
            <p className="mb-2 mt-8 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9585]">
              {t.events}
            </p>

            {events.length === 0 ? (
              <div className={`${card} px-5 py-7 text-center text-[14px] text-[#8a8678]`}>{t.noEvents}</div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className={`${card} p-4`}>
                    <div className="flex gap-3.5">
                      <div className="flex h-[58px] w-[54px] shrink-0 flex-col items-center justify-center rounded-2xl bg-[#fff4d1] text-[#9a6b00]">
                        <span className="text-[20px] font-extrabold leading-none">{eventDay(event.start_at)}</span>
                        <span className="mt-1 text-[10px] font-bold uppercase">{eventMonth(event.start_at)}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-[17px] font-extrabold leading-snug tracking-[-0.01em]">
                          {event.title}
                        </h2>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold capitalize text-[#8a8678]">
                          <CalendarDays size={12} />
                          {eventWhen(event)}
                        </p>
                        {event.location && (
                          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#8a8678]">
                            <MapPin size={12} className="shrink-0" />
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {event.description && (
                      <p className="mt-3 whitespace-pre-line text-[13px] leading-5 text-[#5c5a50]">
                        {event.description}
                      </p>
                    )}

                    {event.link_url && (
                      <a
                        href={event.link_url}
                        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ffc93c] text-[14px] font-bold text-[#1b2431] active:scale-[0.99]"
                      >
                        {t.register}
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* уведомления */}
            <div className={`${card} mt-8 p-4`}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff4d1] text-[#9a6b00]">
                  {subscribed ? <BellRing size={19} /> : <Bell size={19} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold">{subscribed ? t.enabled : t.notify}</p>
                  {!subscribed && <p className="mt-0.5 text-[12px] leading-4 text-[#8a8678]">{t.notifyText}</p>}
                </div>
              </div>

              {iosInstall ? (
                <div className="mt-3 rounded-xl bg-[#faf8f3] p-3">
                  <p className="flex items-center gap-2 text-[13px] font-bold">
                    <Share size={14} />
                    {t.iosTitle}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[#5c5a50]">{t.iosSteps}</p>
                </div>
              ) : !supported ? (
                <p className="mt-3 text-[12px] text-[#8a8678]">{t.unsupported}</p>
              ) : subscribed ? (
                <button
                  type="button"
                  disabled={pushBusy}
                  onClick={disablePush}
                  className="mt-3 h-10 w-full rounded-xl border border-[#e9e3d3] text-[13px] font-bold text-[#6f6a5c] disabled:opacity-50"
                >
                  {t.disable}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pushBusy}
                  onClick={enablePush}
                  className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#1b2431] text-[14px] font-bold text-[#ffc93c] active:scale-[0.99] disabled:opacity-50"
                >
                  {pushBusy ? <Loader2 size={16} className="animate-spin" /> : t.enable}
                </button>
              )}

              {pushMessage && <p className="mt-2 text-[12px] font-semibold text-red-600">{pushMessage}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}