"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarOff,
  BookOpen,
  Bell,
  BellRing,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  Download,
  Flame,
  Home as HomeIcon,
  LogOut,
  Lightbulb,
  PartyPopper,
  Settings,
  Share,
  User,
  Users,
  X,
} from "lucide-react";

import TeensInstall from "@/components/TeensInstall";
import { shortTitle } from "@/lib/shortTitle";
import TeensAuth from "@/components/TeensAuth";
import TeensHint, { resetHints } from "@/components/TeensHint";
import TeensFeedback from "@/components/TeensFeedback";
import {
  AchievementsCard,
  CelebrationLayer,
  ProgressCard,
  TeensAnimStyles,
  VerseCard,
  type Celebration,
} from "@/components/TeensProgress";
import { ACHIEVEMENTS, berlinToday, computeStats, levelOf } from "@/lib/teensProgress";

type Lang = "de" | "ru";
type Service = "10:00" | "12:30";

type Lesson = {
  id: number;
  date: string;
  time: string;
  title_de: string | null;
  title_ru: string | null;
  bible_text: string | null;
  series: string | null;
  teen_title_de: string | null;
  teen_title_ru: string | null;
  teen_text_de: string | null;
  teen_text_ru: string | null;
  serving: string[];
  going: number;
};

type MeInfo = {
  participant: {
    id: number;
    first_name: string;
    last_name: string;
    nickname: string;
    lang: Lang;
    avatar_url: string | null;
  } | null;
  lessonDates: string[];
  attended: string[];
  going: number[];
};

type Tab = "home" | "me";

type Notice = {
  id: number;
  date: string;
  time: string;
  title_de: string | null;
  title_ru: string | null;
};

type TeenEvent = {
  id: number;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string | null;
  link_url: string | null;
  form: { slug: string; open: boolean } | null;
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/* 10:00 — немецкое служение, 12:30 — русское */
const LANG_OF: Record<Service, Lang> = { "10:00": "de", "12:30": "ru" };

const TEXT = {
  de: {
    next: "Nächster Unterricht",
    noLesson: "Für dieses Treffen ist noch kein Unterricht geplant.",
    noticeHead: "Kein Unterricht",
    topicOpen: "Thema folgt",
    serving: "Es dienen",
    nobody: "Wird noch festgelegt",
    imComing: "Ich komme",
    nameHint: "Trag dich kurz ein, dann wissen wir, dass du kommst.",
    first: "Vorname",
    last: "Nachname",
    confirm: "Eintragen",
    youAre: "Du bist eingetragen",
    cancel: "Doch nicht",
    coming: "kommen",
    events: "Nächste Termine",
    noEvents: "Zurzeit keine Termine.",
    register: "Zur Anmeldung",
    regOpen: "Anmeldung offen",
    regClosed: "Anmeldung geschlossen",
    tapHint: "Tippen zum Anmelden",
    installBanner: "App auf dem Handy installieren",
    installSub: "So bekommst du Benachrichtigungen.",
    installHow: "Wie?",
    installOpen: "Wie installieren?",
    installCardTitle: "App auf den Startbildschirm",
    installCardSub: "Öffnen mit einem Tipp. Wir zeigen dir, wie.",
    installLink: "So installierst du die App auf dem Handy",
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
    locale: "de-DE",
    hello: "Hallo",
    tabHome: "Start",
    tabChallenge: "Challenge",
    tabMe: "Ich",
    settings: "Einstellungen",
    service: "Gottesdienst",
    changeService: "Ändern",
    signOut: "Abmelden",
    welcomeTitle: "Willkommen bei TLight Teens",
    welcomeSub: "Unterricht, Bibel-Challenge und Preise in einer App.",
    chipLessons: "Unterricht",
    chipChallenge: "Challenge",
    chipEvents: "Termine",
    challengeSub: "Täglich lesen, Punkte sammeln, Preise gewinnen",
    comingBtn: "Ich komme!",
    hintStreak: "Die Flamme zeigt, wie oft du in Folge beim Unterricht warst. Tippe darauf für Details.",
    hintComing: "Tippe auf „Ich komme!“, damit wir wissen, dass du da bist. Der Unterricht zählt für deine Serie.",
    hintChallenge: "Hier liest du jeden Tag ein Kapitel und sammelst Punkte für Preise.",
    hintLevel: "XP sind Punkte für deine Unterrichte. Je mehr du sammelst, desto höher dein Level.",
    hintVerse: "Jeden Tag ein neuer Vers. Lies ihn in Ruhe und merke ihn dir.",
    showHints: "Tipps wieder anzeigen",
    hintsOn: "Tipps sind wieder an",
  },
  ru: {
    next: "Ближайший урок",
    noLesson: "Для этой встречи урок пока не запланирован.",
    noticeHead: "Урока не будет",
    topicOpen: "Тема скоро появится",
    serving: "Служат",
    nobody: "Пока не назначены",
    imComing: "Я буду",
    nameHint: "Впиши себя, чтобы мы знали, что ты придёшь.",
    first: "Имя",
    last: "Фамилия",
    confirm: "Отметиться",
    youAre: "Ты отмечен(а)",
    cancel: "Не смогу",
    coming: "придут",
    events: "Ближайшие события",
    noEvents: "Пока нет событий.",
    register: "Записаться",
    regOpen: "Запись открыта",
    regClosed: "Запись закрыта",
    tapHint: "Нажми, чтобы записаться",
    installBanner: "Установи приложение на телефон",
    installSub: "Так будут приходить уведомления.",
    installHow: "Как?",
    installOpen: "Как установить?",
    installCardTitle: "Приложение на главный экран",
    installCardSub: "Открывай одним касанием. Покажем, как это сделать.",
    installLink: "Как установить приложение на телефон",
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
    locale: "ru-RU",
    hello: "Привет",
    tabHome: "Главная",
    tabChallenge: "Челлендж",
    tabMe: "Я",
    settings: "Настройки",
    service: "Служение",
    changeService: "Изменить",
    signOut: "Выйти",
    welcomeTitle: "Добро пожаловать в TLight Teens",
    welcomeSub: "Уроки, Bibel-Challenge и призы в одном приложении.",
    chipLessons: "Уроки",
    chipChallenge: "Челлендж",
    chipEvents: "События",
    challengeSub: "Читай каждый день, собирай баллы, получай призы",
    comingBtn: "Я буду!",
    hintStreak: "Огонёк показывает, сколько уроков подряд ты был. Нажми на него, чтобы посмотреть подробнее.",
    hintComing: "Нажми «Я буду!», чтобы мы знали, что ты придёшь. Этот урок пойдёт в твою серию.",
    hintChallenge: "Здесь ты читаешь каждый день по главе и собираешь баллы за призы.",
    hintLevel: "XP это очки за уроки. Чем больше соберёшь, тем выше твой уровень.",
    hintVerse: "Каждый день новый стих. Прочитай его спокойно и запомни.",
    showHints: "Показать подсказки снова",
    hintsOn: "Подсказки снова включены",
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

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export default function TeensHub() {
  // undefined — ещё читаем из памяти, null — служение не выбрано (показываем выбор)
  const [service, setService] = useState<Service | null | undefined>(undefined);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [events, setEvents] = useState<TeenEvent[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadDetail, setLoadDetail] = useState("");

  // undefined — ещё грузим, participant null — не вошёл
  const [me, setMe] = useState<MeInfo | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("home");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rsvpError, setRsvpError] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hintsKey, setHintsKey] = useState(0);
  const [hintsDone, setHintsDone] = useState(false);
  const today = berlinToday();

  const [supported, setSupported] = useState(true);
  const [iosInstall, setIosInstall] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState("");

  const [standalone, setStandalone] = useState(true);
  const [bannerHidden, setBannerHidden] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  const lang: Lang = service ? LANG_OF[service] : "de";
  const t = TEXT[lang];

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/t/info", { cache: "no-store" });

      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as { detail?: string } | null;
        setLoadDetail(failure?.detail ?? "");
        throw new Error("load");
      }

      const data = (await response.json()) as { lessons: Lesson[]; events: TeenEvent[]; notices?: Notice[] };
      setLessons(data.lessons);
      setNotices(data.notices ?? []);
      setEvents(data.events);
      setLoadFailed(false);

    } catch {
      setLoadFailed(true);
      setLessons((current) => current ?? []);
    }
  }, []);

  const loadMe = useCallback(async (svc: Service) => {
    try {
      const response = await fetch(`/api/t/me?service=${encodeURIComponent(svc)}`, { cache: "no-store" });
      const data = (await response.json()) as Partial<MeInfo>;

      if (!response.ok || !data.participant) {
        setMe({ participant: null, lessonDates: [], attended: [], going: [] });
        return;
      }

      setMe({
        participant: data.participant,
        lessonDates: data.lessonDates ?? [],
        attended: data.attended ?? [],
        going: data.going ?? [],
      });

      // язык профиля подростка совпадает с выбранным служением
      if (data.participant.lang !== LANG_OF[svc]) {
        fetch("/api/bc/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang: LANG_OF[svc] }),
        }).catch(() => undefined);
      }
    } catch {
      setMe({ participant: null, lessonDates: [], attended: [], going: [] });
    }
  }, []);

  useEffect(() => {
    if (service === "10:00" || service === "12:30") {
      safeSet("bc_lang", LANG_OF[service]);
      void loadMe(service);
    }
  }, [service, loadMe]);

  useEffect(() => {
    // ?service=10:00 или ?service=12:30 — предпросмотр для команды (без запоминания)
    const forced = new URLSearchParams(window.location.search).get("service");
    const saved = safeGet("teens-service");

    if (forced === "10:00" || forced === "12:30") {
      setService(forced);
    } else {
      setService(saved === "10:00" || saved === "12:30" ? saved : null);
    }

    setStandalone(
      window.matchMedia?.("(display-mode: standalone)").matches ||
        Boolean((window.navigator as unknown as { standalone?: boolean }).standalone),
    );
    setBannerHidden(safeGet("teens-install-hidden") === "1");

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);

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

    load();

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [load]);

  async function runInstallPrompt() {
    if (!installEvent) return;

    await installEvent.prompt();
    setInstallEvent(null);
    setInstallOpen(false);
  }

  async function chooseService(next: Service) {
    setService(next);

    // предпросмотр команды (?service=) ничего не запоминает
    if (!new URLSearchParams(window.location.search).get("service")) {
      safeSet("teens-service", next);
    }

    setMe(undefined);
    window.scrollTo?.({ top: 0 });

    // если уже подписан — обновляем язык уведомлений
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        const subscription = await registration?.pushManager.getSubscription();

        if (subscription) {
          await fetch("/api/t/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: subscription.toJSON(), lang: LANG_OF[next] }),
          });
        }
      }
    } catch {
      /* язык уведомлений обновится при следующей подписке */
    }
  }

  async function setGoing(lesson: Lesson, on: boolean) {
    if (!service || !me?.participant) return;

    setRsvpError(false);
    setBusyId(lesson.id);

    try {
      const response = await fetch("/api/t/going", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: lesson.id, going: on }),
      });

      if (!response.ok) {
        setRsvpError(true);
        setBusyId(null);
        return;
      }

      if (on) {
        const before = computeStats(me.attended, me.lessonDates, today);
        const after = computeStats([...me.attended, lesson.date], me.lessonDates, today);
        const levelAfter = levelOf(after.xp);
        const newAch = ACHIEVEMENTS.filter((a) => a.done(after) && !a.done(before));

        if (levelAfter.index > levelOf(before.xp).index) {
          setCelebration({ id: Date.now(), kind: "level", title: lang === "ru" ? levelAfter.current.ru : levelAfter.current.de });
        } else if (newAch.length > 0) {
          setCelebration({ id: Date.now(), kind: "ach", title: lang === "ru" ? newAch[0].ru : newAch[0].de });
        } else {
          setCelebration({
            id: Date.now(),
            kind: "start",
            title: lang === "ru" ? `${after.streak} в серии` : `${after.streak} in Folge`,
          });
        }
      }

      await Promise.all([loadMe(service), load()]);
    } catch {
      setRsvpError(true);
    }

    setBusyId(null);
  }

  async function signOut() {
    try {
      await fetch("/api/bc/logout", { method: "POST" });
    } catch {
      /* всё равно показываем вход */
    }
    setTab("home");
    setMe({ participant: null, lessonDates: [], attended: [], going: [] });
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
    (lang === "ru"
      ? lesson.teen_title_ru || shortTitle(lesson.title_ru || lesson.title_de)
      : lesson.teen_title_de || shortTitle(lesson.title_de || lesson.title_ru)) || "";

  const teenText = (lesson: Lesson) =>
    (lang === "ru" ? lesson.teen_text_ru : lesson.teen_text_de) || "";

  const card = "rounded-[22px] border border-[#e9e3d3] bg-white";

  const logo = (
    <Image
      src="/tlite-logo.png"
      alt="TLight"
      width={44}
      height={44}
      priority
      className="h-11 w-11 shrink-0 rounded-[13px]"
    />
  );

  /* ---------- пока читаем выбор ---------- */
  if (service === undefined) {
    return <div className="fixed inset-0 z-[60] bg-[#faf8f3]" />;
  }

  /* ---------- выбор служения ---------- */
  if (service === null) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#faf8f3] text-[#1b2431]">
        <div className="mx-auto flex min-h-full w-full max-w-[520px] flex-col justify-center px-5 py-10">
          <div className="flex items-center gap-3">
            {logo}
            <div>
              <div className="text-[19px] font-extrabold leading-none tracking-[-0.03em]">TLight</div>
              <div className="mt-1 text-[9px] font-bold uppercase leading-none tracking-[0.16em] text-[#9a9585]">
                Teens
              </div>
            </div>
          </div>

          <h1 className="mt-10 text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
            Welchen Gottesdienst besuchst du?
          </h1>
          <p className="mt-2 text-[16px] font-semibold leading-snug text-[#8a8678]">
            Какое служение ты посещаешь?
          </p>

          <div className="mt-8 space-y-3">
            {(
              [
                { time: "10:00" as Service, name: "Deutsch", hint: "Gottesdienst auf Deutsch" },
                { time: "12:30" as Service, name: "Русский", hint: "Служение на русском языке" },
              ] as const
            ).map((option) => (
              <button
                key={option.time}
                type="button"
                onClick={() => chooseService(option.time)}
                className="group flex w-full items-center gap-4 rounded-[24px] bg-[#1b2431] p-4 text-left text-white shadow-[0_10px_30px_rgba(27,36,49,0.18)] transition active:scale-[0.99]"
              >
                <span className="flex h-16 w-[88px] shrink-0 items-center justify-center rounded-2xl bg-[#ffc93c] text-[24px] font-extrabold tracking-[-0.04em] text-[#1b2431]">
                  {option.time}
                </span>
                <span className="min-w-0">
                  <span className="block text-[22px] font-extrabold leading-none">{option.name}</span>
                  <span className="mt-1.5 block text-[13px] font-medium text-white/60">{option.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const myLessons = (lessons ?? []).filter((lesson) => lesson.time === service);
  const myNotices = notices.filter((notice) => notice.time === service);

  const serviceBadge = (
    <button
      type="button"
      onClick={() => setService(null)}
      className="flex h-10 items-center gap-1.5 rounded-full bg-white pl-4 pr-3 text-[13px] font-extrabold ring-1 ring-[#e9e3d3] active:scale-[0.97]"
    >
      {service}
      <span className="text-[#9a9585]">{lang === "ru" ? "RU" : "DE"}</span>
      <ChevronDown size={14} className="text-[#9a9585]" />
    </button>
  );

  const brand = (
    <div className="flex items-center gap-2.5">
      {logo}
      <div>
        <div className="text-[19px] font-extrabold leading-none tracking-[-0.03em]">TLight</div>
        <div className="mt-1 text-[9px] font-bold uppercase leading-none tracking-[0.16em] text-[#9a9585]">Teens</div>
      </div>
    </div>
  );

  /* ---------- ждём данные подростка ---------- */
  if (me === undefined) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#faf8f3]">
        <TeensAnimStyles />
        <span className="tp-float">{logo}</span>
      </div>
    );
  }

  /* ---------- вход и регистрация ---------- */
  if (!me.participant) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-[#faf8f3] text-[#1b2431] [overflow-wrap:anywhere]">
        <TeensAnimStyles />
        <div className="mx-auto w-full max-w-[520px] px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            {brand}
            {serviceBadge}
          </div>

          <div className="tp-up tp-shine relative mt-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1b2431] via-[#243044] to-[#1b2431] p-6 text-white shadow-[0_14px_34px_rgba(27,36,49,0.22)]">
            <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em]">{t.welcomeTitle}</h1>
            <p className="mt-2 text-[14px] leading-5 text-white/70">{t.welcomeSub}</p>
            <div className="mt-5 flex gap-2.5">
              {[
                { icon: CalendarDays, label: t.chipLessons },
                { icon: BookOpen, label: t.chipChallenge },
                { icon: PartyPopper, label: t.chipEvents },
              ].map((chip, i) => (
                <div key={chip.label} className="tp-float flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-white/10 py-3" style={{ animationDelay: `${i * 300}ms` }}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffc93c] text-[#1b2431]">
                    <chip.icon size={18} strokeWidth={2.3} />
                  </span>
                  <span className="text-[11px] font-bold">{chip.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <TeensAuth lang={lang} onDone={() => void loadMe(service)} />
          </div>

          {!standalone && (
            <button
              type="button"
              onClick={() => setInstallOpen(true)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold text-[#9a6b00] active:opacity-60"
            >
              <Download size={15} />
              {t.installLink}
            </button>
          )}

          {installOpen && (
            <TeensInstall lang={lang} canPrompt={Boolean(installEvent)} onPrompt={runInstallPrompt} onClose={() => setInstallOpen(false)} />
          )}
        </div>
      </div>
    );
  }

  const participant = me.participant;
  const goingSet = new Set(me.going);
  const stats = computeStats(me.attended, me.lessonDates, today);
  const level = levelOf(stats.xp);
  const initials = `${participant.first_name[0] ?? ""}${participant.last_name[0] ?? ""}`.toUpperCase();

  const avatar = (size: number) =>
    participant.avatar_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={participant.avatar_url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    ) : (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-[#ffc93c] font-extrabold text-[#1b2431]"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {initials}
      </span>
    );

  /* ---------- вкладка «Главная» ---------- */
  const home = (
    <>
      {/* приветствие */}
      <div className="tp-up mt-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#9a9585]">{t.hello}</p>
          <h1 className="truncate text-[28px] font-extrabold leading-tight tracking-[-0.03em]">{participant.first_name}!</h1>
        </div>
        <button
          type="button"
          onClick={() => setTab("me")}
          className={
            "flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[16px] font-extrabold active:scale-95 " +
            (stats.streak > 0 ? "bg-gradient-to-b from-[#ffc93c] to-[#ff9d3c] text-[#1b2431]" : "bg-white text-[#c9c2a8] ring-1 ring-[#e9e3d3]")
          }
        >
          <Flame size={18} className={stats.streak > 0 ? "tp-flame" : ""} fill={stats.streak > 0 ? "currentColor" : "none"} />
          {stats.streak}
        </button>
      </div>

      <TeensHint key={`streak-${hintsKey}`} id="streak" lang={lang} text={t.hintStreak} className="mt-4" />

      {/* Bibel-Challenge */}
      <a
        href="/t/bc"
        className="tp-up tp-shine relative mt-5 flex items-center gap-3 overflow-hidden rounded-[24px] bg-[#1b2431] p-4 text-white shadow-[0_10px_30px_rgba(27,36,49,0.18)] active:scale-[0.99]"
        style={{ animationDelay: "80ms" }}
      >
        <span className="tp-float flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#ffc93c] text-[#1b2431]">
          <BookOpen size={26} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[18px] font-extrabold leading-tight">Bibel-Challenge</span>
          <span className="mt-0.5 block text-[12px] leading-4 text-white/65">{t.challengeSub}</span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-[#ffc93c]" />
      </a>

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
            <p className="mt-2 break-words rounded-xl bg-white px-3 py-2 text-[11px] text-[#8a8678]">{loadDetail}</p>
          )}

            {/* почему на ближайшей встрече нет урока */}
            {myNotices.map((notice) => {
              const reason = lang === "ru" ? notice.title_ru || notice.title_de : notice.title_de || notice.title_ru;

              return (
                <div key={notice.id} className="mt-6 flex gap-3 rounded-[22px] bg-[#fff4d1] p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffc93c] text-[#1b2431]">
                    <CalendarOff size={19} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold capitalize text-[#9a6b00]">{dateLabel(notice.date)}</p>
                    <p className="mt-0.5 text-[15px] font-extrabold leading-tight text-[#1b2431]">{t.noticeHead}</p>
                    {reason && <p className="mt-1 text-[14px] leading-snug text-[#5c4a10]">{reason}</p>}
                  </div>
                </div>
              );
            })}

          <TeensHint key={`challenge-${hintsKey}`} id="challenge" lang={lang} text={t.hintChallenge} className="mt-4" />

          {/* ближайший урок */}
          <p className="mb-2 mt-7 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9585]">{t.next}</p>

          {myLessons.length === 0 ? (
            <div className={`${card} px-5 py-8 text-center text-[14px] text-[#8a8678]`}>{t.noLesson}</div>
          ) : (
            <div className="space-y-3">
              {myLessons.map((lesson) => {
                const done = goingSet.has(lesson.id);
                const lessonTitle = title(lesson);

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

                        <h1
                          className={`mt-3 font-extrabold leading-tight tracking-[-0.02em] ${
                            lessonTitle.length > 60 ? "text-[19px]" : "text-[24px]"
                          }`}
                        >
                          {lessonTitle || t.topicOpen}
                        </h1>

                        {teenText(lesson) && (
                          <p className="mt-2.5 whitespace-pre-line text-[14px] leading-6 text-white/80">
                            {teenText(lesson)}
                          </p>
                        )}

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
                          <p className="mt-1 text-[15px] font-semibold leading-snug">
                            {lesson.serving.length > 0 ? lesson.serving.join(", ") : t.nobody}
                          </p>
                        </div>
                      </div>

                    {/* отметка */}
                    <div className="bg-[#fff4d1] p-4 text-[#1b2431]">
                      {!done && <TeensHint key={`coming-${hintsKey}`} id="coming" lang={lang} text={t.hintComing} className="mb-3 !bg-white" />}
                      {done ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 text-[15px] font-extrabold">
                            <span className="tp-pop flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
                              <Check size={19} strokeWidth={3} />
                            </span>
                            {t.youAre}
                          </div>
                          <button
                            type="button"
                            disabled={busyId === lesson.id}
                            onClick={() => setGoing(lesson, false)}
                            className="h-9 rounded-full border border-[#1b2431]/25 px-4 text-[12px] font-bold disabled:opacity-50"
                          >
                            {t.cancel}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === lesson.id}
                          onClick={() => setGoing(lesson, true)}
                          className="tp-ring flex h-[56px] w-full items-center justify-center rounded-2xl bg-[#1b2431] text-[17px] font-extrabold text-[#ffc93c] shadow-[0_6px_16px_rgba(27,36,49,0.22)] active:scale-[0.98] disabled:opacity-50"
                        >
                          {busyId === lesson.id ? <Loader2 size={20} className="animate-spin" /> : t.comingBtn}
                        </button>
                      )}

                      {rsvpError && <p className="mt-2 text-[12px] font-semibold text-red-600">{t.error}</p>}

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

          <VerseCard lang={lang} today={today} />
          <TeensHint key={`verse-${hintsKey}`} id="verse" lang={lang} text={t.hintVerse} className="mt-3" />

            {/* события */}
            <p className="mb-2 mt-8 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9585]">
              {t.events}
            </p>

            {events.length === 0 ? (
              <div className={`${card} px-5 py-7 text-center text-[14px] text-[#8a8678]`}>{t.noEvents}</div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const href = event.form ? `/f/${event.form.slug}` : event.link_url;
                  const registrationOpen = event.form ? event.form.open : Boolean(event.link_url);

                  const body = (
                    <>
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

                        {href && registrationOpen && (
                          <ChevronRight size={20} className="mt-1 shrink-0 text-[#c4b377]" />
                        )}
                      </div>

                      {event.description && (
                        <p className="mt-3 whitespace-pre-line text-[13px] leading-5 text-[#5c5a50]">
                          {event.description}
                        </p>
                      )}

                      {event.form && (
                        <div
                          className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold ${
                            event.form.open
                              ? "bg-[#ffc93c] text-[#1b2431]"
                              : "bg-[#f0ede3] text-[#9a9585]"
                          }`}
                        >
                          {event.form.open ? (
                            <>
                              {t.register}
                              <ExternalLink size={14} />
                            </>
                          ) : (
                            t.regClosed
                          )}
                        </div>
                      )}

                      {!event.form && event.link_url && (
                        <div className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ffc93c] text-[14px] font-bold text-[#1b2431]">
                          {t.register}
                          <ExternalLink size={14} />
                        </div>
                      )}
                    </>
                  );

                  return href && registrationOpen ? (
                    <a
                      key={event.id}
                      href={href}
                      className={`${card} block p-4 transition active:scale-[0.99]`}
                    >
                      {body}
                    </a>
                  ) : (
                    <div key={event.id} className={`${card} p-4`}>
                      {body}
                    </div>
                  );
                })}
              </div>
            )}

        </>
      )}
    </>
  );

  /* ---------- вкладка «Я» ---------- */
  const mine = (
    <>
      <div className="tp-up mt-5 flex items-center gap-4">
        {avatar(64)}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[24px] font-extrabold leading-tight tracking-[-0.02em]">
            {participant.first_name} {participant.last_name}
          </h1>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-[#9a9585]">
            @{participant.nickname} · {lang === "ru" ? level.current.ru : level.current.de}
          </p>
        </div>
      </div>

      <TeensHint key={`level-${hintsKey}`} id="level" lang={lang} text={t.hintLevel} className="mt-4" />
      <ProgressCard lang={lang} history={me.attended} lessonDates={me.lessonDates} today={today} />
      <AchievementsCard lang={lang} history={me.attended} lessonDates={me.lessonDates} today={today} />
      {!standalone && (
        <button
          type="button"
          onClick={() => setInstallOpen(true)}
          className="tp-up mt-4 flex w-full items-center gap-3 rounded-[22px] border border-[#e9e3d3] bg-white p-4 text-left active:scale-[0.99]"
          style={{ animationDelay: "140ms" }}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ffc93c] text-[#1b2431]">
            <Download size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-extrabold leading-tight">{t.installCardTitle}</span>
            <span className="mt-0.5 block text-[12px] leading-4 text-[#8a8678]">{t.installCardSub}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-[#c4b377]" />
        </button>
      )}

      <TeensFeedback lang={lang} />

          <div className={`${card} mt-4 p-4`}>
            <button type="button" onClick={() => setSettingsOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
              <span className="flex items-center gap-2 text-[15px] font-extrabold">
                <Settings size={16} className="text-[#9a6b00]" />
                {t.settings}
              </span>
              <ChevronDown size={18} className={"text-[#9a9585] transition-transform " + (settingsOpen ? "rotate-180" : "")} />
            </button>

            {settingsOpen && (
              <div className="mt-3 space-y-3">
            {/* уведомления */}
            <div className="rounded-xl bg-[#faf8f3] p-3">
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
                  <button
                    type="button"
                    onClick={() => setInstallOpen(true)}
                    className="mt-2 h-9 rounded-full bg-[#1b2431] px-4 text-[12px] font-bold text-[#ffc93c]"
                  >
                    {t.installOpen}
                  </button>
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
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#faf8f3] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9a9585]">{t.service}</p>
                <p className="text-[15px] font-extrabold">
                  {service} · {lang === "ru" ? "Русский" : "Deutsch"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setService(null)}
                className="h-9 shrink-0 rounded-full border border-[#1b2431]/20 px-4 text-[12px] font-bold"
              >
                {t.changeService}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                resetHints();
                setHintsKey((v) => v + 1);
                setPushMessage("");
                setRsvpError(false);
                setHintsDone(true);
                window.setTimeout(() => setHintsDone(false), 2500);
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e9e3d3] text-[13px] font-bold text-[#6f6a5c]"
            >
              <Lightbulb size={15} />
              {hintsDone ? t.hintsOn : t.showHints}
            </button>

            <button
              type="button"
              onClick={signOut}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e9e3d3] text-[13px] font-bold text-[#6f6a5c]"
            >
              <LogOut size={15} />
              {t.signOut}
            </button>
              </div>
            )}
          </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#faf8f3] text-[#1b2431] [overflow-wrap:anywhere]">
      <TeensAnimStyles />

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-[520px] px-4 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            {brand}
            {serviceBadge}
          </div>

        {!standalone && !bannerHidden && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#ffc93c] p-3 text-[#1b2431]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b2431] text-[#ffc93c]">
              <Download size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-extrabold leading-tight">{t.installBanner}</p>
              <p className="text-[12px] font-medium leading-4 text-[#1b2431]/70">{t.installSub}</p>
            </div>
            <button
              type="button"
              onClick={() => setInstallOpen(true)}
              className="h-9 shrink-0 rounded-full bg-[#1b2431] px-4 text-[12px] font-bold text-[#ffc93c] active:scale-95"
            >
              {t.installHow}
            </button>
            <button
              type="button"
              aria-label="close"
              onClick={() => {
                setBannerHidden(true);
                safeSet("teens-install-hidden", "1");
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#1b2431]/60 active:bg-black/10"
            >
              <X size={15} />
            </button>
          </div>
        )}

          {tab === "home" ? home : mine}
        </div>
      </main>

      <nav className="border-t border-[#e9e3d3] bg-white pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-[520px] grid-cols-3">
          <button
            type="button"
            onClick={() => setTab("home")}
            className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-bold ${tab === "home" ? "text-[#1b2431]" : "text-[#a8a393]"}`}
          >
            <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${tab === "home" ? "bg-[#ffc93c]" : ""}`}>
              <HomeIcon className="h-[18px] w-[18px]" strokeWidth={2.1} />
            </span>
            {t.tabHome}
          </button>

          <a href="/t/bc" className="flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-bold text-[#a8a393]">
            <span className="flex h-7 w-12 items-center justify-center rounded-full">
              <BookOpen className="h-[18px] w-[18px]" strokeWidth={2.1} />
            </span>
            {t.tabChallenge}
          </a>

          <button
            type="button"
            onClick={() => setTab("me")}
            className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-bold ${tab === "me" ? "text-[#1b2431]" : "text-[#a8a393]"}`}
          >
            <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${tab === "me" ? "bg-[#ffc93c]" : ""}`}>
              <User className="h-[18px] w-[18px]" strokeWidth={2.1} />
            </span>
            {t.tabMe}
          </button>
        </div>
      </nav>

      <CelebrationLayer lang={lang} event={celebration} onDone={() => setCelebration(null)} />

      {installOpen && (
        <TeensInstall
          lang={lang}
          canPrompt={Boolean(installEvent)}
          onPrompt={runInstallPrompt}
          onClose={() => setInstallOpen(false)}
        />
      )}
    </div>
  );
}