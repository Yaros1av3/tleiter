"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Camera, Check, Loader2 } from "lucide-react";

type Lang = "de" | "ru";
type Data = {
  active: boolean;
  text?: string | null;
  points?: { story: number; verse: number };
  storyToday?: boolean;
  stories?: number;
  verses?: { id: number; ref: string | null; day: string }[];
  earned?: number;
};

const TX = {
  de: {
    title: "Extra-Aufgaben",
    verses: "Gelernte Verse",
    versesHint: "Sage einen auswendig gelernten Vers im Sonntagsunterricht auf. Dein Teen-Mitarbeiter schreibt ihn dir gut.",
    none: "Noch keine Verse",
    story: "Story mit Bibelvers",
    storyHint: "Eine Story pro Tag: WhatsApp, Instagram oder beides. Lade einen Screenshot hoch.",
    wa: "WhatsApp",
    ig: "Instagram",
    both: "Beides",
    pick: "Screenshot auswählen",
    send: "Abschicken",
    done: "Heute erledigt",
    big: "Das Bild ist zu groß.",
    err: "Das hat nicht geklappt. Versuche es noch einmal.",
    earned: "Extra-Punkte",
    stories: "Stories",
  },
  ru: {
    title: "Дополнительные задания",
    verses: "Выученные стихи",
    versesHint: "Расскажи выученный стих на воскресном уроке. Служитель отметит его в приложении.",
    none: "Пока нет стихов",
    story: "Сторис со стихом",
    storyHint: "Один сторис в день: WhatsApp, Instagram или оба. Загрузи скриншот.",
    wa: "WhatsApp",
    ig: "Instagram",
    both: "Оба",
    pick: "Выбрать скриншот",
    send: "Отправить",
    done: "На сегодня выполнено",
    big: "Картинка слишком большая.",
    err: "Не получилось. Попробуй ещё раз.",
    earned: "Баллы за доп. задания",
    stories: "Сторис",
  },
} as const;

/* Сжимаем скриншот до 1280 px, чтобы он помещался в лимит */
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

export default function BcExtras({ lang, onChanged }: { lang: Lang; onChanged: () => void }) {
  const t = TX[lang];
  const [data, setData] = useState<Data | null>(null);
  const [channel, setChannel] = useState<"whatsapp" | "instagram" | "both">("whatsapp");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch("/api/bc/extras", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    const blob = await shrink(file);
    if (!blob) {
      setBusy(false);
      setError(t.err);
      return;
    }
    const fd = new FormData();
    fd.set("channel", channel);
    fd.set("photo", new File([blob], "story.jpg", { type: "image/jpeg" }));
    const res = await fetch("/api/bc/extras", { method: "POST", body: fd }).catch(() => null);
    setBusy(false);
    if (res?.ok || res?.status === 409) {
      setFile(null);
      load();
      onChanged();
    } else {
      setError(res?.status === 413 ? t.big : t.err);
    }
  }

  if (!data?.active) return null;

  const chips: ["whatsapp" | "instagram" | "both", string][] = [
    ["whatsapp", t.wa],
    ["instagram", t.ig],
    ["both", t.both],
  ];

  return (
    <section className="rounded-[22px] border border-[#ece6d3] bg-white p-4">
      <h2 className="text-[16px] font-extrabold tracking-[-0.01em]">{t.title}</h2>
      {data.text && <p className="mt-1.5 whitespace-pre-line text-[13px] leading-[1.5] text-[#5b5a50]">{data.text}</p>}

      <div className="mt-4 rounded-[16px] bg-[#faf8f3] p-3.5">
        <p className="flex items-center gap-2 text-[14px] font-bold">
          <BookOpen size={16} className="text-[#9a6b00]" />
          {t.verses} · +{data.points?.verse}
        </p>
        <p className="mt-1 text-[12px] text-[#8a8678]">{t.versesHint}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(data.verses ?? []).length === 0 ? (
            <span className="text-[12px] text-[#8a8678]">{t.none}</span>
          ) : (
            data.verses!.map((v) => (
              <span key={v.id} className="rounded-full bg-[#fff4d1] px-2.5 py-1 text-[12px] font-semibold text-[#9a6b00]">
                {v.ref}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="mt-3 rounded-[16px] bg-[#faf8f3] p-3.5">
        <p className="flex items-center gap-2 text-[14px] font-bold">
          <Camera size={16} className="text-[#9a6b00]" />
          {t.story} · +{data.points?.story}
        </p>
        <p className="mt-1 text-[12px] text-[#8a8678]">{t.storyHint}</p>

        {data.storyToday ? (
          <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-[#2f7d4f]">
            <Check size={16} /> {t.done}
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            <div className="flex gap-1.5">
              {chips.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setChannel(key)}
                  className={
                    "h-9 flex-1 rounded-full text-[13px] font-semibold transition " +
                    (channel === key ? "bg-[#1b2431] text-white" : "bg-white text-[#5b5a50] ring-1 ring-[#ece6d3]")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              ref={input}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-white text-[14px] font-semibold ring-1 ring-[#ece6d3]"
            >
              <Camera size={16} />
              <span className="truncate">{file ? file.name : t.pick}</span>
            </button>
            <button
              type="button"
              onClick={send}
              disabled={!file || busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ffc93c] text-[14px] font-bold text-[#1b2431] disabled:opacity-40"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {t.send}
            </button>
            {error && <p className="text-[12px] text-[#b3261e]">{error}</p>}
          </div>
        )}
      </div>

      {(data.earned ?? 0) > 0 && (
        <p className="mt-3 text-[12px] text-[#8a8678]">
          {t.earned}: <b className="text-[#1b2431]">{data.earned}</b> · {t.stories}: {data.stories}
        </p>
      )}
    </section>
  );
}