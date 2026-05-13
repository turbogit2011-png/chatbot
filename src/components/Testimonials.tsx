"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marek Kowalski",
    role: "Kierowca TIR",
    content:
      "Turbosprężarka w moim Volvo FH zaczęła dymić. Wysłałem kurierem, po 2 dniach wróciła jak nowa. Auto jeździ świetnie już od 8 miesięcy. Polecam każdemu!",
    rating: 5,
    vehicle: "Volvo FH 460",
  },
  {
    name: "Anna Wiśniewska",
    role: "Właścicielka warsztatu",
    content:
      "Współpracuję z TurboDiesel od 4 lat. Wszystkie turbosprężarki wychodzą perfekcyjnie. Czas realizacji, jakość i cena – wszystko na najwyższym poziomie.",
    rating: 5,
    vehicle: "Warsztat samochodowy",
  },
  {
    name: "Tomasz Nowak",
    role: "Kierowca prywatny",
    content:
      "VW Passat 2.0 TDI – turbo się posypało. Dzięki TurboDiesel uniknąłem zakupu nowej turbosprężarki za 3500 zł. Regeneracja kosztowała dużo mniej i działa doskonale.",
    rating: 5,
    vehicle: "VW Passat 2.0 TDI",
  },
  {
    name: "Piotr Zając",
    role: "Fleet Manager",
    content:
      "Zarządzam flotą 20 aut firmowych. TurboDiesel to nasz stały partner serwisowy. Szybkość realizacji i profesjonalizm na najwyższym poziomie – zdecydowanie godne polecenia.",
    rating: 5,
    vehicle: "Flota firmowa 20 aut",
  },
  {
    name: "Katarzyna Dąbrowska",
    role: "Taksówkarka",
    content:
      "Toyota Avensis 2.2 D-4D. Turbo zaczęło świszczeć i traciłam moc. Po regeneracji w TurboDiesel auto jest jak nowe. Gwarancja i profesjonalizm – polecam!",
    rating: 5,
    vehicle: "Toyota Avensis 2.2 D-4D",
  },
];

export default function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((c) => (c + 1) % testimonials.length);

  return (
    <section id="opinie" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#07090E]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,107,26,0.05), transparent 60%)" }}
      />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
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
            <span className="ml-2 text-sm text-[#8A9BB0]">5.0 / 5.0 · 200+ opinii</span>
          </div>
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative max-w-3xl mx-auto"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="glass-orange rounded-2xl p-8 sm:p-10 relative overflow-hidden"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-8 w-16 h-16 text-[#FF6B1A]/10" />

              {/* Stars */}
              <div className="flex items-center gap-1 mb-6">
                {[...Array(testimonials[current].rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#FF6B1A] text-[#FF6B1A]" />
                ))}
              </div>

              {/* Content */}
              <p className="text-white text-lg sm:text-xl leading-relaxed mb-8 relative z-10">
                &ldquo;{testimonials[current].content}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#FF3D00] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {testimonials[current].name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-white">{testimonials[current].name}</div>
                  <div className="text-sm text-[#8A9BB0]">{testimonials[current].role}</div>
                </div>
                <div className="ml-auto">
                  <span className="badge text-xs">{testimonials[current].vehicle}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-[#FF6B1A]/40 hover:bg-[#FF6B1A]/10 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === current ? "w-6 h-2 bg-[#FF6B1A]" : "w-2 h-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-[#FF6B1A]/40 hover:bg-[#FF6B1A]/10 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Logos strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20 text-center"
        >
          <p className="text-xs text-[#4A5568] uppercase tracking-widest mb-8 font-medium">
            Marki, z którymi pracujemy
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
            {["Garrett", "BorgWarner", "IHI", "Holset", "KKK", "MHI", "Continental"].map((brand) => (
              <span key={brand} className="font-display text-xl text-white/20 hover:text-white/50 transition-colors tracking-wider cursor-default">
                {brand}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
