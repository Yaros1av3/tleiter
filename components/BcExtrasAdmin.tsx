"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Camera, Loader2, Trash2 } from "lucide-react";

import { bcCall } from "@/lib/bcAdminClient";
import { useLanguage } from "@/components/LanguageProvider";
import { cx, ui } from "@/components/BcUi";

type Person = { id: number; first_name: string; last_name: string; nickname: string };
type Item = {
  id: number;
  kind: "story" | "verse";
  day: string;
  channel: string | null;
  verse_ref: string | null;
  points: number;
  photo_url: string | null;
  name: string;
  nickname: string;
};

/* Доп. задания: зачесть выученный стих и посмотреть сторис подростков */
export default function BcExtrasAdmin({ seasonId }: { seasonId: number | null }) {
  const { language } = useLanguage();
  const ru = language === "ru";
  const L = (r: string, d: string) => (ru ? r : d);

  const [people, setPeople] = useState<Person[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [pid, setPid] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data } = await bcCall<{ people?: Person[]; items?: Item[] }>(
      "GET",
      `/api/bc-admin/extras${seasonId ? `?season=${seasonId}` : ""}`,
    );
    setPeople(data.people ?? []);
    setItems(data.items ?? []);
    setLoading(false);
  }, [seasonId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addVerse() {
    if (!pid || ref.trim().length < 3 || busy) return;
    setBusy(true);
    setMsg("");
    const { ok } = await bcCall("POST", "/api/bc-admin/extras", {
      action: "verse_add",
      participant_id: Number(pid),
      verse_ref: ref.trim(),
    });
    setBusy(false);
    if (!ok) {
      setMsg(L("Не удалось сохранить. Проверьте, что сезон активен.", "Speichern fehlgeschlagen. Ist die Saison aktiv?"));
      return;
    }
    setMsg(L("Стих засчитан", "Vers angerechnet"));
    setRef("");
    void load();
  }

  async function remove(id: number) {
    if (!window.confirm(L("Убрать эту запись и баллы за неё?", "Diesen Eintrag samt Punkten entfernen?"))) return;
    await bcCall("POST", "/api/bc-admin/extras", { action: "extra_delete", id });
    void load();
  }

  const channelName = (c: string | null) =>
    c === "whatsapp" ? "WhatsApp" : c === "instagram" ? "Instagram" : L("WhatsApp и Instagram", "WhatsApp und Instagram");

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-[16px] font-extrabold tracking-[-0.01em]">{L("Дополнительные задания", "Extra-Aufgaben")}</h3>

      <div className="space-y-2.5 rounded-[18px] border border-[#ece6d3] bg-white p-4">
        <p className="flex items-center gap-2 text-[14px] font-bold">
          <BookOpen size={16} className="text-[#9a6b00]" />
          {L("Зачесть выученный стих", "Gelernten Vers anrechnen")}
        </p>
        <select className={ui.input} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">{L("Выберите подростка", "Teen auswählen")}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.first_name} {p.last_name} ({p.nickname})
            </option>
          ))}
        </select>
        <input
          className={ui.input}
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder={L("Стих, например Иоанна 3:16", "Vers, z. B. Johannes 3,16")}
          maxLength={120}
        />
        <button
          type="button"
          onClick={addVerse}
          disabled={!pid || ref.trim().length < 3 || busy}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#1b2431] text-[14px] font-bold text-white disabled:opacity-40"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {L("Засчитать стих", "Vers anrechnen")}
        </button>
        {msg && <p className="text-[13px] text-[#9a6b00]">{msg}</p>}
        <p className="text-[12px] text-[#8a8678]">
          {L(
            "Баллы начисляются сразу. Количество стихов не ограничено.",
            "Punkte werden sofort gutgeschrieben. Die Zahl der Verse ist nicht begrenzt.",
          )}
        </p>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-[13px] text-[#8a8678]">…</p>
        ) : items.length === 0 ? (
          <p className="text-[13px] text-[#8a8678]">{L("Пока нет сторис и стихов.", "Noch keine Stories oder Verse.")}</p>
        ) : (
          items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-[16px] border border-[#ece6d3] bg-white p-3">
              {it.kind === "story" && it.photo_url ? (
                <a href={it.photo_url} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.photo_url} alt="" className="h-14 w-14 rounded-[10px] object-cover" />
                </a>
              ) : (
                <span className={cx("flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-[#fff4d1] text-[#9a6b00]")}>
                  {it.kind === "story" ? <Camera size={20} /> : <BookOpen size={20} />}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{it.name}</p>
                <p className="truncate text-[12px] text-[#8a8678]">
                  {it.kind === "story" ? `${L("Сторис", "Story")}: ${channelName(it.channel)}` : `${L("Стих", "Vers")}: ${it.verse_ref}`}
                  {" · "}
                  {it.day} · +{it.points}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(it.id)}
                aria-label={L("Убрать", "Entfernen")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8a8678] hover:bg-[#f3efe2]"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}