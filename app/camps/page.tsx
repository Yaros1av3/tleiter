"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  BookOpen,
  Bus,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  Circle,
  ClipboardList,
  Clock3,
  Coffee,
  Copy,
  Dumbbell,
  Flag,
  Gamepad2,
  Home,
  HeartHandshake,
  Loader2,
  MapPin,
  FolderOpen,
  UserCheck,
  Moon,
  Music,
  Pencil,
  Phone,
  Plus,
  Search,
  Printer,
  Tent,
  Trash2,
  Users,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import DatePicker from "@/components/DatePicker";
import CampRegistration from "@/components/CampRegistration";
import CampGroups from "@/components/CampGroups";
import CampMaterials from "@/components/CampMaterials";
import CampCheckin from "@/components/CampCheckin";

/* ===================== ТИПЫ ===================== */

type Camp = {
  id: number;
  title: string;
  theme: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  address: string | null;
  description: string | null;
  price: number | null;
  max_participants: number | null;
  status: "planning" | "open" | "running" | "done";
};

type TeamRow = {
  id: number;
  camp_id: number;
  member_id: number | null;
  guest_name: string | null;
  role_title: string;
  duties: string | null;
  phone: string | null;
  status: "confirmed" | "pending" | "declined";
};

type Item = {
  id: number;
  camp_id: number;
  day_date: string;
  start_time: string;
  end_time: string | null;
  title: string;
  details: string | null;
  place: string | null;
  responsible: string | null;
  category: string;
};

type Member = { id: number; first_name: string; last_name: string | null; phone: string | null };

type T = (ru: string, de: string) => string;

/* ===================== КОНСТАНТЫ ===================== */

const STATUS_LABEL: Record<Camp["status"], [string, string]> = {
  planning: ["Планирование", "In Planung"],
  open: ["Идёт набор", "Anmeldung offen"],
  running: ["Лагерь идёт", "Camp läuft"],
  done: ["Завершён", "Beendet"],
};

const MEMBER_STATUS: Record<TeamRow["status"], { ru: string; de: string; cls: string }> = {
  confirmed: { ru: "Едет", de: "Dabei", cls: "bg-emerald-50 text-emerald-800" },
  pending: { ru: "Думает", de: "Offen", cls: "bg-[#fff4d1] text-[#9a6b00]" },
  declined: { ru: "Не едет", de: "Abgesagt", cls: "bg-[#eef0f2] text-[#667085]" },
};

const CATEGORIES: Record<string, { ru: string; de: string; icon: LucideIcon; color: string }> = {
  program: { ru: "Программа", de: "Programm", icon: Flag, color: "#6366f1" },
  worship: { ru: "Прославление", de: "Lobpreis", icon: Music, color: "#8b5cf6" },
  lesson: { ru: "Урок", de: "Lehre", icon: BookOpen, color: "#3b82f6" },
  meal: { ru: "Еда", de: "Essen", icon: Utensils, color: "#f59e0b" },
  sport: { ru: "Спорт", de: "Sport", icon: Dumbbell, color: "#22c55e" },
  game: { ru: "Игры", de: "Spiele", icon: Gamepad2, color: "#ec4899" },
  service: { ru: "Служение", de: "Dienst", icon: HeartHandshake, color: "#e11d48" },
  free: { ru: "Свободное время", de: "Freizeit", icon: Coffee, color: "#14b8a6" },
  quiet: { ru: "Тихий час", de: "Mittagsruhe", icon: BedDouble, color: "#0ea5e9" },
  transport: { ru: "Дорога", de: "Fahrt", icon: Bus, color: "#64748b" },
  night: { ru: "Отбой и ночь", de: "Nachtruhe", icon: Moon, color: "#1b2431" },
  other: { ru: "Другое", de: "Sonstiges", icon: Circle, color: "#8a8678" },
};

const ROLE_SUGGEST: [string, string][] = [
  ["Руководитель лагеря", "Campleitung"],
  ["Программа", "Programm"],
  ["Лобпрайз и музыка", "Lobpreis & Musik"],
  ["Кухня и питание", "Küche & Verpflegung"],
  ["Касса и финансы", "Kasse & Finanzen"],
  ["Спорт и игры", "Sport & Spiele"],
  ["Медицина", "Sanitäter"],
  ["Фото и видео", "Foto & Video"],
  ["Транспорт", "Transport"],
  ["Закупки", "Einkauf"],
  ["Наставник отряда", "Gruppenleiter"],
  ["Душепопечение", "Seelsorge"],
];

const inputCls =
  "w-full rounded-[12px] border border-[#e2dcc8] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1b2431]";

/* ===================== ПОМОЩНИКИ ===================== */

/* Несколько функций у одного человека хранятся в одном поле через « | » */
const splitRoles = (v: string | null | undefined) =>
  (v ?? "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
const joinRoles = (list: string[]) => list.join(" | ");

const hhmm = (v: string | null) => (v ? v.slice(0, 5) : "");

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T12:00:00Z`);
  const e = new Date(`${end}T12:00:00Z`);
  while (d <= e && out.length < 60) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function fmt(date: string, locale: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, { timeZone: "UTC", ...opts });
}

const todayStr = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

function nameOf(m: { first_name: string; last_name: string | null }) {
  const last = (m.last_name ?? "").trim();
  return `${m.first_name}${last && last !== "-" ? " " + last : ""}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/* ===================== МЕЛКИЕ КОМПОНЕНТЫ ===================== */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b2431]/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[26px] bg-[#faf8f3] p-5 pb-8 sm:rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-extrabold tracking-[-0.01em]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-[#ece6d3]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-[#8a8678]">{label}</span>
      {children}
    </label>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  busy,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ffc93c] text-[15px] font-bold text-[#1b2431] transition active:scale-[0.99] disabled:opacity-40"
    >
      {busy && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

function Empty({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#e2dcc8] bg-white/60 px-6 py-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff4d1] text-[#9a6b00]">{icon}</span>
      <p className="mt-3 text-[15px] font-bold">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-[280px] text-[13px] text-[#8a8678]">{hint}</p>}
    </div>
  );
}

/* Выбор времени в стиле приложения вместо системного окна */
function TimeField({
  value,
  onChange,
  clearable,
  placeholder,
  isRu,
}: {
  value: string;
  onChange: (v: string) => void;
  clearable?: boolean;
  placeholder: string;
  isRu: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [h, m] = value ? value.split(":") : ["", ""];
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const mins = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
  const pick = (nh: string, nm: string) => onChange(`${nh || "09"}:${nm || "00"}`);
  const chip = (on: boolean) =>
    "h-10 rounded-[12px] text-[14px] font-bold tabular-nums transition " +
    (on ? "bg-[#1b2431] text-[#ffc93c]" : "bg-white text-[#1b2431] ring-1 ring-[#ece6d3]");
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-[12px] border border-[#e2dcc8] bg-white px-3 py-2.5 text-left text-[14px]"
      >
        <span className={value ? "font-semibold tabular-nums" : "text-[#a8a493]"}>{value || placeholder}</span>
        <Clock3 size={16} className="text-[#8a8678]" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-[#1b2431]/40 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-t-[26px] bg-[#faf8f3] p-5 pb-8 sm:rounded-[26px]" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-[34px] font-extrabold tabular-nums tracking-[-0.02em]">
              {h || "--"}:{m || "--"}
            </p>
            <p className="mb-1.5 mt-3 text-[12px] font-semibold text-[#8a8678]">{isRu ? "Часы" : "Stunden"}</p>
            <div className="grid grid-cols-6 gap-1.5">
              {hours.map((x) => (
                <button key={x} type="button" onClick={() => pick(x, m)} className={chip(x === h)}>
                  {x}
                </button>
              ))}
            </div>
            <p className="mb-1.5 mt-3 text-[12px] font-semibold text-[#8a8678]">{isRu ? "Минуты" : "Minuten"}</p>
            <div className="grid grid-cols-6 gap-1.5">
              {mins.map((x) => (
                <button key={x} type="button" onClick={() => pick(h, x)} className={chip(x === m)}>
                  {x}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              {clearable && value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="h-12 flex-1 rounded-[14px] bg-white text-[14px] font-semibold ring-1 ring-[#ece6d3]"
                >
                  {isRu ? "Очистить" : "Leeren"}
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="h-12 flex-[2] rounded-[14px] bg-[#ffc93c] text-[15px] font-bold text-[#1b2431]">
                {isRu ? "Готово" : "Fertig"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Выбор человека из списка с поиском вместо системного списка */
function PersonField({
  label,
  options,
  value,
  onPick,
  isRu,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onPick: (v: string) => void;
  isRu: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
  const list = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQ("");
          setOpen(true);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-[12px] border border-[#e2dcc8] bg-white px-3 py-2.5 text-left text-[14px]"
      >
        <span className={current ? "truncate font-semibold" : "text-[#a8a493]"}>{current?.label ?? label}</span>
        <ChevronDown size={16} className="shrink-0 text-[#8a8678]" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-[#1b2431]/40 sm:items-center" onClick={() => setOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-[26px] bg-[#faf8f3] p-5 pb-6 sm:rounded-[26px]" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8678]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={isRu ? "Поиск" : "Suchen"}
                className="w-full rounded-[12px] border border-[#e2dcc8] bg-white py-2.5 pl-9 pr-3 text-[14px] outline-none focus:border-[#1b2431]"
              />
            </div>
            <div className="mt-3 space-y-1.5 overflow-y-auto">
              {list.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onPick(o.value);
                    setOpen(false);
                  }}
                  className={
                    "flex h-12 w-full items-center justify-between rounded-[14px] px-4 text-left text-[14px] font-semibold " +
                    (o.value === value ? "bg-[#1b2431] text-white" : "bg-white ring-1 ring-[#ece6d3]")
                  }
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value && <Check size={16} className="text-[#ffc93c]" />}
                </button>
              ))}
              {list.length === 0 && <p className="py-6 text-center text-[13px] text-[#8a8678]">{isRu ? "Никого не найдено" : "Niemand gefunden"}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===================== СТРАНИЦА ===================== */

export default function CampsPage() {
  const { language } = useLanguage();
  const isRu = language === "ru";
  const locale = isRu ? "ru-RU" : "de-DE";
  const t: T = (ru, de) => (isRu ? ru : de);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  const [camps, setCamps] = useState<Camp[]>([]);
  const [campId, setCampId] = useState<number | null>(null);
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [tab, setTab] = useState<"overview" | "team" | "schedule" | "reg" | "groups" | "materials" | "checkin">("overview");
  const [campForm, setCampForm] = useState<Partial<Camp> | null>(null);
  const [teamForm, setTeamForm] = useState<Partial<TeamRow> | null>(null);
  const [itemForm, setItemForm] = useState<Partial<Item> | null>(null);
  const [copyFrom, setCopyFrom] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);

  const camp = useMemo(() => camps.find((c) => c.id === campId) ?? null, [camps, campId]);

  const loadCamps = useCallback(async () => {
    const [{ data: manage }, campsR] = await Promise.all([
      supabase.rpc("can_manage_camps"),
      supabase.from("camps").select("*").order("start_date", { ascending: false, nullsFirst: true }),
    ]);
    setCanManage(manage === true);
    if (campsR.error) {
      setError(campsR.error.message);
      setLoading(false);
      return;
    }
    const list = (campsR.data ?? []) as Camp[];
    setCamps(list);
    setCampId((cur) => {
      if (cur && list.some((c) => c.id === cur)) return cur;
      let saved: number | null = null;
      try {
        saved = Number(localStorage.getItem("tcamp-current")) || null;
      } catch {
        /* без хранилища работаем как обычно */
      }
      return saved && list.some((c) => c.id === saved) ? saved : (list[0]?.id ?? null);
    });
    setLoading(false);
  }, []);

  const loadDetails = useCallback(async (id: number) => {
    const [teamR, itemsR, membersR] = await Promise.all([
      supabase.from("camp_team").select("*").eq("camp_id", id).order("id"),
      supabase.from("camp_schedule").select("*").eq("camp_id", id).order("day_date").order("start_time"),
      supabase.from("team_members").select("id, first_name, last_name, phone").eq("status", "active").order("first_name"),
    ]);
    const err = teamR.error ?? itemsR.error;
    if (err) setError(err.message);
    setTeam((teamR.data ?? []) as TeamRow[]);
    setItems((itemsR.data ?? []) as Item[]);
    setMembers((membersR.data ?? []) as Member[]);
  }, []);

  useEffect(() => {
    void loadCamps();
  }, [loadCamps]);

  useEffect(() => {
    if (campId) {
      void loadDetails(campId);
      try {
        localStorage.setItem("tcamp-current", String(campId));
      } catch {
        /* не страшно */
      }
    } else {
      setTeam([]);
      setItems([]);
    }
  }, [campId, loadDetails]);

  /* дни расписания: даты лагеря плюс любые даты, где уже есть пункты */
  const days = useMemo(() => {
    const set = new Set<string>();
    if (camp?.start_date && camp?.end_date) eachDay(camp.start_date, camp.end_date).forEach((d) => set.add(d));
    items.forEach((i) => set.add(i.day_date));
    return [...set].sort();
  }, [camp, items]);

  useEffect(() => {
    if (days.length === 0) {
      setDay(null);
      return;
    }
    setDay((cur) => (cur && days.includes(cur) ? cur : days.includes(todayStr()) ? todayStr() : days[0]));
  }, [days]);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const teamName = (r: TeamRow) => (r.member_id ? nameOf(memberById.get(r.member_id) ?? { first_name: "?", last_name: null }) : (r.guest_name ?? "?"));

  /* ---------- сохранение ---------- */

  const [busy, setBusy] = useState(false);
  const [respCustom, setRespCustom] = useState(false);
  const [roleDraft, setRoleDraft] = useState("");

  function addRole(raw: string) {
    const name = raw.replace(/\|/g, " ").trim();
    if (!name || !teamForm) return;
    const list = splitRoles(teamForm.role_title);
    if (!list.includes(name)) list.push(name);
    setTeamForm({ ...teamForm, role_title: joinRoles(list) });
    setRoleDraft("");
  }

  /* кого можно назначить ответственным: сначала команда лагеря, потом остальные служители */
  const respOptions = useMemo(() => {
    const names: string[] = [];
    team.forEach((r) => names.push(teamName(r)));
    members.forEach((m) => names.push(nameOf(m)));
    const uniq = [...new Set(names)];
    return [
      { value: "__none", label: t("Не назначен", "Nicht zugewiesen") },
      ...uniq.map((n) => ({ value: n, label: n })),
      { value: "__custom", label: t("Другой человек, вписать имя", "Andere Person, Namen eintragen") },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, members, isRu]);
  useEffect(() => {
    setRoleDraft("");
  }, [teamForm?.id, teamForm === null]);

  useEffect(() => {
    setRespCustom(false);
  }, [itemForm?.id, itemForm === null]);
  const respCurrent = itemForm?.responsible?.trim() ?? "";
  const respValue = respCustom
    ? "__custom"
    : respCurrent === ""
      ? ""
      : respOptions.some((o) => o.value === respCurrent)
        ? respCurrent
        : "__custom";

  async function saveCamp() {
    if (!campForm?.title?.trim() || busy) return;
    setBusy(true);
    const row = {
      title: campForm.title.trim(),
      theme: campForm.theme?.trim() || null,
      start_date: campForm.start_date || null,
      end_date: campForm.end_date || null,
      location: campForm.location?.trim() || null,
      address: campForm.address?.trim() || null,
      description: campForm.description?.trim() || null,
      price: campForm.price === undefined || campForm.price === null || String(campForm.price) === "" ? null : Number(campForm.price),
      max_participants:
        campForm.max_participants === undefined || campForm.max_participants === null || String(campForm.max_participants) === ""
          ? null
          : Number(campForm.max_participants),
      status: campForm.status ?? "planning",
    };
    const q = campForm.id
      ? supabase.from("camps").update(row).eq("id", campForm.id).select("id").single()
      : supabase.from("camps").insert(row).select("id").single();
    const { data, error: e } = await q;
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    setError(null);
    setCampForm(null);
    if (data?.id) setCampId(data.id as number);
    await loadCamps();
  }

  async function deleteCamp() {
    if (!camp) return;
    if (!window.confirm(t(`Удалить лагерь «${camp.title}» со всей командой и расписанием?`, `Camp „${camp.title}“ samt Team und Tagesplan löschen?`))) return;
    const { error: e } = await supabase.from("camps").delete().eq("id", camp.id);
    if (e) {
      setError(e.message);
      return;
    }
    setCampForm(null);
    setCampId(null);
    await loadCamps();
  }

  async function saveTeam() {
    if (!campId || !teamForm || busy) return;
    const role = teamForm.role_title?.trim();
    if (!role || (!teamForm.member_id && !teamForm.guest_name?.trim())) return;
    setBusy(true);
    const row = {
      camp_id: campId,
      member_id: teamForm.member_id ?? null,
      guest_name: teamForm.member_id ? null : teamForm.guest_name?.trim() || null,
      role_title: role,
      duties: teamForm.duties?.trim() || null,
      phone: teamForm.phone?.trim() || null,
      status: teamForm.status ?? "pending",
    };
    const q = teamForm.id ? supabase.from("camp_team").update(row).eq("id", teamForm.id) : supabase.from("camp_team").insert(row);
    const { error: e } = await q;
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    setError(null);
    setTeamForm(null);
    await loadDetails(campId);
  }

  async function deleteTeam(id: number) {
    if (!campId || !window.confirm(t("Убрать человека из команды лагеря?", "Person aus dem Camp-Team entfernen?"))) return;
    await supabase.from("camp_team").delete().eq("id", id);
    setTeamForm(null);
    await loadDetails(campId);
  }

  async function saveItem() {
    if (!campId || !itemForm || busy) return;
    if (!itemForm.title?.trim() || !itemForm.day_date || !itemForm.start_time) return;
    setBusy(true);
    const row = {
      camp_id: campId,
      day_date: itemForm.day_date,
      start_time: itemForm.start_time,
      end_time: itemForm.end_time || null,
      title: itemForm.title.trim(),
      details: itemForm.details?.trim() || null,
      place: itemForm.place?.trim() || null,
      responsible: itemForm.responsible?.trim() || null,
      category: itemForm.category || "program",
    };
    const q = itemForm.id ? supabase.from("camp_schedule").update(row).eq("id", itemForm.id) : supabase.from("camp_schedule").insert(row);
    const { error: e } = await q;
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    setError(null);
    setItemForm(null);
    await loadDetails(campId);
  }

  async function deleteItem(id: number) {
    if (!campId || !window.confirm(t("Удалить этот пункт расписания?", "Diesen Programmpunkt löschen?"))) return;
    await supabase.from("camp_schedule").delete().eq("id", id);
    setItemForm(null);
    await loadDetails(campId);
  }

  async function copyDay(target: string) {
    if (!campId || !copyFrom || busy) return;
    const src = items.filter((i) => i.day_date === copyFrom);
    if (src.length === 0) return;
    setBusy(true);
    const rows = src.map((i) => ({
      camp_id: campId,
      day_date: target,
      start_time: i.start_time,
      end_time: i.end_time,
      title: i.title,
      details: i.details,
      place: i.place,
      responsible: i.responsible,
      category: i.category,
    }));
    const { error: e } = await supabase.from("camp_schedule").insert(rows);
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    setCopyFrom(null);
    setDay(target);
    await loadDetails(campId);
  }

  /* ---------- вычисления для обзора ---------- */

  const countdown = useMemo(() => {
    if (!camp?.start_date) return null;
    const diff = Math.round((new Date(`${camp.start_date}T12:00:00Z`).getTime() - new Date(`${todayStr()}T12:00:00Z`).getTime()) / 86400000);
    return diff;
  }, [camp]);

  const teamCounts = {
    confirmed: team.filter((r) => r.status === "confirmed").length,
    pending: team.filter((r) => r.status === "pending").length,
    declined: team.filter((r) => r.status === "declined").length,
  };

  const dateRange = camp?.start_date
    ? camp.end_date && camp.end_date !== camp.start_date
      ? `${fmt(camp.start_date, locale, { day: "numeric", month: "long" })} – ${fmt(camp.end_date, locale, { day: "numeric", month: "long", year: "numeric" })}`
      : fmt(camp.start_date, locale, { day: "numeric", month: "long", year: "numeric" })
    : t("Даты пока не выбраны", "Termin noch offen");

  const dayItems = items.filter((i) => i.day_date === day);

  /* ===================== ВЕРСТКА ===================== */

  return (
    <main className="min-h-screen bg-[#faf8f3] pb-32 text-[#1b2431]">
      <div className="mx-auto max-w-2xl px-4 pt-5">
        {/* шапка */}
        <div className="flex items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label={t("Назад", "Zurück")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-[#ece6d3]"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">T-Camps</h1>
            <p className="text-[13px] text-[#8a8678]">{t("Подготовка подросткового лагеря", "Vorbereitung des Teen-Camps")}</p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setCampForm({ status: "planning" })}
              className="flex h-10 items-center gap-1.5 rounded-full bg-[#1b2431] px-4 text-[13px] font-bold text-white"
            >
              <Plus size={16} />
              {t("Лагерь", "Camp")}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-[16px] bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error.includes("does not exist") || error.includes("schema cache")
              ? t("Таблицы лагеря ещё не созданы. Выполните camps-1.sql в Supabase.", "Die Camp-Tabellen fehlen noch. Bitte camps-1.sql in Supabase ausführen.")
              : error}
          </div>
        )}

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="animate-spin text-[#8a8678]" />
          </div>
        ) : camps.length === 0 ? (
          <div className="mt-8">
            <Empty
              icon={<Tent size={22} />}
              title={t("Лагерей пока нет", "Noch kein Camp")}
              hint={canManage ? t("Создайте первый лагерь, и здесь появятся команда и расписание.", "Lege das erste Camp an, dann erscheinen Team und Tagesplan.") : t("Когда лагерь создадут, он появится здесь.", "Sobald ein Camp angelegt ist, erscheint es hier.")}
            />
            {canManage && (
              <div className="mt-4">
                <PrimaryButton onClick={() => setCampForm({ status: "planning" })}>{t("Создать лагерь", "Camp anlegen")}</PrimaryButton>
              </div>
            )}
          </div>
        ) : (
          <>
            {camps.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 print:hidden">
                {camps.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCampId(c.id)}
                    className={
                      "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition " +
                      (c.id === campId ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")
                    }
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            )}

            {/* вкладки */}
            <div className="mt-4 flex flex-wrap gap-1 rounded-[18px] bg-[#f1ecdc] p-1 print:hidden">
              {(
                [
                  ["overview", t("Обзор", "Übersicht"), Tent],
                  ["team", t("Команда", "Team"), Users],
                  ["schedule", t("Расписание", "Tagesplan"), CalendarDays],
                  ["reg", t("Заявки", "Anmeldung"), ClipboardList],
                  ["groups", t("Отряды", "Gruppen"), Home],
                  ["materials", t("Материалы", "Material"), FolderOpen],
                  ["checkin", t("Заезд", "Anreise"), UserCheck],
                ] as [typeof tab, string, LucideIcon][]
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={
                    "flex h-[52px] min-w-[22%] flex-1 basis-[22%] flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 text-[11px] font-bold transition " +
                    (tab === key ? "bg-white text-[#1b2431] shadow-sm" : "text-[#8a8678]")
                  }
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {camp && tab === "overview" && (
              <div className="mt-4 space-y-4">
                <section className="relative overflow-hidden rounded-[26px] bg-[#1b2431] p-5 text-white">
                  <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#ffc93c]/20" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-block rounded-full bg-[#ffc93c] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#1b2431]">
                        {t(...STATUS_LABEL[camp.status])}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setCampForm(camp)}
                          className="flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3 text-[12px] font-semibold text-white"
                        >
                          <Pencil size={13} />
                          {t("Изменить", "Ändern")}
                        </button>
                      )}
                    </div>
                    <h2 className="mt-3 text-[26px] font-extrabold leading-tight tracking-[-0.02em]">{camp.title}</h2>
                    {camp.theme && <p className="mt-1 text-[15px] text-[#ffc93c]">{camp.theme}</p>}
                    <p className="mt-4 flex items-center gap-2 text-[14px] text-white/80">
                      <CalendarDays size={16} />
                      {dateRange}
                    </p>
                    {(camp.location || camp.address) && (
                      <p className="mt-1.5 flex items-center gap-2 text-[14px] text-white/80">
                        <MapPin size={16} />
                        {[camp.location, camp.address].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {countdown !== null && countdown > 0 && (
                      <div className="mt-5 flex items-end gap-2">
                        <span className="text-[44px] font-extrabold leading-none text-[#ffc93c]">{countdown}</span>
                        <span className="pb-1.5 text-[14px] text-white/70">{t("дн. до лагеря", "Tage bis zum Camp")}</span>
                      </div>
                    )}
                    {countdown !== null && countdown <= 0 && camp.status !== "done" && (
                      <p className="mt-5 text-[15px] font-bold text-[#ffc93c]">{t("Лагерь уже начался", "Das Camp hat begonnen")}</p>
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    [t("В команде едут", "Im Team dabei"), String(teamCounts.confirmed)],
                    [t("Ещё думают", "Noch offen"), String(teamCounts.pending)],
                    [t("Дней программы", "Programmtage"), String(days.length)],
                    [t("Пунктов в расписании", "Programmpunkte"), String(items.length)],
                    [t("Цена за подростка", "Preis pro Teen"), camp.price != null ? `${camp.price} €` : "-"],
                    [t("Мест для подростков", "Plätze für Teens"), camp.max_participants != null ? String(camp.max_participants) : "-"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[18px] border border-[#ece6d3] bg-white p-4">
                      <p className="text-[26px] font-extrabold leading-none tracking-[-0.02em]">{value}</p>
                      <p className="mt-2 text-[12px] text-[#8a8678]">{label}</p>
                    </div>
                  ))}
                </div>

                {camp.description && (
                  <section className="rounded-[20px] border border-[#ece6d3] bg-white p-4">
                    <h3 className="text-[14px] font-bold">{t("О лагере", "Über das Camp")}</h3>
                    <p className="mt-1.5 whitespace-pre-line text-[14px] leading-[1.55] text-[#5b5a50]">{camp.description}</p>
                  </section>
                )}

                {canManage && (
                  <button
                    type="button"
                    onClick={() => setCampForm(camp)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-white text-[14px] font-semibold ring-1 ring-[#ece6d3]"
                  >
                    <Pencil size={15} />
                    {t("Изменить данные лагеря", "Camp-Daten ändern")}
                  </button>
                )}
              </div>
            )}

            {camp && tab === "team" && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] text-[#8a8678]">
                    {t("Едут", "Dabei")}: <b className="text-[#1b2431]">{teamCounts.confirmed}</b> · {t("думают", "offen")}: {teamCounts.pending} · {t("не едут", "abgesagt")}: {teamCounts.declined}
                  </p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setTeamForm({ status: "pending" })}
                      className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#ffc93c] px-4 text-[13px] font-bold text-[#1b2431]"
                    >
                      <Plus size={16} />
                      {t("Добавить", "Hinzufügen")}
                    </button>
                  )}
                </div>

                {team.length === 0 ? (
                  <Empty
                    icon={<Users size={22} />}
                    title={t("Команда пока пустая", "Noch kein Team")}
                    hint={t("Добавьте служителей и распределите, кто за что отвечает.", "Füge Mitarbeiter hinzu und lege fest, wer wofür zuständig ist.")}
                  />
                ) : (
                  team.map((r) => {
                    const name = teamName(r);
                    const st = MEMBER_STATUS[r.status];
                    const phone = r.phone || (r.member_id ? memberById.get(r.member_id)?.phone : null);
                    return (
                      <div key={r.id} onClick={() => canManage && setTeamForm(r)} className={"rounded-[20px] border border-[#ece6d3] bg-white p-4 " + (canManage ? "cursor-pointer active:bg-[#faf8f3]" : "")}>
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff4d1] text-[14px] font-extrabold text-[#9a6b00]">
                            {initials(name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[15px] font-bold">{name}</p>
                              <span className={"rounded-full px-2.5 py-0.5 text-[11px] font-bold " + st.cls}>{isRu ? st.ru : st.de}</span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {splitRoles(r.role_title).map((role) => (
                                <span key={role} className="rounded-full bg-[#fff4d1] px-2.5 py-1 text-[12px] font-bold text-[#9a6b00]">
                                  {role}
                                </span>
                              ))}
                            </div>
                            {r.duties && <p className="mt-1.5 whitespace-pre-line text-[13px] leading-[1.5] text-[#5b5a50]">{r.duties}</p>}
                            {phone && (
                              <a href={`tel:${phone}`} className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[#8a8678]">
                                <Phone size={13} />
                                {phone}
                              </a>
                            )}
                          </div>
                          {canManage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTeamForm(r);
                              }}
                              aria-label={t("Изменить", "Ändern")}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3efe2] text-[#5b5a50]"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {camp && tab === "reg" && (
              <CampRegistration campId={camp.id} campStart={camp.start_date} canManage={canManage} isRu={isRu} />
            )}

            {camp && tab === "groups" && (
              <CampGroups campId={camp.id} campStart={camp.start_date} canManage={canManage} isRu={isRu} />
            )}

            {camp && tab === "materials" && (
              <CampMaterials campId={camp.id} canManage={canManage} isRu={isRu} />
            )}

            {camp && tab === "checkin" && (
              <CampCheckin campId={camp.id} campStart={camp.start_date} price={camp.price} canManage={canManage} isRu={isRu} />
            )}

            {camp && tab === "schedule" && (
              <div className="mt-4 space-y-3">
                {days.length === 0 ? (
                  <Empty
                    icon={<CalendarDays size={22} />}
                    title={t("Сначала укажите даты лагеря", "Lege zuerst die Camp-Daten fest")}
                    hint={t("Когда будут даты, появятся дни, и в каждый можно вписать программу по часам.", "Mit Datum erscheinen die Tage, und du kannst das Programm pro Stunde eintragen.")}
                  />
                ) : (
                  <>
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 print:hidden">
                      {days.map((d, i) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDay(d)}
                          className={
                            "shrink-0 rounded-[16px] px-3.5 py-2 text-center transition " +
                            (d === day ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")
                          }
                        >
                          <span className="block text-[10px] font-bold uppercase opacity-70">
                            {t("День", "Tag")} {i + 1}
                          </span>
                          <span className="block text-[14px] font-extrabold">{fmt(d, locale, { weekday: "short", day: "numeric", month: "numeric" })}</span>
                        </button>
                      ))}
                    </div>

                    {day && (
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-[16px] font-extrabold">{fmt(day, locale, { weekday: "long", day: "numeric", month: "long" })}</h2>
                        <div className="flex gap-1.5 print:hidden">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            aria-label={t("Печать", "Drucken")}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-[#ece6d3]"
                          >
                            <Printer size={16} />
                          </button>
                          {canManage && dayItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setCopyFrom(day)}
                              aria-label={t("Копировать день", "Tag kopieren")}
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-[#ece6d3]"
                            >
                              <Copy size={16} />
                            </button>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setItemForm({ day_date: day, category: "program", start_time: "09:00" })}
                              className="flex h-9 items-center gap-1.5 rounded-full bg-[#ffc93c] px-3.5 text-[13px] font-bold text-[#1b2431]"
                            >
                              <Plus size={15} />
                              {t("Пункт", "Punkt")}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {dayItems.length === 0 ? (
                      <Empty
                        icon={<Clock3 size={22} />}
                        title={t("На этот день ничего нет", "Für diesen Tag ist nichts geplant")}
                        hint={canManage ? t("Добавьте первый пункт: подъём, завтрак, программа.", "Füge den ersten Punkt hinzu: Wecken, Frühstück, Programm.") : undefined}
                      />
                    ) : (
                      <div className="relative space-y-2.5">
                        {dayItems.map((it) => {
                          const cat = CATEGORIES[it.category] ?? CATEGORIES.other;
                          const Icon = cat.icon;
                          return (
                            <div key={it.id} className="flex gap-3">
                              <div className="w-[52px] shrink-0 pt-3 text-right">
                                <p className="text-[14px] font-extrabold leading-none">{hhmm(it.start_time)}</p>
                                {it.end_time && <p className="mt-1 text-[11px] text-[#8a8678]">{hhmm(it.end_time)}</p>}
                              </div>
                              <div
                                onClick={() => canManage && setItemForm(it)}
                                className={"min-w-0 flex-1 rounded-[18px] border border-[#ece6d3] bg-white p-3.5 " + (canManage ? "cursor-pointer active:bg-[#faf8f3]" : "")}
                                style={{ borderLeft: `4px solid ${cat.color}` }}
                              >
                                <div className="flex items-start gap-2.5">
                                  <span
                                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                    style={{ backgroundColor: `${cat.color}1f`, color: cat.color }}
                                  >
                                    <Icon size={16} />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-bold leading-snug">{it.title}</p>
                                    {it.details && <p className="mt-1 whitespace-pre-line text-[13px] leading-[1.5] text-[#5b5a50]">{it.details}</p>}
                                    {(it.place || it.responsible) && (
                                      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[#8a8678]">
                                        {it.place && (
                                          <span className="inline-flex items-center gap-1">
                                            <MapPin size={12} />
                                            {it.place}
                                          </span>
                                        )}
                                        {it.responsible && (
                                          <span className="inline-flex items-center gap-1">
                                            <Users size={12} />
                                            {it.responsible}
                                          </span>
                                        )}
                                      </p>
                                    )}
                                  </div>
                                  {canManage && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setItemForm(it);
                                      }}
                                      aria-label={t("Изменить", "Ändern")}
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3efe2] text-[#5b5a50] print:hidden"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------- форма лагеря ---------- */}
      {campForm && (
        <Sheet title={campForm.id ? t("Данные лагеря", "Camp-Daten") : t("Новый лагерь", "Neues Camp")} onClose={() => setCampForm(null)}>
          <div className="space-y-3">
            <Field label={t("Название", "Name")}>
              <input className={inputCls} value={campForm.title ?? ""} onChange={(e) => setCampForm({ ...campForm, title: e.target.value })} placeholder={t("Например: Летний лагерь 2027", "z. B. Sommercamp 2027")} />
            </Field>
            <Field label={t("Тема лагеря", "Motto")}>
              <input className={inputCls} value={campForm.theme ?? ""} onChange={(e) => setCampForm({ ...campForm, theme: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Начало", "Beginn")}>
                <DatePicker value={campForm.start_date ?? ""} onChange={(v: string) => setCampForm({ ...campForm, start_date: v })} className={inputCls} />
              </Field>
              <Field label={t("Конец", "Ende")}>
                <DatePicker value={campForm.end_date ?? ""} min={campForm.start_date || undefined} onChange={(v: string) => setCampForm({ ...campForm, end_date: v })} className={inputCls} />
              </Field>
            </div>
            <Field label={t("Место", "Ort")}>
              <input className={inputCls} value={campForm.location ?? ""} onChange={(e) => setCampForm({ ...campForm, location: e.target.value })} />
            </Field>
            <Field label={t("Адрес", "Adresse")}>
              <input className={inputCls} value={campForm.address ?? ""} onChange={(e) => setCampForm({ ...campForm, address: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Цена за подростка, €", "Preis pro Teen, €")}>
                <input inputMode="decimal" className={inputCls} value={campForm.price ?? ""} onChange={(e) => setCampForm({ ...campForm, price: e.target.value as unknown as number })} />
              </Field>
              <Field label={t("Мест для подростков", "Plätze für Teens")}>
                <input inputMode="numeric" className={inputCls} value={campForm.max_participants ?? ""} onChange={(e) => setCampForm({ ...campForm, max_participants: e.target.value as unknown as number })} />
              </Field>
            </div>
            <Field label={t("Статус", "Status")}>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(STATUS_LABEL) as Camp["status"][]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCampForm({ ...campForm, status: st })}
                    className={
                      "flex h-10 items-center justify-center gap-1 rounded-[12px] text-[13px] font-semibold " +
                      ((campForm.status ?? "planning") === st ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")
                    }
                  >
                    {(campForm.status ?? "planning") === st && <Check size={14} />}
                    {t(...STATUS_LABEL[st])}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("Описание", "Beschreibung")}>
              <textarea rows={4} className={inputCls} value={campForm.description ?? ""} onChange={(e) => setCampForm({ ...campForm, description: e.target.value })} />
            </Field>
            <PrimaryButton onClick={saveCamp} busy={busy} disabled={!campForm.title?.trim()}>
              {t("Сохранить", "Speichern")}
            </PrimaryButton>
            {campForm.id && (
              <button type="button" onClick={deleteCamp} className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-semibold text-red-600">
                <Trash2 size={16} />
                {t("Удалить лагерь", "Camp löschen")}
              </button>
            )}
          </div>
        </Sheet>
      )}

      {/* ---------- форма команды ---------- */}
      {teamForm && (
        <Sheet title={teamForm.id ? t("Участник команды", "Teammitglied") : t("Добавить в команду", "Zum Team hinzufügen")} onClose={() => setTeamForm(null)}>
          <div className="space-y-3">
            <Field label={t("Кто", "Wer")}>
              <PersonField
                isRu={isRu}
                label={t("Выберите служителя", "Mitarbeiter wählen")}
                value={teamForm.member_id ? String(teamForm.member_id) : teamForm.guest_name !== null && teamForm.guest_name !== undefined ? "guest" : ""}
                options={[
                  ...members
                    .filter((m) => m.id === teamForm.member_id || !team.some((r) => r.member_id === m.id))
                    .map((m) => ({ value: String(m.id), label: nameOf(m) })),
                  { value: "guest", label: t("Другой человек (не в приложении)", "Andere Person (nicht in der App)") },
                ]}
                onPick={(v) => {
                  if (v === "guest") setTeamForm({ ...teamForm, member_id: null, guest_name: teamForm.guest_name ?? "" });
                  else setTeamForm({ ...teamForm, member_id: Number(v), guest_name: null });
                }}
              />
            </Field>
            {!teamForm.member_id && teamForm.guest_name !== null && teamForm.guest_name !== undefined && (
              <Field label={t("Имя", "Name")}>
                <input className={inputCls} value={teamForm.guest_name ?? ""} onChange={(e) => setTeamForm({ ...teamForm, guest_name: e.target.value })} />
              </Field>
            )}
            <Field label={t("Функции в лагере (можно несколько)", "Aufgaben im Camp (mehrere möglich)")}>
              <div className="space-y-2">
                {splitRoles(teamForm.role_title).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {splitRoles(teamForm.role_title).map((role) => (
                      <span key={role} className="inline-flex items-center gap-1 rounded-full bg-[#1b2431] py-1.5 pl-3 pr-1.5 text-[12px] font-semibold text-white">
                        {role}
                        <button
                          type="button"
                          aria-label={t("Убрать", "Entfernen")}
                          onClick={() =>
                            setTeamForm({ ...teamForm, role_title: joinRoles(splitRoles(teamForm.role_title).filter((x) => x !== role)) })
                          }
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    value={roleDraft}
                    onChange={(e) => setRoleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRole(roleDraft);
                      }
                    }}
                    placeholder={t("Своя функция", "Eigene Aufgabe")}
                  />
                  <button
                    type="button"
                    onClick={() => addRole(roleDraft)}
                    disabled={!roleDraft.trim().replace(/\|/g, "")}
                    className="flex h-[42px] shrink-0 items-center gap-1 rounded-[12px] bg-[#ffc93c] px-3.5 text-[13px] font-bold text-[#1b2431] disabled:opacity-40"
                  >
                    <Plus size={15} />
                    {t("Добавить", "Hinzufügen")}
                  </button>
                </div>
              </div>
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_SUGGEST.map(([ru, de]) => {
                const name = t(ru, de);
                const on = splitRoles(teamForm.role_title).includes(name);
                return (
                  <button
                    key={ru}
                    type="button"
                    onClick={() =>
                      setTeamForm({
                        ...teamForm,
                        role_title: joinRoles(on ? splitRoles(teamForm.role_title).filter((x) => x !== name) : [...splitRoles(teamForm.role_title), name]),
                      })
                    }
                    className={
                      "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 " +
                      (on ? "bg-[#fff4d1] text-[#9a6b00] ring-[#ffc93c]" : "bg-white text-[#5b5a50] ring-[#ece6d3]")
                    }
                  >
                    {on && <Check size={12} />}
                    {name}
                  </button>
                );
              })}
            </div>
            <Field label={t("За что отвечает", "Verantwortlich für")}>
              <textarea rows={3} className={inputCls} value={teamForm.duties ?? ""} onChange={(e) => setTeamForm({ ...teamForm, duties: e.target.value })} />
            </Field>
            <Field label={t("Телефон (если не из команды)", "Telefon (falls nicht aus dem Team)")}>
              <input inputMode="tel" className={inputCls} value={teamForm.phone ?? ""} onChange={(e) => setTeamForm({ ...teamForm, phone: e.target.value })} />
            </Field>
            <Field label={t("Едет ли", "Dabei?")}>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(MEMBER_STATUS) as TeamRow["status"][]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTeamForm({ ...teamForm, status: s })}
                    className={
                      "flex h-10 items-center justify-center gap-1 rounded-[12px] text-[13px] font-semibold " +
                      (teamForm.status === s ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")
                    }
                  >
                    {teamForm.status === s && <Check size={14} />}
                    {isRu ? MEMBER_STATUS[s].ru : MEMBER_STATUS[s].de}
                  </button>
                ))}
              </div>
            </Field>
            <PrimaryButton
              onClick={saveTeam}
              busy={busy}
              disabled={!teamForm.role_title?.trim() || (!teamForm.member_id && !teamForm.guest_name?.trim())}
            >
              {t("Сохранить", "Speichern")}
            </PrimaryButton>
            {teamForm.id && (
              <button type="button" onClick={() => deleteTeam(teamForm.id!)} className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-semibold text-red-600">
                <Trash2 size={16} />
                {t("Убрать из команды", "Aus dem Team entfernen")}
              </button>
            )}
          </div>
        </Sheet>
      )}

      {/* ---------- форма пункта расписания ---------- */}
      {itemForm && (
        <Sheet title={itemForm.id ? t("Пункт расписания", "Programmpunkt") : t("Новый пункт", "Neuer Punkt")} onClose={() => setItemForm(null)}>
          <div className="space-y-3">
            <Field label={t("День", "Tag")}>
              <DatePicker value={itemForm.day_date ?? ""} clearable={false} onChange={(v: string) => setItemForm({ ...itemForm, day_date: v })} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Начало", "Beginn")}>
                <TimeField isRu={isRu} placeholder="09:00" value={hhmm(itemForm.start_time ?? null)} onChange={(v) => setItemForm({ ...itemForm, start_time: v })} />
              </Field>
              <Field label={t("Конец (необязательно)", "Ende (optional)")}>
                <TimeField isRu={isRu} clearable placeholder="-" value={hhmm(itemForm.end_time ?? null)} onChange={(v) => setItemForm({ ...itemForm, end_time: v })} />
              </Field>
            </div>
            <Field label={t("Название", "Titel")}>
              <input className={inputCls} value={itemForm.title ?? ""} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} placeholder={t("Например: Завтрак", "z. B. Frühstück")} />
            </Field>
            <Field label={t("Тип", "Art")}>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(CATEGORIES).map(([key, c]) => {
                  const Icon = c.icon;
                  const on = (itemForm.category ?? "program") === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setItemForm({ ...itemForm, category: key })}
                      className={"flex h-10 items-center gap-2 rounded-[12px] px-3 text-[13px] font-semibold " + (on ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")}
                    >
                      <Icon size={15} style={{ color: on ? "#ffc93c" : c.color }} />
                      {isRu ? c.ru : c.de}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label={t("Описание", "Beschreibung")}>
              <textarea rows={3} className={inputCls} value={itemForm.details ?? ""} onChange={(e) => setItemForm({ ...itemForm, details: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Место", "Ort")}>
                <input className={inputCls} value={itemForm.place ?? ""} onChange={(e) => setItemForm({ ...itemForm, place: e.target.value })} />
              </Field>
              <Field label={t("Ответственный", "Verantwortlich")}>
                <PersonField
                  isRu={isRu}
                  label={t("Выберите", "Auswählen")}
                  value={respValue}
                  options={respOptions}
                  onPick={(v) => {
                    if (v === "__none") {
                      setRespCustom(false);
                      setItemForm({ ...itemForm, responsible: "" });
                    } else if (v === "__custom") {
                      setRespCustom(true);
                    } else {
                      setRespCustom(false);
                      setItemForm({ ...itemForm, responsible: v });
                    }
                  }}
                />
              </Field>
            </div>
            {(respCustom || (respValue === "__custom")) && (
              <Field label={t("Кто ответственный (имя)", "Verantwortlich (Name)")}>
                <input
                  className={inputCls}
                  value={itemForm.responsible ?? ""}
                  onChange={(e) => setItemForm({ ...itemForm, responsible: e.target.value })}
                />
              </Field>
            )}
            <PrimaryButton onClick={saveItem} busy={busy} disabled={!itemForm.title?.trim() || !itemForm.start_time || !itemForm.day_date}>
              {t("Сохранить", "Speichern")}
            </PrimaryButton>
            {itemForm.id && (
              <button type="button" onClick={() => deleteItem(itemForm.id!)} className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-semibold text-red-600">
                <Trash2 size={16} />
                {t("Удалить пункт", "Punkt löschen")}
              </button>
            )}
          </div>
        </Sheet>
      )}

      {/* ---------- копирование дня ---------- */}
      {copyFrom && (
        <Sheet title={t("Копировать день", "Tag kopieren")} onClose={() => setCopyFrom(null)}>
          <p className="mb-3 text-[13px] text-[#5b5a50]">
            {t("Все пункты этого дня будут добавлены в выбранный день. Уже существующие пункты не удаляются.", "Alle Punkte dieses Tages werden zum gewählten Tag hinzugefügt. Vorhandene Punkte bleiben erhalten.")}
          </p>
          <div className="space-y-2">
            {days
              .filter((d) => d !== copyFrom)
              .map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={busy}
                  onClick={() => copyDay(d)}
                  className="flex h-12 w-full items-center justify-between rounded-[14px] bg-white px-4 text-[14px] font-semibold ring-1 ring-[#ece6d3] disabled:opacity-50"
                >
                  {fmt(d, locale, { weekday: "long", day: "numeric", month: "long" })}
                  <Copy size={15} className="text-[#8a8678]" />
                </button>
              ))}
          </div>
        </Sheet>
      )}
    </main>
  );
}