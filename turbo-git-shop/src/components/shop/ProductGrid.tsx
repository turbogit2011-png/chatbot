"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/shop/catalog";

type Sort = "relevance" | "price-asc" | "price-desc" | "name" | "bestseller";

const SORTS: { value: Sort; label: string }[] = [
  { value: "relevance", label: "Trafność" },
  { value: "price-asc", label: "Cena: rosnąco" },
  { value: "price-desc", label: "Cena: malejąco" },
  { value: "name", label: "Nazwa A–Z" },
  { value: "bestseller", label: "Bestsellery" },
];

export default function ProductGrid({ products }: { products: Product[] }) {
  const [sort, setSort] = useState<Sort>("relevance");
  const [inStockOnly, setInStockOnly] = useState(false);
  const maxPrice = useMemo(
    () => Math.max(1000, ...products.map((p) => p.price)),
    [products]
  );
  const [priceCap, setPriceCap] = useState(maxPrice);

  const view = useMemo(() => {
    let list = products.filter((p) => p.price <= priceCap);
    if (inStockOnly) list = list.filter((p) => p.available);
    const sorted = [...list];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "pl"));
        break;
      case "bestseller":
        sorted.sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller));
        break;
    }
    return sorted;
  }, [products, sort, inStockOnly, priceCap]);

  return (
    <div>
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
      >
        <span className="flex items-center gap-2 text-sm text-[var(--text-2)]">
          <SlidersHorizontal className="w-4 h-4 text-[var(--orange)]" />
          <span className="text-white font-semibold">{view.length}</span> produktów
        </span>

        <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
          Sortuj:
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="input-field px-3 py-1.5 text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="accent-[var(--orange)]"
          />
          Tylko na stanie
        </label>

        <label className="flex items-center gap-2 text-sm text-[var(--text-2)] ml-auto">
          Cena do:{" "}
          <span className="text-[var(--orange-2)] font-semibold tabular-nums w-20 text-right">
            {priceCap.toLocaleString("pl-PL")} zł
          </span>
          <input
            type="range"
            min={0}
            max={maxPrice}
            step={50}
            value={priceCap}
            onChange={(e) => setPriceCap(Number(e.target.value))}
            className="accent-[var(--orange)] w-40"
          />
        </label>
      </div>

      {view.length === 0 ? (
        <div className="text-center text-[var(--text-3)] py-16">
          Brak produktów spełniających kryteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {view.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
