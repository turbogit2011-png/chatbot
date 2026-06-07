"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MousePointerClick } from "lucide-react";
import { HOTSPOTS, type Hotspot } from "@/lib/data";
import { SectionHeader } from "@/components/Reveal";

export function TurboExplorer() {
  const [active, setActive] = useState<Hotspot>(HOTSPOTS[0]);

  return (
    <section id="explorer" className="section-pad relative bg-[var(--obsidian-2)]">
      <div className="container-pro">
        <SectionHeader
          eyebrow="Virtual Explorer 2.0"
          title={
            <>
              Wirtualny <span className="text-gold-grad">eksplorator turbo</span>
            </>
          }
          intro="Kliknij pulsujące punkty na schemacie, aby poznać parametry regeneracji poszczególnych podzespołów."
        />

        <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Interactive vector diagram */}
          <div className="panel relative aspect-[4/3] overflow-hidden p-4 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
            <svg viewBox="0 0 400 300" className="relative h-full w-full">
              <defs>
                <linearGradient id="exGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#e3c08b" />
                  <stop offset="100%" stopColor="#a66e4e" />
                </linearGradient>
              </defs>

              {/* turbine housing (right) */}
              <circle cx="288" cy="204" r="64" fill="none" stroke="rgba(197,155,103,0.25)" strokeWidth="2" />
              <circle cx="288" cy="204" r="44" fill="rgba(197,155,103,0.04)" stroke="rgba(197,155,103,0.2)" strokeWidth="1" />
              {/* compressor housing (left) */}
              <circle cx="88" cy="114" r="60" fill="none" stroke="rgba(197,155,103,0.25)" strokeWidth="2" />
              <circle cx="88" cy="114" r="40" fill="rgba(197,155,103,0.04)" stroke="rgba(197,155,103,0.2)" strokeWidth="1" />
              {/* center cartridge */}
              <rect x="150" y="130" width="100" height="44" rx="10" fill="rgba(197,155,103,0.06)" stroke="url(#exGold)" strokeWidth="1.5" />
              <line x1="148" y1="152" x2="252" y2="152" stroke="rgba(197,155,103,0.4)" strokeWidth="2" />

              {/* impeller blades */}
              {Array.from({ length: 10 }).map((_, i) => (
                <path
                  key={`c${i}`}
                  d="M88 114 C 96 92, 110 82, 116 64 C 102 84, 92 100, 88 114 Z"
                  fill="url(#exGold)"
                  opacity={0.6}
                  transform={`rotate(${i * 36} 88 114)`}
                />
              ))}
              {/* vnt vanes */}
              {Array.from({ length: 12 }).map((_, i) => (
                <rect
                  key={`v${i}`}
                  x="286"
                  y="160"
                  width="4"
                  height="16"
                  rx="2"
                  fill="url(#exGold)"
                  opacity={0.6}
                  transform={`rotate(${i * 30} 288 204)`}
                />
              ))}

              {/* hotspots */}
              {HOTSPOTS.map((h) => {
                const cx = (h.x / 100) * 400;
                const cy = (h.y / 100) * 300;
                const isActive = active.id === h.id;
                return (
                  <g
                    key={h.id}
                    transform={`translate(${cx} ${cy})`}
                    className="cursor-pointer"
                    onClick={() => setActive(h)}
                  >
                    <circle
                      r="13"
                      fill={isActive ? "rgba(197,155,103,0.22)" : "rgba(197,155,103,0.1)"}
                      stroke="url(#exGold)"
                      strokeWidth={isActive ? 2 : 1}
                    />
                    <circle r="5" fill="url(#exGold)" className={isActive ? "" : "pulse-node"} />
                  </g>
                );
              })}
            </svg>

            {/* HTML hotspot labels for accessibility / clarity */}
            {HOTSPOTS.map((h) => (
              <button
                key={h.id}
                onClick={() => setActive(h)}
                aria-label={h.label}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 font-tel text-[0.6rem] font-semibold uppercase tracking-wide transition-all ${
                  active.id === h.id
                    ? "bg-[var(--grad-gold)] text-[#1a1206] opacity-100"
                    : "border border-[var(--line-strong)] bg-[var(--panel)] text-titanium opacity-90 hover:text-gold-bright"
                }`}
                style={{
                  left: `${h.x}%`,
                  top: `${h.y - 11}%`,
                  ...(active.id === h.id ? { background: "var(--grad-gold)" } : {}),
                }}
              >
                {h.label}
              </button>
            ))}
          </div>

          {/* Side panel */}
          <div className="panel p-6 sm:p-8">
            <span className="flex items-center gap-2 font-tel text-xs uppercase tracking-[0.2em] text-titanium">
              <MousePointerClick className="h-4 w-4 text-gold" /> Parametry podzespołu
            </span>

            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="mt-5 text-2xl font-bold text-gold-grad">{active.label}</h3>
                <p className="mt-3 text-sm leading-relaxed text-titanium">{active.summary}</p>

                <dl className="mt-6 space-y-2.5">
                  {active.params.map((p) => (
                    <div
                      key={p.k}
                      className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white/[0.02] px-4 py-3"
                    >
                      <dt className="text-sm text-titanium">{p.k}</dt>
                      <dd className="font-tel text-sm font-semibold text-ink">{p.v}</dd>
                    </div>
                  ))}
                </dl>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex flex-wrap gap-2">
              {HOTSPOTS.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setActive(h)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    active.id === h.id
                      ? "border border-[var(--gold)] bg-[rgba(197,155,103,0.1)] text-gold-bright"
                      : "border border-[var(--line)] text-titanium hover:border-[var(--line-strong)]"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
