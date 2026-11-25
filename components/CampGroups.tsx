"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Bed, Check, Home, Loader2, Pencil, Plus, Search, Shuffle, Trash2, UserPlus, Users, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { ageOn } from "@/lib/campReg";

/* ===================== ТИПЫ ===================== */

type Teen = {
  id: number;
  status: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: "m" | "f" | null;
  group_id: number | null;
  cabin_id: number | null;
  friend_wish: string | null;
};
type Group = { id: number; camp_id: number; name: string; color: string; mentor_ids: number[] };
type Cabin = { id: number; camp_id: number; name: string; kind: "m" | "f" | "any"; capacity: number; note: string | null };
type Leader = { id: number; member_id: number | null; guest_name: string | null; role_title: string; status: string; cabin_id: number | null };
type Member = { id: number; first_name: string; last_name: string | null };

const COLORS = ["#6366f1", "#f59e0b", "#14b8a6", "#ec4899", "#22c55e", "#ef4444", "#0ea5e9", "#8b5cf6"];

const inputCls = "w-full rounded-[12px] border border-[#e2dcc8] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1b2431]";

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b2431]/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[26px] bg-[#faf8f3] p-5 pb-8 sm:rounded-[26px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-extrabold tracking-[-0.01em]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-[#ece6d3]">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-[#8a8678]">{label}</span>
      {children}
    </label>
  );
}

function Btn({ children, onClick, disabled, busy }: { children: ReactNode; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ffc93c] text-[15px] font-bold text-[#1b2431] transition active:scale-[0.99] disabled:opacity-40">
      {busy && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

async function api(body: unknown) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/camps/admin", {
    method: "POST",
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return Boolean(res?.ok);
}

/* ===================== КОМПОНЕНТ ===================== */

export default function CampGroups({ campId, campStart, canManage, isRu }: { campId: number; campStart: string | null; canManage: boolean; isRu: boolean }) {
  const t = (ru: string, de: string) => (isRu ? ru : de);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [teens, setTeens] = useState<Teen[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [mode, setMode] = useState<"groups" | "cabins">("groups");
  const [groupForm, setGroupForm] = useState<Partial<Group> | null>(null);
  const [cabinForm, setCabinForm] = useState<Partial<Cabin> | null>(null);
  const [pick, setPick] = useState<{ type: "group" | "cabin"; id: number } | null>(null); // добавить людей
  const [pickSel, setPickSel] = useState<Set<string>>(new Set());
  const [pickQ, setPickQ] = useState("");
  const [moveTeen, setMoveTeen] = useState<Teen | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const [regRes, gR, cR, lR, mR] = await Promise.all([
      fetch(`/api/camps/admin?camp_id=${campId}`, { headers: { Authorization: `Bearer ${sess.session?.access_token ?? ""}` }, cache: "no-store" }).catch(() => null),
      supabase.from("camp_groups").select("*").eq("camp_id", campId).order("id"),
      supabase.from("camp_cabins").select("*").eq("camp_id", campId).order("id"),
      supabase.from("camp_team").select("id, member_id, guest_name, role_title, status, cabin_id").eq("camp_id", campId).order("id"),
      supabase.from("team_members").select("id, first_name, last_name"),
    ]);
    if (!regRes || !regRes.ok || gR.error || cR.error) {
      setError(t("Не удалось загрузить. Проверь, что выполнен camps-3.sql и есть право T-Camps.", "Laden fehlgeschlagen. Ist camps-3.sql ausgeführt und das Recht T-Camps vorhanden?"));
      setLoading(false);
      return;
    }
    setError("");
    const j = (await regRes.json()) as { registrations?: Teen[] };
    setTeens(j.registrations ?? []);
    setGroups((gR.data ?? []) as Group[]);
    setCabins((cR.data ?? []) as Cabin[]);
    setLeaders((lR.data ?? []) as Leader[]);
    setMembers((mR.data ?? []) as Member[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campId, isRu]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  /* ---------- вычисления ---------- */

  const people = useMemo(() => teens.filter((r) => r.status === "confirmed" || r.status === "new"), [teens]);
  const memberName = (id: number | null) => {
    const m = members.find((x) => x.id === id);
    if (!m) return "?";
    const last = (m.last_name ?? "").trim();
    return `${m.first_name}${last && last !== "-" ? " " + last : ""}`;
  };
  const leaderName = (l: Leader) => (l.member_id ? memberName(l.member_id) : (l.guest_name ?? "?"));
  const teenName = (r: Teen) => `${r.first_name} ${r.last_name}`;
  const age = (r: Teen) => ageOn(r.birth_date, campStart);

  const unGroup = people.filter((r) => !r.group_id);
  const unCabin = people.filter((r) => !r.cabin_id);

  const counts = (list: Teen[]) => ({
    total: list.length,
    boys: list.filter((r) => r.gender === "m").length,
    girls: list.filter((r) => r.gender === "f").length,
    avg: list.length ? Math.round((list.reduce((a, r) => a + (age(r) ?? 0), 0) / list.length) * 10) / 10 : 0,
  });

  /* ---------- сохранение ---------- */

  async function assign(ids: number[], patch: { group_id?: number | null; cabin_id?: number | null }) {
    if (ids.length === 0) return true;
    const ok = await api({ action: "assign", ids, ...patch });
    if (!ok) setError(t("Не удалось сохранить.", "Speichern fehlgeschlagen."));
    return ok;
  }

  async function saveGroup() {
    if (!groupForm?.name?.trim()) return;
    setBusy(true);
    const row = { camp_id: campId, name: groupForm.name.trim(), color: groupForm.color ?? COLORS[0], mentor_ids: groupForm.mentor_ids ?? [] };
    const q = groupForm.id ? supabase.from("camp_groups").update(row).eq("id", groupForm.id) : supabase.from("camp_groups").insert(row);
    const { error: e } = await q;
    setBusy(false);
    if (e) return setError(e.message);
    setGroupForm(null);
    void load();
  }

  async function deleteGroup(id: number) {
    if (!window.confirm(t("Удалить отряд? Подростки останутся без отряда.", "Gruppe löschen? Die Teens bleiben ohne Gruppe."))) return;
    await supabase.from("camp_groups").delete().eq("id", id);
    setGroupForm(null);
    void load();
  }

  async function saveCabin() {
    if (!cabinForm?.name?.trim()) return;
    setBusy(true);
    const row = {
      camp_id: campId,
      name: cabinForm.name.trim(),
      kind: cabinForm.kind ?? "any",
      capacity: Math.max(1, Number(cabinForm.capacity) || 1),
      note: cabinForm.note?.trim() || null,
    };
    const q = cabinForm.id ? supabase.from("camp_cabins").update(row).eq("id", cabinForm.id) : supabase.from("camp_cabins").insert(row);
    const { error: e } = await q;
    setBusy(false);
    if (e) return setError(e.message);
    setCabinForm(null);
    void load();
  }

  async function deleteCabin(id: number) {
    if (!window.confirm(t("Удалить домик? Жильцы останутся без домика.", "Hütte löschen? Die Bewohner bleiben ohne Hütte."))) return;
    await supabase.from("camp_cabins").delete().eq("id", id);
    setCabinForm(null);
    void load();
  }

  /* ---------- добавление людей ---------- */

  function openPick(type: "group" | "cabin", id: number) {
    setPick({ type, id });
    setPickSel(new Set());
    setPickQ("");
  }

  async function confirmPick() {
    if (!pick) return;
    setBusy(true);
    const teenIds = [...pickSel].filter((k) => k.startsWith("t")).map((k) => Number(k.slice(1)));
    const leaderIds = [...pickSel].filter((k) => k.startsWith("l")).map((k) => Number(k.slice(1)));
    if (pick.type === "group") await assign(teenIds, { group_id: pick.id });
    else {
      await assign(teenIds, { cabin_id: pick.id });
      if (leaderIds.length > 0) await supabase.from("camp_team").update({ cabin_id: pick.id }).in("id", leaderIds);
    }
    setBusy(false);
    setPick(null);
    void load();
  }

  async function moveTo(r: Teen, target: number | null) {
    setBusy(true);
    await assign([r.id], mode === "groups" ? { group_id: target } : { cabin_id: target });
    setBusy(false);
    setMoveTeen(null);
    void load();
  }

  async function removeLeader(l: Leader) {
    await supabase.from("camp_team").update({ cabin_id: null }).eq("id", l.id);
    void load();
  }

  /* ---------- автораспределение ---------- */

  async function autoGroups() {
    if (groups.length === 0) return;
    setBusy(true);
    const loads: Record<number, { total: number; m: number; f: number; ages: number }> = {};
    groups.forEach((g) => (loads[g.id] = { total: 0, m: 0, f: 0, ages: 0 }));
    people.filter((r) => r.group_id && loads[r.group_id]).forEach((r) => {
      const l = loads[r.group_id!];
      l.total++;
      if (r.gender === "m") l.m++;
      if (r.gender === "f") l.f++;
      l.ages += age(r) ?? 0;
    });
    const todo = [...unGroup].sort((a, b) => (a.gender ?? "").localeCompare(b.gender ?? "") || (age(b) ?? 0) - (age(a) ?? 0));
    const byGroup: Record<number, number[]> = {};
    for (const r of todo) {
      const key = r.gender === "f" ? "f" : "m";
      const best = [...groups].sort((a, b) => loads[a.id][key] - loads[b.id][key] || loads[a.id].total - loads[b.id].total || loads[a.id].ages - loads[b.id].ages)[0];
      loads[best.id][key]++;
      loads[best.id].total++;
      loads[best.id].ages += age(r) ?? 0;
      (byGroup[best.id] ??= []).push(r.id);
    }
    for (const [gid, ids] of Object.entries(byGroup)) await assign(ids, { group_id: Number(gid) });
    setBusy(false);
    setNotice(t(`Распределено: ${todo.length}`, `Verteilt: ${todo.length}`));
    void load();
  }

  async function autoCabins() {
    if (cabins.length === 0) return;
    setBusy(true);
    const occ: Record<number, number> = {};
    cabins.forEach((c) => (occ[c.id] = 0));
    people.forEach((r) => r.cabin_id && occ[r.cabin_id] !== undefined && occ[r.cabin_id]++);
    leaders.forEach((l) => l.cabin_id && occ[l.cabin_id] !== undefined && occ[l.cabin_id]++);
    const byCabin: Record<number, number[]> = {};
    let skipped = 0;
    const todo = [...unCabin].sort((a, b) => (a.group_id ?? 0) - (b.group_id ?? 0));
    for (const r of todo) {
      const fits = cabins.filter((c) => occ[c.id] < c.capacity && (c.kind === "any" || c.kind === r.gender));
      if (fits.length === 0) {
        skipped++;
        continue;
      }
      const sameGroup = (c: Cabin) => people.filter((p) => p.cabin_id === c.id && p.group_id && p.group_id === r.group_id).length + (byCabin[c.id] ?? []).filter((id) => people.find((p) => p.id === id)?.group_id === r.group_id && r.group_id).length;
      const best = fits.sort((a, b) => sameGroup(b) * 10 + (b.kind === r.gender ? 5 : 0) + (b.capacity - occ[b.id]) - (sameGroup(a) * 10 + (a.kind === r.gender ? 5 : 0) + (a.capacity - occ[a.id])))[0];
      occ[best.id]++;
      (byCabin[best.id] ??= []).push(r.id);
    }
    for (const [cid, ids] of Object.entries(byCabin)) await assign(ids, { cabin_id: Number(cid) });
    setBusy(false);
    setNotice(skipped > 0 ? t(`Распределено: ${todo.length - skipped}, не хватило мест: ${skipped}`, `Verteilt: ${todo.length - skipped}, zu wenig Plätze: ${skipped}`) : t(`Распределено: ${todo.length}`, `Verteilt: ${todo.length}`));
    void load();
  }

  /* ===================== ВЕРСТКА ===================== */

  if (loading) {
    return (
      <div className="mt-10 flex justify-center">
        <Loader2 className="animate-spin text-[#8a8678]" />
      </div>
    );
  }

  const TeenRow = ({ r, extra }: { r: Teen; extra?: ReactNode }) => (
    <button type="button" disabled={!canManage} onClick={() => setMoveTeen(r)} className="flex w-full items-center gap-2.5 rounded-[12px] bg-[#faf8f3] px-3 py-2 text-left">
      <span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold " + (r.gender === "f" ? "bg-pink-50 text-pink-700" : "bg-sky-50 text-sky-700")}>
        {(r.first_name[0] ?? "").toUpperCase()}
        {(r.last_name[0] ?? "").toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{teenName(r)}</span>
      {extra}
      <span className="shrink-0 text-[12px] text-[#8a8678]">{age(r) ?? "-"}</span>
    </button>
  );

  const totalCounts = counts(people);

  /* выбор людей в отряд или домик */
  const pickList = (() => {
    if (!pick) return { teens: [] as Teen[], leaders: [] as Leader[] };
    const s = pickQ.trim().toLowerCase();
    const ts = (pick.type === "group" ? unGroup : unCabin).filter((r) => !s || teenName(r).toLowerCase().includes(s));
    const ls = pick.type === "cabin" ? leaders.filter((l) => !l.cabin_id && l.status !== "declined" && (!s || leaderName(l).toLowerCase().includes(s))) : [];
    return { teens: ts, leaders: ls };
  })();

  return (
    <div className="mt-4 space-y-4">
      {error && <div className="rounded-[16px] bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}
      {notice && (
        <div className="flex items-center justify-between rounded-[16px] bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-800">
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="Close">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {[
          [t("Едут", "Dabei"), totalCounts.total],
          [t("Парни", "Jungen"), totalCounts.boys],
          [t("Девушки", "Mädchen"), totalCounts.girls],
          [t("Ср. возраст", "Ø Alter"), totalCounts.avg || "-"],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-[16px] border border-[#ece6d3] bg-white p-3 text-center">
            <p className="text-[21px] font-extrabold leading-none">{value}</p>
            <p className="mt-1.5 text-[11px] text-[#8a8678]">{label}</p>
          </div>
        ))}
      </div>
      <p className="-mt-2 text-[12px] text-[#8a8678]">{t("Считаются заявки со статусом «Новая» и «Подтверждена».", "Gezählt werden Anmeldungen mit Status „Neu“ und „Bestätigt“.")}</p>

      <div className="grid grid-cols-2 gap-1 rounded-[16px] bg-[#f1ecdc] p-1">
        {(
          [
            ["groups", t("Отряды", "Gruppen"), Users],
            ["cabins", t("Домики", "Hütten"), Home],
          ] as const
        ).map(([key, label, Icon]) => (
          <button key={key} type="button" onClick={() => setMode(key)} className={"flex h-10 items-center justify-center gap-1.5 rounded-[12px] text-[13px] font-bold transition " + (mode === key ? "bg-white shadow-sm" : "text-[#8a8678]")}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ================= ОТРЯДЫ ================= */}
      {mode === "groups" && (
        <div className="space-y-3">
          {canManage && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setGroupForm({ color: COLORS[groups.length % COLORS.length], mentor_ids: [] })} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#ffc93c] text-[13px] font-bold text-[#1b2431]">
                <Plus size={15} />
                {t("Отряд", "Gruppe")}
              </button>
              {unGroup.length > 0 && groups.length > 0 && (
                <button type="button" onClick={autoGroups} disabled={busy} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#1b2431] text-[13px] font-bold text-white disabled:opacity-50">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Shuffle size={15} />}
                  {t("Распределить сами", "Automatisch verteilen")}
                </button>
              )}
            </div>
          )}

          {groups.length === 0 && (
            <div className="rounded-[20px] border border-dashed border-[#e2dcc8] bg-white/60 px-6 py-8 text-center text-[13px] text-[#8a8678]">{t("Отрядов пока нет. Создайте первый.", "Noch keine Gruppen. Lege die erste an.")}</div>
          )}

          {groups.map((g) => {
            const list = people.filter((r) => r.group_id === g.id);
            const c = counts(list);
            const mentors = (g.mentor_ids ?? []).map((id) => leaders.find((l) => l.id === id)).filter(Boolean) as Leader[];
            return (
              <section key={g.id} className="overflow-hidden rounded-[22px] border border-[#ece6d3] bg-white">
                <div className="flex items-center gap-3 p-4" style={{ borderLeft: `5px solid ${g.color}` }}>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[17px] font-extrabold">{g.name}</h3>
                    <p className="mt-0.5 text-[12px] text-[#8a8678]">
                      {c.total} {t("чел.", "Pers.")} · {c.boys} {t("парн.", "J.")} · {c.girls} {t("дев.", "M.")}
                      {c.total > 0 ? ` · ${t("ср.", "Ø")} ${c.avg}` : ""}
                    </p>
                  </div>
                  {canManage && (
                    <button type="button" onClick={() => setGroupForm(g)} aria-label="Edit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3efe2] text-[#5b5a50]">
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 px-4 pb-4">
                  <p className="text-[12px] font-semibold text-[#8a8678]">{t("Наставники", "Mentoren")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mentors.length === 0 ? (
                      <span className="text-[12px] text-[#a8a493]">{t("не назначены", "nicht zugewiesen")}</span>
                    ) : (
                      mentors.map((m) => (
                        <span key={m.id} className="rounded-full px-2.5 py-1 text-[12px] font-bold text-white" style={{ backgroundColor: g.color }}>
                          {leaderName(m)}
                        </span>
                      ))
                    )}
                  </div>
                  <div className="space-y-1.5 pt-2">
                    {list.map((r) => (
                      <TeenRow key={r.id} r={r} />
                    ))}
                  </div>
                  {canManage && (
                    <button type="button" onClick={() => openPick("group", g.id)} disabled={unGroup.length === 0} className="mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-[12px] bg-white text-[13px] font-semibold ring-1 ring-[#ece6d3] disabled:opacity-40">
                      <UserPlus size={15} />
                      {t("Добавить подростков", "Teens hinzufügen")}
                    </button>
                  )}
                </div>
              </section>
            );
          })}

          {unGroup.length > 0 && (
            <section className="rounded-[22px] border border-dashed border-[#e2dcc8] bg-white/60 p-4">
              <h3 className="text-[15px] font-extrabold">
                {t("Без отряда", "Ohne Gruppe")} ({unGroup.length})
              </h3>
              <div className="mt-2.5 space-y-1.5">
                {unGroup.map((r) => (
                  <TeenRow key={r.id} r={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ================= ДОМИКИ ================= */}
      {mode === "cabins" && (
        <div className="space-y-3">
          {canManage && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setCabinForm({ kind: "any", capacity: 8 })} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#ffc93c] text-[13px] font-bold text-[#1b2431]">
                <Plus size={15} />
                {t("Домик", "Hütte")}
              </button>
              {unCabin.length > 0 && cabins.length > 0 && (
                <button type="button" onClick={autoCabins} disabled={busy} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#1b2431] text-[13px] font-bold text-white disabled:opacity-50">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Shuffle size={15} />}
                  {t("Расселить сами", "Automatisch belegen")}
                </button>
              )}
            </div>
          )}

          {cabins.length === 0 && (
            <div className="rounded-[20px] border border-dashed border-[#e2dcc8] bg-white/60 px-6 py-8 text-center text-[13px] text-[#8a8678]">{t("Домиков пока нет. Создайте первый.", "Noch keine Hütten. Lege die erste an.")}</div>
          )}

          {cabins.map((c) => {
            const tl = people.filter((r) => r.cabin_id === c.id);
            const ll = leaders.filter((l) => l.cabin_id === c.id);
            const used = tl.length + ll.length;
            const mismatch = c.kind !== "any" && tl.some((r) => r.gender && r.gender !== c.kind);
            const over = used > c.capacity;
            return (
              <section key={c.id} className="rounded-[22px] border border-[#ece6d3] bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] " + (c.kind === "m" ? "bg-sky-50 text-sky-700" : c.kind === "f" ? "bg-pink-50 text-pink-700" : "bg-[#fff4d1] text-[#9a6b00]")}>
                    <Bed size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[17px] font-extrabold">{c.name}</h3>
                    <p className="mt-0.5 text-[12px] text-[#8a8678]">
                      {c.kind === "m" ? t("Парни", "Jungen") : c.kind === "f" ? t("Девушки", "Mädchen") : t("Смешанный", "Gemischt")}
                      {c.note ? ` · ${c.note}` : ""}
                    </p>
                  </div>
                  <span className={"shrink-0 rounded-full px-3 py-1.5 text-[13px] font-extrabold " + (over ? "bg-red-50 text-red-700" : used === c.capacity ? "bg-emerald-50 text-emerald-800" : "bg-[#f1ecdc] text-[#5b5a50]")}>
                    {used}/{c.capacity}
                  </span>
                  {canManage && (
                    <button type="button" onClick={() => setCabinForm(c)} aria-label="Edit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3efe2] text-[#5b5a50]">
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
                {(over || mismatch) && (
                  <p className="mt-2.5 flex items-center gap-1.5 rounded-[12px] bg-[#fff8f1] px-3 py-2 text-[12px] font-semibold text-[#c2410c]">
                    <AlertTriangle size={14} />
                    {over ? t("Больше жильцов, чем мест.", "Mehr Bewohner als Plätze.") : t("В домике есть жильцы другого пола.", "In der Hütte wohnen Bewohner des anderen Geschlechts.")}
                  </p>
                )}
                <div className="mt-3 space-y-1.5">
                  {ll.map((l) => (
                    <div key={`l${l.id}`} className="flex items-center gap-2.5 rounded-[12px] bg-[#1b2431] px-3 py-2 text-white">
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{leaderName(l)}</span>
                      <span className="shrink-0 text-[11px] text-[#ffc93c]">{t("служитель", "Mitarbeiter")}</span>
                      {canManage && (
                        <button type="button" onClick={() => removeLeader(l)} aria-label="Remove" className="shrink-0 text-white/70">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {tl.map((r) => (
                    <TeenRow
                      key={r.id}
                      r={r}
                      extra={
                        r.group_id ? (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: groups.find((g) => g.id === r.group_id)?.color ?? "#ccc" }} />
                        ) : undefined
                      }
                    />
                  ))}
                </div>
                {canManage && (
                  <button type="button" onClick={() => openPick("cabin", c.id)} disabled={unCabin.length === 0 && leaders.every((l) => l.cabin_id)} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-[12px] bg-white text-[13px] font-semibold ring-1 ring-[#ece6d3] disabled:opacity-40">
                    <UserPlus size={15} />
                    {t("Добавить жильцов", "Bewohner hinzufügen")}
                  </button>
                )}
              </section>
            );
          })}

          {unCabin.length > 0 && (
            <section className="rounded-[22px] border border-dashed border-[#e2dcc8] bg-white/60 p-4">
              <h3 className="text-[15px] font-extrabold">
                {t("Без домика", "Ohne Hütte")} ({unCabin.length})
              </h3>
              <div className="mt-2.5 space-y-1.5">
                {unCabin.map((r) => (
                  <TeenRow key={r.id} r={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ---------- форма отряда ---------- */}
      {groupForm && (
        <Sheet title={groupForm.id ? t("Отряд", "Gruppe") : t("Новый отряд", "Neue Gruppe")} onClose={() => setGroupForm(null)}>
          <div className="space-y-3">
            <Field label={t("Название", "Name")}>
              <input className={inputCls} value={groupForm.name ?? ""} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder={t("Например: Орлы", "z. B. Adler")} />
            </Field>
            <Field label={t("Цвет", "Farbe")}>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setGroupForm({ ...groupForm, color: c })} aria-label={c} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: c }}>
                    {groupForm.color === c && <Check size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("Наставники (из команды лагеря)", "Mentoren (aus dem Camp-Team)")}>
              {leaders.length === 0 ? (
                <p className="text-[12px] text-[#8a8678]">{t("Сначала добавьте людей во вкладке «Команда».", "Füge zuerst Personen im Tab „Team“ hinzu.")}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {leaders
                    .filter((l) => l.status !== "declined")
                    .map((l) => {
                      const on = (groupForm.mentor_ids ?? []).includes(l.id);
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setGroupForm({ ...groupForm, mentor_ids: on ? (groupForm.mentor_ids ?? []).filter((x) => x !== l.id) : [...(groupForm.mentor_ids ?? []), l.id] })}
                          className={"inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 " + (on ? "bg-[#1b2431] text-white ring-[#1b2431]" : "bg-white text-[#5b5a50] ring-[#ece6d3]")}
                        >
                          {on && <Check size={12} className="text-[#ffc93c]" />}
                          {leaderName(l)}
                        </button>
                      );
                    })}
                </div>
              )}
            </Field>
            <Btn onClick={saveGroup} busy={busy} disabled={!groupForm.name?.trim()}>
              {t("Сохранить", "Speichern")}
            </Btn>
            {groupForm.id && (
              <button type="button" onClick={() => deleteGroup(groupForm.id!)} className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-semibold text-red-600">
                <Trash2 size={16} />
                {t("Удалить отряд", "Gruppe löschen")}
              </button>
            )}
          </div>
        </Sheet>
      )}

      {/* ---------- форма домика ---------- */}
      {cabinForm && (
        <Sheet title={cabinForm.id ? t("Домик", "Hütte") : t("Новый домик", "Neue Hütte")} onClose={() => setCabinForm(null)}>
          <div className="space-y-3">
            <Field label={t("Название", "Name")}>
              <input className={inputCls} value={cabinForm.name ?? ""} onChange={(e) => setCabinForm({ ...cabinForm, name: e.target.value })} placeholder={t("Например: Домик 1", "z. B. Hütte 1")} />
            </Field>
            <Field label={t("Для кого", "Für wen")}>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ["m", t("Парни", "Jungen")],
                    ["f", t("Девушки", "Mädchen")],
                    ["any", t("Любой", "Gemischt")],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setCabinForm({ ...cabinForm, kind: k })} className={"flex h-10 items-center justify-center gap-1 rounded-[12px] text-[13px] font-semibold " + (cabinForm.kind === k ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")}>
                    {cabinForm.kind === k && <Check size={13} className="text-[#ffc93c]" />}
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("Сколько мест (с наставниками)", "Wie viele Plätze (mit Mentoren)")}>
              <input inputMode="numeric" className={inputCls} value={cabinForm.capacity ?? ""} onChange={(e) => setCabinForm({ ...cabinForm, capacity: e.target.value.replace(/\D/g, "") as unknown as number })} />
            </Field>
            <Field label={t("Заметка", "Notiz")}>
              <input className={inputCls} value={cabinForm.note ?? ""} onChange={(e) => setCabinForm({ ...cabinForm, note: e.target.value })} />
            </Field>
            <Btn onClick={saveCabin} busy={busy} disabled={!cabinForm.name?.trim()}>
              {t("Сохранить", "Speichern")}
            </Btn>
            {cabinForm.id && (
              <button type="button" onClick={() => deleteCabin(cabinForm.id!)} className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-semibold text-red-600">
                <Trash2 size={16} />
                {t("Удалить домик", "Hütte löschen")}
              </button>
            )}
          </div>
        </Sheet>
      )}

      {/* ---------- добавить людей ---------- */}
      {pick && (
        <Sheet title={pick.type === "group" ? t("Добавить в отряд", "Zur Gruppe hinzufügen") : t("Добавить в домик", "Zur Hütte hinzufügen")} onClose={() => setPick(null)}>
          <div className="space-y-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8678]" />
              <input className={inputCls + " pl-9"} value={pickQ} onChange={(e) => setPickQ(e.target.value)} placeholder={t("Поиск", "Suchen")} />
            </div>
            <div className="max-h-[48vh] space-y-1.5 overflow-y-auto">
              {pickList.leaders.map((l) => {
                const key = `l${l.id}`;
                const on = pickSel.has(key);
                return (
                  <button key={key} type="button" onClick={() => setPickSel((cur) => { const n = new Set(cur); if (on) n.delete(key); else n.add(key); return n; })} className={"flex h-12 w-full items-center gap-3 rounded-[14px] px-4 text-left text-[14px] font-semibold " + (on ? "bg-[#1b2431] text-white" : "bg-white ring-1 ring-[#ece6d3]")}>
                    <span className="min-w-0 flex-1 truncate">{leaderName(l)}</span>
                    <span className={"text-[11px] " + (on ? "text-[#ffc93c]" : "text-[#8a8678]")}>{t("служитель", "Mitarbeiter")}</span>
                    {on && <Check size={16} className="text-[#ffc93c]" />}
                  </button>
                );
              })}
              {pickList.teens.map((r) => {
                const key = `t${r.id}`;
                const on = pickSel.has(key);
                return (
                  <button key={key} type="button" onClick={() => setPickSel((cur) => { const n = new Set(cur); if (on) n.delete(key); else n.add(key); return n; })} className={"flex h-12 w-full items-center gap-3 rounded-[14px] px-4 text-left text-[14px] font-semibold " + (on ? "bg-[#1b2431] text-white" : "bg-white ring-1 ring-[#ece6d3]")}>
                    <span className="min-w-0 flex-1 truncate">{teenName(r)}</span>
                    <span className={"text-[12px] " + (on ? "text-white/70" : "text-[#8a8678]")}>
                      {r.gender === "f" ? t("дев.", "M.") : t("парень", "J.")} · {age(r) ?? "-"}
                    </span>
                    {on && <Check size={16} className="text-[#ffc93c]" />}
                  </button>
                );
              })}
              {pickList.teens.length === 0 && pickList.leaders.length === 0 && <p className="py-6 text-center text-[13px] text-[#8a8678]">{t("Некого добавить.", "Niemand zum Hinzufügen.")}</p>}
            </div>
            <Btn onClick={confirmPick} busy={busy} disabled={pickSel.size === 0}>
              {t("Добавить", "Hinzufügen")} {pickSel.size > 0 ? `(${pickSel.size})` : ""}
            </Btn>
          </div>
        </Sheet>
      )}

      {/* ---------- перенести подростка ---------- */}
      {moveTeen && (
        <Sheet title={teenName(moveTeen)} onClose={() => setMoveTeen(null)}>
          <p className="mb-3 text-[13px] text-[#5b5a50]">{mode === "groups" ? t("В какой отряд перенести", "In welche Gruppe verschieben") : t("В какой домик поселить", "In welche Hütte einziehen")}</p>
          <div className="space-y-1.5">
            {(mode === "groups" ? groups : cabins).map((x) => {
              const current = mode === "groups" ? moveTeen.group_id === x.id : moveTeen.cabin_id === x.id;
              return (
                <button key={x.id} type="button" disabled={busy} onClick={() => moveTo(moveTeen, x.id)} className={"flex h-12 w-full items-center gap-3 rounded-[14px] px-4 text-left text-[14px] font-semibold " + (current ? "bg-[#1b2431] text-white" : "bg-white ring-1 ring-[#ece6d3]")}>
                  {"color" in x && <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: (x as Group).color }} />}
                  <span className="min-w-0 flex-1 truncate">{x.name}</span>
                  {current && <Check size={16} className="text-[#ffc93c]" />}
                </button>
              );
            })}
            <button type="button" disabled={busy} onClick={() => moveTo(moveTeen, null)} className="flex h-12 w-full items-center justify-center rounded-[14px] bg-white text-[14px] font-semibold text-[#8a8678] ring-1 ring-[#ece6d3]">
              {mode === "groups" ? t("Убрать из отряда", "Aus der Gruppe entfernen") : t("Выселить из домика", "Aus der Hütte entfernen")}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}