"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Phone, ShieldCheck, Gauge, Wind, Truck } from "lucide-react";
import { CONTACT, USP } from "@/lib/brand";

/**
 * HUD-style data panel that simulates a live diagnostic readout.
 * Values "drift" to suggest a running turbo on a balancing rig.
 */
function HudPanel() {
  const [rpm, setRpm] = useState(248_000);
  const [boost, setBoost] = useState(1.82);
  const [balance, setBalance] = useState(0.05);

  useEffect(() => {
    const id = setInterval(() => {
      setRpm(240_000 + Math.round(Math.random() * 16_000));
      setBoost(+(1.6 + Math.random() * 0.5).toFixed(2));
      setBalance(+(0.03 + Math.random() * 0.05).toFixed(2));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const rows: { label: string; value: string; unit: string }[] = [
    { label: "RPM", value: rpm.toLocaleString("pl-PL"), unit: "obr/min" },
    { label: "BOOST", value: boost.toFixed(2), unit: "bar" },
    { label: "BALANCE", value: `±${balance.toFixed(2)}`, unit: "g" },
  ];

  return (
    <div className="font-mono-tech text-[11px] leading-tight rounded-sm border border-white/10 bg-black/40 backdrop-blur-sm p-3 sm:p-4 min-w-[180px]">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
        <span className="hud-label text-[var(--green)]">VSR301 · LIVE</span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3">
            <span className="hud-label text-[var(--steel-light)]">{r.label}</span>
            <span className="text-white text-sm tabular-nums">
              {r.value}
              <span className="text-[var(--steel-light)] text-[10px] ml-1">{r.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Inline SVG turbo rotor — animates infinitely.
 * Stylised compressor wheel with 9 curved blades.
 */
function TurboRotor({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="turbo-hub" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF7A47" />
          <stop offset="60%" stopColor="#FF5A1F" />
          <stop offset="100%" stopColor="#7A2A0A" />
        </radialGradient>
        <linearGradient id="blade-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3A3F49" />
          <stop offset="50%" stopColor="#8A93A3" />
          <stop offset="100%" stopColor="#1A1D24" />
        </linearGradient>
      </defs>
      <g className="animate-rotor" style={{ transformOrigin: "100px 100px" }}>
        {Array.from({ length: 9 }).map((_, i) => {
          const angle = (i * 360) / 9;
          return (
            <path
              key={i}
              d="M100 100 Q 130 60 165 90 Q 140 95 100 100 Z"
              fill="url(#blade-gradient)"
              stroke="#0A0B0D"
              strokeWidth="1"
              transform={`rotate(${angle} 100 100)`}
            />
          );
        })}
        <circle cx="100" cy="100" r="28" fill="url(#turbo-hub)" />
        <circle cx="100" cy="100" r="8" fill="#0A0B0D" />
      </g>
      <circle
        cx="100"
        cy="100"
        r="92"
        fill="none"
        stroke="rgba(255, 90, 31, 0.15)"
        strokeWidth="1"
        strokeDasharray="2 4"
      />
    </svg>
  );
}

const heroBadges = [
  { icon: ShieldCheck, label: USP.warrantyShort },
  { icon: Gauge, label: "Nowy CHRA" },
  { icon: Wind, label: "VSR301 · G3-Min-Flow" },
  { icon: Truck, label: "Wysyłka 24h" },
];

export default function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 120]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <section
      id="home"
      className="relative min-h-[100svh] flex items-center overflow-hidden pt-24 pb-16 sm:pt-28 lg:pt-32"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-[var(--bg-primary)]" />
      <div className="absolute inset-0 bg-grid opacity-100" />

      {/* Boost glow */}
      <div className="absolute top-[-15%] left-[-5%] w-[640px] h-[640px] rounded-full bg-[var(--orange)]/10 blur-[140px] pointer-events-none animate-boost" />
      <div className="absolute bottom-[-25%] right-[-15%] w-[560px] h-[560px] rounded-full bg-[var(--red)]/8 blur-[120px] pointer-events-none" />
      <div className="absolute top-[35%] right-[18%] w-[280px] h-[280px] rounded-full bg-[var(--blue)]/5 blur-[90px] pointer-events-none" />

      {/* Radial spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 30% 35%, rgba(255,90,31,0.10) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full"
      >
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-12 items-center">
          {/* Left — copy + CTA */}
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-3 mb-6"
            >
              <span className="hud-label text-[var(--orange)]">
                TURBO LAB · WROCŁAW · OD 2010
              </span>
              <span className="h-px w-12 bg-[var(--steel)]" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="font-display text-[clamp(2.4rem,6.5vw,4.75rem)] leading-[1.02] tracking-tight text-white mb-6"
            >
              Regeneracja turbosprężarek na poziomie{" "}
              <span className="text-gradient">technologii premium</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-[var(--text-muted)] text-base sm:text-lg max-w-xl mb-8 leading-relaxed"
            >
              Nowe rdzenie <span className="text-white font-medium">CHRA</span>.
              Wyważanie wysokoobrotowe{" "}
              <span className="text-white font-medium">
                TurboTechnics VSR301
              </span>
              . Precyzyjny przepływ{" "}
              <span className="text-white font-medium">G3-Min-Flow</span>.{" "}
              <span className="text-[var(--green)] font-medium">
                24 miesiące gwarancji
              </span>{" "}
              bez limitu kilometrów.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap gap-3 mb-10"
            >
              <a
                href="#dobor-turbo"
                className="btn-primary scanline inline-flex items-center gap-2 text-base"
              >
                Dobierz turbosprężarkę
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={CONTACT.phoneTel}
                className="btn-secondary inline-flex items-center gap-2 text-base"
                aria-label={`Zadzwoń ${CONTACT.phoneDisplay}`}
              >
                <Phone className="w-4 h-4 text-[var(--orange)]" />
                {CONTACT.phoneDisplay}
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap gap-2.5"
            >
              {heroBadges.map((b) => (
                <span key={b.label} className="chip-trust">
                  <b.icon className="w-3.5 h-3.5" />
                  {b.label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — visual: turbo rotor + HUD panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
            className="relative h-[400px] sm:h-[480px] lg:h-[560px] hidden md:block"
          >
            {/* Rotor */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-[360px] h-[360px] lg:w-[460px] lg:h-[460px]">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border border-[var(--steel)]/60" />
                <div
                  className="absolute inset-4 rounded-full border border-dashed border-[var(--orange)]/20"
                  aria-hidden
                />
                {/* Rim light */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--orange)]/15 via-transparent to-transparent blur-2xl" />
                {/* Rotor SVG */}
                <TurboRotor className="absolute inset-0 w-full h-full drop-shadow-[0_0_40px_rgba(255,90,31,0.35)]" />
              </div>
            </div>

            {/* HUD panel — top right */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="absolute top-6 right-2 sm:right-4 z-10"
            >
              <HudPanel />
            </motion.div>

            {/* Measurement label — bottom left */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="absolute bottom-6 left-2 sm:left-6 z-10 font-mono-tech text-[11px] text-[var(--steel-light)] flex items-center gap-2"
            >
              <span className="inline-block w-6 h-px bg-[var(--orange)]" />
              <span>CHRA · GARRETT GTB1749VK · ±0.05 g</span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none z-10" />
    </section>
  );
}
