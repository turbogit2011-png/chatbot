"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Star, ShoppingCart, Heart, Eye, Zap } from "lucide-react";
import type { Product } from "@/lib/data";

export default function ProductCard({ product }: { product: Product }) {
  const [wished, setWished] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="product-card group flex flex-col">
      {/* Image area */}
      <div className="relative h-44 bg-gradient-to-br from-[#1A2438] to-[#0E1420] flex items-center justify-center overflow-hidden">
        <div className="w-20 h-20 rounded-full bg-[#FF7A00]/8 flex items-center justify-center">
          <Zap className="w-10 h-10 text-[#FF7A00]/40" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#131B2A]/60" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isBestseller && <span className="badge badge-orange">Bestseller</span>}
          {product.isNew && <span className="badge badge-blue">Nowość</span>}
        </div>

        {/* Wishlist */}
        <button onClick={() => setWished(!wished)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-all">
          <Heart className={`w-4 h-4 transition-colors ${wished ? "fill-red-500 text-red-500" : "text-white/60"}`} />
        </button>

        {/* Quick view overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="flex items-center gap-2 bg-white/10 text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-all">
            <Eye className="w-3.5 h-3.5" /> Szybki podgląd
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <p className="text-xs font-mono text-[#4A6080] mb-1">{product.oemNumber}</p>
        <h3 className="font-semibold text-white text-sm leading-snug mb-1 group-hover:text-[#FF9A30] transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-[#94A3B8] mb-3">{product.brand} {product.model}</p>

        {/* Stars */}
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < 5 ? "fill-[#FFB800] text-[#FFB800]" : "text-[#4A6080]"}`} />
          ))}
          <span className="text-xs text-[#4A6080] ml-1">(4.9)</span>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="text-xl font-bold text-white">{product.price.toLocaleString("pl-PL")} PLN</div>
          <div className="text-xs text-[#4A6080]">B2B: <span className="text-[#FF9A30] font-semibold">{product.b2bPrice.toLocaleString("pl-PL")} PLN</span> netto</div>
        </div>

        {/* Availability */}
        <div className="flex items-center gap-2 mb-4">
          <span className={product.available ? "dot-available" : "dot-limited"} />
          <span className="text-xs text-[#94A3B8] font-medium">
            {product.available ? "Na stanie" : "Na zamówienie (3-5 dni)"}
          </span>
        </div>

        {/* Warranty */}
        <div className="flex items-center gap-1.5 mb-4 text-xs text-[#94A3B8]">
          <Shield className="w-3.5 h-3.5 text-[#FF7A00]" />
          Gwarancja {product.warranty}
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <button onClick={handleAdd}
            className={`w-full btn-primary justify-center transition-all ${added ? "bg-green-600 shadow-green-900/40" : ""}`}>
            {added ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-xs">✓</span> Dodano!</>
            ) : (
              <><ShoppingCart className="w-4 h-4" /> Do koszyka</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
