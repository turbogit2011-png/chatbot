"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Plus, Minus, Phone } from "lucide-react";
import { CONTACT } from "@/lib/brand";

const faqs = [
  {
    q: "Jak długo trwa regeneracja turbosprężarki?",
    a: "Standardowa regeneracja w TURBO-GIT trwa 5–7 dni roboczych. W trybie ekspresowym dla warsztatów B2B realizujemy w 48 godzin. Każda turbo przechodzi pełny proces: nowy CHRA, wyważanie VSR301, ustawienie przepływu G3-Min-Flow i kalibrację geometrii.",
  },
  {
    q: "Co obejmuje 24-miesięczna gwarancja TURBO-GIT?",
    a: "24 miesiące gwarancji bez limitu kilometrów na całą turbosprężarkę — bez ograniczeń przebiegu i bez asterysków. W razie usterki odbieramy turbo na nasz koszt, naprawiamy priorytetowo lub wymieniamy. Gwarancja obejmuje wszystkie podzespoły: rdzeń CHRA, geometrię, aktuator.",
  },
  {
    q: "Czym różni się nowy CHRA od regenerowanego?",
    a: "Regenerowany CHRA to używany rdzeń z wymienionymi częściami. Nowy CHRA to kompletnie nowy zespół — fabrycznie nowe łożyska, wałek, koło sprężające i pierścienie tłokowe. W TURBO-GIT stosujemy wyłącznie nowe CHRA, bo tylko one zapewniają fabryczne tolerancje i pełne 24 miesiące pracy.",
  },
  {
    q: "Co to jest wyważanie VSR301 i dlaczego ma znaczenie?",
    a: "TurboTechnics VSR301 to brytyjska maszyna do wyważania wysokoobrotowego, używana w motorsporcie. Wyważamy każdy wałek z rdzeniem CHRA pod realnym obciążeniem do 250 000 RPM z tolerancją ±0,05 g. Bez VSR301 turbo wibruje, hałasuje i niszczy łożyska.",
  },
  {
    q: "Co to jest G3-Min-Flow i dlaczego ustawiacie przepływ?",
    a: "G3-Min-Flow to stanowisko firmy G3 Concept do pomiaru i kalibracji przepływu turbiny. Każda turbo jest ustawiana indywidualnie pod jej charakterystykę przepływu — nie „na oko”. Dzięki temu masz pełne ciśnienie doładowania na każdym obrocie i prawidłową pracę zaworu wastegate.",
  },
  {
    q: "Czy regenerujecie turbo z elektronicznym aktuatorem?",
    a: "Tak. Posiadamy stanowisko G3-REA-MASTER do kalibracji aktuatorów elektronicznych Hella, Siemens, Mitsubishi (SREA) oraz pneumatycznych. Wykonujemy pełną procedurę kalibracji, nie tylko ustawianie multimetrem.",
  },
  {
    q: "Czy muszę wysłać swoją turbinę, czy mogę kupić gotową?",
    a: "Obie opcje. W naszym sklepie znajdziesz turbosprężarki na wymianę (system core charge) — kupujesz gotową turbinę, odsyłasz swoją starą i otrzymujesz zwrot kaucji. Możesz też wysłać swoją do regeneracji i dostać tę samą zregenerowaną z powrotem.",
  },
  {
    q: "Ile kosztuje wysyłka i jak szybko otrzymam turbo?",
    a: "Wysyłka kurierem DPD/InPost w cenie zamówienia. Turbosprężarki na stanie wysyłamy w 24 godziny od zaksięgowania płatności. Obsługujemy klientów w całej Polsce. Do zestawu zawsze dokładamy komplet uszczelek montażowych — gratis.",
  },
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FAQ() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[var(--bg-secondary)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-start">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <span className="hud-label text-[var(--orange)] block mb-3">
              FAQ · pytania techniczne
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white leading-tight tracking-tight mb-5">
              Najczęstsze pytania o{" "}
              <span className="text-gradient">regenerację turbo</span>.
            </h2>
            <p className="text-[var(--text-muted)] text-base leading-relaxed mb-7">
              Masz inne pytanie? Zadzwoń — odpowiadamy konkretnie, bez ściemy.
              W godzinach pracy oddzwaniamy w 30 minut.
            </p>
            <a
              href={CONTACT.phoneTel}
              className="btn-primary scanline inline-flex items-center gap-2 text-sm"
            >
              <Phone className="w-4 h-4" />
              Zadzwoń · {CONTACT.phoneDisplay}
            </a>
          </motion.div>

          {/* Accordion */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col gap-2.5"
          >
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.25 + i * 0.05 }}
                className={`rounded-sm border transition-all duration-300 overflow-hidden ${
                  open === i
                    ? "border-[var(--orange)]/40 bg-[var(--bg-card)]"
                    : "border-white/5 bg-[var(--bg-card)] hover:border-white/15"
                }`}
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left"
                  aria-expanded={open === i}
                >
                  <span
                    className={`font-medium text-sm sm:text-base leading-snug transition-colors ${
                      open === i ? "text-white" : "text-[var(--text)]"
                    }`}
                  >
                    {faq.q}
                  </span>
                  <span
                    className={`w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0 transition-all ${
                      open === i
                        ? "bg-[var(--orange)] text-white"
                        : "bg-white/5 text-[var(--text-muted)]"
                    }`}
                  >
                    {open === i ? (
                      <Minus className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-5 sm:px-6 pb-5 text-sm text-[var(--text-muted)] leading-relaxed border-t border-white/5 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </section>
  );
}
