"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, ChevronRight, Clock, Loader2 } from "lucide-react";

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
    today: "Aufgabe des Tages",
    day: "Tag",
    of: "von",
    none: "Die erste Aufgabe erscheint bald.",
    before: "Frühere Tage",
    deadline: "Abgabe bis",
    overdue: "Die Frist ist vorbei. Du kannst noch abgeben, dann gibt es weniger Punkte für die Pünktlichkeit.",
    worth: "Punkte",
    forPhoto: "Foto",
    forTime: "pünktlich",
    forQuality: "Qualität",
    answer: "Deine Gedanken zur Aufgabe",
    answerHint: "Schreibe mindestens ein paar Sätze.",
    photo: "Foto hinzufügen",
    photoChange: "Foto ändern",
    photoHint: "Zum Beispiel ein Foto von deiner Bibel oder deinen Notizen.",
    send: "Abgeben",
    update: "Änderung speichern",
    sentOk: "Abgegeben. Danke!",
    pending: "Wird geprüft",
    accepted: "Angenommen",
    rejected: "Bitte überarbeiten",
    missed: "Noch offen",
    comment: "Kommentar vom Leiter",
    total: "Punkte",
    waitQuality: "Qualität wird noch bewertet",
    late: "zu spät abgegeben",
    back: "Zurück zu heute",
    errors: {
      short: "Schreibe etwas mehr (mindestens 10 Zeichen).",
      big: "Das Foto ist zu groß.",
      type: "Dieses Bildformat geht nicht.",
      locked: "Diese Abgabe ist schon angenommen und kann nicht mehr geändert werden.",
      closed: "Diese Aufgabe ist noch nicht freigeschaltet.",
      other: "Etwas ist schiefgelaufen. Bitte nochmal versuchen.",
    },
    locale: "de-DE",
  },
  ru: {
    today: "Задание дня",
    day: "День",
    of: "из",
    none: "Первое задание скоро появится.",
    before: "Прошлые дни",
    deadline: "Сдать до",
    overdue: "Срок прошёл. Ты ещё можешь сдать, но за срок будет меньше баллов.",
    worth: "Баллы",
    forPhoto: "фото",
    forTime: "в срок",
    forQuality: "качество",
    answer: "Твои мысли по заданию",
    answerHint: "Напиши хотя бы несколько предложений.",
    photo: "Добавить фото",
    photoChange: "Сменить фото",
    photoHint: "Например, фото твоей Библии или записей.",
    send: "Сдать",
    update: "Сохранить изменения",
    sentOk: "Сдано. Спасибо!",
    pending: "На проверке",
    accepted: "Принято",
    rejected: "Нужно доработать",
    missed: "Ещё не сдано",
    comment: "Комментарий служителя",
    total: "баллов",
    waitQuality: "Качество ещё оценивается",
    late: "сдано с опозданием",
    back: "Назад к сегодняшнему",
    errors: {
      short: "Напиши чуть больше (не меньше 10 символов).",
      big: "Фото слишком большое.",
      type: "Этот формат картинки не подходит.",
      locked: "Этот ответ уже принят, изменить его нельзя.",
      closed: "Это задание ещё не открыто.",
      other: "Что-то пошло не так. Попробуй ещё раз.",
    },
    locale: "ru-RU",
  },
} as const;

const card = "rounded-[22px] border border-[#e9e3d3] bg-white";

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

function StatusChip({ s, lang }: { s: Submission | null; lang: Lang }) {
  const t = T[lang];
  const base = "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold";
  if (!s) return <span className={`${base} bg-[#f1ede1] text-[#8a8678]`}>{t.missed}</span>;
  if (s.status === "accepted") return <span className={`${base} bg-[#1b2431] text-[#ffc93c]`}>{t.accepted}</span>;
  if (s.status === "rejected") return <span className={`${base} bg-[#fff4d1] text-[#9a6b00]`}>{t.rejected}</span>;
  return <span className={`${base} bg-[#ffc93c] text-[#1b2431]`}>{t.pending}</span>;
}

export default function BcTasks({ lang, onChanged }: { lang: Lang; onChanged: () => void }) {
  const t = T[lang];
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

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
      <div className={`${card} mt-3 px-5 py-6 text-center text-[14px] text-[#8a8678]`}>
        {t.errors.other}
        <button type="button" onClick={load} className="ml-2 font-bold underline">
          OK
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mt-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#8a8678]" />
      </div>
    );
  }
  if (!data.tasks.length) {
    return <div className={`${card} mt-3 px-5 py-8 text-center text-[14px] text-[#8a8678]`}>{t.none}</div>;
  }

  const current = data.tasks.find((x) => x.id === openId) ?? data.tasks[0];
  const isToday = current.id === data.tasks[0].id;
  const others = data.tasks.filter((x) => x.id !== current.id);

  return (
    <div className="mt-3 space-y-3">
      {!isToday && (
        <button
          type="button"
          onClick={() => setOpenId(null)}
          className="flex h-9 items-center gap-1.5 text-[13px] font-bold text-[#8a8678]"
        >
          ← {t.back}
        </button>
      )}

      <TaskDetail
        key={current.id}
        task={current}
        lang={lang}
        points={data.points}
        totalDays={data.totalDays}
        isToday={isToday}
        onSent={async () => {
          await load();
          onChanged();
        }}
      />

      {others.length > 0 && (
        <>
          <p className="px-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9585]">
            {t.before}
          </p>
          <div className="space-y-2">
            {others.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => {
                  setOpenId(x.id);
                  if (typeof window !== "undefined") window.scrollTo?.(0, 0);
                }}
                className={`${card} flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.99]`}
              >
                <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[#fff4d1] text-[#9a6b00]">
                  <span className="text-[9px] font-bold uppercase leading-none">{t.day}</span>
                  <span className="text-[16px] font-extrabold leading-none">{x.day}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold">{x.title}</span>
                  {x.ref && <span className="block truncate text-[12px] text-[#8a8678]">{x.ref}</span>}
                </span>
                <StatusChip s={x.submission} lang={lang} />
                <ChevronRight className="h-4 w-4 shrink-0 text-[#c5bfae]" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TaskDetail({
  task,
  lang,
  points,
  totalDays,
  isToday,
  onSent,
}: {
  task: Task;
  lang: Lang;
  points: Data["points"];
  totalDays: number;
  isToday: boolean;
  onSent: () => Promise<void>;
}) {
  const t = T[lang];
  const sub = task.submission;
  const locked = sub?.status === "accepted";
  const fileRef = useRef<HTMLInputElement>(null);
  const [answer, setAnswer] = useState(sub?.answer_text ?? "");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

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
        setDone(true);
        setPhoto(null);
        setPreview(null);
        await onSent();
        setTimeout(() => setDone(false), 2500);
      } else setErr(data.error ?? "other");
    } catch {
      setErr("other");
    }
    setBusy(false);
  };

  const errs = t.errors as Record<string, string>;
  const shownPhoto = preview ?? sub?.photo_url ?? null;
  const total = sub ? sub.points_photo + sub.points_time + (sub.points_quality ?? 0) : 0;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[26px] bg-[#1b2431] p-5 text-white">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#ffc93c] px-3 py-1 text-[12px] font-extrabold text-[#1b2431]">
            {t.day} {task.day}
            {totalDays ? ` ${t.of} ${totalDays}` : ""}
          </span>
          {isToday && <span className="text-[12px] font-semibold text-white/60">{t.today}</span>}
        </div>
        <h2 className="mt-3 text-[22px] font-extrabold leading-tight tracking-[-0.02em]">{task.title}</h2>
        {task.ref && <p className="mt-1 text-[14px] font-semibold text-[#ffc93c]">{task.ref}</p>}
        {task.text && (
          <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-white/85">{task.text}</p>
        )}
        <div className="mt-4 flex items-center gap-2 text-[12px] text-white/60">
          <Clock className="h-3.5 w-3.5" />
          {t.deadline} {deadlineText}
        </div>
      </div>

      {!locked && overdue && !sub && (
        <p className="rounded-xl bg-[#fff4d1] px-3.5 py-2.5 text-[13px] font-semibold text-[#9a6b00]">
          {t.overdue}
        </p>
      )}

      {sub && (
        <div className={`${card} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <StatusChip s={sub} lang={lang} />
            <span className="text-[13px] font-bold">
              {total} {t.total}
              {sub.points_quality === null ? "+" : ""}
            </span>
          </div>
          {sub.points_quality === null && sub.status === "pending" && (
            <p className="mt-2 text-[12px] text-[#8a8678]">{t.waitQuality}</p>
          )}
          {sub.is_late && <p className="mt-1 text-[12px] text-[#8a8678]">{t.late}</p>}
          {sub.admin_comment && (
            <div className="mt-3 rounded-xl bg-[#fff4d1] px-3.5 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9a6b00]">{t.comment}</p>
              <p className="mt-1 whitespace-pre-line text-[14px]">{sub.admin_comment}</p>
            </div>
          )}
        </div>
      )}

      <div className={`${card} space-y-3 p-4`}>
        {!sub && (
          <p className="text-[12px] text-[#8a8678]">
            {t.worth}: +{points.photo} {t.forPhoto}, +{overdue ? points.late : points.onTime} {t.forTime}, {lang === "ru" ? "до" : "bis"} +{points.quality} {t.forQuality}
          </p>
        )}
        <label className="block">
          <span className="text-[14px] font-extrabold">{t.answer}</span>
          <textarea
            className="mt-2 min-h-[140px] w-full rounded-2xl border border-[#eadfb8] bg-white px-4 py-3 text-[16px] outline-none transition focus:border-[#1b2431] focus:ring-[3px] focus:ring-[#ffc93c]/50 disabled:bg-[#faf8f3]"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={locked}
            maxLength={4000}
          />
          <span className="mt-1 block text-[12px] text-[#8a8678]">
            {answer.trim().length < 10 ? `${t.answerHint} (${answer.trim().length}/10)` : t.answerHint}
          </span>
        </label>

        <div>
          {shownPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownPhoto} alt="" className="mb-3 max-h-64 w-full rounded-2xl object-cover" />
          )}
          {!locked && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-[#1b2431]/20 bg-white text-[15px] font-bold active:scale-[0.99]"
              >
                <Camera className="h-5 w-5" />
                {shownPhoto ? t.photoChange : t.photo}
                <span className="rounded-full bg-[#fff4d1] px-2 py-0.5 text-[11px] font-extrabold text-[#9a6b00]">
                  +{points.photo}
                </span>
              </button>
              <p className="mt-1.5 text-[12px] text-[#8a8678]">{t.photoHint}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
            </>
          )}
        </div>

        {err && (
          <p className="rounded-xl bg-[#fff4d1] px-3.5 py-2.5 text-[13px] font-semibold text-[#9a6b00]">
            {errs[err] ?? errs.other}
          </p>
        )}

        {!locked && (
          <button
            type="button"
            onClick={() => {
              if (answer.trim().length < 10) return setErr("short");
              void submit();
            }}
            disabled={busy}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1b2431] text-[16px] font-extrabold text-[#ffc93c] shadow-[0_6px_16px_rgba(27,36,49,0.22)] transition active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : done ? (
              <>
                <Check className="h-5 w-5" /> {t.sentOk}
              </>
            ) : sub ? (
              t.update
            ) : (
              t.send
            )}
          </button>
        )}
        {locked && (
          <p className="flex items-center gap-1.5 text-[12px] text-[#8a8678]">
            {errs.locked}
          </p>
        )}
      </div>
    </div>
  );
}