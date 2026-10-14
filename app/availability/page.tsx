"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import {
  AVAILABILITY_UPDATED_EVENT,
  getNextMonth,
  isReminderWindow,
} from "@/lib/useAvailabilityReminder";

/* =====================================================
   TYPES
===================================================== */

type Status = "available" | "unavailable";

type Draft = {
  status: Status | null;
  s10: boolean;
  s13: boolean;
  note: string;
};

type AvailabilityRow = {
  user_id: string;
  member_name: string;
  sunday_date: string;
  status: Status;
  service_10: boolean;
  service_13: boolean;
  note: string | null;
};

type TeamMemberRow = {
  first_name: string;
  last_name: string;
  user_id: string | null;
};

/* =====================================================
   HELPERS
===================================================== */

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function getSundays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const result: string[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);

    if (date.getDay() === 0) {
      result.push(toDateString(date));
    }
  }

  return result;
}

function emptyDraft(): Draft {
  return { status: null, s10: false, s13: false, note: "" };
}

/* =====================================================
   PAGE
===================================================== */

export default function AvailabilityPage() {
  const { language } = useLanguage();
  const isRu = language === "ru";
  const locale = isRu ? "ru-RU" : "de-DE";

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"mine" | "overview">("mine");

  /* в конце месяца форма сразу открывается на следующий месяц */
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();

    return isReminderWindow(now)
      ? getNextMonth(now)
      : new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const sundays = useMemo(() => getSundays(viewMonth), [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  const todayString = toDateString(new Date());

  /* ---------- моя доступность ---------- */

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loadingMine, setLoadingMine] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  /* ---------- сводка для админов ---------- */

  const [overviewRows, setOverviewRows] = useState<AvailabilityRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);

  /* ---------- пользователь и роль ---------- */

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserId(user.id);
      setUserEmail(user.email ?? "");

      const { data } = await supabase.rpc("is_admin");

      setIsAdmin(data === true);

      if (
        data === true &&
        new URLSearchParams(window.location.search).get("tab") === "overview"
      ) {
        setTab("overview");
      }
    }

    init();
  }, []);

  /* ---------- загрузка моих ответов за месяц ---------- */

  useEffect(() => {
    if (!userId) return;

    const currentUserId: string = userId;
    let cancelled = false;

    async function loadMine() {
      setLoadingMine(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("service_availability")
        .select("sunday_date, status, service_10, service_13, note")
        .eq("user_id", currentUserId)
        .gte("sunday_date", sundays[0] ?? toDateString(viewMonth))
        .lte("sunday_date", sundays[sundays.length - 1] ?? toDateString(viewMonth));

      if (cancelled) return;

      if (error) {
        console.error("Availability load:", error.message, error.code);
        setMessage({
          type: "error",
          text: isRu
            ? "Не удалось загрузить. Проверь, что SQL выполнен в Supabase."
            : "Konnte nicht geladen werden. Prüfe, ob das SQL in Supabase ausgeführt wurde.",
        });
        setDrafts({});
        setLoadingMine(false);
        return;
      }

      const next: Record<string, Draft> = {};

      for (const row of data ?? []) {
        next[row.sunday_date as string] = {
          status: row.status as Status,
          s10: row.service_10 as boolean,
          s13: row.service_13 as boolean,
          note: (row.note as string | null) ?? "",
        };
      }

      setDrafts(next);
      setLoadingMine(false);
    }

    loadMine();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, viewMonth]);

  /* ---------- загрузка сводки (только админ) ---------- */

  useEffect(() => {
    if (!isAdmin || tab !== "overview") return;

    let cancelled = false;

    async function loadOverview() {
      setLoadingOverview(true);

      const first = sundays[0] ?? toDateString(viewMonth);
      const last = sundays[sundays.length - 1] ?? first;

      const [availabilityResult, teamResult] = await Promise.all([
        supabase
          .from("service_availability")
          .select(
            "user_id, member_name, sunday_date, status, service_10, service_13, note",
          )
          .gte("sunday_date", first)
          .lte("sunday_date", last),
        supabase
          .from("team_members")
          .select("first_name, last_name, user_id")
          .eq("status", "active"),
      ]);

      if (cancelled) return;

      if (availabilityResult.error) {
        console.error(
          "Availability overview:",
          availabilityResult.error.message,
        );
      }

      setOverviewRows((availabilityResult.data ?? []) as AvailabilityRow[]);
      setTeamMembers((teamResult.data ?? []) as TeamMemberRow[]);
      setLoadingOverview(false);
    }

    loadOverview();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab, viewMonth]);

  /* ---------- редактирование ---------- */

  function getDraft(date: string): Draft {
    return drafts[date] ?? emptyDraft();
  }

  function updateDraft(date: string, patch: Partial<Draft>) {
    setMessage(null);

    setDrafts((current) => ({
      ...current,
      [date]: { ...(current[date] ?? emptyDraft()), ...patch },
    }));
  }

  function setStatus(date: string, status: Status) {
    const draft = getDraft(date);

    if (status === "available") {
      const none = !draft.s10 && !draft.s13;

      updateDraft(date, {
        status,
        s10: none ? true : draft.s10,
        s13: none ? true : draft.s13,
      });
    } else {
      updateDraft(date, { status, s10: false, s13: false });
    }
  }

  function shiftMonth(delta: number) {
    setViewMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  function goToCurrentMonth() {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  async function resolveName() {
    if (!userId) return userEmail;

    const { data: member } = await supabase
      .from("team_members")
      .select("first_name, last_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (member) {
      return `${member.first_name} ${member.last_name}`.trim();
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    return (profile?.full_name as string | undefined)?.trim() || userEmail;
  }

  async function submit() {
    if (!userId || saving) return;

    const answered = sundays.filter((date) => drafts[date]?.status);

    if (answered.length === 0) {
      setMessage({
        type: "error",
        text: isRu
          ? "Отметь хотя бы одно воскресенье."
          : "Markiere mindestens einen Sonntag.",
      });
      return;
    }

    const invalid = answered.find((date) => {
      const draft = drafts[date];
      return draft.status === "available" && !draft.s10 && !draft.s13;
    });

    if (invalid) {
      setMessage({
        type: "error",
        text: isRu
          ? "Выбери служение (10:00 или 13:00) или отметь «Не могу»."
          : "Wähle einen Gottesdienst (10:00 oder 13:00) oder markiere „Kann nicht“.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    const name = await resolveName();

    const payload = answered.map((date) => {
      const draft = drafts[date];

      return {
        user_id: userId,
        member_name: name,
        sunday_date: date,
        status: draft.status as Status,
        service_10: draft.status === "available" && draft.s10,
        service_13: draft.status === "available" && draft.s13,
        note: draft.note.trim() || null,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from("service_availability")
      .upsert(payload, { onConflict: "user_id,sunday_date" });

    setSaving(false);

    if (error) {
      console.error("Availability save:", error.message, error.code);
      setMessage({
        type: "error",
        text: isRu
          ? "Не удалось отправить. Попробуй ещё раз."
          : "Senden fehlgeschlagen. Versuche es noch einmal.",
      });
      return;
    }

    window.dispatchEvent(new Event(AVAILABILITY_UPDATED_EVENT));

    setMessage({
      type: "ok",
      text: isRu ? "Отправлено — спасибо!" : "Gesendet — danke!",
    });
  }

  /* ---------- данные для сводки ---------- */

  const overview = useMemo(() => {
    const byUser = new Map<
      string,
      { name: string; cells: Map<string, AvailabilityRow> }
    >();

    for (const row of overviewRows) {
      const entry = byUser.get(row.user_id) ?? {
        name: row.member_name || "—",
        cells: new Map<string, AvailabilityRow>(),
      };

      entry.cells.set(row.sunday_date, row);
      byUser.set(row.user_id, entry);
    }

    const people = Array.from(byUser.entries())
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));

    const counts = sundays.map((date) => {
      let s10 = 0;
      let s13 = 0;

      for (const person of people) {
        const cell = person.cells.get(date);

        if (cell?.status === "available") {
          if (cell.service_10) s10 += 1;
          if (cell.service_13) s13 += 1;
        }
      }

      return { date, s10, s13 };
    });

    const respondedIds = new Set(byUser.keys());

    const notResponded = teamMembers
      .filter((member) => !member.user_id || !respondedIds.has(member.user_id))
      .map((member) => ({
        name: `${member.first_name} ${member.last_name}`.trim(),
        noAccount: !member.user_id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));

    const notes = overviewRows
      .filter((row) => row.note)
      .sort(
        (a, b) =>
          a.sunday_date.localeCompare(b.sunday_date) ||
          a.member_name.localeCompare(b.member_name, locale),
      );

    return { people, counts, notResponded, notes };
  }, [overviewRows, teamMembers, sundays, locale]);

  function formatSunday(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
    });
  }

  function formatShort(date: string) {
    const d = new Date(`${date}T00:00:00`);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
  }

  const isCurrentMonth =
    viewMonth.getFullYear() === new Date().getFullYear() &&
    viewMonth.getMonth() === new Date().getMonth();

  /* ================= РЕНДЕР ================= */

  return (
    <main className="min-h-screen bg-[#f7f7f6] text-neutral-900">
      <header className="sticky top-0 z-30 border-b border-[#e6e7e8] bg-[#f7f7f6]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[760px] items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#111820] text-white">
            <CalendarCheck size={18} />
          </div>

          <div className="min-w-0">
            <div className="text-[19px] font-bold leading-none tracking-[-0.03em] text-[#111820]">
              {isRu ? "Когда могу служить" : "Wann ich dienen kann"}
            </div>

            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a939d]">
              {isRu
                ? "Воскресные служения"
                : "Sonntagsgottesdienste"}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[760px] px-4 pb-32 pt-5 sm:px-6">
        {/* TABS (только для админов) */}
        {isAdmin && (
          <div className="mb-4 flex gap-2 rounded-[16px] border border-[#e2e5e8] bg-white p-1.5">
            <button
              type="button"
              onClick={() => setTab("mine")}
              className={`flex-1 rounded-[12px] py-2.5 text-[13px] font-semibold transition ${
                tab === "mine"
                  ? "bg-[#111820] text-white"
                  : "text-[#65707d]"
              }`}
            >
              {isRu ? "Мои ответы" : "Meine Angaben"}
            </button>

            <button
              type="button"
              onClick={() => setTab("overview")}
              className={`flex-1 rounded-[12px] py-2.5 text-[13px] font-semibold transition ${
                tab === "overview"
                  ? "bg-[#111820] text-white"
                  : "text-[#65707d]"
              }`}
            >
              {isRu ? "Сводка команды" : "Team-Übersicht"}
            </button>
          </div>
        )}

        {/* MONTH NAV */}
        <div className="mb-4 flex items-center justify-between rounded-[20px] border border-[#e6e8ea] bg-white p-1.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[#374353] active:bg-[#f1f2f3]"
            aria-label={isRu ? "Предыдущий месяц" : "Vorheriger Monat"}
          >
            <ChevronLeft size={21} />
          </button>

          <div className="text-center">
            <div className="text-[17px] font-bold capitalize tracking-[-0.02em] text-[#111820]">
              {monthLabel}
            </div>

            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToCurrentMonth}
                className="text-[11px] font-semibold text-[#8a939d] underline"
              >
                {isRu ? "К текущему месяцу" : "Zum aktuellen Monat"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[#374353] active:bg-[#f1f2f3]"
            aria-label={isRu ? "Следующий месяц" : "Nächster Monat"}
          >
            <ChevronRight size={21} />
          </button>
        </div>

        {/* ================= МОИ ОТВЕТЫ ================= */}
        {tab === "mine" && (
          <div>
            <p className="mb-4 px-1 text-[13px] leading-5 text-[#65707d]">
              {isRu
                ? "Отметь, в какие воскресенья и на каком служении (10:00 или 13:00) ты можешь служить. Потом нажми «Отправить». Ответ можно изменить позже."
                : "Markiere, an welchen Sonntagen und in welchem Gottesdienst (10:00 oder 13:00) du dienen kannst. Dann „Senden“ drücken. Du kannst deine Angaben später ändern."}
            </p>

            {loadingMine ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-[120px] animate-pulse rounded-[20px] bg-white"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {sundays.map((date) => {
                  const draft = getDraft(date);
                  const past = date < todayString;

                  return (
                    <div
                      key={date}
                      className={`rounded-[20px] border bg-white p-4 ${
                        draft.status === "available"
                          ? "border-[#111820]"
                          : "border-[#e6e8ea]"
                      } ${past ? "opacity-60" : ""}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-[15px] font-bold text-[#111820]">
                          {isRu ? "Воскресенье" : "Sonntag"},{" "}
                          {formatSunday(date)}
                        </div>

                        {draft.status && (
                          <Check size={16} className="text-emerald-600" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setStatus(date, "available")}
                          className={`h-11 rounded-[12px] text-[14px] font-semibold transition ${
                            draft.status === "available"
                              ? "bg-[#111820] text-white"
                              : "bg-[#f1f2f3] text-[#65707d]"
                          }`}
                        >
                          {isRu ? "Могу" : "Kann"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setStatus(date, "unavailable")}
                          className={`h-11 rounded-[12px] text-[14px] font-semibold transition ${
                            draft.status === "unavailable"
                              ? "bg-red-500 text-white"
                              : "bg-[#f1f2f3] text-[#65707d]"
                          }`}
                        >
                          {isRu ? "Не могу" : "Kann nicht"}
                        </button>
                      </div>

                      {draft.status === "available" && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {(
                            [
                              ["s10", "10:00"],
                              ["s13", "13:00"],
                            ] as const
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                updateDraft(
                                  date,
                                  key === "s10"
                                    ? { s10: !draft.s10 }
                                    : { s13: !draft.s13 },
                                )
                              }
                              className={`flex h-11 items-center justify-center gap-1.5 rounded-[12px] border-2 text-[14px] font-bold transition ${
                                draft[key]
                                  ? "border-[#111820] bg-[#111820]/5 text-[#111820]"
                                  : "border-[#e2e5e8] text-[#9aa2ad]"
                              }`}
                            >
                              {draft[key] && <Check size={15} />}
                              {label}
                            </button>
                          ))}
                        </div>
                      )}

                      {draft.status && (
                        <input
                          type="text"
                          value={draft.note}
                          onChange={(event) =>
                            updateDraft(date, { note: event.target.value })
                          }
                          placeholder={
                            isRu
                              ? "Комментарий (необязательно)"
                              : "Kommentar (optional)"
                          }
                          className="mt-3 h-11 w-full rounded-[12px] border border-[#e2e5e8] bg-[#fafafa] px-3.5 text-[14px] outline-none placeholder:text-[#b1b7bf] focus:border-[#111820] focus:bg-white"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {message && (
              <div
                className={`mt-4 rounded-[14px] px-4 py-3 text-[13px] font-semibold ${
                  message.type === "ok"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={saving || loadingMine}
              className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#111820] text-[15px] font-bold text-white transition active:scale-[0.99] disabled:opacity-50"
            >
              <Send size={16} />
              {saving
                ? isRu
                  ? "Отправляю..."
                  : "Wird gesendet..."
                : isRu
                  ? "Отправить"
                  : "Senden"}
            </button>
          </div>
        )}

        {/* ================= СВОДКА (АДМИН) ================= */}
        {tab === "overview" && isAdmin && (
          <div>
            {loadingOverview ? (
              <div className="h-[220px] animate-pulse rounded-[20px] bg-white" />
            ) : (
              <>
                <div className="overflow-hidden rounded-[20px] border border-[#e6e8ea] bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-[#fafafa] text-[10px] font-bold uppercase tracking-[0.06em] text-[#9aa2ad]">
                          <th className="sticky left-0 z-10 min-w-[130px] bg-[#fafafa] px-3 py-2.5 text-left">
                            {isRu ? "Служитель" : "Person"}
                          </th>

                          {sundays.map((date) => (
                            <th
                              key={date}
                              className="min-w-[84px] px-2 py-2.5 text-center"
                            >
                              {formatShort(date)}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {overview.people.length === 0 ? (
                          <tr>
                            <td
                              colSpan={sundays.length + 1}
                              className="px-4 py-10 text-center text-[12px] text-[#9aa2ad]"
                            >
                              {isRu
                                ? "Пока никто не ответил на этот месяц."
                                : "Für diesen Monat hat noch niemand geantwortet."}
                            </td>
                          </tr>
                        ) : (
                          overview.people.map((person) => (
                            <tr
                              key={person.id}
                              className="border-t border-[#f0f1f2]"
                            >
                              <td className="sticky left-0 z-10 bg-white px-3 py-2.5 font-semibold text-[#111820]">
                                {person.name}
                              </td>

                              {sundays.map((date) => {
                                const cell = person.cells.get(date);

                                if (!cell) {
                                  return (
                                    <td
                                      key={date}
                                      className="px-2 py-2.5 text-center text-[#d0d4d9]"
                                    >
                                      –
                                    </td>
                                  );
                                }

                                if (cell.status === "unavailable") {
                                  return (
                                    <td
                                      key={date}
                                      className="px-2 py-2.5 text-center"
                                    >
                                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-500">
                                        {isRu ? "нет" : "nein"}
                                      </span>
                                    </td>
                                  );
                                }

                                return (
                                  <td
                                    key={date}
                                    className="px-2 py-2.5 text-center"
                                  >
                                    <div className="flex justify-center gap-1">
                                      {cell.service_10 && (
                                        <span className="rounded-full bg-[#111820] px-2 py-0.5 text-[11px] font-bold text-white">
                                          10
                                        </span>
                                      )}

                                      {cell.service_13 && (
                                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                          13
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>

                      {overview.people.length > 0 && (
                        <tfoot>
                          <tr className="border-t border-[#eceef0] bg-[#fafafa] text-[11px] font-semibold text-[#65707d]">
                            <td className="sticky left-0 z-10 bg-[#fafafa] px-3 py-2.5">
                              {isRu ? "Могут" : "Verfügbar"}
                            </td>

                            {overview.counts.map((count) => (
                              <td
                                key={count.date}
                                className="px-2 py-2.5 text-center"
                              >
                                10: {count.s10} · 13: {count.s13}
                              </td>
                            ))}
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                <p className="mt-2 px-1 text-[11px] text-[#9aa2ad]">
                  {isRu
                    ? "10 / 13 — время служения, «нет» — не может в этот день, «–» — ещё не ответил."
                    : "10 / 13 — Gottesdienst, „nein“ — kann nicht, „–“ — noch keine Antwort."}
                </p>

                {overview.notes.length > 0 && (
                  <div className="mt-4 rounded-[20px] border border-[#e6e8ea] bg-white p-4">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]">
                      {isRu ? "Комментарии" : "Kommentare"}
                    </p>

                    <div className="space-y-1.5">
                      {overview.notes.map((row) => (
                        <p
                          key={`${row.user_id}-${row.sunday_date}`}
                          className="text-[13px] text-[#374353]"
                        >
                          <span className="font-semibold">
                            {row.member_name}
                          </span>{" "}
                          · {formatShort(row.sunday_date)}: {row.note}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {overview.notResponded.length > 0 && (
                  <div className="mt-4 rounded-[20px] border border-[#e6e8ea] bg-white p-4">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]">
                      {isRu ? "Ещё не ответили" : "Noch nicht geantwortet"} ·{" "}
                      {overview.notResponded.length}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {overview.notResponded.map((person) => (
                        <span
                          key={person.name}
                          className="rounded-full border border-[#e2e5e8] bg-[#fafafa] px-2.5 py-1 text-[12px] font-medium text-[#374353]"
                        >
                          {person.name}
                          {person.noAccount &&
                            (isRu ? " (нет аккаунта)" : " (kein Konto)")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}