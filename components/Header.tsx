"use client";

import { translations, type Language } from "@/lib/translations";

type HeaderProps = {
  language: Language;
  setLanguage: (language: Language) => void;
};

export default function Header({
  language,
  setLanguage,
}: HeaderProps) {
  const t = translations[language];

  return (
    <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-neutral-200 bg-white px-6">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-base font-bold text-white">
          T
        </div>

        <div className="leading-none">
          <div className="text-sm font-semibold tracking-tight text-neutral-900">
            {t.common.appName}
          </div>

          <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {t.common.teamWorkspace}
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="flex items-center rounded-full border border-neutral-200 bg-neutral-50 p-0.5">
        <button
          onClick={() => setLanguage("ru")}
          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
            language === "ru"
              ? "bg-neutral-900 text-white"
              : "text-neutral-400 hover:text-neutral-900"
          }`}
        >
          RU
        </button>

        <button
          onClick={() => setLanguage("de")}
          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
            language === "de"
              ? "bg-neutral-900 text-white"
              : "text-neutral-400 hover:text-neutral-900"
          }`}
        >
          DE
        </button>
      </div>
    </header>
  );
}