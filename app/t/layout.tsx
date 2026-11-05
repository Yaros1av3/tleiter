import type { Metadata } from "next";

/* Отдельное название, значок и «приложение» для подростков */
export const metadata: Metadata = {
  title: "TLight Teens",
  description: "Unterricht, Termine und Benachrichtigungen für Teens.",
  manifest: "/t/manifest.webmanifest",
  alternates: { canonical: "/t" },
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "TLight Teens",
    statusBarStyle: "default",
  },
};

export default function TeensLayout({ children }: { children: React.ReactNode }) {
  return children;
}