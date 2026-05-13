"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Gauge, Cpu, FlaskConical, Package, Shield, Building2 } from "lucide-react";

const features = [
  { icon: Gauge, title: "VSR 301 Balansowanie", desc: "Dynamiczne balansowanie wirnika z dokładnością 0,001 g/cm². Standard dla najlepszych serwisów w Europie." },
  { icon: Cpu, title: "Diagnostyka CHRA", desc: "Pełna diagnostyka obudowy łożyskowej i wirnika. Wykrywamy ukryte uszkodzenia przed regeneracją." },
  { icon: FlaskConical, title: "Test G3-MIN-FLOW", desc: "Rygorystyczny test przepływu i szczelności po regeneracji. Każda turbosprężarka z protokołem badań." },
  { icon: Package, title: "Oryginalne Części OEM", desc: "Wyłącznie nowe, oryginalne komponenty Garrett, BorgWarner, IHI, Holset. Zero tanich zamienników." },
  { icon: Shield, title: "Gwarancja 24 Miesiące", desc: "Pełna gwarancja 24 miesiące bez limitu kilometrów. W razie problemów – odbiór na nasz koszt." },
  { icon: Building2, title: "Program B2B", desc: "Dedykowany program dla warsztatów. Rabaty 10%, priorytetowa realizacja, stały opiekun konta." },
];

export default function WhyUs() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="o-nas" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#06080D]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 bg-grid-coarse opacity-60" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 0% 50%, rgba(255,122,0,0.05), transparent 60%)" }} />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6 }}>
            <div className="section-label mb-4"><span>Dlaczego TURBO-GIT</span></div>
            <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] text-white leading-none mb-6 tracking-wide">
              15 LAT<br /><span className="text-gradient">DOŚWIADCZENIA</span><br />NA RYNKU
            </h2>
            <p className="text-[#94A3B8] text-lg leading-relaxed mb-6">
              Od 2010 roku specjalizujemy się wyłącznie w regeneracji turbosprężarek.
              Setki zrealizowanych napraw miesięcznie, nowoczesny park maszynowy
              i certyfikowani technicy gwarantują jakość na poziomie fabrycznym.
            </p>
            <p className="text-[#94A3B8] leading-relaxed mb-8">
              Nasza siedziba w Januszkowicach obsługuje klientów z całej Polski i Europy.
              Ekspresowa wysyłka kurierska – odbiór i dostawa w ciągu 24 godzin.
            </p>
            <div className="flex flex-wrap gap-4">
              {[
                { val: "15 lat", label: "na rynku" },
                { val: "24M", label: "gwarancja" },
                { val: "24h", label: "realizacja" },
              ].map(({ val, label }) => (
                <div key={label} className="glass-warm rounded-xl px-6 py-4 text-center">
                  <div className="font-display text-3xl text-gradient">{val}</div>
                  <div className="text-xs text-[#94A3B8] mt-1">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right – features grid */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6, delay: 0.15 }}
            className="grid sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.07 }}
                className="group bg-[#131B2A] rounded-xl p-5 border border-white/5 hover:border-[#FF7A00]/25 transition-all hover:-translate-y-1">
                <div className="w-10 h-10 rounded-lg bg-[#FF7A00]/10 flex items-center justify-center mb-3 group-hover:bg-[#FF7A00]/20 transition-colors">
                  <f.icon className="w-5 h-5 text-[#FF7A00]" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
