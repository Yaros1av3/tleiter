"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Profile = {
  full_name: string | null;
  role: "user" | "admin";
};

export default function SettingsPage() {
  const router = useRouter();

  const {
    language,
    setLanguage,
    t,
  } = useLanguage();

  const isRu = language === "ru";

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [email, setEmail] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [passwordOpen, setPasswordOpen] =
    useState(false);

  const [password, setPassword] =
    useState("");

  const [passwordRepeat, setPasswordRepeat] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showPasswordRepeat,
    setShowPasswordRepeat,
  ] = useState(false);

  const [
    savingPassword,
    setSavingPassword,
  ] = useState(false);

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState("");

  const [
    passwordError,
    setPasswordError,
  ] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    setEmail(user.email ?? "");

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setProfile(data);
    }

    setLoading(false);
  }

  async function handlePasswordChange(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPasswordError("");
    setPasswordMessage("");

    if (password.length < 6) {
      setPasswordError(
        t.settings.passwordTooShort,
      );
      return;
    }

    if (password !== passwordRepeat) {
      setPasswordError(
        t.settings.passwordMismatch,
      );
      return;
    }

    setSavingPassword(true);

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      setPasswordError(
        t.settings.passwordChangeError,
      );

      setSavingPassword(false);
      return;
    }

    setPassword("");
    setPasswordRepeat("");
    setPasswordOpen(false);

    setPasswordMessage(
      t.settings.passwordChanged,
    );

    setSavingPassword(false);
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f6] px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-[430px] items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#111820]">
              <span className="text-xl font-bold text-white">
                T
              </span>
            </div>

            <p className="mt-4 text-sm font-medium text-[#7a8490]">
              TLite
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f6] px-4 pb-28 pt-5 md:px-8 md:pb-8">
      <div className="mx-auto w-full max-w-[760px]">

        {/* Mobile header */}
        <div className="mb-7 flex items-center gap-3 md:hidden">
          

          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.04em] text-[#111820]">
              {t.settings.title}
            </h1>

            <p className="mt-0.5 text-[13px] text-[#7a8490]">
              {t.settings.subtitle}
            </p>
          </div>
        </div>

        {/* Desktop header */}
        <div className="mb-8 hidden md:block">
          <h1 className="text-[34px] font-bold tracking-[-0.045em] text-[#111820]">
            {t.settings.title}
          </h1>

          <p className="mt-2 text-[15px] text-[#687585]">
            {t.settings.subtitle}
          </p>
        </div>

        {/* Profile */}
        <section className="overflow-hidden rounded-[24px] border border-[#e0e3e6] bg-white shadow-[0_4px_18px_rgba(17,24,32,0.04)]">

          <div className="flex items-center gap-4 border-b border-[#eceef0] px-5 py-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#111820] text-white">
              <UserRound size={23} />
            </div>

            <div className="min-w-0">
              <p className="text-[18px] font-bold tracking-[-0.02em] text-[#111820]">
                {profile?.full_name ||
                  t.settings.teamMember}
              </p>

              <p className="mt-1 truncate text-[14px] text-[#7a8490]">
                {email}
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#eceef0]">

            {/* Full name */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-[13px] text-[#7a8490]">
                  {t.settings.fullName}
                </p>

                <p className="mt-1 text-[15px] font-semibold text-[#202a35]">
                  {profile?.full_name ||
                    (isRu
                      ? "Не указано"
                      : "Nicht angegeben")}
                </p>
              </div>

              <UserRound
                size={18}
                className="text-[#a0a8b1]"
              />
            </div>

            {/* Email */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0 pr-4">
                <p className="text-[13px] text-[#7a8490]">
                  {t.settings.email}
                </p>

                <p className="mt-1 truncate text-[15px] font-semibold text-[#202a35]">
                  {email}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-[#f3f4f5] px-3 py-1 text-[11px] font-semibold text-[#687585]">
                {isRu ? "Аккаунт" : "Konto"}
              </span>
            </div>

            {/* Role */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-[13px] text-[#7a8490]">
                  {t.settings.role}
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-[#202a35]">
                    {profile?.role === "admin"
                      ? t.settings.administrator
                      : t.settings.teamMember}
                  </p>

                  {profile?.role === "admin" && (
                    <ShieldCheck
                      size={16}
                      className="text-[#111820]"
                    />
                  )}
                </div>
              </div>

              <span className="rounded-full bg-[#f3f4f5] px-3 py-1 text-[11px] font-semibold text-[#687585]">
                {profile?.role === "admin"
                  ? "ADMIN"
                  : "USER"}
              </span>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="mt-4 overflow-hidden rounded-[24px] border border-[#e0e3e6] bg-white shadow-[0_4px_18px_rgba(17,24,32,0.04)]">

          <div className="px-5 py-5">
            <p className="text-[18px] font-bold tracking-[-0.02em] text-[#111820]">
              {t.settings.security}
            </p>

            <p className="mt-1 text-[14px] leading-5 text-[#7a8490]">
              {t.settings.securityDescription}
            </p>
          </div>

          {!passwordOpen ? (
            <button
              type="button"
              onClick={() => {
                setPasswordOpen(true);
                setPasswordMessage("");
                setPasswordError("");
              }}
              className="flex min-h-[64px] w-full items-center gap-4 border-t border-[#eceef0] px-5 text-left transition active:bg-[#f7f7f6]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#f3f4f5] text-[#303b48]">
                <KeyRound size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-[#202a35]">
                  {t.settings.changePassword}
                </p>

                <p className="mt-0.5 text-[12px] text-[#8a939d]">
                  {isRu
                    ? "Установить новый пароль"
                    : "Neues Passwort festlegen"}
                </p>
              </div>

              <ChevronRight
                size={19}
                className="text-[#a0a8b1]"
              />
            </button>
          ) : (
            <form
              onSubmit={handlePasswordChange}
              className="border-t border-[#eceef0] p-5"
            >
              <div className="space-y-4">

                {/* New password */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-2 block px-1 text-[13px] font-semibold text-[#374353]"
                  >
                    {t.settings.newPassword}
                  </label>

                  <div className="relative">
                    <input
                      id="new-password"
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
                        t.settings.passwordPlaceholder
                      }
                      autoComplete="new-password"
                      className="h-[58px] w-full rounded-[17px] border border-[#d9dee4] bg-[#fafafa] px-4 pr-14 text-[16px] text-[#111820] outline-none transition placeholder:text-[#aab2bd] focus:border-[#111820] focus:bg-white focus:ring-4 focus:ring-[#111820]/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value,
                        )
                      }
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
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Repeat password */}
                <div>
                  <label
                    htmlFor="repeat-password"
                    className="mb-2 block px-1 text-[13px] font-semibold text-[#374353]"
                  >
                    {t.settings.repeatPassword}
                  </label>

                  <div className="relative">
                    <input
                      id="repeat-password"
                      type={
                        showPasswordRepeat
                          ? "text"
                          : "password"
                      }
                      value={passwordRepeat}
                      onChange={(event) =>
                        setPasswordRepeat(
                          event.target.value,
                        )
                      }
                      placeholder={
                        t.settings
                          .repeatPasswordPlaceholder
                      }
                      autoComplete="new-password"
                      className="h-[58px] w-full rounded-[17px] border border-[#d9dee4] bg-[#fafafa] px-4 pr-14 text-[16px] text-[#111820] outline-none transition placeholder:text-[#aab2bd] focus:border-[#111820] focus:bg-white focus:ring-4 focus:ring-[#111820]/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswordRepeat(
                          (value) => !value,
                        )
                      }
                      className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-[#687585]"
                      aria-label={
                        showPasswordRepeat
                          ? isRu
                            ? "Скрыть пароль"
                            : "Passwort ausblenden"
                          : isRu
                            ? "Показать пароль"
                            : "Passwort anzeigen"
                      }
                    >
                      {showPasswordRepeat ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {passwordError && (
                  <div className="rounded-[15px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700">
                    {passwordError}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() => {
                      setPasswordOpen(false);
                      setPassword("");
                      setPasswordRepeat("");
                      setPasswordError("");
                    }}
                    className="h-[54px] flex-1 rounded-full border border-[#dfe3e6] bg-white text-[14px] font-semibold text-[#374353]"
                  >
                    {t.settings.cancel}
                  </button>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex h-[54px] flex-[1.4] items-center justify-center gap-2 rounded-full bg-[#111820] text-[14px] font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
                  >
                    {savingPassword
                      ? isRu
                        ? "Сохраняем..."
                        : "Speichern..."
                      : t.settings.savePassword}

                    {!savingPassword && (
                      <Check size={17} />
                    )}
                  </button>

                </div>
              </div>
            </form>
          )}
        </section>

        {/* Password success message */}
        {passwordMessage && (
          <div className="mt-4 flex items-center gap-3 rounded-[17px] border border-green-200 bg-green-50 px-4 py-3 text-[13px] leading-5 text-green-700">
            <Check
              size={18}
              className="shrink-0"
            />

            <span>
              {passwordMessage}
            </span>
          </div>
        )}

        {/* Language */}
        <section className="mt-4 overflow-hidden rounded-[24px] border border-[#e0e3e6] bg-white shadow-[0_4px_18px_rgba(17,24,32,0.04)]">

          <div className="px-5 py-5">
            <p className="text-[18px] font-bold tracking-[-0.02em] text-[#111820]">
              {t.settings.language}
            </p>

            <p className="mt-1 text-[14px] leading-5 text-[#7a8490]">
              {t.settings.languageDescription}
            </p>
          </div>

          <div className="border-t border-[#eceef0] p-3">

            {/* Deutsch */}
            <button
              type="button"
              onClick={() => setLanguage("de")}
              className={`flex min-h-[64px] w-full items-center gap-4 rounded-[18px] px-4 text-left transition active:scale-[0.99] ${
                language === "de"
                  ? "bg-[#111820] text-white"
                  : "bg-[#f6f7f7] text-[#303b48]"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-[17px] font-bold ${
                  language === "de"
                    ? "bg-white/10"
                    : "bg-white"
                }`}
              >
                DE
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">
                  Deutsch
                </p>

                <p
                  className={`mt-0.5 text-[12px] ${
                    language === "de"
                      ? "text-white/65"
                      : "text-[#8a939d]"
                  }`}
                >
                  {t.settings.german}
                </p>
              </div>

              {language === "de" && (
                <Check size={19} />
              )}
            </button>

            {/* Русский */}
            <button
              type="button"
              onClick={() => setLanguage("ru")}
              className={`mt-2 flex min-h-[64px] w-full items-center gap-4 rounded-[18px] px-4 text-left transition active:scale-[0.99] ${
                language === "ru"
                  ? "bg-[#111820] text-white"
                  : "bg-[#f6f7f7] text-[#303b48]"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-[17px] font-bold ${
                  language === "ru"
                    ? "bg-white/10"
                    : "bg-white"
                }`}
              >
                RU
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">
                  Русский
                </p>

                <p
                  className={`mt-0.5 text-[12px] ${
                    language === "ru"
                      ? "text-white/65"
                      : "text-[#8a939d]"
                  }`}
                >
                  {t.settings.russian}
                </p>
              </div>

              {language === "ru" && (
                <Check size={19} />
              )}
            </button>

          </div>
        </section>

        {/* Logout */}
        <section className="mt-4 overflow-hidden rounded-[24px] border border-red-100 bg-white shadow-[0_4px_18px_rgba(17,24,32,0.04)]">

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex min-h-[68px] w-full items-center gap-4 px-5 text-left transition active:bg-red-50 disabled:opacity-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-red-50 text-[#b42318]">
              <LogOut size={19} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-[#b42318]">
                {loggingOut
                  ? isRu
                    ? "Выходим..."
                    : "Abmelden..."
                  : t.settings.logout}
              </p>

              <p className="mt-0.5 text-[12px] text-[#a36b68]">
                {t.settings.logoutDescription}
              </p>
            </div>

            <ChevronRight
              size={19}
              className="text-[#d49b97]"
            />
          </button>
        </section>

        <p className="mt-6 px-2 text-center text-[12px] text-[#9aa2aa]">
          {t.common.appName} ·{" "}
          {isRu
            ? "Рабочее пространство команды"
            : "Team Workspace"}
        </p>
      </div>
    </main>
  );
}