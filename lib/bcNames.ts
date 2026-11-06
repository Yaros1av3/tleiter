/*
 * Сравнение имён: без разницы регистр, ё/е, умлауты, русские и латинские буквы.
 * "Müller" = "Mueller", "Иван" = "Ivan", порядок имя/фамилия не важен.
 */
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "i", ь: "", э: "e", ю: "u", я: "a",
};

export function normName(input: string): string {
  let s = (input ?? "").toLowerCase().trim();
  s = s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  s = s
    .split("")
    .map((ch) => (TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch))
    .join("");
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/[^a-z]/g, "");
  s = s.replace(/[yj]/g, "i").replace(/w/g, "v").replace(/(.)\1+/g, "$1");
  return s;
}