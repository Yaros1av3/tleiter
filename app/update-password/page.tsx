"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Language = "de" | "ru";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [language, setLanguage] =
    useState<Language>("de");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [hasRecoverySession, setHasRecoverySession] =
    useState(false);

  const isRu = language === "ru";

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (session) {
        setHasRecoverySession(true);
      }

      setCheckingSession(false);
    }

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        if (
          event === "PASSWORD_RECOVERY" &&
          session
        ) {
          setHasRecoverySession(true);
          setCheckingSession(false);
        }

        if (session) {
          setHasRecoverySession(true);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const passwordChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      letter: /[A-Za-zА-Яа-яÄÖÜäöüß]/.test(
        password,
      ),
      number: /\d/.test(password),
      special: /[^A-Za-zА-Яа-яÄÖÜäöüß0-9]/.test(
        password,
      ),
    };
  }, [password]);

  const passwordScore = Object.values(
    passwordChecks,
  ).filter(Boolean).length;

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const strength = useMemo(() => {
    if (!password) {
      return {
        label: isRu ? "Введите пароль" : "Passwort eingeben",
        width: "0%",
      };
    }

    if (passwordScore <= 1) {
      return {
        label: isRu ? "Слабый" : "Schwach",
        width: "25%",
      };
    }

    if (passwordScore === 2) {
      return {
        label: isRu ? "Средний" : "Mittel",
        width: "50%",
      };
    }

    if (passwordScore === 3) {
      return {
        label: isRu ? "Хороший" : "Gut",
        width: "75%",
      };
    }

    return {
      label: isRu ? "Сильный" : "Stark",
      width: "100%",
    };
  }, [isRu, password, passwordScore]);

  async function handleUpdatePassword(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!hasRecoverySession) {
      setError(
        isRu
          ? "Ссылка для восстановления недействительна или уже истекла."
          : "Der Wiederherstellungslink ist ungültig oder bereits abgelaufen.",
      );
      return;
    }

    if (password.length < 8) {
      setError(
        isRu
          ? "Пароль должен содержать минимум 8 символов."
          : "Das Passwort muss mindestens 8 Zeichen enthalten.",
      );
      return;
    }

    if (!passwordChecks.letter) {
      setError(
        isRu
          ? "Пароль должен содержать хотя бы одну букву."
          : "Das Passwort muss mindestens einen Buchstaben enthalten.",
      );
      return;
    }

    if (!passwordChecks.number) {
      setError(
        isRu
          ? "Пароль должен содержать хотя бы одну цифру."
          : "Das Passwort muss mindestens eine Zahl enthalten.",
      );
      return;
    }

    if (!passwordChecks.special) {
      setError(
        isRu
          ? "Пароль должен содержать специальный символ."
          : "Das Passwort muss mindestens ein Sonderzeichen enthalten.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        isRu
          ? "Пароли не совпадают."
          : "Die Passwörter stimmen nicht überein.",
      );
      return;
    }

    setLoading(true);

    const { error: updateError } =
      await supabase.auth.updateUser({
        password,
      });

    if (updateError) {
      setError(
        isRu
          ? "Пароль не удалось изменить. Возможно, ссылка уже истекла. Bitte versuche es erneut."
          : "Das Passwort konnte nicht geändert werden. Der Link ist möglicherweise abgelaufen. Bitte versuche es erneut.",
      );

      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f6] px-6">
        <div className="flex flex-col items-center">
          <Image
            src="/tlite-logo.png"
            alt="TLight"
            width={58}
            height={58}
            priority
            className="h-[58px] w-[58px] rounded-[17px]"
          />

          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-[#687585]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d8dce1] border-t-[#111820]" />
            <span>
              {isRu
                ? "Проверяем ссылку..."
                : "Link wird geprüft..."}
            </span>
          </div>
        </div>
      </main>
    );
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
              SUCCESS
          ───────────────────────────── */}

          {success ? (
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#dfe6e1] bg-white px-3.5 py-2 shadow-[0_3px_12px_rgba(17,24,32,0.04)]">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#526d5b] text-white">
                  <CheckCircle2
                    size={12}
                    strokeWidth={2.2}
                  />
                </div>

                <span className="text-[11px] font-semibold tracking-[0.06em] text-[#687585]">
                  {isRu
                    ? "ПАРОЛЬ ИЗМЕНЁН"
                    : "PASSWORT GEÄNDERT"}
                </span>
              </div>

              <h1 className="text-[34px] font-bold leading-[1.04] tracking-[-0.045em] text-[#111820]">
                {isRu
                  ? "Готово!"
                  : "Geschafft!"}
              </h1>

              <p className="mt-3 max-w-[370px] text-[16px] leading-6 text-[#647080]">
                {isRu
                  ? "Твой пароль успешно изменён. Теперь ты можешь войти в TLight."
                  : "Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt bei TLight anmelden."}
              </p>

              <div className="mt-8 rounded-[24px] border border-[#dfe6e1] bg-white p-5 shadow-[0_5px_22px_rgba(17,24,32,0.05)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#eef3ef] text-[#526d5b]">
                  <CheckCircle2
                    size={25}
                    strokeWidth={1.8}
                  />
                </div>

                <p className="mt-5 text-[14px] leading-6 text-[#687585]">
                  {isRu
                    ? "Все готово. Используй новый пароль при следующем входе."
                    : "Alles ist bereit. Verwende dein neues Passwort bei der nächsten Anmeldung."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="mt-5 flex h-[62px] w-full items-center justify-center gap-3 rounded-full bg-[#111820] text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(17,24,32,0.14)] transition active:scale-[0.985]"
              >
                <span>
                  {isRu
                    ? "Войти в аккаунт"
                    : "Jetzt anmelden"}
                </span>

                <ArrowRight
                  size={20}
                  strokeWidth={2}
                />
              </button>
            </div>
          ) : (
            <>
              {/* ─────────────────────────────
                  INTRO
              ───────────────────────────── */}

              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e1e4e8] bg-white px-3.5 py-2 shadow-[0_3px_12px_rgba(17,24,32,0.04)]">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111820] text-white">
                    <KeyRound
                      size={11}
                      strokeWidth={2.2}
                    />
                  </div>

                  <span className="text-[11px] font-semibold tracking-[0.06em] text-[#687585]">
                    {isRu
                      ? "НОВЫЙ ПАРОЛЬ"
                      : "NEUES PASSWORT"}
                  </span>
                </div>

                <h1 className="text-[34px] font-bold leading-[1.04] tracking-[-0.045em] text-[#111820]">
                  {isRu
                    ? "Создай новый пароль"
                    : "Neues Passwort erstellen"}
                </h1>

                <p className="mt-3 max-w-[370px] text-[16px] leading-6 text-[#647080]">
                  {isRu
                    ? "Выбери новый пароль для своего TLight аккаунта."
                    : "Lege ein neues Passwort für deinen TLight-Account fest."}
                </p>
              </div>

              {/* ─────────────────────────────
                  FORM
              ───────────────────────────── */}

              <form
                onSubmit={handleUpdatePassword}
                className="mt-8"
              >
                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block px-1 text-[14px] font-semibold text-[#374353]"
                  >
                    {isRu
                      ? "Новый пароль"
                      : "Neues Passwort"}
                  </label>

                  <div className="relative">
                    <KeyRound
                      size={19}
                      strokeWidth={1.9}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9ba4ae]"
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
                        setPassword(
                          event.target.value,
                        )
                      }
                      placeholder={
                        isRu
                          ? "Новый пароль"
                          : "Neues Passwort"
                      }
                      autoComplete="new-password"
                      className="h-[62px] w-full rounded-[18px] border border-[#d9dee4] bg-white pl-[52px] pr-[58px] text-[16px] text-[#111820] shadow-[0_2px_8px_rgba(17,24,32,0.03)] outline-none transition placeholder:text-[#aab2bd] focus:border-[#111820] focus:ring-4 focus:ring-[#111820]/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value,
                        )
                      }
                      aria-label={
                        showPassword
                          ? isRu
                            ? "Скрыть пароль"
                            : "Passwort verbergen"
                          : isRu
                            ? "Показать пароль"
                            : "Passwort anzeigen"
                      }
                      className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-[#8d97a2] transition active:bg-[#f1f2f3]"
                    >
                      {showPassword ? (
                        <EyeOff
                          size={19}
                          strokeWidth={1.8}
                        />
                      ) : (
                        <Eye
                          size={19}
                          strokeWidth={1.8}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* Strength */}
                <div className="mt-3 rounded-[18px] border border-[#e3e6e8] bg-white px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#687585]">
                      {isRu
                        ? "Надёжность пароля"
                        : "Passwortstärke"}
                    </span>

                    <span className="text-[12px] font-semibold text-[#111820]">
                      {strength.label}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-1.5">
                    {[0, 1, 2, 3].map(
                      (index) => (
                        <div
                          key={index}
                          className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8eaec]"
                        >
                          <div
                            className={`h-full rounded-full transition-all ${
                              passwordScore >
                              index
                                ? "bg-[#111820]"
                                : "bg-transparent"
                            }`}
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Requirements */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <PasswordRequirement
                    valid={passwordChecks.length}
                    text={
                      isRu
                        ? "8+ символов"
                        : "8+ Zeichen"
                    }
                  />

                  <PasswordRequirement
                    valid={passwordChecks.letter}
                    text={
                      isRu
                        ? "Буква"
                        : "Buchstabe"
                    }
                  />

                  <PasswordRequirement
                    valid={passwordChecks.number}
                    text={
                      isRu
                        ? "Цифра"
                        : "Zahl"
                    }
                  />

                  <PasswordRequirement
                    valid={passwordChecks.special}
                    text={
                      isRu
                        ? "Спец. символ"
                        : "Sonderzeichen"
                    }
                  />
                </div>

                {/* Confirm password */}
                <div className="mt-5">
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block px-1 text-[14px] font-semibold text-[#374353]"
                  >
                    {isRu
                      ? "Повтори пароль"
                      : "Passwort bestätigen"}
                  </label>

                  <div className="relative">
                    <KeyRound
                      size={19}
                      strokeWidth={1.9}
                      className={`absolute left-5 top-1/2 -translate-y-1/2 ${
                        passwordsMatch
                          ? "text-[#526d5b]"
                          : "text-[#9ba4ae]"
                      }`}
                    />

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value,
                        )
                      }
                      placeholder={
                        isRu
                          ? "Повтори пароль"
                          : "Passwort wiederholen"
                      }
                      autoComplete="new-password"
                      className={`h-[62px] w-full rounded-[18px] border bg-white pl-[52px] pr-[58px] text-[16px] text-[#111820] shadow-[0_2px_8px_rgba(17,24,32,0.03)] outline-none transition placeholder:text-[#aab2bd] focus:ring-4 ${
                        confirmPassword.length > 0 &&
                        !passwordsMatch
                          ? "border-red-300 focus:border-red-400 focus:ring-red-500/5"
                          : passwordsMatch
                            ? "border-[#b9cdbf] focus:border-[#526d5b] focus:ring-[#526d5b]/5"
                            : "border-[#d9dee4] focus:border-[#111820] focus:ring-[#111820]/5"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (value) => !value,
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? isRu
                            ? "Скрыть пароль"
                            : "Passwort verbergen"
                          : isRu
                            ? "Показать пароль"
                            : "Passwort anzeigen"
                      }
                      className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-[#8d97a2] transition active:bg-[#f1f2f3]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff
                          size={19}
                          strokeWidth={1.8}
                        />
                      ) : (
                        <Eye
                          size={19}
                          strokeWidth={1.8}
                        />
                      )}
                    </button>
                  </div>

                  {confirmPassword.length >
                    0 && (
                    <div
                      className={`mt-2 flex items-center gap-1.5 px-1 text-[12px] font-medium ${
                        passwordsMatch
                          ? "text-[#526d5b]"
                          : "text-red-500"
                      }`}
                    >
                      {passwordsMatch ? (
                        <CheckCircle2
                          size={14}
                          strokeWidth={2}
                        />
                      ) : (
                        <XCircle
                          size={14}
                          strokeWidth={2}
                        />
                      )}

                      <span>
                        {passwordsMatch
                          ? isRu
                            ? "Пароли совпадают"
                            : "Passwörter stimmen überein"
                          : isRu
                            ? "Пароли не совпадают"
                            : "Passwörter stimmen nicht überein"}
                      </span>
                    </div>
                  )}
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
                          ? "Сохраняем..."
                          : "Wird gespeichert..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {isRu
                          ? "Сохранить новый пароль"
                          : "Neues Passwort speichern"}
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
                        ? "Безопасность аккаунта"
                        : "Sicherheit deines Accounts"}
                    </p>

                    <p className="mt-1 text-[12px] leading-5 text-[#8a939e]">
                      {isRu
                        ? "Используй уникальный пароль, который не используешь в других сервисах."
                        : "Verwende ein einzigartiges Passwort, das du nicht bei anderen Diensten nutzt."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Back */}
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

          {/* Footer */}
          <div className="mt-7 flex items-center justify-center gap-2 text-center text-[12px] text-[#9aa2ab]">
            <CheckCircle2
              size={14}
              strokeWidth={1.8}
            />

            <span>
              TLight — Team Workspace
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

function PasswordRequirement({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div
      className={`flex min-h-[38px] items-center gap-2 rounded-[12px] px-3 text-[12px] font-medium ${
        valid
          ? "bg-[#eef3ef] text-[#526d5b]"
          : "bg-[#f0f1f2] text-[#8a939e]"
      }`}
    >
      {valid ? (
        <CheckCircle2
          size={14}
          strokeWidth={2}
        />
      ) : (
        <div className="h-1.5 w-1.5 rounded-full bg-[#aeb5bd]" />
      )}

      <span>{text}</span>
    </div>
  );
}