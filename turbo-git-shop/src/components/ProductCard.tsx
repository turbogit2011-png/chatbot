"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Star, ShoppingCart, Heart, Eye, Check } from "lucide-react";
import type { Product } from "@/lib/data";

function TurboSVG() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-20 h-20 opacity-30">
      <circle cx="60" cy="60" r="55" stroke="rgba(255,122,0,0.3)" strokeWidth="0.5" />
      <circle cx="60" cy="60" r="48" stroke="rgba(255,122,0,0.15)" strokeWidth="0.5" strokeDasharray="3 6" />
      {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((deg, i) => (
        <g key={i} transform={`rotate(${deg} 60 60)`}>
          <path d="M60 60 Q68 30 54 20 Q48 40 60 60" fill="rgba(255,122,0,0.25)" />
        </g>
      ))}
      <circle cx="60" cy="60" r="14" fill="rgba(255,122,0,0.15)" stroke="rgba(255,122,0,0.4)" strokeWidth="0.5" />
      <circle cx="60" cy="60" r="7" fill="rgba(255,122,0,0.35)" />
      <circle cx="60" cy="60" r="3" fill="rgba(255,122,0,0.8)" />
    </svg>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const [wished, setWished] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const savings = product.price - product.b2bPrice;

  return (
    <div className="product-card card-shimmer group flex flex-col">
      {/* Image area */}
      <div className="relative h-48 bg-gradient-to-br from-[#1A2438] via-[#131B2A] to-[#0E1420] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-32 h-32 rounded-full animate-breathe"
            style={{ background: "radial-gradient(circle, rgba(255,122,0,0.12), transparent 70%)" }}
          />
        </div>

        <TurboSVG />

        <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="animate-scan absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF7A00]/40 to-transparent" />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#131B2A]/80" />

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isBestseller && <span className="badge badge-orange text-[10px]">★ Bestseller</span>}
          {product.isNew && <span className="badge badge-blue text-[10px]">Nowość</span>}
        </div>

        <button
          onClick={() => setWished(!wished)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-[#FF7A00]/20 transition-all border border-white/10"
        >
          <Heart className={`w-4 h-4 transition-all ${wished ? "fill-red-500 text-red-500 scale-110" : "text-white/50"}`} />
        </button>

        <div className="absolute inset-0 bg-[#FF7A00]/10 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <button className="flex items-center gap-2 bg-white/10 text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
            <Eye className="w-3.5 h-3.5" />
            Szybki podgląd
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <p className="text-[10px] font-mono text-[#4A6080] mb-1 tracking-widest">{product.oemNumber}</p>

        <h3 className="font-semibold text-white text-sm leading-snug mb-1 group-hover:text-[#FF9A30] transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-[#94A3B8] mb-3">
          {product.brand} · {product.model}
        </p>

        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-[#FFB800] text-[#FFB800]" />
          ))}
          <span className="text-xs text-[#4A6080] ml-1 font-medium">4.9</span>
        </div>

        <div className="mb-3 p-3 bg-white/[0.03] rounded-lg border border-white/5">
          <div className="text-2xl font-display text-white tracking-wide">
            {product.price.toLocaleString("pl-PL")} <span className="text-sm font-sans font-normal text-[#94A3B8]">PLN</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#4A6080]">B2B netto:</span>
            <span className="text-[#FF9A30] font-bold text-sm">{product.b2bPrice.toLocaleString("pl-PL")} PLN</span>
            <span className="text-[10px] text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded font-medium">
              -{savings} PLN
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className={product.available ? "dot-available" : "dot-limited"} />
            <span className="text-[#94A3B8]">{product.available ? "Na stanie" : "3-5 dni"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#94A3B8]">
            <Shield className="w-3 h-3 text-[#FF7A00]" />
            <span>{product.warranty}</span>
          </div>
        </div>

        <div className="mt-auto">
          <motion.button
            onClick={handleAdd}
            whileTap={{ scale: 0.97 }}
            className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl transition-all duration-300 text-sm ${
              added
                ? "bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80]"
                : "btn-primary"
            }`}
          >
            {added ? (
              <><Check className="w-4 h-4" /> Dodano do koszyka!</>
            ) : (
              <><ShoppingCart className="w-4 h-4" /> Do koszyka</>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
