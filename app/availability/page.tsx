"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Send,
  ShieldCheck,
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

type AccountRow = { id: string; full_name: string | null };

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

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length < 2) return name;

  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

type NameRowProps = {
  label: string;
  tone: "dark" | "green" | "red";
  names: string[];
  emptyText?: string;
};

function NameRow({ label, tone, names, emptyText }: NameRowProps) {
  const labelClass =
    tone === "dark"
      ? "bg-[#1b2431] text-[#ffc93c]"
      : tone === "green"
        ? "bg-emerald-600 text-white"
        : "bg-red-50 text-red-500";

  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span
        className={`mt-0.5 inline-flex min-w-[58px] shrink-0 items-center justify-center rounded-full px-2 py-1 text-[11px] font-bold ${labelClass}`}
      >
        {label}
        {names.length > 0 && (
          <span className="ml-1 opacity-70">{names.length}</span>
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {names.length === 0 ? (
          <span className="py-1 text-[12px] text-[#b3ac9a]">
            {emptyText ?? "—"}
          </span>
        ) : (
          names.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[#f3efe3] px-2.5 py-1 text-[13px] font-semibold leading-none text-[#1b2431]"
            >
              {shortName(name)}
            </span>
          ))
        )}
      </div>
    </div>
  );
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

  /* «не служит, только администрирует» — форма «Когда могу служить» ему не нужна */
  const [exempt, setExempt] = useState(false);
  const [ready, setReady] = useState(false);
  const [overviewView, setOverviewView] = useState<"days" | "people">("days");
  const [openSilent, setOpenSilent] = useState<Record<string, boolean>>({});
  const [exemptIds, setExemptIds] = useState<string[]>([]);
  const [reminding, setReminding] = useState(false);
  const [remindResult, setRemindResult] = useState("");

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
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);

  /* ---------- пользователь и роль ---------- */

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setReady(true);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? "");

      const [{ data }, { data: exemptRow }] = await Promise.all([
        supabase.rpc("is_admin"),
        supabase
          .from("availability_exempt")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      setIsAdmin(data === true);
      setExempt(Boolean(exemptRow));

      if (
        data === true &&
        (Boolean(exemptRow) ||
          new URLSearchParams(window.location.search).get("tab") ===
            "overview")
      ) {
        setTab("overview");
      }

      setReady(true);
    }

    init();
  }, []);

  /* ---------- загрузка моих ответов за месяц ---------- */

  useEffect(() => {
    if (!userId || exempt) return;

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
  }, [userId, viewMonth, exempt]);

  /* ---------- загрузка сводки (только админ) ---------- */

  useEffect(() => {
    if (!isAdmin || tab !== "overview") return;

    let cancelled = false;

    async function loadOverview() {
      setLoadingOverview(true);

      const first = sundays[0] ?? toDateString(viewMonth);
      const last = sundays[sundays.length - 1] ?? first;

      const [availabilityResult, teamResult, accountsResult, exemptResult] = await Promise.all([
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
        supabase.rpc("get_account_names"),
        supabase.from("availability_exempt").select("user_id"),
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
      setAccounts((accountsResult.data ?? []) as AccountRow[]);
      setExemptIds(
        ((exemptResult.data ?? []) as { user_id: string }[]).map(
          (row) => row.user_id,
        ),
      );
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
      return `${member.first_name} ${
        member.last_name.trim() === "-" ? "" : member.last_name
      }`.trim();
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
          ? "Выбери служение (10:00 или 12:30) или отметь «Не могу»."
          : "Wähle einen Gottesdienst (10:00 oder 12:30) oder markiere „Kann nicht“.",
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
    const exemptSet = new Set(exemptIds);

    const cleanName = (first: string, last: string | null) =>
      `${first} ${(last ?? "").trim() === "-" ? "" : (last ?? "")}`.trim();

    /* имена тех, кто не служит — чтобы не показывать и их карточку в команде */
    const exemptNames = new Set(
      accounts
        .filter((account) => exemptSet.has(account.id))
        .map((account) => (account.full_name ?? "").trim().toLowerCase())
        .filter(Boolean),
    );

    const notResponded = teamMembers
      .filter(
        (member) =>
          !(member.user_id && exemptSet.has(member.user_id)) &&
          !exemptNames.has(
            cleanName(member.first_name, member.last_name).toLowerCase(),
          ) &&
          (!member.user_id || !respondedIds.has(member.user_id)),
      )
      .map((member) => ({
        name: cleanName(member.first_name, member.last_name),
        noAccount: !member.user_id,
      }));

    /* аккаунты, у которых нет карточки в команде (например, супер-админ) */
    const linkedUserIds = new Set(
      teamMembers.map((member) => member.user_id).filter(Boolean),
    );
    const knownNames = new Set(
      teamMembers.map((member) =>
        cleanName(member.first_name, member.last_name).toLowerCase(),
      ),
    );

    for (const account of accounts) {
      if (
        linkedUserIds.has(account.id) ||
        respondedIds.has(account.id) ||
        exemptSet.has(account.id)
      ) {
        continue;
      }

      const name = (account.full_name ?? "").trim() || (isRu ? "Без имени" : "Ohne Namen");

      if (knownNames.has(name.toLowerCase())) continue;

      notResponded.push({ name, noAccount: false });
    }

    notResponded.sort((a, b) => a.name.localeCompare(b.name, locale));

    const notes = overviewRows
      .filter((row) => row.note)
      .sort(
        (a, b) =>
          a.sunday_date.localeCompare(b.sunday_date) ||
          a.member_name.localeCompare(b.member_name, locale),
      );

    /* данные по каждому воскресенью для карточек */
    const days: Record<
      string,
      {
        s10: string[];
        s13: string[];
        no: string[];
        silent: string[];
        notes: AvailabilityRow[];
      }
    > = {};

    for (const date of sundays) {
      const day = {
        s10: [] as string[],
        s13: [] as string[],
        no: [] as string[],
        silent: [] as string[],
        notes: [] as AvailabilityRow[],
      };

      for (const person of people) {
        if (exemptSet.has(person.id)) continue;

        const cell = person.cells.get(date);

        if (!cell) {
          day.silent.push(person.name);
          continue;
        }

        if (cell.status === "unavailable") {
          day.no.push(person.name);
        } else {
          if (cell.service_10) day.s10.push(person.name);
          if (cell.service_13) day.s13.push(person.name);
        }

        if (cell.note) day.notes.push(cell);
      }

      for (const person of notResponded) {
        day.silent.push(person.name);
      }

      days[date] = day;
    }

    return { people, counts, notResponded, notes, days };
  }, [overviewRows, teamMembers, accounts, exemptIds, sundays, locale, isRu]);

  async function sendReminderNow() {
    setReminding(true);
    setRemindResult("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/availability-remind", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result) {
        setRemindResult(
          (isRu ? "Не удалось отправить" : "Senden fehlgeschlagen") +
            ` (HTTP ${response.status}${result?.error ? `: ${result.error}` : ""})`,
        );
      } else {
        setRemindResult(
          isRu
            ? `Отправлено устройств: ${result.sent}. Не ответили: ${result.pending}, получили из них: ${result.pendingReached}.`
            : `Geräte erreicht: ${result.sent}. Nicht geantwortet: ${result.pending}, davon erreicht: ${result.pendingReached}.`,
        );
      }
    } catch (error) {
      setRemindResult(
        (isRu ? "Не удалось отправить" : "Senden fehlgeschlagen") +
          ` (${error instanceof Error ? error.message : "network"})`,
      );
    } finally {
      setReminding(false);
    }
  }

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
    <main className="min-h-screen bg-[#faf8f3] text-neutral-900">
      <header className="sticky top-0 z-30 border-b border-[#e9e3d3] bg-[#faf8f3]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[760px] items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#1b2431] text-[#ffc93c]">
            <CalendarCheck size={18} />
          </div>

          <div className="min-w-0">
            <div className="text-[19px] font-bold leading-none tracking-[-0.03em] text-[#1b2431]">
              {exempt
                ? isRu
                  ? "Сводка команды"
                  : "Team-Übersicht"
                : isRu
                  ? "Когда могу служить"
                  : "Wann ich dienen kann"}
            </div>

            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f897a]">
              {isRu
                ? "Воскресные служения"
                : "Sonntagsgottesdienste"}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[760px] px-4 pb-32 pt-5 sm:px-6">
        {/* TABS (только для админов) */}
        {isAdmin && !exempt && (
          <div className="mb-4 flex gap-2 rounded-[16px] border border-[#e9e3d3] bg-white p-1.5">
            <button
              type="button"
              onClick={() => setTab("mine")}
              className={`flex-1 rounded-[12px] py-2.5 text-[13px] font-semibold transition ${
                tab === "mine"
                  ? "bg-[#1b2431] text-[#ffc93c]"
                  : "text-[#6f6a5c]"
              }`}
            >
              {isRu ? "Мои ответы" : "Meine Angaben"}
            </button>

            <button
              type="button"
              onClick={() => setTab("overview")}
              className={`flex-1 rounded-[12px] py-2.5 text-[13px] font-semibold transition ${
                tab === "overview"
                  ? "bg-[#1b2431] text-[#ffc93c]"
                  : "text-[#6f6a5c]"
              }`}
            >
              {isRu ? "Сводка команды" : "Team-Übersicht"}
            </button>
          </div>
        )}

        {/* MONTH NAV */}
        <div className="mb-4 flex items-center justify-between rounded-[20px] border border-[#e9e3d3] bg-white p-1.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[#3a3a35] active:bg-[#f3efe3]"
            aria-label={isRu ? "Предыдущий месяц" : "Vorheriger Monat"}
          >
            <ChevronLeft size={21} />
          </button>

          <div className="text-center">
            <div className="text-[17px] font-bold capitalize tracking-[-0.02em] text-[#1b2431]">
              {monthLabel}
            </div>

            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToCurrentMonth}
                className="text-[11px] font-semibold text-[#8f897a] underline"
              >
                {isRu ? "К текущему месяцу" : "Zum aktuellen Monat"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[#3a3a35] active:bg-[#f3efe3]"
            aria-label={isRu ? "Следующий месяц" : "Nächster Monat"}
          >
            <ChevronRight size={21} />
          </button>
        </div>

        {/* ================= МОИ ОТВЕТЫ ================= */}
        {!ready && (
          <div className="h-[180px] animate-pulse rounded-[20px] bg-white" />
        )}

        {ready && exempt && !isAdmin && (
          <div className="flex items-start gap-3 rounded-[20px] border border-[#e9e3d3] bg-white p-4 text-[13px] leading-5 text-[#6f6a5c]">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#8f897a]" />
            <span>
              {isRu
                ? "Тебе не нужно отмечать, когда ты можешь служить."
                : "Du musst nicht angeben, wann du dienen kannst."}
            </span>
          </div>
        )}

        {ready && !exempt && tab === "mine" && (
          <div>
            <p className="mb-4 px-1 text-[13px] leading-5 text-[#6f6a5c]">
              {isRu
                ? "Отметь, в какие воскресенья и на каком служении (10:00 или 12:30) ты можешь служить. Потом нажми «Отправить». Ответ можно изменить позже."
                : "Markiere, an welchen Sonntagen und in welchem Gottesdienst (10:00 oder 12:30) du dienen kannst. Dann „Senden“ drücken. Du kannst deine Angaben später ändern."}
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
                          ? "border-[#1b2431]"
                          : "border-[#e9e3d3]"
                      } ${past ? "opacity-60" : ""}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-[15px] font-bold text-[#1b2431]">
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
                              ? "bg-[#1b2431] text-[#ffc93c]"
                              : "bg-[#f3efe3] text-[#6f6a5c]"
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
                              : "bg-[#f3efe3] text-[#6f6a5c]"
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
                              ["s13", "12:30"],
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
                                  ? "border-[#1b2431] bg-[#1b2431]/5 text-[#1b2431]"
                                  : "border-[#e9e3d3] text-[#b3ac9a]"
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
                          className="mt-3 h-11 w-full rounded-[12px] border border-[#e9e3d3] bg-[#fffdf8] px-3.5 text-[14px] outline-none placeholder:text-[#b3ac9a] focus:border-[#1b2431] focus:bg-white"
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
              className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#1b2431] text-[15px] font-bold text-[#ffc93c] transition active:scale-[0.99] disabled:opacity-50"
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
        {ready && tab === "overview" && isAdmin && (
          <div>
            {/* переключатель вида */}
            <div className="mb-3 flex gap-1.5 rounded-[14px] border border-[#e9e3d3] bg-white p-1">
              {(
                [
                  ["days", isRu ? "По дням" : "Nach Tagen"],
                  ["people", isRu ? "По людям" : "Nach Personen"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOverviewView(key)}
                  className={`flex-1 rounded-[10px] py-2 text-[12.5px] font-semibold transition ${
                    overviewView === key
                      ? "bg-[#1b2431] text-[#ffc93c]"
                      : "text-[#6f6a5c]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {loadingOverview ? (
              <div className="h-[220px] animate-pulse rounded-[20px] bg-white" />
            ) : overviewView === "days" ? (
              <div className="space-y-3">
                {sundays.map((date) => {
                  const day = overview.days[date];
                  const past = date < todayString;
                  const silentOpen = Boolean(openSilent[date]);

                  return (
                    <section
                      key={date}
                      className={`overflow-hidden rounded-[20px] border border-[#e9e3d3] bg-white ${
                        past ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-[#ece6d6] bg-[#fffdf8] px-4 py-3">
                        <div className="min-w-0 truncate text-[15px] font-bold capitalize text-[#1b2431]">
                          {formatSunday(date)}
                        </div>

                        <div className="flex shrink-0 gap-1.5 text-[11px] font-bold">
                          <span className="rounded-full bg-[#1b2431] px-2 py-0.5 text-[#ffc93c]">
                            10:00 · {day.s10.length}
                          </span>

                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">
                            12:30 · {day.s13.length}
                          </span>
                        </div>
                      </div>

                      <div className="divide-y divide-[#f3efe3]">
                        <NameRow
                          label="10:00"
                          tone="dark"
                          names={day.s10}
                          emptyText={isRu ? "никого" : "niemand"}
                        />

                        <NameRow
                          label="12:30"
                          tone="green"
                          names={day.s13}
                          emptyText={isRu ? "никого" : "niemand"}
                        />

                        {day.no.length > 0 && (
                          <NameRow
                            label={isRu ? "Не могут" : "Nein"}
                            tone="red"
                            names={day.no}
                          />
                        )}

                        {day.silent.length > 0 && (
                          <div className="px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenSilent((current) => ({
                                  ...current,
                                  [date]: !current[date],
                                }))
                              }
                              className="flex w-full items-center justify-between text-[12px] font-semibold text-[#8f897a]"
                            >
                              <span>
                                {isRu ? "Нет ответа" : "Keine Antwort"} ·{" "}
                                {day.silent.length}
                              </span>

                              <ChevronRight
                                size={15}
                                className={`transition ${
                                  silentOpen ? "rotate-90" : ""
                                }`}
                              />
                            </button>

                            {silentOpen && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {day.silent.map((name) => (
                                  <span
                                    key={name}
                                    className="rounded-full border border-[#e9e3d3] px-2.5 py-1 text-[12px] font-medium leading-none text-[#8f897a]"
                                  >
                                    {shortName(name)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {day.notes.length > 0 && (
                          <div className="space-y-1 bg-[#fffbf0] px-4 py-2.5">
                            {day.notes.map((row) => (
                              <p
                                key={`${row.user_id}-${row.sunday_date}`}
                                className="text-[12.5px] leading-snug text-[#6b5a2a]"
                              >
                                <span className="font-bold">
                                  {shortName(row.member_name)}:
                                </span>{" "}
                                {row.note}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : overview.people.length === 0 ? (
              <div className="rounded-[20px] border border-[#e9e3d3] bg-white px-4 py-10 text-center text-[12px] text-[#b3ac9a]">
                {isRu
                  ? "Пока никто не ответил на этот месяц."
                  : "Für diesen Monat hat noch niemand geantwortet."}
              </div>
            ) : (
              <div className="divide-y divide-[#f3efe3] overflow-hidden rounded-[20px] border border-[#e9e3d3] bg-white">
                {overview.people
                  .filter((person) => !exemptIds.includes(person.id))
                  .map((person) => (
                    <div key={person.id} className="px-4 py-3">
                      <div className="text-[14px] font-bold text-[#1b2431]">
                        {person.name}
                      </div>

                      <div className="mt-2 grid grid-cols-5 gap-1.5">
                        {sundays.map((date) => {
                          const cell = person.cells.get(date);

                          return (
                            <div
                              key={date}
                              className="rounded-[10px] bg-[#f6f2e8] px-1 py-1.5 text-center"
                            >
                              <div className="text-[10px] font-medium text-[#b3ac9a]">
                                {formatShort(date)}
                              </div>

                              <div className="mt-0.5 flex min-h-[18px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold leading-none">
                                {!cell ? (
                                  <span className="text-[#d3ccb8]">–</span>
                                ) : cell.status === "unavailable" ? (
                                  <span className="text-red-500">
                                    {isRu ? "нет" : "nein"}
                                  </span>
                                ) : (
                                  <>
                                    {cell.service_10 && (
                                      <span className="text-[#1b2431]">
                                        10:00
                                      </span>
                                    )}

                                    {cell.service_13 && (
                                      <span className="text-emerald-600">
                                        12:30
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* ручное напоминание */}
            <div className="mt-3 rounded-[20px] border border-[#e9e3d3] bg-white p-4">
              <button
                type="button"
                onClick={sendReminderNow}
                disabled={reminding}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#1b2431] text-[13px] font-bold text-[#ffc93c] transition active:scale-[0.99] disabled:opacity-50"
              >
                <Send size={15} />
                {reminding
                  ? isRu ? "Отправляю…" : "Sende…"
                  : isRu ? "Напомнить не ответившим (push)" : "Nicht Geantwortete erinnern (Push)"}
              </button>

              <p className="mt-2 text-[11.5px] leading-snug text-[#8f897a]">
                {isRu
                  ? "Уйдёт тем, кто не ответил на следующий месяц, и копия тебе."
                  : "Geht an alle, die für den nächsten Monat nicht geantwortet haben – und eine Kopie an dich."}
              </p>

              {remindResult && (
                <p className="mt-2 text-[12px] font-semibold text-[#3a3a35]">
                  {remindResult}
                </p>
              )}
            </div>

            {/* ещё не ответили вообще */}
            {!loadingOverview && overview.notResponded.length > 0 && (
              <div className="mt-3 rounded-[20px] border border-[#e9e3d3] bg-white p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#b3ac9a]">
                  {isRu ? "Совсем не ответили" : "Noch gar nicht geantwortet"} ·{" "}
                  {overview.notResponded.length}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {overview.notResponded.map((person) => (
                    <span
                      key={person.name}
                      className="rounded-full border border-[#e9e3d3] bg-[#fffdf8] px-2.5 py-1 text-[12px] font-medium text-[#3a3a35]"
                    >
                      {person.name}
                      {person.noAccount &&
                        (isRu ? " (нет аккаунта)" : " (kein Konto)")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}