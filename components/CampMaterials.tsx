"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Check, Download, ExternalLink, File as FileIcon, FileText, Image as ImageIcon, Link2, Loader2, Music, Pencil, Plus, Presentation, Trash2, Upload, X } from "lucide-react";

import { supabase } from "@/lib/supabase";

type Material = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  kind: "file" | "link";
  file_name: string | null;
  file_size: number | null;
  url: string | null;
  file_url: string | null;
};

const CATS: Record<string, [string, string]> = {
  program: ["Программа", "Programm"],
  lessons: ["Уроки", "Lehre"],
  slides: ["Презентации", "Präsentationen"],
  docs: ["Документы", "Dokumente"],
  music: ["Музыка", "Musik"],
  games: ["Игры", "Spiele"],
  other: ["Другое", "Sonstiges"],
};

const inputCls = "w-full rounded-[12px] border border-[#e2dcc8] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1b2431]";

function iconFor(m: Material) {
  if (m.kind === "link") return Link2;
  const ext = (m.file_name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (["ppt", "pptx", "key", "odp"].includes(ext)) return Presentation;
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) return ImageIcon;
  if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return Music;
  if (["pdf", "doc", "docx", "txt", "odt", "xls", "xlsx"].includes(ext)) return FileText;
  return FileIcon;
}

function size(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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

async function call(method: "GET" | "POST", query: string, body?: unknown) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`/api/camps/materials${query}`, {
    method,
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  }).catch(() => null);
  if (!res) return { ok: false, json: {} as Record<string, unknown> };
  return { ok: res.ok, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

export default function CampMaterials({ campId, canManage, isRu }: { campId: number; canManage: boolean; isRu: boolean }) {
  const t = (ru: string, de: string) => (isRu ? ru : de);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Material[]>([]);
  const [cat, setCat] = useState("all");
  const [form, setForm] = useState<(Partial<Material> & { file?: File | null }) | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { ok, json } = await call("GET", `?camp_id=${campId}`);
    if (!ok) {
      setError(t("Не удалось загрузить. Проверь, что выполнен camps-4.sql.", "Laden fehlgeschlagen. Ist camps-4.sql ausgeführt?"));
      setLoading(false);
      return;
    }
    setError("");
    setItems((json.materials as Material[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campId, isRu]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function save() {
    if (!form?.title?.trim()) return;
    const kind = form.kind ?? "file";
    if (kind === "link" && !form.url?.trim()) return;
    if (kind === "file" && !form.id && !form.file) return;
    if (form.file && form.file.size > 50 * 1024 * 1024) {
      setError(t("Файл слишком большой (максимум 50 МБ).", "Die Datei ist zu groß (maximal 50 MB)."));
      return;
    }
    setBusy(true);
    const { ok, json } = await call("POST", "", {
      action: "material_save",
      id: form.id,
      camp_id: campId,
      title: form.title,
      description: form.description,
      category: form.category ?? "other",
      kind,
      url: form.url,
      file_name: form.file?.name,
      file_size: form.file?.size,
    });
    if (ok && form.file && json.upload) {
      const up = json.upload as { path: string; token: string };
      const r = await supabase.storage.from("camp-files").uploadToSignedUrl(up.path, up.token, form.file);
      if (r.error) setError(t("Запись сохранена, но файл не загрузился.", "Eintrag gespeichert, aber die Datei wurde nicht hochgeladen."));
    } else if (!ok) {
      setError(t("Не удалось сохранить.", "Speichern fehlgeschlagen."));
    }
    setBusy(false);
    setForm(null);
    void load();
  }

  async function remove(id: number) {
    if (!window.confirm(t("Удалить этот материал?", "Dieses Material löschen?"))) return;
    await call("POST", "", { action: "material_delete", id });
    setForm(null);
    void load();
  }

  if (loading) {
    return (
      <div className="mt-10 flex justify-center">
        <Loader2 className="animate-spin text-[#8a8678]" />
      </div>
    );
  }

  const shown = items.filter((m) => cat === "all" || m.category === cat);

  return (
    <div className="mt-4 space-y-3">
      {error && <div className="rounded-[16px] bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[#8a8678]">
          {items.length} {t("материалов", "Materialien")}
        </p>
        {canManage && (
          <button type="button" onClick={() => setForm({ kind: "file", category: "other" })} className="flex h-10 items-center gap-1.5 rounded-full bg-[#ffc93c] px-4 text-[13px] font-bold text-[#1b2431]">
            <Plus size={16} />
            {t("Добавить", "Hinzufügen")}
          </button>
        )}
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {["all", ...Object.keys(CATS)].map((k) => (
          <button key={k} type="button" onClick={() => setCat(k)} className={"shrink-0 rounded-full px-3.5 py-2 text-[12px] font-semibold " + (cat === k ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")}>
            {k === "all" ? t("Все", "Alle") : isRu ? CATS[k][0] : CATS[k][1]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#e2dcc8] bg-white/60 px-6 py-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff4d1] text-[#9a6b00]">
            <FileText size={22} />
          </span>
          <p className="mt-3 text-[15px] font-bold">{t("Материалов пока нет", "Noch keine Materialien")}</p>
          <p className="mx-auto mt-1 max-w-[280px] text-[13px] text-[#8a8678]">{t("Сюда можно загрузить PDF, презентации, документы или добавить ссылки.", "Hier können PDFs, Präsentationen, Dokumente und Links abgelegt werden.")}</p>
        </div>
      ) : (
        shown.map((m) => {
          const Icon = iconFor(m);
          const href = m.kind === "link" ? m.url : m.file_url;
          return (
            <div key={m.id} className="flex items-center gap-3 rounded-[20px] border border-[#ece6d3] bg-white p-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#fff4d1] text-[#9a6b00]">
                <Icon size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">{m.title}</p>
                {m.description && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#5b5a50]">{m.description}</p>}
                <p className="mt-1 text-[11px] text-[#8a8678]">
                  {isRu ? CATS[m.category]?.[0] : CATS[m.category]?.[1]}
                  {m.kind === "file" && m.file_size ? ` · ${size(m.file_size)}` : ""}
                </p>
              </div>
              {href && (
                <a href={href} target={m.kind === "link" ? "_blank" : undefined} rel="noreferrer" aria-label="Open" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b2431] text-white">
                  {m.kind === "link" ? <ExternalLink size={16} /> : <Download size={16} />}
                </a>
              )}
              {canManage && (
                <button type="button" onClick={() => setForm(m)} aria-label="Edit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3efe2] text-[#5b5a50]">
                  <Pencil size={15} />
                </button>
              )}
            </div>
          );
        })
      )}

      {form && (
        <Sheet title={form.id ? t("Материал", "Material") : t("Новый материал", "Neues Material")} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-[#f1ecdc] p-1">
              {(
                [
                  ["file", t("Файл", "Datei"), Upload],
                  ["link", t("Ссылка", "Link"), Link2],
                ] as const
              ).map(([k, label, Icon]) => (
                <button key={k} type="button" onClick={() => setForm({ ...form, kind: k })} className={"flex h-10 items-center justify-center gap-1.5 rounded-[11px] text-[13px] font-bold " + ((form.kind ?? "file") === k ? "bg-white shadow-sm" : "text-[#8a8678]")}>
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
            <Field label={t("Название", "Titel")}>
              <input className={inputCls} value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label={t("Описание", "Beschreibung")}>
              <textarea rows={2} className={inputCls} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label={t("Раздел", "Kategorie")}>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(CATS).map((k) => (
                  <button key={k} type="button" onClick={() => setForm({ ...form, category: k })} className={"inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 " + (form.category === k ? "bg-[#1b2431] text-white ring-[#1b2431]" : "bg-white text-[#5b5a50] ring-[#ece6d3]")}>
                    {form.category === k && <Check size={12} className="text-[#ffc93c]" />}
                    {isRu ? CATS[k][0] : CATS[k][1]}
                  </button>
                ))}
              </div>
            </Field>
            {(form.kind ?? "file") === "file" ? (
              <Field label={t("Файл (до 50 МБ)", "Datei (bis 50 MB)")}>
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-[12px] border border-[#e2dcc8] bg-white px-3 text-[14px]">
                  <Upload size={16} className="shrink-0 text-[#9a6b00]" />
                  <span className="min-w-0 flex-1 truncate">{form.file?.name ?? form.file_name ?? t("Выбрать файл", "Datei wählen")}</span>
                  <input type="file" className="hidden" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
                </label>
              </Field>
            ) : (
              <Field label={t("Адрес ссылки", "Link-Adresse")}>
                <input className={inputCls} inputMode="url" value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" />
              </Field>
            )}
            <button
              type="button"
              onClick={save}
              disabled={busy || !form.title?.trim()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ffc93c] text-[15px] font-bold text-[#1b2431] disabled:opacity-40"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {t("Сохранить", "Speichern")}
            </button>
            {form.id && (
              <button type="button" onClick={() => remove(form.id!)} className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-semibold text-red-600">
                <Trash2 size={16} />
                {t("Удалить материал", "Material löschen")}
              </button>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}