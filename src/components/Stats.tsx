"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const items = [
  { value: "8 000+",  label: "Modeli w magazynie" },
  { value: "24M",     label: "Gwarancja na każde turbo" },
  { value: "14 lat",  label: "Doświadczenia od 2012" },
  { value: "24H",     label: "Ekspresowa wysyłka" },
  { value: "4.9/5",   label: "Ocena Google" },
  { value: "VSR 301", label: "Balansowanie dynamiczne" },
  { value: "100%",    label: "Oryginalne części OEM" },
  { value: "699 zł",  label: "Ceny od tej kwoty" },
];

const doubled = [...items, ...items];

export default function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="py-0 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#07090E]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, #07090E, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #07090E, transparent)" }} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
      >
        <div className="flex gap-0 animate-marquee-x" style={{ width: "max-content" }}>
          {doubled.map((item, i) => (
            <div key={i} className="flex items-center">
              <div className="flex items-center gap-4 px-10 py-8">
                <span className="font-display text-[2.8rem] leading-none text-gradient whitespace-nowrap">
                  {item.value}
                </span>
                <span className="text-sm text-[#4A5568] font-medium uppercase tracking-widest whitespace-nowrap max-w-[120px] leading-tight">
                  {item.label}
                </span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A]/35 flex-shrink-0" />
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
