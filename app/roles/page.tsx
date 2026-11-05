"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck, ShieldOff, UserRound } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";

/* Главный админ определяется на сервере; здесь почта только для подписи и скрытия кнопок */
const SUPER_ADMIN_EMAIL = "yargalaychuk@gmail.com";

type Account = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "user";
};

export default function RolesPage() {
  const router = useRouter();
  const toast = useToast();
  const { language } = useLanguage();
  const isRu = language === "ru";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    setMyId(user.id);
    setIsSuper((user.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL);

    const { data, error } = await supabase.rpc("list_user_roles");

    if (error) {
      console.error("list_user_roles error:", error);
      setAllowed(false);
      setLoading(false);
      return;
    }

    setAccounts((data ?? []) as Account[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(account: Account, role: "admin" | "user") {
    const name = account.full_name || account.email;

    const ok = window.confirm(
      role === "admin"
        ? isRu
          ? `Сделать ${name} админом?`
          : `${name} zum Admin machen?`
        : isRu
          ? `Снять роль админа у ${name}?`
          : `Admin-Rolle von ${name} entfernen?`,
    );

    if (!ok) return;

    setBusyId(account.user_id);

    const { error } = await supabase.rpc("set_user_role", { target: account.user_id, new_role: role });

    setBusyId(null);

    if (error) {
      console.error("set_user_role error:", error);
      toast.error(isRu ? "Не удалось изменить роль." : "Rolle konnte nicht geändert werden.");
      return;
    }

    toast.success(isRu ? "Роль обновлена" : "Rolle aktualisiert");
    await load();
  }

  const label = "text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9585]";

  const renderRow = (account: Account) => {
    const superAccount = account.email.toLowerCase() === SUPER_ADMIN_EMAIL;
    const me = account.user_id === myId;
    const busy = busyId === account.user_id;

    return (
      <li key={account.user_id} className="flex items-center gap-3 px-4 py-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
            account.role === "admin" ? "bg-[#1b2431] text-[#ffc93c]" : "bg-[#f3efe3] text-[#6f6a5c]"
          }`}
        >
          {account.role === "admin" ? <ShieldCheck size={17} /> : <UserRound size={17} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold">
            {account.full_name || account.email}
            {me && <span className="ml-1.5 text-[11px] font-medium text-[#9a9585]">{isRu ? "(ты)" : "(du)"}</span>}
          </p>
          <p className="truncate text-[12px] text-[#8a8678]">{account.email}</p>
        </div>

        {superAccount ? (
          <span className="shrink-0 rounded-full bg-[#fff4d1] px-2.5 py-1 text-[10px] font-bold text-[#9a6b00]">
            {isRu ? "Главный админ" : "Hauptadmin"}
          </span>
        ) : account.role === "user" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => changeRole(account, "admin")}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#1b2431] px-3.5 text-[12px] font-bold text-[#ffc93c] active:scale-95 disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
            {isRu ? "Сделать админом" : "Zum Admin"}
          </button>
        ) : isSuper && !me ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => changeRole(account, "user")}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#e9e3d3] px-3.5 text-[12px] font-bold text-[#6f6a5c] active:scale-95 disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldOff size={13} />}
            {isRu ? "Снять" : "Entziehen"}
          </button>
        ) : (
          <span className="shrink-0 rounded-full bg-[#f3efe3] px-2.5 py-1 text-[10px] font-bold text-[#6f6a5c]">
            ADMIN
          </span>
        )}
      </li>
    );
  };

  const admins = accounts.filter((account) => account.role === "admin");
  const users = accounts.filter((account) => account.role !== "admin");

  return (
    <main className="min-h-screen bg-[#faf8f3] px-4 pb-28 pt-6 text-[#1b2431]">
      <div className="mx-auto max-w-[620px]">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="mb-4 flex items-center gap-1.5 text-[13px] font-semibold text-[#6f6a5c]"
        >
          <ArrowLeft size={15} />
          {isRu ? "Назад" : "Zurück"}
        </button>

        <p className={label}>{isRu ? "Доступ" : "Zugriff"}</p>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-[-0.02em]">
          {isRu ? "Роли в приложении" : "Rollen in der App"}
        </h1>

        <p className="mt-2 text-[13px] leading-5 text-[#7f796a]">
          {isRu
            ? "Админ может сделать админом любого участника. Снять роль админа может только главный админ."
            : "Admins können jedes Mitglied zum Admin machen. Die Admin-Rolle entziehen kann nur der Hauptadmin."}
        </p>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 size={22} className="animate-spin text-[#8a8678]" />
          </div>
        ) : !allowed ? (
          <div className="mt-6 rounded-[22px] border border-dashed border-[#d9d3c1] bg-white px-5 py-8 text-center text-sm text-[#8a8678]">
            {isRu ? "Этот раздел доступен только админам." : "Dieser Bereich ist nur für Admins."}
          </div>
        ) : (
          <>
            <p className={`${label} mb-2 mt-7`}>
              {isRu ? "Админы" : "Admins"} · {admins.length}
            </p>
            <ul className="divide-y divide-[#f0ebdc] overflow-hidden rounded-[22px] border border-[#e9e3d3] bg-white">
              {admins.map(renderRow)}
            </ul>

            <p className={`${label} mb-2 mt-7`}>
              {isRu ? "Участники" : "Mitglieder"} · {users.length}
            </p>
            {users.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[#d9d3c1] bg-white px-5 py-6 text-center text-sm text-[#8a8678]">
                {isRu ? "Других участников пока нет." : "Noch keine weiteren Mitglieder."}
              </div>
            ) : (
              <ul className="divide-y divide-[#f0ebdc] overflow-hidden rounded-[22px] border border-[#e9e3d3] bg-white">
                {users.map(renderRow)}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}