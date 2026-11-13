"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Plus, ShieldCheck, Trash2, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";
import { PERMISSIONS, ROLE_COLORS, roleBadgeStyle, type AppRole } from "@/lib/permissions";

/* ---------- плашка роли ---------- */

export function RoleBadge({ role, size = "sm" }: { role: Pick<AppRole, "name" | "color">; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-lg font-bold ${
        size === "md" ? "px-2.5 py-1 text-[10px]" : "px-2 py-1 text-[9px]"
      }`}
      style={roleBadgeStyle(role.color)}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: role.color }} />
      <span className="truncate">{role.name}</span>
    </span>
  );
}

/* ---------- выбор роли у человека (внутреннее окошко вместо системного списка) ---------- */

export function RolePickerSheet({
  open,
  roles,
  value,
  isRu,
  onSelect,
  onClose,
}: {
  open: boolean;
  roles: AppRole[];
  value: number | null;
  isRu: boolean;
  onSelect: (id: number | null) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const row = (active: boolean, onClick: () => void, children: React.ReactNode) => (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left active:bg-neutral-50"
    >
      {children}
      {active && <Check size={18} className="ml-auto shrink-0 text-neutral-900" />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/35 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] overflow-hidden rounded-t-[28px] bg-white pb-[max(12px,env(safe-area-inset-bottom))] shadow-xl sm:rounded-[28px]"
      >
        <div className="flex items-center justify-between px-5 pb-1 pt-5">
          <h3 className="text-[17px] font-extrabold">{isRu ? "Роль" : "Rolle"}</h3>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[60vh] divide-y divide-neutral-100 overflow-y-auto">
          {row(value === null, () => onSelect(null), (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-neutral-300" />
              <span className="text-[15px] font-semibold text-neutral-600">{isRu ? "Без роли" : "Keine Rolle"}</span>
            </>
          ))}
          {roles.map((r) =>
            row(value === r.id, () => onSelect(r.id), (
              <>
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{r.name}</span>
                  {r.permissions.length > 0 && (
                    <span className="block truncate text-[11px] text-neutral-400">
                      {r.permissions
                        .map((k) => PERMISSIONS.find((p) => p.key === k))
                        .filter(Boolean)
                        .map((p) => (isRu ? p!.ru : p!.de))
                        .join(", ")}
                    </span>
                  )}
                </span>
              </>
            )),
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- редактор ролей (для админов) ---------- */

type Draft = { id: number | null; name: string; color: string; permissions: string[] };

export default function RoleEditor({
  open,
  roles,
  counts,
  isRu,
  onClose,
  onChanged,
}: {
  open: boolean;
  roles: AppRole[];
  counts: Record<number, number>;
  isRu: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraft(null);
      setConfirmDelete(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const L = (ru: string, de: string) => (isRu ? ru : de);

  const startNew = () => {
    setConfirmDelete(false);
    setDraft({ id: null, name: "", color: ROLE_COLORS[7], permissions: [] });
  };
  const startEdit = (r: AppRole) => {
    setConfirmDelete(false);
    setDraft({ id: r.id, name: r.name, color: r.color, permissions: [...r.permissions] });
  };

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      toast.error(L("Введи название роли.", "Bitte einen Rollennamen eingeben."));
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(draft.color)) {
      toast.error(L("Цвет должен выглядеть как #3b82f6.", "Die Farbe muss wie #3b82f6 aussehen."));
      return;
    }
    setBusy(true);
    const payload = { name, color: draft.color, permissions: draft.permissions };
    const { error } = draft.id
      ? await supabase.from("app_roles").update(payload).eq("id", draft.id)
      : await supabase.from("app_roles").insert(payload);
    setBusy(false);

    if (error) {
      console.error("save role error:", error);
      toast.error(
        error.code === "23505"
          ? L("Роль с таким названием уже есть.", "Eine Rolle mit diesem Namen gibt es schon.")
          : L("Не удалось сохранить роль.", "Rolle konnte nicht gespeichert werden."),
      );
      return;
    }
    toast.success(L("Роль сохранена", "Rolle gespeichert"));
    setDraft(null);
    await onChanged();
  };

  const remove = async () => {
    if (!draft?.id) return;
    setBusy(true);
    const { error } = await supabase.from("app_roles").delete().eq("id", draft.id);
    setBusy(false);
    if (error) {
      console.error("delete role error:", error);
      toast.error(L("Не удалось удалить роль.", "Rolle konnte nicht gelöscht werden."));
      return;
    }
    toast.success(L("Роль удалена", "Rolle gelöscht"));
    setDraft(null);
    setConfirmDelete(false);
    await onChanged();
  };

  const toggle = (key: string) =>
    setDraft((d) =>
      d ? { ...d, permissions: d.permissions.includes(key) ? d.permissions.filter((k) => k !== key) : [...d.permissions, key] } : d,
    );

  const usedBy = draft?.id ? counts[draft.id] ?? 0 : 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/35 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] bg-[#f6f6f4] shadow-xl sm:rounded-[28px]"
      >
        {/* шапка */}
        <div className="flex items-center gap-3 bg-white px-4 pb-3 pt-4">
          {draft ? (
            <button type="button" onClick={() => setDraft(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 active:scale-95">
              <ArrowLeft size={18} />
            </button>
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white">
              <ShieldCheck size={18} />
            </span>
          )}
          <h2 className="min-w-0 flex-1 truncate text-[18px] font-extrabold tracking-[-0.01em]">
            {draft ? (draft.id ? L("Редактировать роль", "Rolle bearbeiten") : L("Новая роль", "Neue Rolle")) : L("Роли и права", "Rollen und Rechte")}
          </h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 active:scale-95">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-5 pt-4">
          {!draft ? (
            <>
              <p className="mb-4 text-[13px] leading-5 text-neutral-500">
                {L(
                  "Создай роль, выбери цвет и отметь, что ей можно. Потом назначь её человеку в его карточке. Админам доступно всё всегда.",
                  "Erstelle eine Rolle, wähle eine Farbe und lege fest, was sie darf. Danach weise sie in der Karte der Person zu. Admins dürfen immer alles.",
                )}
              </p>

              {roles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-8 text-center text-[14px] text-neutral-500">
                  {L("Ролей пока нет.", "Noch keine Rollen.")}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => startEdit(r)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 text-left active:scale-[0.99]"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: `${r.color}26` }}>
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: r.color }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-extrabold">{r.name}</span>
                        <span className="mt-0.5 block truncate text-[12px] text-neutral-500">
                          {r.permissions.length === 0
                            ? L("Только цвет и название", "Nur Farbe und Name")
                            : r.permissions
                                .map((k) => PERMISSIONS.find((p) => p.key === k))
                                .filter(Boolean)
                                .map((p) => (isRu ? p!.ru : p!.de))
                                .join(", ")}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-600">
                        {counts[r.id] ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={startNew}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 text-[14px] font-bold text-white active:scale-[0.98]"
              >
                <Plus size={17} />
                {L("Новая роль", "Neue Rolle")}
              </button>
            </>
          ) : (
            <div className="space-y-5">
              {/* предпросмотр */}
              <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-white py-5">
                <RoleBadge role={{ name: draft.name.trim() || L("Название роли", "Rollenname"), color: draft.color }} size="md" />
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold text-neutral-700">{L("Название", "Name")}</span>
                <input
                  value={draft.name}
                  maxLength={40}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder={L("Например: Ответственный за поездки", "Zum Beispiel: Fahrten-Verantwortlicher")}
                  className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-[15px] outline-none focus:border-neutral-400"
                />
              </label>

              <div>
                <span className="mb-2 block text-[12px] font-bold text-neutral-700">{L("Цвет", "Farbe")}</span>
                <div className="grid grid-cols-6 gap-2.5">
                  {ROLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      onClick={() => setDraft({ ...draft, color: c })}
                      className="flex aspect-square items-center justify-center rounded-full ring-offset-2 transition active:scale-90"
                      style={{ backgroundColor: c, boxShadow: draft.color.toLowerCase() === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined }}
                    >
                      {draft.color.toLowerCase() === c && <Check size={16} className="text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
                <label className="mt-3 flex items-center gap-3">
                  <span className="text-[12px] text-neutral-500">{L("Свой цвет", "Eigene Farbe")}</span>
                  <input
                    value={draft.color}
                    maxLength={7}
                    onChange={(e) => setDraft({ ...draft, color: e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}` })}
                    className="h-10 w-28 rounded-xl border border-neutral-200 bg-white px-3 font-mono text-[13px] outline-none focus:border-neutral-400"
                  />
                </label>
              </div>

              <div>
                <span className="mb-2 block text-[12px] font-bold text-neutral-700">{L("Что можно этой роли", "Was diese Rolle darf")}</span>
                <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                  {PERMISSIONS.map((p) => {
                    const on = draft.permissions.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => toggle(p.key)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-neutral-50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold">{isRu ? p.ru : p.de}</span>
                          <span className="mt-0.5 block text-[12px] leading-4 text-neutral-500">{isRu ? p.descRu : p.descDe}</span>
                        </span>
                        <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-neutral-900" : "bg-neutral-300"}`}>
                          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {draft.id && (
                <div>
                  {confirmDelete ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-[13px] leading-5 text-red-800">
                        {usedBy > 0
                          ? L(`Роль уберётся у ${usedBy} чел., их права вернутся к обычным.`, `Die Rolle wird bei ${usedBy} Personen entfernt, ihre Rechte werden normal.`)
                          : L("Удалить эту роль?", "Diese Rolle löschen?")}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button type="button" disabled={busy} onClick={remove} className="h-11 flex-1 rounded-full bg-red-600 text-[14px] font-bold text-white disabled:opacity-60">
                          {L("Удалить", "Löschen")}
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 rounded-full bg-white px-5 text-[14px] font-semibold">
                          {L("Отмена", "Abbrechen")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-11 items-center gap-2 px-1 text-[13px] font-semibold text-red-600">
                      <Trash2 size={15} />
                      {L("Удалить роль", "Rolle löschen")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {draft && (
          <div className="border-t border-neutral-200 bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 text-[15px] font-bold text-white active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {L("Сохранить", "Speichern")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}