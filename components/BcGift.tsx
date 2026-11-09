"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Gift, Loader2 } from "lucide-react";

type Lang = "de" | "ru";
type GiftRow = {
  status: "open" | "submitted" | "expired" | "given";
  expires_at: string;
  gift_link: string | null;
};

const T = {
  de: {
    openTitle: "Dein Geschenk wartet",
    left: "Noch",
    days: "Tg.",
    hours: "Std.",
    openText: "Ziel erreicht! Wähle dein Geschenk und schicke uns den Link.",
    rule: "Du hast eine Woche Zeit. Es sind nur Geschenke von Amazon möglich. Andere Shops, auch Goodshine, nehmen wir leider nicht mehr an.",
    placeholder: "Amazon-Link einfügen",
    send: "Link abschicken",
    submitted: "Link abgeschickt. Die Leiter kümmern sich.",
    expiredTitle: "Zeit abgelaufen",
    expiredText: "Deine Zeit für die Geschenkwahl ist vorbei. Schreib bitte deinem Leiter.",
    given: "Geschenk übergeben",
    errors: {
      empty: "Füge bitte den Link ein.",
      not_amazon: "Das ist kein Amazon-Link. Es sind nur Geschenke von Amazon möglich.",
      closed: "Das Fenster ist schon geschlossen.",
      other: "Etwas ist schiefgelaufen. Bitte nochmal versuchen.",
    },
  },
  ru: {
    openTitle: "Твой подарок ждёт",
    left: "Осталось",
    days: "дн.",
    hours: "ч.",
    openText: "Цель достигнута! Выбери подарок и пришли нам ссылку.",
    rule: "У тебя есть неделя. Подходят только подарки с Amazon. Другие магазины, в том числе Goodshine, мы, к сожалению, больше не принимаем.",
    placeholder: "Вставь ссылку с Amazon",
    send: "Отправить ссылку",
    submitted: "Ссылка отправлена. Служители позаботятся о подарке.",
    expiredTitle: "Время вышло",
    expiredText: "Твоё время на выбор подарка истекло. Напиши, пожалуйста, своему лидеру.",
    given: "Подарок передан",
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
  const [expanded, setExpanded] = useState(false);
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
      if (res.ok) {
        setExpanded(false);
        await load();
      } else setErr(d.error ?? "other");
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
      <div className="overflow-hidden rounded-2xl bg-[#ffc93c] text-[#1b2431]">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 p-3 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b2431] text-[#ffc93c]">
            <Gift className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-extrabold leading-tight">{t.openTitle}</span>
            <span className="block text-[12px] font-semibold opacity-75">
              {t.left}: {d} {t.days} {h} {t.hours}
            </span>
          </span>
          <ChevronDown className={`h-5 w-5 shrink-0 transition ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <div className="space-y-2.5 px-3 pb-3">
            <p className="text-[13px] font-semibold">{t.openText}</p>
            <p className="rounded-xl bg-white/60 px-3 py-2 text-[12px] font-medium leading-snug">{t.rule}</p>
            <input
              className="h-11 w-full rounded-xl border border-[#1b2431]/15 bg-white px-3.5 text-[15px] outline-none focus:border-[#1b2431]"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={t.placeholder}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
            />
            {err && (
              <p className="rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-[#9a6b00]">
                {errs[err] ?? errs.other}
              </p>
            )}
            <button
              type="button"
              onClick={send}
              disabled={busy || !link.trim()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1b2431] text-[15px] font-extrabold text-[#ffc93c] active:scale-[0.99] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t.send}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (gift.status === "expired") {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-[#eadfb8] bg-[#fff4d1] p-3">
        <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#9a6b00]" />
        <div>
          <p className="text-[14px] font-extrabold text-[#9a6b00]">{t.expiredTitle}</p>
          <p className="text-[12px]">{t.expiredText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-[#e9e3d3] bg-white p-3">
      <Check className="h-[18px] w-[18px] shrink-0 text-[#9a6b00]" />
      <p className="text-[13px] font-semibold">{gift.status === "given" ? t.given : t.submitted}</p>
    </div>
  );
}