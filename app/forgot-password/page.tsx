"use client";

import {
  FormEvent,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Language = "de" | "ru";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [language, setLanguage] =
    useState<Language>("de");

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [focused, setFocused] =
    useState(false);

  const isRu = language === "ru";

  async function handleReset(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError(
        isRu
          ? "Пожалуйста, введи свой E-Mail."
          : "Bitte gib deine E-Mail-Adresse ein.",
      );
      return;
    }

    setLoading(true);

    const redirectTo =
      `${window.location.origin}/update-password`;

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo,
        },
      );

    if (resetError) {
      setError(
        isRu
          ? "Beim Senden des Links ist ein Fehler aufgetreten. Bitte versuche es erneut."
          : "Beim Senden des Links ist ein Fehler aufgetreten. Bitte versuche es erneut.",
      );

      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
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
                <Mail
                  size={11}
                  strokeWidth={2.2}
                />
              </div>

              <span className="text-[11px] font-semibold tracking-[0.06em] text-[#687585]">
                {isRu
                  ? "ВОССТАНОВЛЕНИЕ ДОСТУПА"
                  : "ZUGANG WIEDERHERSTELLEN"}
              </span>
            </div>

            <h1 className="text-[34px] font-bold leading-[1.04] tracking-[-0.045em] text-[#111820]">
              {isRu
                ? "Забыли пароль?"
                : "Passwort vergessen?"}
            </h1>

            <p className="mt-3 max-w-[370px] text-[16px] leading-6 text-[#647080]">
              {isRu
                ? "Введи свой E-Mail. Мы отправим тебе ссылку для создания нового пароля."
                : "Gib deine E-Mail-Adresse ein. Wir senden dir einen Link, mit dem du ein neues Passwort erstellen kannst."}
            </p>
          </div>

          {/* ─────────────────────────────
              SUCCESS
          ───────────────────────────── */}

          {success ? (
            <div className="mt-8">

              <div className="rounded-[24px] border border-[#dfe6e1] bg-white p-5 shadow-[0_5px_22px_rgba(17,24,32,0.05)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#eef3ef] text-[#526d5b]">
                  <CheckCircle2
                    size={25}
                    strokeWidth={1.8}
                  />
                </div>

                <h2 className="mt-5 text-[21px] font-bold tracking-[-0.03em] text-[#111820]">
                  {isRu
                    ? "Проверь свою почту"
                    : "Prüfe deinen Posteingang"}
                </h2>

                <p className="mt-2 text-[14px] leading-6 text-[#687585]">
                  {isRu
                    ? "Если аккаунт с этим E-Mail существует, мы отправили на него ссылку для сброса пароля."
                    : "Wenn ein Konto mit dieser E-Mail-Adresse existiert, haben wir einen Link zum Zurücksetzen deines Passworts gesendet."}
                </p>

                <div className="mt-4 rounded-[16px] bg-[#f7f7f6] px-4 py-3">
                  <p className="break-all text-[14px] font-semibold text-[#111820]">
                    {email.trim()}
                  </p>
                </div>

                <p className="mt-4 text-[12px] leading-5 text-[#8a939e]">
                  {isRu
                    ? "Не забудь также проверить папку «Спам»."
                    : "Falls du keine E-Mail siehst, prüfe bitte auch deinen Spam-Ordner."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                className="mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-full border border-[#dfe2e5] bg-white text-[14px] font-semibold text-[#111820] transition active:scale-[0.985]"
              >
                <Mail
                  size={17}
                  strokeWidth={1.9}
                />

                {isRu
                  ? "Другой E-Mail"
                  : "Andere E-Mail"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="mt-3 flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#111820] text-[14px] font-semibold text-white shadow-[0_7px_22px_rgba(17,24,32,0.13)] transition active:scale-[0.985]"
              >
                <ArrowLeft
                  size={17}
                  strokeWidth={2}
                />

                {isRu
                  ? "Вернуться ко входу"
                  : "Zurück zur Anmeldung"}
              </button>
            </div>
          ) : (
            <>
              {/* ─────────────────────────────
                  FORM
              ───────────────────────────── */}

              <form
                onSubmit={handleReset}
                className="mt-8"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block px-1 text-[14px] font-semibold text-[#374353]"
                  >
                    E-Mail
                  </label>

                  <div
                    className={`relative transition ${
                      focused
                        ? "scale-[1.005]"
                        : ""
                    }`}
                  >
                    <Mail
                      size={19}
                      strokeWidth={1.9}
                      className={`absolute left-5 top-1/2 -translate-y-1/2 transition ${
                        focused
                          ? "text-[#111820]"
                          : "text-[#9ba4ae]"
                      }`}
                    />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value,
                        )
                      }
                      onFocus={() =>
                        setFocused(true)
                      }
                      onBlur={() =>
                        setFocused(false)
                      }
                      placeholder="name@example.com"
                      autoComplete="email"
                      inputMode="email"
                      className={`h-[62px] w-full rounded-[18px] border bg-white pl-13 pr-5 text-[16px] text-[#111820] shadow-[0_2px_8px_rgba(17,24,32,0.03)] outline-none transition placeholder:text-[#aab2bd] ${
                        focused
                          ? "border-[#111820] ring-4 ring-[#111820]/5"
                          : "border-[#d9dee4]"
                      }`}
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-3 rounded-[17px] border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-5 text-red-700"
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
                  className="group mt-5 flex h-[62px] w-full items-center justify-center gap-3 rounded-full bg-[#111820] text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(17,24,32,0.14)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      <span>
                        {isRu
                          ? "Отправляем..."
                          : "Wird gesendet..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {isRu
                          ? "Отправить ссылку"
                          : "Link senden"}
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
                  INFO
              ───────────────────────────── */}

              <div className="mt-5 rounded-[19px] border border-[#e3e6e8] bg-white px-4 py-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#f0f2f3] text-[#687585]">
                    <ShieldCheck
                      size={18}
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>
                    <p className="text-[13px] font-semibold text-[#374353]">
                      {isRu
                        ? "Безопасное восстановление"
                        : "Sichere Wiederherstellung"}
                    </p>

                    <p className="mt-1 text-[12px] leading-5 text-[#8a939e]">
                      {isRu
                        ? "Ссылка для восстановления будет отправлена на E-Mail, связанный с аккаунтом."
                        : "Der Wiederherstellungslink wird an die mit deinem Konto verbundene E-Mail-Adresse gesendet."}
                    </p>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────
                  BACK TO LOGIN
              ───────────────────────────── */}

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="mt-6 flex w-full items-center justify-center gap-2 text-[14px] font-semibold text-[#687585] transition active:opacity-60"
              >
                <ArrowLeft
                  size={16}
                  strokeWidth={2}
                />

                {isRu
                  ? "Вернуться ко входу"
                  : "Zurück zur Anmeldung"}
              </button>
            </>
          )}

          {/* ─────────────────────────────
              FOOTER
          ───────────────────────────── */}

          <div className="mt-7 flex items-center justify-center gap-2 text-center text-[12px] text-[#9aa2ab]">
            <CheckCircle2
              size={14}
              strokeWidth={1.8}
            />

            <span>
              {isRu
                ? "TLight — Team Workspace"
                : "TLight — Team Workspace"}
            </span>
          </div>

        </div>
      </div>
    </main>
  );
}