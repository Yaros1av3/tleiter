"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { UPDATES, type UpdateEntry } from "@/lib/updates";

const SEEN_KEY = "tlight-updates-seen";
const MAX_SHOWN = 3;

/*
 * Окошко «Что нового» на главной. Показывает обновления, которых человек ещё не видел,
 * один раз. Что именно показывать — см. lib/updates.ts.
 */
export default function WhatsNew({ isRu }: { isRu: boolean }) {
  const [fresh, setFresh] = useState<UpdateEntry[]>([]);

  useEffect(() => {
    let seen = "";
    try {
      seen = localStorage.getItem(SEEN_KEY) ?? "";
    } catch {
      /* без хранилища окошко покажется при каждом заходе, это нестрашно */
    }
    setFresh(UPDATES.filter((u) => u.id > seen).slice(0, MAX_SHOWN));
  }, []);

  if (fresh.length === 0) return null;

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, UPDATES[0].id);
    } catch {
      /* ignore */
    }
    setFresh([]);
  }

  const lang = isRu ? "ru" : "de";
  const dateLabel = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(isRu ? "ru-RU" : "de-DE", { day: "numeric", month: "long" });

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-[460px] flex-col rounded-t-[28px] bg-white shadow-xl sm:rounded-[28px]"
      >
        <div className="flex items-center gap-3 px-5 pb-2 pt-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <h2 className="text-[20px] font-extrabold tracking-[-0.01em]">{isRu ? "Что нового" : "Was ist neu"}</h2>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-3">
          {fresh.map((u) => (
            <section key={u.id}>
              <p className="text-[12px] font-semibold text-neutral-500">{dateLabel(u.date)}</p>
              <h3 className="mt-0.5 text-[16px] font-extrabold leading-snug">{u.title[lang]}</h3>
              <div className="mt-2.5 space-y-3">
                {u.items.map((item, i) => (
                  <div key={i} className="rounded-2xl bg-neutral-50 p-3.5">
                    <p className="flex items-center gap-2 text-[15px] font-extrabold leading-snug">
                      {item.title[lang]}
                      {item.soon && (
                        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">
                          {isRu ? "скоро" : "bald"}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-[13.5px] leading-snug text-neutral-600">{item.text[lang]}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={close}
            className="h-12 w-full rounded-full bg-neutral-900 text-[15px] font-bold text-white active:scale-[0.98]"
          >
            {isRu ? "Понятно" : "Verstanden"}
          </button>
        </div>
      </div>
    </div>
  );
}