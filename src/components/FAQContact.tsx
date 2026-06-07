"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  HelpCircle,
} from "lucide-react";
import { FAQ_ITEMS, BUSINESS } from "@/lib/data";
import { useSelection } from "@/lib/selection";
import { SectionHeader } from "@/components/Reveal";

export function FAQContact() {
  return (
    <section id="kontakt" className="section-pad relative">
      <div className="container-pro">
        <SectionHeader
          eyebrow="Wsparcie & Kontakt"
          title={
            <>
              FAQ i <span className="text-gold-grad">konsola przyjęć</span>
            </>
          }
          intro="Najczęstsze pytania o system wymiany i gwarancję oraz formularz przyjęcia rdzenia do regeneracji."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Accordion />
          <ContactConsole />
        </div>
      </div>
    </section>
  );
}

function Accordion() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className={`panel overflow-hidden transition-colors ${
              isOpen ? "border-[var(--line-strong)]" : ""
            }`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="flex items-center gap-3">
                <HelpCircle
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isOpen ? "text-gold" : "text-[var(--titanium-dim)]"
                  }`}
                />
                <span className={`text-sm font-semibold ${isOpen ? "text-ink" : "text-titanium"}`}>
                  {item.q}
                </span>
              </span>
              <Plus
                className={`h-4 w-4 shrink-0 text-gold transition-transform duration-300 ${
                  isOpen ? "rotate-45" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 pl-12 text-sm leading-relaxed text-titanium">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function ContactConsole() {
  const { selected } = useSelection();
  const [engine, setEngine] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  // Dynamic pre-fill from Turbo Finder: adjust state during render when the
  // selection changes (React's recommended pattern over a setState-in-effect).
  const [prevSelected, setPrevSelected] = useState(selected);
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    if (selected) {
      setEngine(`${selected.brand} · ${selected.engine} (${selected.partNo})`);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="panel relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(197,155,103,0.14),transparent_70%)]" />

      {/* contact strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <InfoTile icon={<MapPin className="h-4 w-4" />} title="Lokalizacja" value={BUSINESS.address} sub={BUSINESS.region} />
        <InfoTile icon={<Clock className="h-4 w-4" />} title="Odbiór / zwrot" value={`Kurier ${BUSINESS.pickupHours}`} sub="cała Polska" />
        <InfoTile icon={<Phone className="h-4 w-4" />} title="Telefon" value={BUSINESS.phone} />
        <InfoTile icon={<Mail className="h-4 w-4" />} title="E-mail" value={BUSINESS.email} />
      </div>

      <div className="my-6 divider-gold" />

      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid place-items-center rounded-xl border border-[var(--line-strong)] bg-[rgba(95,210,154,0.06)] py-12 text-center"
        >
          <CheckCircle2 className="h-12 w-12 text-[var(--ok)]" />
          <h3 className="mt-4 text-lg font-bold text-ink">Zgłoszenie wysłane</h3>
          <p className="mt-2 max-w-xs text-sm text-titanium">
            Skontaktujemy się, aby ustalić ekspresowy odbiór rdzenia kurierem.
          </p>
          <button onClick={() => setSent(false)} className="btn-ghost mt-6 text-sm">
            Nowe zgłoszenie
          </button>
        </motion.div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-1.5 block font-tel text-[0.68rem] uppercase tracking-[0.16em] text-titanium">
              Blok silnika {selected && <span className="text-gold">· z Turbo Finder</span>}
            </span>
            <input
              className="field"
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              placeholder="np. BMW · N47D20 — lub dobierz w Turbo Finder"
              style={selected ? { borderColor: "var(--line-strong)" } : undefined}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-tel text-[0.68rem] uppercase tracking-[0.16em] text-titanium">
                Imię i nazwisko
              </span>
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jan Kowalski"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-tel text-[0.68rem] uppercase tracking-[0.16em] text-titanium">
                Telefon
              </span>
              <input
                className="field"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+48 600 000 000"
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-tel text-[0.68rem] uppercase tracking-[0.16em] text-titanium">
              Opis usterki
            </span>
            <textarea
              className="field min-h-28 resize-y"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Opisz objawy lub załącz wynik diagnozy AI…"
            />
          </label>

          <button type="submit" className="btn-gold w-full">
            Zamów odbiór rdzenia <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}

function InfoTile({
  icon,
  title,
  value,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white/[0.02] p-3.5">
      <span className="flex items-center gap-2 font-tel text-[0.62rem] uppercase tracking-[0.16em] text-gold">
        {icon} {title}
      </span>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-ink">{value}</p>
      {sub && <p className="text-xs text-titanium">{sub}</p>}
    </div>
  );
}
