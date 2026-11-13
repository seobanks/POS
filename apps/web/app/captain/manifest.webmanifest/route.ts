import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    name: "SERVIO Captain",
    short_name: "SERVIO",
    description: "SERVIO Smart Restaurant Service by Hanva POS - Waiter & Captain Tablet & Mobile Ordering App",
    start_url: "/captain",
    scope: "/captain",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ea580c",
    lang: "en",
    categories: ["food", "business", "productivity"],
    icons: [
      {
        src: "/icons/captain-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/captain-apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/captain-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/captain-96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/captain-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
    },
  });
}
