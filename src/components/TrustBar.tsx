"use client";

import {
  ShieldCheck,
  Cpu,
  Gauge,
  Wind,
  Truck,
  Award,
} from "lucide-react";

const items = [
  { icon: ShieldCheck, label: "24 mc gwarancji · bez limitu km" },
  { icon: Cpu, label: "Nowy rdzeń CHRA — nie regenerowany" },
  { icon: Gauge, label: "Wyważanie TurboTechnics VSR301" },
  { icon: Wind, label: "Przepływ G3-Min-Flow" },
  { icon: Truck, label: "Wysyłka 24h · cała Polska" },
  { icon: Award, label: "15 lat na rynku turbo" },
];

export default function TrustBar() {
  return (
    <section
      aria-label="Najważniejsze przewagi TURBO-GIT"
      className="relative border-y border-white/5 bg-[var(--bg-secondary)]"
    >
      {/* Desktop — static grid */}
      <div className="hidden md:flex max-w-7xl mx-auto px-6 py-4 items-center justify-between gap-4 flex-wrap">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center gap-2.5 text-sm text-[var(--text)]"
          >
            <span className="w-7 h-7 rounded-sm flex items-center justify-center bg-[var(--orange)]/12 border border-[var(--orange)]/25">
              <it.icon className="w-3.5 h-3.5 text-[var(--orange)]" />
            </span>
            <span className="font-medium whitespace-nowrap">{it.label}</span>
          </div>
        ))}
      </div>

      {/* Mobile — marquee */}
      <div className="md:hidden relative overflow-hidden py-3">
        <div className="animate-marquee flex gap-6 w-max">
          {[...items, ...items].map((it, idx) => (
            <div
              key={`${it.label}-${idx}`}
              className="flex items-center gap-2 text-[13px] text-[var(--text)] whitespace-nowrap"
            >
              <it.icon className="w-3.5 h-3.5 text-[var(--orange)]" />
              <span className="font-medium">{it.label}</span>
              <span className="text-[var(--steel)]">·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
