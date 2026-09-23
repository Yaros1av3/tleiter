import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { LanguageProvider } from "@/components/LanguageProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://tlight-workspace.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "TLight — Team Workspace",
    template: "%s — TLight",
  },

  description:
    "TLight — Team Workspace für Dienst, Team und gemeinsame Planung.",

  applicationName: "TLight",

  manifest: "/manifest.webmanifest",

  keywords: [
    "TLight",
    "Team Workspace",
    "Team",
    "Dienst",
    "Planung",
  ],

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/x-icon",
      },
      {
        url: "/icon.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],

    apple: [
      {
        url: "/apple-icon.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
  },

  openGraph: {
  type: "website",
  url: siteUrl,
  siteName: "TLight",
  title: "TLight — Team Workspace",
  description: "Dienst. Team. Ein Ort.",
  locale: "de_DE",
},

  twitter: {
  card: "summary_large_image",
  title: "TLight — Team Workspace",
  description: "Dienst. Team. Ein Ort.",
  images: ["/opengraph-image"],
},

  appleWebApp: {
    capable: true,
    title: "TLight",
    statusBarStyle: "default",
  },

  formatDetection: {
    telephone: false,
  },

  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111820",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <LanguageProvider>
          <AuthGuard>
            {children}
            <BottomNav />
          </AuthGuard>
        </LanguageProvider>
      </body>
    </html>
  );
}