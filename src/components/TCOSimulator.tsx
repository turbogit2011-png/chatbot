"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Wallet } from "lucide-react";
import { SectionHeader } from "@/components/Reveal";

const MILESTONES = [0, 60000, 120000]; // km
const MILESTONE_LABELS = ["Zakup", "60 tys. km", "120 tys. km"];

type Series = { key: string; label: string; color: string; dim: string };
const SERIES: Series[] = [
  { key: "turbogit", label: "TURBO-GIT Premium", color: "#c59b67", dim: "rgba(197,155,103,0.15)" },
  { key: "replica", label: "Tania zamiennik (replika)", color: "#e0644e", dim: "rgba(224,100,78,0.12)" },
  { key: "oem", label: "Nowa część OEM", color: "#94969f", dim: "rgba(148,150,159,0.12)" },
];

function plculator(oemPrice: number, annualKm: number) {
  const premium = oemPrice * 0.45;
  const replica = oemPrice * 0.28;
  const replicaLifeKm = 50000;
  const labor = 700;
  const downtimePerSwap = Math.round(annualKm * 0.02);

  const at = (mileage: number) => {
    const oem = Math.round(oemPrice + (mileage / 60000) * oemPrice * 0.02);
    const turbogit = Math.round(premium + (mileage / 60000) * premium * 0.015);
    const swaps = Math.floor(mileage / replicaLifeKm);
    const replicaCost = Math.round(replica * (swaps + 1) + swaps * (labor + downtimePerSwap));
    return { oem, turbogit, replica: replicaCost };
  };

  return MILESTONES.map(at);
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("pl-PL")} zł`;

export function TCOSimulator() {
  const [annualKm, setAnnualKm] = useState(25000);
  const [oemPrice, setOemPrice] = useState(6000);

  const data = useMemo(() => plculator(oemPrice, annualKm), [oemPrice, annualKm]);

  const seriesData = useMemo(
    () => ({
      turbogit: data.map((d) => d.turbogit),
      replica: data.map((d) => d.replica),
      oem: data.map((d) => d.oem),
    }),
    [data]
  );

  const maxVal = useMemo(
    () => Math.max(...data.flatMap((d) => [d.turbogit, d.replica, d.oem])) * 1.1,
    [data]
  );

  // savings vs replica at 120k
  const final = data[data.length - 1];
  const savingsVsReplica = final.replica - final.turbogit;
  const savingsVsOem = final.oem - final.turbogit;

  // chart geometry
  const W = 560;
  const H = 320;
  const pad = { l: 56, r: 20, t: 24, b: 40 };
  const px = (i: number) =>
    pad.l + (i / (MILESTONES.length - 1)) * (W - pad.l - pad.r);
  const py = (v: number) => H - pad.b - (v / maxVal) * (H - pad.t - pad.b);

  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(v)}`).join(" ");
  const areaPath = (vals: number[]) =>
    `${linePath(vals)} L ${px(vals.length - 1)} ${H - pad.b} L ${px(0)} ${H - pad.b} Z`;

  const yTicks = 4;

  return (
    <section id="kalkulator" className="section-pad relative">
      <div className="container-pro">
        <SectionHeader
          eyebrow="TCO Simulator"
          title={
            <>
              Kalkulator <span className="text-gold-grad">oszczędności TCO</span>
            </>
          }
          intro="Porównaj całkowity koszt posiadania na przestrzeni 120 000 km. Przesuń suwaki, aby zobaczyć, jak regeneracja TURBO-GIT wypada wobec taniej repliki i nowej części OEM."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Controls + summary */}
          <div className="panel p-6 sm:p-8">
            <span className="flex items-center gap-2 font-tel text-xs uppercase tracking-[0.2em] text-titanium">
              <Wallet className="h-4 w-4 text-gold" /> Parametry
            </span>

            <div className="mt-7 space-y-8">
              <SliderRow
                label="Roczny przebieg"
                value={`${annualKm.toLocaleString("pl-PL")} km`}
                min={5000}
                max={60000}
                step={1000}
                v={annualKm}
                onChange={setAnnualKm}
              />
              <SliderRow
                label="Cena nowej części OEM"
                value={fmt(oemPrice)}
                min={2500}
                max={12000}
                step={250}
                v={oemPrice}
                onChange={setOemPrice}
              />
            </div>

            <div className="mt-8 divider-gold" />

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--line-strong)] bg-[rgba(197,155,103,0.06)] p-4">
                <TrendingDown className="h-8 w-8 shrink-0 text-gold" />
                <div>
                  <p className="font-tel text-[0.66rem] uppercase tracking-[0.16em] text-titanium">
                    Oszczędność vs replika (120 tys. km)
                  </p>
                  <p className="font-tel text-2xl font-bold text-gold-grad">{fmt(savingsVsReplica)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/[0.02] px-4 py-3 text-sm">
                <span className="text-titanium">Oszczędność vs nowa OEM</span>
                <span className="font-tel font-semibold text-ink">{fmt(savingsVsOem)}</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="panel p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              {SERIES.map((s) => (
                <span key={s.key} className="flex items-center gap-2 text-xs text-titanium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[480px]">
                {/* y grid + labels */}
                {Array.from({ length: yTicks + 1 }).map((_, i) => {
                  const val = (maxVal / yTicks) * i;
                  const y = py(val);
                  return (
                    <g key={i}>
                      <line
                        x1={pad.l}
                        y1={y}
                        x2={W - pad.r}
                        y2={y}
                        stroke="rgba(197,155,103,0.08)"
                        strokeWidth="1"
                      />
                      <text
                        x={pad.l - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="font-tel"
                        fontSize="10"
                        fill="#5b5d66"
                      >
                        {Math.round(val / 1000)}k
                      </text>
                    </g>
                  );
                })}

                {/* x labels */}
                {MILESTONE_LABELS.map((lab, i) => (
                  <text
                    key={lab}
                    x={px(i)}
                    y={H - pad.b + 22}
                    textAnchor="middle"
                    className="font-tel"
                    fontSize="11"
                    fill="#94969f"
                  >
                    {lab}
                  </text>
                ))}

                {/* areas + lines */}
                {SERIES.map((s) => {
                  const vals = seriesData[s.key as keyof typeof seriesData];
                  return (
                    <g key={s.key}>
                      <motion.path
                        d={areaPath(vals)}
                        fill={s.dim}
                        initial={false}
                        animate={{ d: areaPath(vals) }}
                        transition={{ duration: 0.5 }}
                      />
                      <motion.path
                        d={linePath(vals)}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={false}
                        animate={{ d: linePath(vals) }}
                        transition={{ duration: 0.5 }}
                      />
                      {vals.map((v, i) => (
                        <g key={i}>
                          <circle cx={px(i)} cy={py(v)} r="4" fill="#06060a" stroke={s.color} strokeWidth="2" />
                          {i === vals.length - 1 && (
                            <text
                              x={px(i) - 6}
                              y={py(v) - 10}
                              textAnchor="end"
                              className="font-tel"
                              fontSize="10"
                              fontWeight="700"
                              fill={s.color}
                            >
                              {fmt(v)}
                            </text>
                          )}
                        </g>
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>
            <p className="mt-3 text-xs text-titanium">
              Skumulowany koszt posiadania (zakup + serwis + ewentualne wymiany). Wartości
              orientacyjne — tania replika zwykle wymaga wymiany co ~50 tys. km.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  v,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  v: number;
  onChange: (n: number) => void;
}) {
  const fill = ((v - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-titanium">{label}</span>
        <span className="font-tel text-sm font-bold text-gold-bright">{value}</span>
      </div>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
      />
    </div>
  );
}
