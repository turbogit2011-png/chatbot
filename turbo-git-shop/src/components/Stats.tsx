"use client";
import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Package, Users, Star, Shield } from "lucide-react";

const stats = [
  { icon: Package, value: 8000, suffix: "+", label: "Turbosprężarek w sprzedaży", color: "#FF7A00" },
  { icon: Users, value: 4500, suffix: "+", label: "Zadowolonych klientów", color: "#FF9A30" },
  { icon: Star, value: 98, suffix: "%", label: "Pozytywnych opinii", color: "#FFB800" },
  { icon: Shield, value: 24, suffix: " mies.", label: "Gwarancja na każdy produkt", color: "#FF7A00" },
];

function Counter({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let s = 0; const step = target / (1800 / 16);
    const t = setInterval(() => { s = Math.min(s + step, target); setCount(Math.floor(s)); if (s >= target) clearInterval(t); }, 16);
    return () => clearInterval(t);
  }, [inView, target]);
  return <>{count.toLocaleString("pl-PL")}{suffix}</>;
}

export default function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0E1420]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 100% 60% at 50% 50%, rgba(255,122,0,0.04), transparent 70%)" }} />
      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 25, scale: 0.95 }} animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: i * 0.09 }}
              className="group bg-[#131B2A] rounded-2xl p-7 text-center border border-white/5 hover:border-[#FF7A00]/20 transition-all hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(255,122,0,0.1)]">
              <div className="w-12 h-12 rounded-xl bg-[#FF7A00]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#FF7A00]/20 transition-colors">
                <s.icon className="w-6 h-6 text-[#FF7A00]" />
              </div>
              <div className="font-display text-[clamp(2rem,4vw,3rem)] text-gradient leading-none mb-2 text-glow">
                <Counter target={s.value} suffix={s.suffix} inView={inView} />
              </div>
              <p className="text-sm text-[#94A3B8] leading-snug">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
