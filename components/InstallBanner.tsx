"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, X } from "lucide-react";

const DISMISS_KEY = "tlight-install-banner-dismissed";

/*
 * Плашка на главной: только для iPhone/iPad, когда сайт открыт в браузере
 * (не установлен как приложение). Закрывается крестиком и больше не возвращается.
 */
export default function InstallBanner({ isRu }: { isRu: boolean }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    let dismissed = false;

    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* без хранилища просто показываем плашку */
    }

    setVisible(isIos && !standalone && !dismissed);
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ничего страшного */
    }

    setVisible(false);
  }

  return (
    <div className="mt-5 flex items-center gap-3 rounded-[20px] border border-[#e6e7e8] bg-white px-4 py-3.5 shadow-[0_4px_18px_rgba(17,24,32,0.04)]">
      <button
        type="button"
        onClick={() => router.push("/settings?install=1")}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#111820] text-white">
          <Smartphone size={19} />
        </span>

        <span className="min-w-0">
          <span className="block text-[14px] font-bold text-[#111820]">
            {isRu ? "Добавь TLight на главный экран" : "TLight auf den Homescreen"}
          </span>
          <span className="mt-0.5 block text-[12px] leading-4 text-[#8a939d]">
            {isRu
              ? "Быстрый запуск и уведомления на iPhone. Нажми, чтобы посмотреть как."
              : "Schneller Start und Benachrichtigungen. Tippe für die Anleitung."}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-full p-1.5 text-[#8a939d] hover:bg-[#f1f2f3]"
        aria-label={isRu ? "Закрыть" : "Schließen"}
      >
        <X size={17} />
      </button>
    </div>
  );
}