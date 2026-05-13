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
  },
  {
    icon: ShieldCheck,
    title: "Gwarancja 12 miesięcy",
    description:
      "Każda zregenerowana turbosprężarka objęta jest pełną gwarancją na 12 miesięcy lub 30 000 km bez limitu.",
  },
  {
    icon: RotateCcw,
    title: "Oryginalne części",
    description:
      "Stosujemy wyłącznie nowe, oryginalne komponenty od czołowych producentów: Garrett, BorgWarner, IHI, Holset.",
  },
  {
    icon: Clock3,
    title: "Realizacja 24–48h",
    description:
      "Ekspresowa realizacja napraw. Standardowo 24 godziny, a w pilnych przypadkach jeszcze tego samego dnia.",
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
  },
];

export default function WhyUs() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="o-nas" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0C1018]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 bg-grid opacity-50" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
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
                <div className="glass-orange rounded-xl px-6 py-4 text-center">
                  <div className="font-display text-3xl text-gradient">100%</div>
                  <div className="text-xs text-[#8A9BB0] mt-1">Oryginalne części</div>
                </div>
                <div className="glass-orange rounded-xl px-6 py-4 text-center">
                  <div className="font-display text-3xl text-gradient">24h</div>
                  <div className="text-xs text-[#8A9BB0] mt-1">Ekspresowa naprawa</div>
                </div>
                <div className="glass-orange rounded-xl px-6 py-4 text-center">
                  <div className="font-display text-3xl text-gradient">12M</div>
                  <div className="text-xs text-[#8A9BB0] mt-1">Gwarancja</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: grid of reasons */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {reasons.map((reason, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                className="group bg-[#111827] rounded-xl p-5 border border-white/5 hover:border-[#FF6B1A]/20 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-lg bg-[#FF6B1A]/10 flex items-center justify-center mb-3 group-hover:bg-[#FF6B1A]/20 transition-colors">
                  <reason.icon className="w-5 h-5 text-[#FF6B1A]" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-2">{reason.title}</h3>
                <p className="text-xs text-[#8A9BB0] leading-relaxed">{reason.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
