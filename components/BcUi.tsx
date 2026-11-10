"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";

/* =====================================================================
   Единый набор элементов интерфейса для админ-панели Bibel-Challenge:
   нижние панели (Sheet), выбор из списка (SelectSheet), календарь и время,
   диалог подтверждения, уведомления, переключатели. Вместо системных окон Android.
   Палитра: фон #faf8f3, тёмный #1b2431, жёлтый #ffc93c, светло-жёлтый #fff4d1, глубокий жёлтый #9a6b00
   ===================================================================== */

export const ui = {
  label: "text-[12px] font-semibold text-[#6f6a5c]",
  input:
    "h-12 w-full rounded-[14px] border border-[#e6dfca] bg-white px-3.5 text-[15px] text-[#1b2431] outline-none transition placeholder:text-[#b5af9c] focus:border-[#1b2431] focus:ring-[3px] focus:ring-[#ffc93c]/45",
  area: "min-h-[110px] w-full rounded-[14px] border border-[#e6dfca] bg-white px-3.5 py-3 text-[15px] leading-relaxed text-[#1b2431] outline-none transition placeholder:text-[#b5af9c] focus:border-[#1b2431] focus:ring-[3px] focus:ring-[#ffc93c]/45",
  btn: "inline-flex h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-[15px] font-semibold transition active:scale-[0.985] disabled:opacity-45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ffc93c]",
  primary: "bg-[#1b2431] text-[#ffc93c]",
  soft: "bg-[#f1ede1] text-[#1b2431]",
  ghost: "border border-[#e6dfca] bg-white text-[#1b2431]",
  danger: "bg-[#fbeceb] text-[#b3342f]",
  group: "overflow-hidden rounded-[18px] border border-[#ece6d3] bg-white divide-y divide-[#f0ebdc]",
};

export const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ");

/* ---------- стили анимаций (один раз) ---------- */

function UiStyles() {
  return (
    <style>{`
      @keyframes bc-up{from{transform:translateY(100%)}to{transform:none}}
      @keyframes bc-fade{from{opacity:0}to{opacity:1}}
      @keyframes bc-pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
      @keyframes bc-toast{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      .bc-sheet{animation:bc-up .3s cubic-bezier(.22,1,.36,1)}
      .bc-fade{animation:bc-fade .2s ease-out}
      .bc-pop{animation:bc-pop .18s ease-out}
      .bc-toast{animation:bc-toast .22s ease-out}
      @media (prefers-reduced-motion:reduce){.bc-sheet,.bc-fade,.bc-pop,.bc-toast{animation:none}}
    `}</style>
  );
}

/* ---------- нижняя панель ---------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [dy, setDy] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="bc-fade absolute inset-0 bg-[#1b2431]/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bc-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-[560px] flex-col rounded-t-[28px] bg-[#faf8f3] shadow-[0_-12px_40px_rgba(27,36,49,0.18)]"
        style={{ transform: dy ? `translateY(${dy}px)` : undefined, transition: dy ? "none" : undefined }}
      >
        <div
          className="flex shrink-0 touch-none justify-center pb-1 pt-2.5"
          onPointerDown={(e) => {
            start.current = e.clientY;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (start.current !== null) setDy(Math.max(0, e.clientY - start.current));
          }}
          onPointerUp={() => {
            if (dy > 90) onClose();
            setDy(0);
            start.current = null;
          }}
        >
          <span className="h-1 w-10 rounded-full bg-[#d9d3c1]" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-1">
          <h2 className="min-w-0 truncate text-[18px] font-extrabold tracking-[-0.01em] text-[#1b2431]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1ede1] text-[#1b2431] active:scale-95"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-[#ece6d3] bg-[#faf8f3] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- выбор из списка ---------- */

export type Opt = { value: string | number; label: string; hint?: string; disabled?: boolean };

export function SelectSheet({
  open,
  onClose,
  title,
  options,
  value,
  onChange,
  emptyLabel,
  searchable,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: Opt[];
  value: string | number | null | undefined;
  onChange: (v: string | number | "") => void;
  emptyLabel?: string;
  searchable?: boolean;
}) {
  const { language } = useLanguage();
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const shown = options.filter((o) => !q.trim() || o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const row = (o: Opt | { value: ""; label: string; hint?: undefined; disabled?: undefined }) => {
    const selected = (value ?? "") === o.value;
    return (
      <button
        key={String(o.value)}
        type="button"
        disabled={o.disabled}
        onClick={() => {
          onChange(o.value);
          onClose();
        }}
        className="flex min-h-[54px] w-full items-center gap-3 px-4 py-2.5 text-left active:bg-[#faf8f3] disabled:opacity-40"
      >
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate text-[15px]", selected ? "font-bold" : "font-medium")}>{o.label}</span>
          {o.hint && <span className="block truncate text-[12px] text-[#8a8678]">{o.hint}</span>}
        </span>
        {selected && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ffc93c]">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
      </button>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {searchable && (
        <div className="relative mb-3">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-4 text-[#9a9585]" />
          <input
            className={cx(ui.input, "pl-10")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={language === "ru" ? "Поиск" : "Suchen"}
          />
        </div>
      )}
      <div className={ui.group}>
        {emptyLabel !== undefined && !q && row({ value: "", label: emptyLabel })}
        {shown.map((o) => row(o))}
        {shown.length === 0 && (
          <p className="px-4 py-6 text-center text-[14px] text-[#8a8678]">
            {language === "ru" ? "Ничего не найдено" : "Nichts gefunden"}
          </p>
        )}
      </div>
    </Sheet>
  );
}

/* поле, которое открывает выбор в нижней панели */
export function SelectField({
  label,
  value,
  options,
  onChange,
  title,
  emptyLabel,
  placeholder,
  searchable,
  disabled,
}: {
  label: string;
  value: string | number | null | undefined;
  options: Opt[];
  onChange: (v: string | number | "") => void;
  title?: string;
  emptyLabel?: string;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const text = current?.label ?? (value ? String(value) : emptyLabel ?? placeholder ?? "");
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex min-h-[58px] w-full items-center gap-2 rounded-[14px] border border-[#e6dfca] bg-white px-3.5 py-2 text-left transition active:bg-[#faf8f3] disabled:opacity-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold text-[#8a8678]">{label}</span>
          <span className={cx("block truncate text-[15px] font-medium", !current && "text-[#8a8678]")}>{text}</span>
        </span>
        <ChevronDown size={18} className="shrink-0 text-[#a8a393]" />
      </button>
      <SelectSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title ?? label}
        options={options}
        value={value}
        onChange={onChange}
        emptyLabel={emptyLabel}
        searchable={searchable}
      />
    </>
  );
}

/* ---------- календарь и время ---------- */

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayKey = () => {
  const n = new Date();
  return keyOf(n.getFullYear(), n.getMonth(), n.getDate());
};

function Calendar({ value, onPick, isRu }: { value: string; onPick: (key: string) => void; isRu: boolean }) {
  const seed = value ? new Date(`${value}T12:00:00`) : new Date();
  const [view, setView] = useState({ y: seed.getFullYear(), m: seed.getMonth() });
  const locale = isRu ? "ru-RU" : "de-DE";
  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(view.y, view.m, 1));
  const first = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // понедельник = 0
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 1 + i)),
  );
  const today = todayKey();
  const shift = (d: number) =>
    setView((v) => {
      const dt = new Date(v.y, v.m + d, 1);
      return { y: dt.getFullYear(), m: dt.getMonth() };
    });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="prev"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1ede1] active:scale-95"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-[16px] font-extrabold capitalize">{title}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="next"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1ede1] active:scale-95"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {weekdays.map((w) => (
          <span key={w} className="py-1.5 text-[11px] font-semibold text-[#8a8678]">
            {w}
          </span>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          const key = keyOf(view.y, view.m, d);
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className={cx(
                "mx-auto my-0.5 flex h-11 w-11 items-center justify-center rounded-full text-[15px] transition active:scale-90",
                selected
                  ? "bg-[#1b2431] font-extrabold text-[#ffc93c]"
                  : key === today
                    ? "bg-[#fff4d1] font-extrabold text-[#9a6b00]"
                    : "font-medium hover:bg-[#f1ede1]",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function fieldShell(label: string, text: string, placeholder: string, onClick: () => void) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[58px] w-full items-center gap-2 rounded-[14px] border border-[#e6dfca] bg-white px-3.5 py-2 text-left transition active:bg-[#faf8f3]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold text-[#8a8678]">{label}</span>
        <span className={cx("block truncate text-[15px] font-medium", !text && "text-[#b5af9c]")}>{text || placeholder}</span>
      </span>
      <ChevronDown size={18} className="shrink-0 text-[#a8a393]" />
    </button>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
}) {
  const { language } = useLanguage();
  const isRu = language === "ru";
  const [open, setOpen] = useState(false);
  const text = value
    ? new Intl.DateTimeFormat(isRu ? "ru-RU" : "de-DE", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${value}T12:00:00`))
    : "";
  return (
    <>
      {fieldShell(label, text, isRu ? "Выбрать дату" : "Datum wählen", () => setOpen(true))}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        footer={
          <button
            type="button"
            className={cx(ui.btn, ui.soft, "w-full")}
            onClick={() => {
              onChange(todayKey());
              setOpen(false);
            }}
          >
            {isRu ? "Сегодня" : "Heute"}
          </button>
        }
      >
        <Calendar
          value={value ?? ""}
          isRu={isRu}
          onPick={(k) => {
            onChange(k);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const wrap = (v: number) => (v > max ? min : v < min ? max - ((max - min + 1) % step === 0 ? step - 1 : 0) : v);
  return (
    <div className="flex flex-1 flex-col items-center rounded-[16px] bg-white py-2 ring-1 ring-[#ece6d3]">
      <span className="text-[11px] font-semibold text-[#8a8678]">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <button
          type="button"
          aria-label="minus"
          onClick={() => onChange(wrap(value - step))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1ede1] active:scale-90"
        >
          <Minus size={16} />
        </button>
        <span className="w-10 text-center text-[26px] font-extrabold tabular-nums">{pad(value)}</span>
        <button
          type="button"
          aria-label="plus"
          onClick={() => onChange(wrap(value + step))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1ede1] active:scale-90"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/* дата и время; значение хранится как ISO-строка */
export function DateTimeField({
  label,
  value,
  onChange,
  defaultDate,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (iso: string) => void;
  defaultDate?: string;
}) {
  const { language } = useLanguage();
  const isRu = language === "ru";
  const [open, setOpen] = useState(false);
  const base = value ? new Date(value) : null;
  const [date, setDate] = useState("");
  const [h, setH] = useState(23);
  const [m, setM] = useState(59);

  const openIt = () => {
    if (base) {
      setDate(keyOf(base.getFullYear(), base.getMonth(), base.getDate()));
      setH(base.getHours());
      setM(base.getMinutes());
    } else {
      setDate(defaultDate || todayKey());
      setH(23);
      setM(59);
    }
    setOpen(true);
  };

  const text = base
    ? new Intl.DateTimeFormat(isRu ? "ru-RU" : "de-DE", {
        weekday: "short",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(base)
    : "";

  const presets: [string, number, number][] = [
    [isRu ? "Полдень" : "Mittag", 12, 0],
    [isRu ? "Вечер" : "Abend", 21, 0],
    [isRu ? "Конец дня" : "Tagesende", 23, 59],
  ];

  return (
    <>
      {fieldShell(label, text, isRu ? "Выбрать дату и время" : "Datum und Uhrzeit wählen", openIt)}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        footer={
          <button
            type="button"
            className={cx(ui.btn, ui.primary, "w-full")}
            disabled={!date}
            onClick={() => {
              const [y, mo, d] = date.split("-").map(Number);
              onChange(new Date(y, mo - 1, d, h, m).toISOString());
              setOpen(false);
            }}
          >
            <Check size={18} />
            {isRu ? "Готово" : "Fertig"}
          </button>
        }
      >
        <Calendar value={date} isRu={isRu} onPick={setDate} />
        <div className="mt-4 flex gap-2">
          <Stepper label={isRu ? "Часы" : "Stunden"} value={h} min={0} max={23} step={1} onChange={setH} />
          <Stepper label={isRu ? "Минуты" : "Minuten"} value={m} min={0} max={59} step={5} onChange={setM} />
        </div>
        <div className="mt-3 flex gap-2">
          {presets.map(([t, ph, pm]) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setH(ph);
                setM(pm);
              }}
              className={cx(
                "h-10 flex-1 rounded-full text-[13px] font-semibold transition active:scale-95",
                h === ph && m === pm ? "bg-[#ffc93c]" : "bg-[#f1ede1]",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

/* ---------- мелкие элементы ---------- */

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cx(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ffc93c] disabled:opacity-50",
        checked ? "bg-[#ffc93c]" : "bg-[#dcd6c4]",
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-[14px] bg-[#f1ede1] p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-10 flex-1 rounded-[11px] text-[14px] font-semibold transition",
            value === o.value ? "bg-white text-[#1b2431] shadow-sm" : "text-[#8a8678]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type Tone = "neutral" | "sun" | "ink" | "danger" | "soft";
const TONES: Record<Tone, string> = {
  neutral: "bg-[#f1ede1] text-[#6f6a5c]",
  sun: "bg-[#ffc93c] text-[#1b2431]",
  ink: "bg-[#1b2431] text-[#ffc93c]",
  danger: "bg-[#fbeceb] text-[#b3342f]",
  soft: "bg-[#fff4d1] text-[#9a6b00]",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold", TONES[tone])}>
      {children}
    </span>
  );
}

export function Avatar({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[#ffc93c] font-extrabold text-[#1b2431]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[20px] border border-dashed border-[#d9d3c1] px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff4d1] text-[#9a6b00]">{icon}</span>
      <p className="mt-3 text-[16px] font-extrabold">{title}</p>
      {text && <p className="mt-1 max-w-[280px] text-[13px] leading-relaxed text-[#8a8678]">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-[14px] bg-[#efe9d6]", className)} />;
}

/* ---------- диалог подтверждения и уведомления ---------- */

type ConfirmOpts = {
  title: string;
  text?: string;
  confirmLabel?: string;
  danger?: boolean;
  typeToConfirm?: string;
};
type ToastKind = "ok" | "error";
type Api = {
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  toast: (message: string, kind?: ToastKind) => void;
};
const Ctx = createContext<Api | null>(null);

export function useBcUi(): Api {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBcUi: оберните страницу в BcUiProvider");
  return c;
}

export function BcUiProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const isRu = language === "ru";
  const [dlg, setDlg] = useState<{ o: ConfirmOpts; resolve: (v: boolean) => void } | null>(null);
  const [typed, setTyped] = useState("");
  const [toasts, setToasts] = useState<{ id: number; text: string; kind: ToastKind }[]>([]);
  const seq = useRef(1);

  const confirm = useCallback((o: ConfirmOpts) => {
    setTyped("");
    return new Promise<boolean>((resolve) => setDlg({ o, resolve }));
  }, []);

  const toast = useCallback((text: string, kind: ToastKind = "ok") => {
    const id = seq.current++;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const api = useMemo(() => ({ confirm, toast }), [confirm, toast]);
  const close = (v: boolean) => {
    dlg?.resolve(v);
    setDlg(null);
  };
  const needText = dlg?.o.typeToConfirm;
  const canConfirm = !needText || typed.trim().toLowerCase() === needText.toLowerCase();

  return (
    <Ctx.Provider value={api}>
      <UiStyles />
      {children}

      {dlg && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-6">
          <div className="bc-fade absolute inset-0 bg-[#1b2431]/55" onClick={() => close(false)} />
          <div
            role="alertdialog"
            aria-modal="true"
            className="bc-pop relative w-full max-w-[340px] rounded-[24px] bg-white p-5 shadow-[0_20px_60px_rgba(27,36,49,0.3)]"
          >
            {dlg.o.danger && (
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#fbeceb] text-[#b3342f]">
                <AlertTriangle size={20} />
              </span>
            )}
            <h3 className="text-[18px] font-extrabold leading-snug tracking-[-0.01em]">{dlg.o.title}</h3>
            {dlg.o.text && <p className="mt-1.5 text-[14px] leading-relaxed text-[#6f6a5c]">{dlg.o.text}</p>}
            {needText && (
              <input
                autoFocus
                className={cx(ui.input, "mt-3")}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={needText}
              />
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" className={cx(ui.btn, ui.soft)} onClick={() => close(false)}>
                {isRu ? "Отмена" : "Abbrechen"}
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                className={cx(ui.btn, dlg.o.danger ? "bg-[#b3342f] text-white" : ui.primary)}
                onClick={() => close(true)}
              >
                {dlg.o.confirmLabel ?? (isRu ? "Да" : "Ja")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[95] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bc-toast pointer-events-auto flex max-w-[360px] items-center gap-2 rounded-full bg-[#1b2431] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(27,36,49,0.3)]"
          >
            {t.kind === "ok" ? (
              <CheckCircle2 size={16} className="shrink-0 text-[#ffc93c]" />
            ) : (
              <AlertTriangle size={16} className="shrink-0 text-[#ff9a8f]" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}