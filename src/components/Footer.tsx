"use client";

import { Phone, Mail, MapPin, ArrowUp } from "lucide-react";

const links = {
  uslugi: [
    "Regeneracja turbosprężarek",
    "Regeneracja wtryskiwaczy",
    "Regeneracja DPF/FAP",
    "Serwis pomp wtryskowych",
    "Chip tuning",
    "Diagnostyka komputerowa",
  ],
  firma: ["O nas", "Jak działamy", "Cennik", "Gwarancja", "Realizacje", "Blog"],
  info: ["FAQ", "Wysyłka kurierska", "Regulamin", "Polityka prywatności"],
};

export default function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 bg-[var(--bg-primary)]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(212,168,67,0.04), transparent 60%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top strip */}
        <div className="py-12 border-b border-white/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <svg viewBox="0 0 36 36" className="w-9 h-9 flex-shrink-0" fill="none">
                  <circle cx="18" cy="18" r="16" stroke="rgba(212,168,67,.25)" strokeWidth=".75"/>
                  {[0,45,90,135,180,225,270,315].map((d,i)=>(
                    <g key={i} transform={`rotate(${d} 18 18)`}>
                      <path d="M18 18 L20 5 Q18 3.5 16 5 Z" fill={`rgba(212,168,67,${.35+i*.04})`} stroke="rgba(212,168,67,.5)" strokeWidth=".4"/>
                    </g>
                  ))}
                  <circle cx="18" cy="18" r="5" fill="#080710" stroke="rgba(212,168,67,.6)" strokeWidth=".75"/>
                  <circle cx="18" cy="18" r="2.2" fill="rgba(212,168,67,.8)"/>
                  <path d="M 5 18 A 13 13 0 0 1 18 5" stroke="rgba(0,207,255,.55)" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                <div className="leading-none">
                  <span className="font-display text-[1.1rem] tracking-[.14em] text-white block">TURBO</span>
                  <span className="font-display text-[1.1rem] tracking-[.14em] text-[var(--gold)] block">GIT</span>
                </div>
              </div>
              <p className="text-sm text-[var(--text-subtle)] leading-relaxed mb-5">
                Profesjonalna regeneracja turbosprężarek i filtrów DPF od 2014 roku.
                Nowe uszczelki, komponenty premium. Gwarancja 12 miesięcy.
              </p>
              <div className="flex flex-col gap-2.5">
                <a href="tel:+48000000000" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors">
                  <Phone className="w-4 h-4 text-[var(--gold)] flex-shrink-0" />
                  +48 000 000 000
                </a>
                <a href="mailto:kontakt@turbo-git.com" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors">
                  <Mail className="w-4 h-4 text-[var(--gold)] flex-shrink-0" />
                  kontakt@turbo-git.com
                </a>
                <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                  <MapPin className="w-4 h-4 text-[var(--gold)] flex-shrink-0 mt-0.5" />
                  ul. Przykładowa 1, 00-000 Miasto
                </div>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Usługi</h4>
              <ul className="flex flex-col gap-2.5">
                {links.uslugi.map((l) => (
                  <li key={l}>
                    <a href="#uslugi" onClick={(e) => { e.preventDefault(); document.querySelector("#uslugi")?.scrollIntoView({ behavior: "smooth" }); }}
                      className="text-sm text-[var(--text-subtle)] hover:text-[var(--gold)] transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Firma</h4>
              <ul className="flex flex-col gap-2.5">
                {links.firma.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-[var(--text-subtle)] hover:text-[var(--gold)] transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Zadzwoń teraz</h4>
              <p className="text-sm text-[var(--text-subtle)] mb-4 leading-relaxed">
                Pn–Pt: 8:00–18:00
                <br />Sobota: 9:00–13:00
              </p>
              <a
                href="tel:+48000000000"
                className="btn-primary flex items-center justify-center gap-2 text-sm mb-3"
              >
                <Phone className="w-4 h-4" />
                Zadzwoń
              </a>
              <a
                href="#kontakt"
                onClick={(e) => { e.preventDefault(); document.querySelector("#kontakt")?.scrollIntoView({ behavior: "smooth" }); }}
                className="btn-secondary flex items-center justify-center text-sm"
              >
                Wyślij wiadomość
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-subtle)]">
            © {new Date().getFullYear()} TURBO-GIT. Wszelkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-6">
            {links.info.map((l) => (
              <a key={l} href="#" className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors">
                {l}
              </a>
            ))}
          </div>
          <button
            onClick={scrollTop}
            className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/10 transition-all"
            aria-label="Do góry"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
