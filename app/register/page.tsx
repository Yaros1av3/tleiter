"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Language = "de" | "ru";

export default function RegisterPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>("de");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRu = language === "ru";

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError(
        isRu
          ? "Пожалуйста, введи своё полное имя и фамилию."
          : "Bitte gib deinen vollständigen Vor- und Nachnamen ein.",
      );
      return;
    }

    if (!cleanName.includes(" ")) {
      setError(
        isRu
          ? "Bitte укажи имя и фамилию."
          : "Bitte gib deinen Vor- und Nachnamen ein.",
      );
      return;
    }

    if (!cleanEmail) {
      setError(
        isRu
          ? "Пожалуйста, введи E-Mail."
          : "Bitte gib deine E-Mail-Adresse ein.",
      );
      return;
    }

    if (password.length < 6) {
      setError(
        isRu
          ? "Пароль должен содержать минимум 6 символов."
          : "Das Passwort muss mindestens 6 Zeichen enthalten.",
      );
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f6] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[430px] items-center">
        <div className="w-full">
          {/* Logo + language */}
          <div className="mb-8 flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <Image
                src="/tlite-logo.png"
                alt="TLite"
                width={52}
                height={52}
                priority
                className="h-[52px] w-[52px] rounded-[15px]"
              />

              <span className="text-[27px] font-bold tracking-[-0.04em] text-[#111820]">
                TLite
              </span>
            </div>

            <div className="flex rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setLanguage("de")}
                className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition ${
                  !isRu
                    ? "bg-[#111820] text-white"
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
                    ? "bg-[#111820] text-white"
                    : "text-neutral-400"
                }`}
              >
                RU
              </button>
            </div>
          </div>

          {/* Main content */}
          <div>
            <h1 className="text-[32px] font-bold leading-[1.08] tracking-[-0.04em] text-[#111820]">
              {isRu ? "Создать аккаунт" : "Konto erstellen"}
            </h1>

            <p className="mt-3 text-[16px] leading-6 text-[#647080]">
              {isRu
                ? "Создай аккаунт, чтобы присоединиться к команде."
                : "Erstelle dein Konto, um deinem Team beizutreten."}
            </p>

            <form onSubmit={handleRegister} className="mt-8 space-y-4">
              {/* Full name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 block px-1 text-[14px] font-semibold text-[#374353]"
                >
                  {isRu ? "Полное имя и фамилия" : "Vollständiger Name"}
                </label>

                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={
                    isRu ? "Имя и фамилия" : "Vorname und Nachname"
                  }
                  autoComplete="name"
                  autoCapitalize="words"
                  className="h-[62px] w-full rounded-[18px] border border-[#d9dee4] bg-white px-5 text-[16px] text-[#111820] shadow-[0_2px_8px_rgba(17,24,32,0.03)] outline-none transition placeholder:text-[#aab2bd] focus:border-[#111820] focus:ring-4 focus:ring-[#111820]/5"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block px-1 text-[14px] font-semibold text-[#374353]"
                >
                  E-Mail
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  inputMode="email"
                  className="h-[62px] w-full rounded-[18px] border border-[#d9dee4] bg-white px-5 text-[16px] text-[#111820] shadow-[0_2px_8px_rgba(17,24,32,0.03)] outline-none transition placeholder:text-[#aab2bd] focus:border-[#111820] focus:ring-4 focus:ring-[#111820]/5"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block px-1 text-[14px] font-semibold text-[#374353]"
                >
                  {isRu ? "Пароль" : "Passwort"}
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      isRu ? "Минимум 6 символов" : "Mindestens 6 Zeichen"
                    }
                    autoComplete="new-password"
                    className="h-[62px] w-full rounded-[18px] border border-[#d9dee4] bg-white px-5 pr-14 text-[16px] text-[#111820] shadow-[0_2px_8px_rgba(17,24,32,0.03)] outline-none transition placeholder:text-[#aab2bd] focus:border-[#111820] focus:ring-4 focus:ring-[#111820]/5"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-[#687585]"
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

              {/* Name explanation */}
              <div className="flex gap-3 px-1 pt-1 text-[13px] leading-5 text-[#687585]">
                <Info size={17} className="mt-0.5 shrink-0" />

                <span>
                  {isRu
                    ? "Укажи своё полное имя и фамилию. Например: Иван Иванов."
                    : "Bitte gib deinen vollständigen Vor- und Nachnamen ein. Zum Beispiel: Max Mustermann."}
                </span>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-[60px] w-full items-center justify-center gap-3 rounded-full bg-[#111820] text-[16px] font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? isRu
                    ? "Создаём аккаунт..."
                    : "Konto wird erstellt..."
                  : isRu
                    ? "Создать аккаунт"
                    : "Konto erstellen"}

                {!loading && <ArrowRight size={20} />}
              </button>
            </form>

            {/* Login */}
            <div className="mt-7 text-center text-[14px] text-[#687585]">
              {isRu
                ? "Уже есть аккаунт?"
                : "Du hast bereits ein Konto?"}{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-semibold text-[#111820] underline underline-offset-4"
              >
                {isRu ? "Войти" : "Anmelden"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}