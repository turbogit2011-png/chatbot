import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getAllProducts } from "@/lib/shop/catalog";
import { categories } from "@/lib/data";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const home = { url: `${SITE_URL}/`, changeFrequency: "weekly" as const, priority: 1 };
  const brands = categories.map((c) => ({
    url: `${SITE_URL}/marka/${c.slug}/`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const products = getAllProducts().map((p) => ({
    url: `${SITE_URL}/produkt/${p.id}/`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [home, ...brands, ...products];
}
