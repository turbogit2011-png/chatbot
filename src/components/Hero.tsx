"use client";

import { motion } from "framer-motion";
import { ArrowRight, Star, ShieldCheck, Sparkles } from "lucide-react";
import { BUSINESS } from "@/lib/data";

const METRICS = [
  { value: "15", suffix: "lat", label: "doświadczenia od 2012" },
  { value: "8000", suffix: "+", label: "zregenerowanych turbo" },
  { value: "24", suffix: "mc", label: "gwarancji bez limitu km" },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-36 sm:pt-44">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-halo" />

      <div className="container-pro relative grid items-center gap-12 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28">
        {/* Copy */}
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="chip"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Elitarne laboratorium regeneracji · {BUSINESS.region}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-6 text-[2.7rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
          >
            <span className="text-gold-grad text-glow-gold">Inżynieria</span>
            <br />
            <span className="text-ink">Doładowania</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-titanium sm:text-lg"
          >
            Precyzyjna regeneracja turbosprężarek i DPF na poziomie laboratoryjnym.
            Wyważanie Turbo Technics VSR 301 z dokładnością do{" "}
            <span className="font-tel text-gold-bright">0,001 g/cm²</span>, kalibracja
            REA-Master oraz wyłącznie oryginalne komponenty OEM.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <a href="#diagnostyka" className="btn-gold">
              Diagnoza AI <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#finder" className="btn-ghost">
              Dobierz turbo
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-titanium"
          >
            <span className="flex items-center gap-2">
              <span className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </span>
              <span className="font-tel font-semibold text-ink">{BUSINESS.rating}</span>
              <span>/ 5 Google · {BUSINESS.positivePct}% pozytywnych</span>
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold" />
              Kurier ekspres {BUSINESS.pickupHours}
            </span>
          </motion.div>
        </div>

        {/* Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative mx-auto w-full max-w-md"
        >
          <TurboArt />
        </motion.div>
      </div>

      {/* Metric strip */}
      <div className="container-pro relative -mt-4 pb-16 lg:pb-24">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-[var(--panel)] px-6 py-7"
            >
              <div className="flex items-baseline gap-1">
                <span className="font-tel text-4xl font-bold text-gold-grad">{m.value}</span>
                <span className="font-tel text-lg font-semibold text-copper">{m.suffix}</span>
              </div>
              <p className="mt-1 text-sm text-titanium">{m.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TurboArt() {
  return (
    <div className="relative aspect-square">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(197,155,103,0.18),transparent_62%)]" />
      <svg viewBox="0 0 400 400" className="relative h-full w-full">
        <defs>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e3c08b" />
            <stop offset="55%" stopColor="#c59b67" />
            <stop offset="100%" stopColor="#a66e4e" />
          </linearGradient>
          <radialGradient id="hub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#161620" />
            <stop offset="100%" stopColor="#06060a" />
          </radialGradient>
        </defs>

        {/* outer housing rings */}
        <circle cx="200" cy="200" r="178" fill="none" stroke="rgba(197,155,103,0.16)" strokeWidth="1" />
        <circle cx="200" cy="200" r="150" fill="none" stroke="rgba(197,155,103,0.28)" strokeWidth="1.5" />

        {/* compressor blades */}
        <g className="spin-slow" style={{ transformOrigin: "200px 200px" }}>
          {Array.from({ length: 14 }).map((_, i) => {
            const a = (i * 360) / 14;
            return (
              <path
                key={i}
                d="M200 200 C 214 150, 240 120, 250 70 C 226 110, 206 150, 200 200 Z"
                fill="url(#gold)"
                opacity={0.85}
                transform={`rotate(${a} 200 200)`}
              />
            );
          })}
        </g>

        {/* hub */}
        <circle cx="200" cy="200" r="46" fill="url(#hub)" stroke="url(#gold)" strokeWidth="2" />
        <circle cx="200" cy="200" r="14" fill="url(#gold)" />

        {/* ticks */}
        <g>
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i * Math.PI * 2) / 60;
            const r1 = 168;
            const r2 = i % 5 === 0 ? 156 : 162;
            const x1 = 200 + r1 * Math.cos(a);
            const y1 = 200 + r1 * Math.sin(a);
            const x2 = 200 + r2 * Math.cos(a);
            const y2 = 200 + r2 * Math.sin(a);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(197,155,103,0.4)"
                strokeWidth={i % 5 === 0 ? 1.6 : 0.8}
              />
            );
          })}
        </g>
      </svg>

      {/* floating spec badge */}
      <div className="floaty absolute -bottom-3 left-1/2 -translate-x-1/2">
        <div className="panel-glass flex items-center gap-3 rounded-xl px-4 py-2.5 glow-ring">
          <span className="font-tel text-xs uppercase tracking-widest text-titanium">RPM</span>
          <span className="font-tel text-lg font-bold text-gold-bright">248 000</span>
        </div>
      </div>
    </div>
  );
}
