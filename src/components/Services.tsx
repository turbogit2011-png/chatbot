"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Wrench, Gauge, Filter, Zap, Settings, TrendingUp, ArrowRight
} from "lucide-react";

const services = [
  {
    icon: Zap,
    title: "Regeneracja Turbosprężarek",
    description:
      "Kompletna regeneracja turbosprężarek wszystkich marek i modeli. Demontaż, diagnostyka CNC, wymiana zużytych elementów i precyzyjna kalibracja.",
    features: ["Wszystkie marki i modele", "Balansowanie CNC", "Testy ciśnienia"],
    highlight: true,
  },
  {
    icon: Gauge,
    title: "Diagnostyka i Naprawa",
    description:
      "Profesjonalna diagnostyka komputerowa i mechaniczna. Identyfikacja usterek, analiza przyczyn awarii i kompleksowa naprawa.",
    features: ["Diagnostyka komputerowa", "Analiza zużycia", "Protokół badania"],
    highlight: false,
  },
  {
    icon: Wrench,
    title: "Regeneracja Wtryskiwaczy",
    description:
      "Naprawa i regeneracja wtryskiwaczy Common Rail i jednostkowych. Przywracamy pełną sprawność układu wtryskowego.",
    features: ["Common Rail CR", "Wtryskiwacze piezo", "Kalibracja dawki"],
    highlight: false,
  },
  {
    icon: Filter,
    title: "Regeneracja DPF/FAP",
    description:
      "Profesjonalna regeneracja i czyszczenie filtrów cząstek stałych. Przywracamy przepustowość bez wymiany filtra.",
    features: ["Czyszczenie ultradźwiękami", "Test przepływu", "Regeneracja aktywna"],
    highlight: false,
  },
  {
    icon: Settings,
    title: "Serwis Pomp Wtryskowych",
    description:
      "Naprawa i regeneracja pomp wtryskowych wysokiego ciśnienia. Pełna diagnostyka i kalibracja na stanowisku testowym.",
    features: ["Pompy CP1/CP2/CP3", "Kalibracja Bosch", "Wymiana elementów"],
    highlight: false,
  },
  {
    icon: TrendingUp,
    title: "Chip Tuning",
    description:
      "Optymalizacja oprogramowania sterownika silnika. Poprawa mocy, momentu obrotowego i zużycia paliwa.",
    features: ["Remap ECU", "Stage 1/2", "Egr/DPF Off"],
    highlight: false,
  },
];

export default function Services() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="uslugi" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#07090E]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-0 dot-pattern opacity-30" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="section-label mx-auto justify-center mb-4">
            <span>Co oferujemy</span>
          </div>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] text-white leading-none mb-4 tracking-wide">
            KOMPLEKSOWY SERWIS
            <br />
            <span className="text-gradient">DIESEL</span>
          </h2>
          <p className="text-[#8A9BB0] text-lg max-w-xl mx-auto leading-relaxed">
            Specjalizujemy się w diagnostyce i naprawie układów diesla.
            Nowoczesny sprzęt i wieloletnie doświadczenie gwarantują najwyższą jakość.
          </p>
        </motion.div>

        {/* Services grid – featured card spans 2 cols on lg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              className={[
                "group relative rounded-2xl p-7 cursor-pointer overflow-hidden transition-all duration-500",
                service.highlight
                  ? "sm:col-span-2 lg:col-span-2 border border-[#FF6B1A]/30 hover:border-[#FF6B1A]/55"
                  : "border border-white/5 hover:border-[#FF6B1A]/20 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(255,107,26,0.1)]",
              ].join(" ")}
              style={service.highlight ? { background: "#111827" } : { background: "#111827" }}
            >
              {/* Featured card – large gradient background */}
              {service.highlight && (
                <>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,107,26,0.12) 0%, rgba(255,61,0,0.06) 50%, transparent 100%)",
                    }}
                  />
                  <div
                    className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-30"
                    style={{ background: "radial-gradient(circle at 80% 20%, rgba(255,107,26,0.3), transparent 60%)" }}
                  />
                </>
              )}

              {service.highlight && (
                <div className="absolute -top-3 left-6 z-10">
                  <span className="badge text-xs">⭐ Bestseller</span>
                </div>
              )}

              <div className="relative z-10 flex flex-col h-full">
                {/* Icon */}
                <div className={[
                  "rounded-xl flex items-center justify-center mb-5 flex-shrink-0 transition-all duration-300",
                  service.highlight
                    ? "w-14 h-14 bg-gradient-to-br from-[#FF6B1A] to-[#FF3D00] shadow-[0_0_28px_rgba(255,107,26,0.5)] group-hover:shadow-[0_0_40px_rgba(255,107,26,0.7)]"
                    : "w-12 h-12 bg-white/5 group-hover:bg-[#FF6B1A]/12",
                ].join(" ")}>
                  <service.icon className={`${service.highlight ? "w-7 h-7 text-white" : "w-6 h-6 text-[#FF6B1A]"}`} />
                </div>

                <div className={service.highlight ? "lg:grid lg:grid-cols-2 lg:gap-8" : ""}>
                  <div>
                    <h3 className={`font-semibold text-white group-hover:text-[#FF8C3A] transition-colors mb-2 ${service.highlight ? "text-xl" : "text-lg"}`}>
                      {service.title}
                    </h3>
                    <p className="text-sm text-[#8A9BB0] leading-relaxed mb-5">
                      {service.description}
                    </p>
                  </div>

                  <div>
                    <ul className="flex flex-col gap-2 mb-5">
                      {service.features.map((feat, j) => (
                        <li key={j} className="flex items-center gap-2 text-xs text-[#8A9BB0]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A] flex-shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center gap-1.5 text-sm font-medium text-[#FF6B1A] group-hover:gap-3 transition-all">
                      <span>Dowiedz się więcej</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hover glow (non-featured) */}
              {!service.highlight && (
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
