"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Coins,
  Percent,
  Target,
  TrendingUp,
} from "lucide-react";
import { usePersistentState, useMounted } from "@/lib/store";
import { Aurora } from "@/components/ui/Aurora";
import {
  Currency,
  PlanInput,
  formatMoney,
  formatYears,
  monthsToTarget,
  requiredMonthly,
  requiredRate,
  simulate,
} from "@/lib/finance";

type Mode = "time" | "save" | "rate";

interface Plan {
  start: number;
  monthly: number;
  annualRatePct: number;
  growthPct: number;
  target: number;
  years: number;
  currency: Currency;
  mode: Mode;
  logScale: boolean;
}

const DEFAULT_PLAN: Plan = {
  start: 10000,
  monthly: 2000,
  annualRatePct: 8,
  growthPct: 5,
  target: 1_000_000_000,
  years: 30,
  currency: "PLN",
  mode: "time",
  logScale: true,
};

const MODE_META: Record<Mode, { label: string; icon: React.ReactNode }> = {
  time: { label: "Ile to potrwa?", icon: <CalendarClock size={15} /> },
  save: { label: "Ile odkładać?", icon: <Coins size={15} /> },
  rate: { label: "Jaki zwrot?", icon: <Percent size={15} /> },
};

const PRESETS: { label: string; value: number }[] = [
  { label: "1 mln", value: 1_000_000 },
  { label: "10 mln", value: 10_000_000 },
  { label: "100 mln", value: 100_000_000 },
  { label: "1 mld", value: 1_000_000_000 },
];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export default function WealthPlanner() {
  const [plan, setPlan] = usePersistentState<Plan>("momentum.wealth", DEFAULT_PLAN);
  const mounted = useMounted();

  const set = <K extends keyof Plan>(key: K, value: Plan[K]) =>
    setPlan((p) => ({ ...p, [key]: value }));

  const num = (key: "start" | "monthly", max: number) => (v: string) =>
    set(key, clamp(Math.round(Number(v) || 0), 0, max));

  // Resolve the unknown depending on mode.
  const resolved = useMemo(() => {
    const { start, monthly, annualRatePct, growthPct, target, years, mode } = plan;
    if (mode === "save") {
      const m = requiredMonthly(target, years, annualRatePct, start, growthPct);
      const input: PlanInput = {
        start,
        monthly: isFinite(m) ? m : monthly,
        annualRatePct,
        growthPct,
        target,
      };
      return { input, months: years * 12, computed: m };
    }
    if (mode === "rate") {
      const r = requiredRate(target, years, monthly, start, growthPct);
      const input: PlanInput = {
        start,
        monthly,
        annualRatePct: isFinite(r) ? r : annualRatePct,
        growthPct,
        target,
      };
      return { input, months: years * 12, computed: r };
    }
    const input: PlanInput = { start, monthly, annualRatePct, growthPct, target };
    return { input, months: monthsToTarget(input), computed: monthsToTarget(input) };
  }, [plan]);

  const horizonYears = clamp(
    Math.ceil(
      (isFinite(resolved.months) ? resolved.months : plan.years * 12) / 12
    ) + 1,
    1,
    80
  );

  const series = useMemo(
    () => simulate(resolved.input, horizonYears * 12),
    [resolved.input, horizonYears]
  );

  const c = plan.currency;

  // Milestones: when the resolved plan crosses each threshold.
  const milestones = useMemo(() => {
    const values = [1e5, 1e6, 1e7, 1e8, 1e9].filter((v) => v <= plan.target);
    if (!values.includes(plan.target)) values.push(plan.target);
    return values.map((v) => ({
      value: v,
      months: monthsToTarget({ ...resolved.input, target: v }),
    }));
  }, [resolved.input, plan.target]);

  const realityCheck = buildRealityCheck(plan, resolved.computed);

  if (!mounted) {
    return (
      <div className="relative min-h-screen">
        <Aurora />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-5" aria-hidden>
          <div className="card h-24 shimmer" />
          <div className="card h-16 shimmer" />
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card h-[520px] shimmer" />
            <div className="card h-[520px] shimmer" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Aurora />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors"
          >
            <ArrowLeft size={14} /> Wróć do Momentum
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold">
            <span className="text-gradient">Droga do Miliarda</span>
          </h1>
          <p className="text-[var(--text-muted)] mt-2 max-w-2xl">
            Planer bogactwa oparty na realnej matematyce procentu składanego. Pokaże
            Ci ile to potrwa, ile musisz odkładać albo jakiego zwrotu potrzebujesz.
          </p>
        </motion.header>

        {/* Honesty banner */}
        <div
          className="card p-4 mb-6 flex items-start gap-3"
          style={{ borderColor: "rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.05)" }}
        >
          <AlertTriangle size={18} className="text-[var(--amber)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-muted)]">
            <strong className="text-[var(--text)]">Szczerze:</strong> żadna apka nie
            zrobi z Ciebie miliardera. To narzędzie do planowania, nie maszynka do
            pieniędzy ani porada inwestycyjna. Realna droga do wielkiego majątku
            prawie zawsze prowadzi przez budowanie udziałów/firmy — nie przez samo
            odkładanie pensji.
          </p>
        </div>

        {/* Mode switch */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(MODE_META) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => set("mode", m)}
              className="btn text-sm"
              style={
                plan.mode === m
                  ? { background: "var(--grad-brand)", color: "#fff" }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }
              }
            >
              {MODE_META[m].icon}
              {MODE_META[m].label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Inputs */}
          <div className="card p-6">
            <span className="section-label mb-4">
              <Target size={14} /> Parametry
            </span>

            {/* Target + presets + currency */}
            <Field label="Cel">
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1000}
                  value={plan.target}
                  onChange={(e) => set("target", clamp(Math.round(Number(e.target.value) || 0), 1000, 1e15))}
                  className="input-field"
                />
                <select
                  value={plan.currency}
                  onChange={(e) => set("currency", e.target.value as Currency)}
                  className="input-field !w-20"
                >
                  <option value="PLN">zł</option>
                  <option value="USD">$</option>
                  <option value="EUR">€</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => set("target", p.value)}
                    className="chip"
                    style={
                      plan.target === p.value
                        ? { borderColor: "var(--violet)", color: "var(--violet)" }
                        : undefined
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Kapitał początkowy">
              <input
                type="number"
                min={0}
                value={plan.start}
                onChange={(e) => num("start", 1e15)(e.target.value)}
                className="input-field"
              />
            </Field>

            {plan.mode !== "save" && (
              <Field label="Miesięczna wpłata">
                <input
                  type="number"
                  min={0}
                  value={plan.monthly}
                  onChange={(e) => num("monthly", 1e12)(e.target.value)}
                  className="input-field"
                />
              </Field>
            )}

            {plan.mode !== "rate" && (
              <Field label="Roczna stopa zwrotu (%)">
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={plan.annualRatePct}
                  onChange={(e) => set("annualRatePct", clamp(Number(e.target.value) || 0, 0, 1000))}
                  className="input-field"
                />
                <RatePresets onPick={(r) => set("annualRatePct", r)} current={plan.annualRatePct} />
              </Field>
            )}

            {plan.mode !== "time" && (
              <Field label="Horyzont (lata)">
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={plan.years}
                  onChange={(e) => set("years", clamp(Math.round(Number(e.target.value) || 1), 1, 80))}
                  className="input-field"
                />
              </Field>
            )}

            <Field label="Roczny wzrost wpłaty (%)">
              <input
                type="number"
                min={0}
                step="1"
                value={plan.growthPct}
                onChange={(e) => set("growthPct", clamp(Number(e.target.value) || 0, 0, 100))}
                className="input-field"
              />
              <p className="text-[11px] text-[var(--text-subtle)] mt-1">
                O ile rośnie Twoja miesięczna wpłata co rok (awanse, rozwój biznesu).
              </p>
            </Field>
          </div>

          {/* Result + chart */}
          <div className="flex flex-col gap-5">
            <div className="card card-glow p-6">
              <span className="section-label mb-3">
                <TrendingUp size={14} /> Wynik
              </span>
              <Result plan={plan} resolved={resolved} />
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
                  Projekcja wzrostu
                </span>
                <button
                  onClick={() => set("logScale", !plan.logScale)}
                  className="chip"
                  title="Skala osi Y"
                >
                  skala: {plan.logScale ? "log" : "liniowa"}
                </button>
              </div>
              <GrowthChart
                series={series}
                target={plan.target}
                logScale={plan.logScale}
                currency={c}
              />
              <div className="flex items-center gap-4 mt-3 text-[11px] text-[var(--text-subtle)]">
                <Legend color="var(--violet)" label="Wartość portfela" />
                <Legend color="var(--text-subtle)" label="Twoje wpłaty" />
                <Legend color="var(--emerald)" label="Cel" dashed />
              </div>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="card p-6 mt-5">
          <span className="section-label mb-4">
            <CalendarClock size={14} /> Kamienie milowe
          </span>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {milestones.map((m) => (
              <div
                key={m.value}
                className="rounded-xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
              >
                <div className="font-display text-2xl text-gradient">
                  {formatMoney(m.value, c, true)}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  za {formatYears(m.months)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reality check */}
        {realityCheck && (
          <div
            className="card p-5 mt-5 flex items-start gap-3"
            style={{ borderColor: "rgba(251,113,133,0.35)", background: "rgba(251,113,133,0.06)" }}
          >
            <AlertTriangle size={18} className="text-[var(--rose)] shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--text-muted)]">
              <strong className="text-[var(--rose)]">Reality check:</strong>{" "}
              {realityCheck}
            </div>
          </div>
        )}

        <p className="text-[11px] text-[var(--text-subtle)] text-center mt-8">
          Obliczenia mają charakter edukacyjny i zakładają stały zwrot — rynek tak
          się nie zachowuje. To nie jest porada inwestycyjna. Dane zostają na Twoim
          urządzeniu.
        </p>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="text-xs text-[var(--text-muted)] mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function RatePresets({
  onPick,
  current,
}: {
  onPick: (r: number) => void;
  current: number;
}) {
  const presets = [
    { label: "Lokata 4%", r: 4 },
    { label: "Obligacje 6%", r: 6 },
    { label: "Indeks 8%", r: 8 },
    { label: "Agresywnie 12%", r: 12 },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {presets.map((p) => (
        <button
          key={p.r}
          onClick={() => onPick(p.r)}
          className="chip"
          style={current === p.r ? { borderColor: "var(--violet)", color: "var(--violet)" } : undefined}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function Result({
  plan,
  resolved,
}: {
  plan: Plan;
  resolved: { input: PlanInput; months: number; computed: number };
}) {
  if (plan.mode === "time") {
    const reached = isFinite(resolved.computed);
    return (
      <div>
        <div className="text-[var(--text-muted)] text-sm mb-1">
          Cel {formatMoney(plan.target, plan.currency, true)} osiągniesz za
        </div>
        <div className="font-display text-5xl sm:text-6xl text-gradient leading-none">
          {reached ? formatYears(resolved.computed) : "ponad 100 lat"}
        </div>
        {reached && (
          <div className="text-xs text-[var(--text-subtle)] mt-2">
            czyli w roku {new Date().getFullYear() + Math.ceil(resolved.computed / 12)}
          </div>
        )}
      </div>
    );
  }
  if (plan.mode === "save") {
    return (
      <div>
        <div className="text-[var(--text-muted)] text-sm mb-1">
          Aby trafić w {formatMoney(plan.target, plan.currency, true)} w {plan.years} lat,
          odkładaj miesięcznie
        </div>
        <div className="font-display text-5xl sm:text-6xl text-gradient leading-none">
          {formatMoney(resolved.computed, plan.currency)}
        </div>
        <div className="text-xs text-[var(--text-subtle)] mt-2">
          przy zwrocie {plan.annualRatePct}%/rok
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-[var(--text-muted)] text-sm mb-1">
        Aby trafić w {formatMoney(plan.target, plan.currency, true)} w {plan.years} lat,
        potrzebujesz rocznego zwrotu
      </div>
      <div className="font-display text-5xl sm:text-6xl text-gradient leading-none">
        {isFinite(resolved.computed)
          ? `${resolved.computed.toFixed(1)} %`
          : "> 1000 %"}
      </div>
      <div className="text-xs text-[var(--text-subtle)] mt-2">
        wpłacając {formatMoney(plan.monthly, plan.currency)} / mies.
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-4"
        style={{ borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}` }}
      />
      {label}
    </span>
  );
}

function GrowthChart({
  series,
  target,
  logScale,
  currency,
}: {
  series: { month: number; balance: number; contributed: number }[];
  target: number;
  logScale: boolean;
  currency: Currency;
}) {
  const W = 1000;
  const H = 300;
  const padL = 64;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  const months = series.length - 1;
  const maxVal = Math.max(target, ...series.map((p) => p.balance), 1);
  const minVal = logScale ? Math.max(1, series[0].balance || 1, target / 1e6) : 0;

  const x = (m: number) => padL + (m / months) * (W - padL - padR);
  const y = (v: number) => {
    const top = padT;
    const bottom = H - padB;
    if (logScale) {
      const lo = Math.log10(minVal);
      const hi = Math.log10(maxVal);
      const t = (Math.log10(Math.max(v, minVal)) - lo) / (hi - lo || 1);
      return bottom - t * (bottom - top);
    }
    return bottom - (v / maxVal) * (bottom - top);
  };

  const linePath = (key: "balance" | "contributed") =>
    series.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.month).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(" ");

  const areaPath =
    `M ${x(0)} ${H - padB} ` +
    series.map((p) => `L ${x(p.month).toFixed(1)} ${y(p.balance).toFixed(1)}`).join(" ") +
    ` L ${x(months)} ${H - padB} Z`;

  // Y gridlines.
  const ticks = logScale
    ? logTicks(minVal, maxVal)
    : [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxVal);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-64" preserveAspectRatio="none">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8B5CF6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
          <text x={padL - 8} y={y(t) + 3} textAnchor="end" fontSize="11" fill="#5A6072">
            {formatMoney(t, currency, true)}
          </text>
        </g>
      ))}

      {/* Target line */}
      <line
        x1={padL}
        y1={y(target)}
        x2={W - padR}
        y2={y(target)}
        stroke="#34D399"
        strokeWidth="1.5"
        strokeDasharray="6 5"
      />

      <path d={areaPath} fill="url(#area)" />
      <path d={linePath("contributed")} fill="none" stroke="#5A6072" strokeWidth="2" />
      <path d={linePath("balance")} fill="none" stroke="#8B5CF6" strokeWidth="2.5" />

      {/* X labels: start / mid / end years */}
      {[0, Math.floor(months / 2), months].map((m, i) => (
        <text
          key={i}
          x={x(m)}
          y={H - 8}
          textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
          fontSize="11"
          fill="#5A6072"
        >
          {Math.round(m / 12)} {m === 0 ? "" : "lat"}
        </text>
      ))}
    </svg>
  );
}

function logTicks(min: number, max: number): number[] {
  const lo = Math.ceil(Math.log10(min));
  const hi = Math.floor(Math.log10(max));
  const out: number[] = [];
  for (let e = lo; e <= hi; e++) out.push(Math.pow(10, e));
  if (out.length === 0) out.push(max);
  return out;
}

function buildRealityCheck(plan: Plan, computed: number): string | null {
  if (plan.mode === "time" && !isFinite(computed)) {
    return "Z tymi parametrami nie osiągniesz celu nawet w 100 lat. Zwiększ wpłatę, stopę zwrotu albo obniż cel.";
  }
  if (plan.mode === "rate" && (!isFinite(computed) || computed > 25)) {
    return "Potrzebny zwrot przekracza ~25%/rok. Dla porównania Warren Buffett osiągał ok. 20%/rok przez dekady. To praktycznie nieosiągalne przez samo inwestowanie — taki wynik daje zwykle udział w szybko rosnącej firmie.";
  }
  if (plan.mode === "save" && (!isFinite(computed) || computed > 200000)) {
    return "Wymagana miesięczna wpłata jest ogromna — w praktyce nie dorzucisz jej z pensji. To pokazuje, dlaczego do takich kwot dochodzi się przez budowanie wartościowej firmy, a nie odkładanie.";
  }
  if (plan.target >= 1_000_000_000) {
    return "Miliard to inna liga niż wolność finansowa. Statystycznie ~99% miliarderów dorobiło się na udziałach w firmie, którą zbudowali lub w którą wcześnie zainwestowali. Procent składany Cię tam dowiezie tylko z gigantycznym kapitałem lub czasem.";
  }
  return null;
}
