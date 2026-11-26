"use client";

import { useState } from "react";
import { Bug, Check, ChevronRight, HelpCircle, Lightbulb, Loader2, MessageSquare, X } from "lucide-react";

import TeensHint from "@/components/TeensHint";

type Lang = "de" | "ru";
type Kind = "idea" | "bug" | "question";

const TX = {
  de: {
    cardTitle: "Schreib uns",
    cardSub: "Eine Idee oder etwas klappt nicht? Sag es uns.",
    sheetTitle: "Nachricht an das Team",
    hint: "Schreib, was du dir in der App wünschst oder was nicht funktioniert. Wir lesen jede Nachricht.",
    kinds: {
      idea: ["Idee", "Das wünsche ich mir"],
      bug: ["Fehler", "Etwas klappt nicht"],
      question: ["Frage", "Ich verstehe etwas nicht"],
    },
    placeholder: "Schreib hier …",
    send: "Senden",
    sending: "Wird gesendet",
    thanks: "Danke!",
    thanksSub: "Wir haben deine Nachricht bekommen.",
    close: "Schließen",
    again: "Noch eine schreiben",
    errEmpty: "Schreib bitte ein paar Worte.",
    errRate: "Du hast schon ein paar Nachrichten geschickt. Versuch es später nochmal.",
    errOther: "Das hat nicht geklappt. Bitte versuche es nochmal.",
  },
  ru: {
    cardTitle: "Написать нам",
    cardSub: "Есть идея или что-то не работает? Расскажи.",
    sheetTitle: "Сообщение команде",
    hint: "Напиши, что ты хочешь видеть в приложении или что не работает. Мы читаем каждое сообщение.",
    kinds: {
      idea: ["Идея", "Хочу, чтобы было так"],
      bug: ["Ошибка", "Что-то не работает"],
      question: ["Вопрос", "Я чего-то не понял"],
    },
    placeholder: "Напиши здесь …",
    send: "Отправить",
    sending: "Отправляем",
    thanks: "Спасибо!",
    thanksSub: "Мы получили твоё сообщение.",
    close: "Закрыть",
    again: "Написать ещё",
    errEmpty: "Напиши хотя бы пару слов.",
    errRate: "Ты уже отправил несколько сообщений. Попробуй позже.",
    errOther: "Не получилось. Попробуй ещё раз.",
  },
} as const;

const ICONS = { idea: Lightbulb, bug: Bug, question: HelpCircle } as const;

export default function TeensFeedback({ lang }: { lang: Lang }) {
  const t = TX[lang];
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("idea");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setOpen(false);
    // после отправки следующее открытие начинается с чистого листа
    if (sent) {
      setSent(false);
      setText("");
    }
    setError("");
  }

  async function send() {
    if (text.trim().length < 3) {
      setError(t.errEmpty);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/t/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message: text }),
      });

      if (response.ok) {
        setSent(true);
      } else if (response.status === 429) {
        setError(t.errRate);
      } else if (response.status === 422) {
        setError(t.errEmpty);
      } else {
        setError(t.errOther);
      }
    } catch {
      setError(t.errOther);
    }

    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tp-up mt-4 flex w-full items-center gap-3 rounded-[22px] border border-[#e9e3d3] bg-white p-4 text-left active:scale-[0.99]"
        style={{ animationDelay: "160ms" }}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff4d1] text-[#9a6b00]">
          <MessageSquare size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold leading-tight">{t.cardTitle}</span>
          <span className="mt-0.5 block text-[12px] leading-4 text-[#8a8678]">{t.cardSub}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-[#c4b377]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 sm:items-center" onClick={close}>
          <div
            className="tp-drop max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] bg-[#faf8f3] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#1b2431] sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[19px] font-extrabold tracking-[-0.02em]">{t.sheetTitle}</h2>
              <button
                type="button"
                aria-label={t.close}
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-[#e9e3d3]"
              >
                <X size={17} />
              </button>
            </div>

            {sent ? (
              <div className="py-8 text-center">
                <span className="tp-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check size={32} strokeWidth={3} />
                </span>
                <p className="mt-4 text-[22px] font-extrabold">{t.thanks}</p>
                <p className="mt-1 text-[14px] text-[#8a8678]">{t.thanksSub}</p>
                <div className="mt-6 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setText("");
                    }}
                    className="h-12 w-full rounded-2xl border border-[#1b2431]/20 bg-white text-[15px] font-bold"
                  >
                    {t.again}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="h-12 w-full rounded-2xl bg-[#1b2431] text-[15px] font-extrabold text-[#ffc93c]"
                  >
                    {t.close}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <TeensHint id="feedback" lang={lang} text={t.hint} className="mt-4" />

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {(Object.keys(ICONS) as Kind[]).map((key) => {
                    const Icon = ICONS[key];
                    const [label, sub] = t.kinds[key];
                    const on = kind === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setKind(key)}
                        className={
                          "flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center transition active:scale-95 " +
                          (on ? "bg-[#1b2431] text-white" : "bg-white text-[#1b2431] ring-1 ring-[#e9e3d3]")
                        }
                      >
                        <span className={"flex h-9 w-9 items-center justify-center rounded-xl " + (on ? "bg-[#ffc93c] text-[#1b2431]" : "bg-[#fff4d1] text-[#9a6b00]")}>
                          <Icon size={18} />
                        </span>
                        <span className="text-[13px] font-extrabold leading-tight">{label}</span>
                        <span className={"text-[10.5px] leading-tight " + (on ? "text-white/65" : "text-[#8a8678]")}>{sub}</span>
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value.slice(0, 1500))}
                  rows={5}
                  placeholder={t.placeholder}
                  className="mt-4 w-full resize-none rounded-2xl border border-[#eadfb8] bg-white p-4 text-[16px] leading-6 outline-none transition focus:border-[#1b2431] focus:ring-[3px] focus:ring-[#ffc93c]/50"
                />

                {error && <p className="mt-2 text-[13px] font-semibold text-red-600">{error}</p>}

                <button
                  type="button"
                  disabled={busy}
                  onClick={send}
                  className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1b2431] text-[16px] font-extrabold text-[#ffc93c] shadow-[0_6px_16px_rgba(27,36,49,0.22)] active:scale-[0.99] disabled:opacity-50"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : t.send}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}