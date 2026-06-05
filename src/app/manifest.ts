import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Momentum — Twoje centrum produktywności",
    short_name: "Momentum",
    description:
      "Działające offline centrum produktywności: timer skupienia, zadania, nawyki i statystyki dnia.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    background_color: "#07070D",
    theme_color: "#8B5CF6",
    lang: "pl",
    orientation: "portrait-primary",
    categories: ["productivity", "lifestyle", "utilities"],
    icons: [
      {
        src: `${base}/icon.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: `${base}/icon.svg`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
