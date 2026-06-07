"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Cpu, ShieldCheck, RotateCcw, Clock3, MapPin, Headphones
} from "lucide-react";

const reasons = [
  {
    icon: Cpu,
    title: "Technologia CNC",
    description:
      "Precyzyjna regeneracja na maszynach CNC. Dynamiczne balansowanie wirnika z dokładnością do 0,001 g/cm².",
    stat: "0.001g",
    statLabel: "dokładność balansowania",
    featured: true,
  },
  {
    icon: ShieldCheck,
    title: "Gwarancja 12 miesięcy",
    description:
      "Każda zregenerowana turbosprężarka objęta jest pełną gwarancją na 12 miesięcy lub 30 000 km.",
  },
  {
    icon: RotateCcw,
    title: "Oryginalne części",
    description:
      "Stosujemy wyłącznie nowe, oryginalne komponenty: Garrett, BorgWarner, IHI, Holset.",
  },
  {
    icon: Clock3,
    title: "Realizacja 24–48h",
    description:
      "Ekspresowa realizacja napraw. W pilnych przypadkach możliwa naprawa jeszcze tego samego dnia.",
  },
  {
    icon: MapPin,
    title: "Odbiór kurierski",
    description:
      "Obsługujemy klientów z całej Polski. Bezpieczna wysyłka kurierska z ubezpieczeniem w obie strony.",
  },
  {
    icon: Headphones,
    title: "Wsparcie techniczne",
    description:
      "Nasi eksperci są dostępni telefonicznie i online. Doradzamy w wyborze rozwiązania i wyjaśniamy każdy etap naprawy.",
    wide: true,
  },
];

export default function WhyUs() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="o-nas" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0C1018]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 bg-grid opacity-40" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* ── Left: text intro ── */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <div className="section-label mb-4">
                <span>Dlaczego my</span>
              </div>
              <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] text-white leading-none mb-6 tracking-wide">
                PONAD 10 LAT
                <br />
                <span className="text-gradient">DOŚWIADCZENIA</span>
                <br />
                W TURBO
              </h2>
              <p className="text-[#8A9BB0] text-lg leading-relaxed mb-6">
                Od 2014 roku specjalizujemy się wyłącznie w układach turbosprężarkowych
                i diesel. Setki naprawionych turbosprężarek miesięcznie, nowoczesny
                park maszynowy i zespół certyfikowanych techników.
              </p>
              <p className="text-[#8A9BB0] leading-relaxed mb-8">
                Nie kompromitujemy się tanimi zamiennikami — używamy wyłącznie
                nowych, oryginalnych komponentów. Dlatego nasze turbosprężarki
                działają jak nowe przez lata.
              </p>

              <div className="flex flex-wrap gap-4">
                {[
                  { value: "100%", label: "Oryginalne części" },
                  { value: "24h",  label: "Ekspresowa naprawa" },
                  { value: "12M",  label: "Gwarancja" },
                ].map(({ value, label }, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                    className="glass-orange rounded-xl px-6 py-4 text-center"
                  >
                    <div className="font-display text-3xl text-gradient">{value}</div>
                    <div className="text-xs text-[#8A9BB0] mt-1">{label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Right: bento grid ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="grid grid-cols-2 gap-3"
            style={{ gridTemplateRows: "auto auto auto auto" }}
          >
            {reasons.map((reason, i) => {
              const isFirst = i === 0;   // CNC – row-span-2
              const isLast  = i === 5;   // Wsparcie – col-span-2

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 18 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.25 + i * 0.07 }}
                  className={[
                    "group relative rounded-2xl border transition-all duration-300 overflow-hidden",
                    isFirst
                      ? "row-span-2 bg-[#111827] border-[#FF6B1A]/20 hover:border-[#FF6B1A]/40 p-6 flex flex-col"
                      : isLast
                      ? "col-span-2 bg-[#111827] border-white/5 hover:border-[#FF6B1A]/20 p-5 flex items-start gap-4"
                      : "bg-[#111827] border-white/5 hover:border-[#FF6B1A]/20 p-5 hover:-translate-y-1",
                  ].join(" ")}
                >
                  {/* Featured card glow background */}
                  {isFirst && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-60"
                      style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(255,107,26,0.1), transparent 65%)" }}
                    />
                  )}

                  {/* Icon */}
                  <div className={[
                    "rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 mb-3",
                    isFirst  ? "w-14 h-14 bg-gradient-to-br from-[#FF6B1A]/20 to-[#FF3D00]/10 group-hover:from-[#FF6B1A]/30" : "",
                    isLast   ? "w-10 h-10 mt-0.5 bg-[#FF6B1A]/10 group-hover:bg-[#FF6B1A]/20" : "",
                    !isFirst && !isLast ? "w-10 h-10 bg-[#FF6B1A]/10 group-hover:bg-[#FF6B1A]/20" : "",
                  ].join(" ")}>
                    <reason.icon className={`text-[#FF6B1A] ${isFirst ? "w-7 h-7" : "w-5 h-5"}`} />
                  </div>

                  {/* Content */}
                  <div className={isLast ? "flex-1" : ""}>
                    <h3 className={`font-semibold text-white group-hover:text-[#FF8C3A] transition-colors mb-2 ${isFirst ? "text-lg" : "text-sm"}`}>
                      {reason.title}
                    </h3>
                    <p className={`text-[#8A9BB0] leading-relaxed ${isFirst ? "text-sm flex-1" : "text-xs"}`}>
                      {reason.description}
                    </p>
                  </div>

                  {/* Featured card – extra stat at bottom */}
                  {isFirst && reason.stat && (
                    <div className="mt-auto pt-5 border-t border-white/6">
                      <div className="font-display text-4xl text-gradient leading-none mb-1">
                        {reason.stat}
                      </div>
                      <div className="text-xs text-[#8A9BB0]">{reason.statLabel}</div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
