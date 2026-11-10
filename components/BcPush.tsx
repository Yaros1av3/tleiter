"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";

type Lang = "de" | "ru";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

const TX = {
  de: {
    title: "Wöchentliche Erinnerung",
    sub: "Einmal pro Woche eine Nachricht mit deiner Serie",
    on: "Eingeschaltet",
    enable: "Einschalten",
    disable: "Ausschalten",
    denied: "Benachrichtigungen sind im Browser blockiert. Erlaube sie in den Einstellungen.",
    ios: "Auf dem iPhone zuerst die App zum Home-Bildschirm hinzufügen und von dort öffnen.",
    error: "Es hat nicht geklappt. Versuche es später noch einmal.",
  },
  ru: {
    title: "Напоминание раз в неделю",
    sub: "Раз в неделю сообщение с твоей серией дней",
    on: "Включено",
    enable: "Включить",
    disable: "Выключить",
    denied: "Уведомления заблокированы в браузере. Разреши их в настройках.",
    ios: "На iPhone сначала добавь приложение на экран «Домой» и открой его оттуда.",
    error: "Не получилось. Попробуй позже.",
  },
} as const;

function key(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function BcPush({ lang }: { lang: Lang }) {
  const t = TX[lang];
  const [supported, setSupported] = useState<boolean | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((r) => r.pushManager.getSubscription())
      .then(async (sub) => {
        if (!sub) return;
        const res = await fetch("/api/bc/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check: true, endpoint: sub.endpoint }),
        });
        const d = await res.json().catch(() => ({}));
        setOn(Boolean(d.linked));
      })
      .catch(() => {});
  }, []);

  const enable = async () => {
    setBusy(true);
    setMsg("");
    try {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = (navigator as unknown as { standalone?: boolean }).standalone;
      if (isIos && !standalone) {
        setMsg(t.ios);
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg(t.denied);
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(VAPID) });
      const res = await fetch("/api/bc/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), lang }),
      });
      if (!res.ok) throw new Error("x");
      setOn(true);
    } catch {
      setMsg(t.error);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/bc/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unlink: true, endpoint: sub.endpoint }),
        });
      }
      setOn(false);
    } catch {
      setMsg(t.error);
    } finally {
      setBusy(false);
    }
  };

  if (!supported || !VAPID) return null;

  return (
    <div className="rounded-2xl border border-[#e9e3d3] bg-white p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4d1] text-[#9a6b00]">
          {on ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold leading-tight">{t.title}</span>
          <span className="block text-[11px] text-[#8a8678]">{on ? t.on : t.sub}</span>
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={on ? disable : enable}
          className={`flex h-9 shrink-0 items-center rounded-full px-4 text-[12px] font-bold active:scale-95 disabled:opacity-60 ${
            on ? "bg-[#f1ede1] text-[#1b2431]" : "bg-[#1b2431] text-[#ffc93c]"
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : on ? t.disable : t.enable}
        </button>
      </div>
      {msg && <p className="mt-2 text-[12px] text-[#a0453a]">{msg}</p>}
    </div>
  );
}