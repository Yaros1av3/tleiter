"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bus,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  FileText,
  Lock,
  MessageCircle,
  Plus,
  Printer,
  Search,
  Trash2,
  Users,
  Vote,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { TRIPS_UPDATED_EVENT } from "@/lib/useTripsReminder";
import ReminderDot from "@/components/ReminderDot";

/* ===================== TYPES ===================== */

type Trip = {
  id: number;
  title: string;
  description: string | null;
  status: "idea" | "planned" | "done" | "cancelled";
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  price: number | null;
  max_participants: number | null;
  notes: string | null;
  meeting_point: string | null;
  meeting_time: string | null;
  return_point: string | null;
  return_time: string | null;
  transport: string | null;
  accommodation: string | null;
  included: string | null;
  what_to_bring: string | null;
  program: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  signup_deadline: string | null;
  parent_note: string | null;
};

type Poll = {
  id: number;
  question: string;
  description: string | null;
  status: "open" | "closed";
  allow_multiple: boolean;
  deadline: string | null;
};

type Option = { id: number; poll_id: number; label: string };
type Vote = { id: number; poll_id: number; option_id: number; user_id: string };

type Participant = {
  id: number;
  trip_id: number;
  teen_id: number | null;
  team_member_id: number | null;
  paid_amount: number;
  consent: boolean;
  note: string | null;
};

type Expense = { id: number; trip_id: number; title: string; amount: number };

type Teen = {
  id: number;
  first_name: string;
  last_name: string | null;
  is_active: boolean | null;
  phone?: string | null;
  parent1_name?: string | null;
  parent1_phone?: string | null;
  parent2_name?: string | null;
  parent2_phone?: string | null;
  notes?: string | null;
};

type Member = { id: number; first_name: string; last_name: string | null; phone?: string | null };

type Section = { title: string; lines: string[] };

type TFn = (ru: string, de: string) => string;

const STATUSES: Trip["status"][] = ["idea", "planned", "done", "cancelled"];

const STATUS_STYLE: Record<Trip["status"], string> = {
  idea: "bg-amber-50 text-amber-800",
  planned: "bg-emerald-50 text-emerald-800",
  done: "bg-[#eef0f2] text-[#475467]",
  cancelled: "bg-red-50 text-red-700",
};

const inputCls =
  "w-full rounded-[12px] border border-[#e2e5e8] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#111820]";

function fullName(p: { first_name: string; last_name: string | null }) {
  const last = (p.last_name ?? "").trim();
  return `${p.first_name}${last && last !== "-" ? " " + last : ""}`;
}

function money(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(2)} €`;
}

/* ===================== PAGE ===================== */

export default function TripsPage() {
  const { language } = useLanguage();
  const isRu = language === "ru";
  const router = useRouter();
  const locale = isRu ? "ru-RU" : "de-DE";

  const t: TFn = (ru, de) => (isRu ? ru : de);

  const [tab, setTab] = useState<"polls" | "trips">("polls");
  const [userId, setUserId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [polls, setPolls] = useState<Poll[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [teens, setTeens] = useState<Teen[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [showPollForm, setShowPollForm] = useState(false);
  const [showTripForm, setShowTripForm] = useState(false);
  const [openTripId, setOpenTripId] = useState<number | null>(null);
  const [planTripId, setPlanTripId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserId(user?.id ?? null);

    const { data: manage } = await supabase.rpc("can_manage_trips");
    const manager = manage === true;
    setCanManage(manager);

    const [pollsR, optionsR, votesR, tripsR] = await Promise.all([
      supabase.from("trip_polls").select("*").order("created_at", { ascending: false }),
      supabase.from("trip_poll_options").select("*").order("id"),
      supabase.from("trip_poll_votes").select("*"),
      supabase.from("trips").select("*").order("start_date", { ascending: true, nullsFirst: false }),
    ]);

    const firstError = pollsR.error ?? optionsR.error ?? votesR.error ?? tripsR.error;
    if (firstError) setError(firstError.message);

    setPolls((pollsR.data ?? []) as Poll[]);
    setOptions((optionsR.data ?? []) as Option[]);
    setVotes((votesR.data ?? []) as Vote[]);
    setTrips((tripsR.data ?? []) as Trip[]);

    if (manager) {
      const teensFull = await supabase
        .from("teens")
        .select(
          "id, first_name, last_name, is_active, phone, parent1_name, parent1_phone, parent2_name, parent2_phone, notes",
        )
        .order("first_name")
        .limit(5000);

      let teenRows = teensFull.data as Teen[] | null;

      if (teensFull.error) {
        // запасной вариант, если колонки родителей ещё не созданы
        const basic = await supabase
          .from("teens")
          .select("id, first_name, last_name, is_active")
          .order("first_name")
          .limit(5000);
        teenRows = basic.data as Teen[] | null;
      }

      const [partR, membersR, expR] = await Promise.all([
        supabase.from("trip_participants").select("*").order("id"),
        supabase
          .from("team_members")
          .select("id, first_name, last_name, phone")
          .eq("status", "active")
          .order("first_name"),
        supabase.from("trip_expenses").select("*").order("id"),
      ]);

      setTeens(teenRows ?? []);
      setParticipants((partR.data ?? []) as Participant[]);
      setMembers((membersR.data ?? []) as Member[]);
      setExpenses((expR.data ?? []) as Expense[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function fail(message: string) {
    setError(message);
  }

  /* ---------- голосование ---------- */

  async function toggleVote(poll: Poll, optionId: number) {
    if (!userId || poll.status !== "open") return;
    setError(null);

    const mine = votes.filter((v) => v.poll_id === poll.id && v.user_id === userId);
    const existing = mine.find((v) => v.option_id === optionId);

    if (existing) {
      const { error: e } = await supabase.from("trip_poll_votes").delete().eq("id", existing.id);
      if (e) return fail(e.message);
    } else {
      if (!poll.allow_multiple && mine.length > 0) {
        const { error: e } = await supabase
          .from("trip_poll_votes")
          .delete()
          .eq("poll_id", poll.id)
          .eq("user_id", userId);
        if (e) return fail(e.message);
      }

      const { error: e } = await supabase
        .from("trip_poll_votes")
        .insert({ poll_id: poll.id, option_id: optionId, user_id: userId });
      if (e) return fail(e.message);
    }

    const { data } = await supabase.from("trip_poll_votes").select("*");
    setVotes((data ?? []) as Vote[]);
    window.dispatchEvent(new Event(TRIPS_UPDATED_EVENT));
  }

  async function setPollStatus(poll: Poll, status: Poll["status"]) {
    const { error: e } = await supabase.from("trip_polls").update({ status }).eq("id", poll.id);
    if (e) return fail(e.message);
    setPolls((cur) => cur.map((p) => (p.id === poll.id ? { ...p, status } : p)));
    window.dispatchEvent(new Event(TRIPS_UPDATED_EVENT));
  }

  async function deletePoll(poll: Poll) {
    if (!confirm(t("Удалить голосование?", "Abstimmung löschen?"))) return;
    const { error: e } = await supabase.from("trip_polls").delete().eq("id", poll.id);
    if (e) return fail(e.message);
    setPolls((cur) => cur.filter((p) => p.id !== poll.id));
    window.dispatchEvent(new Event(TRIPS_UPDATED_EVENT));
  }

  async function createPoll(
    question: string,
    description: string,
    labels: string[],
    multiple: boolean,
    deadline: string,
  ) {
    const { data: poll, error: e } = await supabase
      .from("trip_polls")
      .insert({
        question,
        description: description || null,
        allow_multiple: multiple,
        deadline: deadline || null,
      })
      .select()
      .single();

    if (e || !poll) return fail(e?.message ?? "error");

    const { error: oe } = await supabase
      .from("trip_poll_options")
      .insert(labels.map((label) => ({ poll_id: poll.id, label })));
    if (oe) return fail(oe.message);

    setShowPollForm(false);
    await load();
    window.dispatchEvent(new Event(TRIPS_UPDATED_EVENT));
  }

  async function createTripFromOption(poll: Poll, option: Option) {
    const { data, error: e } = await supabase
      .from("trips")
      .insert({ title: option.label, description: poll.question, status: "idea", location: option.label })
      .select()
      .single();

    if (e || !data) return fail(e?.message ?? "error");

    await setPollStatus(poll, "closed");
    await load();
    setTab("trips");
    setOpenTripId((data as Trip).id);
  }

  /* ---------- поездки ---------- */

  async function createTrip(values: Partial<Trip>) {
    const { data, error: e } = await supabase.from("trips").insert(values).select().single();
    if (e || !data) return fail(e?.message ?? "error");
    setShowTripForm(false);
    await load();
    setOpenTripId((data as Trip).id);
  }

  async function updateTrip(id: number, patch: Partial<Trip>) {
    const { error: e } = await supabase
      .from("trips")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (e) return fail(e.message);
    setTrips((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function deleteTrip(trip: Trip) {
    if (!confirm(t("Удалить поездку и всех участников?", "Fahrt und alle Teilnehmer löschen?"))) return;
    const { error: e } = await supabase.from("trips").delete().eq("id", trip.id);
    if (e) return fail(e.message);
    setTrips((cur) => cur.filter((x) => x.id !== trip.id));
    setParticipants((cur) => cur.filter((p) => p.trip_id !== trip.id));
    setExpenses((cur) => cur.filter((p) => p.trip_id !== trip.id));
  }

  async function addParticipants(tripId: number, kind: "teen" | "member", ids: number[]) {
    if (ids.length === 0) return;
    const column = kind === "teen" ? "teen_id" : "team_member_id";
    const { data, error: e } = await supabase
      .from("trip_participants")
      .insert(ids.map((id) => ({ trip_id: tripId, [column]: id })))
      .select();
    if (e) return fail(e.message);
    setParticipants((cur) => [...cur, ...((data ?? []) as Participant[])]);
  }

  async function updateParticipant(id: number, patch: Partial<Participant>) {
    setParticipants((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error: e } = await supabase.from("trip_participants").update(patch).eq("id", id);
    if (e) fail(e.message);
  }

  async function removeParticipant(id: number) {
    const { error: e } = await supabase.from("trip_participants").delete().eq("id", id);
    if (e) return fail(e.message);
    setParticipants((cur) => cur.filter((p) => p.id !== id));
  }

  async function addExpense(tripId: number, title: string, amount: number) {
    const { data, error: e } = await supabase
      .from("trip_expenses")
      .insert({ trip_id: tripId, title, amount })
      .select()
      .single();
    if (e || !data) return fail(e?.message ?? "error");
    setExpenses((cur) => [...cur, data as Expense]);
  }

  async function removeExpense(id: number) {
    const { error: e } = await supabase.from("trip_expenses").delete().eq("id", id);
    if (e) return fail(e.message);
    setExpenses((cur) => cur.filter((x) => x.id !== id));
  }

  /* ---------- производные ---------- */

  const teenById = useMemo(() => new Map(teens.map((x) => [x.id, x])), [teens]);
  const memberById = useMemo(() => new Map(members.map((x) => [x.id, x])), [members]);

  function formatDate(value: string | null, withWeekday = false) {
    if (!value) return null;
    return new Date(value + "T12:00:00").toLocaleDateString(locale, {
      ...(withWeekday ? { weekday: "long" } : {}),
      day: "numeric",
      month: withWeekday ? "long" : "short",
      year: "numeric",
    });
  }

  function statusLabel(s: Trip["status"]) {
    return {
      idea: t("Идея", "Idee"),
      planned: t("Запланирована", "Geplant"),
      done: t("Прошла", "Abgeschlossen"),
      cancelled: t("Отменена", "Abgesagt"),
    }[s];
  }

  function datesOf(trip: Trip, weekday = false) {
    if (trip.start_date && trip.end_date && trip.end_date !== trip.start_date) {
      return `${formatDate(trip.start_date, weekday)} – ${formatDate(trip.end_date, weekday)}`;
    }
    return formatDate(trip.start_date, weekday);
  }

  const todayString = new Date().toISOString().slice(0, 10);
  const waitingPollIds = new Set(
    polls
      .filter(
        (poll) =>
          poll.status === "open" &&
          (!poll.deadline || poll.deadline >= todayString) &&
          !votes.some((v) => v.poll_id === poll.id && v.user_id === userId),
      )
      .map((poll) => poll.id),
  );

  const planTrip = trips.find((x) => x.id === planTripId) ?? null;

  /* ===================== RENDER ===================== */

  return (
    <main className="min-h-screen bg-[#f7f7f6] pb-24 text-[#111820]">
      <div className="sticky top-0 z-20 border-b border-[#e6e8ea] bg-[#f7f7f6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            aria-label="back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-bold">{t("Поездки и выезды", "Fahrten & Freizeiten")}</h1>
            <p className="text-[12px] text-[#8a939d]">
              {canManage
                ? t("Ты можешь управлять поездками", "Du kannst Fahrten verwalten")
                : t("Голосуй и смотри планы", "Abstimmen und Pläne ansehen")}
            </p>
          </div>
        </div>

        <div className="mx-auto flex max-w-3xl gap-2 px-4 pb-3">
          {(
            [
              ["polls", t("Голосования", "Abstimmungen"), Vote],
              ["trips", t("Поездки", "Fahrten"), Bus],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-[14px] font-bold transition ${
                tab === key ? "bg-[#111820] text-white" : "bg-white text-[#475467]"
              }`}
            >
              <span className="relative">
                <Icon size={16} />
                {key === "polls" && waitingPollIds.size > 0 && (
                  <ReminderDot className="-right-1.5 -top-1" />
                )}
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-4">
        {error && (
          <div className="flex items-start gap-2 rounded-[16px] bg-red-50 px-4 py-3 text-[13px] text-red-700">
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        {loading && <p className="py-10 text-center text-[14px] text-[#8a939d]">…</p>}

        {/* ---------------- ГОЛОСОВАНИЯ ---------------- */}
        {!loading && tab === "polls" && (
          <>
            {canManage && !showPollForm && (
              <button
                type="button"
                onClick={() => setShowPollForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#111820] px-4 py-3.5 text-[14px] font-bold text-white"
              >
                <Plus size={17} />
                {t("Новое голосование", "Neue Abstimmung")}
              </button>
            )}

            {canManage && showPollForm && (
              <PollForm t={t} onCancel={() => setShowPollForm(false)} onSave={createPoll} />
            )}

            {polls.length === 0 && (
              <p className="py-10 text-center text-[14px] text-[#8a939d]">
                {t("Голосований пока нет.", "Noch keine Abstimmungen.")}
              </p>
            )}

            {polls.map((poll) => {
              const pollOptions = options.filter((o) => o.poll_id === poll.id);
              const pollVotes = votes.filter((v) => v.poll_id === poll.id);
              const voters = new Set(pollVotes.map((v) => v.user_id)).size;
              const maxCount = Math.max(
                0,
                ...pollOptions.map((o) => pollVotes.filter((v) => v.option_id === o.id).length),
              );
              const open = poll.status === "open";

              return (
                <section
                  key={poll.id}
                  className="rounded-[22px] border border-[#e6e8ea] bg-white p-4 shadow-[0_4px_18px_rgba(17,24,32,0.04)]"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[16px] font-bold leading-snug">{poll.question}</h2>
                      {poll.description && (
                        <p className="mt-1 text-[13px] text-[#65707d]">{poll.description}</p>
                      )}
                    </div>
                    {waitingPollIds.has(poll.id) && (
                      <span className="relative mr-2 mt-1.5 flex h-2.5 w-2.5 shrink-0">
                        <ReminderDot className="left-0 top-0" />
                      </span>
                    )}
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        open ? "bg-emerald-50 text-emerald-800" : "bg-[#eef0f2] text-[#475467]"
                      }`}
                    >
                      {open ? t("Открыто", "Offen") : t("Закрыто", "Geschlossen")}
                    </span>
                  </div>

                  {waitingPollIds.has(poll.id) && (
                    <p className="mt-1.5 text-[12px] font-bold text-red-600">
                      {t("Ждёт твоего голоса", "Wartet auf deine Stimme")}
                    </p>
                  )}

                  <p className="mt-1.5 text-[12px] text-[#8a939d]">
                    {t("Проголосовало", "Abgestimmt")}: {voters}
                    {poll.allow_multiple && ` · ${t("можно несколько вариантов", "Mehrfachauswahl")}`}
                    {poll.deadline && ` · ${t("до", "bis")} ${formatDate(poll.deadline)}`}
                  </p>

                  <div className="mt-3 space-y-2">
                    {pollOptions.map((option) => {
                      const count = pollVotes.filter((v) => v.option_id === option.id).length;
                      const mine = pollVotes.some((v) => v.option_id === option.id && v.user_id === userId);
                      const percent = voters > 0 ? Math.round((count / voters) * 100) : 0;
                      const leading = count > 0 && count === maxCount;

                      return (
                        <div key={option.id}>
                          <button
                            type="button"
                            disabled={!open}
                            onClick={() => toggleVote(poll, option.id)}
                            className={`relative w-full overflow-hidden rounded-[14px] border px-3.5 py-3 text-left transition active:scale-[0.99] ${
                              mine ? "border-[#111820]" : "border-[#e6e8ea]"
                            } disabled:active:scale-100`}
                          >
                            <span
                              className={`absolute inset-y-0 left-0 ${leading ? "bg-[#111820]/10" : "bg-[#f1f2f3]"}`}
                              style={{ width: `${percent}%` }}
                            />
                            <span className="relative flex items-center gap-2.5">
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  mine ? "border-[#111820] bg-[#111820] text-white" : "border-[#c9ced4]"
                                }`}
                              >
                                {mine && <Check size={12} />}
                              </span>
                              <span className="min-w-0 flex-1 text-[14px] font-semibold">{option.label}</span>
                              <span className="text-[13px] font-bold text-[#475467]">
                                {count} · {percent}%
                              </span>
                            </span>
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => createTripFromOption(poll, option)}
                              className="ml-1 mt-1 text-[12px] font-semibold text-[#475467] underline"
                            >
                              {t("Выбрать и создать поездку", "Wählen & Fahrt anlegen")}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {canManage && (
                    <div className="mt-3 flex gap-2 border-t border-[#eef0f2] pt-3">
                      <button
                        type="button"
                        onClick={() => setPollStatus(poll, open ? "closed" : "open")}
                        className="flex items-center gap-1.5 rounded-[12px] border border-[#e2e5e8] px-3 py-2 text-[12px] font-bold text-[#374353]"
                      >
                        <Lock size={13} />
                        {open ? t("Закрыть", "Schließen") : t("Открыть снова", "Wieder öffnen")}
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePoll(poll)}
                        className="flex items-center gap-1.5 rounded-[12px] border border-red-200 px-3 py-2 text-[12px] font-bold text-red-700"
                      >
                        <Trash2 size={13} />
                        {t("Удалить", "Löschen")}
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}

        {/* ---------------- ПОЕЗДКИ ---------------- */}
        {!loading && tab === "trips" && (
          <>
            {canManage && !showTripForm && (
              <button
                type="button"
                onClick={() => setShowTripForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#111820] px-4 py-3.5 text-[14px] font-bold text-white"
              >
                <Plus size={17} />
                {t("Новая поездка", "Neue Fahrt")}
              </button>
            )}

            {canManage && showTripForm && (
              <TripForm t={t} onCancel={() => setShowTripForm(false)} onSave={createTrip} />
            )}

            {trips.length === 0 && (
              <p className="py-10 text-center text-[14px] text-[#8a939d]">
                {t("Поездок пока нет.", "Noch keine Fahrten.")}
              </p>
            )}

            {trips.map((trip) => {
              const isOpen = openTripId === trip.id;
              const tripParts = participants.filter((p) => p.trip_id === trip.id);
              const teenCount = tripParts.filter((p) => p.teen_id !== null).length;
              const leaderCount = tripParts.length - teenCount;

              return (
                <section
                  key={trip.id}
                  className="rounded-[22px] border border-[#e6e8ea] bg-white shadow-[0_4px_18px_rgba(17,24,32,0.04)]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenTripId(isOpen ? null : trip.id)}
                    className="flex w-full items-start gap-3 p-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[16px] font-bold">{trip.title}</h2>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[trip.status]}`}>
                          {statusLabel(trip.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-[#65707d]">
                        {[datesOf(trip), trip.location, trip.price != null ? money(trip.price) : null]
                          .filter(Boolean)
                          .join(" · ") || t("Детали ещё не заполнены", "Details noch offen")}
                      </p>
                      {canManage && tripParts.length > 0 && (
                        <p className="mt-1 text-[12px] text-[#8a939d]">
                          <Users size={12} className="mr-1 inline" />
                          {t("Подростков", "Teens")}: {teenCount} · {t("лидеров", "Leiter")}: {leaderCount}
                          {trip.max_participants ? ` · ${t("лимит", "Limit")} ${trip.max_participants}` : ""}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      size={18}
                      className={`mt-1 shrink-0 text-[#8a939d] transition ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t border-[#eef0f2] p-4">
                      {!canManage && (
                        <PublicInfo t={t} trip={trip} dates={datesOf(trip)} deadline={formatDate(trip.signup_deadline)} />
                      )}

                      {canManage && (
                        <TripDetail
                          t={t}
                          trip={trip}
                          participants={tripParts}
                          expenses={expenses.filter((x) => x.trip_id === trip.id)}
                          teens={teens}
                          members={members}
                          teenById={teenById}
                          memberById={memberById}
                          onChange={(patch) => updateTrip(trip.id, patch)}
                          onAdd={(kind, ids) => addParticipants(trip.id, kind, ids)}
                          onUpdateParticipant={updateParticipant}
                          onRemoveParticipant={removeParticipant}
                          onAddExpense={(title, amount) => addExpense(trip.id, title, amount)}
                          onRemoveExpense={removeExpense}
                          onPlan={() => setPlanTripId(trip.id)}
                          onDelete={() => deleteTrip(trip)}
                        />
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}
      </div>

      {planTrip && (
        <PlanModal
          t={t}
          trip={planTrip}
          dates={datesOf(planTrip, true)}
          deadline={formatDate(planTrip.signup_deadline, true)}
          participants={participants.filter((p) => p.trip_id === planTrip.id)}
          expenses={expenses.filter((x) => x.trip_id === planTrip.id)}
          teenById={teenById}
          memberById={memberById}
          onClose={() => setPlanTripId(null)}
        />
      )}
    </main>
  );
}

/* ===================== UI HELPERS ===================== */

function Collapsible({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-[16px] border border-[#e6e8ea]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold">{title}</p>
          {summary && <p className="text-[12px] text-[#8a939d]">{summary}</p>}
        </div>
        <ChevronDown size={17} className={`shrink-0 text-[#8a939d] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-3 border-t border-[#eef0f2] p-3.5">{children}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  onSave,
  multiline = false,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(value);
  }, [value]);

  const commit = () => {
    if (local !== value) onSave(local);
  };

  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-[#65707d]">{label}</span>
      {multiline ? (
        <textarea
          rows={4}
          className={inputCls}
          value={local}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
        />
      ) : (
        <input
          type={type}
          className={inputCls}
          value={local}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
        />
      )}
    </label>
  );
}

/* ===================== PUBLIC INFO (для всех) ===================== */

function PublicInfo({
  t,
  trip,
  dates,
  deadline,
}: {
  t: TFn;
  trip: Trip;
  dates: string | null;
  deadline: string | null;
}) {
  const rows: [string, string | null][] = [
    [t("Даты", "Datum"), dates],
    [t("Место", "Ort"), trip.location],
    [t("Сбор", "Treffpunkt"), [trip.meeting_point, trip.meeting_time].filter(Boolean).join(", ") || null],
    [t("Возвращение", "Rückkehr"), [trip.return_point, trip.return_time].filter(Boolean).join(", ") || null],
    [t("Цена", "Preis"), trip.price != null ? money(trip.price) : null],
    [t("Что включено", "Inklusive"), trip.included],
    [t("Что взять", "Mitbringen"), trip.what_to_bring],
    [t("Программа", "Programm"), trip.program],
    [t("Запись до", "Anmeldung bis"), deadline],
    [t("Контакт", "Kontakt"), [trip.contact_person, trip.contact_phone].filter(Boolean).join(", ") || null],
  ];

  const filled = rows.filter(([, v]) => v);

  return (
    <div className="space-y-2.5">
      {trip.description && <p className="text-[13px] text-[#475467]">{trip.description}</p>}
      {filled.map(([label, value]) => (
        <div key={label}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a939d]">{label}</p>
          <p className="whitespace-pre-line text-[14px]">{value}</p>
        </div>
      ))}
      <p className="text-[12px] text-[#8a939d]">
        {t(
          "Список участников и оплата видны только организаторам.",
          "Teilnehmerliste und Zahlungen sehen nur die Organisatoren.",
        )}
      </p>
    </div>
  );
}

/* ===================== TRIP DETAIL (управление) ===================== */

function TripDetail({
  t,
  trip,
  participants,
  expenses,
  teens,
  members,
  teenById,
  memberById,
  onChange,
  onAdd,
  onUpdateParticipant,
  onRemoveParticipant,
  onAddExpense,
  onRemoveExpense,
  onPlan,
  onDelete,
}: {
  t: TFn;
  trip: Trip;
  participants: Participant[];
  expenses: Expense[];
  teens: Teen[];
  members: Member[];
  teenById: Map<number, Teen>;
  memberById: Map<number, Member>;
  onChange: (patch: Partial<Trip>) => void;
  onAdd: (kind: "teen" | "member", ids: number[]) => void;
  onUpdateParticipant: (id: number, patch: Partial<Participant>) => void;
  onRemoveParticipant: (id: number) => void;
  onAddExpense: (title: string, amount: number) => void;
  onRemoveExpense: (id: number) => void;
  onPlan: () => void;
  onDelete: () => void;
}) {
  const teenParts = participants.filter((p) => p.teen_id !== null);
  const leaderParts = participants.filter((p) => p.team_member_id !== null);

  const collected = teenParts.reduce((s, p) => s + Number(p.paid_amount || 0), 0);
  const expected = (trip.price ?? 0) * teenParts.length;
  const paidFull = teenParts.filter((p) => trip.price != null && Number(p.paid_amount) >= trip.price).length;
  const spent = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);

  const text = (key: keyof Trip) => (trip[key] as string | null) ?? "";
  const save = (key: keyof Trip) => (value: string) => onChange({ [key]: value.trim() || null } as Partial<Trip>);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onPlan}
        className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#111820] px-4 py-3.5 text-[14px] font-bold text-white"
      >
        <FileText size={17} />
        {t("План поездки: отправить лидерам и родителям", "Fahrtplan für Leiter & Eltern")}
      </button>

      {/* Основное */}
      <Collapsible title={t("Основное", "Allgemein")} summary={t("Название, статус, даты, место, цена", "Titel, Status, Datum, Ort, Preis")} defaultOpen>
        <Field label={t("Название", "Titel")} value={trip.title} onSave={(v) => v.trim() && onChange({ title: v.trim() })} />

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ status: s })}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                trip.status === s ? "bg-[#111820] text-white" : "bg-[#f1f2f3] text-[#475467]"
              }`}
            >
              {{
                idea: t("Идея", "Idee"),
                planned: t("Запланирована", "Geplant"),
                done: t("Прошла", "Abgeschlossen"),
                cancelled: t("Отменена", "Abgesagt"),
              }[s]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field type="date" label={t("Начало", "Beginn")} value={text("start_date")} onSave={save("start_date")} />
          <Field type="date" label={t("Конец", "Ende")} value={text("end_date")} onSave={save("end_date")} />
        </div>

        <Field label={t("Место / адрес", "Ort / Adresse")} value={text("location")} onSave={save("location")} />

        <div className="grid grid-cols-2 gap-2">
          <Field
            type="number"
            label={t("Цена с подростка, €", "Preis pro Teen, €")}
            value={trip.price != null ? String(trip.price) : ""}
            onSave={(v) => onChange({ price: v === "" ? null : Number(v) })}
          />
          <Field
            type="number"
            label={t("Макс. участников", "Max. Teilnehmer")}
            value={trip.max_participants != null ? String(trip.max_participants) : ""}
            onSave={(v) => onChange({ max_participants: v === "" ? null : Number(v) })}
          />
        </div>

        <Field label={t("Что включено в цену", "Was im Preis enthalten ist")} multiline value={text("included")} onSave={save("included")} placeholder={t("Проезд, проживание, питание…", "Fahrt, Unterkunft, Verpflegung…")} />
        <Field type="date" label={t("Записаться / оплатить до", "Anmeldung / Zahlung bis")} value={text("signup_deadline")} onSave={save("signup_deadline")} />
      </Collapsible>

      {/* Организация */}
      <Collapsible title={t("Организация", "Organisation")} summary={t("Место встречи, время, транспорт, что взять, программа", "Treffpunkt, Zeit, Transport, Packliste, Programm")}>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("Место встречи", "Treffpunkt")} value={text("meeting_point")} onSave={save("meeting_point")} placeholder={t("У церкви", "An der Kirche")} />
          <Field label={t("Время сбора", "Treffzeit")} value={text("meeting_time")} onSave={save("meeting_time")} placeholder="08:30" />
          <Field label={t("Место возвращения", "Rückkehr-Ort")} value={text("return_point")} onSave={save("return_point")} />
          <Field label={t("Время возвращения", "Rückkehr-Zeit")} value={text("return_time")} onSave={save("return_time")} placeholder="18:00" />
        </div>
        <Field label={t("Транспорт", "Transport")} value={text("transport")} onSave={save("transport")} placeholder={t("Автобус / поезд / машины", "Bus / Zug / Autos")} />
        <Field label={t("Проживание", "Unterkunft")} value={text("accommodation")} onSave={save("accommodation")} />
        <Field label={t("Что взять (каждый пункт с новой строки)", "Mitbringen (ein Punkt pro Zeile)")} multiline value={text("what_to_bring")} onSave={save("what_to_bring")} />
        <Field label={t("Программа (каждый пункт с новой строки)", "Programm (ein Punkt pro Zeile)")} multiline value={text("program")} onSave={save("program")} placeholder={t("Пт 18:00 — выезд\nСб 10:00 — служение…", "Fr 18:00 — Abfahrt\nSa 10:00 — …")} />
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("Контактное лицо", "Ansprechperson")} value={text("contact_person")} onSave={save("contact_person")} />
          <Field label={t("Телефон для связи", "Telefon")} value={text("contact_phone")} onSave={save("contact_phone")} />
        </div>
        <Field label={t("Важное для родителей", "Wichtig für Eltern")} multiline value={text("parent_note")} onSave={save("parent_note")} placeholder={t("Нужно письменное согласие, аллергии, карманные деньги…", "Einverständnis, Allergien, Taschengeld…")} />
        <Field label={t("Заметки для лидеров (только для плана лидеров)", "Notizen für Leiter (nur im Leiterplan)")} multiline value={text("notes")} onSave={save("notes")} />
      </Collapsible>

      {/* Подростки */}
      <Collapsible
        title={`${t("Подростки", "Teens")} (${teenParts.length})`}
        summary={
          trip.price != null
            ? `${t("Оплатили полностью", "Voll bezahlt")}: ${paidFull}/${teenParts.length} · ${money(collected)} / ${money(expected)}`
            : undefined
        }
      >
        <TeenPicker t={t} teens={teens} takenIds={new Set(teenParts.map((p) => p.teen_id as number))} onAdd={(ids) => onAdd("teen", ids)} />

        {teenParts.length === 0 && (
          <p className="text-[13px] text-[#8a939d]">{t("Пока никого нет.", "Noch niemand.")}</p>
        )}

        <div className="space-y-2">
          {teenParts.map((p) => {
            const teen = teenById.get(p.teen_id as number);
            const fullyPaid = trip.price != null && Number(p.paid_amount) >= trip.price;

            return (
              <div key={p.id} className="rounded-[14px] bg-[#f6f7f7] p-3">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{teen ? fullName(teen) : "—"}</span>
                  <button type="button" onClick={() => onRemoveParticipant(p.id)} className="text-[#8a939d]" aria-label="remove">
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 rounded-[10px] bg-white px-2.5 py-1.5 text-[12px] font-semibold">
                    {t("Оплачено", "Bezahlt")}
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={p.paid_amount}
                      onChange={(e) => onUpdateParticipant(p.id, { paid_amount: Number(e.target.value) })}
                      className="w-16 rounded border border-[#e2e5e8] px-1.5 py-0.5 text-[13px]"
                    />
                    €
                  </label>

                  {trip.price != null && (
                    <button
                      type="button"
                      onClick={() => onUpdateParticipant(p.id, { paid_amount: fullyPaid ? 0 : trip.price ?? 0 })}
                      className={`rounded-[10px] px-2.5 py-1.5 text-[12px] font-bold ${fullyPaid ? "bg-emerald-600 text-white" : "bg-white text-[#374353]"}`}
                    >
                      {fullyPaid ? t("✓ Оплатил полностью", "✓ Voll bezahlt") : t("Полностью", "Voll")}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onUpdateParticipant(p.id, { consent: !p.consent })}
                    className={`rounded-[10px] px-2.5 py-1.5 text-[12px] font-bold ${p.consent ? "bg-emerald-600 text-white" : "bg-white text-[#374353]"}`}
                  >
                    {p.consent ? t("✓ Разрешение родителей", "✓ Einverständnis") : t("Разрешение родителей", "Einverständnis")}
                  </button>
                </div>

                <NoteInput
                  value={p.note ?? ""}
                  placeholder={t("Заметка: аллергия, особенности…", "Notiz: Allergie, Besonderheiten…")}
                  onSave={(v) => onUpdateParticipant(p.id, { note: v.trim() || null })}
                />
              </div>
            );
          })}
        </div>
      </Collapsible>

      {/* Лидеры */}
      <Collapsible title={`${t("Лидеры", "Leiter")} (${leaderParts.length})`} summary={t("Кто едет из команды и что делает", "Wer mitfährt und welche Aufgabe")}>
        <LeaderPicker t={t} members={members} takenIds={new Set(leaderParts.map((p) => p.team_member_id as number))} onAdd={(ids) => onAdd("member", ids)} />

        {leaderParts.length === 0 && (
          <p className="text-[13px] text-[#8a939d]">{t("Пока никого нет.", "Noch niemand.")}</p>
        )}

        <div className="space-y-2">
          {leaderParts.map((p) => {
            const m = memberById.get(p.team_member_id as number);

            return (
              <div key={p.id} className="rounded-[14px] bg-[#f6f7f7] p-3">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{m ? fullName(m) : "—"}</span>
                  <button type="button" onClick={() => onRemoveParticipant(p.id)} className="text-[#8a939d]" aria-label="remove">
                    <X size={16} />
                  </button>
                </div>
                <NoteInput
                  value={p.note ?? ""}
                  placeholder={t("Задача: водитель, готовит еду, аптечка…", "Aufgabe: Fahrer, Essen, Erste Hilfe…")}
                  onSave={(v) => onUpdateParticipant(p.id, { note: v.trim() || null })}
                />
              </div>
            );
          })}
        </div>
      </Collapsible>

      {/* Бюджет */}
      <Collapsible
        title={t("Бюджет и расходы", "Budget & Ausgaben")}
        summary={`${t("Собрано", "Eingesammelt")} ${money(collected)} · ${t("потрачено", "Ausgaben")} ${money(spent)} · ${t("баланс", "Saldo")} ${money(collected - spent)}`}
      >
        <ExpenseForm t={t} onAdd={onAddExpense} />
        {expenses.map((x) => (
          <div key={x.id} className="flex items-center gap-2 rounded-[12px] bg-[#f6f7f7] px-3 py-2 text-[13px]">
            <span className="min-w-0 flex-1 truncate">{x.title}</span>
            <span className="font-bold">{money(Number(x.amount))}</span>
            <button type="button" onClick={() => onRemoveExpense(x.id)} className="text-[#8a939d]" aria-label="remove">
              <X size={15} />
            </button>
          </div>
        ))}
      </Collapsible>

      <button
        type="button"
        onClick={onDelete}
        className="flex items-center gap-1.5 rounded-[12px] border border-red-200 px-3 py-2 text-[12px] font-bold text-red-700"
      >
        <Trash2 size={13} />
        {t("Удалить поездку", "Fahrt löschen")}
      </button>
    </div>
  );
}

function NoteInput({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);

  return (
    <input
      className="mt-2 w-full rounded-[10px] border border-[#e2e5e8] bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-[#111820]"
      placeholder={placeholder}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => local !== value && onSave(local)}
    />
  );
}

function ExpenseForm({ t, onAdd }: { t: TFn; onAdd: (title: string, amount: number) => void }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <div className="space-y-2">
      <input className={inputCls} placeholder={t("Что оплатили", "Wofür")} value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex gap-2">
        <input className={`${inputCls} min-w-0 flex-1`} type="number" min={0} step="0.5" placeholder="€" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button
          type="button"
          disabled={!title.trim() || amount === ""}
          onClick={() => {
            onAdd(title.trim(), Number(amount));
            setTitle("");
            setAmount("");
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-[12px] bg-[#111820] px-4 text-[13px] font-bold text-white disabled:opacity-40"
        >
          <Plus size={16} />
          {t("Добавить", "Hinzufügen")}
        </button>
      </div>
    </div>
  );
}

/* ---------- выбор людей ---------- */

function PickerPanel({
  t,
  items,
  takenIds,
  onAdd,
  buttonLabel,
}: {
  t: TFn;
  items: { id: number; name: string; muted?: boolean; hint?: string }[];
  takenIds: Set<number>;
  onAdd: (ids: number[]) => void;
  buttonLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const available = items.filter((x) => !takenIds.has(x.id));
  const visible = available.filter((x) => x.name.toLowerCase().includes(query.trim().toLowerCase()));
  const allVisibleSelected = visible.length > 0 && visible.every((x) => selected.has(x.id));

  function toggle(id: number) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((cur) => {
      const next = new Set(cur);
      if (allVisibleSelected) visible.forEach((x) => next.delete(x.id));
      else visible.forEach((x) => next.add(x.id));
      return next;
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#c9ced4] px-3 py-2.5 text-[13px] font-bold text-[#374353]"
      >
        <Plus size={15} />
        {buttonLabel}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-[14px] border border-[#e2e5e8] p-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a939d]" />
        <input className={`${inputCls} pl-9`} placeholder={t("Поиск", "Suchen")} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="flex items-center justify-between text-[12px]">
        <button type="button" onClick={toggleAll} className="font-bold text-[#374353] underline">
          {allVisibleSelected ? t("Снять выбор", "Auswahl aufheben") : t("Выбрать всех", "Alle auswählen")} ({visible.length})
        </button>
        <span className="text-[#8a939d]">
          {t("Доступно", "Verfügbar")}: {available.length}
        </span>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto">
        {visible.length === 0 && <p className="py-3 text-center text-[13px] text-[#8a939d]">{t("Никого не найдено", "Niemand gefunden")}</p>}
        {visible.map((x) => (
          <label key={x.id} className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2 py-2 hover:bg-[#f6f7f7]">
            <input type="checkbox" checked={selected.has(x.id)} onChange={() => toggle(x.id)} className="h-4 w-4" />
            <span className={`min-w-0 flex-1 truncate text-[14px] ${x.muted ? "text-[#8a939d]" : ""}`}>{x.name}</span>
            {x.hint && <span className="text-[11px] text-[#8a939d]">{x.hint}</span>}
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={() => {
            onAdd(Array.from(selected));
            setSelected(new Set());
            setOpen(false);
          }}
          className="flex-1 rounded-[12px] bg-[#111820] px-3 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
        >
          {t("Добавить", "Hinzufügen")} ({selected.size})
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-[12px] border border-[#e2e5e8] px-3 py-2.5 text-[13px] font-bold">
          {t("Закрыть", "Schließen")}
        </button>
      </div>
    </div>
  );
}

function TeenPicker({ t, teens, takenIds, onAdd }: { t: TFn; teens: Teen[]; takenIds: Set<number>; onAdd: (ids: number[]) => void }) {
  const items = teens.map((x) => ({
    id: x.id,
    name: fullName(x),
    muted: x.is_active === false,
    hint: x.is_active === false ? t("неактивный", "inaktiv") : undefined,
  }));

  return <PickerPanel t={t} items={items} takenIds={takenIds} onAdd={onAdd} buttonLabel={t("Добавить подростков", "Teens hinzufügen")} />;
}

function LeaderPicker({ t, members, takenIds, onAdd }: { t: TFn; members: Member[]; takenIds: Set<number>; onAdd: (ids: number[]) => void }) {
  const items = members.map((x) => ({ id: x.id, name: fullName(x) }));
  return <PickerPanel t={t} items={items} takenIds={takenIds} onAdd={onAdd} buttonLabel={t("Добавить лидеров", "Leiter hinzufügen")} />;
}

/* ===================== ПЛАН ПОЕЗДКИ ===================== */

function PlanModal({
  t,
  trip,
  dates,
  deadline,
  participants,
  expenses,
  teenById,
  memberById,
  onClose,
}: {
  t: TFn;
  trip: Trip;
  dates: string | null;
  deadline: string | null;
  participants: Participant[];
  expenses: Expense[];
  teenById: Map<number, Teen>;
  memberById: Map<number, Member>;
  onClose: () => void;
}) {
  const [audience, setAudience] = useState<"parents" | "leaders">("parents");
  const [withContacts, setWithContacts] = useState(true);
  const [copied, setCopied] = useState(false);

  const sections = useMemo<Section[]>(() => {
    const list = (value: string | null) =>
      (value ?? "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => `• ${x}`);

    const result: Section[] = [];

    const main: string[] = [];
    if (dates) main.push(`📅 ${dates}`);
    if (trip.location) main.push(`📍 ${trip.location}`);
    if (trip.description && audience === "parents") main.push(trip.description);
    if (main.length) result.push({ title: "", lines: main });

    const meeting: string[] = [];
    if (trip.meeting_point || trip.meeting_time)
      meeting.push(`${t("Сбор", "Treffpunkt")}: ${[trip.meeting_point, trip.meeting_time && `${t("в", "um")} ${trip.meeting_time}`].filter(Boolean).join(" ")}`);
    if (trip.return_point || trip.return_time)
      meeting.push(`${t("Возвращение", "Rückkehr")}: ${[trip.return_point, trip.return_time && `${t("в", "um")} ${trip.return_time}`].filter(Boolean).join(" ")}`);
    if (trip.transport) meeting.push(`${t("Транспорт", "Transport")}: ${trip.transport}`);
    if (trip.accommodation) meeting.push(`${t("Проживание", "Unterkunft")}: ${trip.accommodation}`);
    if (meeting.length) result.push({ title: t("🕗 Встреча и дорога", "🕗 Treffpunkt & Anreise"), lines: meeting });

    if (trip.program) result.push({ title: t("📋 Программа", "📋 Programm"), lines: list(trip.program) });
    if (trip.what_to_bring) result.push({ title: t("🎒 Что взять с собой", "🎒 Das gehört in den Rucksack"), lines: list(trip.what_to_bring) });

    if (audience === "parents") {
      const cost: string[] = [];
      if (trip.price != null) cost.push(`${t("Стоимость", "Kosten")}: ${money(trip.price)}`);
      if (trip.included) cost.push(`${t("Включено", "Inklusive")}: ${trip.included.split("\n").filter(Boolean).join(", ")}`);
      if (deadline) cost.push(`${t("Оплатить и записаться до", "Anmeldung & Zahlung bis")}: ${deadline}`);
      if (cost.length) result.push({ title: t("💶 Стоимость", "💶 Kosten"), lines: cost });

      if (trip.parent_note) result.push({ title: t("⚠️ Важно", "⚠️ Wichtig"), lines: list(trip.parent_note) });
    } else {
      const teenParts = participants.filter((p) => p.teen_id !== null);
      const leaderParts = participants.filter((p) => p.team_member_id !== null);

      if (trip.notes) result.push({ title: t("📝 Заметки для лидеров", "📝 Notizen für Leiter"), lines: list(trip.notes) });

      if (leaderParts.length) {
        result.push({
          title: `${t("👥 Лидеры", "👥 Leiter")} (${leaderParts.length})`,
          lines: leaderParts.map((p) => {
            const m = memberById.get(p.team_member_id as number);
            return `• ${m ? fullName(m) : "—"}${p.note ? ` — ${p.note}` : ""}${m?.phone && withContacts ? ` (${m.phone})` : ""}`;
          }),
        });
      }

      if (teenParts.length) {
        result.push({
          title: `${t("🧒 Подростки", "🧒 Teens")} (${teenParts.length})`,
          lines: teenParts.map((p) => {
            const teen = teenById.get(p.teen_id as number);
            const unpaid = trip.price != null && Number(p.paid_amount) < trip.price;
            const parents = withContacts
              ? [teen?.parent1_phone && `${teen.parent1_name ?? t("родитель", "Eltern")}: ${teen.parent1_phone}`, teen?.parent2_phone && `${teen.parent2_name ?? t("родитель", "Eltern")}: ${teen.parent2_phone}`]
                  .filter(Boolean)
                  .join("; ")
              : "";

            return `• ${teen ? fullName(teen) : "—"}${unpaid ? ` ⚠️ ${t("не оплатил(а)", "nicht bezahlt")}` : ""}${!p.consent ? ` ❗${t("нет разрешения", "Einverständnis fehlt")}` : ""}${p.note ? ` — ${p.note}` : ""}${parents ? ` [${parents}]` : ""}`;
          }),
        });
      }

      const collected = teenParts.reduce((s, p) => s + Number(p.paid_amount || 0), 0);
      const spent = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);

      if (trip.price != null || expenses.length) {
        result.push({
          title: t("💶 Финансы", "💶 Finanzen"),
          lines: [
            `${t("Собрано", "Eingesammelt")}: ${money(collected)}${trip.price != null ? ` ${t("из", "von")} ${money(trip.price * teenParts.length)}` : ""}`,
            ...expenses.map((x) => `• ${x.title}: ${money(Number(x.amount))}`),
            `${t("Потрачено", "Ausgaben")}: ${money(spent)} · ${t("баланс", "Saldo")}: ${money(collected - spent)}`,
          ],
        });
      }
    }

    const contact = [trip.contact_person, trip.contact_phone].filter(Boolean).join(", ");
    if (contact) result.push({ title: t("☎️ Контакт", "☎️ Kontakt"), lines: [contact] });

    return result;
  }, [audience, withContacts, trip, dates, deadline, participants, expenses, teenById, memberById, t]);

  const heading =
    audience === "parents"
      ? `${trip.title} — ${t("информация для родителей", "Infos für Eltern")}`
      : `${trip.title} — ${t("план для лидеров", "Plan für Leiter")}`;

  const plainText = useMemo(() => {
    const parts = [`*${heading}*`];
    for (const s of sections) {
      parts.push((s.title ? `*${s.title}*\n` : "") + s.lines.join("\n"));
    }
    return parts.join("\n\n");
  }, [sections, heading]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("Скопируй текст:", "Text kopieren:"), plainText);
    }
  }

  function escapeHtml(value: string) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function print() {
    const win = window.open("", "_blank");
    if (!win) return;

    const body = sections
      .map(
        (s) =>
          `${s.title ? `<h2>${escapeHtml(s.title)}</h2>` : ""}<div class="block">${s.lines
            .map((l) => `<p>${escapeHtml(l)}</p>`)
            .join("")}</div>`,
      )
      .join("");

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(heading)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111820;max-width:720px;margin:32px auto;padding:0 20px;line-height:1.5}
  h1{font-size:24px;margin:0 0 4px}
  .sub{color:#65707d;margin-bottom:24px;font-size:14px}
  h2{font-size:16px;margin:22px 0 6px;border-bottom:1px solid #e6e8ea;padding-bottom:4px}
  p{margin:3px 0;font-size:14px}
  .block{margin-bottom:6px}
</style></head><body>
<h1>${escapeHtml(heading)}</h1><div class="sub">TLight</div>${body}
<script>window.onload=function(){window.print()}<\/script></body></html>`);
    win.document.close();
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(plainText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-[26px] bg-white sm:rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[#eef0f2] px-4 py-3">
          <h2 className="flex-1 text-[16px] font-bold">{t("План поездки", "Fahrtplan")}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-[#f1f2f3]" aria-label="close">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          {(
            [
              ["parents", t("Для родителей", "Für Eltern")],
              ["leaders", t("Для лидеров", "Für Leiter")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setAudience(key)}
              className={`flex-1 rounded-[12px] px-3 py-2 text-[13px] font-bold ${audience === key ? "bg-[#111820] text-white" : "bg-[#f1f2f3] text-[#475467]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {audience === "leaders" && (
          <label className="flex items-center gap-2 px-4 pt-3 text-[13px]">
            <input type="checkbox" checked={withContacts} onChange={(e) => setWithContacts(e.target.checked)} />
            {t("Телефоны лидеров и родителей", "Telefonnummern von Leitern und Eltern")}
          </label>
        )}

        <div className="mt-3 flex-1 overflow-y-auto px-4 pb-3">
          <div className="rounded-[18px] bg-[#f6f7f7] p-4">
            <h3 className="text-[17px] font-bold leading-snug">{heading}</h3>
            {sections.length === 0 && (
              <p className="mt-3 text-[13px] text-[#8a939d]">
                {t("Заполни даты, место встречи и другие данные поездки — они появятся здесь.", "Trage Datum, Treffpunkt usw. ein — sie erscheinen hier.")}
              </p>
            )}
            {sections.map((s, i) => (
              <div key={i} className="mt-3.5">
                {s.title && <p className="mb-1 text-[14px] font-bold">{s.title}</p>}
                {s.lines.map((line, j) => (
                  <p key={j} className="text-[14px] leading-6 text-[#2b3440]">
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-[#eef0f2] p-4">
          <button type="button" onClick={copy} className="flex items-center justify-center gap-1.5 rounded-[12px] border border-[#e2e5e8] px-2 py-2.5 text-[13px] font-bold">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? t("Готово", "Kopiert") : t("Копировать", "Kopieren")}
          </button>
          <a href={whatsapp} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-[12px] bg-[#16a34a] px-2 py-2.5 text-[13px] font-bold text-white">
            <MessageCircle size={15} />
            WhatsApp
          </a>
          <button type="button" onClick={print} className="flex items-center justify-center gap-1.5 rounded-[12px] bg-[#111820] px-2 py-2.5 text-[13px] font-bold text-white">
            <Printer size={15} />
            {t("PDF / печать", "PDF / Druck")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== FORMS ===================== */

function PollForm({
  t,
  onCancel,
  onSave,
}: {
  t: TFn;
  onCancel: () => void;
  onSave: (question: string, description: string, labels: string[], multiple: boolean, deadline: string) => Promise<void>;
}) {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [labels, setLabels] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const cleaned = labels.map((l) => l.trim()).filter(Boolean);
  const valid = question.trim().length > 0 && cleaned.length >= 2;

  return (
    <div className="space-y-3 rounded-[22px] border border-[#e6e8ea] bg-white p-4">
      <h2 className="text-[15px] font-bold">{t("Новое голосование", "Neue Abstimmung")}</h2>
      <input className={inputCls} placeholder={t("Вопрос, например: Куда едем летом?", "Frage, z. B. Wohin fahren wir im Sommer?")} value={question} onChange={(e) => setQuestion(e.target.value)} />
      <input className={inputCls} placeholder={t("Описание (необязательно)", "Beschreibung (optional)")} value={description} onChange={(e) => setDescription(e.target.value)} />

      <div className="space-y-2">
        {labels.map((label, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={inputCls}
              placeholder={`${t("Вариант", "Option")} ${i + 1}`}
              value={label}
              onChange={(e) => setLabels((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
            />
            {labels.length > 2 && (
              <button type="button" onClick={() => setLabels((cur) => cur.filter((_, j) => j !== i))} className="px-2 text-[#8a939d]">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setLabels((cur) => [...cur, ""])} className="text-[13px] font-bold text-[#374353]">
          + {t("Добавить вариант", "Option hinzufügen")}
        </button>
      </div>

      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} />
        {t("Можно выбрать несколько вариантов", "Mehrfachauswahl erlauben")}
      </label>

      <label className="block text-[13px]">
        <span className="mb-1 block text-[#65707d]">{t("Крайний срок (необязательно)", "Frist (optional)")}</span>
        <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!valid || saving}
          onClick={async () => {
            setSaving(true);
            await onSave(question.trim(), description.trim(), cleaned, multiple, deadline);
            setSaving(false);
          }}
          className="flex-1 rounded-[12px] bg-[#111820] px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-40"
        >
          {t("Создать", "Erstellen")}
        </button>
        <button type="button" onClick={onCancel} className="rounded-[12px] border border-[#e2e5e8] px-4 py-2.5 text-[14px] font-bold">
          {t("Отмена", "Abbrechen")}
        </button>
      </div>
    </div>
  );
}

function TripForm({
  t,
  onCancel,
  onSave,
}: {
  t: TFn;
  onCancel: () => void;
  onSave: (values: Partial<Trip>) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3 rounded-[22px] border border-[#e6e8ea] bg-white p-4">
      <h2 className="text-[15px] font-bold">{t("Новая поездка", "Neue Fahrt")}</h2>
      <input className={inputCls} placeholder={t("Название, например: Лагерь 2027", "Titel, z. B. Freizeit 2027")} value={title} onChange={(e) => setTitle(e.target.value)} />
      <p className="text-[12px] text-[#8a939d]">
        {t("Даты, место, цену и всё остальное можно заполнить после создания.", "Datum, Ort, Preis und Weiteres kannst du danach ergänzen.")}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!title.trim() || saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ title: title.trim(), status: "idea" });
            setSaving(false);
          }}
          className="flex-1 rounded-[12px] bg-[#111820] px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-40"
        >
          {t("Создать", "Erstellen")}
        </button>
        <button type="button" onClick={onCancel} className="rounded-[12px] border border-[#e2e5e8] px-4 py-2.5 text-[14px] font-bold">
          {t("Отмена", "Abbrechen")}
        </button>
      </div>
    </div>
  );
}