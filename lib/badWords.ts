import { normName } from "@/lib/bcNames";

/*
 * Фильтр плохих слов для ников.
 * ЗАМЕНИТЕ/ДОПОЛНИТЕ список своим из старого сайта (файл bad-words).
 * Слова можно писать по-русски и по-немецки: сравнение идёт по транслитерации.
 */
const BAD_WORDS: string[] = [
  // русские
  "хуй", "пизда", "блядь", "ебать", "сука", "говно", "пидор", "мудак",
  // немецкие
  "scheisse", "scheiße", "fick", "arsch", "wichser", "hurensohn", "hure", "nazi", "hitler",
];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "@": "a", "$": "s", "!": "i",
};

export function hasBadWord(text: string): boolean {
  const leeted = (text ?? "")
    .toLowerCase()
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("");
  const flat = normName(leeted);
  return BAD_WORDS.some((w) => {
    const n = normName(w);
    return n.length >= 3 && flat.includes(n);
  });
}