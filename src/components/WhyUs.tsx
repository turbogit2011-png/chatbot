"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  ShieldCheck,
  Cpu,
  Gauge,
  Wind,
  PackageCheck,
  Truck,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

const reasons = [
  {
    icon: ShieldCheck,
    title: "Gwarancja, której nie boi się rynek",
    metric: "24 mc · 0 km limit",
    description:
      "24 miesiące bez asterysków, bez limitu kilometrów. W razie usterki odbieramy turbo na nasz koszt.",
  },
  {
    icon: Cpu,
    title: "Nowy rdzeń CHRA — nie regenerowany",
    metric: "100% nowy",
    description:
      "Fabrycznie nowe łożyska, wałek, koło sprężające, pierścienie. Tylko nowe CHRA gwarantuje tolerancje fabryczne.",
  },
  {
    icon: Gauge,
    title: "Wyważanie TurboTechnics VSR301",
    metric: "±0.05 g · 250 000 RPM",
    description:
      "Brytyjska maszyna z motorsportu. Każdy wałek pod realnym obciążeniem, nie statycznie.",
  },
  {
    icon: Wind,
    title: "Przepływ G3-Min-Flow",
    metric: "±2% tolerancji",
    description:
      "Każda turbina indywidualnie kalibrowana pod jej charakterystykę. Pełne ciśnienie na każdym obrocie.",
  },
  {
    icon: PackageCheck,
    title: "Komplet uszczelek gratis",
    metric: "0 zł",
    description:
      "Pełen zestaw montażowy w cenie każdej turbosprężarki. Zero ukrytych kosztów po zakupie.",
  },
  {
    icon: Truck,
    title: "Wysyłka 24h · cała Polska",
    metric: "DPD · InPost",
    description:
      "Turbo na stanie wysyłamy w 24h. Bezpieczne pakowanie, ubezpieczenie w obie strony.",
  },
];

export default function WhyUs() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="o-nas" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[var(--bg-primary)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 bg-grid opacity-40" />

      <div
        ref={ref}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6"
      >
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-12 lg:gap-16 items-start">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <span className="hud-label text-[var(--orange)] block mb-3">
              Dlaczego TURBO-GIT
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white leading-tight tracking-tight mb-5">
              {BRAND.experienceYears} lat. Jedna specjalizacja.{" "}
              <span className="text-gradient">Zero kompromisów.</span>
            </h2>
            <p className="text-[var(--text-muted)] text-base sm:text-lg leading-relaxed mb-6">
              Od 2010 roku skupiamy się wyłącznie na turbosprężarkach. Każda
              turbo, która opuszcza TURBO-GIT, przechodzi pełną procedurę: nowy
              rdzeń CHRA, wyważanie wysokoobrotowe VSR301, ustawienie przepływu
              G3-Min-Flow i kalibrację aktuatora.
            </p>
            <p className="text-[var(--text-muted)] leading-relaxed mb-8">
              Bez kompromisów. Bez „dorabiania na koniec dnia”. Bez tanich
              zamienników. Dlatego nasze turbosprężarki pracują bez problemów
              przez lata — i dlatego dajemy 24 miesiące gwarancji bez limitu.
            </p>

            <div className="flex flex-wrap gap-3">
              <div className="card-premium px-5 py-4 text-center">
                <div className="font-display text-3xl text-gradient">
                  {BRAND.experienceYears}+
                </div>
                <div className="hud-label mt-1">Lat na rynku</div>
              </div>
              <div className="card-premium px-5 py-4 text-center">
                <div className="font-display text-3xl text-white">100%</div>
                <div className="hud-label mt-1">Nowe CHRA</div>
              </div>
              <div className="card-premium px-5 py-4 text-center">
                <div className="font-display text-3xl text-[var(--green)]">
                  24 mc
                </div>
                <div className="hud-label mt-1">Gwarancja</div>
              </div>
            </div>
          </motion.div>

          {/* Right — reason grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {reasons.map((reason, i) => (
              <motion.article
                key={reason.title}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}
                className="card-premium p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-9 h-9 rounded-sm flex items-center justify-center bg-[var(--orange)]/12 border border-[var(--orange)]/25">
                    <reason.icon className="w-4 h-4 text-[var(--orange)]" />
                  </span>
                  <span className="font-mono-tech text-[11px] text-[var(--orange)]">
                    {reason.metric}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-sm mb-2 leading-snug">
                  {reason.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {reason.description}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
