"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Shield, Award, Clock, Phone } from "lucide-react";

function TurboViz() {
  const cx = 240, cy = 240;

  return (
    <div className="relative flex items-center justify-center select-none" aria-hidden="true">
      <div
        className="absolute inset-[-18%] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,107,26,0.14) 0%, transparent 62%)" }}
      />
      <svg viewBox="0 0 480 480" className="relative w-full max-w-[520px] h-auto">
        <defs>
          <linearGradient id="vB1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF6B1A" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#FF3D00" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="vB2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF8C3A" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#FF6B1A" stopOpacity="0.1" />
          </linearGradient>
          <filter id="vGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="vCGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="12" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Static ambient rings */}
        <circle cx={cx} cy={cy} r="232" fill="none" stroke="rgba(255,107,26,0.05)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="222" fill="none" stroke="rgba(255,107,26,0.03)" strokeWidth="0.5" />

        {/* Slow outer rotating ring with tick marks */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: "spin-slow 32s linear infinite" }}>
          <circle cx={cx} cy={cy} r="208" fill="none" stroke="rgba(255,107,26,0.11)" strokeWidth="1" strokeDasharray="5 14" />
          {Array.from({ length: 36 }).map((_, i) => {
            const a = (i * 10 - 90) * (Math.PI / 180);
            const isMaj = i % 9 === 0;
            return (
              <line key={i}
                x1={cx + Math.cos(a) * (isMaj ? 194 : 199)} y1={cy + Math.sin(a) * (isMaj ? 194 : 199)}
                x2={cx + Math.cos(a) * 214} y2={cy + Math.sin(a) * 214}
                stroke={`rgba(255,107,26,${isMaj ? 0.45 : 0.14})`}
                strokeWidth={isMaj ? "2" : "0.8"}
              />
            );
          })}
        </g>

        {/* Middle static ring */}
        <circle cx={cx} cy={cy} r="176" fill="none" stroke="rgba(255,107,26,0.07)" strokeWidth="1" />

        {/* TURBINE BLADES – counter-clockwise fast spin */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: "spin-reverse 2.6s linear infinite" }}>
          {Array.from({ length: 9 }).map((_, i) => {
            const base = (i * 40) * (Math.PI / 180);
            const tip  = (i * 40 + 33) * (Math.PI / 180);
            const iR = 52, oR = 153;
            const sx  = cx + Math.cos(base) * iR, sy  = cy + Math.sin(base) * iR;
            const ex  = cx + Math.cos(tip)  * oR, ey  = cy + Math.sin(tip)  * oR;
            const c1x = cx + Math.cos(base + 0.18) * 96,  c1y = cy + Math.sin(base + 0.18) * 96;
            const c2x = cx + Math.cos(tip  - 0.10) * 133, c2y = cy + Math.sin(tip  - 0.10) * 133;
            return (
              <path key={i}
                d={`M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey} L ${cx} ${cy} Z`}
                fill={i % 2 === 0 ? "url(#vB1)" : "url(#vB2)"}
                filter="url(#vGlow)"
              />
            );
          })}
        </g>

        {/* Inner clockwise ring */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: "spin-slow 7s linear infinite" }}>
          <circle cx={cx} cy={cy} r="63" fill="none" stroke="rgba(255,107,26,0.35)" strokeWidth="1.5" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30) * (Math.PI / 180);
            return (
              <line key={i}
                x1={cx + Math.cos(a) * 55} y1={cy + Math.sin(a) * 55}
                x2={cx + Math.cos(a) * 70} y2={cy + Math.sin(a) * 70}
                stroke={`rgba(255,107,26,${i % 3 === 0 ? 0.55 : 0.22})`}
                strokeWidth={i % 3 === 0 ? "2" : "1"}
              />
            );
          })}
        </g>

        {/* Center hub */}
        <circle cx={cx} cy={cy} r="48" fill="rgba(255,107,26,0.05)" />
        <circle cx={cx} cy={cy} r="34" fill="rgba(255,107,26,0.11)" />
        <circle cx={cx} cy={cy} r="22" fill="rgba(255,107,26,0.20)" stroke="rgba(255,107,26,0.55)" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="9"  fill="#FF6B1A" filter="url(#vCGlow)" />
        <circle cx={cx} cy={cy} r="4"  fill="#FFB86C" />

        {/* Callout dots on the outer ring */}
        {[
          { angle: -50, label: "5000+" },
          { angle:  40, label: "CNC" },
          { angle: 135, label: "12M" },
          { angle: 225, label: "24H" },
        ].map(({ angle, label }, i) => {
          const a = angle * (Math.PI / 180);
          const r = 208;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          const lx = cx + Math.cos(a) * 188, ly = cy + Math.sin(a) * 188;
          return (
            <g key={i} opacity="0.9">
              <line x1={lx} y1={ly} x2={x} y2={y}
                stroke="rgba(255,107,26,0.25)" strokeWidth="1" strokeDasharray="2 4" />
              <circle cx={x} cy={y} r="4" fill="#FF6B1A" />
              <text x={cx + Math.cos(a) * 228} y={cy + Math.sin(a) * 228 + 4}
                fill="rgba(255,107,26,0.7)" fontSize="10" fontFamily="monospace"
                textAnchor="middle" fontWeight="bold"
              >{label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const ease = [0.16, 1, 0.3, 1] as const;

export default function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 100]);
  const opacity = useTransform(scrollY, [0, 380], [1, 0]);

  const scrollTo = (id: string) =>
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#07090E]" />
      <div className="absolute inset-0 bg-grid" />
      <div
        className="absolute -top-[20%] -left-[10%] w-[900px] h-[900px] rounded-full pointer-events-none"
        style={{ background: "rgba(255,107,26,0.07)", filter: "blur(160px)" }}
      />
      <div
        className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "rgba(255,61,0,0.05)", filter: "blur(120px)" }}
      />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-20"
      >
        <div className="grid lg:grid-cols-[1fr_500px] xl:grid-cols-[1fr_540px] gap-10 xl:gap-16 items-center">

          {/* ── Left: copy ── */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="badge mb-8 w-fit"
            >
              <span className="w-2 h-2 rounded-full bg-[#FF6B1A] animate-pulse flex-shrink-0" />
              Profesjonalny serwis turbosprężarek od 2014 roku
            </motion.div>

            {/* Headline – line-clip reveal */}
            <h1 className="font-display leading-[0.88] tracking-wide mb-8"
              style={{ fontSize: "clamp(3.6rem, 7.5vw, 8rem)" }}
            >
              {/* Line 1 */}
              <span className="block overflow-hidden">
                <motion.span
                  className="block text-white"
                  initial={{ y: "106%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.75, delay: 0.12, ease }}
                >REGENERACJA</motion.span>
              </span>
              {/* Line 2 */}
              <span className="block overflow-hidden">
                <motion.span
                  className="block text-gradient glow-text"
                  initial={{ y: "106%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.75, delay: 0.24, ease }}
                >TURBO</motion.span>
              </span>
              {/* Line 3 – outline/stroke text */}
              <span className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: "106%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.75, delay: 0.36, ease }}
                  style={{
                    WebkitTextStroke: "2px rgba(255,255,255,0.35)",
                    color: "transparent",
                  }}
                >SPRĘŻAREK</motion.span>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-[#8A9BB0] text-lg sm:text-xl max-w-lg mb-10 leading-relaxed"
            >
              Precyzyjna diagnostyka, regeneracja CNC i testy na specjalistycznych stanowiskach.
              Wszystkie marki i modele. Gwarancja 12 miesięcy.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.62 }}
              className="flex flex-wrap gap-4 mb-14"
            >
              <button
                onClick={() => scrollTo("#kontakt")}
                className="btn-primary flex items-center gap-2 text-base group"
              >
                Bezpłatna wycena
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="tel:+48000000000"
                className="btn-secondary flex items-center gap-2 text-base"
              >
                <Phone className="w-4 h-4 text-[#FF6B1A]" />
                Zadzwoń teraz
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.74 }}
              className="flex flex-wrap gap-6"
            >
              {[
                { icon: Shield, label: "Gwarancja 12 miesięcy" },
                { icon: Award,  label: "10+ lat doświadczenia" },
                { icon: Clock,  label: "Realizacja 24–48h" },
              ].map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg glass-orange flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#FF6B1A]" />
                  </div>
                  <span className="text-sm font-medium text-[#8A9BB0]">{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Right: turbo visualization ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex items-center justify-center"
          >
            <TurboViz />
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-[#4A5568] font-medium tracking-widest uppercase">Przewiń</span>
        <div className="w-5 h-8 rounded-full border border-white/10 flex items-start justify-center p-1">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A]"
          />
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#07090E] to-transparent pointer-events-none z-10" />
    </section>
  );
}
