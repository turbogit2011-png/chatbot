"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, ArrowRight, RotateCcw, CheckCircle2 } from "lucide-react";
import { SYMPTOMS, diagnose } from "@/lib/data";
import { Icon } from "@/components/Icon";
import { SectionHeader } from "@/components/Reveal";

const SEVERITY: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Niski priorytet", color: "var(--ok)", bg: "rgba(95,210,154,0.12)" },
  medium: { label: "Średni priorytet", color: "var(--warn)", bg: "rgba(224,177,90,0.12)" },
  high: { label: "Pilne", color: "var(--danger)", bg: "rgba(224,100,78,0.12)" },
};

export function SymptomChecker() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const report = useMemo(() => diagnose(selected), [selected]);

  return (
    <section id="diagnostyka" className="section-pad relative">
      <div className="container-pro">
        <SectionHeader
          eyebrow="Fault Console"
          title={
            <>
              Diagnostyka AI — <span className="text-gold-grad">konsola usterek</span>
            </>
          }
          intro="Zaznacz objawy swojej turbosprężarki. Nasz silnik diagnostyczny natychmiast wskaże prawdopodobną przyczynę i właściwą ścieżkę laboratoryjną."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Symptom selector */}
          <div className="panel p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <span className="flex items-center gap-2 font-tel text-xs uppercase tracking-[0.2em] text-titanium">
                <Stethoscope className="h-4 w-4 text-gold" />
                Wybierz objawy
              </span>
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  className="flex items-center gap-1.5 text-xs text-titanium transition-colors hover:text-gold-bright"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SYMPTOMS.map((s) => {
                const active = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`group flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                      active
                        ? "border-[var(--gold)] bg-[rgba(197,155,103,0.08)] glow-ring"
                        : "border-[var(--line)] bg-white/[0.02] hover:border-[var(--line-strong)]"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
                        active ? "bg-[var(--grad-gold)] text-[#1a1206]" : "bg-white/5 text-titanium"
                      }`}
                      style={active ? { background: "var(--grad-gold)" } : undefined}
                    >
                      <Icon name={s.icon} className="h-4 w-4" />
                    </span>
                    <span className={`text-sm font-medium ${active ? "text-ink" : "text-titanium"}`}>
                      {s.label}
                    </span>
                    {active && <CheckCircle2 className="ml-auto h-4 w-4 text-gold" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diagnosis output */}
          <div className="panel relative overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(197,155,103,0.16),transparent_70%)]" />
            <span className="flex items-center gap-2 font-tel text-xs uppercase tracking-[0.2em] text-titanium">
              <span className={`h-2 w-2 rounded-full ${report ? "bg-[var(--ok)] blink" : "bg-titanium"}`} />
              Raport diagnostyczny
            </span>

            <AnimatePresence mode="wait">
              {report ? (
                <motion.div
                  key={report.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="mt-5"
                >
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      color: SEVERITY[report.severity].color,
                      background: SEVERITY[report.severity].bg,
                    }}
                  >
                    {SEVERITY[report.severity].label}
                  </span>

                  <h3 className="mt-4 text-xl font-bold leading-snug text-ink">{report.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-titanium">{report.cause}</p>

                  <div className="mt-5 rounded-xl border border-[var(--line-strong)] bg-[rgba(197,155,103,0.05)] p-4">
                    <p className="font-tel text-[0.68rem] uppercase tracking-[0.18em] text-gold">
                      Zalecana ścieżka laboratoryjna
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-ink">{report.route}</p>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-titanium">{report.detail}</p>

                  <a href="#kontakt" className="btn-gold mt-6 w-full">
                    Zgłoś rdzeń do regeneracji <ArrowRight className="h-4 w-4" />
                  </a>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-5 grid place-items-center py-14 text-center"
                >
                  <Stethoscope className="h-10 w-10 text-[var(--titanium-dim)]" />
                  <p className="mt-4 max-w-xs text-sm text-titanium">
                    Zaznacz przynajmniej jeden objaw, aby wygenerować raport diagnostyczny.
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
