"use client";

import { motion } from "framer-motion";
import { Gauge, Wind, Cpu } from "lucide-react";

type Tech = {
  icon: typeof Gauge;
  badge: string;
  title: string;
  subtitle: string;
  desc: string;
  metrics: { label: string; value: string }[];
};

const items: Tech[] = [
  {
    icon: Gauge,
    badge: "01 · WYWAŻANIE",
    title: "TurboTechnics VSR301",
    subtitle: "Wyważanie wysokoobrotowe",
    desc:
      "Brytyjska maszyna używana w motorsporcie i przy turbo do aut wyścigowych. Wyważamy każdy wałek z rdzeniem CHRA pod realnym obciążeniem, nie statycznie.",
    metrics: [
      { label: "RPM MAX", value: "250 000" },
      { label: "TOLERANCJA", value: "±0.05 g" },
      { label: "RAPORT", value: "Cyfrowy" },
    ],
  },
  {
    icon: Wind,
    badge: "02 · PRZEPŁYW",
    title: "G3-Min-Flow",
    subtitle: "Ustawianie przepływu G3 Concept",
    desc:
      "Każda turbina jest indywidualnie kalibrowana pod jej charakterystykę przepływu — nie na „oko”, nie uniwersalnie. To gwarantuje pełne ciśnienie doładowania na każdym obrocie.",
    metrics: [
      { label: "TOLERANCJA", value: "±2%" },
      { label: "POMIAR", value: "Cyfrowy" },
      { label: "PROCEDURA", value: "G3 Concept" },
    ],
  },
  {
    icon: Cpu,
    badge: "03 · GEOMETRIA",
    title: "G3-REA-MASTER",
    subtitle: "Kalibracja zmiennej geometrii",
    desc:
      "Profesjonalne stanowisko do kalibracji aktuatorów elektronicznych Hella, Siemens, Mitsubishi i aktuatorów pneumatycznych. Pełna procedura, nie ustawianie multimetrem.",
    metrics: [
      { label: "ZAKRES", value: "Wszystkie typy" },
      { label: "ELEKTRONIKA", value: "Hella · SREA" },
      { label: "PNEUMATYKA", value: "Tak" },
    ],
  },
];

export default function TechStack() {
  return (
    <section
      id="technologia"
      className="relative py-20 sm:py-28 bg-[var(--bg-secondary)] overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--orange)]/8 blur-[120px] pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-14">
          <span className="hud-label text-[var(--orange)] block mb-3">
            Technologia regeneracji · turbo lab
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-4">
            Cztery filary, na których stoi każda turbosprężarka z{" "}
            <span className="text-gradient">TURBO-GIT</span>.
          </h2>
          <p className="text-[var(--text-muted)] text-base sm:text-lg">
            Nie regenerujemy „na warsztacie”. Budujemy turbosprężarki w
            laboratorium — z pełną procedurą, raportem pomiarowym i tolerancjami
            fabrycznymi.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="card-premium p-6 sm:p-7 flex flex-col"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="hud-label text-[var(--orange)]">
                  {item.badge}
                </span>
                <item.icon className="w-5 h-5 text-[var(--steel-light)]" />
              </div>
              <h3 className="font-display text-2xl text-white mb-1 tracking-tight">
                {item.title}
              </h3>
              <p className="text-sm text-[var(--orange)] mb-4 font-medium">
                {item.subtitle}
              </p>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6 flex-1">
                {item.desc}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-5 border-t border-white/5">
                {item.metrics.map((m) => (
                  <div key={m.label}>
                    <div className="hud-label mb-1">{m.label}</div>
                    <div className="font-mono-tech text-sm text-white">
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            </motion.article>
          ))}

          {/* Fourth pillar — new CHRA — full width on lg, full row */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="card-premium p-6 sm:p-8 md:col-span-2 lg:col-span-3 relative overflow-hidden"
          >
            <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center relative z-10">
              <div>
                <span className="hud-label text-[var(--orange)] block mb-3">
                  04 · RDZEŃ
                </span>
                <h3 className="font-display text-2xl sm:text-3xl text-white mb-2 tracking-tight">
                  Nowy rdzeń CHRA — nie regenerowany
                </h3>
                <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-2xl leading-relaxed">
                  Regenerowany CHRA to używany rdzeń, w którym wymieniono część
                  komponentów. Nowy CHRA to{" "}
                  <span className="text-white font-medium">
                    kompletnie nowy zespół
                  </span>{" "}
                  — fabrycznie nowe łożyska, wałek, koło sprężające i pierścienie
                  tłokowe. W TURBO-GIT stosujemy wyłącznie nowe CHRA, bo tylko
                  one gwarantują tolerancje fabryczne i pełne 24 miesiące
                  pracy.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end">
                <div className="text-right">
                  <div className="font-mono-tech text-3xl sm:text-4xl text-gradient">
                    100%
                  </div>
                  <div className="hud-label">Nowy zespół</div>
                </div>
                <div className="text-right">
                  <div className="font-mono-tech text-2xl text-white">0 km</div>
                  <div className="hud-label">Limit gwarancji</div>
                </div>
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-[280px] h-[280px] rounded-full bg-[var(--orange)]/8 blur-3xl pointer-events-none" />
          </motion.article>
        </div>
      </div>
    </section>
  );
}
