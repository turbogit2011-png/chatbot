"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, CheckCircle2, ChevronRight } from "lucide-react";
import {
  TURBO_DB,
  STOCK_LABEL,
  CURRENCY,
  type Currency,
  type TurboRecord,
} from "@/lib/data";
import { useSelection } from "@/lib/selection";
import { SectionHeader } from "@/components/Reveal";

const TONE: Record<string, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  copper: "var(--copper)",
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

export function TurboFinder() {
  const { setSelected } = useSelection();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [engine, setEngine] = useState("");
  const [currency, setCurrency] = useState<Currency>("PLN");

  const brands = useMemo(() => uniq(TURBO_DB.map((t) => t.brand)), []);
  const models = useMemo(
    () => (brand ? uniq(TURBO_DB.filter((t) => t.brand === brand).map((t) => t.model)) : []),
    [brand]
  );
  const engines = useMemo(
    () =>
      brand && model
        ? uniq(
            TURBO_DB.filter((t) => t.brand === brand && t.model === model).map((t) => t.engine)
          )
        : [],
    [brand, model]
  );

  const result: TurboRecord | undefined = useMemo(
    () =>
      brand && model && engine
        ? TURBO_DB.find((t) => t.brand === brand && t.model === model && t.engine === engine)
        : undefined,
    [brand, model, engine]
  );

  const onBrand = (v: string) => {
    setBrand(v);
    setModel("");
    setEngine("");
  };
  const onModel = (v: string) => {
    setModel(v);
    setEngine("");
  };

  const renderPrice = (eur: number) => {
    const c = CURRENCY[currency];
    const val = Math.round(eur * c.rate);
    return currency === "PLN"
      ? `${val.toLocaleString("pl-PL")} ${c.symbol}`
      : `${c.symbol}${val.toLocaleString("en-US")}`;
  };

  const steps = [
    { n: 1, label: "Marka", done: !!brand },
    { n: 2, label: "Model / Rok", done: !!model },
    { n: 3, label: "Kod silnika", done: !!engine },
  ];

  return (
    <section id="finder" className="section-pad relative bg-[var(--obsidian-2)]">
      <div className="container-pro">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeader
            eyebrow="Turbo Finder 2.0"
            title={
              <>
                Konfigurator <span className="text-gold-grad">komponentu</span>
              </>
            }
            intro="Trzystopniowy dobór turbosprężarki do Twojego pojazdu. Wybierz markę, model i kod silnika, a system wyświetli dopasowaną specyfikację, dostępność i cenę."
          />

          {/* currency switch */}
          <div className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1">
            {(Object.keys(CURRENCY) as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`rounded-lg px-3 py-1.5 font-tel text-xs font-semibold transition-all ${
                  currency === c ? "bg-[var(--grad-gold)] text-[#1a1206]" : "text-titanium hover:text-ink"
                }`}
                style={currency === c ? { background: "var(--grad-gold)" } : undefined}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Cascading dropdowns */}
          <div className="panel p-6 sm:p-8">
            {/* step indicators */}
            <div className="mb-6 flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={s.n} className="flex flex-1 items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-tel text-xs font-bold transition-colors ${
                        s.done
                          ? "bg-[var(--grad-gold)] text-[#1a1206]"
                          : "border border-[var(--line-strong)] text-titanium"
                      }`}
                      style={s.done ? { background: "var(--grad-gold)" } : undefined}
                    >
                      {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                    </span>
                    <span className="hidden text-xs font-medium text-titanium sm:block">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--titanium-dim)]" />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <Field label="Marka pojazdu">
                <select className="field" value={brand} onChange={(e) => onBrand(e.target.value)}>
                  <option value="">— wybierz markę —</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Model / Rocznik">
                <select
                  className="field"
                  value={model}
                  onChange={(e) => onModel(e.target.value)}
                  disabled={!brand}
                >
                  <option value="">{brand ? "— wybierz model —" : "najpierw wybierz markę"}</option>
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Kod silnika">
                <select
                  className="field"
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  disabled={!model}
                >
                  <option value="">{model ? "— wybierz silnik —" : "najpierw wybierz model"}</option>
                  {engines.map((en) => (
                    <option key={en} value={en}>
                      {en}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Output pane */}
          <div className="panel relative overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(166,110,78,0.18),transparent_70%)]" />
            <span className="flex items-center gap-2 font-tel text-xs uppercase tracking-[0.2em] text-titanium">
              <Search className="h-4 w-4 text-gold" /> Wynik dopasowania
            </span>

            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key={result.partNo}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="mt-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-ink">
                        {result.brand} · {result.engine}
                      </p>
                      <p className="text-sm text-titanium">{result.model}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        color: TONE[STOCK_LABEL[result.stock].tone],
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${TONE[STOCK_LABEL[result.stock].tone]}33`,
                      }}
                    >
                      {STOCK_LABEL[result.stock].label}
                    </span>
                  </div>

                  <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)]">
                    <Spec k="Producent OEM" v={result.oem} />
                    <Spec k="Numer części" v={result.partNo} mono />
                    <Spec k="Moc" v={result.power} />
                    <Spec k="Stanowisko" v="VSR 301 + G3" />
                  </dl>

                  <div className="mt-6 flex items-end justify-between rounded-xl border border-[var(--line-strong)] bg-[rgba(197,155,103,0.05)] p-5">
                    <div>
                      <p className="font-tel text-[0.66rem] uppercase tracking-[0.18em] text-titanium">
                        Cena regeneracji
                      </p>
                      <p className="mt-1 font-tel text-3xl font-bold text-gold-grad">
                        {renderPrice(result.priceEUR)}
                      </p>
                      <p className="mt-0.5 text-xs text-titanium">
                        z gwarancją 24 mc · protokół w zestawie
                      </p>
                    </div>
                    <Package className="h-8 w-8 text-copper" />
                  </div>

                  <button
                    onClick={() => {
                      setSelected(result);
                      document.getElementById("kontakt")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="btn-gold mt-5 w-full"
                  >
                    Wyślij do wyceny <ChevronRight className="h-4 w-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-5 grid place-items-center py-16 text-center"
                >
                  <Package className="h-10 w-10 text-[var(--titanium-dim)]" />
                  <p className="mt-4 max-w-xs text-sm text-titanium">
                    Uzupełnij trzy kroki konfiguracji, aby zobaczyć dopasowaną turbosprężarkę.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-tel text-[0.68rem] uppercase tracking-[0.16em] text-titanium">
        {label}
      </span>
      {children}
    </label>
  );
}

function Spec({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="bg-[var(--panel)] px-4 py-3">
      <dt className="text-[0.68rem] uppercase tracking-wide text-titanium">{k}</dt>
      <dd className={`mt-0.5 text-sm font-semibold text-ink ${mono ? "font-tel" : ""}`}>{v}</dd>
    </div>
  );
}
