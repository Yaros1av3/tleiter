import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TLight — Team Workspace",
    short_name: "TLight",
    description: "Dienst. Team. Ein Ort.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f7f6",
    theme_color: "#111820",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dienstplan", url: "/schedule", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Kalender", url: "/calendar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Wann ich dienen kann", url: "/availability", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}