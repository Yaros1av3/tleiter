"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, Plus, Trash2, UserX } from "lucide-react";

import { supabase } from "@/lib/supabase";

type Invite = { id: number; code: string; role_title: string | null; expires_at: string; revoked: boolean; uses: number };
type Guest = { user_id: string; name: string; created_at: string };

async function api(method: "GET" | "POST", query: string, body?: unknown) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? "";
  const r = await fetch(`/api/camps/invites${query}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error("api");
  return r.json();
}

function fmt(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export default function CampAccess({ campId, isRu }: { campId: number; isRu: boolean }) {
  const t = (ru: string, de: string) => (isRu ? ru : de);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [days, setDays] = useState(60);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api("GET", `?camp_id=${campId}`);
      setInvites(d.invites);
      setGuests(d.guests);
      setError("");
    } catch {
      setError(t("Не удалось загрузить. Выполнен ли camp-guests.sql?", "Laden fehlgeschlagen. Wurde camp-guests.sql ausgeführt?"));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campId]);

  useEffect(() => {
    load();
  }, [load]);

  const link = (code: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/camp-join?code=${code}`;

  async function create() {
    setBusy(true);
    try {
      await api("POST", "", { action: "create", camp_id: campId, role_title: role.trim(), days });
      setRole("");
      await load();
    } catch {
      setError(t("Не удалось создать ссылку.", "Link konnte nicht erstellt werden."));
    }
    setBusy(false);
  }

  async function copy(inv: Invite) {
    try {
      await navigator.clipboard.writeText(link(inv.code));
      setCopied(inv.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.prompt(t("Скопируйте ссылку", "Link kopieren"), link(inv.code));
    }
  }

  async function revoke(id: number) {
    if (!confirm(t("Отозвать ссылку? По ней больше нельзя будет войти.", "Link zurückziehen? Danach kann sich niemand mehr damit anmelden."))) return;
    await api("POST", "", { action: "revoke", id });
    load();
  }

  async function removeGuest(g: Guest) {
    if (!confirm(t(`Закрыть доступ для ${g.name}?`, `Zugang für ${g.name} entfernen?`))) return;
    await api("POST", "", { action: "remove_guest", camp_id: campId, user_id: g.user_id });
    load();
  }

  const now = Date.now();

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#ece6d3]">
        <h3 className="text-[16px] font-extrabold">{t("Доступ для помощников", "Zugang für Helfer")}</h3>
        <p className="mt-1 text-[13px] leading-snug text-[#8a8678]">
          {t(
            "Для тех, кто служит только в лагере. Человек открывает ссылку, создаёт аккаунт и видит только этот лагерь: программу, команду, заявки, отряды, материалы и заезд. Остальное в TLight для него закрыто.",
            "Für alle, die nur im Camp mitarbeiten. Sie öffnen den Link, erstellen ein Konto und sehen nur dieses Camp. Alles andere in TLight bleibt geschlossen.",
          )}
        </p>

        <div className="mt-3 grid gap-2">
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={t("Роль в лагере (например, Кухня)", "Rolle im Camp (z. B. Küche)")}
            className="w-full rounded-[12px] border border-[#e2dcc8] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1b2431]"
          />
          <div className="flex gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-11 flex-1 rounded-[12px] border border-[#e2dcc8] bg-white px-3 text-[14px]"
            >
              <option value={30}>{t("Действует 30 дней", "30 Tage gültig")}</option>
              <option value={60}>{t("Действует 60 дней", "60 Tage gültig")}</option>
              <option value={120}>{t("Действует 120 дней", "120 Tage gültig")}</option>
            </select>
            <button
              type="button"
              onClick={create}
              disabled={busy}
              className="flex h-11 items-center gap-1.5 rounded-[12px] bg-[#1b2431] px-4 text-[14px] font-bold text-[#ffc93c] disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {t("Ссылка", "Link")}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-[13px] font-semibold text-red-600">{error}</p>}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-[#8a8678]" />
        </div>
      ) : (
        <>
          {invites.length > 0 && (
            <div className="space-y-2">
              {invites.map((inv) => {
                const dead = inv.revoked || new Date(inv.expires_at).getTime() < now;
                return (
                  <div key={inv.id} className={`rounded-[18px] bg-white p-3 ring-1 ring-[#ece6d3] ${dead ? "opacity-55" : ""}`}>
                    <div className="flex items-center gap-2">
                      <Link2 size={16} className="shrink-0 text-[#9a6b00]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold">{inv.role_title || t("Без роли", "Ohne Rolle")}</p>
                        <p className="text-[11.5px] text-[#8a8678]">
                          {inv.revoked ? t("отозвана", "zurückgezogen") : dead ? t("истекла", "abgelaufen") : t(`до ${fmt(inv.expires_at)}`, `bis ${fmt(inv.expires_at)}`)}
                          {" · "}
                          {t(`вошли: ${inv.uses}`, `beigetreten: ${inv.uses}`)}
                        </p>
                      </div>
                      {!dead && (
                        <>
                          <button type="button" onClick={() => copy(inv)} className="flex h-9 items-center gap-1 rounded-full bg-[#ffc93c] px-3 text-[12px] font-bold text-[#1b2431]">
                            {copied === inv.id ? <Check size={14} /> : <Copy size={14} />}
                            {copied === inv.id ? t("Готово", "Kopiert") : t("Копировать", "Kopieren")}
                          </button>
                          <button type="button" onClick={() => revoke(inv.id)} aria-label="Revoke" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6f3e8] text-[#8a8678]">
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#ece6d3]">
            <h3 className="text-[15px] font-extrabold">{t("Кто уже вошёл", "Wer hat bereits Zugang")}</h3>
            {guests.length === 0 ? (
              <p className="mt-1 text-[13px] text-[#8a8678]">{t("Пока никого.", "Noch niemand.")}</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#f1eee4]">
                {guests.map((g) => (
                  <li key={g.user_id} className="flex items-center gap-2 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{g.name}</span>
                    <button type="button" onClick={() => removeGuest(g)} className="flex h-8 items-center gap-1 rounded-full bg-[#f6f3e8] px-3 text-[12px] font-bold text-[#8a8678]">
                      <UserX size={13} />
                      {t("Закрыть доступ", "Entfernen")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}