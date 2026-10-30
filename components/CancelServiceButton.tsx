"use client";

import { useCallback, useEffect, useState } from "react";
import { UserRoundX } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { REPLACEMENTS_UPDATED_EVENT } from "@/lib/useReplacementRequests";

/*
 * Кнопка «Не смогу — нужна замена» для главной страницы.
 * Делает то же, что кнопка в расписании: создаёт запрос на замену,
 * отмечает сервис как «не могу» в доступности и отправляет push.
 */

export type MyMember = {
  userId: string;
  memberId: number;
  name: string;
};

export function useMyMember() {
  const [me, setMe] = useState<MyMember | null>(null);
  const [requested, setRequested] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMe(null);
      return;
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("id, first_name, last_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      setMe(null);
      return;
    }

    setMe({
      userId: user.id,
      memberId: member.id as number,
      name: `${member.first_name} ${member.last_name}`.trim(),
    });

    const { data: requests } = await supabase
      .from("replacement_requests")
      .select("schedule_entry_id")
      .eq("team_member_id", member.id);

    setRequested(
      new Set((requests ?? []).map((row) => String(row.schedule_entry_id))),
    );
  }, []);

  useEffect(() => {
    load();

    window.addEventListener(REPLACEMENTS_UPDATED_EVENT, load);

    return () => window.removeEventListener(REPLACEMENTS_UPDATED_EVENT, load);
  }, [load]);

  return { me, requested, reload: load };
}

type Entry = {
  id: number;
  schedule_date: string;
  service_time: string;
};

export default function CancelServiceButton({
  entry,
  me,
  requested,
  isRu,
  onChanged,
}: {
  entry: Entry;
  me: MyMember;
  requested: boolean;
  isRu: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const time = String(entry.service_time).slice(0, 5);
  const shownTime = time === "13:00" ? "12:30" : time;

  async function submit() {
    setBusy(true);
    setError("");

    const cleanReason = reason.trim() || null;

    const { error: insertError } = await supabase
      .from("replacement_requests")
      .insert({
        schedule_entry_id: entry.id,
        team_member_id: me.memberId,
        reason: cleanReason,
      });

    if (insertError) {
      console.error("Replacement request error:", insertError);
      setError(
        isRu
          ? "Не удалось отправить. Попробуй ещё раз."
          : "Senden fehlgeschlagen. Versuche es noch einmal.",
      );
      setBusy(false);
      return;
    }

    /* в «Когда могу служить» этот сервис тоже становится «не могу» */
    try {
      const { data: existing } = await supabase
        .from("service_availability")
        .select("service_10, service_13, note")
        .eq("user_id", me.userId)
        .eq("sunday_date", entry.schedule_date)
        .maybeSingle();

      const s10 = time === "10:00" ? false : Boolean(existing?.service_10);
      const s13 = time === "10:00" ? Boolean(existing?.service_13) : false;

      await supabase.from("service_availability").upsert(
        {
          user_id: me.userId,
          member_name: me.name,
          sunday_date: entry.schedule_date,
          status: s10 || s13 ? "available" : "unavailable",
          service_10: s10,
          service_13: s13,
          note: existing?.note || cleanReason,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,sunday_date" },
      );

      window.dispatchEvent(new Event("availability-updated"));
    } catch (availabilityError) {
      console.error("Availability sync error:", availabilityError);
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        await fetch("/api/replacement-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ entryId: entry.id, memberId: me.memberId }),
        });
      }
    } catch (notifyError) {
      console.error("Replacement notify error:", notifyError);
    }

    setBusy(false);
    setOpen(false);
    setReason("");
    window.dispatchEvent(new Event(REPLACEMENTS_UPDATED_EVENT));
    onChanged();
  }

  async function withdraw() {
    setBusy(true);

    await supabase
      .from("replacement_requests")
      .delete()
      .eq("schedule_entry_id", entry.id)
      .eq("team_member_id", me.memberId);

    setBusy(false);
    window.dispatchEvent(new Event(REPLACEMENTS_UPDATED_EVENT));
    onChanged();
  }

  if (requested) {
    return (
      <div className="mt-2 flex items-center justify-between gap-3 rounded-[16px] border border-[#ffc93c]/60 bg-[#fff4d1] px-4 py-3">
        <span className="text-[13px] font-semibold text-[#9a6b00]">
          {isRu
            ? "Запрос на замену отправлен"
            : "Ersatzanfrage gesendet"}
        </span>

        <button
          type="button"
          disabled={busy}
          onClick={withdraw}
          className="shrink-0 text-[12px] font-bold text-[#1b2431] underline disabled:opacity-50"
        >
          {isRu ? "Я смогу, отозвать" : "Doch möglich"}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setReason("");
          setError("");
          setOpen(true);
        }}
        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-red-200 bg-red-50 text-[14px] font-bold text-red-700 transition active:scale-[0.99]"
      >
        <UserRoundX size={17} />
        {isRu ? "Не смогу — нужна замена" : "Ich kann nicht – Ersatz nötig"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-[#1b2431]/35 backdrop-blur-[3px] md:items-center md:p-5"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full rounded-t-[27px] bg-white p-5 shadow-2xl md:max-w-[460px] md:rounded-[22px]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-[18px] font-bold tracking-[-0.02em] text-[#1b2431]">
              {isRu ? "Не смогу служить" : "Ich kann nicht dienen"}
            </h2>

            <p className="mt-1 text-[13px] leading-snug text-[#6f6a5c]">
              {new Date(`${entry.schedule_date}T12:00:00`).toLocaleDateString(
                isRu ? "ru-RU" : "de-DE",
                { day: "numeric", month: "long" },
              )}
              {" · "}
              {shownTime}.{" "}
              {isRu
                ? "Админы и команда получат уведомление и найдут замену."
                : "Admins und Team werden benachrichtigt und suchen Ersatz."}
            </p>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={300}
              placeholder={isRu ? "Причина (по желанию)" : "Grund (optional)"}
              className="mt-3 w-full resize-none rounded-[14px] border border-[#e9e3d3] bg-[#fffdf8] px-3.5 py-3 text-[14px] outline-none focus:border-[#1b2431]"
            />

            {error && (
              <p className="mt-2 text-[13px] font-semibold text-red-600">
                {error}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="h-12 flex-1 rounded-[14px] bg-[#f3efe3] text-[14px] font-semibold text-[#6f6a5c]"
              >
                {isRu ? "Отмена" : "Abbrechen"}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="h-12 flex-[1.4] rounded-[14px] bg-red-600 text-[14px] font-bold text-white disabled:opacity-60"
              >
                {busy
                  ? isRu
                    ? "Отправляю…"
                    : "Sende…"
                  : isRu
                    ? "Сообщить"
                    : "Melden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}