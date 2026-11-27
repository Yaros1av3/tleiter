"use client";

import Image from "next/image";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Tent } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Info = {
  camp: { id: number; title: string; start_date: string | null; end_date: string | null; location: string | null };
  role_title: string | null;
};

const inputCls =
  "w-full rounded-[14px] border border-[#e2dcc8] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#1b2431]";

function fmt(d: string | null) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

function JoinInner() {
  const router = useRouter();
  const code = useSearchParams().get("code") ?? "";
  const { language } = useLanguage();
  const isRu = language === "ru";
  const t = (ru: string, de: string) => (isRu ? ru : de);

  const [info, setInfo] = useState<Info | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "invalid">("loading");
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) {
      setState("invalid");
      return;
    }
    fetch(`/api/camps/join?code=${encodeURIComponent(code)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        setInfo(await r.json());
        setState("ok");
      })
      .catch(() => setState("invalid"));
  }, [code]);

  async function redeem() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("no session");
    const r = await fetch("/api/camps/join", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
    if (!r.ok) throw new Error("join");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();

    if (mode === "register" && name.trim().length < 2) {
      setError(t("Введите имя и фамилию.", "Bitte Vor- und Nachnamen eingeben."));
      return;
    }
    if (!cleanEmail || password.length < 6) {
      setError(t("Введите e-mail и пароль (минимум 6 символов).", "E-Mail und Passwort (mindestens 6 Zeichen) eingeben."));
      return;
    }

    setBusy(true);
    try {
      if (mode === "register") {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: name.trim(), camp_guest: "true" } },
        });
        if (err) throw new Error(err.message);
        if (!data.session) {
          setError(t("Подтвердите e-mail по письму и войдите снова по этой же ссылке.", "Bitte bestätige deine E-Mail und öffne den Link danach erneut."));
          setBusy(false);
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (err) throw new Error(t("Неверный e-mail или пароль.", "E-Mail oder Passwort falsch."));
      }
      await redeem();
      router.replace("/camps");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message !== "join" ? err.message : t("Не удалось принять приглашение.", "Einladung konnte nicht angenommen werden."));
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f3] px-4 py-8 text-[#1b2431]">
      <div className="mx-auto w-full max-w-[430px]">
        <div className="mb-7 flex items-center gap-3">
          <Image src="/tlite-logo.png" alt="TLight" width={48} height={48} priority className="h-12 w-12 rounded-[14px]" />
          <div>
            <div className="text-[24px] font-extrabold leading-none tracking-[-0.03em]">TLight</div>
            <div className="mt-1 text-[11px] font-semibold tracking-[0.05em] text-[#8a8678]">T-CAMPS</div>
          </div>
        </div>

        {state === "loading" && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-[#8a8678]" />
          </div>
        )}

        {state === "invalid" && (
          <div className="rounded-[22px] bg-white p-6 ring-1 ring-[#ece6d3]">
            <h1 className="text-[20px] font-extrabold">{t("Ссылка не работает", "Link ungültig")}</h1>
            <p className="mt-2 text-[14px] text-[#8a8678]">
              {t("Приглашение закончилось или было отозвано. Попросите организатора прислать новую ссылку.", "Die Einladung ist abgelaufen oder wurde zurückgezogen. Bitte um einen neuen Link.")}
            </p>
          </div>
        )}

        {state === "ok" && info && (
          <>
            <div className="rounded-[24px] bg-[#1b2431] p-5 text-white">
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-[#ffc93c]">
                <Tent size={15} /> {t("ПРИГЛАШЕНИЕ В ЛАГЕРЬ", "EINLADUNG INS CAMP")}
              </div>
              <h1 className="mt-2 text-[24px] font-extrabold leading-tight">{info.camp.title}</h1>
              <p className="mt-1 text-[13px] text-white/70">
                {[fmt(info.camp.start_date) && `${fmt(info.camp.start_date)} – ${fmt(info.camp.end_date)}`, info.camp.location].filter(Boolean).join(" · ")}
              </p>
              {info.role_title && (
                <p className="mt-3 inline-block rounded-full bg-[#ffc93c] px-3 py-1 text-[12px] font-bold text-[#1b2431]">{info.role_title}</p>
              )}
            </div>

            <div className="mt-4 flex rounded-[16px] bg-[#f1ecdc] p-1">
              {(["register", "login"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`h-10 flex-1 rounded-[12px] text-[13px] font-bold ${mode === m ? "bg-white shadow-sm" : "text-[#8a8678]"}`}
                >
                  {m === "register" ? t("Новый аккаунт", "Neues Konto") : t("У меня есть аккаунт", "Ich habe ein Konto")}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-4 space-y-3">
              {mode === "register" && (
                <input className={inputCls} placeholder={t("Имя и фамилия", "Vor- und Nachname")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              )}
              <input className={inputCls} type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <input className={inputCls} type="password" placeholder={t("Пароль", "Passwort")} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} />
              {error && <p className="text-[13px] font-semibold text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="flex h-[54px] w-full items-center justify-center rounded-full bg-[#1b2431] text-[15px] font-bold text-[#ffc93c] disabled:opacity-60"
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : mode === "register" ? t("Создать аккаунт и войти", "Konto erstellen und beitreten") : t("Войти и принять приглашение", "Anmelden und beitreten")}
              </button>
              <p className="text-center text-[12px] text-[#8a8678]">
                {t("Вы увидите только этот лагерь. Остальные разделы TLight останутся закрытыми.", "Du siehst nur dieses Camp. Alle anderen Bereiche bleiben geschlossen.")}
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default function CampJoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}