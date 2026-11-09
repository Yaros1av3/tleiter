"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, ChevronDown, Clock, Lock, Loader2, Pencil } from "lucide-react";

type Lang = "de" | "ru";

type Submission = {
  answer_text: string | null;
  photo_url: string | null;
  submitted_at: string;
  is_late: boolean;
  points_photo: number;
  points_time: number;
  points_quality: number | null;
  status: "pending" | "accepted" | "rejected";
  admin_comment: string | null;
};
type Task = {
  id: number;
  day: number;
  date: string;
  deadline: string;
  ref: string | null;
  title: string;
  text: string | null;
  submission: Submission | null;
};
type Data = {
  totalDays: number;
  points: { photo: number; onTime: number; late: number; quality: number };
  tasks: Task[];
};

const T = {
  de: {
    day: "Tag",
    none: "Die erste Aufgabe erscheint bald.",
    deadline: "Abgabe bis",
    overdue: "Frist vorbei: nur noch",
    forTime: "für die Zeit",
    more: "Mehr lesen",
    less: "Weniger",
    reply: "Antworten",
    edit: "Ändern",
    answer: "Deine Gedanken zur Aufgabe",
    placeholder: "Schreibe ein paar Sätze …",
    photo: "Foto",
    send: "Abgeben",
    update: "Speichern",
    sentOk: "Abgegeben",
    pending: "Wird geprüft",
    accepted: "Angenommen",
    rejected: "Bitte überarbeiten",
    missed: "Offen",
    comment: "Kommentar vom Leiter",
    pts: "Punkte",
    waitQuality: "Qualität wird noch bewertet",
    late: "zu spät",
    worth: "Foto",
    onTime: "pünktlich",
    quality: "Qualität",
    upTo: "bis",
    locked: "Schon angenommen, nicht mehr änderbar.",
    errors: {
      short: "Schreibe etwas mehr (mindestens 10 Zeichen).",
      big: "Das Foto ist zu groß.",
      type: "Dieses Bildformat geht nicht.",
      locked: "Diese Abgabe ist schon angenommen.",
      closed: "Diese Aufgabe ist noch nicht freigeschaltet.",
      other: "Etwas ist schiefgelaufen. Bitte nochmal versuchen.",
    },
    locale: "de-DE",
  },
  ru: {
    day: "День",
    none: "Первое задание скоро появится.",
    deadline: "Сдать до",
    overdue: "Срок прошёл: за срок теперь",
    forTime: "",
    more: "Читать дальше",
    less: "Свернуть",
    reply: "Ответить",
    edit: "Изменить",
    answer: "Твои мысли по заданию",
    placeholder: "Напиши несколько предложений …",
    photo: "Фото",
    send: "Сдать",
    update: "Сохранить",
    sentOk: "Сдано",
    pending: "На проверке",
    accepted: "Принято",
    rejected: "Доработать",
    missed: "Не сдано",
    comment: "Комментарий служителя",
    pts: "баллов",
    waitQuality: "Качество ещё оценивается",
    late: "с опозданием",
    worth: "фото",
    onTime: "в срок",
    quality: "качество",
    upTo: "до",
    locked: "Уже принято, изменить нельзя.",
    errors: {
      short: "Напиши чуть больше (не меньше 10 символов).",
      big: "Фото слишком большое.",
      type: "Этот формат картинки не подходит.",
      locked: "Этот ответ уже принят.",
      closed: "Это задание ещё не открыто.",
      other: "Что-то пошло не так. Попробуй ещё раз.",
    },
    locale: "ru-RU",
  },
} as const;

/* Фото ответа: сжимаем до 1280 px */
async function shrink(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const k = Math.min(1, 1280 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * k);
    canvas.height = Math.round(img.height * k);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((r) => canvas.toBlob((b) => r(b), "image/jpeg", 0.8));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function chipOf(s: Submission | null, lang: Lang) {
  const t = T[lang];
  const base = "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold";
  if (!s) return <span className={`${base} bg-[#f1ede1] text-[#8a8678]`}>{t.missed}</span>;
  if (s.status === "accepted") return <span className={`${base} bg-[#1b2431] text-[#ffc93c]`}>{t.accepted}</span>;
  if (s.status === "rejected") return <span className={`${base} bg-[#fff4d1] text-[#9a6b00]`}>{t.rejected}</span>;
  return <span className={`${base} bg-[#ffc93c] text-[#1b2431]`}>{t.pending}</span>;
}

export default function BcTasks({ lang, onChanged }: { lang: Lang; onChanged: () => void }) {
  const t = T[lang];
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [selId, setSelId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bc/tasks", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, lang]);

  if (failed && !data) {
    return (
      <div className="rounded-2xl border border-[#e9e3d3] bg-white px-4 py-5 text-center text-[14px] text-[#8a8678]">
        {t.errors.other}
        <button type="button" onClick={load} className="ml-2 font-bold underline">
          OK
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mt-6 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#8a8678]" />
      </div>
    );
  }
  if (!data.tasks.length) {
    return (
      <div className="rounded-2xl border border-[#e9e3d3] bg-white px-4 py-6 text-center text-[14px] text-[#8a8678]">
        {t.none}
      </div>
    );
  }

  const latest = data.tasks[0];
  const cur = data.tasks.find((x) => x.id === selId) ?? latest;
  const byDay = new Map(data.tasks.map((x) => [x.day, x]));
  const lastDay = Math.max(data.totalDays, latest.day);

  return (
    <div className="space-y-2.5">
      <DayStrip
        days={Array.from({ length: lastDay }, (_, i) => i + 1)}
        byDay={byDay}
        currentDay={cur.day}
        todayDay={latest.day}
        onPick={(id) => setSelId(id)}
      />
      <TaskPanel
        key={cur.id}
        task={cur}
        lang={lang}
        points={data.points}
        onSent={async () => {
          await load();
          onChanged();
        }}
      />
    </div>
  );
}

function DayStrip({
  days,
  byDay,
  currentDay,
  todayDay,
  onPick,
}: {
  days: number[];
  byDay: Map<number, Task>;
  currentDay: number;
  todayDay: number;
  onPick: (id: number) => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-1">
      {days.map((d) => {
        const task = byDay.get(d);
        const sub = task?.submission ?? null;
        const selected = d === currentDay;
        let cls = "bg-[#f1ede1] text-[#c5bfae]";
        if (task) {
          if (sub?.status === "accepted") cls = "bg-[#1b2431] text-[#ffc93c]";
          else if (sub?.status === "pending") cls = "bg-[#ffc93c] text-[#1b2431]";
          else if (sub?.status === "rejected") cls = "border border-[#9a6b00] bg-[#fff4d1] text-[#9a6b00]";
          else if (d === todayDay) cls = "border-2 border-[#1b2431] bg-white text-[#1b2431]";
          else cls = "border border-dashed border-[#cfc8b2] bg-white text-[#8a8678]";
        }
        return (
          <button
            key={d}
            ref={selected ? ref : undefined}
            type="button"
            disabled={!task}
            onClick={() => task && onPick(task.id)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold transition ${cls} ${
              selected ? "ring-2 ring-[#ffc93c] ring-offset-2 ring-offset-[#faf8f3]" : ""
            }`}
          >
            {task ? d : <Lock className="h-3.5 w-3.5" />}
          </button>
        );
      })}
    </div>
  );
}

function TaskPanel({
  task,
  lang,
  points,
  onSent,
}: {
  task: Task;
  lang: Lang;
  points: Data["points"];
  onSent: () => Promise<void>;
}) {
  const t = T[lang];
  const sub = task.submission;
  const locked = sub?.status === "accepted";
  const fileRef = useRef<HTMLInputElement>(null);
  const [more, setMore] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [answer, setAnswer] = useState(sub?.answer_text ?? "");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [justSent, setJustSent] = useState(false);

  const overdue = Date.now() > new Date(task.deadline).getTime();
  const deadlineText = new Date(task.deadline).toLocaleString(t.locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    const blob = await shrink(file);
    if (!blob) return setErr("type");
    setErr("");
    setPhoto(blob);
    setPreview(URL.createObjectURL(blob));
  };

  const submit = async () => {
    if (answer.trim().length < 10) return setErr("short");
    setErr("");
    setBusy(true);
    const fd = new FormData();
    fd.append("task_id", String(task.id));
    fd.append("answer", answer);
    if (photo) fd.append("photo", photo, "photo.jpg");
    try {
      const res = await fetch("/api/bc/submit", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFormOpen(false);
        setPhoto(null);
        setPreview(null);
        setJustSent(true);
        setTimeout(() => setJustSent(false), 3000);
        await onSent();
      } else setErr(data.error ?? "other");
    } catch {
      setErr("other");
    }
    setBusy(false);
  };

  const errs = t.errors as Record<string, string>;
  const shownPhoto = preview ?? sub?.photo_url ?? null;
  const total = sub ? sub.points_photo + sub.points_time + (sub.points_quality ?? 0) : 0;
  const longText = (task.text?.length ?? 0) > 150;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e9e3d3] bg-white">
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-full bg-[#ffc93c] px-2.5 py-0.5 text-[11px] font-extrabold">
              {t.day} {task.day}
            </span>
            {task.ref && <span className="truncate text-[12px] font-bold text-[#9a6b00]">{task.ref}</span>}
          </div>
          {justSent ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#1b2431] px-2.5 py-0.5 text-[11px] font-extrabold text-[#ffc93c]">
              <Check className="h-3 w-3" />
              {t.sentOk}
            </span>
          ) : (
            chipOf(sub, lang)
          )}
        </div>

        <h2 className="mt-2 text-[17px] font-extrabold leading-snug tracking-[-0.01em]">{task.title}</h2>
        {task.text && (
          <>
            <p
              className={`mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-[#3b4350] ${
                more ? "" : "line-clamp-3"
              }`}
            >
              {task.text}
            </p>
            {longText && (
              <button
                type="button"
                onClick={() => setMore((v) => !v)}
                className="mt-1 flex items-center gap-1 text-[12px] font-bold text-[#9a6b00]"
              >
                {more ? t.less : t.more}
                <ChevronDown className={`h-3.5 w-3.5 transition ${more ? "rotate-180" : ""}`} />
              </button>
            )}
          </>
        )}
        <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-[#8a8678]">
          <Clock className="h-3.5 w-3.5" />
          {t.deadline} {deadlineText}
        </div>
        {!sub && overdue && (
          <p className="mt-1.5 text-[12px] font-semibold text-[#9a6b00]">
            {t.overdue} {points.late} {lang === "de" ? t.forTime : ""}
          </p>
        )}
      </div>

      {/* итог после сдачи */}
      {sub && !formOpen && (
        <div className="border-t border-[#f0ebdc] bg-[#faf8f3] px-3.5 py-2.5">
          <div className="flex items-center gap-3">
            {sub.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sub.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-extrabold">
                {total}
                {sub.points_quality === null ? "+" : ""} {t.pts}
              </p>
              <p className="truncate text-[11px] text-[#8a8678]">
                {sub.points_quality === null && sub.status === "pending" ? t.waitQuality : ""}
                {sub.is_late ? ` ${sub.points_quality === null ? "· " : ""}${t.late}` : ""}
              </p>
            </div>
            {!locked && (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#1b2431]/20 bg-white px-3.5 text-[12px] font-bold active:scale-95"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t.edit}
              </button>
            )}
          </div>
          {sub.admin_comment && (
            <div className="mt-2 rounded-xl bg-[#fff4d1] px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a6b00]">{t.comment}</p>
              <p className="mt-0.5 whitespace-pre-line text-[13px]">{sub.admin_comment}</p>
            </div>
          )}
          {locked && <p className="mt-1.5 text-[11px] text-[#8a8678]">{t.locked}</p>}
        </div>
      )}

      {/* кнопка "Ответить" */}
      {!sub && !formOpen && (
        <div className="px-3.5 pb-3.5">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1b2431] text-[15px] font-extrabold text-[#ffc93c] active:scale-[0.99]"
          >
            {t.reply}
          </button>
        </div>
      )}

      {/* форма */}
      {formOpen && (
        <div className="space-y-2.5 border-t border-[#f0ebdc] p-3.5">
          <textarea
            className="min-h-[104px] w-full rounded-xl border border-[#eadfb8] bg-white px-3.5 py-2.5 text-[15px] outline-none transition focus:border-[#1b2431] focus:ring-[3px] focus:ring-[#ffc93c]/50"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t.placeholder}
            maxLength={4000}
            autoFocus
          />
          <p className="text-[11px] text-[#8a8678]">
            +{points.photo} {t.worth} · +{overdue && !sub ? points.late : points.onTime} {t.onTime} · {t.upTo} +
            {points.quality} {t.quality}
            {answer.trim().length < 10 ? ` · ${answer.trim().length}/10` : ""}
          </p>

          {err && (
            <p className="rounded-xl bg-[#fff4d1] px-3 py-2 text-[12px] font-semibold text-[#9a6b00]">
              {errs[err] ?? errs.other}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[#1b2431]/20 bg-white px-3 text-[13px] font-bold active:scale-95"
            >
              {shownPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownPhoto} alt="" className="h-7 w-7 rounded object-cover" />
              ) : (
                <Camera className="h-[18px] w-[18px]" />
              )}
              {t.photo}
              <span className="rounded-full bg-[#fff4d1] px-1.5 text-[10px] font-extrabold text-[#9a6b00]">
                +{points.photo}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickPhoto(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1b2431] text-[15px] font-extrabold text-[#ffc93c] transition active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : sub ? t.update : t.send}
            </button>
            {(sub || answer === "") && (
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setErr("");
                }}
                className="flex h-11 shrink-0 items-center justify-center rounded-xl px-2 text-[13px] font-bold text-[#8a8678]"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}