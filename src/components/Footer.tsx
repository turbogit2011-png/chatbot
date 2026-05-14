"use client";

import { Phone, Mail, MapPin, ArrowUp, MessageCircle } from "lucide-react";
import { BRAND, CONTACT } from "@/lib/brand";

const links = {
  oferta: [
    { label: "Regeneracja turbosprężarek", href: "#technologia" },
    { label: "Sklep z turbosprężarkami", href: "/sklep" },
    { label: "Dobór turbo (OEM / VIN)", href: "#dobor-turbo" },
    { label: "Kalibracja zmiennej geometrii", href: "#technologia" },
    { label: "Aktuatory elektroniczne", href: "#technologia" },
    { label: "Strefa B2B dla warsztatów", href: "#b2b" },
  ],
  marki: [
    "Audi", "Volkswagen", "BMW", "Mercedes-Benz",
    "Ford", "Opel", "Renault", "Peugeot",
    "Skoda", "Volvo", "Citroën", "Fiat",
  ],
  info: [
    { label: "Gwarancja 24 mc", href: "#faq" },
    { label: "FAQ", href: "#faq" },
    { label: "Wysyłka i zwroty", href: "#faq" },
    { label: "Polityka prywatności", href: "#" },
    { label: "Regulamin sklepu", href: "#" },
  ],
};

export default function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 bg-[var(--bg-primary)]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,90,31,0.05), transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="py-12 sm:py-14 border-b border-white/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-sm bg-gradient-to-br from-[var(--orange)] to-[var(--red)] flex items-center justify-center shadow-[0_0_24px_rgba(255,90,31,0.4)]">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" aria-hidden>
                    <g fill="currentColor">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <path
                          key={i}
                          d="M12 12 Q 15 7 19 9 Q 16 11 12 12 Z"
                          transform={`rotate(${i * 60} 12 12)`}
                        />
                      ))}
                      <circle cx="12" cy="12" r="2.5" fill="#0A0B0D" />
                    </g>
                  </svg>
                </div>
                <div className="leading-none">
                  <div className="font-display text-lg tracking-tight text-white">
                    TURBO<span className="text-[var(--orange)]">-GIT</span>
                  </div>
                  <div className="hud-label text-[8px] mt-0.5">
                    PREMIUM TURBO LAB
                  </div>
                </div>
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-5">
                Regeneracja turbosprężarek z nowym rdzeniem CHRA, wyważaniem
                TurboTechnics VSR301 i ustawianiem przepływu G3-Min-Flow.
                {" "}
                {BRAND.experienceYears} lat doświadczenia, gwarancja 24 mc.
              </p>
              <div className="flex flex-col gap-2.5">
                <a
                  href={CONTACT.phoneTel}
                  className="flex items-center gap-2 text-sm text-white hover:text-[var(--orange)] transition-colors font-mono-tech"
                >
                  <Phone className="w-4 h-4 text-[var(--orange)] flex-shrink-0" />
                  {CONTACT.phoneDisplay}
                </a>
                <a
                  href={CONTACT.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--green)] transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[var(--green)] flex-shrink-0" />
                  WhatsApp
                </a>
                <a
                  href={CONTACT.emailMailto}
                  className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--orange)] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[var(--orange)] flex-shrink-0" />
                  {CONTACT.email}
                </a>
                <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                  <MapPin className="w-4 h-4 text-[var(--orange)] flex-shrink-0 mt-0.5" />
                  <span>
                    {CONTACT.address.street}, {CONTACT.address.postalCode}{" "}
                    {CONTACT.address.city}
                  </span>
                </div>
              </div>
            </div>

            {/* Offer */}
            <div>
              <h4 className="hud-label text-white mb-4">Oferta</h4>
              <ul className="flex flex-col gap-2.5">
                {links.oferta.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--orange)] transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Brands */}
            <div>
              <h4 className="hud-label text-white mb-4">Marki aut</h4>
              <ul className="grid grid-cols-2 gap-x-2 gap-y-2">
                {links.marki.map((m) => (
                  <li key={m}>
                    <a
                      href="/sklep"
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--orange)] transition-colors"
                    >
                      {m}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA + info */}
            <div>
              <h4 className="hud-label text-white mb-4">Zadzwoń teraz</h4>
              <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
                {CONTACT.hours.weekday}
                <br />
                {CONTACT.hours.saturday}
              </p>
              <a
                href={CONTACT.phoneTel}
                className="btn-primary scanline flex items-center justify-center gap-2 text-sm mb-2.5"
              >
                <Phone className="w-4 h-4" />
                {CONTACT.phoneDisplay}
              </a>
              <a
                href="#dobor-turbo"
                className="btn-secondary flex items-center justify-center text-sm"
              >
                Dobierz turbosprężarkę
              </a>

              <ul className="mt-6 flex flex-col gap-2">
                {links.info.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-subtle)]">
            © {new Date().getFullYear()} {BRAND.name}. Wszelkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-4 text-xs text-[var(--text-subtle)]">
            <span>Wrocław · cała Polska</span>
            <span className="text-[var(--steel)]">·</span>
            <span>NIP / REGON: —</span>
          </div>
          <button
            onClick={scrollTop}
            className="w-9 h-9 rounded-sm border border-white/10 flex items-center justify-center hover:border-[var(--orange)]/40 hover:bg-[var(--orange)]/10 transition-all"
            aria-label="Do góry"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
