"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Phone, Search, Wrench, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Phone,
    number: "01",
    title: "Kontakt i wycena",
    description:
      "Skontaktuj się z nami telefonicznie lub przez formularz. Opisz problem — przygotujemy bezpłatną, wstępną wycenę jeszcze tego samego dnia.",
    detail: "Bezpłatna konsultacja",
  },
  {
    icon: Search,
    number: "02",
    title: "Przyjęcie i diagnostyka",
    description:
      "Po przyjęciu turbosprężarki przeprowadzamy kompleksową diagnostykę. Dokładnie analizujemy każdy element i identyfikujemy przyczyny awarii.",
    detail: "Protokół diagnostyki",
  },
  {
    icon: Wrench,
    number: "03",
    title: "Regeneracja i naprawa",
    description:
      "Wymieniamy zużyte elementy na nowe, oryginalne części. Precyzyjna regeneracja na maszynach CNC i dynamiczne balansowanie wirnika.",
    detail: "Nowe części OEM",
  },
  {
    icon: CheckCircle,
    number: "04",
    title: "Testy i odbiór",
    description:
      "Każda zregenerowana turbosprężarka przechodzi rygorystyczne testy ciśnienia i szczelności. Wydajemy protokół badań i 12-miesięczną gwarancję.",
    detail: "Gwarancja 12 mies.",
  },
];

export default function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="proces" className="py-24 sm:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0C1018]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255,107,26,0.05), transparent 70%)" }}
      />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="section-label mx-auto justify-center mb-4">
            <span>Jak działamy</span>
          </div>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] text-white leading-none mb-4 tracking-wide">
            PROSTY PROCES,
            <br />
            <span className="text-gradient">PEWNY REZULTAT</span>
          </h2>
          <p className="text-[#8A9BB0] text-lg max-w-xl mx-auto">
            Przejrzysty 4-etapowy proces realizacji naprawy.
            Zawsze wiesz co i kiedy robimy z Twoją turbosprężarką.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line – desktop */}
          <div className="hidden lg:block absolute top-[52px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px">
            <div className="h-full bg-gradient-to-r from-transparent via-[#FF6B1A]/30 to-transparent" />
            <motion.div
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
              className="absolute inset-0 origin-left bg-gradient-to-r from-[#FF6B1A]/60 to-[#FF3D00]/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.12 }}
                className="flex flex-col items-center text-center group"
              >
                {/* Icon circle */}
                <div className="relative mb-6">
                  <div className="w-[104px] h-[104px] rounded-full bg-[#111827] border border-white/8 flex items-center justify-center relative z-10 group-hover:border-[#FF6B1A]/30 transition-all duration-500">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6B1A]/15 to-[#FF3D00]/10 flex items-center justify-center group-hover:from-[#FF6B1A]/25 group-hover:to-[#FF3D00]/20 transition-all duration-500">
                      <step.icon className="w-7 h-7 text-[#FF6B1A]" />
                    </div>
                  </div>
                  {/* Number badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#FF3D00] flex items-center justify-center text-xs font-bold text-white shadow-[0_0_12px_rgba(255,107,26,0.5)]">
                    {i + 1}
                  </div>
                </div>

                <div className="font-display text-5xl text-white/5 leading-none mb-2 -mt-2 select-none">
                  {step.number}
                </div>

                <h3 className="font-semibold text-white text-lg mb-3 group-hover:text-[#FF8C3A] transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-[#8A9BB0] leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Detail badge */}
                <span className="badge text-xs">
                  <CheckCircle className="w-3 h-3" />
                  {step.detail}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 glass-orange rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div>
            <h3 className="font-display text-2xl text-white tracking-wide mb-1">
              GOTOWY DO DZIAŁANIA?
            </h3>
            <p className="text-[#8A9BB0] text-sm">
              Zadzwoń lub napisz — oddzwonimy w ciągu 30 minut w godzinach pracy.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <a href="tel:+48000000000" className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
              <Phone className="w-4 h-4" />
              Zadzwoń teraz
            </a>
            <a
              href="#kontakt"
              onClick={(e) => { e.preventDefault(); document.querySelector("#kontakt")?.scrollIntoView({ behavior: "smooth" }); }}
              className="btn-secondary text-sm whitespace-nowrap"
            >
              Formularz kontaktowy
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
