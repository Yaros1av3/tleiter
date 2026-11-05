"use client";

import { useState } from "react";
import { Download, MoreVertical, Plus, Share, X } from "lucide-react";

type Lang = "de" | "ru";

const TEXT = {
  de: {
    title: "App auf dem Handy installieren",
    sub: "Dann öffnet sich TLight Teens wie eine normale App und du bekommst Benachrichtigungen.",
    iphone: "iPhone",
    android: "Android",
    install: "Jetzt installieren",
    close: "Schließen",
    ios: [
      "Öffne diese Seite in Safari. Falls sie in WhatsApp oder Telegram aufgeht, tippe auf „In Safari öffnen“.",
      "Tippe unten auf das Teilen-Symbol (Quadrat mit Pfeil nach oben).",
      "Scrolle nach unten und wähle „Zum Home-Bildschirm“.",
      "Tippe oben rechts auf „Hinzufügen“.",
      "Öffne TLight Teens jetzt vom Home-Bildschirm und schalte die Benachrichtigungen ein.",
    ],
    android_steps: [
      "Öffne diese Seite in Chrome.",
      "Tippe oben rechts auf das Menü (drei Punkte).",
      "Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.",
      "Bestätige mit „Installieren“.",
      "Öffne TLight Teens vom Startbildschirm und schalte die Benachrichtigungen ein.",
    ],
  },
  ru: {
    title: "Установить приложение на телефон",
    sub: "Тогда TLight Teens будет открываться как обычное приложение и присылать уведомления.",
    iphone: "iPhone",
    android: "Android",
    install: "Установить сейчас",
    close: "Закрыть",
    ios: [
      "Открой эту страницу в Safari. Если она открылась внутри WhatsApp или Telegram, нажми «Открыть в Safari».",
      "Внизу нажми значок «Поделиться» (квадрат со стрелкой вверх).",
      "Прокрути вниз и выбери «На экран “Домой”».",
      "Справа вверху нажми «Добавить».",
      "Теперь открой TLight Teens с главного экрана и включи уведомления.",
    ],
    android_steps: [
      "Открой эту страницу в Chrome.",
      "Справа вверху нажми на меню (три точки).",
      "Выбери «Установить приложение» или «Добавить на главный экран».",
      "Подтверди кнопкой «Установить».",
      "Открой TLight Teens с главного экрана и включи уведомления.",
    ],
  },
} as const;

export default function TeensInstall({
  lang,
  canPrompt,
  onPrompt,
  onClose,
}: {
  lang: Lang;
  canPrompt: boolean;
  onPrompt: () => void;
  onClose: () => void;
}) {
  const t = TEXT[lang];

  const [tab, setTab] = useState<"ios" | "android">(() =>
    typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) ? "ios" : "android",
  );

  const steps = tab === "ios" ? t.ios : t.android_steps;
  const icons =
    tab === "ios"
      ? [Share, Share, Plus, Plus, Download]
      : [Download, MoreVertical, Plus, Download, Download];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#1b2431]/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] bg-[#faf8f3] p-5 pb-8 text-[#1b2431] sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[21px] font-extrabold leading-tight tracking-[-0.02em]">{t.title}</h2>
            <p className="mt-1 text-[13px] leading-5 text-[#8a8678]">{t.sub}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#e9e3d3]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-white p-1 ring-1 ring-[#e9e3d3]">
          {(["ios", "android"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`h-9 rounded-full text-[13px] font-bold transition ${
                tab === key ? "bg-[#1b2431] text-[#ffc93c]" : "text-[#8a8678]"
              }`}
            >
              {key === "ios" ? t.iphone : t.android}
            </button>
          ))}
        </div>

        {tab === "android" && canPrompt && (
          <button
            type="button"
            onClick={onPrompt}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffc93c] text-[15px] font-extrabold text-[#1b2431] active:scale-[0.99]"
          >
            <Download size={17} />
            {t.install}
          </button>
        )}

        <ol className="mt-4 space-y-2.5">
          {steps.map((step, index) => {
            const Icon = icons[index];

            return (
              <li key={step} className="flex items-start gap-3 rounded-2xl border border-[#e9e3d3] bg-white p-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1b2431] text-[13px] font-extrabold text-[#ffc93c]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 pt-1 text-[14px] font-semibold leading-5">{step}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fff4d1] text-[#9a6b00]">
                  <Icon size={16} />
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}