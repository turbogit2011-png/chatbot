"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marcin Kowalski",
    role: "Właściciel warsztatu",
    content:
      "Współpracuję z Turbo-Git od 3 lat. Turbosprężarki zawsze zgodne z opisem, gwarancja honorowana bez problemu. Polecam każdemu serwisowi.",
    rating: 5,
    vehicle: "B2B – 50+ turbo rocznie",
  },
  {
    name: "Anna Wiśniewska",
    role: "Kierowca prywatny",
    content:
      "VW Passat 2.0 TDI — zamówiłam turbo o 10:00, dostawa następnego dnia rano. Montaż bez problemów, auto jeździ jak nowe. Cena niższa o połowę od dealera.",
    rating: 5,
    vehicle: "VW Passat 2.0 TDI",
  },
  {
    name: "Tomasz Nowak",
    role: "Mechanik samochodowy",
    content:
      "BMW E90 320d — turbo z Turbo-Git działa od 14 miesięcy bez zarzutu. Dokumentacja, protokół VSR 301 i gwarancja 24M. To jest właśnie profesjonalizm.",
    rating: 5,
    vehicle: "BMW 320d E90",
  },
  {
    name: "Piotr Zając",
    role: "Fleet Manager",
    content:
      "Zarządzam flotą 30 aut. Dzięki programowi B2B mam stały rabat i dedykowanego opiekuna. Realizacja zamówień szybka, jakość bez zastrzeżeń.",
    rating: 5,
    vehicle: "Flota firmowa – 30 aut",
  },
  {
    name: "Katarzyna Dąbrowska",
    role: "Właścicielka Audi A4",
    content:
      "Audi A4 2.0 TDI — turbo dostarczone w 24h z kompletem dokumentów. Dwa lata gwarancji to coś, czego nie dostaniesz w zwykłym warsztacie. Super obsługa!",
    rating: 5,
    vehicle: "Audi A4 2.0 TDI",
  },
];

const brands = ["Garrett", "BorgWarner", "IHI", "Holset", "KKK", "MHI", "Continental"];

export default function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="opinie" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0C1018]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,107,26,0.05), transparent 60%)" }}
      />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="section-label mx-auto justify-center mb-4">
            <span>Opinie klientów</span>
          </div>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] text-white leading-none mb-4 tracking-wide">
            CO MÓWIĄ
            <br />
            <span className="text-gradient">NASI KLIENCI</span>
          </h2>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-[#FF6B1A] text-[#FF6B1A]" />
            ))}
            <span className="ml-2 text-sm text-[#8A9BB0]">4.9 / 5.0 · Google Maps</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-20">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.09 }}
              className={[
                "group relative rounded-2xl p-7 border transition-all duration-400 overflow-hidden",
                i === 0
                  ? "md:col-span-2 lg:col-span-1 glass-orange border-[#FF6B1A]/20 hover:border-[#FF6B1A]/40"
                  : "bg-[#111827] border-white/5 hover:border-[#FF6B1A]/20 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(255,107,26,0.08)]",
              ].join(" ")}
            >
              <Quote className="absolute top-5 right-6 w-12 h-12 text-[#FF6B1A]/10 group-hover:text-[#FF6B1A]/18 transition-colors" />

              <div className="flex items-center gap-0.5 mb-5">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-[#FF6B1A] text-[#FF6B1A]" />
                ))}
              </div>

              <p className="text-[#D0D8E4] text-sm leading-relaxed mb-6 relative z-10">
                &ldquo;{t.content}&rdquo;
              </p>

              <div className="flex items-center gap-3 mt-auto">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#FF3D00] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm truncate">{t.name}</div>
                  <div className="text-xs text-[#8A9BB0]">{t.role}</div>
                </div>
                <span className="badge text-xs whitespace-nowrap">{t.vehicle}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center"
        >
          <p className="text-xs text-[#4A5568] uppercase tracking-widest mb-8 font-medium">
            Marki, z którymi pracujemy
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
            {brands.map((brand) => (
              <span key={brand}
                className="font-display text-xl text-white/20 hover:text-white/55 transition-colors tracking-wider cursor-default"
              >{brand}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
