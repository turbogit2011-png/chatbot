"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { getProductById, type Product } from "./catalog";

export interface CartLine {
  id: number;
  qty: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  b2bSubtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  hydrated: boolean;
  add: (id: number, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  detailed: { product: Product; qty: number }[];
}

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "turbogit.cart";
const emptySubscribe = () => () => {};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);
  // False during SSR/hydration, true on the client — gates cart-derived UI
  // so static HTML (empty cart) matches the first client render.
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines]);

  const add = useCallback((id: number, qty = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.id === id);
      if (found) return prev.map((l) => (l.id === id ? { ...l, qty: l.qty + qty } : l));
      return [...prev, { id, qty }];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((id: number, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, qty } : l))
    );
  }, []);

  const remove = useCallback((id: number) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const detailed = lines
      .map((l) => {
        const product = getProductById(l.id);
        return product ? { product, qty: l.qty } : null;
      })
      .filter((x): x is { product: Product; qty: number } => x !== null);
    const count = detailed.reduce((n, x) => n + x.qty, 0);
    const subtotal = detailed.reduce((s, x) => s + x.product.price * x.qty, 0);
    const b2bSubtotal = detailed.reduce((s, x) => s + x.product.b2bPrice * x.qty, 0);
    return {
      lines,
      count,
      subtotal,
      b2bSubtotal,
      open,
      setOpen,
      hydrated,
      add,
      setQty,
      remove,
      clear,
      detailed,
    };
  }, [lines, open, hydrated, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
