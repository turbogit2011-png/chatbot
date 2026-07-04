"use client";

import { useMemo, useRef, useState } from "react";
import { useTransitionRouter } from "next-view-transitions";
import { Search } from "lucide-react";
import { searchProducts, formatPLN } from "@/lib/shop/catalog";

export default function SearchBox({
  placeholder = "Szukaj po nr OE, marce, modelu…",
  onNavigate,
  autoFocus,
}: {
  placeholder?: string;
  onNavigate?: () => void;
  autoFocus?: boolean;
}) {
  const router = useTransitionRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number | undefined>(undefined);

  const results = useMemo(() => (q.trim() ? searchProducts(q, 6) : []), [q]);

  function go(path: string) {
    setOpen(false);
    setQ("");
    onNavigate?.();
    router.push(path);
  }

  function submit() {
    if (results[active]) go(`/produkt/${results[active].id}`);
    else if (q.trim()) go(`/szukaj/?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none z-10" />
      <input
        type="text"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => q && setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((x) => Math.min(x + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((x) => Math.max(x - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="input-field w-full pl-10 pr-4 py-2 text-sm"
        aria-label="Szukaj produktów"
      />

      {open && q.trim() && (
        <div
          className="absolute left-0 right-0 top-full mt-2 rounded-xl overflow-hidden z-50 shadow-2xl"
          style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}
          onMouseDown={() => window.clearTimeout(blurTimer.current)}
        >
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--text-3)]">
              Brak wyników dla „{q}”.
            </div>
          ) : (
            <>
              {results.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => go(`/produkt/${p.id}`)}
                  onMouseMove={() => setActive(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    i === active ? "bg-white/8" : "hover:bg-white/5"
                  }`}
                >
                  <span className="text-[10px] font-mono text-[var(--text-3)] w-24 shrink-0 truncate">
                    {p.oemNumber}
                  </span>
                  <span className="flex-1 text-sm text-white truncate">{p.name}</span>
                  <span className="text-xs text-[var(--orange-2)] shrink-0">
                    {formatPLN(p.price)}
                  </span>
                </button>
              ))}
              <button
                onClick={() => go(`/szukaj/?q=${encodeURIComponent(q.trim())}`)}
                className="w-full px-3 py-2.5 text-left text-xs text-[var(--orange-2)] hover:bg-white/5 border-t border-[var(--border)]"
              >
                Zobacz wszystkie wyniki dla „{q}” →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
