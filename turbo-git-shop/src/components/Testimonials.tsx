"use client";
import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const reviews = [
  { name: "Marek Wiśniewski", role: "Mechanik samochodowy", vehicle: "Warsztat – Wrocław", text: "Współpracuję z TURBO-GIT od 3 lat. Wszystkie turbosprężarki wychodzą perfekcyjnie. Rabat B2B i ekspresowa dostawa to standard. Najlepszy dostawca na rynku.", rating: 5 },
  { name: "Tomasz Nowak", role: "Kierowca TIR", vehicle: "MAN TGX 18.480", text: "Turbo do mojego MAN-a dotarło w 24h. Montaż bez problemów, auto działa świetnie od 6 miesięcy. Gwarancja 24 miesiące to duży plus. Polecam wszystkim kierowcom.", rating: 5 },
  { name: "Anna Kowalczyk", role: "Fleet Manager", vehicle: "Flota 25 pojazdów", text: "Zarządzam flotą firmową i TURBO-GIT to nasz stały partner. Ceny B2B atrakcyjne, dostawy zawsze na czas, jakość bez zastrzeżeń. Oszczędzamy tysiące złotych rocznie.", rating: 5 },
  { name: "Piotr Zając", role: "Właściciel warsztatu", vehicle: "AutoSerwis Zając – Kraków", text: "Zrobiłem pierwsze zamówienie próbne – 5 turbosprężarek. Wszystkie sprawne, klienci zadowoleni. Teraz zamawiamy regularnie. Program B2B zdecydowanie wart polecenia.", rating: 5 },
  { name: "Grzegorz Malinowski", role: "Właściciel pojazdu", vehicle: "BMW 320d F30", text: "Turbosprężarka do BMW dotarła szybko, dobrze zapakowana. Montaż u mechanika bez problemów. Auto odzyskało pełną moc. Gwarancja daje spokój ducha. Super sklep!", rating: 5 },
];

export default function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [cur, setCur] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCur(c => (c + 1) % reviews.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="opinie" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0E1420]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,122,0,0.04), transparent 60%)" }} />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          className="text-center mb-16">
          <div className="section-label mx-auto justify-center mb-4"><span>Opinie</span></div>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] text-white leading-none mb-4 tracking-wide">
            CO MÓWIĄ<br /><span className="text-gradient">NASI KLIENCI</span>
          </h2>
          <div className="flex items-center justify-center gap-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-[#FFB800] text-[#FFB800]" />)}
            <span className="text-sm text-[#94A3B8] ml-1">4.9 / 5.0 · 312 opinii Google</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={cur} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="glass-warm rounded-2xl p-8 sm:p-10 relative overflow-hidden">
              <Quote className="absolute top-6 right-8 w-16 h-16 text-[#FF7A00]/8" />
              <div className="flex gap-1 mb-5">
                {[...Array(reviews[cur].rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#FFB800] text-[#FFB800]" />)}
              </div>
              <p className="text-white text-lg leading-relaxed mb-8">&ldquo;{reviews[cur].text}&rdquo;</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FF3D00] flex items-center justify-center text-white font-bold">
                    {reviews[cur].name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{reviews[cur].name}</div>
                    <div className="text-xs text-[#94A3B8]">{reviews[cur].role}</div>
                  </div>
                </div>
                <span className="badge badge-orange text-xs">{reviews[cur].vehicle}</span>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-4 mt-6">
            <button onClick={() => setCur(c => (c - 1 + reviews.length) % reviews.length)}
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:border-[#FF7A00]/40 hover:bg-[#FF7A00]/10 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {reviews.map((_, i) => (
              <button key={i} onClick={() => setCur(i)}
                className={`rounded-full transition-all ${i === cur ? "w-6 h-2 bg-[#FF7A00]" : "w-2 h-2 bg-white/20 hover:bg-white/40"}`} />
            ))}
            <button onClick={() => setCur(c => (c + 1) % reviews.length)}
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:border-[#FF7A00]/40 hover:bg-[#FF7A00]/10 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
