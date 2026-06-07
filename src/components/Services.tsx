"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";

const brands = [
  { name: "Audi",          models: "A3, A4, A6, Q5, TT – 1.8T / 2.0 TFSI / 3.0 TDI",  popular: "2.0 TDI 170KM",     highlight: true },
  { name: "Volkswagen",    models: "Golf, Passat, Tiguan, Touareg – 1.9 TDI / 2.0 TDI", popular: "1.9 TDI 105KM",     highlight: false },
  { name: "BMW",           models: "E46, E90, F10, F30 – 320d, 520d, 118d",             popular: "2.0d 163KM",        highlight: false },
  { name: "Mercedes",      models: "C, E, Sprinter – CDI / Bluetec",                    popular: "2.2 CDI 150KM",     highlight: false },
  { name: "Ford",          models: "Focus, Transit, S-Max – 1.6 / 2.0 TDCi",           popular: "2.0 TDCi 140KM",    highlight: false },
  { name: "Volvo",         models: "V40, V70, XC60, XC90 – D2, D4, D5",                popular: "D5 185KM",          highlight: false },
  { name: "Renault",       models: "Megane, Scenic, Laguna – 1.5 / 1.9 / 2.0 dCi",     popular: "1.9 dCi 130KM",    highlight: false },
  { name: "Toyota",        models: "Avensis, RAV4, Yaris – 2.0 / 2.2 D-4D",            popular: "2.2 D-4D 150KM",    highlight: false },
  { name: "Opel",          models: "Astra, Insignia, Zafira – 1.7 / 2.0 CDTI",         popular: "2.0 CDTI 130KM",    highlight: false },
  { name: "Skoda",         models: "Octavia, Superb, Kodiaq – 1.9 / 2.0 TDI",          popular: "2.0 TDI 140KM",     highlight: false },
  { name: "Ciężarowe",     models: "DAF, MAN, Scania, Renault, Iveco – wszystkie modele", popular: "Wycena indyw.",   highlight: false },
  { name: "Inne marki",    models: "Seat, Fiat, Peugeot, Citroën, Honda, Mazda i więcej", popular: "Zapytaj",        highlight: false },
];

export default function Services() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="kategorie" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#07090E]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-0 dot-pattern opacity-30" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="section-label mx-auto justify-center mb-4">
            <span>Kategorie</span>
          </div>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] text-white leading-none mb-4 tracking-wide">
            TURBO DO TWOJEGO
            <br />
            <span className="text-gradient">SAMOCHODU</span>
          </h2>
          <p className="text-[#8A9BB0] text-lg max-w-xl mx-auto leading-relaxed">
            8&nbsp;000+ modeli turbosprężarek w magazynie. Znajdź pasujące turbo
            do swojej marki i modelu — dostawa w 24 godziny.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {brands.map((brand, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.05 + i * 0.06 }}
              className={[
                "group relative rounded-2xl p-6 cursor-pointer overflow-hidden transition-all duration-400",
                brand.highlight
                  ? "sm:col-span-2 lg:col-span-2 border border-[#FF6B1A]/30 hover:border-[#FF6B1A]/55 bg-[#111827]"
                  : "bg-[#111827] border border-white/5 hover:border-[#FF6B1A]/20 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(255,107,26,0.1)]",
              ].join(" ")}
            >
              {brand.highlight && (
                <>
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(135deg, rgba(255,107,26,0.12) 0%, rgba(255,61,0,0.06) 50%, transparent 100%)" }}
                  />
                  <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-25"
                    style={{ background: "radial-gradient(circle at 80% 20%, rgba(255,107,26,0.35), transparent 60%)" }}
                  />
                  <div className="absolute -top-3 left-6 z-10">
                    <span className="badge text-xs">Najpopularniejsze</span>
                  </div>
                </>
              )}

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <h3 className={`font-display tracking-wider text-white group-hover:text-[#FF8C3A] transition-colors ${brand.highlight ? "text-3xl" : "text-2xl"}`}>
                    {brand.name.toUpperCase()}
                  </h3>
                  <span className="badge text-xs flex-shrink-0 ml-2 mt-1">{brand.popular}</span>
                </div>
                <p className="text-sm text-[#8A9BB0] leading-relaxed mb-4">
                  {brand.models}
                </p>
                <div className="flex items-center gap-1.5 text-sm font-medium text-[#FF6B1A] group-hover:gap-3 transition-all">
                  <span>Zobacz modele</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {!brand.highlight && (
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,107,26,0.06), transparent 60%)" }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
