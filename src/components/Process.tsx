"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Phone,
  Search,
  Sparkles,
  CircuitBoard,
  Wrench,
  Gauge,
  Wind,
  ClipboardCheck,
  CheckCircle,
} from "lucide-react";
import { CONTACT } from "@/lib/brand";

const steps = [
  {
    icon: Search,
    number: "01",
    title: "Przyjęcie i diagnostyka",
    description:
      "Przyjmujemy turbinę, dokumentujemy stan wstępny, identyfikujemy przyczynę awarii i przygotowujemy plan regeneracji.",
    detail: "Raport diagnostyczny",
  },
  {
    icon: Sparkles,
    number: "02",
    title: "Demontaż i ultradźwięki",
    description:
      "Pełny demontaż obudów. Czyszczenie ultradźwiękami i piaskowanie kompresorem szklanym — zero pozostałości.",
    detail: "Czystość laboratoryjna",
  },
  {
    icon: CircuitBoard,
    number: "03",
    title: "Wymiana rdzenia CHRA",
    description:
      "Montujemy fabrycznie nowy zespół CHRA. Łożyska, wałek, koło sprężające, pierścienie — wszystko nowe, nie regenerowane.",
    detail: "100% nowy CHRA",
  },
  {
    icon: Wrench,
    number: "04",
    title: "Montaż precyzyjny",
    description:
      "Składamy turbosprężarkę z momentami kontrolowanymi i nowymi uszczelkami. Każde połączenie według procedury producenta.",
    detail: "Tolerancje fabryczne",
  },
  {
    icon: Gauge,
    number: "05",
    title: "Wyważanie VSR301",
    description:
      "Wałek wyważany wysokoobrotowo na TurboTechnics VSR301 do 250 000 RPM z tolerancją ±0,05 g. Raport cyfrowy.",
    detail: "±0.05 g · 250k RPM",
  },
  {
    icon: Wind,
    number: "06",
    title: "Przepływ G3-Min-Flow",
    description:
      "Indywidualna kalibracja przepływu na stanowisku G3-Min-Flow. Pełne ciśnienie doładowania na każdym obrocie.",
    detail: "±2% tolerancji",
  },
  {
    icon: ClipboardCheck,
    number: "07",
    title: "Kalibracja geometrii + raport",
    description:
      "Kalibracja aktuatora i zmiennej geometrii na G3-REA-MASTER. Pełen raport pomiarowy + gwarancja 24 mc do paczki.",
    detail: "24 mc gwarancji",
  },
];

export default function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="proces" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[var(--bg-primary)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255,90,31,0.06), transparent 70%)",
        }}
      />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mb-14"
        >
          <span className="hud-label text-[var(--orange)] block mb-3">
            Proces regeneracji · 7 kroków
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white leading-tight tracking-tight mb-4">
            Siedem kroków. <span className="text-gradient">Zero skrótów.</span>
          </h2>
          <p className="text-[var(--text-muted)] text-base sm:text-lg">
            Każda turbo, którą do nas wysyłasz, przechodzi tę samą procedurę —
            od diagnostyki po raport pomiarowy z numerami wyważenia i
            przepływu. Raport otrzymujesz razem z turbiną.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, i) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
              className="card-premium p-5 relative"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="w-10 h-10 rounded-sm flex items-center justify-center bg-[var(--orange)]/12 border border-[var(--orange)]/25">
                  <step.icon className="w-4 h-4 text-[var(--orange)]" />
                </span>
                <span className="font-mono-tech text-xs text-[var(--steel-light)]">
                  {step.number}
                </span>
              </div>
              <h3 className="font-semibold text-white text-sm mb-2 leading-snug">
                {step.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                {step.description}
              </p>
              <div className="pt-3 border-t border-white/5 flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-[var(--green)] flex-shrink-0" />
                <span className="font-mono-tech text-[11px] text-[var(--green)]">
                  {step.detail}
                </span>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-12 card-premium p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5"
        >
          <div>
            <h3 className="font-display text-xl sm:text-2xl text-white tracking-tight mb-1">
              Wyślij turbo do regeneracji — albo zamów gotową.
            </h3>
            <p className="text-[var(--text-muted)] text-sm">
              Oddzwaniamy w 30 minut w godzinach pracy. {CONTACT.hours.full}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <a
              href={CONTACT.phoneTel}
              className="btn-primary scanline inline-flex items-center gap-2 text-sm"
            >
              <Phone className="w-4 h-4" />
              {CONTACT.phoneDisplay}
            </a>
            <a
              href="#kontakt"
              onClick={(e) => {
                e.preventDefault();
                document
                  .querySelector("#kontakt")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="btn-secondary text-sm"
            >
              Formularz kontaktu
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
