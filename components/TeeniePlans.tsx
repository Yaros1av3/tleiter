"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bus,
  Check,
  ChevronDown,
  BookOpen,
  Clapperboard,
  Dices,
  Footprints,
  Music,
  Palette,
  PartyPopper,
  Pencil,
  Plus,
  ShoppingCart,
  Sparkles,
  Trash2,
  Trophy,
  Utensils,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import DatePicker from "@/components/DatePicker";

type Kind =
  | "film"
  | "craft"
  | "cooking"
  | "outing"
  | "game"
  | "sport"
  | "music"
  | "bible"
  | "party"
  | "workshop"
  | "trip"
  | "other";
type Status = "idea" | "planned" | "done";

type Plan = {
  id: number;
  title: string;
  plan_date: string | null;
  kind: Kind;
  notes: string | null;
  status: Status;
};

type PlanItem = {
  id: number;
  plan_id: number;
  title: string;
  is_done: boolean;
  in_shopping: boolean;
};

type Props = {
  isRu: boolean;
  /** вызывается, когда пункт ушёл в список покупок — чтобы обновить вкладку «Покупки» */
  onShoppingAdded?: () => void;
};

const KINDS: { key: Kind; icon: LucideIcon; ru: string; de: string }[] = [
  { key: "film", icon: Clapperboard, ru: "Фильм", de: "Film" },
  { key: "game", icon: Dices, ru: "Игры", de: "Spiele" },
  { key: "craft", icon: Palette, ru: "Творчество", de: "Basteln" },
  { key: "workshop", icon: Wrench, ru: "Мастер-класс", de: "Workshop" },
  { key: "cooking", icon: Utensils, ru: "Готовим", de: "Kochen" },
  { key: "outing", icon: Footprints, ru: "Прогулка / музей", de: "Ausflug / Museum" },
  { key: "sport", icon: Trophy, ru: "Спорт", de: "Sport" },
  { key: "music", icon: Music, ru: "Музыка", de: "Musik" },
  { key: "bible", icon: BookOpen, ru: "Библия / беседа", de: "Bibel / Gespräch" },
  { key: "party", icon: PartyPopper, ru: "Праздник", de: "Feier" },
  { key: "trip", icon: Bus, ru: "Поездка", de: "Fahrt" },
  { key: "other", icon: Sparkles, ru: "Другое", de: "Sonstiges" },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/* последний вторник текущего месяца; если он уже прошёл — следующего месяца */
function lastTuesdayKey() {
  const now = new Date();
  const today = toKey(now);

  for (let offset = 0; offset < 2; offset += 1) {
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);

    while (end.getDay() !== 2) end.setDate(end.getDate() - 1);

    if (toKey(end) >= today) return toKey(end);
  }

  return today;
}

export default function TeeniePlans({ isRu, onShoppingAdded }: Props) {
  const locale = isRu ? "ru-RU" : "de-DE";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<Kind>("other");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [openId, setOpenId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState<Record<number, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    const [plansResult, itemsResult] = await Promise.all([
      supabase.from("teenie_plans").select("*").order("plan_date", { ascending: true, nullsFirst: false }),
      supabase.from("teenie_plan_items").select("*").order("id"),
    ]);

    if (plansResult.error || itemsResult.error) {
      console.error("Teenie plans:", plansResult.error ?? itemsResult.error);
      setError(
        isRu
          ? "Не удалось загрузить планы. Если страница новая — запусти teenie-plans.sql."
          : "Pläne konnten nicht geladen werden. Bei neuer Seite teenie-plans.sql ausführen.",
      );
    } else {
      setError("");
    }

    setPlans((plansResult.data ?? []) as Plan[]);
    setItems((itemsResult.data ?? []) as PlanItem[]);
    setLoading(false);
  }, [isRu]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = toKey(new Date());

  const groups = useMemo(() => {
    const upcoming = plans
      .filter((plan) => plan.status !== "done" && plan.plan_date)
      .sort((a, b) => (a.plan_date ?? "").localeCompare(b.plan_date ?? ""));

    const ideas = plans.filter((plan) => plan.status !== "done" && !plan.plan_date);
    const done = plans.filter((plan) => plan.status === "done").reverse();

    return { upcoming, ideas, done };
  }, [plans]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDate("");
    setKind("other");
    setNotes("");
    setFormOpen(false);
  }

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setTitle(plan.title);
    setDate(plan.plan_date ?? "");
    setKind(plan.kind);
    setNotes(plan.notes ?? "");
    setFormOpen(true);
  }

  async function save() {
    const cleanTitle = title.trim();

    if (!cleanTitle || saving) return;

    setSaving(true);

    const payload = {
      title: cleanTitle,
      plan_date: date || null,
      kind,
      notes: notes.trim() || null,
      status: (date ? "planned" : "idea") as Status,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("teenie_plans").update(payload).eq("id", editingId)
      : await supabase.from("teenie_plans").insert(payload);

    setSaving(false);

    if (result.error) {
      console.error("Teenie plan save:", result.error);
      setError(isRu ? "Не удалось сохранить." : "Speichern fehlgeschlagen.");
      return;
    }

    resetForm();
    await load();
  }

  async function setStatus(plan: Plan, status: Status) {
    setPlans((current) => current.map((row) => (row.id === plan.id ? { ...row, status } : row)));

    const { error: updateError } = await supabase
      .from("teenie_plans")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", plan.id);

    if (updateError) {
      console.error("Teenie plan status:", updateError);
      await load();
    }
  }

  async function removePlan(id: number) {
    const { error: deleteError } = await supabase.from("teenie_plans").delete().eq("id", id);

    setConfirmDeleteId(null);

    if (deleteError) {
      console.error("Teenie plan delete:", deleteError);
      return;
    }

    await load();
  }

  async function addItem(planId: number) {
    const text = (newItem[planId] ?? "").trim();

    if (!text) return;

    const { data, error: insertError } = await supabase
      .from("teenie_plan_items")
      .insert({ plan_id: planId, title: text })
      .select("*")
      .single();

    if (insertError || !data) {
      console.error("Teenie plan item:", insertError);
      return;
    }

    setItems((current) => [...current, data as PlanItem]);
    setNewItem((current) => ({ ...current, [planId]: "" }));
  }

  async function toggleItem(item: PlanItem) {
    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, is_done: !item.is_done } : row)),
    );

    const { error: updateError } = await supabase
      .from("teenie_plan_items")
      .update({ is_done: !item.is_done })
      .eq("id", item.id);

    if (updateError) {
      console.error("Teenie item toggle:", updateError);
      await load();
    }
  }

  async function removeItem(item: PlanItem) {
    setItems((current) => current.filter((row) => row.id !== item.id));

    const { error: deleteError } = await supabase
      .from("teenie_plan_items")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      console.error("Teenie item delete:", deleteError);
      await load();
    }
  }

  /* отправить пункт в общий список покупок Teenie+ */
  async function sendToShopping(item: PlanItem, plan: Plan) {
    const { error: insertError } = await supabase
      .from("teenie_shopping_items")
      .insert({ title: item.title, note: plan.title });

    if (insertError) {
      console.error("Teenie to shopping:", insertError);
      return;
    }

    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, in_shopping: true } : row)),
    );

    await supabase.from("teenie_plan_items").update({ in_shopping: true }).eq("id", item.id);

    onShoppingAdded?.();
  }

  function formatDate(value: string) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "long",
    });
  }

  function daysUntil(value: string) {
    const diff = Math.round(
      (new Date(`${value}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) /
        86400000,
    );

    if (diff === 0) return isRu ? "сегодня" : "heute";
    if (diff === 1) return isRu ? "завтра" : "morgen";
    if (diff < 0) return isRu ? "прошло" : "vorbei";

    return isRu ? `через ${diff} дн.` : `in ${diff} Tg.`;
  }

  function renderPlan(plan: Plan) {
    const open = openId === plan.id;
    const planItems = items.filter((item) => item.plan_id === plan.id);
    const doneCount = planItems.filter((item) => item.is_done).length;
    const kindInfo = KINDS.find((k) => k.key === plan.kind) ?? KINDS[KINDS.length - 1];

    return (
      <section
        key={plan.id}
        className="overflow-hidden rounded-[20px] border border-[#e6e8ea] bg-white"
      >
        <button
          type="button"
          onClick={() => setOpenId(open ? null : plan.id)}
          className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#f1f2f3] text-[#1b2431]">
            <kindInfo.icon size={19} strokeWidth={1.9} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block break-words text-[15px] font-bold leading-snug text-[#111820]">
              {plan.title}
            </span>

            <span className="mt-0.5 block text-[12px] text-[#8a939d]">
              {plan.plan_date ? (
                <>
                  <span className="font-semibold capitalize text-[#4e5966]">
                    {formatDate(plan.plan_date)}
                  </span>
                  {" · "}
                  {daysUntil(plan.plan_date)}
                </>
              ) : isRu ? (
                "Идея · без даты"
              ) : (
                "Idee · ohne Datum"
              )}
              {planItems.length > 0 && ` · ${doneCount}/${planItems.length}`}
            </span>
          </span>

          <ChevronDown
            size={17}
            className={`mt-1 shrink-0 text-[#9aa2ad] transition ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="border-t border-[#f0f1f2] px-4 pb-4 pt-3">
            {plan.notes && (
              <p className="mb-3 whitespace-pre-wrap rounded-[12px] bg-[#f7f7f6] px-3 py-2.5 text-[13px] leading-snug text-[#4e5966]">
                {plan.notes}
              </p>
            )}

            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]">
              {isRu ? "Что нужно подготовить / купить" : "Was wir vorbereiten / kaufen müssen"}
            </p>

            <div className="space-y-1">
              {planItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 py-1">
                  <button
                    type="button"
                    onClick={() => toggleItem(item)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                      item.is_done
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-[#cfd3d8] bg-white text-transparent"
                    }`}
                    aria-label={isRu ? "Готово" : "Erledigt"}
                  >
                    <Check size={13} strokeWidth={3} />
                  </button>

                  <span
                    className={`min-w-0 flex-1 break-words text-[14px] ${
                      item.is_done ? "text-[#a8afb7] line-through" : "text-[#111820]"
                    }`}
                  >
                    {item.title}
                  </span>

                  {item.in_shopping ? (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {isRu ? "в покупках" : "im Einkauf"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendToShopping(item, plan)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8a939d] transition hover:bg-[#f1f2f3]"
                      aria-label={isRu ? "Добавить в список покупок" : "Zur Einkaufsliste"}
                      title={isRu ? "В список покупок" : "Zur Einkaufsliste"}
                    >
                      <ShoppingCart size={15} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#c3c8ce] transition hover:text-red-500"
                    aria-label={isRu ? "Удалить пункт" : "Punkt löschen"}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 flex gap-2">
              <input
                value={newItem[plan.id] ?? ""}
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, [plan.id]: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void addItem(plan.id);
                }}
                placeholder={isRu ? "Например: попкорн, краски…" : "z. B. Popcorn, Farben…"}
                className="h-10 min-w-0 flex-1 rounded-xl bg-[#f1f2f3] px-3 text-[14px] outline-none"
              />

              <button
                type="button"
                onClick={() => addItem(plan.id)}
                disabled={!(newItem[plan.id] ?? "").trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111820] text-white disabled:opacity-30"
                aria-label={isRu ? "Добавить" : "Hinzufügen"}
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#f0f1f2] pt-3">
              {plan.status === "done" ? (
                <button
                  type="button"
                  onClick={() => setStatus(plan, plan.plan_date ? "planned" : "idea")}
                  className="h-9 rounded-full bg-[#f1f2f3] px-3.5 text-[12px] font-semibold text-[#4e5966]"
                >
                  {isRu ? "Вернуть в планы" : "Zurück zu den Plänen"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStatus(plan, "done")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-[12px] font-bold text-white"
                >
                  <Check size={14} strokeWidth={3} />
                  {isRu ? "Уже провели" : "Haben wir gemacht"}
                </button>
              )}

              <button
                type="button"
                onClick={() => startEdit(plan)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#f1f2f3] px-3.5 text-[12px] font-semibold text-[#4e5966]"
              >
                <Pencil size={13} />
                {isRu ? "Изменить" : "Bearbeiten"}
              </button>

              {confirmDeleteId === plan.id ? (
                <span className="ml-auto flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => removePlan(plan.id)}
                    className="h-9 rounded-full bg-red-600 px-3 text-[12px] font-bold text-white"
                  >
                    {isRu ? "Да, удалить" : "Ja, löschen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="h-9 rounded-full bg-[#f1f2f3] px-3 text-[12px] font-semibold text-[#65707d]"
                  >
                    {isRu ? "Отмена" : "Abbrechen"}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(plan.id)}
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-[#b1b7bf] transition hover:bg-red-50 hover:text-red-500"
                  aria-label={isRu ? "Удалить" : "Löschen"}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <div>
      <p className="mb-3 px-1 text-[13px] leading-snug text-[#68727e]">
        {isRu
          ? "Доска идей и планов: что хотим сделать, когда, и что для этого нужно."
          : "Ideen- und Plantafel: Was wir machen wollen, wann und was wir dafür brauchen."}
      </p>

      {error && (
        <p className="mb-3 rounded-[14px] bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-700">
          {error}
        </p>
      )}

      {!formOpen && (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="mb-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#111820] text-[14px] font-bold text-white transition active:scale-[0.99]"
        >
          <Plus size={16} />
          {isRu ? "Новая идея или план" : "Neue Idee oder Plan"}
        </button>
      )}

      {formOpen && (
        <div className="mb-4 rounded-[20px] border border-[#e0e3e6] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[14px] font-bold">
              {editingId
                ? isRu ? "Изменить" : "Bearbeiten"
                : isRu ? "Новая идея или план" : "Neue Idee oder Plan"}
            </p>

            <button
              type="button"
              onClick={resetForm}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f2f3] text-[#68727e]"
              aria-label={isRu ? "Закрыть" : "Schließen"}
            >
              <X size={15} />
            </button>
          </div>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder={isRu ? "Что делаем? (кино, мастер-класс, прогулка…)" : "Was machen wir? (Film, Workshop, Spaziergang…)"}
            className="h-11 w-full rounded-xl bg-[#f1f2f3] px-3 text-[15px] outline-none"
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {KINDS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setKind(item.key)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition ${
                  kind === item.key ? "bg-[#111820] text-white" : "bg-[#f1f2f3] text-[#4e5966]"
                }`}
              >
                <item.icon size={14} strokeWidth={2} />
                {isRu ? item.ru : item.de}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <DatePicker
              value={date}
              onChange={setDate}
              marked={new Set(plans.map((plan) => plan.plan_date).filter(Boolean) as string[])}
              shortcuts={[
                {
                  label: isRu ? "Последний вторник месяца" : "Letzter Dienstag im Monat",
                  value: lastTuesdayKey(),
                },
              ]}
            />
          </div>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder={isRu ? "Подробности, идеи, что обсудили…" : "Details, Ideen, was wir besprochen haben…"}
            className="mt-3 w-full resize-none rounded-xl bg-[#f1f2f3] px-3 py-2.5 text-[14px] outline-none"
          />

          <button
            type="button"
            onClick={save}
            disabled={!title.trim() || saving}
            className="mt-3 h-11 w-full rounded-xl bg-[#111820] text-[14px] font-bold text-white disabled:opacity-40"
          >
            {saving ? (isRu ? "Сохраняю…" : "Speichere…") : isRu ? "Сохранить" : "Speichern"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="h-24 animate-pulse rounded-[20px] bg-white" />
      ) : (
        <div className="space-y-5">
          {groups.upcoming.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]">
                {isRu ? "Запланировано" : "Geplant"}
              </p>
              <div className="space-y-2.5">
                {groups.upcoming.map((plan) => renderPlan(plan))}
              </div>
            </div>
          )}

          {groups.ideas.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]">
                {isRu ? "Идеи на будущее" : "Ideen für später"}
              </p>
              <div className="space-y-2.5">
                {groups.ideas.map((plan) => renderPlan(plan))}
              </div>
            </div>
          )}

          {groups.upcoming.length === 0 && groups.ideas.length === 0 && !error && (
            <p className="rounded-[20px] border border-dashed border-[#d5d9dd] px-5 py-10 text-center text-[13px] text-[#9aa2ad]">
              {isRu ? "Пока пусто. Запиши первую идею!" : "Noch leer. Schreib die erste Idee auf!"}
            </p>
          )}

          {groups.done.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowDone((value) => !value)}
                className="mb-2 flex w-full items-center justify-between px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa2ad]"
              >
                <span>
                  {isRu ? "Уже было" : "Schon gemacht"} · {groups.done.length}
                </span>
                <ChevronDown size={15} className={`transition ${showDone ? "rotate-180" : ""}`} />
              </button>

              {showDone && (
                <div className="space-y-2.5 opacity-80">
                  {groups.done.map((plan) => renderPlan(plan))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}