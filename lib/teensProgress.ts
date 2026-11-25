/*
 * Серия, уровни и достижения подростков на странице /t.
 * Всё считается на телефоне подростка по датам уроков, на которые он отметился.
 */

export type Lang = "de" | "ru";

export const HISTORY_KEY = "teens-history";

/* ---------- даты ---------- */

export function berlinToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

function toUtc(date: string): number {
  return Date.parse(`${date}T12:00:00Z`);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

/* понедельник той недели, в которую попадает дата */
export function weekStart(date: string): string {
  const d = new Date(toUtc(date));
  const dow = (d.getUTCDay() + 6) % 7; // понедельник = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(toUtc(date));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ---------- история ---------- */

export function parseHistory(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    const clean = list.filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x));
    return Array.from(new Set(clean)).sort();
  } catch {
    return [];
  }
}

export function withDate(history: string[], date: string): string[] {
  return Array.from(new Set([...history, date])).sort();
}

export function withoutDate(history: string[], date: string): string[] {
  return history.filter((d) => d !== date);
}

/* ---------- серия ---------- */

export type Stats = {
  total: number;
  streak: number; // текущая серия (0, если прервалась)
  best: number;
  alive: boolean;
  xp: number;
};

/* уроки идут раз в неделю: серия продолжается, если между отметками не больше 8 дней */
export function computeStats(history: string[], today: string): Stats {
  const list = [...history].sort();
  const total = list.length;

  let best = 0;
  let run = 0;
  for (let i = 0; i < list.length; i++) {
    run = i > 0 && daysBetween(list[i - 1], list[i]) <= 8 ? run + 1 : 1;
    if (run > best) best = run;
  }

  const last = list[total - 1];
  const alive = total > 0 && daysBetween(last, today) <= 14;
  const streak = alive ? run : 0;

  return { total, streak, best, alive, xp: total * 10 + best * 5 };
}

/* ---------- уровни ---------- */

export type Level = { xp: number; icon: "sprout" | "compass" | "book" | "shield" | "flame" | "star" | "crown"; ru: string; de: string };

export const LEVELS: Level[] = [
  { xp: 0, icon: "sprout", ru: "Новичок", de: "Neuling" },
  { xp: 10, icon: "compass", ru: "Искатель", de: "Entdecker" },
  { xp: 30, icon: "book", ru: "Ученик", de: "Schüler" },
  { xp: 60, icon: "shield", ru: "Верный", de: "Treuer" },
  { xp: 100, icon: "flame", ru: "Горящий", de: "Feuerherz" },
  { xp: 160, icon: "star", ru: "Звезда", de: "Stern" },
  { xp: 250, icon: "crown", ru: "Легенда", de: "Legende" },
];

export function levelOf(xp: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) index = i;
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next ? (xp - current.xp) / (next.xp - current.xp) : 1;
  return { index, current, next, progress: Math.max(0, Math.min(1, progress)) };
}

/* ---------- достижения ---------- */

export type Achievement = {
  id: string;
  icon: "sprout" | "flame" | "zap" | "book" | "star" | "crown" | "shield" | "trophy";
  ru: string;
  de: string;
  hintRu: string;
  hintDe: string;
  done: (s: Stats) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first", icon: "sprout", ru: "Первый шаг", de: "Erster Schritt", hintRu: "Отметься на первом уроке", hintDe: "Trag dich für den ersten Unterricht ein", done: (s) => s.total >= 1 },
  { id: "s3", icon: "flame", ru: "Три подряд", de: "Drei in Folge", hintRu: "3 урока подряд", hintDe: "3 Unterrichte in Folge", done: (s) => s.best >= 3 },
  { id: "s5", icon: "zap", ru: "Пять подряд", de: "Fünf in Folge", hintRu: "5 уроков подряд", hintDe: "5 Unterrichte in Folge", done: (s) => s.best >= 5 },
  { id: "t5", icon: "book", ru: "Пять уроков", de: "Fünf Unterrichte", hintRu: "Всего 5 уроков", hintDe: "Insgesamt 5 Unterrichte", done: (s) => s.total >= 5 },
  { id: "t10", icon: "star", ru: "Десять уроков", de: "Zehn Unterrichte", hintRu: "Всего 10 уроков", hintDe: "Insgesamt 10 Unterrichte", done: (s) => s.total >= 10 },
  { id: "s10", icon: "trophy", ru: "Десять подряд", de: "Zehn in Folge", hintRu: "10 уроков подряд", hintDe: "10 Unterrichte in Folge", done: (s) => s.best >= 10 },
  { id: "t25", icon: "crown", ru: "Столп", de: "Stütze", hintRu: "Всего 25 уроков", hintDe: "Insgesamt 25 Unterrichte", done: (s) => s.total >= 25 },
  { id: "s20", icon: "shield", ru: "Всегда с нами", de: "Immer dabei", hintRu: "20 уроков подряд", hintDe: "20 Unterrichte in Folge", done: (s) => s.best >= 20 },
];

/* ---------- стих дня ---------- */

export type Verse = { ref: string; ru: string; de: string };

/* Лютер 1912 и Синодальный перевод (оба в общественном достоянии) */
export const VERSES: Verse[] = [
  { ref: "Ps 23,1", ru: "Господь — Пастырь мой; я ни в чем не буду нуждаться.", de: "Der HERR ist mein Hirte, mir wird nichts mangeln." },
  { ref: "Joh 3,16", ru: "Ибо так возлюбил Бог мир, что отдал Сына Своего Единородного, дабы всякий верующий в Него, не погиб, но имел жизнь вечную.", de: "Denn also hat Gott die Welt geliebt, daß er seinen eingeborenen Sohn gab, auf daß alle, die an ihn glauben, nicht verloren werden, sondern das ewige Leben haben." },
  { ref: "Phil 4,13", ru: "Все могу в укрепляющем меня Иисусе Христе.", de: "Ich vermag alles durch den, der mich mächtig macht, Christus." },
  { ref: "Jos 1,9", ru: "Вот, Я повелеваю тебе: будь тверд и мужествен, не бойся и не ужасайся; ибо с тобою Господь, Бог твой, везде, куда ни пойдешь.", de: "Siehe, ich habe dir geboten, daß du getrost und unverzagt seiest. Laß dir nicht grauen und fürchte dich nicht; denn der HERR, dein Gott, ist mit dir in allem, was du tun wirst." },
  { ref: "Spr 3,5", ru: "Надейся на Господа всем сердцем твоим, и не полагайся на разум твой.", de: "Verlaß dich auf den HERRN von ganzem Herzen, und verlaß dich nicht auf deinen Verstand." },
  { ref: "Röm 8,28", ru: "Притом знаем, что любящим Бога, призванным по Его изволению, все содействует ко благу.", de: "Wir wissen aber, daß denen, die Gott lieben, alle Dinge zum Besten dienen, denen, die nach dem Vorsatz berufen sind." },
  { ref: "Ps 119,105", ru: "Слово Твое — светильник ноге моей и свет стезе моей.", de: "Dein Wort ist meines Fußes Leuchte und ein Licht auf meinem Wege." },
  { ref: "Mt 11,28", ru: "Придите ко Мне, все труждающиеся и обремененные, и Я успокою вас.", de: "Kommet her zu mir, alle, die ihr mühselig und beladen seid; ich will euch erquicken." },
  { ref: "1 Tim 4,12", ru: "Никто да не пренебрегает юностью твоею, но будь образцом для верных в слове, в житии, в любви, в духе, в вере, в чистоте.", de: "Niemand verachte deine Jugend; sondern sei ein Vorbild den Gläubigen im Wort, im Wandel, in der Liebe, im Geist, im Glauben, in der Keuschheit." },
  { ref: "Mt 6,33", ru: "Ищите же прежде Царства Божия и правды Его, и это все приложится вам.", de: "Trachtet am ersten nach dem Reich Gottes und nach seiner Gerechtigkeit, so wird euch das alles zufallen." },
  { ref: "Joh 8,12", ru: "Я свет миру; кто последует за Мною, тот не будет ходить во тьме, но будет иметь свет жизни.", de: "Ich bin das Licht der Welt; wer mir nachfolgt, der wird nicht wandeln in der Finsternis, sondern wird das Licht des Lebens haben." },
  { ref: "Gal 6,9", ru: "Делая добро, да не унываем, ибо в свое время пожнем, если не ослабеем.", de: "Lasset uns aber Gutes tun und nicht müde werden; denn zu seiner Zeit werden wir auch ernten ohne Aufhören." },
  { ref: "1 Kor 16,13", ru: "Бодрствуйте, стойте в вере, будьте мужественны, тверды.", de: "Wachet, stehet im Glauben, seid männlich und seid stark!" },
];

export function verseOfDay(today: string): Verse {
  const day = Math.floor(toUtc(today) / 86400000);
  return VERSES[day % VERSES.length];
}