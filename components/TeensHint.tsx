"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";

const PREFIX = "teens-hint-";

function read(id: string): boolean {
  try {
    return window.localStorage.getItem(PREFIX + id) === "1";
  } catch {
    return false;
  }
}

/* Показать все подсказки снова */
export function resetHints() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* без хранилища подсказки просто покажутся снова */
  }
}

/*
 * Короткая подсказка рядом с элементом интерфейса.
 * Показывается один раз, пока подросток не нажмёт «Понятно».
 */
export default function TeensHint({
  id,
  text,
  lang,
  className = "",
}: {
  id: string;
  text: string;
  lang: "de" | "ru";
  className?: string;
}) {
  // null — ещё не прочитали память (не мигаем подсказкой зря)
  const [hidden, setHidden] = useState<boolean | null>(null);

  useEffect(() => {
    setHidden(read(id));
  }, [id]);

  if (hidden !== false) return null;

  return (
    <div className={`tp-pop flex items-start gap-2.5 rounded-2xl bg-[#fff4d1] px-3.5 py-3 ring-1 ring-[#f1dd9a] ${className}`}>
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ffc93c] text-[#1b2431]">
        <Lightbulb size={14} strokeWidth={2.4} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-[1.45] text-[#5c4a10]">{text}</p>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem(PREFIX + id, "1");
            } catch {
              /* ignore */
            }
            setHidden(true);
          }}
          className="mt-1.5 text-[12px] font-extrabold text-[#9a6b00] active:opacity-60"
        >
          {lang === "ru" ? "Понятно" : "Verstanden"}
        </button>
      </div>
    </div>
  );
}