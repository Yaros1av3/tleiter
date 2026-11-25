"use client";

import { use, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, CheckCircle2, Download, FileUp, Loader2, MapPin, Tent, CalendarDays } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { SHIRT_SIZES } from "@/lib/campReg";

type Lang = "de" | "ru";

type Doc = {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  file_name: string | null;
  needs_upload: boolean;
  required: boolean;
};

type Info = {
  camp: {
    title: string;
    theme: string | null;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
    price: number | null;
    intro_ru: string | null;
    intro_de: string | null;
    deadline: string | null;
  };
  open: boolean;
  documents: Doc[];
};

const MAX_FILE = 10 * 1024 * 1024;

const inputCls =
  "block w-full rounded-2xl border border-[#e2dcc8] bg-white px-4 py-3.5 text-[16px] text-[#1b2431] outline-none transition placeholder:text-[#a8a493] focus:border-[#1b2431] focus:ring-4 focus:ring-[#ffc93c]/30";

function fmtDate(date: string | null, lang: Lang, opts: Intl.DateTimeFormatOptions) {
  if (!date) return "";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(lang === "ru" ? "ru-RU" : "de-DE", { timeZone: "UTC", ...opts });
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-[#ece6d3] bg-white p-5 shadow-[0_2px_10px_rgba(27,36,49,0.04)]">
      <h2 className="mb-3.5 text-[17px] font-extrabold tracking-[-0.01em]">{title}</h2>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

function Label({ text, required, children }: { text: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#5b5a50]">
        {text}
        {required && <span className="text-[#c2410c]"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            "flex h-11 min-w-[64px] items-center justify-center gap-1.5 rounded-full px-4 text-[14px] font-bold transition " +
            (value === o.value ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#e2dcc8]")
          }
        >
          {value === o.value && <Check size={14} className="text-[#ffc93c]" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Check2({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={
        "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-[14px] leading-snug transition " +
        (on ? "border-[#1b2431] bg-[#fff4d1]" : "border-[#e2dcc8] bg-white")
      }
    >
      <span
        className={
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 " +
          (on ? "border-[#1b2431] bg-[#1b2431]" : "border-[#c8c2ac]")
        }
      >
        {on && <Check size={13} strokeWidth={4} className="text-[#ffc93c]" />}
      </span>
      <span>{children}</span>
    </button>
  );
}

export default function CampRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [lang, setLang] = useState<Lang>("de");
  const L = (ru: string, de: string) => (lang === "ru" ? ru : de);

  const [info, setInfo] = useState<Info | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  const [f, setF] = useState({
    first_name: "",
    last_name: "",
    gender: "" as "" | "m" | "f",
    bd: "",
    bm: "",
    by: "",
    phone: "",
    email: "",
    city: "",
    parent_name: "",
    parent_phone: "",
    from_group: "",
    allergies: "",
    medications: "",
    health_notes: "",
    diet: "",
    can_swim: "" as "" | "yes" | "limited" | "no",
    tshirt_size: "",
    friend_wish: "",
    notes: "",
    photo_consent: false,
    rules_accepted: false,
    website: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((cur) => ({ ...cur, [k]: v }));

  const [files, setFiles] = useState<Record<number, File | null>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | "new" | "waitlist">(null);
  const openedAt = useRef(Date.now());

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
    let alive = true;
    (async () => {
      const res = await fetch(`/api/camp-register?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }).catch(() => null);
      if (!alive) return;
      if (!res) return setState("error");
      if (res.status === 404) return setState("missing");
      if (!res.ok) return setState("error");
      setInfo((await res.json()) as Info);
      setState("ready");
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const birth = useMemo(() => {
    const d = Number(f.bd);
    const m = Number(f.bm);
    const y = Number(f.by);
    if (!d || !m || y < 1950) return "";
    const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const check = new Date(`${iso}T12:00:00Z`);
    return !Number.isNaN(check.getTime()) && check.toISOString().slice(0, 10) === iso ? iso : "";
  }, [f.bd, f.bm, f.by]);

  const errText: Record<string, [string, string]> = {
    name: ["Укажи имя и фамилию.", "Bitte Vor- und Nachnamen angeben."],
    birth: ["Проверь дату рождения.", "Bitte das Geburtsdatum prüfen."],
    gender: ["Выбери пол.", "Bitte Geschlecht wählen."],
    parent: ["Укажи имя родителя и его телефон.", "Bitte Name und Telefonnummer eines Elternteils angeben."],
    phone: ["Проверь номер телефона.", "Bitte die Telefonnummer prüfen."],
    email: ["Проверь адрес почты.", "Bitte die E-Mail-Adresse prüfen."],
    rules: ["Нужно согласие с правилами лагеря.", "Die Camp-Regeln müssen akzeptiert werden."],
    files: ["Загрузи обязательные документы.", "Bitte die erforderlichen Dokumente hochladen."],
    fast: ["Слишком быстро. Попробуй ещё раз.", "Zu schnell. Bitte noch einmal versuchen."],
    closed: ["Приём заявок закрыт.", "Die Anmeldung ist geschlossen."],
  };

  async function submit() {
    if (!info || busy) return;
    setError("");
    const fail = (key: string) => {
      const pair: [string, string] = errText[key] ?? ["Не получилось. Попробуй ещё раз.", "Das hat nicht geklappt. Bitte noch einmal versuchen."];
      setError(L(pair[0], pair[1]));
    };

    if (!f.first_name.trim() || !f.last_name.trim()) return fail("name");
    if (!f.gender) return fail("gender");
    if (!birth) return fail("birth");
    if (!f.parent_name.trim() || f.parent_phone.trim().length < 6) return fail("parent");
    if (!f.rules_accepted) return fail("rules");
    for (const d of info.documents) {
      if (d.needs_upload && d.required && !files[d.id]) return fail("files");
      const file = files[d.id];
      if (file && file.size > MAX_FILE) return setError(L("Файл слишком большой (максимум 10 МБ).", "Die Datei ist zu groß (maximal 10 MB)."));
    }

    setBusy(true);
    const chosen = info.documents.filter((d) => files[d.id]).map((d) => ({ document_id: d.id, name: files[d.id]!.name }));
    const res = await fetch("/api/camp-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        lang,
        elapsed: Math.round((Date.now() - openedAt.current) / 1000),
        website: f.website,
        first_name: f.first_name,
        last_name: f.last_name,
        birth_date: birth,
        gender: f.gender,
        phone: f.phone,
        email: f.email,
        city: f.city,
        parent_name: f.parent_name,
        parent_phone: f.parent_phone,
        from_group: f.from_group,
        allergies: f.allergies,
        medications: f.medications,
        health_notes: f.health_notes,
        diet: f.diet,
        can_swim: f.can_swim,
        tshirt_size: f.tshirt_size,
        friend_wish: f.friend_wish,
        notes: f.notes,
        photo_consent: f.photo_consent,
        rules_accepted: f.rules_accepted,
        files: chosen,
      }),
    }).catch(() => null);

    if (!res || !res.ok) {
      setBusy(false);
      const j = res ? await res.json().catch(() => ({})) : {};
      return fail(String(j.error ?? ""));
    }
    const out = (await res.json()) as { status?: "new" | "waitlist"; uploads?: { document_id: number; path: string; token: string }[] };

    let failedUploads = 0;
    for (const u of out.uploads ?? []) {
      const file = files[u.document_id];
      if (!file) continue;
      const up = await supabase.storage.from("camp-files").uploadToSignedUrl(u.path, u.token, file);
      if (up.error) failedUploads++;
    }
    setBusy(false);
    setDone(out.status === "waitlist" ? "waitlist" : "new");
    if (failedUploads > 0)
      setError(L("Заявка принята, но некоторые файлы не загрузились. Отправь их служителям лично.", "Die Anmeldung ist angekommen, aber einige Dateien wurden nicht hochgeladen. Bitte sende sie den Mitarbeitern direkt."));
  }

  const camp = info?.camp;
  const intro = camp ? (lang === "ru" ? camp.intro_ru : camp.intro_de) || (lang === "ru" ? camp.intro_de : camp.intro_ru) : null;
  const dates = camp?.start_date
    ? camp.end_date && camp.end_date !== camp.start_date
      ? `${fmtDate(camp.start_date, lang, { day: "numeric", month: "long" })} – ${fmtDate(camp.end_date, lang, { day: "numeric", month: "long", year: "numeric" })}`
      : fmtDate(camp.start_date, lang, { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-[#faf8f3] text-[#1b2431] [overflow-wrap:anywhere]">
      <div className="mx-auto w-full max-w-[520px] pb-16">
        {/* шапка */}
        <div className="relative overflow-hidden bg-[#1b2431] px-5 pb-14 pt-5 text-white">
          <span className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#ffc93c]/20" />
          <div className="relative flex justify-end">
            <div className="flex rounded-full bg-white/15 p-1">
              {(["de", "ru"] as Lang[]).map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => changeLang(x)}
                  className={`min-h-9 rounded-full px-3.5 text-xs font-bold transition ${lang === x ? "bg-white text-[#1b2431]" : "text-white/90"}`}
                >
                  {x.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {camp && (
            <div className="relative mt-5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffc93c] text-[#1b2431]">
                <Tent size={28} />
              </span>
              <h1 className="mt-3 text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em]">{camp.title}</h1>
              {camp.theme && <p className="mt-1 text-[15px] text-[#ffc93c]">{camp.theme}</p>}
              {dates && (
                <p className="mt-3 flex items-center gap-2 text-[14px] text-white/80">
                  <CalendarDays size={15} />
                  {dates}
                </p>
              )}
              {camp.location && (
                <p className="mt-1 flex items-center gap-2 text-[14px] text-white/80">
                  <MapPin size={15} />
                  {camp.location}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="relative z-10 -mt-8 space-y-3.5 px-4">
          {state === "loading" && (
            <div className="flex justify-center rounded-[24px] bg-white p-10">
              <Loader2 className="animate-spin text-[#8a8678]" />
            </div>
          )}
          {state === "missing" && (
            <div className="rounded-[24px] bg-white p-6 text-center text-[15px]">{L("Эта страница не найдена.", "Diese Seite wurde nicht gefunden.")}</div>
          )}
          {state === "error" && (
            <div className="rounded-[24px] bg-white p-6 text-center text-[15px]">
              {L("Не удалось загрузить. Проверь интернет и попробуй ещё раз.", "Laden fehlgeschlagen. Bitte Internet prüfen und noch einmal versuchen.")}
            </div>
          )}

          {state === "ready" && info && !info.open && !done && (
            <div className="rounded-[24px] bg-white p-6 text-center">
              <p className="text-[17px] font-extrabold">{L("Приём заявок закрыт", "Die Anmeldung ist geschlossen")}</p>
              <p className="mt-1.5 text-[14px] text-[#5b5a50]">
                {L("Сейчас регистрация недоступна. Спроси у служителей.", "Die Anmeldung ist gerade nicht möglich. Frag bitte die Mitarbeiter.")}
              </p>
            </div>
          )}

          {done && (
            <div className="rounded-[24px] bg-white p-6 text-center">
              <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
              <p className="mt-3 text-[20px] font-extrabold">
                {done === "waitlist" ? L("Ты в листе ожидания", "Du stehst auf der Warteliste") : L("Заявка отправлена", "Anmeldung gesendet")}
              </p>
              <p className="mt-1.5 text-[14px] leading-snug text-[#5b5a50]">
                {done === "waitlist"
                  ? L("Все места заняты. Если место освободится, мы свяжемся с твоими родителями.", "Alle Plätze sind vergeben. Wenn ein Platz frei wird, melden wir uns bei deinen Eltern.")
                  : L("Спасибо! Мы свяжемся с твоими родителями и подтвердим участие.", "Danke! Wir melden uns bei deinen Eltern und bestätigen die Teilnahme.")}
              </p>
              {error && <p className="mt-3 rounded-2xl bg-[#fff4d1] px-4 py-3 text-[13px] font-semibold text-[#9a6b00]">{error}</p>}
            </div>
          )}

          {state === "ready" && info && info.open && !done && (
            <>
              {(intro || camp?.price != null || camp?.deadline) && (
                <section className="rounded-[24px] border border-[#ece6d3] bg-white p-5">
                  {intro && <p className="whitespace-pre-line text-[14px] leading-[1.55] text-[#5b5a50]">{intro}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {camp?.price != null && (
                      <span className="rounded-full bg-[#fff4d1] px-3 py-1.5 text-[13px] font-bold text-[#9a6b00]">
                        {L("Стоимость", "Preis")}: {camp.price} €
                      </span>
                    )}
                    {camp?.deadline && (
                      <span className="rounded-full bg-[#f1ecdc] px-3 py-1.5 text-[13px] font-bold text-[#5b5a50]">
                        {L("Запись до", "Anmeldung bis")} {fmtDate(camp.deadline, lang, { day: "numeric", month: "long" })}
                      </span>
                    )}
                  </div>
                </section>
              )}

              {/* ловушка для ботов: людям не видна */}
              <input
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={f.website}
                onChange={(e) => set("website", e.target.value)}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />

              <Card title={L("О тебе", "Über dich")}>
                <Label text={L("Имя", "Vorname")} required>
                  <input className={inputCls} value={f.first_name} onChange={(e) => set("first_name", e.target.value)} autoComplete="given-name" />
                </Label>
                <Label text={L("Фамилия", "Nachname")} required>
                  <input className={inputCls} value={f.last_name} onChange={(e) => set("last_name", e.target.value)} autoComplete="family-name" />
                </Label>
                <Label text={L("Пол", "Geschlecht")} required>
                  <Chips
                    value={f.gender}
                    onChange={(v) => set("gender", v)}
                    options={[
                      { value: "m", label: L("Парень", "Junge") },
                      { value: "f", label: L("Девушка", "Mädchen") },
                    ]}
                  />
                </Label>
                <Label text={L("Дата рождения", "Geburtsdatum")} required>
                  <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
                    <input className={inputCls + " text-center"} inputMode="numeric" maxLength={2} placeholder={L("ДД", "TT")} value={f.bd} onChange={(e) => set("bd", e.target.value.replace(/\D/g, ""))} />
                    <input className={inputCls + " text-center"} inputMode="numeric" maxLength={2} placeholder={L("ММ", "MM")} value={f.bm} onChange={(e) => set("bm", e.target.value.replace(/\D/g, ""))} />
                    <input className={inputCls + " text-center"} inputMode="numeric" maxLength={4} placeholder={L("ГГГГ", "JJJJ")} value={f.by} onChange={(e) => set("by", e.target.value.replace(/\D/g, ""))} />
                  </div>
                </Label>
                <Label text={L("Город", "Wohnort")}>
                  <input className={inputCls} value={f.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
                </Label>
                <Label text={L("Твой телефон", "Deine Telefonnummer")}>
                  <input className={inputCls} inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+49" />
                </Label>
                <Label text={L("Твоя почта", "Deine E-Mail")}>
                  <input className={inputCls} inputMode="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
                </Label>
                <Label text={L("Из какой церкви или группы", "Aus welcher Gemeinde oder Gruppe")}>
                  <input className={inputCls} value={f.from_group} onChange={(e) => set("from_group", e.target.value)} />
                </Label>
              </Card>

              <Card title={L("Родители", "Eltern")}>
                <Label text={L("Имя родителя", "Name eines Elternteils")} required>
                  <input className={inputCls} value={f.parent_name} onChange={(e) => set("parent_name", e.target.value)} />
                </Label>
                <Label text={L("Телефон родителя (на случай экстренной связи)", "Telefon der Eltern (für Notfälle)")} required>
                  <input className={inputCls} inputMode="tel" value={f.parent_phone} onChange={(e) => set("parent_phone", e.target.value)} placeholder="+49" />
                </Label>
              </Card>

              <Card title={L("Здоровье и питание", "Gesundheit und Essen")}>
                <Label text={L("Аллергии", "Allergien")}>
                  <textarea rows={2} className={inputCls} value={f.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder={L("Если нет, оставь пустым", "Wenn keine, leer lassen")} />
                </Label>
                <Label text={L("Лекарства, которые нужно принимать", "Medikamente, die genommen werden müssen")}>
                  <textarea rows={2} className={inputCls} value={f.medications} onChange={(e) => set("medications", e.target.value)} />
                </Label>
                <Label text={L("Другое, что важно знать о здоровье", "Weitere wichtige Gesundheitshinweise")}>
                  <textarea rows={2} className={inputCls} value={f.health_notes} onChange={(e) => set("health_notes", e.target.value)} />
                </Label>
                <Label text={L("Особенности питания (вегетарианство и т.п.)", "Besonderheiten beim Essen (vegetarisch usw.)")}>
                  <input className={inputCls} value={f.diet} onChange={(e) => set("diet", e.target.value)} />
                </Label>
                <Label text={L("Плавание", "Schwimmen")}>
                  <Chips
                    value={f.can_swim}
                    onChange={(v) => set("can_swim", v)}
                    options={[
                      { value: "yes", label: L("Умею", "Ja") },
                      { value: "limited", label: L("Неуверенно", "Unsicher") },
                      { value: "no", label: L("Не умею", "Nein") },
                    ]}
                  />
                </Label>
              </Card>

              <Card title={L("Для лагеря", "Fürs Camp")}>
                <Label text={L("Размер футболки", "T-Shirt-Größe")}>
                  <Chips value={f.tshirt_size} onChange={(v) => set("tshirt_size", v)} options={SHIRT_SIZES.map((s) => ({ value: s, label: s }))} />
                </Label>
                <Label text={L("С кем хочешь в один отряд", "Mit wem möchtest du in eine Gruppe")}>
                  <input className={inputCls} value={f.friend_wish} onChange={(e) => set("friend_wish", e.target.value)} />
                </Label>
                <Label text={L("Что ещё нам важно знать", "Was wir sonst wissen sollten")}>
                  <textarea rows={3} className={inputCls} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
                </Label>
              </Card>

              {info.documents.length > 0 && (
                <Card title={L("Документы", "Dokumente")}>
                  {info.documents.map((d) => (
                    <div key={d.id} className="rounded-2xl bg-[#faf8f3] p-3.5">
                      <p className="text-[15px] font-bold">
                        {d.title}
                        {d.needs_upload && d.required && <span className="text-[#c2410c]"> *</span>}
                      </p>
                      {d.description && <p className="mt-1 text-[13px] leading-snug text-[#5b5a50]">{d.description}</p>}
                      {d.url && (
                        <a
                          href={d.url}
                          className="mt-2.5 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-bold ring-1 ring-[#e2dcc8]"
                        >
                          <Download size={15} />
                          {L("Скачать", "Herunterladen")}
                        </a>
                      )}
                      {d.needs_upload && (
                        <label className="mt-2.5 flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 text-[14px] font-semibold ring-1 ring-[#e2dcc8]">
                          <FileUp size={16} className="shrink-0 text-[#9a6b00]" />
                          <span className="min-w-0 flex-1 truncate">
                            {files[d.id]?.name ?? L("Загрузить заполненный документ", "Ausgefülltes Dokument hochladen")}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.heic,.doc,.docx"
                            className="hidden"
                            onChange={(e) => setFiles((cur) => ({ ...cur, [d.id]: e.target.files?.[0] ?? null }))}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </Card>
              )}

              <Card title={L("Согласия", "Einverständnis")}>
                <Check2 on={f.rules_accepted} onChange={(v) => set("rules_accepted", v)}>
                  {L("Мы ознакомились с правилами лагеря и согласны с ними.", "Wir kennen die Camp-Regeln und sind damit einverstanden.")}
                  <span className="text-[#c2410c]"> *</span>
                </Check2>
                <Check2 on={f.photo_consent} onChange={(v) => set("photo_consent", v)}>
                  {L("Разрешаем фотографировать и использовать фото из лагеря в служении.", "Wir erlauben Fotos im Camp und deren Verwendung in der Gemeindearbeit.")}
                </Check2>
              </Card>

              {error && (
                <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="flex h-[58px] w-full items-center justify-center gap-2 rounded-full bg-[#ffc93c] text-[17px] font-extrabold text-[#1b2431] shadow-[0_8px_22px_rgba(27,36,49,0.15)] transition active:scale-[0.985] disabled:opacity-60"
              >
                {busy && <Loader2 size={18} className="animate-spin" />}
                {busy ? L("Отправляем...", "Wird gesendet...") : L("Отправить заявку", "Anmeldung absenden")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}