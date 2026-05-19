"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { ShoppingCart, Star, Zap } from "lucide-react";

export interface ProductCardProps {
  name:           string;
  price:          string;
  originalPrice?: string;
  category:       string;
  compatibility:  string;
  rating?:        number;
  reviews?:       number;
  badge?:         string;
  inStock?:       boolean;
  onAddToCart?:   () => void;
}

/* ── Inline turbo SVG thumbnail ─────────────────────── */
function TurboThumb() {
  return (
    <svg viewBox="0 0 120 120" className="w-36 h-36" fill="none">
      <circle cx="60" cy="60" r="50" stroke="rgba(212,168,67,0.18)" strokeWidth="0.75" />
      {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((deg, i) => (
        <g key={i} transform={`rotate(${deg} 60 60)`}>
          <path
            d="M60 60 L63 18 Q60 15 57 18 Z"
            fill={`rgba(212,168,67,${0.1 + i * 0.018})`}
            stroke="rgba(212,168,67,0.38)"
            strokeWidth="0.5"
          />
        </g>
      ))}
      <circle cx="60" cy="60" r="14" fill="rgba(13,11,22,0.95)" stroke="rgba(212,168,67,0.5)" strokeWidth="0.75" />
      <circle cx="60" cy="60" r="7"  fill="rgba(212,168,67,0.05)" stroke="rgba(0,207,255,0.45)" strokeWidth="0.75" />
      <circle cx="60" cy="60" r="3"  fill="rgba(212,168,67,0.85)" />
      <path d="M 18 60 A 42 42 0 0 1 60 18" stroke="rgba(0,207,255,0.5)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   PRODUCT CARD
   – 3-D tilt on mouse-move (Framer Motion spring)
   – Gold border glow on hover
   – Metallic shimmer sweep
   – Magnetic add-to-cart button
   ═══════════════════════════════════════════════════════ */
export default function ProductCard({
  name,
  price,
  originalPrice,
  category,
  compatibility,
  rating   = 4.9,
  reviews  = 47,
  badge,
  inStock  = true,
  onAddToCart,
}: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  /* ── 3-D tilt ── */
  const rawX      = useMotionValue(0);
  const rawY      = useMotionValue(0);
  const rotateX   = useSpring(useTransform(rawY, [-0.5,  0.5], [ 6, -6]), { stiffness: 160, damping: 22 });
  const rotateY   = useSpring(useTransform(rawX, [-0.5,  0.5], [-6,  6]), { stiffness: 160, damping: 22 });
  /* subtle SVG tilt follows card */
  const svgRotate = useTransform(rawX, [-0.5, 0.5], [-4, 4]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    rawX.set((e.clientX - r.left)  / r.width  - 0.5);
    rawY.set((e.clientY - r.top)   / r.height - 0.5);
  };
  const handleLeave = () => { rawX.set(0); rawY.set(0); };

  return (
    /*
      GSAP ScrollTrigger – fade-in on scroll (add to parent section):
      gsap.from(".product-card", {
        scrollTrigger: {
          trigger: "#bestsellery",
          start: "top 80%",
        },
        y: 50, opacity: 0, stagger: 0.12,
        duration: 0.75, ease: "power3.out"
      });
    */
    <motion.div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      whileHover={{ scale: 1.025, z: 28 }}
      transition={{ type: "spring", stiffness: 200, damping: 26 }}
      className="product-card group cursor-pointer h-full flex flex-col"
    >
      {/* ── IMAGE AREA ────────────────────────────────── */}
      <div className="relative h-52 bg-[#0D0B18] rounded-t-[0.95rem] overflow-hidden flex-shrink-0">

        {/* Gold radial glow – visible on hover */}
        <div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background:
              "radial-gradient(ellipse 75% 65% at 50% 50%, rgba(212,168,67,0.14) 0%, transparent 70%)",
          }}
        />

        {/*
          ZDJĘCIE PRODUKTU – zastąp SVG obrazem z WooCommerce:
          import Image from "next/image";
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-contain p-6
                       drop-shadow-[0_0_20px_rgba(212,168,67,0.25)]
                       group-hover:drop-shadow-[0_0_35px_rgba(212,168,67,0.4)]
                       transition-all duration-500"
          />
        */}

        {/* SVG placeholder – centred, subtle tilt with card */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div style={{ rotateZ: svgRotate }}>
            <div className="drop-shadow-[0_0_22px_rgba(212,168,67,0.28)] group-hover:drop-shadow-[0_0_36px_rgba(212,168,67,0.46)] transition-all duration-500">
              <TurboThumb />
            </div>
          </motion.div>
        </div>

        {/* Metallic shimmer sweep on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer pointer-events-none" />

        {/* Product badge */}
        {badge && (
          <div className="absolute top-3 left-3">
            <span className="badge-gold-sm">{badge}</span>
          </div>
        )}

        {/* Stock indicator */}
        <div
          className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.68rem] font-semibold font-sub ${
            inStock
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10   border border-red-500/20   text-red-400"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${inStock ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}
          />
          {inStock ? "Dostępny" : "Wkrótce"}
        </div>
      </div>

      {/* ── INFO AREA ─────────────────────────────────── */}
      <div className="p-5 flex flex-col flex-1">

        {/* Category chip */}
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3 h-3 text-[var(--gold)]" />
          <span className="font-sub text-[0.62rem] font-bold text-[var(--gold)] tracking-[0.14em] uppercase">
            {category}
          </span>
        </div>

        {/* Product name */}
        <h3 className="font-sub font-semibold text-[var(--text)] text-[0.95rem] leading-snug mb-1.5 group-hover:text-white transition-colors duration-300 line-clamp-2 flex-1">
          {name}
        </h3>

        {/* Compatibility */}
        <p className="font-sub text-[0.75rem] text-[var(--text-muted)] mb-3.5 line-clamp-1">
          {compatibility}
        </p>

        {/* Star rating */}
        <div className="flex items-center gap-1.5 mb-4">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < Math.floor(rating)
                    ? "text-[var(--gold)] fill-[var(--gold)]"
                    : "text-[var(--text-subtle)]"
                }`}
              />
            ))}
          </div>
          <span className="font-sub text-[0.72rem] text-[var(--text-muted)]">
            {rating} ({reviews})
          </span>
        </div>

        {/* Price row + cart button */}
        <div className="flex items-end justify-between gap-3 mt-auto">
          <div>
            <div className="font-display text-2xl tracking-widest text-gradient-gold leading-none">
              {price}
            </div>
            {originalPrice && (
              <div className="font-sub text-[0.72rem] text-[var(--text-subtle)] line-through mt-0.5">
                {originalPrice}
              </div>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={(e) => { e.stopPropagation(); onAddToCart?.(); }}
            className="btn-cart flex items-center gap-1.5 flex-shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Do koszyka</span>
          </motion.button>
        </div>
      </div>

      {/* ── GOLD BORDER GLOW ──────────────────────────── */}
      <div
        className="absolute inset-0 rounded-[0.95rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(212,168,67,0.38), 0 24px 64px rgba(212,168,67,0.09)",
        }}
      />

      {/* ── CORNER ACCENT LINES ───────────────────────── */}
      <div className="absolute top-0 left-0 w-6 h-6 rounded-tl-[0.95rem] pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 left-0 w-full h-px bg-[var(--gold)]" />
        <div className="absolute top-0 left-0 w-px h-full bg-[var(--gold)]" />
      </div>
      <div className="absolute bottom-0 right-0 w-6 h-6 rounded-br-[0.95rem] pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute bottom-0 right-0 w-full h-px bg-[var(--gold)]" />
        <div className="absolute bottom-0 right-0 w-px h-full bg-[var(--gold)]" />
      </div>
    </motion.div>
  );
}
