"use client";

import { useMemo } from "react";

/*
 * Выбор времени «часы : минуты» для всех платформ.
 *
 * Использует обычные <select>: на iPhone и Android открывается родное
 * колесо/список, на компьютере — выпадающий список. Никакого ручного
 * ввода двоеточия и никаких глюков <input type="time">.
 *
 * value — строка "HH:MM", onChange отдаёт тоже "HH:MM".
 * Шаг минут — 5. Если в value уже стоит «нестандартная» минута
 * (например, 12:07 из старой записи), она тоже остаётся в списке.
 */

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  /** быстрые варианты под полем, например ["10:00", "12:30"] */
  presets?: string[];
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTE_STEP = 5;

function split(value: string): [string, string] {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) return ["10", "00"];

  return [match[1].padStart(2, "0"), match[2]];
}

export default function TimePicker({
  value,
  onChange,
  ariaLabel,
  presets,
}: TimePickerProps) {
  const [hour, minute] = split(value);

  const minutes = useMemo(() => {
    const list = Array.from({ length: 60 / MINUTE_STEP }, (_, i) =>
      String(i * MINUTE_STEP).padStart(2, "0"),
    );

    if (!list.includes(minute)) {
      list.push(minute);
      list.sort();
    }

    return list;
  }, [minute]);

  const selectClass =
    "h-11 w-full appearance-none rounded-xl border border-neutral-200 bg-white px-3 text-center text-[15px] font-semibold tabular-nums outline-none focus:border-neutral-400";

  return (
    <div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <select
          aria-label={ariaLabel ? `${ariaLabel}: h` : "h"}
          value={hour}
          onChange={(event) => onChange(`${event.target.value}:${minute}`)}
          className={selectClass}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <span className="text-lg font-bold text-neutral-400">:</span>

        <select
          aria-label={ariaLabel ? `${ariaLabel}: min` : "min"}
          value={minute}
          onChange={(event) => onChange(`${hour}:${event.target.value}`)}
          className={selectClass}
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {presets && presets.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                value === preset
                  ? "bg-[#111820] text-white"
                  : "bg-neutral-100 text-neutral-500 active:bg-neutral-200"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}