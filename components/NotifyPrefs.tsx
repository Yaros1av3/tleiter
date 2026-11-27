"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";

import { supabase } from "@/lib/supabase";

type Cat = {
  key: string;
  ru: string;
  de: string;
  descRu: string;
  descDe: string;
  adminOnly?: boolean;
};

const CATS: Cat[] = [
  {
    key: "schedule",
    ru: "Моё служение",
    de: "Mein Dienst",
    descRu: "Когда меня ставят в расписание, снимают или переносят служение",
    descDe: "Wenn ich eingeteilt, entfernt oder der Dienst verschoben wird",
  },
  {
    key: "event",
    ru: "Календарь",
    de: "Kalender",
    descRu: "Новые и изменённые термины",
    descDe: "Neue und geänderte Termine",
  },
  {
    key: "idea",
    ru: "Идеи",
    de: "Ideen",
    descRu: "Когда кто-то добавил идею",
    descDe: "Wenn jemand eine Idee hinzufügt",
  },
  {
    key: "teen",
    ru: "Подростки",
    de: "Teens",
    descRu: "Новый подросток в списке",
    descDe: "Neuer Teenager in der Liste",
  },
  {
    key: "trip",
    ru: "Поездки и голосования",
    de: "Fahrten und Abstimmungen",
    descRu: "Новая поездка или голосование",
    descDe: "Neue Fahrt oder Abstimmung",
  },
  {
    key: "material",
    ru: "Материалы",
    de: "Materialien",
    descRu: "Новые материалы",
    descDe: "Neue Materialien",
  },
  {
    key: "camp",
    ru: "Лагеря",
    de: "Camps",
    descRu: "Новый лагерь",
    descDe: "Neues Camp",
  },
  {
    key: "camp_reg",
    ru: "Заявки в лагерь",
    de: "Camp-Anmeldungen",
    descRu: "Новая заявка на лагерь",
    descDe: "Neue Anmeldung fürs Camp",
    adminOnly: true,
  },
  {
    key: "feedback",
    ru: "Сообщения подростков",
    de: "Nachrichten von Teens",
    descRu: "Когда подросток написал нам",
    descDe: "Wenn ein Teenager uns schreibt",
    adminOnly: true,
  },
];

export default function NotifyPrefs({ isRu }: { isRu: boolean }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!uid || !alive) {
        setLoaded(true);
        return;
      }
      setUserId(uid);

      const [{ data: rows }, { data: me }] = await Promise.all([
        supabase.from("notify_mutes").select("category").eq("user_id", uid),
        supabase.from("profiles").select("role").eq("id", uid).maybeSingle(),
      ]);

      if (!alive) return;
      setMuted(new Set((rows ?? []).map((r) => r.category as string)));
      setIsAdmin(me?.role === "admin");
      setLoaded(true);
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function toggle(key: string) {
    if (!userId || busy) return;
    setBusy(key);

    const wasMuted = muted.has(key);
    const next = new Set(muted);
    if (wasMuted) next.delete(key);
    else next.add(key);
    setMuted(next);

    const { error } = wasMuted
      ? await supabase.from("notify_mutes").delete().eq("user_id", userId).eq("category", key)
      : await supabase.from("notify_mutes").insert({ user_id: userId, category: key });

    if (error) setMuted(muted); // вернуть как было
    setBusy(null);
  }

  if (!loaded || !userId) return null;

  const list = CATS.filter((c) => !c.adminOnly || isAdmin);

  return (
    <section className="mt-4 overflow-hidden rounded-[24px] border border-[#ebe6d8] bg-white shadow-[0_4px_18px_rgba(27,36,49,0.04)]">
      <div className="flex items-center gap-3 px-5 pb-2 pt-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#fff4d1] text-[#9a6b00]">
          <BellRing size={19} />
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-[#1b2431]">
            {isRu ? "Что присылать" : "Was ich erhalten möchte"}
          </h2>
          <p className="text-[12px] text-[#8a939d]">
            {isRu ? "Выключите то, что вам не нужно" : "Schalte aus, was du nicht brauchst"}
          </p>
        </div>
      </div>

      <div className="divide-y divide-[#f1eee4] px-5 pb-2">
        {list.map((c) => {
          const on = !muted.has(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggle(c.key)}
              className="flex w-full items-center gap-3 py-3 text-left"
              aria-pressed={on}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#1b2431]">{isRu ? c.ru : c.de}</p>
                <p className="text-[11.5px] leading-snug text-[#8a939d]">{isRu ? c.descRu : c.descDe}</p>
              </div>
              <span
                className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${
                  on ? "bg-[#ffc93c]" : "bg-[#e3e0d4]"
                }`}
              >
                <span
                  className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ${
                    on ? "left-[23px]" : "left-[3px]"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}