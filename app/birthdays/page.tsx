"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Cake,
  Check,
  ChevronDown,
  Plus,
  Search,
  UserMinus,
  UserPlus,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import {
  BIRTHDAYS_UPDATED_EVENT,
  nextBirthday,
  shortDays,
} from "@/lib/birthdays";

type Teen = {
  id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  is_active: boolean;
};

type Member = {
  id: number;
  first_name: string;
  last_name: string;
  user_id: string | null;
};

type Link = { teen_id: number; team_member_id: number };

type Celebration = {
  id: number;
  teen_id: number;
  birthday_year: number;
  celebrated: boolean;
};

type Row = {
  teen: Teen;
  next: ReturnType<typeof nextBirthday>;
  greeted: boolean;
};

const SOON_DAYS = 14;

export default function BirthdaysPage() {
  const toast = useToast();
  const { language } = useLanguage();
  const isRu = language === "ru";
  const locale = isRu ? "ru-RU" : "de-DE";

  const [teens, setTeens] = useState<Teen[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [done, setDone] = useState<Celebration[]>([]);
  const [loading, setLoading] = useState(true);
  const [myMemberId, setMyMemberId] = useState<number | null>(null);

  const [openId, setOpenId] = useState<number | "none" | null>(null);
  const [picker, setPicker] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [responsibleIds, setResponsibleIds] = useState<number[]>([]);
  const [memberPicker, setMemberPicker] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const load = useCallback(async () => {
    const year = new Date().getFullYear();

    const [t, m, l, c, auth, r] = await Promise.all([
      supabase
        .from("teens")
        .select("id, first_name, last_name, birth_date, is_active")
        .eq("is_active", true)
        .order("first_name", { ascending: true }),
      supabase
        .from("team_members")
        .select("id, first_name, last_name, user_id")
        .eq("status", "active")
        .order("first_name", { ascending: true }),
      supabase.from("teen_mentors").select("teen_id, team_member_id"),
      supabase
        .from("teen_birthday_celebrations")
        .select("id, teen_id, birthday_year, celebrated")
        .in("birthday_year", [year, year + 1]),
      supabase.auth.getUser(),
      supabase.from("birthday_responsibles").select("team_member_id"),
    ]);

    if (t.error || m.error || l.error) {
      console.error("Birthdays load error:", t.error ?? m.error ?? l.error);
      toast.error(
        isRu
          ? "Не удалось загрузить данные. Если страница новая — запусти birthdays.sql."
          : "Daten konnten nicht geladen werden. Bei neuer Seite birthdays.sql ausführen.",
      );
    }

    const memberRows = (m.data ?? []) as Member[];
    const userId = auth.data.user?.id;

    setTeens((t.data ?? []) as Teen[]);
    setMembers(memberRows);
    setLinks((l.data ?? []) as Link[]);
    setResponsibleIds(
      ((r.data ?? []) as { team_member_id: number }[]).map((x) => x.team_member_id),
    );
    setDone((c.data ?? []) as Celebration[]);
    setMyMemberId(memberRows.find((x) => x.user_id === userId)?.id ?? null);
    setLoading(false);
  }, [isRu, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const info = useMemo(() => {
    const teenById = new Map(teens.map((x) => [x.id, x]));
    const mentorOf = new Map(links.map((x) => [x.teen_id, x.team_member_id]));
    const celebrated = new Set(
      done.filter((x) => x.celebrated).map((x) => `${x.teen_id}-${x.birthday_year}`),
    );

    function enrich(teen: Teen): Row {
      const next = nextBirthday(teen.birth_date);
      return {
        teen,
        next,
        greeted: celebrated.has(`${teen.id}-${next.year}`),
      };
    }

    const byMember = new Map<number, Row[]>();
    const unassigned: Row[] = [];

    for (const teen of teens) {
      const mid = mentorOf.get(teen.id);
      const row = enrich(teen);

      if (mid && members.some((x) => x.id === mid)) {
        byMember.set(mid, [...(byMember.get(mid) ?? []), row]);
      } else {
        unassigned.push(row);
      }
    }

    const sorter = (a: Row, b: Row) =>
      a.next.days - b.next.days;

    byMember.forEach((rows) => rows.sort(sorter));
    unassigned.sort(sorter);

    const soon = teens
      .map(enrich)
      .filter((x) => x.next.days <= SOON_DAYS && !x.greeted)
      .sort(sorter)
      .map((x) => ({
        ...x,
        mentor: members.find((mm) => mm.id === mentorOf.get(x.teen.id)),
      }));

    return { teenById, mentorOf, byMember, unassigned, soon };
  }, [teens, members, links, done]);

  function dateLabel(birthDate: string) {
    const [, m, d] = birthDate.slice(0, 10).split("-").map(Number);
    return new Date(2000, m - 1, d).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
    });
  }

  function fullName(x: { first_name: string; last_name: string }) {
    return `${x.first_name} ${x.last_name}`.trim();
  }

  async function toggleGreeted(row: Row) {
    setBusy(true);

    const existing = done.find(
      (x) => x.teen_id === row.teen.id && x.birthday_year === row.next.year,
    );

    const result = existing
      ? await supabase
          .from("teen_birthday_celebrations")
          .update({ celebrated: !row.greeted })
          .eq("id", existing.id)
      : await supabase.from("teen_birthday_celebrations").insert({
          teen_id: row.teen.id,
          birthday_year: row.next.year,
          celebration_date: row.next.key,
          celebrated: true,
        });

    setBusy(false);

    if (result.error) {
      console.error("Greeted error:", result.error);
      toast.error(isRu ? "Не удалось сохранить отметку." : "Markierung konnte nicht gespeichert werden.");
      return;
    }

    await load();
    window.dispatchEvent(new Event(BIRTHDAYS_UPDATED_EVENT));
  }

  async function assign(teenId: number, memberId: number) {
    setBusy(true);

    const { error } = await supabase
      .from("teen_mentors")
      .upsert({ teen_id: teenId, team_member_id: memberId }, { onConflict: "teen_id" });

    setBusy(false);

    if (error) {
      console.error("Assign error:", error);
      toast.error(isRu ? "Не удалось добавить подростка." : "Teenager konnte nicht hinzugefügt werden.");
      return;
    }

    await load();
    window.dispatchEvent(new Event(BIRTHDAYS_UPDATED_EVENT));
  }

  async function addResponsible(memberId: number) {
    setBusy(true);

    const { error } = await supabase
      .from("birthday_responsibles")
      .upsert({ team_member_id: memberId }, { onConflict: "team_member_id" });

    setBusy(false);

    if (error) {
      console.error("Add responsible error:", error);
      toast.error(isRu ? "Не удалось добавить служителя." : "Mitarbeiter konnte nicht hinzugefügt werden.");
      return;
    }

    setMemberPicker(false);
    setOpenId(memberId);
    await load();
  }

  async function removeResponsible(memberId: number) {
    setBusy(true);

    const first = await supabase.from("teen_mentors").delete().eq("team_member_id", memberId);
    const second = first.error
      ? first
      : await supabase.from("birthday_responsibles").delete().eq("team_member_id", memberId);

    setBusy(false);
    setConfirmRemove(null);

    if (second.error) {
      console.error("Remove responsible error:", second.error);
      toast.error(isRu ? "Не удалось убрать ответственного." : "Zuständiger konnte nicht entfernt werden.");
      return;
    }

    await load();
    window.dispatchEvent(new Event(BIRTHDAYS_UPDATED_EVENT));
  }

  async function unassign(teenId: number) {
    setBusy(true);

    const { error } = await supabase.from("teen_mentors").delete().eq("teen_id", teenId);

    setBusy(false);

    if (error) {
      console.error("Unassign error:", error);
      toast.error(isRu ? "Не удалось убрать подростка." : "Teenager konnte nicht entfernt werden.");
      return;
    }

    await load();
    window.dispatchEvent(new Event(BIRTHDAYS_UPDATED_EVENT));
  }

  /* ---------- карточка подростка ---------- */

  function TeenRow({
    row,
    mentorName,
    removable,
  }: {
    row: Row;
    mentorName?: string;
    removable?: boolean;
  }) {
    const urgent = row.next.days <= 7 && !row.greeted;

    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => toggleGreeted(row)}
          aria-label={isRu ? "Отметить, что поздравил" : "Als gratuliert markieren"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
            row.greeted
              ? "border-emerald-600 bg-emerald-600 text-white"
              : urgent
                ? "border-amber-300 bg-amber-50 text-amber-600"
                : "border-[#dfe2e5] bg-white text-[#c3c8ce]"
          }`}
        >
          <Check size={16} strokeWidth={2.6} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-[#111820]">
            {fullName(row.teen)}
          </div>

          <div className="truncate text-[12px] text-[#8a939d]">
            {dateLabel(row.teen.birth_date)} ·{" "}
            {isRu ? `исполнится ${row.next.turns}` : `wird ${row.next.turns}`}
            {mentorName ? ` · ${mentorName}` : ""}
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            row.greeted
              ? "bg-emerald-50 text-emerald-700"
              : urgent
                ? "bg-amber-100 text-amber-800"
                : "bg-[#f1f2f3] text-[#65707d]"
          }`}
        >
          {row.greeted ? (isRu ? "поздравил" : "gratuliert") : shortDays(row.next.days, isRu)}
        </span>

        {removable && (
          <button
            type="button"
            disabled={busy}
            onClick={() => unassign(row.teen.id)}
            aria-label={isRu ? "Убрать из списка" : "Aus der Liste entfernen"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b1b7bf] transition hover:bg-red-50 hover:text-red-500"
          >
            <UserMinus size={15} />
          </button>
        )}
      </div>
    );
  }

  /* ---------- сортировка служителей ---------- */

  const memberList = useMemo(() => {
    return members
      .filter(
        (member) =>
          responsibleIds.includes(member.id) ||
          (info.byMember.get(member.id)?.length ?? 0) > 0,
      )
      .map((member) => {
        const rows = info.byMember.get(member.id) ?? [];
        const soonCount = rows.filter((r) => r.next.days <= SOON_DAYS && !r.greeted).length;
        const nearest = rows.find((r) => !r.greeted)?.next.days ?? 999;

        return { member, rows, soonCount, nearest };
      })
      .sort((a, b) => {
        if (a.member.id === myMemberId) return -1;
        if (b.member.id === myMemberId) return 1;
        if (a.soonCount !== b.soonCount) return b.soonCount - a.soonCount;
        if (a.rows.length === 0 !== (b.rows.length === 0)) return a.rows.length === 0 ? 1 : -1;
        return a.nearest - b.nearest;
      });
  }, [members, info.byMember, myMemberId, responsibleIds]);

  /* ---------- выбор подростка ---------- */

  const pickerMember = members.find((x) => x.id === picker) ?? null;

  const pickerList = useMemo(() => {
    const q = search.trim().toLowerCase();

    return teens
      .filter((teen) => info.mentorOf.get(teen.id) !== picker)
      .filter((teen) => !q || fullName(teen).toLowerCase().includes(q))
      .map((teen) => {
        const mid = info.mentorOf.get(teen.id);
        return {
          teen,
          mentor: mid ? members.find((x) => x.id === mid) : undefined,
        };
      })
      .sort((a, b) => Number(Boolean(a.mentor)) - Number(Boolean(b.mentor)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teens, members, info.mentorOf, picker, search]);

  return (
    <main className="min-h-screen bg-[#f7f7f6] pb-28 text-[#111820]">
      <div className="mx-auto w-full max-w-[640px] px-4 pt-6 sm:px-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111820] text-white">
            <Cake size={22} />
          </div>

          <div>
            <h1 className="text-[26px] font-bold leading-none tracking-[-0.04em]">
              {isRu ? "Дни рождения" : "Geburtstage"}
            </h1>
            <p className="mt-1.5 text-[13px] text-neutral-500">
              {isRu ? "Кто за кого отвечает и кого пора поздравить" : "Wer für wen zuständig ist und wem man gratulieren sollte"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-[110px] animate-pulse rounded-[20px] bg-white" />
            <div className="h-[64px] animate-pulse rounded-[20px] bg-white" />
            <div className="h-[64px] animate-pulse rounded-[20px] bg-white" />
          </div>
        ) : (
          <>
            {/* СКОРО */}
            <section className="mb-5 overflow-hidden rounded-[20px] border border-amber-200 bg-amber-50/60">
              <div className="flex items-center justify-between px-4 pt-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-700">
                  {isRu ? `Скоро · ${SOON_DAYS} дней` : `Bald · ${SOON_DAYS} Tage`}
                </p>
                <span className="text-[11px] font-bold text-amber-700">{info.soon.length}</span>
              </div>

              {info.soon.length === 0 ? (
                <p className="px-4 pb-4 pt-2 text-[13px] text-amber-800/70">
                  {isRu ? "В ближайшие две недели никого — или всех уже поздравили 🎉" : "In den nächsten zwei Wochen niemand – oder alle sind schon gratuliert 🎉"}
                </p>
              ) : (
                <div className="mt-1 divide-y divide-amber-100">
                  {info.soon.map((row) => (
                    <TeenRow
                      key={row.teen.id}
                      row={row}
                      mentorName={
                        row.mentor
                          ? row.mentor.first_name
                          : isRu
                            ? "без ответственного"
                            : "ohne Zuständigen"
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {/* СЛУЖИТЕЛИ */}
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]">
              {isRu ? "Служители" : "Mitarbeitende"}
            </p>

            <div className="space-y-2.5">
              {memberList.length === 0 && (
                <p className="rounded-[20px] border border-dashed border-[#d5d9dd] px-4 py-6 text-center text-[13px] text-[#9aa2ad]">
                  {isRu ? "Пока нет ответственных — добавь первого." : "Noch keine Zuständigen – füge den ersten hinzu."}
                </p>
              )}

              {memberList.map(({ member, rows, soonCount }) => {
                const open = openId === member.id || (openId === null && member.id === myMemberId && rows.length > 0);
                const mine = member.id === myMemberId;

                return (
                  <section
                    key={member.id}
                    className={`overflow-hidden rounded-[20px] border bg-white ${
                      soonCount > 0 ? "border-amber-200" : "border-[#e6e8ea]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? "none" : member.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${
                          rows.length > 0 ? "bg-[#111820] text-white" : "bg-[#f1f2f3] text-[#9aa2ad]"
                        }`}
                      >
                        {member.first_name.charAt(0)}
                        {member.last_name.charAt(0)}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold">
                          {member.first_name}{" "}
                          <span className="font-medium text-[#8a939d]">{member.last_name}</span>
                          {mine && (
                            <span className="ml-2 rounded-full bg-[#111820] px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {isRu ? "я" : "ich"}
                            </span>
                          )}
                        </span>

                        <span className="block text-[12px] text-[#8a939d]">
                          {rows.length === 0
                            ? isRu ? "пока нет подростков" : "noch keine Teenager"
                            : isRu ? `подростков: ${rows.length}` : `Teenager: ${rows.length}`}
                        </span>
                      </span>

                      {soonCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                          <Cake size={12} />
                          {soonCount}
                        </span>
                      )}

                      <ChevronDown
                        size={17}
                        className={`shrink-0 text-[#9aa2ad] transition ${open ? "rotate-180" : ""}`}
                      />
                    </button>

                    {open && (
                      <div className="border-t border-[#f0f1f2]">
                        <div className="divide-y divide-[#f5f6f6]">
                          {rows.map((row) => (
                            <TeenRow key={row.teen.id} row={row} removable />
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSearch("");
                              setPicker(member.id);
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-[#cfd3d8] px-3.5 text-[12.5px] font-semibold text-[#374353] transition active:scale-[0.98]"
                          >
                            <Plus size={14} />
                            {isRu ? "Добавить подростка" : "Teenager hinzufügen"}
                          </button>

                          {confirmRemove === member.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => removeResponsible(member.id)}
                                className="h-9 rounded-full bg-red-500 px-3.5 text-[12px] font-bold text-white"
                              >
                                {isRu ? "Да, убрать" : "Ja, entfernen"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRemove(null)}
                                className="h-9 rounded-full bg-[#f1f2f3] px-3 text-[12px] font-semibold text-[#65707d]"
                              >
                                {isRu ? "Отмена" : "Abbrechen"}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRemove(member.id)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-[#9aa2ad] transition hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 size={13} />
                              {isRu ? "Убрать ответственного" : "Zuständigen entfernen"}
                            </button>
                          )}
                        </div>

                        {confirmRemove === member.id && rows.length > 0 && (
                          <p className="px-4 pb-3 text-[11.5px] text-red-500">
                            {isRu
                              ? "Его подростки станут «без ответственного». Сами подростки не удаляются."
                              : "Seine Teenager werden „ohne Zuständigen“. Die Teenager selbst bleiben erhalten."}
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}

              <button
                type="button"
                onClick={() => setMemberPicker(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-[#cfd3d8] bg-white text-[13px] font-semibold text-[#374353] transition active:scale-[0.99]"
              >
                <UserPlus size={16} />
                {isRu ? "Добавить служителя" : "Mitarbeiter hinzufügen"}
              </button>

              {/* без ответственного */}
              {info.unassigned.length > 0 && (
                <section className="overflow-hidden rounded-[20px] border border-dashed border-[#d5d9dd] bg-white/60">
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === "none" ? null : "none")}
                    className="flex w-full items-center justify-between px-4 py-3.5 text-left"
                  >
                    <span>
                      <span className="block text-[14px] font-bold text-[#65707d]">
                        {isRu ? "Без ответственного" : "Ohne Zuständigen"}
                      </span>
                      <span className="block text-[12px] text-[#9aa2ad]">
                        {isRu ? `подростков: ${info.unassigned.length}` : `Teenager: ${info.unassigned.length}`}
                      </span>
                    </span>
                    <ChevronDown
                      size={17}
                      className={`text-[#9aa2ad] transition ${openId === "none" ? "rotate-180" : ""}`}
                    />
                  </button>

                  {openId === "none" && (
                    <div className="divide-y divide-[#f5f6f6] border-t border-[#f0f1f2]">
                      {info.unassigned.map((row) => (
                        <TeenRow key={row.teen.id} row={row} />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </>
        )}
      </div>

      {/* ВЫБОР СЛУЖИТЕЛЯ */}
      {memberPicker && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setMemberPicker(false)}
        >
          <div
            className="flex max-h-[82vh] w-full max-w-[520px] flex-col rounded-t-[24px] bg-white sm:rounded-[24px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <div className="text-[16px] font-bold">
                {isRu ? "Добавить служителя" : "Mitarbeiter hinzufügen"}
              </div>

              <button
                type="button"
                onClick={() => setMemberPicker(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f2f3]"
                aria-label={isRu ? "Закрыть" : "Schließen"}
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto px-2 pb-4">
              {members.filter((m) => !memberList.some((x) => x.member.id === m.id)).length === 0 ? (
                <p className="px-3 py-8 text-center text-[13px] text-[#9aa2ad]">
                  {isRu ? "Все служители уже в списке" : "Alle Mitarbeitenden sind schon in der Liste"}
                </p>
              ) : (
                members
                  .filter((m) => !memberList.some((x) => x.member.id === m.id))
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={busy}
                      onClick={() => addResponsible(m.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#f6f7f7] active:bg-[#f1f2f3]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f2f3] text-[13px] font-bold text-[#65707d]">
                        {m.first_name.charAt(0)}
                        {m.last_name.charAt(0)}
                      </span>
                      <span className="text-[14px] font-semibold">{fullName(m)}</span>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ВЫБОР ПОДРОСТКА */}
      {pickerMember && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setPicker(null)}
        >
          <div
            className="flex max-h-[82vh] w-full max-w-[520px] flex-col rounded-t-[24px] bg-white sm:rounded-[24px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <div>
                <div className="text-[16px] font-bold">
                  {isRu ? "Добавить подростка" : "Teenager hinzufügen"}
                </div>
                <div className="text-[12px] text-[#8a939d]">
                  {isRu ? "для " : "für "}
                  {pickerMember.first_name}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPicker(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f2f3]"
                aria-label={isRu ? "Закрыть" : "Schließen"}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pb-2">
              <div className="flex h-11 items-center gap-2 rounded-xl bg-[#f1f2f3] px-3">
                <Search size={15} className="text-[#9aa2ad]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={isRu ? "Поиск по имени" : "Nach Namen suchen"}
                  className="h-full w-full bg-transparent text-[14px] outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto px-2 pb-4">
              {pickerList.length === 0 ? (
                <p className="px-3 py-8 text-center text-[13px] text-[#9aa2ad]">
                  {isRu ? "Никого не найдено" : "Niemand gefunden"}
                </p>
              ) : (
                pickerList.map(({ teen, mentor }) => (
                  <button
                    key={teen.id}
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      await assign(teen.id, pickerMember.id);
                      setPicker(null);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#f6f7f7] active:bg-[#f1f2f3]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold">{fullName(teen)}</span>
                      <span className="block text-[12px] text-[#8a939d]">{dateLabel(teen.birth_date)}</span>
                    </span>

                    {mentor && (
                      <span className="shrink-0 rounded-full bg-[#f1f2f3] px-2 py-0.5 text-[11px] font-medium text-[#65707d]">
                        {isRu ? "сейчас: " : "jetzt: "}
                        {mentor.first_name}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}