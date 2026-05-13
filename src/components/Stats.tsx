"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Star, TrendingUp, Users, Award } from "lucide-react";

const stats = [
  { icon: TrendingUp, value: 5000, suffix: "+", label: "Zregenerowanych turbosprężarek", color: "#FF6B1A" },
  { icon: Users, value: 3500, suffix: "+", label: "Zadowolonych klientów", color: "#FF8C3A" },
  { icon: Star, value: 98, suffix: "%", label: "Pozytywnych opinii", color: "#FF6B1A" },
  { icon: Award, value: 10, suffix: " lat", label: "Doświadczenia na rynku", color: "#FF8C3A" },
];

function AnimatedCounter({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setCount(Math.floor(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span>
      {count.toLocaleString("pl-PL")}
      {suffix}
    </span>
  );
}

export default function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#07090E]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 100% 60% at 50% 50%, rgba(255,107,26,0.04), transparent 70%)" }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative rounded-2xl bg-[#111827] border border-white/5 p-7 text-center overflow-hidden hover:border-[#FF6B1A]/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(255,107,26,0.1)]"
            >
              {/* Background glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${stat.color}10, transparent 60%)` }}
              />

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B1A]/15 to-transparent mx-auto mb-4 flex items-center justify-center border border-[#FF6B1A]/15 group-hover:border-[#FF6B1A]/30 transition-colors">
                <stat.icon className="w-6 h-6 text-[#FF6B1A]" />
              </div>

              {/* Value */}
              <div className="font-display text-[clamp(2rem,5vw,3.5rem)] text-gradient leading-none mb-2 glow-text">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} inView={inView} />
              </div>

              {/* Label */}
              <p className="text-sm text-[#8A9BB0] leading-snug">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
