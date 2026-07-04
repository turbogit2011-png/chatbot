"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/shop/cart";

export default function AddToCartButton({ id }: { id: number }) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center rounded-xl"
        style={{ border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}
      >
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="w-11 h-12 flex items-center justify-center text-[var(--text-2)] hover:text-white"
          aria-label="Zmniejsz ilość"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-10 text-center font-semibold tabular-nums">{qty}</span>
        <button
          onClick={() => setQty((q) => q + 1)}
          className="w-11 h-12 flex items-center justify-center text-[var(--text-2)] hover:text-white"
          aria-label="Zwiększ ilość"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          cart.add(id, qty);
          setAdded(true);
          window.setTimeout(() => setAdded(false), 2000);
        }}
        className={`flex-1 flex items-center justify-center gap-2 font-bold py-3.5 px-6 rounded-xl transition-all text-sm ${
          added
            ? "bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80]"
            : "btn-primary"
        }`}
      >
        {added ? (
          <>
            <Check className="w-5 h-5" /> Dodano do koszyka
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5" /> Dodaj do koszyka
          </>
        )}
      </motion.button>
    </div>
  );
}
