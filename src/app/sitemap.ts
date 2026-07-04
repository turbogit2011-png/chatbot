import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/aura", "/ai", "/wealth"];
  return routes.map((r) => ({
    url: `${SITE_URL}${r}/`,
    changeFrequency: "monthly",
    priority: r === "" ? 1 : 0.8,
  }));
}
