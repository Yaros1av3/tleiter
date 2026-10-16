"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

type ToastKind = "success" | "error" | "info";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
};

type ToastOptions = {
  action?: ToastAction;
  duration?: number;
};

type ToastApi = {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const MAX_TOASTS = 3;

const fallbackApi: ToastApi = {
  success: (m) => console.info(m),
  error: (m) => console.error(m),
  info: (m) => console.info(m),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, options?: ToastOptions) => {
      const id = nextId.current++;

      setToasts((current) =>
        [...current, { id, kind, message, action: options?.action }].slice(
          -MAX_TOASTS,
        ),
      );

      const duration =
        options?.duration ??
        (options?.action ? 8000 : kind === "error" ? 6000 : 3500);

      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, options) => push("success", message, options),
      error: (message, options) => push("error", message, options),
      info: (message, options) => push("info", message, options),
    }),
    [push],
  );

  const closeLabel = language === "ru" ? "Закрыть" : "Schließen";

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => {
          const Icon =
            toast.kind === "success"
              ? CheckCircle2
              : toast.kind === "error"
                ? TriangleAlert
                : Info;

          const iconColor =
            toast.kind === "success"
              ? "text-emerald-400"
              : toast.kind === "error"
                ? "text-rose-400"
                : "text-sky-300";

          return (
            <div
              key={toast.id}
              role={toast.kind === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl bg-[#111820] px-4 py-3 text-white shadow-[0_10px_35px_rgba(17,24,32,0.28)]"
            >
              <Icon size={19} className={`shrink-0 ${iconColor}`} />

              <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                {toast.message}
              </p>

              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25"
                >
                  {toast.action.label}
                </button>
              )}

              <button
                type="button"
                aria-label={closeLabel}
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-lg p-1 text-white/60 transition hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? fallbackApi;
}