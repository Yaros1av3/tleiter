"use client";

import { useState } from "react";
import { ChevronDown, Download, MoreVertical, Plus, Share, X } from "lucide-react";

type Lang = "de" | "ru";
type Platform = "ios" | "android";

type Step = { title: string; text: string; mock?: "safariBar" | "shareSheet" | "chromeMenu" | "androidMenu" };

const TEXT = {
  de: {
    title: "App auf den Startbildschirm",
    sub: "Dann öffnet sich TLight Teens mit einem Tipp, wie eine normale App. Das dauert eine Minute.",
    iphone: "iPhone",
    android: "Android",
    install: "Jetzt installieren",
    close: "Schließen",
    gain: "Was du davon hast",
    gains: ["Eine Taste auf dem Startbildschirm", "Kein Einloggen jedes Mal", "Benachrichtigungen vor dem Unterricht"],
    stepWord: "Schritt",
    helpTitle: "Klappt nicht?",
    help: [
      "Du siehst „Zum Home-Bildschirm“ nicht? Dann bist du nicht in Safari. Öffne die Seite in Safari (blauer Kompass).",
      "Du siehst „App installieren“ nicht? Dann bist du nicht in Chrome. Kopiere den Link und öffne ihn in Chrome.",
      "Samsung Internet: Menü (drei Striche) → „Zum Startbildschirm hinzufügen“.",
      "Immer noch nicht? Zeig dein Handy einem Mitarbeiter, wir helfen dir.",
    ],
    done: "Fertig! Öffne die App ab jetzt immer über das neue Symbol.",
    ios: [
      {
        title: "Öffne die Seite in Safari",
        text: "Safari ist der blaue Kompass auf deinem iPhone. Öffnet sich der Link in WhatsApp, Instagram oder Chrome, tippe auf „In Safari öffnen“ oder kopiere den Link und füge ihn in Safari ein.",
      },
      {
        title: "Tippe auf „Teilen“",
        text: "Das ist das Quadrat mit dem Pfeil nach oben, unten in der Mitte. Wenn du es nicht siehst, tippe auf die drei Punkte unten rechts.",
        mock: "safariBar" as const,
      },
      {
        title: "Wähle „Zum Home-Bildschirm“",
        text: "Ein Menü fährt hoch. Wische es nach oben und suche die Zeile „Zum Home-Bildschirm“ mit dem Plus-Symbol.",
        mock: "shareSheet" as const,
      },
      {
        title: "Tippe auf „Hinzufügen“",
        text: "Oben rechts. Der Name „TLight Teens“ kann so bleiben.",
      },
      {
        title: "Öffne die App vom Startbildschirm",
        text: "Schließe Safari und suche das neue Symbol auf deinem Startbildschirm. Starte die App ab jetzt immer von dort. Nur so funktionieren die Benachrichtigungen.",
      },
    ] as Step[],
    android_steps: [
      {
        title: "Öffne die Seite in Chrome",
        text: "Chrome ist der bunte Kreis. Öffnet sich der Link in WhatsApp oder Instagram, tippe auf die drei Punkte und wähle „Im Browser öffnen“.",
      },
      {
        title: "Tippe auf die drei Punkte",
        text: "Oben rechts neben der Adresse.",
        mock: "chromeMenu" as const,
      },
      {
        title: "Wähle „App installieren“",
        text: "Manchmal heißt es „Zum Startbildschirm hinzufügen“. Beides ist richtig.",
        mock: "androidMenu" as const,
      },
      {
        title: "Bestätige mit „Installieren“",
        text: "Es kommt ein kleines Fenster. Tippe auf „Installieren“ oder „Hinzufügen“. Wenn es noch einmal fragt, bestätige auch das.",
      },
      {
        title: "Öffne die App vom Startbildschirm",
        text: "Das Symbol ist auf dem Startbildschirm oder in der Liste aller Apps. Starte die App ab jetzt immer von dort.",
      },
    ] as Step[],
  },
  ru: {
    title: "Приложение на главный экран",
    sub: "Тогда TLight Teens будет открываться одним касанием, как обычное приложение. Это займёт минуту.",
    iphone: "iPhone",
    android: "Android",
    install: "Установить сейчас",
    close: "Закрыть",
    gain: "Что ты получишь",
    gains: ["Кнопка на главном экране", "Не нужно входить каждый раз", "Напоминания перед уроком"],
    stepWord: "Шаг",
    helpTitle: "Не получается?",
    help: [
      "Не видишь пункт «На экран “Домой”»? Значит, ты не в Safari. Открой страницу в Safari (синий компас).",
      "Не видишь «Установить приложение»? Значит, ты не в Chrome. Скопируй ссылку и открой её в Chrome.",
      "Samsung Internet: меню (три полоски) → «Добавить на главный экран».",
      "Всё равно не выходит? Покажи телефон служителю, мы поможем.",
    ],
    done: "Готово! Теперь всегда открывай приложение через новый значок.",
    ios: [
      {
        title: "Открой страницу в Safari",
        text: "Safari это синий компас на твоём iPhone. Если ссылка открылась в WhatsApp, Instagram или Chrome, нажми «Открыть в Safari» или скопируй ссылку и вставь её в Safari.",
      },
      {
        title: "Нажми «Поделиться»",
        text: "Это квадрат со стрелкой вверх, внизу посередине. Если его не видно, нажми на три точки внизу справа.",
        mock: "safariBar" as const,
      },
      {
        title: "Выбери «На экран “Домой”»",
        text: "Выедет меню. Прокрути его вверх и найди строку «На экран “Домой”» с плюсом.",
        mock: "shareSheet" as const,
      },
      {
        title: "Нажми «Добавить»",
        text: "Справа вверху. Название «TLight Teens» можно оставить как есть.",
      },
      {
        title: "Открой приложение с главного экрана",
        text: "Закрой Safari и найди новый значок на главном экране. Теперь всегда запускай приложение оттуда. Только так работают уведомления.",
      },
    ] as Step[],
    android_steps: [
      {
        title: "Открой страницу в Chrome",
        text: "Chrome это разноцветный круг. Если ссылка открылась в WhatsApp или Instagram, нажми на три точки и выбери «Открыть в браузере».",
      },
      {
        title: "Нажми на три точки",
        text: "Справа вверху, рядом с адресом.",
        mock: "chromeMenu" as const,
      },
      {
        title: "Выбери «Установить приложение»",
        text: "Иногда пункт называется «Добавить на главный экран». Подходят оба.",
        mock: "androidMenu" as const,
      },
      {
        title: "Подтверди «Установить»",
        text: "Появится маленькое окно. Нажми «Установить» или «Добавить». Если спросит ещё раз, подтверди и это.",
      },
      {
        title: "Открой приложение с главного экрана",
        text: "Значок появится на главном экране или в списке всех приложений. Теперь всегда запускай приложение оттуда.",
      },
    ] as Step[],
  },
} as const;

/* маленькие картинки-подсказки: где именно нажимать */
function Mock({ kind, lang }: { kind: NonNullable<Step["mock"]>; lang: Lang }) {
  const ring = "tp-ring rounded-lg ring-2 ring-[#ff7a2f]";

  if (kind === "safariBar") {
    return (
      <div className="mt-3 rounded-2xl bg-[#eef0f3] p-3">
        <div className="mx-auto flex max-w-[260px] items-center justify-between rounded-xl bg-white px-4 py-2.5 text-[#6b7280] shadow-sm">
          <span className="text-lg leading-none">‹</span>
          <span className="text-lg leading-none">›</span>
          <span className={`flex h-8 w-8 items-center justify-center bg-[#fff4d1] text-[#1b2431] ${ring}`}>
            <Share size={17} />
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded border border-[#9ca3af] text-[10px]">1</span>
          <MoreVertical size={16} className="rotate-90" />
        </div>
      </div>
    );
  }

  if (kind === "shareSheet") {
    return (
      <div className="mt-3 rounded-2xl bg-[#eef0f3] p-3">
        <div className="mx-auto max-w-[260px] space-y-1.5">
          <div className="rounded-lg bg-white px-3 py-2 text-[12px] text-[#9ca3af]">{lang === "ru" ? "Скопировать" : "Kopieren"}</div>
          <div className={`flex items-center justify-between bg-white px-3 py-2 text-[12px] font-bold text-[#1b2431] ${ring}`}>
            {lang === "ru" ? "На экран «Домой»" : "Zum Home-Bildschirm"}
            <span className="flex h-5 w-5 items-center justify-center rounded border border-[#1b2431]">
              <Plus size={13} />
            </span>
          </div>
          <div className="rounded-lg bg-white px-3 py-2 text-[12px] text-[#9ca3af]">{lang === "ru" ? "Добавить закладку" : "Lesezeichen"}</div>
        </div>
      </div>
    );
  }

  if (kind === "chromeMenu") {
    return (
      <div className="mt-3 rounded-2xl bg-[#eef0f3] p-3">
        <div className="mx-auto flex max-w-[260px] items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
          <span className="flex-1 truncate rounded-full bg-[#f3f4f6] px-3 py-1 text-[11px] text-[#9ca3af]">tlight…/t</span>
          <span className={`flex h-8 w-8 items-center justify-center bg-[#fff4d1] text-[#1b2431] ${ring}`}>
            <MoreVertical size={17} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl bg-[#eef0f3] p-3">
      <div className="mx-auto max-w-[260px] space-y-1.5">
        <div className="rounded-lg bg-white px-3 py-2 text-[12px] text-[#9ca3af]">{lang === "ru" ? "Новая вкладка" : "Neuer Tab"}</div>
        <div className={`flex items-center justify-between bg-white px-3 py-2 text-[12px] font-bold text-[#1b2431] ${ring}`}>
          {lang === "ru" ? "Установить приложение" : "App installieren"}
          <Download size={14} />
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-[12px] text-[#9ca3af]">{lang === "ru" ? "Поделиться…" : "Teilen …"}</div>
      </div>
    </div>
  );
}

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

  const [platform, setPlatform] = useState<Platform>(() =>
    typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) ? "ios" : "android",
  );
  const [helpOpen, setHelpOpen] = useState(false);

  const steps = platform === "ios" ? t.ios : t.android_steps;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[#1b2431]/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] bg-[#faf8f3] p-5 pb-8 text-[#1b2431] sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">{t.title}</h2>
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

        <div className="mt-4 rounded-2xl bg-[#fff4d1] p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a6b00]">{t.gain}</p>
          <ul className="mt-1.5 space-y-1">
            {t.gains.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[13px] font-semibold text-[#5c4a10]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffc93c]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-white p-1 ring-1 ring-[#e9e3d3]">
          {(["ios", "android"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPlatform(key)}
              className={`h-10 rounded-full text-[14px] font-bold transition ${
                platform === key ? "bg-[#1b2431] text-[#ffc93c]" : "text-[#8a8678]"
              }`}
            >
              {key === "ios" ? t.iphone : t.android}
            </button>
          ))}
        </div>

        {platform === "android" && canPrompt && (
          <button
            type="button"
            onClick={onPrompt}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffc93c] text-[15px] font-extrabold text-[#1b2431] active:scale-[0.99]"
          >
            <Download size={17} />
            {t.install}
          </button>
        )}

        <ol className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-[#e9e3d3] bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1b2431] text-[13px] font-extrabold text-[#ffc93c]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold leading-snug">{step.title}</p>
                  <p className="mt-1 text-[13px] leading-[1.5] text-[#5c5a50]">{step.text}</p>
                </div>
              </div>
              {step.mock && <Mock kind={step.mock} lang={lang} />}
            </li>
          ))}
        </ol>

        <p className="mt-4 rounded-2xl bg-emerald-50 p-3.5 text-[13px] font-semibold leading-5 text-emerald-800">{t.done}</p>

        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-[#e9e3d3] bg-white px-4 py-3.5 text-left text-[14px] font-extrabold"
        >
          {t.helpTitle}
          <ChevronDown size={18} className={"text-[#9a9585] transition-transform " + (helpOpen ? "rotate-180" : "")} />
        </button>

        {helpOpen && (
          <ul className="mt-2 space-y-2">
            {t.help.map((item) => (
              <li key={item} className="rounded-xl bg-white px-4 py-3 text-[13px] leading-5 text-[#5c5a50] ring-1 ring-[#e9e3d3]">
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}