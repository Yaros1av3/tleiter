"use client";

import { useEffect, useState } from "react";
import { Check, Download, MoreVertical, PlusSquare, Share, Smartphone } from "lucide-react";

import { INSTALL_EVENT } from "@/components/InstallPromptCapture";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;

  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }

  if (/Android/.test(ua)) return "android";

  return "desktop";
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function InstallApp({ isRu }: { isRu: boolean }) {
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const sync = () => {
      const w = window as unknown as { __tlightInstallPrompt?: Event | null };
      setCanPrompt(Boolean(w.__tlightInstallPrompt));
      setInstalled(isStandalone());
    };

    setPlatform(detectPlatform());
    sync();
    setReady(true);

    if (new URLSearchParams(window.location.search).get("install") === "1") {
      setShowSteps(true);
      setTimeout(
        () =>
          document
            .getElementById("install-app")
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        250,
      );
    }

    window.addEventListener(INSTALL_EVENT, sync);
    return () => window.removeEventListener(INSTALL_EVENT, sync);
  }, []);

  async function install() {
    const w = window as unknown as { __tlightInstallPrompt?: InstallPromptEvent | null };
    const promptEvent = w.__tlightInstallPrompt;

    if (!promptEvent) {
      setShowSteps(true);
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;

    if (choice.outcome === "accepted") {
      w.__tlightInstallPrompt = null;
      setCanPrompt(false);
    }
  }

  if (!ready) return null;

  const t = (ru: string, de: string) => (isRu ? ru : de);

  const stepCls = "flex items-start gap-3 text-[13px] leading-5 text-[#374353]";
  const numCls =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f1f2f3] text-[12px] font-bold";

  return (
    <section id="install-app" className="mt-4 overflow-hidden rounded-[24px] border border-[#e6e7e8] bg-white p-5 shadow-[0_4px_18px_rgba(17,24,32,0.04)]">
      <div className="flex items-start gap-3.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
            installed ? "bg-emerald-600 text-white" : "bg-[#111820] text-white"
          }`}
        >
          {installed ? <Check size={19} /> : <Smartphone size={19} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-[#111820]">
            {t("Приложение на главный экран", "App auf dem Homescreen")}
          </p>

          {installed ? (
            <p className="mt-1 text-[13px] leading-5 text-[#8a939d]">
              {t(
                "TLight уже установлен и открыт как приложение.",
                "TLight ist installiert und läuft als App.",
              )}
            </p>
          ) : (
            <>
              <p className="mt-1 text-[13px] leading-5 text-[#8a939d]">
                {t(
                  "Иконка на экране телефона, запуск без адресной строки. На iPhone это нужно и для push-уведомлений.",
                  "Icon auf dem Homescreen, Start ohne Adressleiste. Auf dem iPhone ist das auch für Push-Nachrichten nötig.",
                )}
              </p>

              {platform !== "ios" && (
                <button
                  type="button"
                  onClick={install}
                  className="mt-3.5 flex items-center gap-2 rounded-[13px] bg-[#111820] px-4 py-2.5 text-[13px] font-bold text-white transition active:scale-[0.98]"
                >
                  <Download size={15} />
                  {t("Установить приложение", "App installieren")}
                </button>
              )}

              {platform === "ios" && (
                <button
                  type="button"
                  onClick={() => setShowSteps((v) => !v)}
                  className="mt-3.5 flex items-center gap-2 rounded-[13px] bg-[#111820] px-4 py-2.5 text-[13px] font-bold text-white transition active:scale-[0.98]"
                >
                  <PlusSquare size={15} />
                  {t("Как добавить на iPhone", "So geht's auf dem iPhone")}
                </button>
              )}

              {/* iPhone */}
              {platform === "ios" && showSteps && (
                <div className="mt-4 space-y-3 rounded-[16px] bg-[#f6f7f7] p-4">
                  <div className={stepCls}>
                    <span className={numCls}>1</span>
                    <span>
                      {t("Открой сайт в ", "Öffne die Seite in ")}
                      <b>Safari</b>
                      {t(
                        " (в других браузерах и во встроенных браузерах мессенджеров этого пункта может не быть).",
                        " (in anderen Browsern oder in Messenger-Browsern fehlt der Punkt manchmal).",
                      )}
                    </span>
                  </div>
                  <div className={stepCls}>
                    <span className={numCls}>2</span>
                    <span>
                      {t("Нажми кнопку ", "Tippe auf ")}
                      <Share size={14} className="mx-0.5 inline" />
                      <b>{t(" «Поделиться»", " „Teilen“")}</b>
                      {t(" внизу экрана.", " unten im Bildschirm.")}
                    </span>
                  </div>
                  <div className={stepCls}>
                    <span className={numCls}>3</span>
                    <span>
                      {t("Выбери ", "Wähle ")}
                      <b>{t("«На экран «Домой»»", "„Zum Home-Bildschirm“")}</b>
                      {t(" и нажми «Добавить».", " und tippe auf „Hinzufügen“.")}
                    </span>
                  </div>
                  <div className={stepCls}>
                    <span className={numCls}>4</span>
                    <span>
                      {t(
                        "Открой TLight с иконки на главном экране и включи уведомления в настройках.",
                        "Öffne TLight über das Icon auf dem Homescreen und aktiviere dort die Benachrichtigungen.",
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8a939d]">
                    {t(
                      "Push на iPhone работает с iOS 16.4 и новее.",
                      "Push auf dem iPhone funktioniert ab iOS 16.4.",
                    )}
                  </p>
                </div>
              )}

              {/* Android / компьютер, если системного окна нет */}
              {platform !== "ios" && showSteps && !canPrompt && (
                <div className="mt-4 space-y-3 rounded-[16px] bg-[#f6f7f7] p-4">
                  <div className={stepCls}>
                    <span className={numCls}>1</span>
                    <span>
                      {t("Открой меню браузера ", "Öffne das Browser-Menü ")}
                      <MoreVertical size={14} className="mx-0.5 inline" />
                      {t(" (три точки).", " (drei Punkte).")}
                    </span>
                  </div>
                  <div className={stepCls}>
                    <span className={numCls}>2</span>
                    <span>
                      {t("Выбери ", "Wähle ")}
                      <b>{t("«Установить приложение»", "„App installieren“")}</b>
                      {t(" или ", " oder ")}
                      <b>{t("«Добавить на главный экран»", "„Zum Startbildschirm hinzufügen“")}</b>.
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8a939d]">
                    {t(
                      "Если пункта нет, открой сайт в Chrome (не во встроенном браузере мессенджера).",
                      "Fehlt der Punkt, öffne die Seite in Chrome (nicht im Messenger-Browser).",
                    )}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}