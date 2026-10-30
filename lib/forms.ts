/* Общие типы и вспомогательные функции для форм (используются и на сервере, и в браузере) */

export type QuestionType =
  | "short"
  | "long"
  | "single"
  | "multi"
  | "yesno"
  | "number"
  | "phone";

export type QuestionOption = { de: string; ru: string };

export type FormQuestion = {
  id: string;
  type: QuestionType;
  label_de: string;
  label_ru: string;
  required: boolean;
  options?: QuestionOption[];
};

export type FormRow = {
  id: number;
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
  capacity: number | null;
  closes_at: string | null;
  is_open: boolean;
  questions: FormQuestion[];
  created_at: string;
};

export type ResponseRow = {
  id: number;
  form_id: number;
  first_name: string;
  last_name: string;
  teen_id: number | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  answers: Record<string, unknown>;
  attendance: "registered" | "came" | "absent";
  source: string;
  lang: string | null;
  created_at: string;
};

export const QUESTION_TYPES: {
  type: QuestionType;
  ru: string;
  de: string;
}[] = [
  { type: "short", ru: "Короткий ответ", de: "Kurze Antwort" },
  { type: "long", ru: "Длинный ответ", de: "Lange Antwort" },
  { type: "single", ru: "Один вариант", de: "Eine Auswahl" },
  { type: "multi", ru: "Несколько вариантов", de: "Mehrfachauswahl" },
  { type: "yesno", ru: "Да / Нет", de: "Ja / Nein" },
  { type: "number", ru: "Число", de: "Zahl" },
  { type: "phone", ru: "Телефон", de: "Telefon" },
];

/* Цветовые темы страницы мероприятия */
export const THEMES: Record<
  string,
  { name: string; hero: string; accent: string; soft: string; ring: string; text: string; scene?: string }
> = {
  christmas: {
    name: "Рождество",
    hero: "from-[#0b3b2e] via-[#14513f] to-[#6d1d2a]",
    accent: "bg-[#c0392b] text-white",
    soft: "bg-red-50 text-red-800",
    ring: "focus:border-red-400 focus:ring-red-100",
    text: "text-red-700",
    scene: "christmas",
  },
  winter: {
    name: "Зима",
    hero: "from-[#5ea0e8] via-[#3f7fd0] to-[#27508f]",
    accent: "bg-sky-700 text-white",
    soft: "bg-sky-50 text-sky-800",
    ring: "focus:border-sky-400 focus:ring-sky-100",
    text: "text-sky-700",
    scene: "winter",
  },
  camp: {
    name: "Лагерь",
    hero: "from-[#f6a34a] via-[#d9693a] to-[#3b4a2f]",
    accent: "bg-orange-600 text-white",
    soft: "bg-orange-50 text-orange-800",
    ring: "focus:border-orange-400 focus:ring-orange-100",
    text: "text-orange-700",
    scene: "camp",
  },
  party: {
    name: "Праздник",
    hero: "from-fuchsia-500 via-purple-500 to-indigo-600",
    accent: "bg-fuchsia-600 text-white",
    soft: "bg-fuchsia-50 text-fuchsia-800",
    ring: "focus:border-fuchsia-400 focus:ring-fuchsia-100",
    text: "text-fuchsia-700",
    scene: "party",
  },
  sea: {
    name: "Море",
    hero: "from-cyan-400 via-sky-500 to-blue-700",
    accent: "bg-cyan-700 text-white",
    soft: "bg-cyan-50 text-cyan-800",
    ring: "focus:border-cyan-400 focus:ring-cyan-100",
    text: "text-cyan-700",
    scene: "sea",
  },
  tlight: {
    name: "TLight",
    hero: "from-[#1b2431] via-[#1b2431] to-[#3a4a63]",
    accent: "bg-[#ffc93c] text-[#1b2431]",
    soft: "bg-[#fff4d1] text-[#8a5f00]",
    ring: "focus:border-[#ffc93c] focus:ring-[#ffc93c]/30",
    text: "text-[#b07800]",
  },
  amber: {
    name: "Солнце",
    hero: "from-amber-300 via-orange-400 to-orange-500",
    accent: "bg-orange-500 text-white",
    soft: "bg-orange-50 text-orange-700",
    ring: "focus:border-orange-400 focus:ring-orange-100",
    text: "text-orange-600",
    scene: "sun",
  },
  sky: {
    name: "Небо",
    hero: "from-sky-300 via-sky-400 to-indigo-500",
    accent: "bg-sky-600 text-white",
    soft: "bg-sky-50 text-sky-700",
    ring: "focus:border-sky-400 focus:ring-sky-100",
    text: "text-sky-600",
    scene: "clouds",
  },
  emerald: {
    name: "Лес",
    hero: "from-emerald-300 via-emerald-400 to-teal-600",
    accent: "bg-emerald-600 text-white",
    soft: "bg-emerald-50 text-emerald-700",
    ring: "focus:border-emerald-400 focus:ring-emerald-100",
    text: "text-emerald-600",
    scene: "forest",
  },
  rose: {
    name: "Закат",
    hero: "from-rose-300 via-pink-400 to-fuchsia-500",
    accent: "bg-rose-500 text-white",
    soft: "bg-rose-50 text-rose-700",
    ring: "focus:border-rose-400 focus:ring-rose-100",
    text: "text-rose-600",
    scene: "sunset",
  },
  violet: {
    name: "Ночь",
    hero: "from-violet-400 via-purple-500 to-indigo-700",
    accent: "bg-violet-600 text-white",
    soft: "bg-violet-50 text-violet-700",
    ring: "focus:border-violet-400 focus:ring-violet-100",
    text: "text-violet-600",
    scene: "stars",
  },
};

/* Значок мероприятия — ключ иконки (а не смайлик). Рисует components/EventIcon.tsx */
export const EVENT_ICONS = [
  "party",
  "cake",
  "camp",
  "games",
  "food",
  "sport",
  "tree",
  "heart",
  "movie",
  "sun",
  "music",
  "fire",
] as const;

export function themeOf(key: string | null | undefined) {
  return THEMES[key ?? ""] ?? THEMES.tlight;
}

export function newId() {
  return Math.random().toString(36).slice(2, 9);
}

export function pickText(de: string, ru: string, lang: "de" | "ru") {
  const first = lang === "ru" ? ru : de;
  const second = lang === "ru" ? de : ru;
  return (first || "").trim() || (second || "").trim();
}

export function needsOptions(type: QuestionType) {
  return type === "single" || type === "multi";
}

/* Шаблон «Запись на праздник» */
export function templateQuestions(): FormQuestion[] {
  return [
    {
      id: newId(),
      type: "yesno",
      label_ru: "Придёшь с другом или подругой?",
      label_de: "Kommst du mit einem Freund / einer Freundin?",
      required: false,
    },
    {
      id: newId(),
      type: "short",
      label_ru: "Аллергии или особенности питания",
      label_de: "Allergien oder Essgewohnheiten",
      required: false,
    },
    {
      id: newId(),
      type: "long",
      label_ru: "Пожелания или вопросы",
      label_de: "Wünsche oder Fragen",
      required: false,
    },
  ];
}

export function formatEventDate(value: string | null, lang: "de" | "ru") {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(lang === "ru" ? "ru-RU" : "de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function calcAge(birth: string) {
  const b = new Date(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

/* Имя и фамилия — только латиницей (по-немецки), даже если форму заполняют на русском */
export function isLatinName(value: string) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿĀ-žß\s'’.\-]+$/.test(value.trim());
}

export function hasCyrillic(value: string) {
  return /[\u0400-\u04FF]/.test(value);
}

export function isPhone(value: string) {
  return /^[+\d][\d\s()\-/.]{5,24}$/.test(value.trim());
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/* Дата рождения "YYYY-MM-DD": настоящая дата, возраст от 5 до 30 лет */
export function isPlausibleBirth(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  if (d.toISOString().slice(0, 10) !== value) return false;
  const age = calcAge(value);
  return age >= 5 && age <= 30;
}

/* Поля, которые спрашиваются в КАЖДОЙ форме — они нужны для нашей базы подростков */
export const STANDARD_FIELDS: {
  key: string;
  ru: string;
  de: string;
  required: boolean;
}[] = [
  { key: "name", ru: "Имя и фамилия (латиницей)", de: "Vor- und Nachname", required: true },
  { key: "birth", ru: "Дата рождения", de: "Geburtsdatum", required: true },
  { key: "phone", ru: "Телефон подростка", de: "Handynummer des Teens", required: true },
  { key: "email", ru: "Почта подростка", de: "E-Mail des Teens", required: true },
  { key: "parent_name", ru: "Имя родителя", de: "Name der Eltern", required: true },
  { key: "parent_phone", ru: "Телефон родителя", de: "Handynummer der Eltern", required: true },
];


/* =====================================================================
   КАЛЕНДАРЬ: файл .ics (iPhone, Android, Outlook) и ссылка для Google
===================================================================== */

type CalendarForm = {
  slug: string;
  title_de: string;
  title_ru: string;
  desc_de: string;
  desc_ru: string;
  event_date: string | null;
  event_time: string;
  location: string;
};

const EVENT_HOURS = 2; // сколько длится событие в календаре (время окончания в форме не задаётся)

function icsEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function plusDay(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function startEnd(form: CalendarForm) {
  if (!form.event_date) return null;

  const day = form.event_date.replace(/-/g, "");
  const match = /^(\d{1,2}):(\d{2})/.exec(form.event_time || "");

  if (!match) {
    return { allDay: true as const, start: day, end: plusDay(form.event_date) };
  }

  const startH = Number(match[1]);
  const startM = match[2];
  const endH = startH + EVENT_HOURS;
  const pad = (n: number) => String(n).padStart(2, "0");

  // если событие заканчивается после полуночи — переносим на следующий день
  const endDay = endH >= 24 ? plusDay(form.event_date) : day;

  return {
    allDay: false as const,
    start: `${day}T${pad(startH)}${startM}00`,
    end: `${endDay}T${pad(endH % 24)}${startM}00`,
  };
}

export function canAddToCalendar(form: CalendarForm) {
  return Boolean(form.event_date);
}

export function buildIcs(form: CalendarForm, lang: "de" | "ru") {
  const range = startEnd(form);
  if (!range) return "";

  const title = pickText(form.title_de, form.title_ru, lang);
  const description = pickText(form.desc_de, form.desc_ru, lang);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TLight//Event//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${form.slug}-${range.start}@tlight`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    range.allDay ? `DTSTART;VALUE=DATE:${range.start}` : `DTSTART:${range.start}`,
    range.allDay ? `DTEND;VALUE=DATE:${range.end}` : `DTEND:${range.end}`,
    `SUMMARY:${icsEscape(title)}`,
    description ? `DESCRIPTION:${icsEscape(description)}` : "",
    form.location ? `LOCATION:${icsEscape(form.location)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(title)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

export function googleCalendarUrl(form: CalendarForm, lang: "de" | "ru") {
  const range = startEnd(form);
  if (!range) return "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: pickText(form.title_de, form.title_ru, lang),
    dates: `${range.start}/${range.end}`,
    details: pickText(form.desc_de, form.desc_ru, lang),
    location: form.location || "",
  });

  if (!range.allDay) params.set("ctz", "Europe/Berlin");

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}