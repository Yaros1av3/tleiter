"use client";

import { useState } from "react";

/*
 * Аватарка служителя: фото из карточки «Команды». Если фото нет (или оно не
 * загрузилось) — простой серый человечек, как в Instagram.
 * Размер и скругление задаются через className:
 *
 *   <Avatar src={member.avatar_url} className="h-7 w-7 rounded-full" />
 */
export default function Avatar({
  src,
  className = "",
}: {
  src?: string | null;
  /** больше не используется (раньше показывались инициалы), оставлен для совместимости */
  initials?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const hasPhoto = Boolean(src) && !failed;

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={hasPhoto ? undefined : { backgroundColor: "#e4e6ea" }}
    >
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-full w-full"
          aria-hidden="true"
        >
          <circle cx="12" cy="9.5" r="4.2" fill="#a9b0b9" />
          <path d="M2.5 24c0-5.6 4.3-9 9.5-9s9.5 3.4 9.5 9z" fill="#a9b0b9" />
        </svg>
      )}
    </span>
  );
}