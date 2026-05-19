"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import ProductCard, { type ProductCardProps } from "./ProductCard";

/* ── Sample products – swap with live WooCommerce data ── */
const PRODUCTS: ProductCardProps[] = [
  {
    name:          "Turbosprężarka Regenerowana VW 2.0 TDI – KKK BorgWarner K03",
    price:         "890 zł",
    originalPrice: "1 299 zł",
    category:      "Turbosprężarki",
    compatibility: "VW Golf, Passat, Tiguan 2.0 TDI 2008-2016",
    rating:        4.9,
    reviews:       62,
    badge:         "Bestseller",
    inStock:       true,
  },
  {
    name:          "Turbosprężarka Regenerowana BMW 3.0d – Garrett GT2260V",
    price:         "1 290 zł",
    originalPrice: "1 799 zł",
    category:      "Turbosprężarki",
    compatibility: "BMW E46, E90, E60 3.0d 2004-2010",
    rating:        4.8,
    reviews:       41,
    badge:         "Premium",
    inStock:       true,
  },
  {
    name:          "Turbosprężarka Regenerowana Audi 2.7 BiTurbo – Garrett GT2052",
    price:         "2 190 zł",
    originalPrice: "2 990 zł",
    category:      "Turbosprężarki",
    compatibility: "Audi A4, A6, S4 2.7 V6 Biturbo 1997-2004",
    rating:        5.0,
    reviews:       29,
    badge:         "Limitowana",
    inStock:       true,
  },
  {
    name:          "Filtr DPF Regenerowany Ford Transit 2.2 TDCi – Pełna Regeneracja",
    price:         "590 zł",
    originalPrice: "890 zł",
    category:      "Filtry DPF",
    compatibility: "Ford Transit 2.2 TDCi 100/115 KM 2006-2014",
    rating:        4.7,
    reviews:       38,
    inStock:       true,
  },
];

/*
  ── GSAP ScrollTrigger wiring ────────────────────────────────────────────────
  Umieść ten skrypt w Client Component lub <script> tuż przed </body>:

  import { gsap } from "gsap";
  import { ScrollTrigger } from "gsap/ScrollTrigger";
  gsap.registerPlugin(ScrollTrigger);

  // Karty produktów – fade-in z dołu przy scrollowaniu
  gsap.from(".product-card", {
    scrollTrigger: { trigger: "#bestsellery", start: "top 80%" },
    y: 55, opacity: 0, stagger: 0.13,
    duration: 0.8, ease: "power3.out"
  });

  // Nagłówek sekcji – reveal z lewej
  gsap.from(".section-heading", {
    scrollTrigger: { trigger: "#bestsellery", start: "top 85%" },
    x: -40, opacity: 0, duration: 0.7, ease: "power2.out"
  });
  ────────────────────────────────────────────────────────────────────────── */

export default function Bestsellers() {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="bestsellery" className="py-24 sm:py-32 relative overflow-hidden">

      {/* Backgrounds */}
      <div className="absolute inset-0 bg-[#080710]" />
      <div className="absolute inset-0 dot-pattern-gold" />

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(212,168,67,0.35) 30%, rgba(212,168,67,0.35) 70%, transparent 100%)",
        }}
      />

      {/* Atmospheric glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(212,168,67,0.05) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6" ref={ref}>

        {/* ── SECTION HEADER ──────────────────────────── */}
        <motion.div
          className="section-heading mb-14"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <div className="badge-gold mb-5 w-fit">
            <Sparkles className="w-3 h-3" />
            Najlepiej oceniane
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-[clamp(2.2rem,5.5vw,4.5rem)] leading-[0.95] tracking-widest uppercase text-white mb-4">
                BESTSELLERY
                <br />
                <span className="text-gradient-gold">PREMIUM</span>
              </h2>
              <p className="font-sub text-[var(--text-muted)] text-lg max-w-xl leading-relaxed">
                Najchętniej wybierane turbosprężarki regenerowane.
                Gwarancja jakości TURBO-GIT — nowe podzespoły, precyzja CNC.
              </p>
            </div>

            <a
              href="/sklep"
              className="btn-ghost flex items-center gap-2 shrink-0 w-fit"
            >
              Zobacz wszystkie
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>

        {/* ── PRODUCT GRID ────────────────────────────── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PRODUCTS.map((product, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 45 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: i * 0.1 }}
              className="flex"
            >
              <ProductCard {...product} />
            </motion.div>
          ))}
        </div>

        {/* ── BOTTOM CTA STRIP ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-5 glass-card-gold rounded-2xl px-7 py-5"
        >
          <div>
            <p className="font-sub font-semibold text-[var(--text)] text-base tracking-wide">
              Nie znalazłeś swojego modelu?
            </p>
            <p className="font-sub text-sm text-[var(--text-muted)] mt-0.5">
              Realizujemy zamówienia na wszystkie marki i modele — skontaktuj się z nami.
            </p>
          </div>
          <a
            href="#kontakt"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector("#kontakt")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="btn-gold flex items-center gap-2 shrink-0 whitespace-nowrap"
          >
            Zapytaj o wycenę
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(212,168,67,0.15) 50%, transparent 100%)",
        }}
      />
    </section>
  );
}
