// Wyszukiwarka katalogu Turbo-Git: po numerze turbo / OE / MPN / kodzie silnika / marce / modelu / mocy.
// Priorytet: dokładne trafienie numeru > kod silnika > tekst (marka/model). Zwraca wynik z powodem trafienia.

import type { CatalogProduct } from "./types";
import { normalizeNumber, numberMatches, tokens } from "./normalize";

export type MatchReason =
  | "turbo_number"
  | "oe_number"
  | "cross_reference"
  | "mpn"
  | "engine_code"
  | "text";

export interface SearchHit {
  product: CatalogProduct;
  score: number;
  reason: MatchReason;
}

export interface SearchFilters {
  make?: string;
  fuel?: string;
  segment?: string;
  powerMin?: number;
  powerMax?: number;
}

function powerOf(p: CatalogProduct): number {
  const n = parseInt((p.fields.power_hp.value || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function passesFilters(p: CatalogProduct, f: SearchFilters): boolean {
  if (f.make && !p.fields.vehicle_make.value.some((m) => m.toLowerCase() === f.make!.toLowerCase())) return false;
  if (f.fuel && (p.fields.fuel_type.value || "").toLowerCase() !== f.fuel.toLowerCase()) return false;
  if (f.segment && !(p.fields.vehicle_segment.value || "").toLowerCase().includes(f.segment.toLowerCase())) return false;
  const hp = powerOf(p);
  if (f.powerMin && hp < f.powerMin) return false;
  if (f.powerMax && hp > f.powerMax) return false;
  return true;
}

export function searchCatalog(
  products: CatalogProduct[],
  query: string,
  filters: SearchFilters = {}
): SearchHit[] {
  const q = (query || "").trim();
  const hits: SearchHit[] = [];

  for (const p of products) {
    if (!passesFilters(p, filters)) continue;

    if (!q) {
      hits.push({ product: p, score: 1, reason: "text" });
      continue;
    }

    const f = p.fields;
    let reason: MatchReason | null = null;
    let score = 0;

    if (numberMatches(q, f.turbo_number.value)) { reason = "turbo_number"; score = 100; }
    else if (numberMatches(q, f.oe_numbers.value)) { reason = "oe_number"; score = 90; }
    else if (numberMatches(q, f.mpn.value)) { reason = "mpn"; score = 85; }
    else if (numberMatches(q, f.turbo_crossref.value)) { reason = "cross_reference"; score = 80; }
    else if (f.engine_code.value.some((e) => normalizeNumber(e) === normalizeNumber(q))) { reason = "engine_code"; score = 70; }
    else {
      // tekst: marka / model / nazwa
      const hay = (
        p.name + " " +
        f.vehicle_make.value.join(" ") + " " +
        f.vehicle_model.value + " " +
        f.engine_capacity.value + " " +
        f.fuel_type.value
      ).toLowerCase();
      const qt = tokens(q);
      const matched = qt.filter((t) => hay.includes(t)).length;
      if (matched > 0) { reason = "text"; score = 30 + matched * 5; }
    }

    if (reason) hits.push({ product: p, score, reason });
  }

  return hits.sort((a, b) => b.score - a.score);
}
