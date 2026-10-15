"use client";

import { useEffect } from "react";

/*
 * Ловит системный запрос «Установить приложение» (Android/Chrome/Edge),
 * пока человек ходит по сайту, и сохраняет его — чтобы кнопка в настройках
 * сработала, даже если браузер выдал запрос на другой странице.
 */
export const INSTALL_EVENT = "tlight-install-changed";

export default function InstallPromptCapture() {
  useEffect(() => {
    const w = window as unknown as { __tlightInstallPrompt?: Event | null };

    const onPrompt = (event: Event) => {
      event.preventDefault();
      w.__tlightInstallPrompt = event;
      window.dispatchEvent(new Event(INSTALL_EVENT));
    };

    const onInstalled = () => {
      w.__tlightInstallPrompt = null;
      window.dispatchEvent(new Event(INSTALL_EVENT));
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}