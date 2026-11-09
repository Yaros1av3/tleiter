"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Trash2,
  Trophy,
  User,
} from "lucide-react";

import BcGift from "@/components/BcGift";
import BcRanking, { MyAwards } from "@/components/BcRanking";
import BcTasks from "@/components/BcTasks";

type Lang = "de" | "ru";
type Tab = "today" | "ranking" | "profile";

type Rank = { min: number; name: string };
type Me = {
  participant: {
    id: number;
    nickname: string;
    first_name: string;
    last_name: string;
    lang: Lang;
    avatar_url: string | null;
    is_guest: boolean;
  } | null;
  season: { id: number; title: string } | null;
  points: number;
  rank: Rank | null;
  nextRank: Rank | null;
};

const T = {
  de: {
    title: "Bibel-Challenge",
    welcome: "Willkommen zurück",
    loginHint: "Melde dich mit deinem Spitznamen an.",
    nick: "Spitzname",
    password: "Passwort",
    login: "Anmelden",
    first: "Neu hier?",
    startReg: "Jetzt registrieren",
    back: "Zurück",
    regTitle: "Registrierung",
    nameHint: "Wie heißt du? Wir suchen dich in unserer Liste.",
    firstName: "Vorname",
    lastName: "Nachname",
    next: "Weiter",
    foundTitle: "Wir haben dich gefunden",
    foundHint: "Zur Sicherheit: Wann hast du Geburtstag? (Tag und Monat)",
    day: "Tag",
    month: "Monat",
    notFoundTitle: "Nicht in der Liste",
    notFoundHint:
      "Wir haben dich nicht gefunden. Prüfe die Schreibweise oder mach als Gast mit. Die Leiter sehen, dass du Gast bist.",
    asGuest: "Als Gast mitmachen",
    retry: "Nochmal versuchen",
    existsTitle: "Du bist schon dabei",
    existsHint: "Für diesen Namen gibt es schon ein Konto. Melde dich mit deinem Spitznamen an.",
    toLogin: "Zur Anmeldung",
    createTitle: "Dein Konto",
    createHint: "Wähle einen Spitznamen. Ihn sehen alle im Ranking.",
    pwHint: "Mindestens 6 Zeichen",
    create: "Konto erstellen",
    tabToday: "Heute",
    tabRanking: "Ranking",
    tabProfile: "Profil",
    hello: "Hallo",
    points: "Punkte",
    toNext: "bis",
    topRank: "Höchster Rang erreicht",
    noSeason: "Gerade läuft keine Challenge. Sobald die nächste startet, siehst du sie hier.",
    soonTask: "Die Aufgabe des Tages erscheint hier.",
    soonRanking: "Das Ranking erscheint hier.",
    language: "Sprache",
    changeNick: "Spitzname ändern",
    save: "Speichern",
    changePw: "Passwort ändern",
    oldPw: "Altes Passwort",
    newPw: "Neues Passwort",
    saved: "Gespeichert",
    logout: "Abmelden",
    photo: "Foto ändern",
    removePhoto: "Foto entfernen",
    guest: "Gast",
    errors: {
      empty: "Bitte alles ausfüllen.",
      rate: "Zu viele Versuche. Probiere es in ein paar Minuten nochmal.",
      wrong: "Spitzname oder Passwort stimmt nicht.",
      blocked: "Dein Konto ist gesperrt. Sprich mit deinem Leiter.",
      birth: "Das Datum passt nicht. Versuche es nochmal.",
      ticket: "Die Sitzung ist abgelaufen. Beginne nochmal von vorn.",
      nick_format: "Spitzname: 3 bis 20 Zeichen, nur Buchstaben, Zahlen, _ . -",
      nick_bad: "Dieser Spitzname ist nicht erlaubt.",
      nick_taken: "Dieser Spitzname ist schon vergeben.",
      pw_short: "Das Passwort braucht mindestens 6 Zeichen.",
      exists: "Für diesen Namen gibt es schon ein Konto.",
      big: "Das Bild ist zu groß.",
      type: "Dieses Bildformat geht nicht.",
      other: "Etwas ist schiefgelaufen. Bitte nochmal versuchen.",
    },
    months: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
  },
  ru: {
    title: "Bibel-Challenge",
    welcome: "С возвращением",
    loginHint: "Войди со своим ником.",
    nick: "Ник",
    password: "Пароль",
    login: "Войти",
    first: "Ты здесь впервые?",
    startReg: "Зарегистрироваться",
    back: "Назад",
    regTitle: "Регистрация",
    nameHint: "Как тебя зовут? Мы найдём тебя в нашем списке.",
    firstName: "Имя",
    lastName: "Фамилия",
    next: "Дальше",
    foundTitle: "Мы нашли тебя",
    foundHint: "Для безопасности: когда у тебя день рождения? (число и месяц)",
    day: "День",
    month: "Месяц",
    notFoundTitle: "Нет в списке",
    notFoundHint:
      "Мы тебя не нашли. Проверь написание или участвуй как гость. Служители увидят, что ты гость.",
    asGuest: "Участвовать как гость",
    retry: "Попробовать снова",
    existsTitle: "Ты уже в игре",
    existsHint: "Для этого имени уже есть аккаунт. Войди со своим ником.",
    toLogin: "Ко входу",
    createTitle: "Твой аккаунт",
    createHint: "Выбери ник. Его увидят все в рейтинге.",
    pwHint: "Не меньше 6 символов",
    create: "Создать аккаунт",
    tabToday: "Сегодня",
    tabRanking: "Рейтинг",
    tabProfile: "Профиль",
    hello: "Привет",
    points: "баллов",
    toNext: "до ранга",
    topRank: "Высший ранг достигнут",
    noSeason: "Сейчас челлендж не идёт. Когда начнётся новый, ты увидишь его здесь.",
    soonTask: "Здесь появится задание дня.",
    soonRanking: "Здесь появится рейтинг.",
    language: "Язык",
    changeNick: "Сменить ник",
    save: "Сохранить",
    changePw: "Сменить пароль",
    oldPw: "Старый пароль",
    newPw: "Новый пароль",
    saved: "Сохранено",
    logout: "Выйти",
    photo: "Сменить фото",
    removePhoto: "Убрать фото",
    guest: "Гость",
    errors: {
      empty: "Заполни все поля.",
      rate: "Слишком много попыток. Попробуй через несколько минут.",
      wrong: "Неверный ник или пароль.",
      blocked: "Твой аккаунт заблокирован. Поговори со своим служителем.",
      birth: "Дата не подходит. Попробуй ещё раз.",
      ticket: "Сессия истекла. Начни сначала.",
      nick_format: "Ник: от 3 до 20 символов, только буквы, цифры и _ . -",
      nick_bad: "Такой ник нельзя.",
      nick_taken: "Этот ник уже занят.",
      pw_short: "Пароль должен быть не короче 6 символов.",
      exists: "Для этого имени уже есть аккаунт.",
      big: "Картинка слишком большая.",
      type: "Этот формат картинки не подходит.",
      other: "Что-то пошло не так. Попробуй ещё раз.",
    },
    months: ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"],
  },
} as const;

const LANG_KEY = "bc_lang";

async function api<R = Record<string, unknown>>(
  url: string,
  body?: unknown,
  method = "POST",
): Promise<{ ok: boolean; data: R & { error?: string } }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "other" } as R & { error?: string } };
  }
}

/* Уменьшаем фото до квадрата 320x320, чтобы аватарка весила мало */
async function squareJpeg(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const size = 320;
    const side = Math.min(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(
      img,
      (img.width - side) / 2,
      (img.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    return await new Promise<Blob | null>((r) => canvas.toBlob((b) => r(b), "image/jpeg", 0.85));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function BcApp() {
  const [lang, setLang] = useState<Lang>("de");
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("today");

  const t = T[lang];

  const loadMe = useCallback(async () => {
    const { data } = await api<Me>("/api/bc/me", undefined, "GET");
    setMe(data as Me);
    if (data?.participant?.lang) setLang(data.participant.lang);
    setLoading(false);
  }, []);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch {}
    if (saved === "de" || saved === "ru") setLang(saved);
    void loadMe();
  }, [loadMe]);

  const changeLang = async (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
    if (me?.participant) {
      await api("/api/bc/profile", { lang: l });
    }
  };

  const logo = (
    <Image
      src="/tlite-logo.png"
      alt="TLight"
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-[11px]"
    />
  );

  const langSwitch = (
    <div className="flex h-9 items-center rounded-full bg-white p-0.5 ring-1 ring-[#e9e3d3]">
      {(["de", "ru"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => changeLang(l)}
          className={`h-8 rounded-full px-2.5 text-[11px] font-extrabold uppercase transition ${
            lang === l ? "bg-[#1b2431] text-[#ffc93c]" : "text-[#8a8678]"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );

  if (loading) return <div className="fixed inset-0 z-[60] bg-[#faf8f3]" />;

  const loggedIn = !!me?.participant;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#faf8f3] text-[#1b2431] [overflow-wrap:anywhere]">
      <header className="mx-auto flex w-full max-w-[520px] items-center gap-2.5 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {logo}
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-extrabold tracking-[-0.02em]">
          {t.title}
        </h1>
        {langSwitch}
      </header>

      <main className="mx-auto w-full max-w-[520px] flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
        {!loggedIn ? (
          <AuthFlow lang={lang} onDone={loadMe} />
        ) : tab === "profile" ? (
          <Profile me={me as Me} lang={lang} onChanged={loadMe} onLogout={loadMe} />
        ) : tab === "ranking" ? (
          <BcRanking lang={lang} />
        ) : (
          <Today me={me as Me} lang={lang} onChanged={loadMe} />
        )}
      </main>

      {loggedIn && (
        <nav className="border-t border-[#e9e3d3] bg-white pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto grid max-w-[520px] grid-cols-3">
            {(
              [
                ["today", t.tabToday, BookOpen],
                ["ranking", t.tabRanking, Trophy],
                ["profile", t.tabProfile, User],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-bold ${
                  tab === key ? "text-[#1b2431]" : "text-[#a8a393]"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                    tab === key ? "bg-[#ffc93c]" : ""
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

/* ---------- общие элементы ---------- */

const card = "rounded-[22px] border border-[#e9e3d3] bg-white";
const inputCls =
  "h-[52px] w-full rounded-2xl border border-[#eadfb8] bg-white px-4 text-[16px] outline-none transition focus:border-[#1b2431] focus:ring-[3px] focus:ring-[#ffc93c]/50";
const primaryBtn =
  "flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1b2431] text-[16px] font-extrabold text-[#ffc93c] shadow-[0_6px_16px_rgba(27,36,49,0.22)] transition active:scale-[0.99] disabled:opacity-50";
const ghostBtn =
  "flex h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-[#1b2431]/20 bg-white text-[15px] font-bold transition active:scale-[0.99] disabled:opacity-50";

function Placeholder({ text }: { text: string }) {
  return (
    <div className={`${card} mt-2 px-5 py-8 text-center text-[14px] text-[#8a8678]`}>{text}</div>
  );
}

function Avatar({
  url,
  name,
  size = 56,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[#ffc93c] font-extrabold text-[#1b2431]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function ErrorLine({ lang, code }: { lang: Lang; code: string }) {
  if (!code) return null;
  const errs = T[lang].errors as Record<string, string>;
  return (
    <p className="rounded-xl bg-[#fff4d1] px-3.5 py-2.5 text-[13px] font-semibold text-[#9a6b00]">
      {errs[code] ?? errs.other}
    </p>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className={`${inputCls} pr-12`}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1 top-1 flex h-[44px] w-11 items-center justify-center text-[#8a8678]"
        aria-label="show"
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

/* ---------- вход и регистрация ---------- */

type Step = "login" | "name" | "birth" | "notfound" | "exists" | "create";

function AuthFlow({ lang, onDone }: { lang: Lang; onDone: () => void }) {
  const t = T[lang];
  const [step, setStep] = useState<Step>("login");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [nick, setNick] = useState("");
  const [pw, setPw] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [ticket, setTicket] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [guest, setGuest] = useState(false);

  const go = (s: Step) => {
    setErr("");
    setStep(s);
  };

  const login = async () => {
    setBusy(true);
    setErr("");
    const { ok, data } = await api("/api/bc/login", { nickname: nick, password: pw });
    setBusy(false);
    if (ok) onDone();
    else setErr(data.error ?? "other");
  };

  const match = async () => {
    setBusy(true);
    setErr("");
    const { ok, data } = await api<{ status?: string; ticket?: string }>("/api/bc/match", {
      first,
      last,
    });
    setBusy(false);
    if (!ok) return setErr(data.error ?? "other");
    if (data.status === "found" && data.ticket) {
      setTicket(data.ticket);
      setGuest(false);
      go("birth");
    } else if (data.status === "exists") go("exists");
    else go("notfound");
  };

  const checkBirth = () => {
    if (!day || !month) return setErr("empty");
    go("create");
  };

  const register = async () => {
    setBusy(true);
    setErr("");
    const { ok, data } = await api("/api/bc/register", {
      ticket: guest ? undefined : ticket,
      first,
      last,
      day: Number(day),
      month: Number(month),
      nickname: nick,
      password: pw,
      lang,
    });
    setBusy(false);
    if (ok) return onDone();
    const code = data.error ?? "other";
    setErr(code);
    if (code === "birth" || code === "ticket") setStep("birth");
  };

  const back = (to: Step) => (
    <button
      type="button"
      onClick={() => go(to)}
      className="mb-3 flex h-9 items-center gap-1.5 text-[13px] font-bold text-[#8a8678]"
    >
      <ArrowLeft className="h-4 w-4" /> {t.back}
    </button>
  );

  if (step === "login") {
    return (
      <div className="mt-2 space-y-3">
        <div className="px-1 pb-1">
          <h2 className="text-[24px] font-extrabold tracking-[-0.02em]">{t.welcome}</h2>
          <p className="mt-1 text-[14px] text-[#8a8678]">{t.loginHint}</p>
        </div>
        <input
          className={inputCls}
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder={t.nick}
          autoCapitalize="none"
          autoComplete="username"
        />
        <PasswordInput value={pw} onChange={setPw} placeholder={t.password} autoComplete="current-password" />
        <ErrorLine lang={lang} code={err} />
        <button type="button" className={primaryBtn} disabled={busy || !nick || !pw} onClick={login}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t.login}
        </button>
        <div className={`${card} mt-4 flex items-center justify-between gap-3 p-4`}>
          <span className="text-[14px] font-semibold">{t.first}</span>
          <button
            type="button"
            onClick={() => {
              setNick("");
              setPw("");
              go("name");
            }}
            className="flex h-10 items-center gap-1.5 rounded-full bg-[#ffc93c] px-4 text-[13px] font-extrabold"
          >
            {t.startReg} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (step === "name") {
    return (
      <div className="mt-2 space-y-3">
        {back("login")}
        <div className="px-1 pb-1">
          <h2 className="text-[24px] font-extrabold tracking-[-0.02em]">{t.regTitle}</h2>
          <p className="mt-1 text-[14px] text-[#8a8678]">{t.nameHint}</p>
        </div>
        <input
          className={inputCls}
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder={t.firstName}
          autoComplete="given-name"
        />
        <input
          className={inputCls}
          value={last}
          onChange={(e) => setLast(e.target.value)}
          placeholder={t.lastName}
          autoComplete="family-name"
        />
        <ErrorLine lang={lang} code={err} />
        <button
          type="button"
          className={primaryBtn}
          disabled={busy || !first.trim() || !last.trim()}
          onClick={match}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t.next}
        </button>
      </div>
    );
  }

  if (step === "birth") {
    return (
      <div className="mt-2 space-y-3">
        {back("name")}
        <div className={`${card} flex items-center gap-3 p-4`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b2431] text-[#ffc93c]">
            <Check className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold">{t.foundTitle}</p>
            <p className="text-[13px] text-[#8a8678]">{t.foundHint}</p>
          </div>
        </div>
        <div className="grid grid-cols-[96px_1fr] gap-3">
          <select className={inputCls} value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">{t.day}</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">{t.month}</option>
            {t.months.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <ErrorLine lang={lang} code={err} />
        <button type="button" className={primaryBtn} onClick={checkBirth}>
          {t.next}
        </button>
      </div>
    );
  }

  if (step === "notfound") {
    return (
      <div className="mt-2 space-y-3">
        {back("name")}
        <div className={`${card} p-5`}>
          <p className="text-[17px] font-extrabold">{t.notFoundTitle}</p>
          <p className="mt-1.5 text-[14px] text-[#8a8678]">{t.notFoundHint}</p>
        </div>
        <button type="button" className={ghostBtn} onClick={() => go("name")}>
          {t.retry}
        </button>
        <button
          type="button"
          className={primaryBtn}
          onClick={() => {
            setGuest(true);
            go("create");
          }}
        >
          {t.asGuest}
        </button>
      </div>
    );
  }

  if (step === "exists") {
    return (
      <div className="mt-2 space-y-3">
        <div className={`${card} p-5`}>
          <p className="text-[17px] font-extrabold">{t.existsTitle}</p>
          <p className="mt-1.5 text-[14px] text-[#8a8678]">{t.existsHint}</p>
        </div>
        <button type="button" className={primaryBtn} onClick={() => go("login")}>
          {t.toLogin}
        </button>
      </div>
    );
  }

  /* create */
  return (
    <div className="mt-2 space-y-3">
      {back(guest ? "notfound" : "birth")}
      <div className="px-1 pb-1">
        <h2 className="text-[24px] font-extrabold tracking-[-0.02em]">{t.createTitle}</h2>
        <p className="mt-1 text-[14px] text-[#8a8678]">{t.createHint}</p>
      </div>
      <input
        className={inputCls}
        value={nick}
        onChange={(e) => setNick(e.target.value)}
        placeholder={t.nick}
        autoCapitalize="none"
        autoComplete="username"
        maxLength={20}
      />
      <PasswordInput value={pw} onChange={setPw} placeholder={t.password} autoComplete="new-password" />
      <p className="px-1 text-[12px] text-[#8a8678]">{t.pwHint}</p>
      <ErrorLine lang={lang} code={err} />
      <button
        type="button"
        className={primaryBtn}
        disabled={busy || nick.length < 3 || pw.length < 6}
        onClick={register}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t.create}
      </button>
    </div>
  );
}

/* ---------- вкладка "Сегодня" ---------- */

function Today({ me, lang, onChanged }: { me: Me; lang: Lang; onChanged: () => void }) {
  const t = T[lang];
  const p = me.participant!;
  const pct =
    me.nextRank && me.rank
      ? Math.min(100, Math.round(((me.points - me.rank.min) / (me.nextRank.min - me.rank.min)) * 100))
      : 100;

  return (
    <div className="space-y-2.5 pb-4 pt-1">
      <div className="rounded-2xl bg-[#1b2431] p-3.5 text-white">
        <div className="flex items-center gap-3">
          <Avatar url={p.avatar_url} name={p.nickname} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold leading-tight">{p.nickname}</p>
            {me.rank && <p className="text-[12px] font-semibold text-[#ffc93c]">{me.rank.name}</p>}
          </div>
          <div className="text-right">
            <p className="text-[26px] font-extrabold leading-none text-[#ffc93c]">{me.points}</p>
            <p className="mt-0.5 text-[10px] text-white/55">{t.points}</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#ffc93c]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-white/55">
          {me.nextRank
            ? `${me.nextRank.min - me.points} ${t.points} ${t.toNext} ${me.nextRank.name}`
            : t.topRank}
        </p>
      </div>

      <BcGift lang={lang} />
      {me.season ? <BcTasks lang={lang} onChanged={onChanged} /> : <Placeholder text={t.noSeason} />}
    </div>
  );
}

/* ---------- профиль ---------- */

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e9e3d3] bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
        <span className="text-[14px] font-extrabold">{title}</span>
        <ChevronDown className={`h-4 w-4 text-[#8a8678] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-2.5 border-t border-[#f0ebdc] p-4">{children}</div>}
    </div>
  );
}

const smallInput =
  "h-11 w-full rounded-xl border border-[#eadfb8] bg-white px-3.5 text-[15px] outline-none transition focus:border-[#1b2431] focus:ring-[3px] focus:ring-[#ffc93c]/50";
const smallBtn =
  "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1b2431] text-[14px] font-extrabold text-[#ffc93c] transition active:scale-[0.99] disabled:opacity-50";

function Profile({
  me,
  lang,
  onChanged,
  onLogout,
}: {
  me: Me;
  lang: Lang;
  onChanged: () => void;
  onLogout: () => void;
}) {
  const t = T[lang];
  const p = me.participant!;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [open, setOpen] = useState<"" | "nick" | "pw">("");
  const [nick, setNick] = useState(p.nickname);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");

  const flash = (key: string) => {
    setOk(key);
    setTimeout(() => setOk(""), 2000);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    setBusy("avatar");
    const blob = await squareJpeg(file);
    if (!blob) {
      setBusy("");
      return setErr("type");
    }
    const fd = new FormData();
    fd.append("file", blob, "avatar.jpg");
    try {
      const res = await fetch("/api/bc/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        flash("avatar");
        onChanged();
      } else setErr(data.error ?? "other");
    } catch {
      setErr("other");
    }
    setBusy("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAvatar = async () => {
    setBusy("avatar");
    await api("/api/bc/avatar", undefined, "DELETE");
    setBusy("");
    onChanged();
  };

  const saveNick = async () => {
    setErr("");
    setBusy("nick");
    const { ok: good, data } = await api("/api/bc/profile", { nickname: nick });
    setBusy("");
    if (good) {
      flash("nick");
      setOpen("");
      onChanged();
    } else setErr(data.error ?? "other");
  };

  const savePw = async () => {
    setErr("");
    setBusy("pw");
    const { ok: good, data } = await api("/api/bc/profile", {
      oldPassword: oldPw,
      newPassword: newPw,
    });
    setBusy("");
    if (good) {
      setOldPw("");
      setNewPw("");
      setOpen("");
      flash("pw");
    } else setErr(data.error ?? "other");
  };

  const logout = async () => {
    await api("/api/bc/logout", {});
    onLogout();
  };

  return (
    <div className="space-y-2.5 pb-4 pt-1">
      <div className="flex items-center gap-3.5 rounded-2xl border border-[#e9e3d3] bg-white p-3.5">
        <div className="relative shrink-0">
          <Avatar url={p.avatar_url} name={p.nickname} size={68} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy === "avatar"}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#1b2431] text-[#ffc93c] shadow-md active:scale-95"
            aria-label={t.photo}
          >
            {busy === "avatar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] font-extrabold leading-tight">{p.nickname}</p>
          <p className="truncate text-[12px] text-[#8a8678]">
            {p.first_name} {p.last_name}
            {p.is_guest ? ` · ${t.guest}` : ""}
          </p>
          {me.rank && (
            <span className="mt-1.5 inline-block rounded-full bg-[#fff4d1] px-2.5 py-0.5 text-[11px] font-extrabold text-[#9a6b00]">
              {me.rank.name} · {me.points} {t.points}
            </span>
          )}
          {p.avatar_url && (
            <button
              type="button"
              onClick={removeAvatar}
              className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#8a8678]"
            >
              <Trash2 className="h-3 w-3" /> {t.removePhoto}
            </button>
          )}
          {ok === "avatar" && <span className="ml-2 text-[11px] font-bold text-[#9a6b00]">{t.saved}</span>}
        </div>
      </div>

      <ErrorLine lang={lang} code={err} />

      <MyAwards lang={lang} />

      <Section title={t.changeNick} open={open === "nick"} onToggle={() => setOpen(open === "nick" ? "" : "nick")}>
        <input
          className={smallInput}
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          autoCapitalize="none"
          maxLength={20}
        />
        <button
          type="button"
          className={smallBtn}
          disabled={busy === "nick" || nick === p.nickname || nick.length < 3}
          onClick={saveNick}
        >
          {busy === "nick" ? <Loader2 className="h-4 w-4 animate-spin" /> : t.save}
        </button>
      </Section>
      {ok === "nick" && <p className="px-1 text-[12px] font-bold text-[#9a6b00]">{t.saved}</p>}

      <Section title={t.changePw} open={open === "pw"} onToggle={() => setOpen(open === "pw" ? "" : "pw")}>
        <PasswordInput value={oldPw} onChange={setOldPw} placeholder={t.oldPw} autoComplete="current-password" />
        <PasswordInput value={newPw} onChange={setNewPw} placeholder={t.newPw} autoComplete="new-password" />
        <button type="button" className={smallBtn} disabled={busy === "pw" || !oldPw || newPw.length < 6} onClick={savePw}>
          {busy === "pw" ? <Loader2 className="h-4 w-4 animate-spin" /> : t.save}
        </button>
      </Section>
      {ok === "pw" && <p className="px-1 text-[12px] font-bold text-[#9a6b00]">{t.saved}</p>}

      <button
        type="button"
        onClick={logout}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-[#8a8678] active:bg-black/5"
      >
        <LogOut className="h-4 w-4" /> {t.logout}
      </button>
    </div>
  );
}