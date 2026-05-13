"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { products } from "@/lib/data";
import ProductCard from "./ProductCard";

const tabs = ["Wszystkie", "Audi", "BMW", "Ford", "Mercedes", "Volkswagen"];

export default function FeaturedProducts() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [active, setActive] = useState("Wszystkie");

  const filtered = active === "Wszystkie" ? products.slice(0, 6) : products.filter(p => p.brand === active).slice(0, 6);

  return (
    <section id="produkty" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0E1420]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 dot-matrix opacity-30" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          className="text-center mb-12">
          <div className="section-label mx-auto justify-center mb-4"><span>Produkty</span></div>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] text-white leading-none mb-4 tracking-wide">
            BESTSELLERY<br /><span className="text-gradient">SKLEPU</span>
          </h2>
          <p className="text-[#94A3B8] text-lg max-w-lg mx-auto">
            Najchętniej wybierane regenerowane turbosprężarki. Każda z gwarancją 24 miesięcy.
          </p>
        </motion.div>

        {/* Filter tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 justify-center mb-10">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActive(tab)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                active === tab
                  ? "bg-[#FF7A00] text-white shadow-[0_0_16px_rgba(255,122,0,0.4)]"
                  : "bg-white/5 text-[#94A3B8] border border-white/8 hover:border-[#FF7A00]/40 hover:text-[#FF7A00]"
              }`}>
              {tab}
            </button>
          ))}
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {(filtered.length > 0 ? filtered : products.slice(0, 3)).map((product, i) => (
            <motion.div key={product.id}
              initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}>
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.6 }}
          className="text-center">
          <button className="btn-ghost">
            Zobacz wszystkie produkty <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
