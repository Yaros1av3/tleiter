"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import DatePicker from "@/components/DatePicker";
import { REG_STATUS, SHIRT_SIZES, SWIM, ageOn, type RegStatus } from "@/lib/campReg";

/* ===================== ТИПЫ ===================== */

type Reg = {
  id: number;
  camp_id: number;
  status: RegStatus;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: "m" | "f" | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  from_group: string | null;
  allergies: string | null;
  medications: string | null;
  health_notes: string | null;
  diet: string | null;
  can_swim: "yes" | "limited" | "no" | null;
  tshirt_size: string | null;
  friend_wish: string | null;
  notes: string | null;
  photo_consent: boolean;
  rules_accepted: boolean;
  internal_note: string | null;
  paid_amount: number | null;
  created_at: string;
  files_count?: number;
};

type Doc = {
  id: number;
  title: string;
  description: string | null;
  template_name: string | null;
  template_url: string | null;
  needs_upload: boolean;
  required: boolean;
};

type Settings = {
  id: number;
  reg_open: boolean;
  reg_deadline: string | null;
  reg_intro_ru: string | null;
  reg_intro_de: string | null;
  reg_slug: string | null;
};

type RegFile = { id: number; document_id: number | null; file_name: string | null; url: string | null };

const inputCls =
  "w-full rounded-[12px] border border-[#e2dcc8] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1b2431]";

/* ===================== МЕЛОЧИ ===================== */

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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ffc93c] text-[15px] font-bold text-[#1b2431] transition active:scale-[0.99] disabled:opacity-40"
    >
      {busy && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 rounded-[14px] bg-white px-4 py-3 text-left text-[14px] font-semibold ring-1 ring-[#ece6d3]">
      <span>{label}</span>
      <span className={"relative h-6 w-11 shrink-0 rounded-full transition " + (on ? "bg-[#1b2431]" : "bg-[#d9d4bf]")}>
        <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all " + (on ? "left-[22px] bg-[#ffc93c]" : "left-0.5")} />
      </span>
    </button>
  );
}

function Chips<T extends string>({ value, options, onChange }: { value: T | "" | null | undefined; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={"flex h-10 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold " + (value === o.value ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")}
        >
          {value === o.value && <Check size={13} className="text-[#ffc93c]" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

async function api<T = Record<string, unknown>>(method: "GET" | "POST", query: string, body?: unknown): Promise<{ ok: boolean; data: T }> {
  const res = await fetch(`/api/camps/admin${query}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  }).catch(() => null);
  if (!res) return { ok: false, data: {} as T };
  return { ok: res.ok, data: (await res.json().catch(() => ({}))) as T };
}

/* ===================== КОМПОНЕНТ ===================== */

export default function CampRegistration({
  campId,
  campStart,
  canManage,
  isRu,
}: {
  campId: number;
  campStart: string | null;
  canManage: boolean;
  isRu: boolean;
}) {
  const t = (ru: string, de: string) => (isRu ? ru : de);
  const locale = isRu ? "ru-RU" : "de-DE";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);

  const [filter, setFilter] = useState<RegStatus | "all">("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const [settingsForm, setSettingsForm] = useState<Settings | null>(null);
  const [docForm, setDocForm] = useState<(Partial<Doc> & { file?: File | null; removeFile?: boolean }) | null>(null);
  const [detail, setDetail] = useState<Reg | null>(null);
  const [detailFiles, setDetailFiles] = useState<RegFile[]>([]);
  const [regForm, setRegForm] = useState<Partial<Reg> | null>(null);

  const load = useCallback(async () => {
    const { ok, data } = await api<{ settings?: Settings; documents?: Doc[]; registrations?: Reg[] }>("GET", `?camp_id=${campId}`);
    if (!ok) {
      setError(t("Не удалось загрузить. Проверь, что выполнен camps-2.sql и есть право T-Camps.", "Laden fehlgeschlagen. Ist camps-2.sql ausgeführt und das Recht T-Camps vorhanden?"));
      setLoading(false);
      return;
    }
    setError("");
    setSettings(data.settings ?? null);
    setDocs(data.documents ?? []);
    setRegs(data.registrations ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campId, isRu]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!detail) {
      setDetailFiles([]);
      return;
    }
    let alive = true;
    api<{ files?: RegFile[] }>("GET", `?reg_id=${detail.id}`).then((r) => alive && setDetailFiles(r.data.files ?? []));
    return () => {
      alive = false;
    };
  }, [detail]);

  const link = settings?.reg_slug && typeof window !== "undefined" ? `${window.location.origin}/f/camp/${settings.reg_slug}` : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(t("Скопируй ссылку", "Link kopieren"), link);
    }
  }

  async function toggleOpen(next: boolean) {
    if (!settings) return;
    setSettings({ ...settings, reg_open: next });
    await api("POST", "", { action: "settings_save", camp_id: campId, reg_open: next, reg_deadline: settings.reg_deadline, reg_intro_ru: settings.reg_intro_ru, reg_intro_de: settings.reg_intro_de });
    void load();
  }

  async function saveSettings() {
    if (!settingsForm) return;
    setBusy(true);
    await api("POST", "", { action: "settings_save", camp_id: campId, ...settingsForm });
    setBusy(false);
    setSettingsForm(null);
    void load();
  }

  async function saveDoc() {
    if (!docForm?.title?.trim()) return;
    setBusy(true);
    const { ok, data } = await api<{ upload?: { path: string; token: string } | null }>("POST", "", {
      action: "doc_save",
      id: docForm.id,
      camp_id: campId,
      title: docForm.title,
      description: docForm.description,
      needs_upload: docForm.needs_upload === true,
      required: docForm.required === true,
      file_name: docForm.file?.name,
      remove_file: docForm.removeFile === true,
    });
    if (ok && data.upload && docForm.file) {
      const up = await supabase.storage.from("camp-files").uploadToSignedUrl(data.upload.path, data.upload.token, docForm.file);
      if (up.error) setError(t("Документ сохранён, но файл не загрузился.", "Dokument gespeichert, aber die Datei wurde nicht hochgeladen."));
    }
    setBusy(false);
    setDocForm(null);
    void load();
  }

  async function deleteDoc(id: number) {
    if (!window.confirm(t("Удалить этот документ?", "Dieses Dokument löschen?"))) return;
    await api("POST", "", { action: "doc_delete", id });
    setDocForm(null);
    void load();
  }

  async function saveReg() {
    if (!regForm?.first_name?.trim() || !regForm?.last_name?.trim()) return;
    setBusy(true);
    const { ok } = await api("POST", "", { action: "reg_save", id: regForm.id, camp_id: campId, data: regForm });
    setBusy(false);
    if (!ok) {
      setError(t("Не удалось сохранить заявку.", "Die Anmeldung konnte nicht gespeichert werden."));
      return;
    }
    setRegForm(null);
    setDetail(null);
    void load();
  }

  async function setStatus(r: Reg, status: RegStatus) {
    await api("POST", "", { action: "reg_save", id: r.id, camp_id: campId, data: { status } });
    setDetail({ ...r, status });
    void load();
  }

  async function deleteReg(r: Reg) {
    if (!window.confirm(t(`Удалить заявку ${r.first_name} ${r.last_name} вместе с файлами?`, `Anmeldung von ${r.first_name} ${r.last_name} samt Dateien löschen?`))) return;
    await api("POST", "", { action: "reg_delete", id: r.id });
    setDetail(null);
    void load();
  }

  /* ---------- списки ---------- */

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return regs.filter((r) => (filter === "all" || r.status === filter) && (!s || `${r.first_name} ${r.last_name}`.toLowerCase().includes(s)));
  }, [regs, filter, q]);

  const stats = {
    total: regs.filter((r) => r.status !== "declined").length,
    confirmed: regs.filter((r) => r.status === "confirmed").length,
    boys: regs.filter((r) => r.status !== "declined" && r.gender === "m").length,
    girls: regs.filter((r) => r.status !== "declined" && r.gender === "f").length,
  };

  if (!canManage) {
    return (
      <div className="mt-4 rounded-[20px] border border-dashed border-[#e2dcc8] bg-white/60 px-6 py-10 text-center text-[14px] text-[#5b5a50]">
        {t("Регистрация и данные подростков доступны организаторам лагеря. Право «T-Camps» даёт админ в разделе Команда → Роли.", "Anmeldung und Teen-Daten sind für die Camp-Organisatoren sichtbar. Das Recht „T-Camps“ vergibt der Admin unter Team → Rollen.")}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-10 flex justify-center">
        <Loader2 className="animate-spin text-[#8a8678]" />
      </div>
    );
  }

  const hasHealth = (r: Reg) => Boolean(r.allergies || r.medications || r.health_notes);

  return (
    <div className="mt-4 space-y-4">
      {error && <div className="rounded-[16px] bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      {/* ссылка и приём заявок */}
      {settings && (
        <section className="rounded-[22px] border border-[#ece6d3] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
              <Link2 size={16} className="text-[#9a6b00]" />
              {t("Форма регистрации", "Anmeldeformular")}
            </h3>
            <button type="button" onClick={() => setSettingsForm(settings)} className="flex h-9 items-center gap-1.5 rounded-full bg-[#f3efe2] px-3.5 text-[12px] font-semibold text-[#5b5a50]">
              <Settings2 size={14} />
              {t("Настроить", "Einstellen")}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-[#faf8f3] px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[12px] text-[#5b5a50]">{link}</span>
            <button type="button" onClick={copyLink} aria-label="Copy" className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#1b2431] px-3 text-[12px] font-bold text-white">
              {copied ? <Check size={13} className="text-[#ffc93c]" /> : <Copy size={13} />}
              {copied ? t("Скопировано", "Kopiert") : t("Копировать", "Kopieren")}
            </button>
            <a href={link} target="_blank" rel="noreferrer" aria-label="Open" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#ece6d3]">
              <ExternalLink size={14} />
            </a>
          </div>
          <div className="mt-3">
            <Toggle on={settings.reg_open} onChange={toggleOpen} label={settings.reg_open ? t("Приём заявок открыт", "Anmeldung ist offen") : t("Приём заявок закрыт", "Anmeldung ist geschlossen")} />
          </div>
          {settings.reg_deadline && (
            <p className="mt-2 text-[12px] text-[#8a8678]">
              {t("Запись до", "Anmeldung bis")} {new Date(`${settings.reg_deadline}T12:00:00Z`).toLocaleDateString(locale, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </section>
      )}

      {/* документы */}
      <section className="rounded-[22px] border border-[#ece6d3] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
            <FileText size={16} className="text-[#9a6b00]" />
            {t("Документы для подростков", "Dokumente für Teens")}
          </h3>
          <button type="button" onClick={() => setDocForm({ needs_upload: true })} className="flex h-9 items-center gap-1.5 rounded-full bg-[#ffc93c] px-3.5 text-[12px] font-bold text-[#1b2431]">
            <Plus size={14} />
            {t("Добавить", "Hinzufügen")}
          </button>
        </div>
        {docs.length === 0 ? (
          <p className="mt-3 text-[13px] text-[#8a8678]">
            {t("Добавьте файлы, которые подросток скачает, заполнит и загрузит обратно (согласие родителей, медицинская справка).", "Füge Dateien hinzu, die Teens herunterladen, ausfüllen und wieder hochladen (Einverständnis der Eltern, Gesundheitsbogen).")}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-[14px] bg-[#faf8f3] p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#fff4d1] text-[#9a6b00]">
                  <FileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{d.title}</p>
                  <p className="truncate text-[12px] text-[#8a8678]">
                    {d.template_name ?? t("без файла", "ohne Datei")}
                    {d.needs_upload ? ` · ${d.required ? t("загрузка обязательна", "Upload Pflicht") : t("загрузка по желанию", "Upload optional")}` : ""}
                  </p>
                </div>
                {d.template_url && (
                  <a href={d.template_url} aria-label="Download" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#ece6d3]">
                    <Download size={15} />
                  </a>
                )}
                <button type="button" onClick={() => setDocForm(d)} aria-label="Edit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3efe2] text-[#5b5a50]">
                  <Pencil size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* заявки */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-extrabold">{t("Заявки подростков", "Anmeldungen der Teens")}</h3>
          <button type="button" onClick={() => setRegForm({ status: "confirmed" })} className="flex h-9 items-center gap-1.5 rounded-full bg-[#1b2431] px-3.5 text-[12px] font-bold text-white">
            <UserPlus size={14} />
            {t("Вручную", "Manuell")}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            [t("Всего", "Gesamt"), stats.total],
            [t("Подтв.", "Bestät."), stats.confirmed],
            [t("Парни", "Jungen"), stats.boys],
            [t("Девушки", "Mädchen"), stats.girls],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-[16px] border border-[#ece6d3] bg-white p-3 text-center">
              <p className="text-[22px] font-extrabold leading-none">{value}</p>
              <p className="mt-1.5 text-[11px] text-[#8a8678]">{label}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8678]" />
          <input className={inputCls + " pl-9"} placeholder={t("Поиск по имени", "Nach Namen suchen")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {(["all", "new", "confirmed", "waitlist", "declined"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={"shrink-0 rounded-full px-3.5 py-2 text-[12px] font-semibold " + (filter === k ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")}
            >
              {k === "all" ? t("Все", "Alle") : isRu ? REG_STATUS[k].ru : REG_STATUS[k].de}
              {k !== "all" && ` ${regs.filter((r) => r.status === k).length}`}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2.5">
          {shown.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[#e2dcc8] bg-white/60 px-6 py-8 text-center text-[13px] text-[#8a8678]">
              {regs.length === 0 ? t("Заявок пока нет. Отправьте подросткам ссылку на форму.", "Noch keine Anmeldungen. Sende den Teens den Link zum Formular.") : t("Ничего не найдено.", "Nichts gefunden.")}
            </div>
          ) : (
            shown.map((r) => {
              const st = REG_STATUS[r.status];
              const age = ageOn(r.birth_date, campStart);
              return (
                <button key={r.id} type="button" onClick={() => setDetail(r)} className="flex w-full items-center gap-3 rounded-[18px] border border-[#ece6d3] bg-white p-3.5 text-left active:bg-[#faf8f3]">
                  <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold " + (r.gender === "f" ? "bg-pink-50 text-pink-700" : "bg-sky-50 text-sky-700")}>
                    {(r.first_name[0] ?? "").toUpperCase()}
                    {(r.last_name[0] ?? "").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">
                      {r.first_name} {r.last_name}
                    </p>
                    <p className="truncate text-[12px] text-[#8a8678]">
                      {age !== null ? `${age} ${t("лет", "J.")}` : "-"}
                      {r.city ? ` · ${r.city}` : ""}
                      {(r.files_count ?? 0) > 0 ? ` · ${r.files_count} ${t("файл.", "Dat.")}` : ""}
                    </p>
                  </div>
                  {hasHealth(r) && <AlertTriangle size={16} className="shrink-0 text-[#c2410c]" />}
                  <span className={"shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold " + st.cls}>{isRu ? st.ru : st.de}</span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ---------- настройки формы ---------- */}
      {settingsForm && (
        <Sheet title={t("Настройки формы", "Formular-Einstellungen")} onClose={() => setSettingsForm(null)}>
          <div className="space-y-3">
            <Toggle on={settingsForm.reg_open} onChange={(v) => setSettingsForm({ ...settingsForm, reg_open: v })} label={t("Приём заявок открыт", "Anmeldung ist offen")} />
            <Field label={t("Принимать заявки до (необязательно)", "Anmeldung bis (optional)")}>
              <DatePicker value={settingsForm.reg_deadline ?? ""} onChange={(v: string) => setSettingsForm({ ...settingsForm, reg_deadline: v || null })} className={inputCls} />
            </Field>
            <Field label={t("Текст над формой, по-русски", "Text über dem Formular, Russisch")}>
              <textarea rows={4} className={inputCls} value={settingsForm.reg_intro_ru ?? ""} onChange={(e) => setSettingsForm({ ...settingsForm, reg_intro_ru: e.target.value })} />
            </Field>
            <Field label={t("Текст над формой, по-немецки", "Text über dem Formular, Deutsch")}>
              <textarea rows={4} className={inputCls} value={settingsForm.reg_intro_de ?? ""} onChange={(e) => setSettingsForm({ ...settingsForm, reg_intro_de: e.target.value })} />
            </Field>
            <Btn onClick={saveSettings} busy={busy}>
              {t("Сохранить", "Speichern")}
            </Btn>
          </div>
        </Sheet>
      )}

      {/* ---------- документ ---------- */}
      {docForm && (
        <Sheet title={docForm.id ? t("Документ", "Dokument") : t("Новый документ", "Neues Dokument")} onClose={() => setDocForm(null)}>
          <div className="space-y-3">
            <Field label={t("Название", "Titel")}>
              <input className={inputCls} value={docForm.title ?? ""} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} placeholder={t("Например: Согласие родителей", "z. B. Einverständnis der Eltern")} />
            </Field>
            <Field label={t("Пояснение для подростка", "Hinweis für die Teens")}>
              <textarea rows={2} className={inputCls} value={docForm.description ?? ""} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} />
            </Field>
            <Field label={t("Файл для скачивания (PDF, Word)", "Datei zum Herunterladen (PDF, Word)")}>
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-[12px] border border-[#e2dcc8] bg-white px-3 text-[14px]">
                <Upload size={16} className="shrink-0 text-[#9a6b00]" />
                <span className="min-w-0 flex-1 truncate">{docForm.file?.name ?? docForm.template_name ?? t("Выбрать файл", "Datei wählen")}</span>
                <input type="file" className="hidden" onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] ?? null, removeFile: false })} />
              </label>
              {docForm.id && docForm.template_name && !docForm.file && (
                <button type="button" onClick={() => setDocForm({ ...docForm, template_name: null, removeFile: true })} className="mt-1.5 text-[12px] font-semibold text-red-600">
                  {t("Убрать файл", "Datei entfernen")}
                </button>
              )}
            </Field>
            <Toggle on={docForm.needs_upload === true} onChange={(v) => setDocForm({ ...docForm, needs_upload: v, required: v ? docForm.required : false })} label={t("Подросток загружает заполненный файл обратно", "Teens laden das ausgefüllte Dokument hoch")} />
            {docForm.needs_upload && <Toggle on={docForm.required === true} onChange={(v) => setDocForm({ ...docForm, required: v })} label={t("Загрузка обязательна", "Upload ist Pflicht")} />}
            <Btn onClick={saveDoc} busy={busy} disabled={!docForm.title?.trim()}>
              {t("Сохранить", "Speichern")}
            </Btn>
            {docForm.id && (
              <button type="button" onClick={() => deleteDoc(docForm.id!)} className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-semibold text-red-600">
                <Trash2 size={16} />
                {t("Удалить документ", "Dokument löschen")}
              </button>
            )}
          </div>
        </Sheet>
      )}

      {/* ---------- карточка заявки ---------- */}
      {detail && !regForm && (
        <Sheet title={`${detail.first_name} ${detail.last_name}`} onClose={() => setDetail(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(REG_STATUS) as RegStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(detail, s)}
                  className={"flex h-10 items-center justify-center gap-1 rounded-[12px] text-[13px] font-semibold " + (detail.status === s ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")}
                >
                  {detail.status === s && <Check size={13} className="text-[#ffc93c]" />}
                  {isRu ? REG_STATUS[s].ru : REG_STATUS[s].de}
                </button>
              ))}
            </div>

            <InfoBlock
              title={t("О подростке", "Über den Teen")}
              rows={[
                [t("Возраст", "Alter"), ageOn(detail.birth_date, campStart) !== null ? `${ageOn(detail.birth_date, campStart)}` : null],
                [t("Дата рождения", "Geburtsdatum"), detail.birth_date ? new Date(`${detail.birth_date}T12:00:00Z`).toLocaleDateString(locale, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }) : null],
                [t("Пол", "Geschlecht"), detail.gender === "m" ? t("Парень", "Junge") : detail.gender === "f" ? t("Девушка", "Mädchen") : null],
                [t("Город", "Wohnort"), detail.city],
                [t("Телефон", "Telefon"), detail.phone],
                [t("Почта", "E-Mail"), detail.email],
                [t("Церковь / группа", "Gemeinde / Gruppe"), detail.from_group],
              ]}
            />
            <div className="rounded-[18px] border border-[#ece6d3] bg-white p-4">
              <h4 className="text-[13px] font-bold text-[#8a8678]">{t("Родители", "Eltern")}</h4>
              <p className="mt-1 text-[14px] font-semibold">{detail.parent_name ?? "-"}</p>
              {detail.parent_phone && (
                <a href={`tel:${detail.parent_phone}`} className="mt-1.5 inline-flex items-center gap-1.5 text-[14px] text-[#9a6b00]">
                  <Phone size={14} />
                  {detail.parent_phone}
                </a>
              )}
            </div>
            <InfoBlock
              title={t("Здоровье и питание", "Gesundheit und Essen")}
              warn={hasHealth(detail)}
              rows={[
                [t("Аллергии", "Allergien"), detail.allergies],
                [t("Лекарства", "Medikamente"), detail.medications],
                [t("Здоровье", "Gesundheit"), detail.health_notes],
                [t("Питание", "Essen"), detail.diet],
                [t("Плавание", "Schwimmen"), detail.can_swim ? (isRu ? SWIM[detail.can_swim].ru : SWIM[detail.can_swim].de) : null],
              ]}
            />
            <InfoBlock
              title={t("Для лагеря", "Fürs Camp")}
              rows={[
                [t("Футболка", "T-Shirt"), detail.tshirt_size],
                [t("Хочет в отряд с", "Möchte in Gruppe mit"), detail.friend_wish],
                [t("Комментарий", "Anmerkung"), detail.notes],
                [t("Фото разрешены", "Fotos erlaubt"), detail.photo_consent ? t("Да", "Ja") : t("Нет", "Nein")],
                [t("Подана", "Eingegangen"), new Date(detail.created_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })],
              ]}
            />

            {detailFiles.length > 0 && (
              <div className="rounded-[18px] border border-[#ece6d3] bg-white p-4">
                <h4 className="text-[13px] font-bold text-[#8a8678]">{t("Загруженные файлы", "Hochgeladene Dateien")}</h4>
                <div className="mt-2 space-y-1.5">
                  {detailFiles.map((f) => (
                    <a key={f.id} href={f.url ?? "#"} className="flex items-center gap-2.5 rounded-[12px] bg-[#faf8f3] px-3 py-2.5 text-[13px] font-semibold">
                      <Download size={15} className="shrink-0 text-[#9a6b00]" />
                      <span className="min-w-0 flex-1 truncate">{docs.find((d) => d.id === f.document_id)?.title ?? f.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {(detail.internal_note || detail.paid_amount != null) && (
              <InfoBlock
                title={t("Внутренние заметки", "Interne Notizen")}
                rows={[
                  [t("Заметка", "Notiz"), detail.internal_note],
                  [t("Оплачено", "Bezahlt"), detail.paid_amount != null ? `${detail.paid_amount} €` : null],
                ]}
              />
            )}

            <button type="button" onClick={() => setRegForm(detail)} className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-white text-[14px] font-semibold ring-1 ring-[#ece6d3]">
              <Pencil size={15} />
              {t("Изменить данные", "Daten ändern")}
            </button>
            <button type="button" onClick={() => deleteReg(detail)} className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-semibold text-red-600">
              <Trash2 size={16} />
              {t("Удалить заявку", "Anmeldung löschen")}
            </button>
          </div>
        </Sheet>
      )}

      {/* ---------- редактирование заявки ---------- */}
      {regForm && (
        <Sheet title={regForm.id ? t("Данные подростка", "Teen-Daten") : t("Новая заявка", "Neue Anmeldung")} onClose={() => setRegForm(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Имя", "Vorname")}>
                <input className={inputCls} value={regForm.first_name ?? ""} onChange={(e) => setRegForm({ ...regForm, first_name: e.target.value })} />
              </Field>
              <Field label={t("Фамилия", "Nachname")}>
                <input className={inputCls} value={regForm.last_name ?? ""} onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })} />
              </Field>
            </div>
            <Field label={t("Пол", "Geschlecht")}>
              <Chips value={regForm.gender} onChange={(v) => setRegForm({ ...regForm, gender: v })} options={[{ value: "m" as const, label: t("Парень", "Junge") }, { value: "f" as const, label: t("Девушка", "Mädchen") }]} />
            </Field>
            <Field label={t("Дата рождения", "Geburtsdatum")}>
              <DatePicker birth value={regForm.birth_date ?? ""} onChange={(v: string) => setRegForm({ ...regForm, birth_date: v || null })} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Телефон", "Telefon")}>
                <input inputMode="tel" className={inputCls} value={regForm.phone ?? ""} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} />
              </Field>
              <Field label={t("Город", "Wohnort")}>
                <input className={inputCls} value={regForm.city ?? ""} onChange={(e) => setRegForm({ ...regForm, city: e.target.value })} />
              </Field>
            </div>
            <Field label={t("Почта", "E-Mail")}>
              <input inputMode="email" className={inputCls} value={regForm.email ?? ""} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Родитель", "Elternteil")}>
                <input className={inputCls} value={regForm.parent_name ?? ""} onChange={(e) => setRegForm({ ...regForm, parent_name: e.target.value })} />
              </Field>
              <Field label={t("Телефон родителя", "Telefon Eltern")}>
                <input inputMode="tel" className={inputCls} value={regForm.parent_phone ?? ""} onChange={(e) => setRegForm({ ...regForm, parent_phone: e.target.value })} />
              </Field>
            </div>
            <Field label={t("Церковь / группа", "Gemeinde / Gruppe")}>
              <input className={inputCls} value={regForm.from_group ?? ""} onChange={(e) => setRegForm({ ...regForm, from_group: e.target.value })} />
            </Field>
            <Field label={t("Аллергии", "Allergien")}>
              <textarea rows={2} className={inputCls} value={regForm.allergies ?? ""} onChange={(e) => setRegForm({ ...regForm, allergies: e.target.value })} />
            </Field>
            <Field label={t("Лекарства", "Medikamente")}>
              <textarea rows={2} className={inputCls} value={regForm.medications ?? ""} onChange={(e) => setRegForm({ ...regForm, medications: e.target.value })} />
            </Field>
            <Field label={t("Здоровье, важное", "Gesundheit, wichtig")}>
              <textarea rows={2} className={inputCls} value={regForm.health_notes ?? ""} onChange={(e) => setRegForm({ ...regForm, health_notes: e.target.value })} />
            </Field>
            <Field label={t("Питание", "Essen")}>
              <input className={inputCls} value={regForm.diet ?? ""} onChange={(e) => setRegForm({ ...regForm, diet: e.target.value })} />
            </Field>
            <Field label={t("Плавание", "Schwimmen")}>
              <Chips value={regForm.can_swim} onChange={(v) => setRegForm({ ...regForm, can_swim: v })} options={(["yes", "limited", "no"] as const).map((k) => ({ value: k, label: isRu ? SWIM[k].ru : SWIM[k].de }))} />
            </Field>
            <Field label={t("Футболка", "T-Shirt")}>
              <Chips value={regForm.tshirt_size} onChange={(v) => setRegForm({ ...regForm, tshirt_size: v })} options={SHIRT_SIZES.map((s) => ({ value: s, label: s }))} />
            </Field>
            <Field label={t("Хочет в отряд с", "Möchte in Gruppe mit")}>
              <input className={inputCls} value={regForm.friend_wish ?? ""} onChange={(e) => setRegForm({ ...regForm, friend_wish: e.target.value })} />
            </Field>
            <Field label={t("Комментарий", "Anmerkung")}>
              <textarea rows={2} className={inputCls} value={regForm.notes ?? ""} onChange={(e) => setRegForm({ ...regForm, notes: e.target.value })} />
            </Field>
            <Toggle on={regForm.photo_consent === true} onChange={(v) => setRegForm({ ...regForm, photo_consent: v })} label={t("Фото разрешены", "Fotos erlaubt")} />
            <Field label={t("Статус", "Status")}>
              <Chips value={regForm.status} onChange={(v) => setRegForm({ ...regForm, status: v })} options={(Object.keys(REG_STATUS) as RegStatus[]).map((s) => ({ value: s, label: isRu ? REG_STATUS[s].ru : REG_STATUS[s].de }))} />
            </Field>
            <Field label={t("Оплачено, €", "Bezahlt, €")}>
              <input inputMode="decimal" className={inputCls} value={regForm.paid_amount ?? ""} onChange={(e) => setRegForm({ ...regForm, paid_amount: e.target.value as unknown as number })} />
            </Field>
            <Field label={t("Внутренняя заметка (подросток не видит)", "Interne Notiz (für Teens unsichtbar)")}>
              <textarea rows={2} className={inputCls} value={regForm.internal_note ?? ""} onChange={(e) => setRegForm({ ...regForm, internal_note: e.target.value })} />
            </Field>
            <Btn onClick={saveReg} busy={busy} disabled={!regForm.first_name?.trim() || !regForm.last_name?.trim()}>
              {t("Сохранить", "Speichern")}
            </Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function InfoBlock({ title, rows, warn }: { title: string; rows: [string, string | null | undefined][]; warn?: boolean }) {
  const filled = rows.filter(([, v]) => v);
  if (filled.length === 0) return null;
  return (
    <div className={"rounded-[18px] border p-4 " + (warn ? "border-[#f5c9a8] bg-[#fff8f1]" : "border-[#ece6d3] bg-white")}>
      <h4 className={"flex items-center gap-1.5 text-[13px] font-bold " + (warn ? "text-[#c2410c]" : "text-[#8a8678]")}>
        {warn && <AlertTriangle size={14} />}
        {title}
      </h4>
      <dl className="mt-2 space-y-1.5">
        {filled.map(([k, v]) => (
          <div key={k} className="flex gap-3 text-[14px]">
            <dt className="w-[108px] shrink-0 text-[#8a8678]">{k}</dt>
            <dd className="min-w-0 flex-1 whitespace-pre-line font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}