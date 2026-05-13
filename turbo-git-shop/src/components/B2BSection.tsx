"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CheckCircle, TrendingUp, Clock, UserCheck, Package } from "lucide-react";

const benefits = [
  { icon: TrendingUp, text: "Stały rabat 10% na wszystkie produkty" },
  { icon: Clock, text: "Priorytetowa realizacja – wysyłka w 24h" },
  { icon: UserCheck, text: "Dedykowany opiekun konta B2B" },
  { icon: Package, text: "Hurtowe dostawy dla warsztatów" },
];

export default function B2BSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section id="b2b" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#06080D]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 bg-grid-coarse opacity-40" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#FFB800]/5 blur-[120px] pointer-events-none" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6 }}>
            <div className="badge badge-gold mb-6 w-fit">Program B2B</div>
            <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] text-white leading-none mb-6 tracking-wide">
              ZOSTAŃ<br /><span className="text-gradient-gold">PARTNEREM</span><br />WARSZTATOWYM
            </h2>
            <p className="text-[#94A3B8] text-lg leading-relaxed mb-8">
              Dołącz do ponad 300 warsztatów w całej Polsce, które korzystają z naszego programu B2B.
              Atrakcyjne rabaty, szybka dostawa i profesjonalna obsługa.
            </p>
            <ul className="flex flex-col gap-4 mb-10">
              {benefits.map(({ icon: Icon, text }, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFB800]/10 border border-[#FFB800]/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#FFB800]" />
                  </div>
                  <span className="text-[#F1F5F9] font-medium text-sm">{text}</span>
                </motion.li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <button className="btn-gold">Zarejestruj się jako B2B</button>
              <button className="btn-ghost">Dowiedz się więcej</button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 }}>
            <div className="glass-gold rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFB800]/8 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-xs text-[#94A3B8] mb-1 uppercase tracking-wider font-medium">Panel B2B</div>
                    <div className="font-semibold text-white">Warsztat Kowalski</div>
                  </div>
                  <div className="badge badge-gold">Aktywny</div>
                </div>
                {[
                  { label: "Oszczędzasz miesięcznie", value: "2 340 PLN", color: "text-[#4ade80]" },
                  { label: "Zamówień w tym miesiącu", value: "47 szt.", color: "text-[#60a5fa]" },
                  { label: "Twój rabat B2B", value: "−10%", color: "text-[#FFB800]" },
                  { label: "Czas realizacji", value: "24h", color: "text-[#FF9A30]" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-white/6 last:border-0">
                    <span className="text-sm text-[#94A3B8]">{label}</span>
                    <span className={`font-bold text-sm ${color}`}>{value}</span>
                  </div>
                ))}
                <div className="mt-6 p-4 bg-[#FFB800]/8 rounded-xl border border-[#FFB800]/15">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-[#FFB800]" />
                    <span className="text-sm font-semibold text-[#FFB800]">Następna dostawa</span>
                  </div>
                  <p className="text-xs text-[#94A3B8]">Jutro do 12:00 · 3 sztuki turbosprężarek</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
