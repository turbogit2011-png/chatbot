"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Cpu, ShieldCheck, RotateCcw, Clock3, MapPin, Headphones } from "lucide-react";

const features = [
  {
    icon: Cpu,
    title: "Balansowanie VSR 301",
    description:
      "Każda turbosprężarka przechodzi dynamiczne balansowanie na maszynie VSR 301 — standardzie przemysłu motoryzacyjnego.",
    stat: "VSR 301",
    statLabel: "standard balansowania",
    featured: true,
  },
  {
    icon: ShieldCheck,
    title: "Gwarancja 24 miesiące",
    description:
      "Pełna gwarancja 24 miesiące bez limitu kilometrów na każdą sprzedaną i zregenerowaną turbosprężarkę.",
  },
  {
    icon: RotateCcw,
    title: "Tylko części OEM",
    description:
      "Stosujemy wyłącznie oryginalne komponenty: Garrett, BorgWarner, IHI, Holset, KKK. Zero tanich zamienników.",
  },
  {
    icon: Clock3,
    title: "Wysyłka w 24h",
    description:
      "Zamów do 14:00 — wyślemy tego samego dnia. Ekspresowa dostawa kurierska w 24 godziny na terenie Polski.",
  },
  {
    icon: MapPin,
    title: "Kalibracja REA-Master",
    description:
      "Elektroniczne sterowniki turbosprężarki kalibrujemy na urządzeniu REA-Master — pełna weryfikacja parametrów.",
  },
  {
    icon: Headphones,
    title: "Program B2B",
    description:
      "Dla warsztatów i serwisów: stały rabat 10%, priorytetowa obsługa i dedykowany opiekun handlowy.",
    wide: true,
  },
];

export default function WhyUs() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="dlaczego-my" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0C1018]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 bg-grid opacity-40" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left */}
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
                14 LAT
                <br />
                <span className="text-gradient">TURBOSPRĘŻAREK</span>
                <br />
                W MAGAZYNIE
              </h2>
              <p className="text-[#8A9BB0] text-lg leading-relaxed mb-6">
                Od 2012 roku specjalizujemy się wyłącznie w regeneracji i sprzedaży
                turbosprężarek. Ponad 8&nbsp;000 modeli dostępnych od ręki, nowoczesny
                sprzęt diagnostyczny i certyfikowani technicy.
              </p>
              <p className="text-[#8A9BB0] leading-relaxed mb-8">
                Każde turbo przed wysyłką przechodzi pełną diagnostykę, balansowanie
                VSR&nbsp;301 i test szczelności. Gwarancja 24 miesiące — bez żadnych
                gwiazdek i wyjątków.
              </p>

              <div className="flex flex-wrap gap-4">
                {[
                  { value: "8000+", label: "Modeli w stock" },
                  { value: "24M",   label: "Gwarancja" },
                  { value: "4.9★",  label: "Ocena Google" },
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

          {/* Right – bento grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="grid grid-cols-2 gap-3"
          >
            {features.map((f, i) => {
              const isFirst = i === 0;
              const isLast  = i === 5;
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
                  {isFirst && (
                    <div className="absolute inset-0 pointer-events-none opacity-60"
                      style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(255,107,26,0.1), transparent 65%)" }}
                    />
                  )}

                  <div className={[
                    "rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300",
                    isFirst  ? "w-14 h-14 bg-gradient-to-br from-[#FF6B1A]/20 to-[#FF3D00]/10 group-hover:from-[#FF6B1A]/30 mb-3" : "",
                    isLast   ? "w-10 h-10 mt-0.5 bg-[#FF6B1A]/10 group-hover:bg-[#FF6B1A]/20" : "",
                    !isFirst && !isLast ? "w-10 h-10 bg-[#FF6B1A]/10 group-hover:bg-[#FF6B1A]/20 mb-3" : "",
                  ].join(" ")}>
                    <f.icon className={`text-[#FF6B1A] ${isFirst ? "w-7 h-7" : "w-5 h-5"}`} />
                  </div>

                  <div className={isLast ? "flex-1" : ""}>
                    <h3 className={`font-semibold text-white group-hover:text-[#FF8C3A] transition-colors mb-2 ${isFirst ? "text-lg" : "text-sm"}`}>
                      {f.title}
                    </h3>
                    <p className={`text-[#8A9BB0] leading-relaxed ${isFirst ? "text-sm flex-1" : "text-xs"}`}>
                      {f.description}
                    </p>
                  </div>

                  {isFirst && f.stat && (
                    <div className="mt-auto pt-5 border-t border-white/6">
                      <div className="font-display text-4xl text-gradient leading-none mb-1">{f.stat}</div>
                      <div className="text-xs text-[#8A9BB0]">{f.statLabel}</div>
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
