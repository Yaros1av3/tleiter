/*
 * Автоматически сокращает длинную тему урока для подростков.
 *
 *  "6. Sinnvolle Investition – Gleichnisse vom verborgenen Schatz und von
 *   der Perle_ Matthäus 13,44–46 (Der Schatz im Himmel)"
 *   → "Sinnvolle Investition"
 *
 * Правила: убираем номер в начале, берём часть до первого разделителя
 * (тире, двоеточие, «_»), убираем скобки и ссылки на Библию,
 * слишком длинное обрезаем по слову. Если в расписании вручную задан
 * «Короткое название», используется оно, а не это правило.
 */
const MAX_LENGTH = 48;

const BIBLE_REFERENCE = /\s*\(?\b(?:[1-3]\.?\s*)?\p{Lu}[\p{L}.]+\s+\d+[,:]\d+(?:\s*[–—-]\s*\d+)?\)?/u;

export function shortTitle(raw: string | null | undefined) {
  let text = (raw ?? "").replace(/\s+/g, " ").trim();

  if (!text) return "";

  // номер урока в начале: "6." / "6)" / "Nr. 6:"
  text = text.replace(/^(?:nr\.?\s*)?\d+\s*[.):]\s*/i, "");

  // основная часть до первого разделителя
  const parts = text.split(/\s[–—-]\s|:\s|_/);
  const first = parts[0].trim();

  if (first.length >= 6) text = first;

  // скобки и ссылки на Библию
  text = text
    .replace(/\s*\([^)]*\)?/g, "")
    .replace(BIBLE_REFERENCE, "")
    .replace(/[\s,;:–—-]+$/, "")
    .trim();

  if (text.length > MAX_LENGTH) {
    const cut = text.slice(0, MAX_LENGTH);
    const space = cut.lastIndexOf(" ");
    text = `${(space > 20 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, "")}…`;
  }

  return text;
}