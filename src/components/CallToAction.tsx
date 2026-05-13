"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Phone, ArrowRight, Truck } from "lucide-react";

export default function CallToAction() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 sm:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0C1018]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #FF6B1A 0%, #FF4D00 40%, #CC3000 100%)",
          }}
        >
          {/* Noise layer */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Grid overlay */}
          <div className="absolute inset-0 bg-grid opacity-20" />

          {/* Glow orb */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10 px-8 py-14 sm:px-16 sm:py-16 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <div className="flex items-center gap-2 mb-3 justify-center lg:justify-start">
                <Truck className="w-5 h-5 text-white/70" />
                <span className="text-sm font-medium text-white/70">Wysyłka kurierska z całej Polski</span>
              </div>
              <h2 className="font-display text-[clamp(2rem,5vw,4rem)] text-white leading-none tracking-wide mb-3">
                TWOJA TURBO CZEKA
                <br />
                NA REGENERACJĘ
              </h2>
              <p className="text-white/70 text-lg max-w-lg">
                Skontaktuj się z nami już teraz i uzyskaj bezpłatną wycenę.
                Realizacja w 24–48 godzin. Gwarancja 12 miesięcy.
              </p>
            </div>

            <div className="flex flex-col gap-3 min-w-fit">
              <a
                href="tel:+48000000000"
                className="flex items-center justify-center gap-2.5 bg-white text-[#CC3000] font-bold px-8 py-4 rounded-xl hover:bg-white/90 transition-all hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] text-base"
              >
                <Phone className="w-5 h-5" />
                Zadzwoń teraz
              </a>
              <a
                href="#kontakt"
                onClick={(e) => { e.preventDefault(); document.querySelector("#kontakt")?.scrollIntoView({ behavior: "smooth" }); }}
                className="flex items-center justify-center gap-2 bg-white/10 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base border border-white/20"
              >
                Wyślij zapytanie
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
