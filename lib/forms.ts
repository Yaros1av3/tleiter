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

export const EMOJIS = ["🎉", "🎂", "⛺", "🎮", "🍕", "⚽", "🎄", "🙏", "🎬", "🏖️", "🎤", "🔥"];

export function themeOf(key: string | null | undefined) {
  return THEMES[key ?? ""] ?? THEMES.amber;
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
      type: "phone",
      label_ru: "Телефон родителей",
      label_de: "Telefonnummer der Eltern",
      required: true,
    },
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
