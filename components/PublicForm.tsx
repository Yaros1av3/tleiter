"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Clock3, MapPin, Users } from "lucide-react";

import {
  formatEventDate,
  hasCyrillic,
  isEmail,
  isLatinName,
  isPhone,
  isPlausibleBirth,
  pickText,
  themeOf,
  type FormQuestion,
} from "@/lib/forms";

type Lang = "de" | "ru";

type PublicFormData = {
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
  questions: FormQuestion[];
  closed: boolean;
  full: boolean;
  spots_left: number | null;
};

const TEXT = {
  de: {
    first: "Vorname",
    last: "Nachname",
    send: "Anmelden",
    sending: "Wird gesendet…",
    required: "Pflichtfeld",
    yes: "Ja",
    no: "Nein",
    pick: "Bitte wählen",
    spots: (n: number) => `Noch ${n} ${n === 1 ? "Platz" : "Plätze"} frei`,
    closed: "Die Anmeldung ist geschlossen.",
    full: "Leider sind alle Plätze vergeben.",
    notFound: "Diese Seite gibt es nicht.",
    loadError: "Die Seite konnte nicht geladen werden. Bitte versuche es später noch einmal.",
    doneTitle: "Du bist dabei!",
    doneText: "Deine Anmeldung ist angekommen. Wir freuen uns auf dich!",
    errName: "Bitte gib Vor- und Nachnamen ein.",
    errLatin: "Bitte schreibe Vor- und Nachnamen mit lateinischen Buchstaben (auf Deutsch).",
    nameHint: "",
    birth: "Geburtsdatum",
    day: "Tag",
    month: "Monat",
    year: "Jahr",
    phone: "Deine Handynummer",
    optional: "optional",
    parents: "Eltern",
    parentName: "Name der Eltern (Vor- und Nachname)",
    parentPhone: "Telefonnummer der Eltern",
    email: "Deine E-Mail",
    errBirth: "Bitte gib dein Geburtsdatum vollständig und richtig an.",
    errPhone: "Bitte prüfe die Telefonnummer.",
    errParentName: "Bitte gib den Namen der Eltern an.",
    errParentPhone: "Bitte gib eine Telefonnummer der Eltern an.",
    errEmail: "Bitte prüfe die E-Mail-Adresse.",
    months: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
    errReq: "Bitte fülle alle Pflichtfelder aus.",
    errDup: "Du bist schon angemeldet.",
    errMany: "Zu viele Versuche. Bitte warte kurz.",
    errGeneric: "Das hat nicht geklappt. Bitte versuche es nochmal.",
    isThatYou: "Bist du das?",
    yearsOld: (n: number | null) => (n == null ? "" : `${n} Jahre`),
    itsMe: "Ja, das bin ich",
    notMe: "Nein",
    hello: "Schön, dich zu sehen",
    another: "Weitere Person anmelden",
  },
  ru: {
    first: "Имя",
    last: "Фамилия",
    send: "Записаться",
    sending: "Отправляем…",
    required: "Обязательное поле",
    yes: "Да",
    no: "Нет",
    pick: "Выбери",
    spots: (n: number) => `Осталось мест: ${n}`,
    closed: "Запись закрыта.",
    full: "К сожалению, все места заняты.",
    notFound: "Такой страницы нет.",
    loadError: "Не удалось загрузить страницу. Попробуй чуть позже.",
    doneTitle: "Ты записан(а)!",
    doneText: "Мы получили твою заявку. Ждём тебя!",
    errName: "Пожалуйста, укажи имя и фамилию.",
    errLatin: "Имя и фамилию нужно писать латиницей, по-немецки (например: Anna Müller).",
    nameHint: "Имя и фамилию пиши латиницей, по-немецки — например: Anna Müller",
    birth: "Дата рождения",
    day: "День",
    month: "Месяц",
    year: "Год",
    phone: "Твой номер телефона",
    optional: "необязательно",
    parents: "Родители",
    parentName: "Имя родителя (имя и фамилия)",
    parentPhone: "Телефон родителя",
    email: "Твоя почта",
    errBirth: "Укажи дату рождения полностью и правильно.",
    errPhone: "Проверь номер телефона.",
    errParentName: "Укажи имя родителя.",
    errParentPhone: "Укажи телефон родителя.",
    errEmail: "Проверь адрес электронной почты.",
    months: ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"],
    errReq: "Пожалуйста, заполни все обязательные поля.",
    errDup: "Ты уже записан(а).",
    errMany: "Слишком много попыток. Подожди немного.",
    errGeneric: "Не получилось. Попробуй ещё раз.",
    isThatYou: "Это ты?",
    yearsOld: (n: number | null) => (n == null ? "" : `${n} лет`),
    itsMe: "Да, это я",
    notMe: "Нет",
    hello: "Рады тебя видеть",
    another: "Записать ещё одного человека",
  },
};

export default function PublicForm({ slug }: { slug: string }) {
  const [lang, setLang] = useState<Lang>("de");
  const [form, setForm] = useState<PublicFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadDetail, setLoadDetail] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [honeypot, setHoneypot] = useState("");

  const [bDay, setBDay] = useState("");
  const [bMonth, setBMonth] = useState("");
  const [bYear, setBYear] = useState("");
  const [phone, setPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [email, setEmail] = useState("");

  const [match, setMatch] = useState<{ id: number; age: number | null } | null>(
    null,
  );
  const [teenId, setTeenId] = useState<number | null>(null);
  const [declinedKey, setDeclinedKey] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const openedAt = useRef(Date.now());

  const t = TEXT[lang];
  const theme = themeOf(form?.theme);

  // язык по умолчанию — по языку телефона
  useEffect(() => {
    try {
      const saved = localStorage.getItem("form-lang");
      if (saved === "de" || saved === "ru") {
        setLang(saved);
        return;
      }
    } catch {
      /* ignore */
    }
    if (navigator.language?.toLowerCase().startsWith("ru")) setLang("ru");
  }, []);

  function changeLang(next: Lang) {
    setLang(next);
    try {
      localStorage.setItem("form-lang", next);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const response = await fetch(`/api/forms/${slug}`, { cache: "no-store" });

      if (cancelled) return;

      if (!response.ok) {
        if (response.status === 404) setNotFound(true);
        else {
          setLoadError(true);
          const data = (await response.json().catch(() => ({}))) as { detail?: string };
          setLoadDetail(data.detail ?? "");
        }
        setLoading(false);
        return;
      }

      setForm((await response.json()) as PublicFormData);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setLoadError(true);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // «Это ты?» — ищем подростка в базе, когда введены имя и фамилия
  const nameKey = `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;

  const birthForLookup =
    bDay && bMonth && bYear
      ? `${bYear}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`
      : "";

  useEffect(() => {
    setMatch(null);
    setTeenId(null);

    if (firstName.trim().length < 2 || lastName.trim().length < 2) return;
    if (!isLatinName(firstName) || !isLatinName(lastName)) return;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/forms/${slug}/lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            birth_date: birthForLookup,
          }),
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          matches: { id: number; age: number | null }[];
        };

        setMatch(data.matches[0] ?? null);
      } catch {
        /* без подсказки тоже работает */
      }
    }, 700);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameKey, birthForLookup, slug]);

  const dateLabel = useMemo(
    () => (form ? formatEventDate(form.event_date, lang) : ""),
    [form, lang],
  );

  function setAnswer(id: string, value: unknown) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  function reset() {
    setFirstName("");
    setLastName("");
    setAnswers({});
    setBDay("");
    setBMonth("");
    setBYear("");
    setPhone("");
    setParentName("");
    setParentPhone("");
    setEmail("");
    setMatch(null);
    setTeenId(null);
    setDeclinedKey("");
    setError("");
    setDone(false);
    openedAt.current = Date.now();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || submitting) return;

    setError("");

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setError(t.errName);
      return;
    }

    if (!isLatinName(firstName) || !isLatinName(lastName)) {
      setError(t.errLatin);
      return;
    }

    const birthDate =
      bDay && bMonth && bYear
        ? `${bYear}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`
        : "";

    if (!isPlausibleBirth(birthDate)) {
      setError(t.errBirth);
      return;
    }

    if (!isPhone(phone)) {
      setError(t.errPhone);
      return;
    }

    if (parentName.trim().length < 2) {
      setError(t.errParentName);
      return;
    }

    if (!isLatinName(parentName)) {
      setError(t.errLatin);
      return;
    }

    if (!isPhone(parentPhone)) {
      setError(t.errParentPhone);
      return;
    }

    if (!isEmail(email)) {
      setError(t.errEmail);
      return;
    }

    for (const q of form.questions) {
      if (!q.required) continue;
      const value = answers[q.id];
      const empty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (empty) {
        setError(t.errReq);
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          answers,
          teen_id: teenId,
          birth_date: birthDate,
          phone,
          parent_name: parentName,
          parent_phone: parentPhone,
          email,
          declined: declinedKey === nameKey,
          lang,
          website: honeypot,
          elapsed: Math.round((Date.now() - openedAt.current) / 1000),
        }),
      });

      if (response.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          field?: string;
        };

        if (data.error === "duplicate") setError(t.errDup);
        else if (data.error === "closed") setError(t.closed);
        else if (data.error === "full") setError(t.full);
        else if (data.error === "too_many") setError(t.errMany);
        else if (data.error === "required") setError(t.errReq);
        else if (data.error === "name") setError(t.errName);
        else if (data.error === "latin") setError(t.errLatin);
        else if (data.error === "invalid") {
          const field = (data as { field?: string }).field;
          setError(
            field === "birth"
              ? t.errBirth
              : field === "phone"
                ? t.errPhone
                : field === "parent_name"
                  ? t.errParentName
                  : field === "parent_phone"
                    ? t.errParentPhone
                    : field === "email"
                      ? t.errEmail
                      : t.errGeneric,
          );
        }
        else setError(t.errGeneric);
      }
    } catch {
      setError(t.errGeneric);
    }

    setSubmitting(false);
  }

  const inputClass = `block min-w-0 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-[16px] text-[#111820] outline-none transition placeholder:text-neutral-400 focus:ring-4 ${theme.ring}`;

  const title = form ? pickText(form.title_de, form.title_ru, lang) : "";
  const description = form ? pickText(form.desc_de, form.desc_ru, lang) : "";

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-[#f7f7f6] text-[#111820] [overflow-wrap:anywhere]">
      <div className="mx-auto w-full max-w-[520px] pb-16">
        {/* HERO */}
        <div
          className={`relative overflow-hidden bg-gradient-to-br ${theme.hero} px-5 pb-14 pt-5 text-white`}
        >
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-white/10" />

          <div className="relative flex justify-end">
            <div className="flex rounded-full bg-white/20 p-1 backdrop-blur">
              {(["de", "ru"] as Lang[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeLang(item)}
                  className={`min-h-9 rounded-full px-3.5 text-xs font-bold transition ${
                    lang === item ? "bg-white text-[#111820]" : "text-white/90"
                  }`}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {form && (
            <div className="relative mt-6">
              <div className="text-[48px] leading-none drop-shadow">
                {form.emoji}
              </div>

              <h1 className="mt-3 text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[32px]">
                {title}
              </h1>
            </div>
          )}
        </div>

        <div className="relative z-10 -mt-8 px-4">
          {loading ? (
            <div className="h-40 animate-pulse rounded-[26px] bg-white shadow-sm" />
          ) : notFound || !form ? (
            <div className="rounded-[26px] bg-white p-8 text-center text-[15px] text-neutral-500 shadow-sm">
              {loadError ? t.loadError : t.notFound}
              {loadError && loadDetail && (
                <div className="mt-3 break-words text-[11px] text-neutral-400">
                  {loadDetail}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* INFO CARD */}
              <div className="rounded-[26px] bg-white p-5 shadow-[0_10px_30px_rgba(17,24,32,0.08)]">
                <div className="flex flex-wrap gap-2">
                  {dateLabel && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${theme.soft}`}
                    >
                      <CalendarDays size={14} />
                      {dateLabel}
                    </span>
                  )}
                  {form.event_time && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${theme.soft}`}
                    >
                      <Clock3 size={14} />
                      {form.event_time}
                    </span>
                  )}
                  {form.location && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${theme.soft}`}
                    >
                      <MapPin size={14} />
                      {form.location}
                    </span>
                  )}
                </div>

                {description && (
                  <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-600">
                    {description}
                  </p>
                )}

                {form.spots_left != null && !form.closed && !form.full && (
                  <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500">
                    <Users size={14} />
                    {t.spots(form.spots_left)}
                  </div>
                )}
              </div>

              {/* STATE */}
              {done ? (
                <div className="mt-4 rounded-[26px] bg-white p-7 text-center shadow-[0_10px_30px_rgba(17,24,32,0.08)]">
                  <div
                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${theme.accent}`}
                  >
                    <Check size={32} strokeWidth={3} />
                  </div>
                  <h2 className="mt-4 text-[22px] font-extrabold tracking-[-0.02em]">
                    {t.doneTitle}
                  </h2>
                  <p className="mt-2 text-[15px] text-neutral-500">
                    {t.doneText}
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-5 text-[13px] font-semibold text-neutral-400 underline underline-offset-4"
                  >
                    {t.another}
                  </button>
                </div>
              ) : form.closed || form.full ? (
                <div className="mt-4 rounded-[26px] bg-white p-6 text-center text-[15px] font-semibold text-neutral-500 shadow-sm">
                  {form.full && !form.closed ? t.full : t.closed}
                </div>
              ) : (
                <form
                  onSubmit={submit}
                  className="mt-4 space-y-5 rounded-[26px] bg-white p-5 shadow-[0_10px_30px_rgba(17,24,32,0.08)]"
                >
                  {/* ловушка для ботов — людям не видна */}
                  <div
                    aria-hidden="true"
                    className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                  >
                    <label>
                      Website
                      <input
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label className="mb-1.5 block text-[13px] font-bold text-neutral-700">
                        {t.first}
                      </label>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                        autoCapitalize="words"
                        maxLength={60}
                        className={inputClass}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="mb-1.5 block text-[13px] font-bold text-neutral-700">
                        {t.last}
                      </label>
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                        autoCapitalize="words"
                        maxLength={60}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {(hasCyrillic(firstName) || hasCyrillic(lastName)) ? (
                    <div className="-mt-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
                      {t.errLatin}
                    </div>
                  ) : (
                    t.nameHint && (
                      <p className="-mt-2 px-1 text-[12px] text-neutral-400">
                        {t.nameHint}
                      </p>
                    )
                  )}

                  {/* Это ты? */}
                  {match && declinedKey !== nameKey && (
                    <div
                      className={`rounded-2xl p-4 ${
                        teenId ? "bg-emerald-50" : theme.soft
                      }`}
                    >
                      {teenId ? (
                        <div className="flex items-center gap-2 text-[14px] font-bold text-emerald-700">
                          <Check size={18} strokeWidth={3} />
                          {t.hello}, {firstName.trim()}!
                        </div>
                      ) : (
                        <>
                          <div className="text-[14px] font-bold">
                            {t.isThatYou}
                          </div>
                          <div className="mt-0.5 text-[14px]">
                            {firstName.trim()} {lastName.trim()}
                            {match.age != null && ` · ${t.yearsOld(match.age)}`}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setTeenId(match.id)}
                              className={`h-10 rounded-full px-5 text-[13px] font-bold ${theme.accent}`}
                            >
                              {t.itsMe}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeclinedKey(nameKey)}
                              className="h-10 rounded-full bg-white px-5 text-[13px] font-bold text-neutral-500"
                            >
                              {t.notMe}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* дата рождения */}
                  <div>
                    <label className="mb-1.5 block text-[14px] font-bold text-neutral-800">
                      {t.birth} <span className={theme.text}>*</span>
                    </label>
                    <div className="grid grid-cols-[1fr_1.7fr_1.2fr] gap-2">
                      {(
                        [
                          [bDay, setBDay, t.day, Array.from({ length: 31 }, (_, i) => ({ v: String(i + 1), l: String(i + 1) }))],
                          [bMonth, setBMonth, t.month, t.months.map((name, i) => ({ v: String(i + 1), l: name }))],
                          [
                            bYear,
                            setBYear,
                            t.year,
                            Array.from({ length: 21 }, (_, i) => {
                              const y = new Date().getFullYear() - 5 - i;
                              return { v: String(y), l: String(y) };
                            }),
                          ],
                        ] as [string, (v: string) => void, string, { v: string; l: string }[]][]
                      ).map(([value, setter, placeholder, options]) => (
                        <select
                          key={placeholder}
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          aria-label={placeholder}
                          className={`h-[54px] min-w-0 rounded-2xl border border-neutral-200 bg-white px-2.5 text-[16px] outline-none focus:ring-4 ${theme.ring} ${
                            value ? "text-[#111820]" : "text-neutral-400"
                          }`}
                        >
                          <option value="">{placeholder}</option>
                          {options.map((option) => (
                            <option key={option.v} value={option.v}>
                              {option.l}
                            </option>
                          ))}
                        </select>
                      ))}
                    </div>
                  </div>

                  {/* телефон подростка */}
                  <div>
                    <label className="mb-1.5 block text-[14px] font-bold text-neutral-800">
                      {t.phone} <span className={theme.text}>*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={30}
                      placeholder="+49 …"
                      className={inputClass}
                    />
                  </div>

                  {/* почта подростка */}
                  <div>
                    <label className="mb-1.5 block text-[14px] font-bold text-neutral-800">
                      {t.email} <span className={theme.text}>*</span>
                    </label>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={120}
                      className={inputClass}
                    />
                  </div>

                  {/* родители */}
                  <div className={`space-y-4 rounded-2xl p-4 ${theme.soft}`}>
                    <div className="text-[13px] font-extrabold uppercase tracking-wider">
                      {t.parents}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[14px] font-bold text-neutral-800">
                        {t.parentName} <span className={theme.text}>*</span>
                      </label>
                      <input
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        autoCapitalize="words"
                        maxLength={80}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[14px] font-bold text-neutral-800">
                        {t.parentPhone} <span className={theme.text}>*</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        maxLength={30}
                        placeholder="+49 …"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {form.questions.map((q) => {
                    const label = pickText(q.label_de, q.label_ru, lang);
                    const options = (q.options ?? []).map((option) =>
                      pickText(option.de, option.ru, lang),
                    );
                    const value = answers[q.id];

                    return (
                      <div key={q.id}>
                        <label className="mb-1.5 block text-[14px] font-bold text-neutral-800">
                          {label}
                          {q.required && (
                            <span className={`ml-1 ${theme.text}`}>*</span>
                          )}
                        </label>

                        {(q.type === "short" || q.type === "phone") && (
                          <input
                            type={q.type === "phone" ? "tel" : "text"}
                            inputMode={q.type === "phone" ? "tel" : undefined}
                            value={(value as string) ?? ""}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                            maxLength={200}
                            className={inputClass}
                          />
                        )}

                        {q.type === "long" && (
                          <textarea
                            value={(value as string) ?? ""}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                            rows={3}
                            maxLength={2000}
                            className={`${inputClass} resize-none`}
                          />
                        )}

                        {q.type === "number" && (
                          <input
                            type="number"
                            inputMode="numeric"
                            value={(value as string) ?? ""}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                            className={inputClass}
                          />
                        )}

                        {q.type === "yesno" && (
                          <div className="grid grid-cols-2 gap-2">
                            {[true, false].map((flag) => (
                              <button
                                key={String(flag)}
                                type="button"
                                onClick={() => setAnswer(q.id, flag)}
                                className={`h-12 rounded-2xl border text-[15px] font-bold transition ${
                                  value === flag
                                    ? `${theme.accent} border-transparent`
                                    : "border-neutral-200 bg-white text-neutral-500"
                                }`}
                              >
                                {flag ? t.yes : t.no}
                              </button>
                            ))}
                          </div>
                        )}

                        {q.type === "single" && (
                          <div className="space-y-2">
                            {options.map((option, index) => {
                              const stored = q.options?.[index];
                              const key = stored?.de || stored?.ru || option;
                              const selected = value === key;
                              return (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => setAnswer(q.id, key)}
                                  className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-[15px] font-semibold transition ${
                                    selected
                                      ? `${theme.soft} border-current`
                                      : "border-neutral-200 bg-white text-neutral-600"
                                  }`}
                                >
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                      selected ? "border-current" : "border-neutral-300"
                                    }`}
                                  >
                                    {selected && (
                                      <span className="h-2.5 w-2.5 rounded-full bg-current" />
                                    )}
                                  </span>
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {q.type === "multi" && (
                          <div className="space-y-2">
                            {options.map((option, index) => {
                              const stored = q.options?.[index];
                              const key = stored?.de || stored?.ru || option;
                              const list = Array.isArray(value)
                                ? (value as string[])
                                : [];
                              const selected = list.includes(key);
                              return (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() =>
                                    setAnswer(
                                      q.id,
                                      selected
                                        ? list.filter((item) => item !== key)
                                        : [...list, key],
                                    )
                                  }
                                  className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-[15px] font-semibold transition ${
                                    selected
                                      ? `${theme.soft} border-current`
                                      : "border-neutral-200 bg-white text-neutral-600"
                                  }`}
                                >
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                                      selected
                                        ? "border-current bg-current"
                                        : "border-neutral-300"
                                    }`}
                                  >
                                    {selected && (
                                      <Check
                                        size={13}
                                        strokeWidth={4}
                                        className="text-white"
                                      />
                                    )}
                                  </span>
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {error && (
                    <div
                      role="alert"
                      className="rounded-2xl bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`h-[58px] w-full rounded-full text-[17px] font-extrabold shadow-[0_8px_22px_rgba(17,24,32,0.15)] transition active:scale-[0.985] disabled:opacity-60 ${theme.accent}`}
                  >
                    {submitting ? t.sending : t.send}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}