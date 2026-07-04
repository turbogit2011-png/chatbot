"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import SearchBox from "./SearchBox";
import ProductGrid from "./ProductGrid";
import { searchProducts } from "@/lib/shop/catalog";

export default function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const results = useMemo(() => searchProducts(q, 200), [q]);

  return (
    <div>
      <div className="max-w-xl mb-6">
        <SearchBox placeholder="Doprecyzuj: nr OE, marka, model…" autoFocus />
      </div>

      {q.trim() === "" ? (
        <p className="text-[var(--text-3)]">Wpisz nr OE, markę lub model, aby wyszukać turbo.</p>
      ) : results.length === 0 ? (
        <div className="text-center text-[var(--text-3)] py-16">
          Brak wyników dla „<span className="text-white">{q}</span>”. Sprawdź nr OE lub
          wpisz markę auta.
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--text-2)] mb-4">
            Wyniki dla „<span className="text-white">{q}</span>”
          </p>
          <ProductGrid products={results} />
        </>
      )}
    </div>
  );
}
