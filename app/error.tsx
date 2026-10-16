"use client";

import { useEffect } from "react";
import { RefreshCw, House } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { language } = useLanguage();
  const isRu = language === "ru";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f6] px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111820] text-xl font-bold text-white">
          !
        </div>

        <h1 className="text-xl font-semibold text-[#111820]">
          {isRu ? "Что-то пошло не так" : "Etwas ist schiefgelaufen"}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {isRu
            ? "Страница не загрузилась. Ваши данные в безопасности — попробуйте обновить."
            : "Die Seite konnte nicht geladen werden. Deine Daten sind sicher – bitte versuche es erneut."}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#111820] text-sm font-semibold text-white transition hover:bg-[#1c2733]"
          >
            <RefreshCw size={16} />
            {isRu ? "Обновить" : "Neu laden"}
          </button>

          <a
            href="/"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#e0e3e6] bg-white text-sm font-semibold text-[#111820] transition hover:bg-neutral-50"
          >
            <House size={16} />
            {isRu ? "На главную" : "Zur Startseite"}
          </a>
        </div>
      </div>
    </main>
  );
}