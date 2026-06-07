"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const items = [
  { value: "5 000+",  label: "Zregenerowanych turbosprężarek" },
  { value: "3 500+",  label: "Zadowolonych klientów" },
  { value: "98%",     label: "Pozytywnych opinii" },
  { value: "24H",     label: "Ekspresowa realizacja" },
  { value: "12M",     label: "Gwarancja na każdą naprawę" },
  { value: "10 lat",  label: "Doświadczenia na rynku" },
  { value: "100%",    label: "Oryginalne części OEM" },
  { value: "CNC",     label: "Balansowanie wirnika" },
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

      {/* Gradient fade on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, #07090E, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #07090E, transparent)" }} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="relative"
      >
        {/* Marquee track */}
        <div
          className="flex gap-0 animate-marquee-x"
          style={{ width: "max-content" }}
        >
          {doubled.map((item, i) => (
            <div key={i} className="flex items-center">
              {/* Item */}
              <div className="flex items-center gap-4 px-10 py-8">
                <span className="font-display text-[2.8rem] leading-none text-gradient whitespace-nowrap">
                  {item.value}
                </span>
                <span className="text-sm text-[#4A5568] font-medium uppercase tracking-widest whitespace-nowrap max-w-[120px] leading-tight">
                  {item.label}
                </span>
              </div>
              {/* Separator */}
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A]/35 flex-shrink-0" />
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
