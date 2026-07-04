"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/shop/cart";
import { formatPLN } from "@/lib/shop/catalog";

export default function CartDrawer() {
  const cart = useCart();

  return (
    <AnimatePresence>
      {cart.open && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => cart.setOpen(false)}
          />
          <motion.aside
            className="absolute right-0 top-0 h-full w-full max-w-md flex flex-col"
            style={{ background: "var(--bg-2)", borderLeft: "1px solid var(--border)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="flex items-center gap-2 font-semibold text-white">
                <ShoppingCart className="w-5 h-5 text-[var(--orange)]" /> Koszyk
                <span className="text-sm text-[var(--text-3)]">({cart.count})</span>
              </span>
              <button
                onClick={() => cart.setOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 text-[var(--text-2)]"
                aria-label="Zamknij koszyk"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.detailed.length === 0 ? (
                <div className="text-center text-[var(--text-3)] py-16">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  Twój koszyk jest pusty.
                </div>
              ) : (
                cart.detailed.map(({ product, qty }) => (
                  <div
                    key={product.id}
                    className="flex gap-3 rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/produkt/${product.id}`}
                        onClick={() => cart.setOpen(false)}
                        className="text-sm text-white line-clamp-2 hover:text-[var(--orange-2)]"
                      >
                        {product.name}
                      </Link>
                      <div className="text-xs text-[var(--text-3)] mt-0.5 font-mono">
                        {product.oemNumber}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => cart.setQty(product.id, qty - 1)}
                            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/5 border border-[var(--border)]"
                            aria-label="Zmniejsz"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
                          <button
                            onClick={() => cart.setQty(product.id, qty + 1)}
                            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/5 border border-[var(--border)]"
                            aria-label="Zwiększ"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-white">
                          {formatPLN(product.price * qty)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => cart.remove(product.id)}
                      className="text-[var(--text-3)] hover:text-[var(--red)] self-start"
                      aria-label="Usuń"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.detailed.length > 0 && (
              <div className="px-5 py-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-2)]">Razem (brutto)</span>
                  <span className="text-xl font-display text-white">{formatPLN(cart.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-3)]">
                  <span>Cena B2B netto</span>
                  <span className="text-[var(--orange-2)]">{formatPLN(cart.b2bSubtotal)}</span>
                </div>
                <Link
                  href="/zamowienie"
                  onClick={() => cart.setOpen(false)}
                  className="btn-primary w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl"
                >
                  Przejdź do zamówienia
                </Link>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
