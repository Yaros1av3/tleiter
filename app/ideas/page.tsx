"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  FolderPlus,
  Languages,
  Lightbulb,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";

import Avatar from "@/components/Avatar";
import { notifyEvent } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { IDEAS_UPDATED_EVENT } from "@/lib/useIdeasUnread";

type Idea = {
  id: number;
  body: string;
  author_id: string | null;
  author_name: string;
  project_id: number | null;
  created_at: string;
  edited_at?: string | null;
};

const MAX_LENGTH = 2000;

const REACTIONS = ["👍", "❤️", "🔥", "🙏", "💡", "🤔"] as const;

type Reaction = { idea_id: number; user_id: string; emoji: string };

export default function IdeasPage() {
  const router = useRouter();
  const toast = useToast();
  const { language } = useLanguage();
  const isRu = language === "ru";

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // момент прошлого визита — по нему подсвечиваем «новые» идеи
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    let { data, error } = await supabase
      .from("team_ideas")
      .select("id, body, author_id, author_name, project_id, created_at, edited_at")
      .order("created_at", { ascending: false });

    // если SQL для редактирования ещё не запущен — работаем без «изменено»
    if (error) {
      const fallback = await supabase
        .from("team_ideas")
        .select("id, body, author_id, author_name, project_id, created_at")
        .order("created_at", { ascending: false });
      data = fallback.data as typeof data;
      error = fallback.error;
    }

    if (error) {
      console.error("Ideas load error:", error);
      toast.error(
        isRu ? "Не удалось загрузить идеи." : "Ideen konnten nicht geladen werden.",
      );
      setLoading(false);
      return;
    }

    setIdeas((data ?? []) as Idea[]);

    // аватарки авторов — из карточек команды
    const membersResult = await supabase
      .from("team_members")
      .select("user_id, avatar_url")
      .not("user_id", "is", null);

    if (!membersResult.error) {
      const map: Record<string, string | null> = {};
      for (const row of (membersResult.data ?? []) as {
        user_id: string;
        avatar_url: string | null;
      }[]) {
        map[row.user_id] = row.avatar_url;
      }
      setAvatars(map);
    }

    // реакции (если таблицы ещё нет — просто без них)
    const reactionsResult = await supabase
      .from("team_idea_reactions")
      .select("idea_id, user_id, emoji");

    if (!reactionsResult.error) {
      setReactions((reactionsResult.data ?? []) as Reaction[]);
    }

    setLoading(false);
  }, [isRu, toast]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setMyId(user.id);

        const { data: read } = await supabase
          .from("team_idea_reads")
          .select("last_seen")
          .eq("user_id", user.id)
          .maybeSingle();

        setLastSeen(read?.last_seen ?? null);

        // отмечаем, что идеи просмотрены — лампочка на главной погаснет
        await supabase
          .from("team_idea_reads")
          .upsert({ user_id: user.id, last_seen: new Date().toISOString() });

        window.dispatchEvent(new Event(IDEAS_UPDATED_EVENT));
      }

      const { data: admin } = await supabase.rpc("is_admin");
      setIsAdmin(admin === true);

      await load();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendIdea() {
    const body = text.trim();

    if (!body || sending) return;

    setSending(true);

    const { data: created, error } = await supabase
      .from("team_ideas")
      .insert({ body })
      .select("id")
      .single();

    setSending(false);

    if (error) {
      console.error("Idea insert error:", error);
      toast.error(
        isRu ? "Не удалось отправить идею." : "Idee konnte nicht gesendet werden.",
      );
      return;
    }

    if (created?.id) {
      void notifyEvent({ type: "idea-new", ideaId: created.id });
    }

    setText("");
    toast.success(isRu ? "Идея сохранена" : "Idee gespeichert");
    window.dispatchEvent(new Event(IDEAS_UPDATED_EVENT));
    await load();
  }

  async function saveEdit(idea: Idea) {
    const body = editText.trim();

    if (!body || busyId === idea.id) return;

    if (body === idea.body.trim()) {
      setEditingId(null);
      return;
    }

    setBusyId(idea.id);

    const { error } = await supabase.rpc("edit_my_idea", {
      p_id: idea.id,
      p_body: body,
    });

    setBusyId(null);

    if (error) {
      console.error("Idea edit error:", error);
      toast.error(
        isRu ? "Не удалось сохранить изменения." : "Änderungen konnten nicht gespeichert werden.",
      );
      return;
    }

    setEditingId(null);
    toast.success(isRu ? "Идея обновлена" : "Idee aktualisiert");
    await load();
  }

  async function toggleReaction(ideaId: number, emoji: string) {
    if (!myId) return;

    const mine = reactions.some(
      (item) =>
        item.idea_id === ideaId && item.user_id === myId && item.emoji === emoji,
    );

    // сразу показываем результат, потом сохраняем
    setReactions((current) =>
      mine
        ? current.filter(
            (item) =>
              !(item.idea_id === ideaId && item.user_id === myId && item.emoji === emoji),
          )
        : [...current, { idea_id: ideaId, user_id: myId, emoji }],
    );

    const { error } = mine
      ? await supabase
          .from("team_idea_reactions")
          .delete()
          .eq("idea_id", ideaId)
          .eq("user_id", myId)
          .eq("emoji", emoji)
      : await supabase
          .from("team_idea_reactions")
          .insert({ idea_id: ideaId, emoji });

    if (error) {
      console.error("Reaction error:", error);
      toast.error(isRu ? "Не удалось сохранить реакцию." : "Reaktion konnte nicht gespeichert werden.");
      await load();
      return;
    }

    if (!mine) {
      void notifyEvent({ type: "idea-reaction", ideaId, emoji });
    }
  }

  async function deleteIdea(idea: Idea) {
    setBusyId(idea.id);

    const { error } = await supabase.from("team_ideas").delete().eq("id", idea.id);

    setBusyId(null);
    setConfirmDeleteId(null);

    if (error) {
      console.error("Idea delete error:", error);
      toast.error(
        isRu ? "Не удалось удалить идею." : "Idee konnte nicht gelöscht werden.",
      );
      return;
    }

    toast.success(isRu ? "Идея удалена" : "Idee gelöscht");
    setIdeas((current) => current.filter((item) => item.id !== idea.id));
    window.dispatchEvent(new Event(IDEAS_UPDATED_EVENT));
  }

  async function createProject(idea: Idea) {
    setBusyId(idea.id);

    const firstLine = idea.body.split("\n")[0].trim();
    const title =
      firstLine.length > 80 ? `${firstLine.slice(0, 77).trim()}…` : firstLine;

    const description = `${idea.body}\n\n— ${idea.author_name}`;

    const { data: project, error } = await supabase
      .from("work_projects")
      .insert({
        title,
        description,
        status: "planned",
        created_by: myId,
      })
      .select("id")
      .single();

    if (error || !project) {
      console.error("Project from idea error:", error);
      setBusyId(null);
      toast.error(
        isRu ? "Не удалось создать проект." : "Projekt konnte nicht erstellt werden.",
      );
      return;
    }

    const { error: linkError } = await supabase
      .from("team_ideas")
      .update({ project_id: project.id })
      .eq("id", idea.id);

    if (linkError) console.error("Idea link error:", linkError);

    setBusyId(null);

    toast.success(isRu ? "Проект создан" : "Projekt erstellt", {
      action: {
        label: isRu ? "Открыть" : "Öffnen",
        onClick: () => router.push(`/work/${project.id}`),
      },
    });

    await load();
  }

  function formatWhen(value: string) {
    return new Date(value).toLocaleString(isRu ? "ru-RU" : "de-DE", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isNew(idea: Idea) {
    if (idea.author_id === myId) return false;
    if (!lastSeen) return true;
    return idea.created_at > lastSeen;
  }

  return (
    <main className="min-h-screen bg-[#faf8f3] pb-28 text-[#1b2431]">
      <div className="mx-auto w-full max-w-[640px] px-4 pt-6 sm:px-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-[#1b2431]">
            <Lightbulb size={22} fill="currentColor" />
          </div>

          <div>
            <h1 className="text-[26px] font-bold leading-none tracking-[-0.04em]">
              {isRu ? "Идеи" : "Ideen"}
            </h1>
            <p className="mt-1.5 text-[13px] text-neutral-500">
              {isRu
                ? "Напиши мысль — она не потеряется"
                : "Schreib deine Idee auf – sie geht nicht verloren"}
            </p>
          </div>
        </div>

        {/* форма */}
        <div className="rounded-[22px] border border-neutral-200 bg-white p-3 shadow-[0_4px_18px_rgba(27,36,49,0.04)]">
          <div className="mb-2 flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2 text-[12px] leading-snug text-sky-800">
            <Languages size={15} className="mt-0.5 shrink-0" />
            <span>
              {isRu
                ? "Пиши идею и по-русски, и по-немецки — так её поймут все в команде."
                : "Schreibe deine Idee auf Russisch und auf Deutsch – so versteht sie das ganze Team."}
            </span>
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
            rows={3}
            placeholder={
              isRu ? "Какая у тебя идея?" : "Was ist deine Idee?"
            }
            className="w-full resize-none rounded-xl bg-[#faf8f3] px-3 py-2.5 text-[15px] outline-none placeholder:text-neutral-400"
          />

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-neutral-400">
              {text.length}/{MAX_LENGTH}
            </span>

            <button
              type="button"
              onClick={sendIdea}
              disabled={!text.trim() || sending}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1b2431] px-5 text-sm font-semibold text-[#ffc93c] transition active:scale-[0.98] disabled:opacity-40"
            >
              <Send size={15} />
              {sending
                ? isRu
                  ? "Отправляю…"
                  : "Sende…"
                : isRu
                  ? "Отправить"
                  : "Senden"}
            </button>
          </div>
        </div>

        {/* список */}
        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="h-24 animate-pulse rounded-[20px] bg-white" />
          ) : ideas.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-neutral-300 px-5 py-10 text-center text-sm text-neutral-400">
              {isRu ? "Пока нет идей. Напиши первую!" : "Noch keine Ideen. Schreib die erste!"}
            </div>
          ) : (
            ideas.map((idea) => (
              <article
                key={idea.id}
                className={`rounded-[20px] border bg-white p-4 shadow-[0_2px_10px_rgba(27,36,49,0.03)] ${
                  isNew(idea) ? "border-amber-300" : "border-neutral-200"
                }`}
              >
                {editingId === idea.id ? (
                  <div>
                    <textarea
                      value={editText}
                      onChange={(event) =>
                        setEditText(event.target.value.slice(0, MAX_LENGTH))
                      }
                      rows={4}
                      autoFocus
                      className="w-full resize-none rounded-xl bg-[#faf8f3] px-3 py-2.5 text-[15px] outline-none"
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex h-9 items-center rounded-lg bg-neutral-100 px-3 text-xs font-semibold text-neutral-600"
                      >
                        {isRu ? "Отмена" : "Abbrechen"}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(idea)}
                        disabled={!editText.trim() || busyId === idea.id}
                        className="inline-flex h-9 items-center rounded-lg bg-[#1b2431] px-4 text-xs font-semibold text-[#ffc93c] disabled:opacity-40"
                      >
                        {isRu ? "Сохранить" : "Speichern"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                    {idea.body}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                  <Avatar
                    src={idea.author_id ? avatars[idea.author_id] : null}
                    className="h-7 w-7 rounded-full"
                  />
                  <span className="font-bold text-[#1b2431]">
                    {idea.author_name || (isRu ? "Без имени" : "Ohne Namen")}
                  </span>
                  <span className="text-neutral-400">{formatWhen(idea.created_at)}</span>

                  {idea.edited_at && (
                    <span className="text-neutral-400">
                      · {isRu ? "изменено" : "bearbeitet"}
                    </span>
                  )}

                  {idea.author_id === myId && editingId !== idea.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(idea.id);
                        setEditText(idea.body);
                      }}
                      aria-label={isRu ? "Редактировать идею" : "Idee bearbeiten"}
                      className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-neutral-500 transition hover:bg-neutral-100"
                    >
                      <Pencil size={13} />
                      {isRu ? "Изменить" : "Bearbeiten"}
                    </button>
                  )}

                  {isNew(idea) && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      {isRu ? "Новая" : "Neu"}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {REACTIONS.map((emoji) => {
                    const count = reactions.filter(
                      (item) => item.idea_id === idea.id && item.emoji === emoji,
                    ).length;

                    const mine = reactions.some(
                      (item) =>
                        item.idea_id === idea.id &&
                        item.user_id === myId &&
                        item.emoji === emoji,
                    );

                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => toggleReaction(idea.id, emoji)}
                        className={`inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[13px] transition active:scale-95 ${
                          mine
                            ? "border-amber-300 bg-amber-50 font-bold text-amber-900"
                            : count > 0
                              ? "border-neutral-200 bg-neutral-50 text-neutral-700"
                              : "border-transparent bg-neutral-50 text-neutral-400 opacity-70"
                        }`}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span className="text-[12px]">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                {(isAdmin || idea.project_id) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                    {idea.project_id ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/work/${idea.project_id}`)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"
                      >
                        <FolderPlus size={14} />
                        {isRu ? "Проект создан — открыть" : "Projekt erstellt – öffnen"}
                      </button>
                    ) : (
                      isAdmin && (
                        <button
                          type="button"
                          onClick={() => createProject(idea)}
                          disabled={busyId === idea.id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1b2431] px-3 text-xs font-semibold text-[#ffc93c] disabled:opacity-40"
                        >
                          <FolderPlus size={14} />
                          {isRu ? "Создать проект" : "Projekt erstellen"}
                        </button>
                      )
                    )}

                    {isAdmin &&
                      (confirmDeleteId === idea.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => deleteIdea(idea)}
                            disabled={busyId === idea.id}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white disabled:opacity-40"
                          >
                            {isRu ? "Да, удалить" : "Ja, löschen"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="inline-flex h-9 items-center rounded-lg bg-neutral-100 px-3 text-xs font-semibold text-neutral-600"
                          >
                            {isRu ? "Отмена" : "Abbrechen"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(idea.id)}
                          aria-label={isRu ? "Удалить идею" : "Idee löschen"}
                          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      ))}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}