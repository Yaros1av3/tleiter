"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Banknote, Check, CreditCard, Loader2, LogOut, Search, UserCheck, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { ageOn } from "@/lib/campReg";

type Teen = {
  id: number;
  status: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: "m" | "f" | null;
  group_id: number | null;
  cabin_id: number | null;
  allergies: string | null;
  medications: string | null;
  health_notes: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  arrived_at: string | null;
  departed_at: string | null;
  card_taken: boolean;
  cash_taken: boolean;
  cash_amount: number | null;
  paid_amount: number | null;
};
type Group = { id: number; name: string; color: string };
type Cabin = { id: number; name: string };

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

async function post(body: unknown) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/camps/admin", {
    method: "POST",
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return Boolean(res?.ok);
}

export default function CampCheckin({ campId, campStart, price, canManage, isRu }: { campId: number; campStart: string | null; price: number | null; canManage: boolean; isRu: boolean }) {
  const t = (ru: string, de: string) => (isRu ? ru : de);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teens, setTeens] = useState<Teen[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [filter, setFilter] = useState<"all" | "wait" | "here" | "nocard" | "nocash">("all");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Teen | null>(null);
  const [paid, setPaid] = useState("");
  const [cash, setCash] = useState("");

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const [res, gR, cR] = await Promise.all([
      fetch(`/api/camps/admin?camp_id=${campId}`, { headers: { Authorization: `Bearer ${sess.session?.access_token ?? ""}` }, cache: "no-store" }).catch(() => null),
      supabase.from("camp_groups").select("id, name, color").eq("camp_id", campId),
      supabase.from("camp_cabins").select("id, name").eq("camp_id", campId),
    ]);
    if (!res || !res.ok) {
      setError(t("Не удалось загрузить. Проверь, что выполнен camps-4.sql и есть право T-Camps.", "Laden fehlgeschlagen. Ist camps-4.sql ausgeführt und das Recht T-Camps vorhanden?"));
      setLoading(false);
      return;
    }
    setError("");
    const j = (await res.json()) as { registrations?: Teen[] };
    setTeens((j.registrations ?? []).filter((r) => r.status === "confirmed"));
    setGroups((gR.data ?? []) as Group[]);
    setCabins((cR.data ?? []) as Cabin[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campId, isRu]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    setPaid(detail?.paid_amount != null ? String(detail.paid_amount) : "");
    setCash(detail?.cash_amount != null ? String(detail.cash_amount) : "");
  }, [detail?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* быстрая отметка: сразу меняем на экране, потом сохраняем */
  async function patch(r: Teen, change: Record<string, unknown>) {
    const local: Partial<Teen> = {};
    if ("arrived" in change) local.arrived_at = change.arrived ? new Date().toISOString() : null;
    if ("departed" in change) local.departed_at = change.departed ? new Date().toISOString() : null;
    if ("card_taken" in change) local.card_taken = change.card_taken === true;
    if ("cash_taken" in change) local.cash_taken = change.cash_taken === true;
    const apply = (list: Teen[]) => list.map((x) => (x.id === r.id ? { ...x, ...local } : x));
    setTeens(apply);
    setDetail((cur) => (cur && cur.id === r.id ? { ...cur, ...local } : cur));
    const ok = await post({ action: "checkin", id: r.id, patch: change });
    if (!ok) {
      setError(t("Не удалось сохранить отметку.", "Markierung konnte nicht gespeichert werden."));
      void load();
    }
  }

  async function saveMoney() {
    if (!detail) return;
    await post({ action: "checkin", id: detail.id, patch: { paid_amount: paid, cash_amount: cash } });
    setDetail(null);
    void load();
  }

  const stats = {
    total: teens.length,
    here: teens.filter((r) => r.arrived_at && !r.departed_at).length,
    card: teens.filter((r) => r.card_taken).length,
    cash: teens.filter((r) => r.cash_taken).length,
  };

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return teens.filter((r) => {
      if (s && !`${r.first_name} ${r.last_name}`.toLowerCase().includes(s)) return false;
      if (filter === "wait") return !r.arrived_at;
      if (filter === "here") return Boolean(r.arrived_at);
      if (filter === "nocard") return !r.card_taken;
      if (filter === "nocash") return !r.cash_taken;
      return true;
    });
  }, [teens, filter, q]);

  if (loading) {
    return (
      <div className="mt-10 flex justify-center">
        <Loader2 className="animate-spin text-[#8a8678]" />
      </div>
    );
  }

  const hasHealth = (r: Teen) => Boolean(r.allergies || r.medications || r.health_notes);
  const group = (id: number | null) => groups.find((g) => g.id === id);
  const cabin = (id: number | null) => cabins.find((c) => c.id === id);

  const Round = ({ on, label, icon, onClick, disabled }: { on: boolean; label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex w-[54px] flex-col items-center gap-1 disabled:opacity-50"
    >
      <span className={"flex h-11 w-11 items-center justify-center rounded-full transition " + (on ? "bg-emerald-600 text-white" : "bg-[#f3efe2] text-[#8a8678]")}>{on ? <Check size={19} strokeWidth={3} /> : icon}</span>
      <span className={"text-[10px] font-semibold " + (on ? "text-emerald-700" : "text-[#8a8678]")}>{label}</span>
    </button>
  );

  return (
    <div className="mt-4 space-y-3">
      {error && <div className="rounded-[16px] bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      <div className="grid grid-cols-3 gap-2">
        {[
          [t("Приехали", "Angekommen"), `${stats.here}/${stats.total}`],
          [t("Карты", "Karten"), `${stats.card}/${stats.total}`],
          [t("Деньги", "Geld"), `${stats.cash}/${stats.total}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[16px] border border-[#ece6d3] bg-white p-3 text-center">
            <p className="text-[21px] font-extrabold leading-none">{value}</p>
            <p className="mt-1.5 text-[11px] text-[#8a8678]">{label}</p>
          </div>
        ))}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#f1ecdc]">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${stats.total ? (stats.here / stats.total) * 100 : 0}%` }} />
      </div>
      <p className="text-[12px] text-[#8a8678]">{t("Здесь только подростки со статусом «Подтверждена».", "Hier nur Teens mit Status „Bestätigt“.")}</p>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8678]" />
        <input className={inputCls + " pl-9"} placeholder={t("Поиск по имени", "Nach Namen suchen")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {(
          [
            ["all", t("Все", "Alle")],
            ["wait", t("Ещё не приехали", "Noch nicht da")],
            ["here", t("Приехали", "Angekommen")],
            ["nocard", t("Без карты", "Ohne Karte")],
            ["nocash", t("Без денег", "Ohne Geld")],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={"shrink-0 rounded-full px-3.5 py-2 text-[12px] font-semibold " + (filter === k ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")}>
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#e2dcc8] bg-white/60 px-6 py-8 text-center text-[13px] text-[#8a8678]">
          {teens.length === 0 ? t("Нет подтверждённых подростков. Подтвердите заявки во вкладке «Заявки».", "Keine bestätigten Teens. Bestätige Anmeldungen im Tab „Anmeldung“.") : t("Ничего не найдено.", "Nichts gefunden.")}
        </div>
      ) : (
        shown.map((r) => {
          const g = group(r.group_id);
          const c = cabin(r.cabin_id);
          const a = ageOn(r.birth_date, campStart);
          return (
            <div key={r.id} onClick={() => setDetail(r)} className={"cursor-pointer rounded-[20px] border bg-white p-3.5 " + (r.arrived_at ? "border-emerald-200" : "border-[#ece6d3]")}>
              <div className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[15px] font-bold">
                    {r.first_name} {r.last_name}
                    {hasHealth(r) && <AlertTriangle size={14} className="shrink-0 text-[#c2410c]" />}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[#8a8678]">
                    {a !== null && <span>{a} {t("лет", "J.")}</span>}
                    {g && (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                        {g.name}
                      </span>
                    )}
                    {c && <span>{c.name}</span>}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-start justify-around">
                <Round on={Boolean(r.arrived_at)} label={t("Приехал", "Da")} icon={<UserCheck size={18} />} disabled={!canManage} onClick={() => patch(r, { arrived: !r.arrived_at })} />
                <Round on={r.card_taken} label={t("Карта", "Karte")} icon={<CreditCard size={18} />} disabled={!canManage} onClick={() => patch(r, { card_taken: !r.card_taken })} />
                <Round on={r.cash_taken} label={t("Деньги", "Geld")} icon={<Banknote size={18} />} disabled={!canManage} onClick={() => patch(r, { cash_taken: !r.cash_taken })} />
              </div>
            </div>
          );
        })
      )}

      {detail && (
        <Sheet title={`${detail.first_name} ${detail.last_name}`} onClose={() => setDetail(null)}>
          <div className="space-y-3">
            {hasHealth(detail) && (
              <div className="rounded-[18px] border border-[#f5c9a8] bg-[#fff8f1] p-4">
                <h4 className="flex items-center gap-1.5 text-[13px] font-bold text-[#c2410c]">
                  <AlertTriangle size={14} />
                  {t("Здоровье", "Gesundheit")}
                </h4>
                <dl className="mt-2 space-y-1.5 text-[14px]">
                  {[
                    [t("Аллергии", "Allergien"), detail.allergies],
                    [t("Лекарства", "Medikamente"), detail.medications],
                    [t("Другое", "Sonstiges"), detail.health_notes],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k as string} className="flex gap-3">
                        <dt className="w-[88px] shrink-0 text-[#8a8678]">{k}</dt>
                        <dd className="min-w-0 flex-1 whitespace-pre-line font-medium">{v}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            )}
            {detail.parent_phone && (
              <a href={`tel:${detail.parent_phone}`} className="flex items-center justify-between rounded-[18px] border border-[#ece6d3] bg-white p-4 text-[14px]">
                <span>
                  <span className="block text-[12px] text-[#8a8678]">{t("Родитель", "Elternteil")}</span>
                  <span className="font-semibold">{detail.parent_name ?? "-"}</span>
                </span>
                <span className="font-bold text-[#9a6b00]">{detail.parent_phone}</span>
              </a>
            )}

            <div className="grid grid-cols-3 gap-1.5">
              {[
                [Boolean(detail.arrived_at), t("Приехал", "Angekommen"), () => patch(detail, { arrived: !detail.arrived_at })],
                [detail.card_taken, t("Карта сдана", "Karte abgegeben"), () => patch(detail, { card_taken: !detail.card_taken })],
                [detail.cash_taken, t("Деньги сданы", "Geld abgegeben"), () => patch(detail, { cash_taken: !detail.cash_taken })],
              ].map(([on, label, fn]) => (
                <button key={label as string} type="button" disabled={!canManage} onClick={fn as () => void} className={"flex h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] text-[12px] font-bold " + (on ? "bg-emerald-600 text-white" : "bg-white ring-1 ring-[#ece6d3]")}>
                  {on && <Check size={14} />}
                  {label as string}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-[#8a8678]">{t("Оплачено за лагерь, €", "Bezahlt fürs Camp, €")}</span>
                <input inputMode="decimal" className={inputCls} value={paid} onChange={(e) => setPaid(e.target.value)} disabled={!canManage} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-[#8a8678]">{t("Карманные деньги, €", "Taschengeld, €")}</span>
                <input inputMode="decimal" className={inputCls} value={cash} onChange={(e) => setCash(e.target.value)} disabled={!canManage} />
              </label>
            </div>
            {price != null && (
              <p className="text-[12px] text-[#8a8678]">
                {t("Цена лагеря", "Camp-Preis")}: {price} € · {t("осталось доплатить", "noch offen")}:{" "}
                <b className={Math.max(0, price - (Number(paid.replace(",", ".")) || 0)) > 0 ? "text-[#c2410c]" : "text-emerald-700"}>{Math.max(0, price - (Number(paid.replace(",", ".")) || 0))} €</b>
              </p>
            )}

            {canManage && (
              <>
                <button type="button" onClick={saveMoney} className="flex h-12 w-full items-center justify-center rounded-[14px] bg-[#ffc93c] text-[15px] font-bold text-[#1b2431]">
                  {t("Сохранить суммы", "Beträge speichern")}
                </button>
                <button type="button" onClick={() => patch(detail, { departed: !detail.departed_at })} className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-white text-[14px] font-semibold ring-1 ring-[#ece6d3]">
                  <LogOut size={15} />
                  {detail.departed_at ? t("Отменить отметку об отъезде", "Abreise zurücknehmen") : t("Отметить отъезд домой", "Abreise markieren")}
                </button>
              </>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}