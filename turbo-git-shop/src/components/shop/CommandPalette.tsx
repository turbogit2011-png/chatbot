"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useTransitionRouter } from "next-view-transitions";
import { Command, CornerDownLeft, Package, Search, ShoppingCart, Tag } from "lucide-react";
import { searchProducts, formatPLN } from "@/lib/shop/catalog";
import { categories } from "@/lib/data";
import { useCart } from "@/lib/shop/cart";

interface Item {
  key: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

const emptySubscribe = () => () => {};

export function CommandPalette() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const router = useTransitionRouter();
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActive(0);
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo<Item[]>(() => {
    const close = () => {
      setOpen(false);
      setQ("");
    };
    const query = q.trim().toLowerCase();
    const productItems: Item[] = (query ? searchProducts(q, 6) : []).map((p) => ({
      key: `p${p.id}`,
      label: p.name,
      hint: `${p.oemNumber} · ${formatPLN(p.price)}`,
      icon: <Package className="w-4 h-4" />,
      run: () => {
        close();
        router.push(`/produkt/${p.id}`);
      },
    }));

    const actions: Item[] = [
      {
        key: "cart",
        label: "Otwórz koszyk",
        icon: <ShoppingCart className="w-4 h-4" />,
        run: () => {
          close();
          cart.setOpen(true);
        },
      },
      {
        key: "order",
        label: "Przejdź do zamówienia",
        icon: <CornerDownLeft className="w-4 h-4" />,
        run: () => {
          close();
          router.push("/zamowienie");
        },
      },
      ...categories.map((c) => ({
        key: `b${c.slug}`,
        label: `Turbo ${c.name}`,
        hint: `${c.count} modeli`,
        icon: <Tag className="w-4 h-4" />,
        run: () => {
          close();
          router.push(`/marka/${c.slug}`);
        },
      })),
    ].filter((a) => !query || a.label.toLowerCase().includes(query));

    const list = [...productItems, ...actions];
    if (query && productItems.length > 0) {
      list.push({
        key: "all",
        label: `Zobacz wszystkie wyniki dla „${q}”`,
        icon: <Search className="w-4 h-4" />,
        run: () => {
          close();
          router.push(`/szukaj/?q=${encodeURIComponent(q.trim())}`);
        },
      });
    }
    return list;
  }, [q, router, cart]);

  if (!mounted) return null;

  return createPortal(
    <>
      {!open && (
        <button
          onClick={() => {
            setActive(0);
            setOpen(true);
          }}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm text-[#94A3B8] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:text-white"
          style={{ background: "rgba(19,27,42,0.7)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}
          aria-label="Szukaj (Ctrl+K)"
        >
          <Command className="w-3.5 h-3.5" /> Szukaj
          <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>⌘K</kbd>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-start justify-center pt-[15vh] px-4"
          style={{ background: "rgba(4,6,11,0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl overflow-hidden"
            style={{ background: "rgba(14,20,32,0.96)", border: "1px solid var(--border-active)", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.9)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <Search className="w-4 h-4 text-[#4A6080]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((x) => Math.min(x + 1, items.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setActive((x) => Math.max(x - 1, 0)); }
                  else if (e.key === "Enter") { e.preventDefault(); items[active]?.run(); }
                }}
                placeholder="Szukaj produktu (nr OE), marki lub akcji…"
                className="flex-1 bg-transparent outline-none text-white text-[0.95rem] placeholder:text-[#4A6080]"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded text-[#94A3B8]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>esc</kbd>
            </div>
            <div className="max-h-[340px] overflow-y-auto p-2">
              {items.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[#4A6080]">Brak wyników.</div>
              ) : (
                items.map((it, i) => (
                  <Fragment key={it.key}>
                    <button
                      onClick={it.run}
                      onMouseMove={() => setActive(i)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                      style={i === active ? { background: "rgba(255,122,0,0.14)" } : undefined}
                    >
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[#FF7A00] shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                        {it.icon}
                      </span>
                      <span className="flex-1 min-w-0 text-sm text-white truncate">{it.label}</span>
                      {it.hint && <span className="text-[11px] text-[#4A6080] shrink-0">{it.hint}</span>}
                    </button>
                  </Fragment>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
