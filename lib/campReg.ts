/* Общие настройки регистрации в лагерь (используются на сервере и в браузере) */

export type RegStatus = "new" | "confirmed" | "waitlist" | "declined";

export const REG_STATUS: Record<RegStatus, { ru: string; de: string; cls: string }> = {
  new: { ru: "Новая", de: "Neu", cls: "bg-[#fff4d1] text-[#9a6b00]" },
  confirmed: { ru: "Подтверждена", de: "Bestätigt", cls: "bg-emerald-50 text-emerald-800" },
  waitlist: { ru: "Лист ожидания", de: "Warteliste", cls: "bg-sky-50 text-sky-800" },
  declined: { ru: "Отклонена", de: "Abgelehnt", cls: "bg-[#eef0f2] text-[#667085]" },
};

export const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const SWIM: Record<string, { ru: string; de: string }> = {
  yes: { ru: "Умеет плавать", de: "Kann schwimmen" },
  limited: { ru: "Плавает неуверенно", de: "Schwimmt unsicher" },
  no: { ru: "Не умеет плавать", de: "Kann nicht schwimmen" },
};

/* Поля заявки, которые можно сохранять (служитель и публичная форма) */
export const REG_FIELDS = [
  "first_name",
  "last_name",
  "birth_date",
  "gender",
  "phone",
  "email",
  "city",
  "parent_name",
  "parent_phone",
  "from_group",
  "allergies",
  "medications",
  "health_notes",
  "diet",
  "can_swim",
  "tshirt_size",
  "friend_wish",
  "notes",
  "photo_consent",
  "rules_accepted",
] as const;

export const STAFF_ONLY_FIELDS = ["status", "internal_note", "paid_amount"] as const;

export function ageOn(birth: string | null | undefined, on?: string | null): number | null {
  if (!birth) return null;
  const b = new Date(`${birth}T12:00:00Z`);
  const ref = on ? new Date(`${on}T12:00:00Z`) : new Date();
  if (Number.isNaN(b.getTime())) return null;
  let age = ref.getUTCFullYear() - b.getUTCFullYear();
  const m = ref.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export const isPhoneLike = (v: string) => /^[+\d][\d\s()\-/.]{5,24}$/.test(v.trim());
export const isEmailLike = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());