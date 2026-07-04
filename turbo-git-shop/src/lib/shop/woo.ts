/* WooCommerce Store API adapter (headless).
   Reads the live catalog from a WooCommerce Store API (public, no secret key)
   and maps it to the local `Product` shape so the existing UI renders live
   data unchanged. Meant to run server-side (Vercel SSR/ISR) — no CORS, and
   any authenticated REST key would live only in Vercel env, never in the repo.

   Verified against the live turbo-git.com Store API (WooCommerce 10.9.1):
   109 products, real photos, prices in minor units, brand/model in the
   "Marka"/"Model" attributes (with a name-based fallback). */

import type { Product } from "@/lib/data";

export interface WooProduct extends Product {
  image?: string;
  permalink?: string;
  slug?: string;
  brands: string[];
}

interface StoreApiTerm {
  name: string;
}
interface StoreApiAttribute {
  name: string;
  terms: StoreApiTerm[];
}
interface StoreApiProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  permalink: string;
  short_description: string;
  description: string;
  is_in_stock: boolean;
  prices: { price: string; regular_price: string; currency_minor_unit: number };
  images: { src: string; alt: string }[];
  categories: { name: string; slug: string }[];
  attributes: StoreApiAttribute[];
}

const KNOWN_BRANDS = [
  "Volkswagen", "Mercedes-Benz", "Mercedes", "Land Rover", "Alfa Romeo",
  "Audi", "BMW", "Ford", "Opel", "Hyundai", "Renault", "Peugeot", "Volvo",
  "Dacia", "Nissan", "Kia", "Skoda", "Seat", "Toyota", "Fiat", "Citroen",
  "Mazda", "Honda", "Suzuki", "Mini", "Jeep", "Iveco", "Porsche",
  "Mitsubishi", "VW",
];

function storeUrl(): string {
  const url = process.env.NEXT_PUBLIC_WC_STORE_URL || process.env.WC_STORE_URL;
  if (!url) throw new Error("WC_STORE_URL not set");
  return url.replace(/\/$/, "");
}

const stripHtml = (s = "") => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function attr(p: StoreApiProduct, name: string): string[] {
  const a = p.attributes.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return a ? a.terms.map((t) => t.name) : [];
}

function brandsOf(p: StoreApiProduct): string[] {
  const fromAttr = attr(p, "Marka");
  if (fromAttr.length) return fromAttr.map((b) => (b === "VW" ? "Volkswagen" : b));
  const found = KNOWN_BRANDS.filter((b) =>
    p.name.toLowerCase().includes(b.toLowerCase())
  ).map((b) => (b === "VW" ? "Volkswagen" : b));
  return found.length ? [...new Set(found)] : ["Inne"];
}

export function mapWooProduct(p: StoreApiProduct): WooProduct {
  const minor = p.prices?.currency_minor_unit ?? 2;
  const price = Number(p.prices?.price ?? 0) / 10 ** minor;
  const brands = brandsOf(p);
  const models = attr(p, "Model");
  const engine = attr(p, "Kod silnika");
  const specs = p.attributes.map((a) => `${a.name}: ${a.terms.map((t) => t.name).join(", ")}`);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    permalink: p.permalink,
    brand: brands[0] ?? "Inne",
    brands,
    model: models.join(", ") || attr(p, "Pojemnosc").join(", "),
    engineCode: engine.join(", "),
    oemNumber: p.sku || "", // live store keeps OE in the name; SKU often empty
    price,
    b2bPrice: 0, // role-based B2B pricing isn't exposed by the public Store API
    warranty: "24 miesiące",
    available: !!p.is_in_stock,
    isNew: false,
    isBestseller: false,
    description: stripHtml(p.short_description) || stripHtml(p.description),
    specs,
    image: p.images?.[0]?.src,
  };
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${storeUrl()}/wp-json/wc/store/v1${path}`, {
    // ISR: refresh the catalog periodically on the server
    next: { revalidate: 600 },
  } as RequestInit);
  if (!res.ok) throw new Error(`Store API ${path} → ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchWooProducts(page = 1, perPage = 100): Promise<WooProduct[]> {
  const data = await getJson<StoreApiProduct[]>(`/products?per_page=${perPage}&page=${page}`);
  return data.map(mapWooProduct);
}

export async function fetchAllWooProducts(): Promise<WooProduct[]> {
  const all: WooProduct[] = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await fetchWooProducts(page, 100);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

export async function fetchWooProduct(id: number): Promise<WooProduct | null> {
  try {
    const p = await getJson<StoreApiProduct>(`/products/${id}`);
    return mapWooProduct(p);
  } catch {
    return null;
  }
}
