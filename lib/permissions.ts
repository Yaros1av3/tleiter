/*
 * Каталог прав для ролей. Добавить новое право:
 *   1) допиши его сюда;
 *   2) в базе проверяй его через public.has_permission('ключ') в политиках (RLS);
 *   3) на странице прячь/показывай кнопки через supabase.rpc("has_permission", { p: "ключ" }).
 * Админы имеют все права всегда.
 */

export type PermissionKey = "trips" | "ideas";

export const PERMISSIONS: {
  key: PermissionKey;
  ru: string;
  de: string;
  descRu: string;
  descDe: string;
}[] = [
  {
    key: "trips",
    ru: "Поездки",
    de: "Fahrten",
    descRu: "Создавать и менять поездки, участники, оплата, расходы и голосования",
    descDe: "Fahrten erstellen und ändern, Teilnehmer, Zahlungen, Ausgaben und Abstimmungen",
  },
  {
    key: "ideas",
    ru: "Идеи команды",
    de: "Team-Ideen",
    descRu: "Удалять идеи команды",
    descDe: "Ideen des Teams löschen",
  },
];

export type AppRole = {
  id: number;
  name: string;
  color: string;
  permissions: string[];
};

export const ROLE_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#ec4899", "#64748b",
];

/* затемнить цвет, чтобы текст на светлой плашке читался */
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return "#334155";
  const k = 1 + amount;
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function roleBadgeStyle(color: string) {
  return { backgroundColor: `${color}26`, color: shade(color, -0.4) };
}