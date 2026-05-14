"use client";

import { motion } from "framer-motion";
import { ArrowRight, Phone, Clock, BadgePercent, FileText, UserRound, Wrench } from "lucide-react";
import { CONTACT } from "@/lib/brand";

const perks = [
  { icon: Clock, title: "Priorytetowa regeneracja 48h", desc: "Twoje zlecenia wchodzą na tor szybkiego ruchu." },
  { icon: BadgePercent, title: "Rabaty hurtowe", desc: "Skala cenowa w zależności od liczby turbo miesięcznie." },
  { icon: FileText, title: "Kredyt kupiecki + faktura odroczona", desc: "Płać po regeneracji, w terminach które wybierzesz." },
  { icon: UserRound, title: "Dedykowany opiekun techniczny", desc: "Jeden telefon, jedna osoba, brak przerzucania zleceń." },
  { icon: Wrench, title: "Konsultacje techniczne", desc: "Diagnoza problemu i dobór turbo — telefonicznie." },
];

export default function B2BSection() {
  return (
    <section
      id="b2b"
      className="relative py-20 sm:py-28 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #14161A 0%, #1A1010 60%, #14161A 100%)",
      }}
    >
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-[var(--red)]/12 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-[var(--orange)]/10 blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
          <div>
            <span className="hud-label text-[var(--orange)] block mb-3">
              Strefa B2B · partnerzy warsztatowi
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-5">
              Prowadzisz warsztat?{" "}
              <span className="text-gradient">Mamy dla Ciebie inne zasady gry.</span>
            </h2>
            <p className="text-[var(--text-muted)] text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
              Priorytetowa regeneracja 48h. Rabaty hurtowe. Kredyt kupiecki.
              Dedykowany opiekun techniczny pod telefonem. Jedno konto, jedna
              faktura, jeden numer — bez przepychania zleceń.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="#kontakt"
                className="btn-primary scanline inline-flex items-center gap-2"
              >
                Załóż konto B2B
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={CONTACT.phoneTel}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-[var(--orange)]" />
                Dział warsztatów
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <div className="font-display text-2xl text-gradient">48h</div>
                <div className="hud-label">Priorytet B2B</div>
              </div>
              <div>
                <div className="font-display text-2xl text-white">−25%</div>
                <div className="hud-label">Rabat startowy</div>
              </div>
              <div>
                <div className="font-display text-2xl text-white">30 dni</div>
                <div className="hud-label">Termin płatności</div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {perks.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="card-premium p-5 flex gap-3.5"
              >
                <span className="w-9 h-9 rounded-sm flex-shrink-0 flex items-center justify-center bg-[var(--orange)]/12 border border-[var(--orange)]/25">
                  <p.icon className="w-4 h-4 text-[var(--orange)]" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    {p.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
