"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Phone, ArrowRight, Truck, ShieldCheck } from "lucide-react";
import { CONTACT } from "@/lib/brand";

export default function CallToAction() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 sm:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[var(--bg-primary)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-sm overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #FF5A1F 0%, #E11D2A 50%, #7A1010 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10 px-6 sm:px-12 lg:px-16 py-12 sm:py-16 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <div className="flex items-center gap-2 mb-3 justify-center lg:justify-start">
                <Truck className="w-4 h-4 text-white/80" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">
                  Wysyłka 24h · cała Polska
                </span>
              </div>
              <h2 className="font-display text-[clamp(1.85rem,4.5vw,3.5rem)] text-white leading-[1.05] tracking-tight mb-4 max-w-2xl">
                Twoja turbosprężarka zasługuje na technologię premium.
              </h2>
              <p className="text-white/85 text-base sm:text-lg max-w-xl leading-relaxed mb-5">
                Zadzwoń. Wyślij numer turbo. Albo wrzuć VIN. Zrobimy resztę.
                Oddzwaniamy w 30 minut w godzinach pracy.
              </p>
              <div className="flex items-center gap-2 justify-center lg:justify-start text-sm text-white/85">
                <ShieldCheck className="w-4 h-4" />
                <span>24 mc gwarancji · nowy CHRA · uszczelki gratis</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-fit w-full sm:w-auto">
              <a
                href={CONTACT.phoneTel}
                className="flex items-center justify-center gap-2.5 bg-white text-[#7A1010] font-bold px-8 py-4 rounded-sm hover:bg-white/95 transition-all hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(0,0,0,0.35)] text-base"
              >
                <Phone className="w-5 h-5" />
                <span className="font-mono-tech">{CONTACT.phoneDisplay}</span>
              </a>
              <a
                href="#kontakt"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .querySelector("#kontakt")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center justify-center gap-2 bg-white/10 text-white font-semibold px-8 py-4 rounded-sm hover:bg-white/20 transition-all text-base border border-white/25"
              >
                Wyślij VIN / numer turbo
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
