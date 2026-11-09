/* Награды Bibel-Challenge: названия и описания (выдаются при завершении сезона) */
export type AwardKind = "finisher" | "legend" | "perfect" | "top1" | "top2" | "top3";

export const AWARDS: Record<
  AwardKind,
  { de: string; ru: string; descDe: string; descRu: string }
> = {
  finisher: {
    de: "Challenge geschafft",
    ru: "Челлендж пройден",
    descDe: "Das Ziel erreicht",
    descRu: "Цель достигнута",
  },
  legend: {
    de: "Legende",
    ru: "Легенда",
    descDe: "Den höchsten Rang erreicht",
    descRu: "Достигнут высший ранг",
  },
  perfect: {
    de: "Ohne Lücke",
    ru: "Без пропусков",
    descDe: "Jeden Tag abgegeben",
    descRu: "Сдавал каждый день",
  },
  top1: { de: "Platz 1", ru: "1 место", descDe: "Sieger der Challenge", descRu: "Победитель челленджа" },
  top2: { de: "Platz 2", ru: "2 место", descDe: "Zweiter Platz", descRu: "Второе место" },
  top3: { de: "Platz 3", ru: "3 место", descDe: "Dritter Platz", descRu: "Третье место" },
};