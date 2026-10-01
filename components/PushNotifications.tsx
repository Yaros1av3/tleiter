"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function isIosSafari() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isStandalone =
    "standalone" in window.navigator &&
    (window.navigator as unknown as { standalone?: boolean }).standalone;

  return isIos && !isStandalone;
}

export default function PushNotifications({ isRu }: { isRu: boolean }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needsIosInstall, setNeedsIosInstall] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setSupported(ok);
    setNeedsIosInstall(isIosSafari());

    if (!ok) return;

    setPermission(Notification.permission);

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {
        /* тихо игнорируем — просто покажем состояние "не подписан" */
      });
  }, []);

  async function linkTeamMemberByEmail(userId: string, email: string) {
    await supabase
      .from("team_members")
      .update({ user_id: userId })
      .eq("email", email)
      .is("user_id", null);
  }

  async function subscribe() {
    if (!VAPID_PUBLIC_KEY) {
      setMessage(
        isRu
          ? "Push ещё не настроен на сервере (нет ключа)."
          : "Push ist serverseitig noch nicht konfiguriert (kein Schlüssel).",
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("no user");

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        setBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
        { onConflict: "endpoint" },
      );

      if (error) throw error;

      if (user.email) {
        await linkTeamMemberByEmail(user.id, user.email);
      }

      setSubscribed(true);
    } catch (error) {
      console.error("Push subscribe:", error);

      setMessage(
        isRu
          ? "Не удалось включить уведомления."
          : "Benachrichtigungen konnten nicht aktiviert werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);

        await subscription.unsubscribe();
      }

      setSubscribed(false);
    } catch (error) {
      console.error("Push unsubscribe:", error);
    } finally {
      setBusy(false);
    }
  }

  if (supported === null) return null;

  return (
    <section className="mt-4 overflow-hidden rounded-[24px] border border-[#e6e7e8] bg-white p-5 shadow-[0_4px_18px_rgba(17,24,32,0.04)]">
      <div className="flex items-start gap-3.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
            subscribed
              ? "bg-[#111820] text-white"
              : "bg-[#f1f2f3] text-[#65707d]"
          }`}
        >
          {subscribed ? <BellRing size={19} /> : <Bell size={19} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-[#111820]">
            {isRu ? "Напоминания о служении" : "Dienst-Erinnerungen"}
          </p>

          <p className="mt-1 text-[13px] leading-5 text-[#8a939d]">
            {isRu
              ? "Получай push-уведомление, когда стоишь в плане на ближайшее воскресенье."
              : "Erhalte eine Push-Benachrichtigung, wenn du für den nächsten Sonntag eingeplant bist."}
          </p>

          {!supported && (
            <p className="mt-3 text-[12px] font-medium text-[#b42318]">
              {isRu
                ? "Этот браузер не поддерживает push-уведомления."
                : "Dieser Browser unterstützt keine Push-Benachrichtigungen."}
            </p>
          )}

          {supported && needsIosInstall && (
            <div className="mt-3 rounded-[14px] bg-amber-50 px-3.5 py-3 text-[12px] leading-5 text-amber-900">
              {isRu
                ? "На iPhone сначала добавь сайт на главный экран: «Поделиться» → «На экран «Домой»», затем открой его оттуда и включи уведомления здесь."
                : "Auf dem iPhone zuerst zum Homescreen hinzufügen: „Teilen“ → „Zum Home-Bildschirm“, dann von dort öffnen und hier aktivieren."}
            </div>
          )}

          {supported && !needsIosInstall && (
            <button
              type="button"
              onClick={subscribed ? unsubscribe : subscribe}
              disabled={busy}
              className={`mt-3.5 flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-[13px] font-bold transition active:scale-[0.98] disabled:opacity-50 ${
                subscribed
                  ? "border border-[#e2e5e8] text-[#374353]"
                  : "bg-[#111820] text-white"
              }`}
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : subscribed ? (
                <BellOff size={15} />
              ) : (
                <Bell size={15} />
              )}

              {busy
                ? isRu
                  ? "Подождите..."
                  : "Einen Moment..."
                : subscribed
                  ? isRu
                    ? "Выключить уведомления"
                    : "Benachrichtigungen deaktivieren"
                  : isRu
                    ? "Включить уведомления"
                    : "Benachrichtigungen aktivieren"}
            </button>
          )}

          {permission === "denied" && (
            <p className="mt-2.5 text-[11px] text-[#b42318]">
              {isRu
                ? "Уведомления заблокированы в браузере — включи их в настройках сайта."
                : "Benachrichtigungen sind im Browser blockiert — aktiviere sie in den Website-Einstellungen."}
            </p>
          )}

          {message && (
            <p className="mt-2.5 text-[11px] text-[#b42318]">{message}</p>
          )}
        </div>
      </div>
    </section>
  );
}