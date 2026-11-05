export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      name: "TLight Teens",
      short_name: "Teens",
      description: "Unterricht, Termine und Benachrichtigungen",
      start_url: "/t",
      scope: "/t",
      display: "standalone",
      background_color: "#faf8f3",
      theme_color: "#1b2431",
      icons: [
        { src: "/icon.png", sizes: "512x512", type: "image/png" },
        { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}