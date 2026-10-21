"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";

/*
 * Единый красивый выбор даты вместо стандартного <input type="date">.
 * Значение — строка "YYYY-MM-DD" (как у обычного поля), пустая строка = не выбрано.
 *
 *   <DatePicker value={date} onChange={setDate} />
 *   <DatePicker value={birth} onChange={setBirth} birth />        // дата рождения: быстрый выбор года
 *   <DatePicker value={end} onChange={setEnd} min={start} />      // нельзя раньше start
 *   <DatePicker ... marked={new Set(["2026-10-27"])} />            // зелёные точки под днями
 *   <DatePicker ... shortcuts={[{ label: "Последний вторник", value: "2026-10-27" }]} />
 */

type Props = {
  value: string;
  onChange: (next: string) => void;
  min?: string;
  max?: string;
  /** дата рождения: календарь открывается на ~13 лет назад и месяц/год выбираются быстро */
  birth?: boolean;
  /** можно ли очистить дату (по умолчанию да) */
  clearable?: boolean;
  placeholder?: string;
  /** классы кнопки-поля; если не заданы — стандартный вид */
  className?: string;
  marked?: Set<string>;
  shortcuts?: { label: string; value: string }[];
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parse(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`);
}

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  birth = false,
  clearable = true,
  placeholder,
  className,
  marked,
  shortcuts,
}: Props) {
  const { language } = useLanguage();
  const isRu = language === "ru";
  const locale = isRu ? "ru-RU" : "de-DE";

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months" | "years">("days");
  const [month, setMonth] = useState(() => startMonth());
  const [yearPage, setYearPage] = useState(0);

  function startMonth() {
    if (value) {
      const date = parse(value);
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    const now = new Date();

    return birth
      ? new Date(now.getFullYear() - 13, now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // при открытии показываем месяц выбранной даты
  useEffect(() => {
    if (open) {
      setMonth(startMonth());
      setView(birth && !value ? "years" : "days");
      setYearPage(0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [open]);

  // Esc закрывает календарь
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const todayKey = toKey(new Date());

  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, 1 + index)
      .toLocaleDateString(locale, { weekday: "short" })
      .replace(".", ""),
  );

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const label = value
    ? parse(value).toLocaleDateString(locale, {
        weekday: birth ? undefined : "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  function select(next: string) {
    onChange(next);
    setOpen(false);
  }

  const yearStart = month.getFullYear() - 5 + yearPage * 12;

  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={
            className
              ? `flex items-center text-left ${className}`
              : "flex h-11 w-full items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-left text-sm outline-none transition hover:bg-white"
          }
          aria-expanded={open}
        >
          {!className && <Calendar size={15} className="shrink-0 text-neutral-400" />}

          <span
            className={`min-w-0 flex-1 truncate ${
              value ? "font-medium" : "text-neutral-400"
            }`}
          >
            {value ? label : placeholder ?? (isRu ? "Выбрать дату" : "Datum wählen")}
          </span>
        </button>

        {clearable && value && (
          <button
            type="button"
            onClick={() => select("")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100"
            aria-label={isRu ? "Очистить дату" : "Datum löschen"}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[300] flex items-end justify-center bg-[#111820]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="w-full rounded-t-[26px] bg-white p-4 pb-6 text-[#111820] shadow-2xl sm:max-w-[360px] sm:rounded-[22px] sm:pb-4"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#d9dadd] sm:hidden" />

          {/* ШАПКА */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                view === "years"
                  ? setYearPage((page) => page - 1)
                  : setMonth(
                      new Date(
                        month.getFullYear() - (view === "months" ? 1 : 0),
                        month.getMonth() - (view === "days" ? 1 : 0),
                        1,
                      ),
                    )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f2f3] text-[#4e5966] active:scale-95"
              aria-label={isRu ? "Назад" : "Zurück"}
            >
              <ChevronLeft size={17} />
            </button>

            <button
              type="button"
              onClick={() => {
                setYearPage(0);
                setView(view === "days" ? "months" : view === "months" ? "years" : "days");
              }}
              className="rounded-full px-3 py-1.5 text-[15px] font-bold capitalize tracking-[-0.02em] transition hover:bg-[#f1f2f3]"
            >
              {view === "days"
                ? month.toLocaleDateString(locale, { month: "long", year: "numeric" })
                : view === "months"
                  ? month.getFullYear()
                  : `${yearStart} – ${yearStart + 11}`}
            </button>

            <button
              type="button"
              onClick={() =>
                view === "years"
                  ? setYearPage((page) => page + 1)
                  : setMonth(
                      new Date(
                        month.getFullYear() + (view === "months" ? 1 : 0),
                        month.getMonth() + (view === "days" ? 1 : 0),
                        1,
                      ),
                    )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f2f3] text-[#4e5966] active:scale-95"
              aria-label={isRu ? "Вперёд" : "Weiter"}
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {/* ГОДЫ */}
          {view === "years" && (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, index) => yearStart + index).map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    setMonth(new Date(year, month.getMonth(), 1));
                    setView("months");
                  }}
                  className={`h-11 rounded-xl text-[14px] font-semibold transition active:scale-95 ${
                    year === month.getFullYear()
                      ? "bg-[#111820] text-white"
                      : "bg-[#f6f7f7] text-[#374353] hover:bg-[#eceef0]"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {/* МЕСЯЦЫ */}
          {view === "months" && (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, index) => index).map((monthIndex) => (
                <button
                  key={monthIndex}
                  type="button"
                  onClick={() => {
                    setMonth(new Date(month.getFullYear(), monthIndex, 1));
                    setView("days");
                  }}
                  className={`h-11 rounded-xl text-[13px] font-semibold capitalize transition active:scale-95 ${
                    monthIndex === month.getMonth()
                      ? "bg-[#111820] text-white"
                      : "bg-[#f6f7f7] text-[#374353] hover:bg-[#eceef0]"
                  }`}
                >
                  {new Date(2024, monthIndex, 1).toLocaleDateString(locale, { month: "short" }).replace(".", "")}
                </button>
              ))}
            </div>
          )}

          {/* ДНИ */}
          {view === "days" && (
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {weekdays.map((name, index) => (
                <span
                  key={name + index}
                  className="py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#a0a8b1]"
                >
                  {name}
                </span>
              ))}

              {cells.map((day, index) => {
                if (day === null) return <span key={`e-${index}`} />;

                const key = `${month.getFullYear()}-${pad(month.getMonth() + 1)}-${pad(day)}`;
                const selected = key === value;
                const isToday = key === todayKey;
                const disabled = Boolean((min && key < min) || (max && key > max));
                const weekend = index % 7 >= 5;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => select(key)}
                    className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-semibold transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-25 ${
                      selected
                        ? "bg-[#111820] text-white shadow-md"
                        : isToday
                          ? "bg-amber-100 text-amber-900"
                          : weekend
                            ? "text-[#a0a8b1] hover:bg-[#f1f2f3]"
                            : "text-[#111820] hover:bg-[#f1f2f3]"
                    }`}
                  >
                    {day}

                    {marked?.has(key) && !selected && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* БЫСТРЫЕ КНОПКИ */}
          {view === "days" && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[#f0f1f2] pt-2.5">
              {!birth && !(min && todayKey < min) && !(max && todayKey > max) && (
                <button
                  type="button"
                  onClick={() => select(todayKey)}
                  className="h-8 rounded-full bg-[#f1f2f3] px-3 text-[12px] font-semibold text-[#4e5966]"
                >
                  {isRu ? "Сегодня" : "Heute"}
                </button>
              )}

              {shortcuts?.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => select(item.value)}
                  className="h-8 rounded-full bg-[#f1f2f3] px-3 text-[12px] font-semibold text-[#4e5966]"
                >
                  {item.label}
                </button>
              ))}

              {marked && marked.size > 0 && (
                <span className="ml-auto flex items-center gap-1 text-[10.5px] text-[#9aa2ad]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {isRu ? "уже есть план" : "schon ein Plan"}
                </span>
              )}
            </div>
          )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}