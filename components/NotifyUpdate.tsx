"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";

const SUPER_ADMIN_EMAIL = "yargalaychuk@gmail.com";

type Info = {
  id: string | null;
  title: { ru: string; de: string } | null;
  alreadySent: boolean;
  subscribers: number;
};

/* Кнопка для супер-админа: разослать всем служителям push о последнем обновлении (lib/updates.ts) */
export default function NotifyUpdate({ isRu }: { isRu: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if ((session?.user.email ?? "").toLowerCase() !== SUPER_ADMIN_EMAIL) return;
      setToken(session!.access_token);
      const res = await fetch("/api/admin/notify-update", {
        headers: { Authorization: `Bearer ${session!.access_token}` },
        cache: "no-store",
      });
      if (res.ok) setInfo(await res.json());
    });
  }, []);

  if (!token || !info || !info.id) return null;

  async function send() {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/notify-update", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error("x");
      setResult(isRu ? `Отправлено: ${d.sent}` : `Gesendet: ${d.sent}`);
      setInfo((v) => (v ? { ...v, alreadySent: true } : v));
    } catch {
      setResult(isRu ? "Не получилось отправить." : "Senden fehlgeschlagen.");
    }
    setBusy(false);
    setConfirming(false);
  }

  const title = isRu ? info.title?.ru : info.title?.de;

  return (
    <section className="mt-4 overflow-hidden rounded-[24px] border border-[#e9e3d3] bg-white p-5 shadow-[0_4px_18px_rgba(27,36,49,0.04)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4d1] text-[#9a6b00]">
          <BellRing className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[#2a2a26]">
            {isRu ? "Уведомить об обновлении" : "Über Update informieren"}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-[#7f796a]">
            {isRu ? "Последнее обновление" : "Letztes Update"}: {title}
            {" · "}
            {info.alreadySent
              ? isRu ? "уже отправлялось" : "bereits gesendet"
              : isRu ? "ещё не отправлялось" : "noch nicht gesendet"}
            {" · "}
            {isRu ? "подписчиков" : "Abonnenten"}: {info.subscribers}
          </p>
        </div>
      </div>

      {confirming ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={send}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#1b2431] text-[14px] font-bold text-[#ffc93c] active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isRu ? "Да, отправить всем" : "Ja, an alle senden"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className="h-11 rounded-full bg-[#f1ede1] px-5 text-[14px] font-semibold text-[#1b2431]"
          >
            {isRu ? "Отмена" : "Abbrechen"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setResult("");
            setConfirming(true);
          }}
          className="mt-4 h-11 w-full rounded-full bg-[#1b2431] text-[14px] font-bold text-[#ffc93c] active:scale-[0.98]"
        >
          {isRu ? "Отправить уведомление" : "Benachrichtigung senden"}
        </button>
      )}

      {result && <p className="mt-2 text-[13px] font-semibold text-[#2a2a26]">{result}</p>}
    </section>
  );
}