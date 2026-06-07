"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "Ile kosztuje regenerowana turbosprężarka?",
    a: "Ceny zaczynają się od 699 zł dla samochodów osobowych. Pojazdy dostawcze i ciężarowe wyceniamy indywidualnie. Cena obejmuje regenerację, balansowanie VSR 301, kalibrację oraz gwarancję 24 miesięcy.",
  },
  {
    q: "Jak długo trwa dostawa?",
    a: "Zamówienia złożone do godziny 14:00 wysyłamy tego samego dnia. Standardowy czas dostawy to 24 godziny na terenie całej Polski. Dla zamówień ekspresowych oferujemy dostawę kurierską overnight.",
  },
  {
    q: "Czy mogę odesłać stare turbo w zamian?",
    a: "Tak, przyjmujemy uszkodzone turbosprężarki w ramach wymiany. Po uzgodnieniu szczegółów telefonicznie możesz odesłać stare turbo kurierem — zorganizujemy odbiór na nasz koszt.",
  },
  {
    q: "Jaka jest gwarancja na turbosprężarkę?",
    a: "Udzielamy pełnej gwarancji 24 miesiące bez limitu kilometrów na każdą turbosprężarkę. W przypadku reklamacji odbieramy turbo na własny koszt i naprawiamy lub wymieniamy priorytetowo.",
  },
  {
    q: "Czy używacie oryginalnych części?",
    a: "Tak — stosujemy wyłącznie nowe, oryginalne komponenty od Garrett, BorgWarner, IHI, Holset i KKK. Nie używamy tanich zamienników. Każde turbo jest dostarczone z protokołem wymienionych części.",
  },
  {
    q: "Czy obsługujecie pojazdy ciężarowe i TIR?",
    a: "Tak, obsługujemy pojazdy ciężarowe, TIR, maszyny rolnicze i budowlane. Ceny dla ciężarówek wyceniamy indywidualnie — zadzwoń na +48 694 706 140.",
  },
];

export default function FAQ() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#07090E]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="section-label mb-4">
              <span>FAQ</span>
            </div>
            <h2 className="font-display text-[clamp(2.5rem,4vw,4rem)] text-white leading-none mb-6 tracking-wide">
              CZĘSTO
              <br />
              ZADAWANE
              <br />
              <span className="text-gradient">PYTANIA</span>
            </h2>
            <p className="text-[#8A9BB0] text-lg leading-relaxed mb-8">
              Masz pytanie o konkretny model? Nasz zespół odpowie
              błyskawicznie — zadzwoń lub napisz.
            </p>
            <a href="tel:+48694706140" className="btn-primary inline-flex items-center gap-2 text-sm">
              +48 694 706 140
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-3"
          >
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.07 }}
                className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  open === i
                    ? "border-[#FF6B1A]/30 bg-[#111827]"
                    : "border-white/5 bg-[#111827] hover:border-white/10"
                }`}
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className={`font-medium text-sm sm:text-base transition-colors ${open === i ? "text-white" : "text-[#8A9BB0]"}`}>
                    {faq.q}
                  </span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    open === i ? "bg-[#FF6B1A] text-white" : "bg-white/5 text-[#8A9BB0]"
                  }`}>
                    {open === i ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-5 text-sm text-[#8A9BB0] leading-relaxed border-t border-white/5 pt-4">
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
    </section>
  );
}
