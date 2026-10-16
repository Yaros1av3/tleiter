"use client";

import Link from "next/link";
import { House } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function NotFound() {
  const { language } = useLanguage();
  const isRu = language === "ru";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f6] px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-6xl font-bold tracking-tight text-[#111820]">
          404
        </p>

        <h1 className="mt-3 text-xl font-semibold text-[#111820]">
          {isRu ? "Страница не найдена" : "Seite nicht gefunden"}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {isRu
            ? "Возможно, ссылка устарела или страница была удалена."
            : "Der Link ist möglicherweise veraltet oder die Seite wurde entfernt."}
        </p>

        <Link
          href="/"
          className="mt-6 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#111820] text-sm font-semibold text-white transition hover:bg-[#1c2733]"
        >
          <House size={16} />
          {isRu ? "На главную" : "Zur Startseite"}
        </Link>
      </div>
    </main>
  );
}