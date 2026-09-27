import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TLight — Team Workspace",
    short_name: "TLight",
    description: "Dienst. Team. Ein Ort.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f6",
    theme_color: "#111820",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}