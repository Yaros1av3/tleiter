import "server-only";

/* Общие проверки для входа и регистрации подростков (/t) */

/* имя и фамилия: только латиница с немецкими буквами (Anna, Müller, Jean-Paul) */
export const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' .-]{0,39}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validBirth(value: unknown): string | null {
  const s = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  const age = (Date.now() - d.getTime()) / (365.25 * 86400000);
  return age >= 8 && age <= 26 ? s : null;
}

export function cleanPhone(value: unknown): string {
  const s = String(value ?? "").replace(/[^\d+\s()/-]/g, "").trim();
  const digits = s.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 16 ? s.slice(0, 24) : "";
}

export function maskPhone(value: string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? `•••• ${digits.slice(-2)}` : "";
}

export function maskEmail(value: string | null | undefined): string {
  const s = String(value ?? "");
  const at = s.indexOf("@");
  return at > 0 ? `${s[0]}•••${s.slice(at)}` : "";
}

/* ник для рейтинга Bibel-Challenge: Anna.K (подросток потом может его поменять) */
export function nickCandidates(first: string, last: string): string[] {
  const clean = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "");
  const base = `${clean(first).slice(0, 12) || "Teen"}.${(clean(last)[0] ?? "X").toUpperCase()}`;
  const list = [base];
  for (let i = 0; i < 8; i++) list.push(`${base}${Math.floor(10 + Math.random() * 990)}`);
  return list.map((n) => n.slice(0, 20));
}