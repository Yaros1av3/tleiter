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
  { name: string; hero: string; accent: string; soft: string; ring: string; text: string }
> = {
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
  },
  sky: {
    name: "Небо",
    hero: "from-sky-300 via-sky-400 to-indigo-500",
    accent: "bg-sky-600 text-white",
    soft: "bg-sky-50 text-sky-700",
    ring: "focus:border-sky-400 focus:ring-sky-100",
    text: "text-sky-600",
  },
  emerald: {
    name: "Лес",
    hero: "from-emerald-300 via-emerald-400 to-teal-600",
    accent: "bg-emerald-600 text-white",
    soft: "bg-emerald-50 text-emerald-700",
    ring: "focus:border-emerald-400 focus:ring-emerald-100",
    text: "text-emerald-600",
  },
  rose: {
    name: "Закат",
    hero: "from-rose-300 via-pink-400 to-fuchsia-500",
    accent: "bg-rose-500 text-white",
    soft: "bg-rose-50 text-rose-700",
    ring: "focus:border-rose-400 focus:ring-rose-100",
    text: "text-rose-600",
  },
  violet: {
    name: "Ночь",
    hero: "from-violet-400 via-purple-500 to-indigo-700",
    accent: "bg-violet-600 text-white",
    soft: "bg-violet-50 text-violet-700",
    ring: "focus:border-violet-400 focus:ring-violet-100",
    text: "text-violet-600",
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