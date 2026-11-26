"use client";

import { useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, Loader2 } from "lucide-react";

import TeensHint from "@/components/TeensHint";

type Lang = "de" | "ru";
type Step = "choose" | "login" | "who" | "notfound" | "exists" | "about" | "account";

const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' .-]{0,39}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TX = {
  de: {
    login: "Anmelden",
    create: "Konto erstellen",
    back: "Zurück",
    loginTitle: "Willkommen zurück",
    loginSub: "Melde dich mit deiner E-Mail an.",
    emailLabel: "E-Mail",
    passwordLabel: "Passwort",
    loginBtn: "Anmelden",
    noAccount: "Noch kein Konto?",
    haveAccount: "Schon ein Konto?",
    whoTitle: "Wer bist du?",
    whoSub: "Schreib deinen Namen so, wie er in deinen Dokumenten steht, mit lateinischen Buchstaben.",
    hintWho: "Wenn wir dich in der Liste finden, füllt sich vieles von selbst.",
    first: "Vorname",
    last: "Nachname",
    birth: "Geburtsdatum",
    day: "TT",
    month: "MM",
    year: "JJJJ",
    next: "Weiter",
    checking: "Wir suchen dich",
    foundTitle: "Wir haben dich gefunden",
    foundSub: "Ein Teil deiner Daten ist schon bei uns. Den Rest ergänzt du jetzt.",
    newTitle: "Neu bei uns",
    newSub: "Dich gibt es noch nicht in unserer Liste. Das ist kein Problem, trag deine Daten ein.",
    notfoundTitle: "Wir finden dich nicht",
    notfoundText: "Prüfe Name und Geburtsdatum. Oder mach als neuer Teilnehmer weiter.",
    checkAgain: "Eingaben prüfen",
    continueNew: "Als Neuer weitermachen",
    existsTitle: "Du hast schon ein Konto",
    existsText: "Für dich gibt es schon ein Profil. Melde dich einfach an.",
    aboutTitle: "Deine Daten",
    gender: "Ich bin",
    male: "Junge",
    female: "Mädchen",
    phone: "Deine Handynummer",
    phoneOpt: "freiwillig",
    parentName: "Name eines Elternteils",
    parentPhone: "Handynummer der Eltern",
    keepHint: "Schon gespeichert. Leer lassen, wenn es stimmt.",
    privacy: "Deine Daten sehen nur die Mitarbeiter.",
    accountTitle: "Dein Zugang",
    accountSub: "Damit meldest du dich später an.",
    pwHint: "Mindestens 8 Zeichen",
    createBtn: "Konto erstellen",
    creating: "Wird erstellt",
    errName: "Bitte Name mit lateinischen Buchstaben schreiben, zum Beispiel Anna oder Müller.",
    errBirth: "Bitte ein gültiges Geburtsdatum eintragen.",
    errEmail: "Bitte eine gültige E-Mail eintragen.",
    errPw: "Das Passwort braucht mindestens 8 Zeichen.",
    errGender: "Bitte wähle Junge oder Mädchen.",
    errParent: "Bitte Name und Handynummer eines Elternteils eintragen.",
    errWrong: "E-Mail oder Passwort stimmt nicht.",
    errBlocked: "Dein Zugang ist gesperrt. Sprich mit einem Mitarbeiter.",
    errRate: "Zu viele Versuche. Bitte warte ein paar Minuten.",
    errEmailTaken: "Mit dieser E-Mail gibt es schon ein Konto. Melde dich an.",
    errOther: "Das hat nicht geklappt. Bitte versuche es nochmal.",
  },
  ru: {
    login: "Вход",
    create: "Создать аккаунт",
    back: "Назад",
    loginTitle: "С возвращением",
    loginSub: "Войди по своей почте.",
    emailLabel: "Email",
    passwordLabel: "Пароль",
    loginBtn: "Войти",
    noAccount: "Ещё нет аккаунта?",
    haveAccount: "Уже есть аккаунт?",
    whoTitle: "Кто ты?",
    whoSub: "Впиши имя и фамилию так, как в документах, латинскими буквами (как в немецком).",
    hintWho: "Если мы найдём тебя в списке, многое заполнится само.",
    first: "Имя (Vorname)",
    last: "Фамилия (Nachname)",
    birth: "Дата рождения",
    day: "ДД",
    month: "ММ",
    year: "ГГГГ",
    next: "Дальше",
    checking: "Ищем тебя",
    foundTitle: "Мы нашли тебя",
    foundSub: "Часть данных уже есть у нас. Остальное допишешь сейчас.",
    newTitle: "Ты у нас впервые",
    newSub: "Тебя ещё нет в нашем списке. Это не страшно, заполни данные.",
    notfoundTitle: "Мы не нашли тебя",
    notfoundText: "Проверь имя и дату рождения. Или продолжи как новый участник.",
    checkAgain: "Проверить ввод",
    continueNew: "Продолжить как новый",
    existsTitle: "У тебя уже есть аккаунт",
    existsText: "Для тебя уже создан профиль. Просто войди.",
    aboutTitle: "Твои данные",
    gender: "Я",
    male: "Парень",
    female: "Девушка",
    phone: "Твой номер телефона",
    phoneOpt: "по желанию",
    parentName: "Имя одного из родителей",
    parentPhone: "Телефон родителей",
    keepHint: "Уже есть в базе. Оставь пустым, если верно.",
    privacy: "Твои данные видят только служители.",
    accountTitle: "Твой вход",
    accountSub: "Так ты будешь входить в приложение.",
    pwHint: "Не меньше 8 символов",
    createBtn: "Создать аккаунт",
    creating: "Создаём",
    errName: "Впиши имя латинскими буквами, например Anna или Müller.",
    errBirth: "Впиши настоящую дату рождения.",
    errEmail: "Впиши правильный email.",
    errPw: "Пароль должен быть не короче 8 символов.",
    errGender: "Выбери: парень или девушка.",
    errParent: "Впиши имя и телефон одного из родителей.",
    errWrong: "Email или пароль не подходят.",
    errBlocked: "Твой доступ закрыт. Поговори со служителем.",
    errRate: "Слишком много попыток. Подожди несколько минут.",
    errEmailTaken: "С этой почтой уже есть аккаунт. Войди.",
    errOther: "Не получилось. Попробуй ещё раз.",
  },
} as const;

const inputCls =
  "h-[52px] w-full rounded-2xl border border-[#eadfb8] bg-white px-4 text-[16px] outline-none transition placeholder:text-[#c9c2a8] focus:border-[#1b2431] focus:ring-[3px] focus:ring-[#ffc93c]/50";
const primaryBtn =
  "flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1b2431] text-[16px] font-extrabold text-[#ffc93c] shadow-[0_6px_16px_rgba(27,36,49,0.22)] transition active:scale-[0.99] disabled:opacity-50";
const yellowBtn =
  "flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ffc93c] text-[17px] font-extrabold text-[#1b2431] shadow-[0_6px_16px_rgba(255,201,60,0.4)] transition active:scale-[0.98]";
const ghostBtn =
  "flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-[#1b2431]/20 bg-white text-[15px] font-bold transition active:scale-[0.99]";

type Found = {
  ticket: string;
  firstName: string;
  gender: "male" | "female" | null;
  has: { phone: string; parentName: string; parentPhone: string; email: string };
};

async function post<R>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: R & { error?: string } }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "other" } as R & { error?: string } };
  }
}

export default function TeensAuth({ lang, onDone }: { lang: Lang; onDone: () => void }) {
  const t = TX[lang];
  const [step, setStep] = useState<Step>("choose");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [found, setFound] = useState<Found | null>(null);
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [phone, setPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const go = (s: Step) => {
    setErr("");
    setStep(s);
  };

  const birth = () => {
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    if (!d || !m || !y || year.length !== 4) return "";
    return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  const errText = (code: string) => {
    const map: Record<string, string> = {
      name_format: t.errName,
      birth: t.errBirth,
      email_format: t.errEmail,
      pw_short: t.errPw,
      gender: t.errGender,
      parent: t.errParent,
      wrong: t.errWrong,
      blocked: t.errBlocked,
      rate: t.errRate,
      email_taken: t.errEmailTaken,
    };
    return map[code] ?? t.errOther;
  };

  async function login() {
    if (!email.trim() || !pw) return setErr(t.errWrong);
    setBusy(true);
    setErr("");
    const { ok, data } = await post("/api/t/auth/login", { identifier: email, password: pw });
    setBusy(false);
    if (ok) onDone();
    else setErr(errText(data.error ?? "other"));
  }

  async function lookup() {
    if (!NAME_RE.test(first.trim()) || !NAME_RE.test(last.trim())) return setErr(t.errName);
    if (!birth()) return setErr(t.errBirth);

    setBusy(true);
    setErr("");
    const { ok, data } = await post<Partial<Found> & { status?: string }>("/api/t/auth/lookup", {
      first,
      last,
      birth: birth(),
    });
    setBusy(false);

    if (!ok) return setErr(errText(data.error ?? "other"));

    if (data.status === "found" && data.ticket && data.has) {
      setFound({ ticket: data.ticket, firstName: data.firstName ?? first, gender: data.gender ?? null, has: data.has });
      setGender(data.gender ?? "");
      go("about");
    } else if (data.status === "exists") {
      go("exists");
    } else {
      go("notfound");
    }
  }

  function aboutNext() {
    const needParent = !found || !(found.has.parentName && found.has.parentPhone);
    if (!gender) return setErr(t.errGender);
    if (needParent && (!parentName.trim() || parentPhone.replace(/\D/g, "").length < 6)) return setErr(t.errParent);
    go("account");
  }

  async function register() {
    if (!EMAIL_RE.test(email.trim())) return setErr(t.errEmail);
    if (pw.length < 8) return setErr(t.errPw);

    setBusy(true);
    setErr("");
    const { ok, data } = await post("/api/t/auth/register", {
      ticket: found?.ticket,
      first,
      last,
      birth: birth(),
      gender,
      phone,
      parent_name: parentName,
      parent_phone: parentPhone,
      email,
      password: pw,
      lang,
    });
    setBusy(false);

    if (ok) return onDone();

    const code = data.error ?? "other";
    setErr(errText(code));
    if (code === "ticket" || code === "birth" || code === "name_format") setStep("who");
  }

  const back = (to: Step) => (
    <button type="button" onClick={() => go(to)} className="mb-3 flex h-9 items-center gap-1.5 text-[13px] font-bold text-[#8a8678]">
      <ArrowLeft size={16} /> {t.back}
    </button>
  );

  const label = (text: string, extra?: string) => (
    <span className="mb-1 block px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9a6b00]">
      {text}
      {extra ? <span className="ml-1.5 font-semibold normal-case tracking-normal text-[#b5ae96]">{extra}</span> : null}
    </span>
  );

  const errorLine = err ? <p className="text-[13px] font-semibold text-red-600">{err}</p> : null;

  const pwInput = (
    <div className="relative">
      <input
        type={showPw ? "text" : "password"}
        className={inputCls + " pr-12"}
        placeholder={t.passwordLabel}
        autoComplete={step === "login" ? "current-password" : "new-password"}
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      <button
        type="button"
        aria-label="show"
        onClick={() => setShowPw((v) => !v)}
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-[#a8a393]"
      >
        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );

  /* ---------- выбор: войти или создать ---------- */
  if (step === "choose") {
    return (
      <div className="tp-up space-y-3">
        <button type="button" onClick={() => go("who")} className={yellowBtn}>
          {t.create}
        </button>
        <button type="button" onClick={() => go("login")} className={ghostBtn}>
          {t.login}
        </button>
      </div>
    );
  }

  /* ---------- вход ---------- */
  if (step === "login") {
    return (
      <div className="tp-up space-y-3">
        {back("choose")}
        <div className="px-1 pb-1">
          <h2 className="text-[24px] font-extrabold tracking-[-0.02em]">{t.loginTitle}</h2>
          <p className="mt-1 text-[14px] text-[#8a8678]">{t.loginSub}</p>
        </div>
        <input
          type="email"
          inputMode="email"
          autoCapitalize="none"
          className={inputCls}
          placeholder={t.emailLabel}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {pwInput}
        {errorLine}
        <button type="button" disabled={busy} onClick={login} className={primaryBtn}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : t.loginBtn}
        </button>
        <button type="button" onClick={() => go("who")} className="flex h-11 w-full items-center justify-center text-[13px] font-bold text-[#9a6b00]">
          {t.noAccount} {t.create}
        </button>
      </div>
    );
  }

  /* ---------- кто ты ---------- */
  if (step === "who") {
    return (
      <div className="tp-up space-y-3">
        {back("choose")}
        <div className="px-1 pb-1">
          <h2 className="text-[24px] font-extrabold tracking-[-0.02em]">{t.whoTitle}</h2>
          <p className="mt-1 text-[14px] leading-5 text-[#8a8678]">{t.whoSub}</p>
        </div>

        <TeensHint id="auth" lang={lang} text={t.hintWho} />

        <label className="block">
          {label(t.first)}
          <input className={inputCls} autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} />
        </label>
        <label className="block">
          {label(t.last)}
          <input className={inputCls} autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} />
        </label>

        <div>
          {label(t.birth)}
          <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
            <input className={inputCls + " text-center"} inputMode="numeric" maxLength={2} placeholder={t.day} value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, ""))} />
            <input className={inputCls + " text-center"} inputMode="numeric" maxLength={2} placeholder={t.month} value={month} onChange={(e) => setMonth(e.target.value.replace(/\D/g, ""))} />
            <input className={inputCls + " text-center"} inputMode="numeric" maxLength={4} placeholder={t.year} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>

        {errorLine}
        <button type="button" disabled={busy} onClick={lookup} className={primaryBtn}>
          {busy ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {t.checking}
            </>
          ) : (
            t.next
          )}
        </button>
        <button type="button" onClick={() => go("login")} className="flex h-11 w-full items-center justify-center text-[13px] font-bold text-[#9a6b00]">
          {t.haveAccount} {t.login}
        </button>
      </div>
    );
  }

  /* ---------- не нашли ---------- */
  if (step === "notfound") {
    return (
      <div className="tp-up space-y-3">
        {back("who")}
        <div className="rounded-[22px] border border-[#e9e3d3] bg-white p-5">
          <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">{t.notfoundTitle}</h2>
          <p className="mt-1.5 text-[14px] leading-5 text-[#8a8678]">{t.notfoundText}</p>
        </div>
        <button type="button" onClick={() => go("who")} className={ghostBtn}>
          {t.checkAgain}
        </button>
        <button
          type="button"
          onClick={() => {
            setFound(null);
            setGender("");
            go("about");
          }}
          className={primaryBtn}
        >
          {t.continueNew}
        </button>
      </div>
    );
  }

  /* ---------- уже есть аккаунт ---------- */
  if (step === "exists") {
    return (
      <div className="tp-up space-y-3">
        {back("who")}
        <div className="rounded-[22px] border border-[#e9e3d3] bg-white p-5">
          <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">{t.existsTitle}</h2>
          <p className="mt-1.5 text-[14px] leading-5 text-[#8a8678]">{t.existsText}</p>
        </div>
        <button type="button" onClick={() => go("login")} className={primaryBtn}>
          {t.login}
        </button>
      </div>
    );
  }

  /* ---------- данные ---------- */
  if (step === "about") {
    const hasPhone = found?.has.phone ?? "";
    const hasParentName = found?.has.parentName ?? "";
    const hasParentPhone = found?.has.parentPhone ?? "";

    return (
      <div className="tp-up space-y-3">
        {back("who")}

        <div className={"flex items-center gap-3 rounded-[22px] p-4 " + (found ? "bg-emerald-50" : "bg-[#fff4d1]")}>
          <span className={"tp-pop flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white " + (found ? "bg-emerald-500" : "bg-[#ffc93c] text-[#1b2431]")}>
            <Check size={20} strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-extrabold leading-tight">{found ? `${t.foundTitle}, ${found.firstName}!` : t.newTitle}</p>
            <p className="mt-0.5 text-[12.5px] leading-4 text-[#5c5a50]">{found ? t.foundSub : t.newSub}</p>
          </div>
        </div>

        <div>
          {label(t.gender)}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["male", t.male],
                ["female", t.female],
              ] as const
            ).map(([key, text]) => (
              <button
                key={key}
                type="button"
                onClick={() => setGender(key)}
                className={
                  "h-[52px] rounded-2xl text-[15px] font-extrabold transition active:scale-[0.98] " +
                  (gender === key ? "bg-[#1b2431] text-[#ffc93c]" : "bg-white text-[#1b2431] ring-1 ring-[#eadfb8]")
                }
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          {label(t.phone, hasPhone ? "" : `(${t.phoneOpt})`)}
          <input className={inputCls} type="tel" inputMode="tel" autoComplete="tel" placeholder={hasPhone} value={phone} onChange={(e) => setPhone(e.target.value)} />
          {hasPhone && <span className="mt-1 block px-1 text-[11.5px] text-[#9a9585]">{t.keepHint}</span>}
        </label>

        <label className="block">
          {label(t.parentName)}
          <input className={inputCls} placeholder={hasParentName} value={parentName} onChange={(e) => setParentName(e.target.value)} />
          {hasParentName && <span className="mt-1 block px-1 text-[11.5px] text-[#9a9585]">{t.keepHint}</span>}
        </label>

        <label className="block">
          {label(t.parentPhone)}
          <input className={inputCls} type="tel" inputMode="tel" placeholder={hasParentPhone} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
          {hasParentPhone && <span className="mt-1 block px-1 text-[11.5px] text-[#9a9585]">{t.keepHint}</span>}
        </label>

        <p className="px-1 text-[12px] text-[#9a9585]">{t.privacy}</p>
        {errorLine}
        <button type="button" onClick={aboutNext} className={primaryBtn}>
          {t.next}
        </button>
      </div>
    );
  }

  /* ---------- email и пароль ---------- */
  return (
    <div className="tp-up space-y-3">
      {back("about")}
      <div className="px-1 pb-1">
        <h2 className="text-[24px] font-extrabold tracking-[-0.02em]">{t.accountTitle}</h2>
        <p className="mt-1 text-[14px] text-[#8a8678]">{t.accountSub}</p>
      </div>
      <input
        type="email"
        inputMode="email"
        autoCapitalize="none"
        className={inputCls}
        placeholder={t.emailLabel}
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {pwInput}
      <p className="px-1 text-[12px] text-[#9a9585]">{t.pwHint}</p>
      {errorLine}
      <button type="button" disabled={busy} onClick={register} className={primaryBtn}>
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {t.creating}
          </>
        ) : (
          t.createBtn
        )}
      </button>
    </div>
  );
}