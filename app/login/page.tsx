"use client";

import {
  FormEvent,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Language = "de" | "ru";

export default function LoginPage() {
  const router = useRouter();

  const [language, setLanguage] =
    useState<Language>("de");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [focusedField, setFocusedField] =
    useState<"email" | "password" | null>(null);

  const isRu = language === "ru";

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError(
        isRu
          ? "Пожалуйста, введи E-Mail."
          : "Bitte gib deine E-Mail-Adresse ein.",
      );
      return;
    }

    if (!password) {
      setError(
        isRu
          ? "Пожалуйста, введи пароль."
          : "Bitte gib dein Passwort ein.",
      );
      return;
    }

    setLoading(true);

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (loginError) {
      setError(
        isRu
          ? "E-Mail или пароль указаны неверно."
          : "E-Mail-Adresse oder Passwort ist falsch.",
      );

      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  function goToForgotPassword() {
    router.push("/forgot-password");
  }

  function goToRegister() {
    router.push("/register");
  }

  return (
    <main className="min-h-screen bg-[#f7f7f6] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[430px] items-center">
        <div className="w-full">

          {/* ─────────────────────────────
              TOP
          ───────────────────────────── */}

          <div className="mb-8 flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <Image
                src="/tlite-logo.png"
                alt="TLight"
                width={52}
                height={52}
                priority
                className="h-[52px] w-[52px] rounded-[15px]"
              />

              <div>
                <div className="text-[27px] font-bold leading-none tracking-[-0.04em] text-[#111820]">
                  TLight
                </div>

                <div className="mt-1 text-[11px] font-medium tracking-[0.04em] text-[#8a939e]">
                  TEAM WORKSPACE
                </div>
              </div>
            </div>

            {/* Language */}
            <div className="flex rounded-full border border-neutral-200 bg-white p-1 shadow-[0_3px_12px_rgba(17,24,32,0.05)]">
              <button
                type="button"
                onClick={() => setLanguage("de")}
                className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition ${
                  !isRu
                    ? "bg-[#111820] text-white shadow-sm"
                    : "text-neutral-400"
                }`}
              >
                DE
              </button>

              <button
                type="button"
                onClick={() => setLanguage("ru")}
                className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition ${
                  isRu
                    ? "bg-[#111820] text-white shadow-sm"
                    : "text-neutral-400"
                }`}
              >
                RU
              </button>
            </div>
          </div>

          {/* ─────────────────────────────
              INTRO
          ───────────────────────────── */}

          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e1e4e8] bg-white px-3.5 py-2 shadow-[0_3px_12px_rgba(17,24,32,0.04)]">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111820] text-white">
                <LockKeyhole size={11} strokeWidth={2.2} />
              </div>

              <span className="text-[11px] font-semibold tracking-[0.06em] text-[#687585]">
                {isRu
                  ? "ЗАЩИЩЁННЫЙ ДОСТУП"
                  : "GESCHÜTZTER ZUGANG"}
              </span>
            </div>

            <h1 className="text-[34px] font-bold leading-[1.04] tracking-[-0.045em] text-[#111820]">
              {isRu
                ? "С возвращением"
                : "Willkommen zurück"}
            </h1>

            <p className="mt-3 max-w-[370px] text-[16px] leading-6 text-[#647080]">
              {isRu
                ? "Войди в свой аккаунт TLight и продолжи работу команды."
                : "Melde dich bei TLight an und arbeite weiter mit deinem Team."}
            </p>
          </div>

          {/* ─────────────────────────────
              FORM
          ───────────────────────────── */}

          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
          >

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block px-1 text-[14px] font-semibold text-[#374353]"
              >
                E-Mail
              </label>

              <div
                className={`relative transition ${
                  focusedField === "email"
                    ? "scale-[1.005]"
                    : ""
                }`}
              >
                <Mail
                  size={19}
                  strokeWidth={1.9}
                  className={`absolute left-5 top-1/2 -translate-y-1/2 transition ${
                    focusedField === "email"
                      ? "text-[#111820]"
                      : "text-[#9ba4ae]"
                  }`}
                />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  onFocus={() =>
                    setFocusedField("email")
                  }
                  onBlur={() =>
                    setFocusedField(null)
                  }
                  placeholder="name@example.com"
                  autoComplete="email"
                  inputMode="email"
                  className={`h-[62px] w-full rounded-[18px] border bg-white pl-13 pr-5 text-[16px] text-[#111820] shadow-[0_2px_8px_rgba(17,24,32,0.03)] outline-none transition placeholder:text-[#aab2bd] ${
                    focusedField === "email"
                      ? "border-[#111820] ring-4 ring-[#111820]/5"
                      : "border-[#d9dee4]"
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <label
                  htmlFor="password"
                  className="text-[14px] font-semibold text-[#374353]"
                >
                  {isRu
                    ? "Пароль"
                    : "Passwort"}
                </label>

                <button
                  type="button"
                  onClick={goToForgotPassword}
                  className="text-[13px] font-semibold text-[#687585] transition active:opacity-60"
                >
                  {isRu
                    ? "Забыли пароль?"
                    : "Passwort vergessen?"}
                </button>
              </div>

              <div
                className={`relative transition ${
                  focusedField === "password"
                    ? "scale-[1.005]"
                    : ""
                }`}
              >
                <LockKeyhole
                  size={19}
                  strokeWidth={1.9}
                  className={`absolute left-5 top-1/2 -translate-y-1/2 transition ${
                    focusedField === "password"
                      ? "text-[#111820]"
                      : "text-[#9ba4ae]"
                  }`}
                />

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  onFocus={() =>
                    setFocusedField("password")
                  }
                  onBlur={() =>
                    setFocusedField(null)
                  }
                  placeholder={
                    isRu
                      ? "Введите пароль"
                      : "Passwort eingeben"
                  }
                  autoComplete="current-password"
                  className={`h-[62px] w-full rounded-[18px] border bg-white pl-13 pr-[62px] text-[16px] text-[#111820] shadow-[0_2px_8px_rgba(17,24,32,0.03)] outline-none transition placeholder:text-[#aab2bd] ${
                    focusedField === "password"
                      ? "border-[#111820] ring-4 ring-[#111820]/5"
                      : "border-[#d9dee4]"
                  }`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value,
                    )
                  }
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-[#687585] transition active:scale-95"
                  aria-label={
                    showPassword
                      ? isRu
                        ? "Скрыть пароль"
                        : "Passwort ausblenden"
                      : isRu
                        ? "Показать пароль"
                        : "Passwort anzeigen"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-[17px] border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-5 text-red-700"
              >
                <div className="mt-0.5 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                </div>

                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group mt-2 flex h-[62px] w-full items-center justify-center gap-3 rounded-full bg-[#111820] text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(17,24,32,0.14)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                  <span>
                    {isRu
                      ? "Выполняем вход..."
                      : "Anmeldung läuft..."}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {isRu
                      ? "Войти"
                      : "Anmelden"}
                  </span>

                  <ArrowRight
                    size={20}
                    strokeWidth={2}
                    className="transition-transform group-active:translate-x-0.5"
                  />
                </>
              )}
            </button>
          </form>

          {/* ─────────────────────────────
              SECURITY INFO
          ───────────────────────────── */}

          <div className="mt-6 flex items-center justify-center gap-2 text-center text-[12px] text-[#8a939e]">
            <ShieldCheck
              size={15}
              strokeWidth={1.8}
            />

            <span>
              {isRu
                ? "Твои данные защищены"
                : "Deine Daten sind geschützt"}
            </span>
          </div>

          {/* ─────────────────────────────
              REGISTER
          ───────────────────────────── */}

          <div className="mt-7 rounded-[20px] border border-[#e1e4e8] bg-white px-5 py-4 shadow-[0_3px_14px_rgba(17,24,32,0.04)]">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#8a939e]">
                  {isRu
                    ? "Новый в TLight?"
                    : "Neu bei TLight?"}
                </p>

                <p className="mt-0.5 text-[14px] font-semibold text-[#111820]">
                  {isRu
                    ? "Создай свой аккаунт"
                    : "Erstelle dein Konto"}
                </p>
              </div>

              <button
                type="button"
                onClick={goToRegister}
                className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#f0f2f3] px-4 text-[13px] font-semibold text-[#111820] transition active:scale-95"
              >
                {isRu
                  ? "Регистрация"
                  : "Registrieren"}

                <ArrowRight
                  size={15}
                  strokeWidth={2.2}
                />
              </button>
            </div>
          </div>

          {/* ─────────────────────────────
              TRUST POINTS
          ───────────────────────────── */}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[17px] border border-[#e4e6e8] bg-[#fafafa] px-3.5 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={15}
                  strokeWidth={1.8}
                  className="text-[#687585]"
                />

                <span className="text-[11px] font-semibold text-[#687585]">
                  {isRu
                    ? "Простой доступ"
                    : "Einfacher Zugang"}
                </span>
              </div>
            </div>

            <div className="rounded-[17px] border border-[#e4e6e8] bg-[#fafafa] px-3.5 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={15}
                  strokeWidth={1.8}
                  className="text-[#687585]"
                />

                <span className="text-[11px] font-semibold text-[#687585]">
                  {isRu
                    ? "Geschützt"
                    : "Geschützt"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}