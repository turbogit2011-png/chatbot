"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, Phone, ArrowRight, Users } from "lucide-react";

const plans = [
  {
    name: "Osoba prywatna",
    icon: "🚗",
    price: "od 699 zł",
    desc: "Samochody osobowe",
    features: [
      "Gwarancja 24 miesiące",
      "Balansowanie VSR 301",
      "Tylko części OEM",
      "Wysyłka w 24h",
      "Protokół diagnostyczny",
    ],
    cta: "Sprawdź dostępność",
    secondary: false,
  },
  {
    name: "Dostawcze / SUV",
    icon: "🚐",
    price: "od 999 zł",
    desc: "Pojazdy dostawcze i większe SUV-y",
    features: [
      "Gwarancja 24 miesiące",
      "Balansowanie VSR 301",
      "Tylko części OEM",
      "Wysyłka w 24h",
      "Kalibracja REA-Master",
    ],
    cta: "Sprawdź dostępność",
    secondary: false,
    highlight: true,
  },
  {
    name: "Program B2B",
    icon: "🏭",
    price: "Rabat 10%",
    desc: "Dla warsztatów i serwisów",
    features: [
      "Stały rabat 10%",
      "Priorytetowa obsługa",
      "Dedykowany opiekun",
      "Faktura VAT",
      "Warunki floty",
    ],
    cta: "Zapytaj o B2B",
    secondary: true,
  },
];

export default function CallToAction() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="cennik" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#07090E]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,107,26,0.05), transparent 60%)" }}
      />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="section-label mx-auto justify-center mb-4">
            <span>Cennik</span>
          </div>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] text-white leading-none mb-4 tracking-wide">
            PRZEJRZYSTE
            <br />
            <span className="text-gradient">CENY</span>
          </h2>
          <p className="text-[#8A9BB0] text-lg max-w-xl mx-auto">
            Brak ukrytych kosztów. Cena obejmuje regenerację, balansowanie VSR&nbsp;301
            i gwarancję 24 miesięcy.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
              className={[
                "relative rounded-2xl p-8 flex flex-col overflow-hidden",
                plan.highlight
                  ? "border border-[#FF6B1A]/35 bg-[#111827]"
                  : "border border-white/5 bg-[#111827]",
              ].join(" ")}
            >
              {plan.highlight && (
                <>
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(135deg, rgba(255,107,26,0.10) 0%, transparent 60%)" }}
                  />
                  <div className="absolute -top-3 left-6">
                    <span className="badge text-xs">Najpopularniejszy</span>
                  </div>
                </>
              )}

              <div className="relative z-10 flex flex-col h-full">
                <div className="text-3xl mb-3">{plan.icon}</div>
                <div className="text-xs text-[#8A9BB0] uppercase tracking-widest font-medium mb-1">
                  {plan.name}
                </div>
                <div className="font-display text-4xl text-gradient leading-none mb-1">
                  {plan.price}
                </div>
                <div className="text-sm text-[#4A5568] mb-6">{plan.desc}</div>

                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-[#8A9BB0]">
                      <Check className="w-4 h-4 text-[#FF6B1A] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.secondary ? (
                  <a href="#kontakt"
                    onClick={(e) => { e.preventDefault(); document.querySelector("#kontakt")?.scrollIntoView({ behavior: "smooth" }); }}
                    className="btn-secondary flex items-center justify-center gap-2 text-sm"
                  >
                    <Users className="w-4 h-4" />
                    {plan.cta}
                  </a>
                ) : (
                  <a href="tel:+48694706140"
                    className="btn-primary flex items-center justify-center gap-2 text-sm group"
                  >
                    <Phone className="w-4 h-4" />
                    {plan.cta}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center text-sm text-[#4A5568] mt-8"
        >
          Ciężarowe i TIR wyceniamy indywidualnie — zadzwoń na{" "}
          <a href="tel:+48694706140" className="text-[#FF6B1A] hover:underline">+48 694 706 140</a>.
        </motion.p>
      </div>
    </section>
  );
}
