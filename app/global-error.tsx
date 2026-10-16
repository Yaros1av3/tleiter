"use client";

import { useEffect, useState } from "react";

// Запасной экран на случай, когда сломался сам layout (провайдеры недоступны).
// Язык читаем напрямую из localStorage.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRu, setIsRu] = useState(false);

  useEffect(() => {
    console.error(error);

    try {
      setIsRu(window.localStorage.getItem("tlite-language") === "ru");
    } catch {
      // язык по умолчанию — немецкий
    }
  }, [error]);

  return (
    <html lang={isRu ? "ru" : "de"}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f7f6",
          color: "#111820",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>
            {isRu ? "Что-то пошло не так" : "Etwas ist schiefgelaufen"}
          </h1>

          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>
            {isRu
              ? "Приложение не смогло загрузиться. Попробуйте обновить."
              : "Die App konnte nicht geladen werden. Bitte versuche es erneut."}
          </p>

          <button
            type="button"
            onClick={() => reset()}
            style={{
              height: 48,
              width: "100%",
              border: 0,
              borderRadius: 16,
              background: "#111820",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isRu ? "Обновить" : "Neu laden"}
          </button>
        </div>
      </body>
    </html>
  );
}