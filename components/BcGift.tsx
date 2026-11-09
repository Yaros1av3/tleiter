"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Gift, Loader2 } from "lucide-react";

type Lang = "de" | "ru";
type GiftRow = {
  status: "open" | "submitted" | "expired" | "given";
  expires_at: string;
  gift_link: string | null;
};

const T = {
  de: {
    openTitle: "Du hast dein Ziel erreicht!",
    openText: "Wähle dein Geschenk und schicke uns den Link.",
    rule: "Du hast eine Woche Zeit. Es sind nur Geschenke von Amazon möglich. Andere Shops, auch Goodshine, nehmen wir leider nicht mehr an.",
    left: "Noch",
    days: "Tage",
    hours: "Std.",
    placeholder: "Amazon-Link einfügen",
    send: "Link abschicken",
    submittedTitle: "Danke, dein Link ist angekommen",
    submittedText: "Die Leiter kümmern sich um dein Geschenk.",
    expiredTitle: "Deine Zeit ist abgelaufen",
    expiredText: "Deine Zeit für die Geschenkwahl ist leider vorbei. Schreib bitte deinem Leiter.",
    givenTitle: "Geschenk übergeben",
    givenText: "Viel Freude damit!",
    errors: {
      empty: "Füge bitte den Link ein.",
      not_amazon: "Das ist kein Amazon-Link. Es sind nur Geschenke von Amazon möglich.",
      closed: "Das Fenster ist schon geschlossen.",
      other: "Etwas ist schiefgelaufen. Bitte nochmal versuchen.",
    },
  },
  ru: {
    openTitle: "Ты достиг цели!",
    openText: "Выбери подарок и пришли нам ссылку.",
    rule: "У тебя есть неделя. Подходят только подарки с Amazon. Другие магазины, в том числе Goodshine, мы, к сожалению, больше не принимаем.",
    left: "Осталось",
    days: "дн.",
    hours: "ч.",
    placeholder: "Вставь ссылку с Amazon",
    send: "Отправить ссылку",
    submittedTitle: "Спасибо, ссылка получена",
    submittedText: "Служители позаботятся о твоём подарке.",
    expiredTitle: "Время вышло",
    expiredText: "Твоё время на выбор подарка истекло. Напиши, пожалуйста, своему лидеру.",
    givenTitle: "Подарок передан",
    givenText: "Пусть он принесёт радость!",
    errors: {
      empty: "Вставь ссылку.",
      not_amazon: "Это не ссылка Amazon. Подходят только подарки с Amazon.",
      closed: "Окно уже закрыто.",
      other: "Что-то пошло не так. Попробуй ещё раз.",
    },
  },
} as const;

export default function BcGift({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [gift, setGift] = useState<GiftRow | null>(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bc/gift", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setGift(d.gift ?? null);
    } catch {}
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/bc/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) await load();
      else setErr(d.error ?? "other");
    } catch {
      setErr("other");
    }
    setBusy(false);
  };

  if (!gift) return null;
  const errs = t.errors as Record<string, string>;

  if (gift.status === "open") {
    const ms = Math.max(0, new Date(gift.expires_at).getTime() - Date.now());
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    return (
      <div className="mt-3 rounded-[26px] bg-[#ffc93c] p-5 text-[#1b2431]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1b2431] text-[#ffc93c]">
            <Gift className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[17px] font-extrabold leading-tight">{t.openTitle}</p>
            <p className="text-[13px] font-medium">{t.openText}</p>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-white/60 px-3.5 py-2.5 text-[13px] font-semibold leading-snug">
          {t.rule}
        </p>
        <p className="mt-2 text-[12px] font-bold">
          {t.left}: {d} {t.days} {h} {t.hours}
        </p>
        <input
          className="mt-3 h-[52px] w-full rounded-2xl border border-[#1b2431]/15 bg-white px-4 text-[16px] outline-none focus:border-[#1b2431]"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder={t.placeholder}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
        />
        {err && (
          <p className="mt-2 rounded-xl bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#9a6b00]">
            {errs[err] ?? errs.other}
          </p>
        )}
        <button
          type="button"
          onClick={send}
          disabled={busy || !link.trim()}
          className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1b2431] text-[16px] font-extrabold text-[#ffc93c] transition active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t.send}
        </button>
      </div>
    );
  }

  const base = "mt-3 flex items-start gap-3 rounded-[22px] border p-4";
  if (gift.status === "expired") {
    return (
      <div className={`${base} border-[#eadfb8] bg-[#fff4d1]`}>
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9a6b00]" />
        <div>
          <p className="text-[15px] font-extrabold text-[#9a6b00]">{t.expiredTitle}</p>
          <p className="mt-0.5 text-[13px]">{t.expiredText}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} border-[#e9e3d3] bg-white`}>
      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#9a6b00]" />
      <div>
        <p className="text-[15px] font-extrabold">
          {gift.status === "given" ? t.givenTitle : t.submittedTitle}
        </p>
        <p className="mt-0.5 text-[13px] text-[#8a8678]">
          {gift.status === "given" ? t.givenText : t.submittedText}
        </p>
      </div>
    </div>
  );
}