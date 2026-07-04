import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TURBO-GIT — Regenerowane Turbosprężarki",
    short_name: "TURBO-GIT",
    description: "Sklep z regenerowanymi turbosprężarkami. Gwarancja 24 miesiące, wysyłka 24h.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    background_color: "#06080D",
    theme_color: "#FF7A00",
    lang: "pl",
    categories: ["shopping", "business"],
    icons: [
      { src: `${base}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: `${base}/icon.svg`, sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
