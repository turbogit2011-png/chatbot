"use client";

import { motion } from "framer-motion";
import { WORKFLOW } from "@/lib/data";
import { Icon } from "@/components/Icon";
import { SectionHeader } from "@/components/Reveal";

export function LabWorkflow() {
  return (
    <section id="proces" className="section-pad relative">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
      <div className="container-pro relative">
        <SectionHeader
          eyebrow="Lab Pipeline"
          title={
            <>
              7 etapów <span className="text-gold-grad">regeneracji</span>
            </>
          }
          intro="Każdy rdzeń przechodzi tę samą, rygorystyczną sekwencję laboratoryjną — od mycia ultradźwiękowego po wydruk protokołu pomiarowego."
        />

        <div className="relative mt-14">
          {/* connecting spine (desktop) */}
          <div className="pointer-events-none absolute left-0 right-0 top-[39px] hidden h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent lg:block" />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-7 lg:gap-3">
            {WORKFLOW.map((w, i) => (
              <motion.div
                key={w.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="group relative"
              >
                <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                  {/* node */}
                  <div className="relative z-10 grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--panel)] transition-all duration-300 group-hover:border-[var(--gold)] group-hover:glow-ring">
                    <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--grad-gold)] font-tel text-xs font-bold text-[#1a1206]" style={{ background: "var(--grad-gold)" }}>
                      {w.step}
                    </span>
                    <Icon name={w.icon} className="h-7 w-7 text-gold transition-transform duration-300 group-hover:scale-110" />
                  </div>

                  <div className="lg:mt-4">
                    <h3 className="text-sm font-bold leading-snug text-ink">{w.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-titanium">{w.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
