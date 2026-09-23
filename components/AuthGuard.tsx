"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  LogIn,
  UserRoundPlus,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type AuthGuardProps = {
  children: ReactNode;
};

type Language = "de" | "ru";

const publicRoutes = [
  "/login",
  "/register",
  "/forgot-password",
];

const recoveryRoute = "/update-password";

export default function AuthGuard({
  children,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] =
    useState(true);

  const [sessionExists, setSessionExists] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      const isPublicRoute =
        publicRoutes.includes(pathname);

      const isRecoveryRoute =
        pathname === recoveryRoute;

      if (!session) {
        setSessionExists(false);

        if (
          isPublicRoute ||
          isRecoveryRoute
        ) {
          setChecking(false);
          return;
        }

        /*
         * The root page is now the public landing page.
         * Other protected pages still go to Login.
         */
        if (pathname !== "/") {
          router.replace("/login");
          return;
        }

        setChecking(false);
        return;
      }

      setSessionExists(true);

      /*
       * The recovery page must remain accessible
       * after clicking the Supabase reset link.
       */
      if (isRecoveryRoute) {
        setChecking(false);
        return;
      }

      /*
       * Authenticated users should not see
       * Login, Register or Forgot Password.
       */
      if (isPublicRoute) {
        router.replace("/");
        return;
      }

      setChecking(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        /*
         * Supabase uses PASSWORD_RECOVERY when
         * the user opens the password-reset link.
         */
        if (
          event === "PASSWORD_RECOVERY" &&
          pathname === recoveryRoute
        ) {
          setSessionExists(true);
          setChecking(false);
          return;
        }

        /*
         * Never interrupt the recovery page
         * while the session is being established.
         */
        if (pathname === recoveryRoute) {
          setChecking(false);
          return;
        }

        if (!session) {
          setSessionExists(false);

          if (
            publicRoutes.includes(pathname) ||
            pathname === "/"
          ) {
            setChecking(false);
            return;
          }

          router.replace("/login");
          return;
        }

        setSessionExists(true);

        if (
          publicRoutes.includes(pathname)
        ) {
          router.replace("/");
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (checking) {
    return <LoadingScreen />;
  }

  /*
   * Public homepage for visitors.
   * The authenticated homepage remains unchanged.
   */
  if (
    pathname === "/" &&
    !sessionExists
  ) {
    return <PublicLanding />;
  }

  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f6] px-6">
      <div className="flex flex-col items-center">
        <div className="relative h-16 w-16">
          <Image
            src="/tlite-logo.png"
            alt="TLight"
            fill
            priority
            sizes="64px"
            className="object-contain"
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-[#687585]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d8dce1] border-t-[#111820]" />
          <span>TLight</span>
        </div>
      </div>
    </main>
  );
}

function PublicLanding() {
  const router = useRouter();

  const [language, setLanguage] =
    useState<Language>("de");

  const isRu = language === "ru";

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f7f6] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[430px] flex-col">

        {/* Header */}
        <header className="flex items-center justify-between px-1">
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
        </header>

        {/* Main content */}
        <section className="flex flex-1 flex-col justify-center py-12">

          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#e1e4e8] bg-white px-3.5 py-2 shadow-[0_3px_12px_rgba(17,24,32,0.04)]">
            <span className="h-2 w-2 rounded-full bg-[#526d5b]" />

            <span className="text-[11px] font-semibold tracking-[0.07em] text-[#687585]">
              {isRu
                ? "ВАШЕ ОБЩЕЕ ПРОСТРАНСТВО"
                : "EIN GEMEINSAMER ORT"}
            </span>
          </div>

          <h1 className="max-w-[390px] text-[43px] font-bold leading-[0.98] tracking-[-0.055em] text-[#111820]">
            {isRu ? (
              <>
                Служение.
                <br />
                Команда.
                <br />
                В одном месте.
              </>
            ) : (
              <>
                Dienst.
                <br />
                Team.
                <br />
                Ein Ort.
              </>
            )}
          </h1>

          <p className="mt-6 max-w-[360px] text-[17px] leading-7 text-[#687585]">
            {isRu
              ? "TLight помогает команде организовывать служения, задачи, материалы и общие планы без лишней сложности."
              : "TLight hilft deinem Team, Dienste, Aufgaben, Materialien und gemeinsame Pläne einfach an einem Ort zu organisieren."}
          </p>

          {/* Visual card */}
          <div className="relative mt-8 overflow-hidden rounded-[28px] bg-[#111820] p-5 text-white shadow-[0_14px_35px_rgba(17,24,32,0.15)]">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/10" />
            <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full border border-white/10" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  TLight
                </span>

                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                  <KeyRound
                    size={15}
                    strokeWidth={1.8}
                  />
                </div>
              </div>

              <div className="mt-8 text-[22px] font-semibold tracking-[-0.03em]">
                {isRu
                  ? "Меньше хаоса."
                  : "Weniger Chaos."}
              </div>

              <div className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-white/55">
                {isRu
                  ? "Больше движения."
                  : "Mehr Fortschritt."}
              </div>

              <div className="mt-7 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[72%] rounded-full bg-white" />
                </div>

                <span className="text-[11px] font-semibold text-white/60">
                  72%
                </span>
              </div>

              <div className="mt-2 text-[11px] text-white/45">
                {isRu
                  ? "Общие задачи команды"
                  : "Gemeinsame Teamaufgaben"}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="group flex h-[62px] w-full items-center justify-center gap-3 rounded-full bg-[#111820] text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(17,24,32,0.14)] transition active:scale-[0.985]"
            >
              <LogIn
                size={19}
                strokeWidth={1.9}
              />

              <span>
                {isRu
                  ? "Войти в аккаунт"
                  : "Anmelden"}
              </span>

              <ArrowRight
                size={19}
                strokeWidth={2}
                className="transition-transform group-active:translate-x-0.5"
              />
            </button>

            <button
              type="button"
              onClick={() => router.push("/register")}
              className="flex h-[62px] w-full items-center justify-center gap-3 rounded-full border border-[#dfe2e5] bg-white text-[16px] font-semibold text-[#111820] shadow-[0_3px_12px_rgba(17,24,32,0.04)] transition active:scale-[0.985]"
            >
              <UserRoundPlus
                size={19}
                strokeWidth={1.9}
              />

              <span>
                {isRu
                  ? "Создать аккаунт"
                  : "Konto erstellen"}
              </span>
            </button>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-t border-[#e1e4e8] pt-5">
          <div className="grid grid-cols-3 gap-3">
            <LandingBenefit
              icon={<CheckCircle2 size={16} strokeWidth={1.8} />}
              text={
                isRu
                  ? "Задачи"
                  : "Aufgaben"
              }
            />

            <LandingBenefit
              icon={<LockKeyhole size={16} strokeWidth={1.8} />}
              text={
                isRu
                  ? "Безопасно"
                  : "Sicher"
              }
            />

            <LandingBenefit
              icon={<KeyRound size={16} strokeWidth={1.8} />}
              text={
                isRu
                  ? "Команда"
                  : "Team"
              }
            />
          </div>

          <p className="mt-5 text-center text-[11px] leading-5 text-[#9aa2ab]">
            {isRu
              ? "TLight — рабочее пространство для команды служения"
              : "TLight — dein Workspace für den gemeinsamen Dienst"}
          </p>
        </section>
      </div>
    </main>
  );
}

function LandingBenefit({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#687585] shadow-[0_3px_12px_rgba(17,24,32,0.04)]">
        {icon}
      </div>

      <span className="text-[11px] font-semibold text-[#687585]">
        {text}
      </span>
    </div>
  );
}