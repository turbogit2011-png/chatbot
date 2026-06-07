"use client";

import { Phone, Mail, MapPin, ArrowUp } from "lucide-react";

const links = {
  kategorie: ["Audi / VW / Skoda", "BMW / Mercedes", "Ford / Opel / Renault", "Volvo / Toyota", "Ciężarowe / TIR", "Wszystkie marki"],
  firma:     ["O nas", "Jak działamy", "Gwarancja 24M", "Program B2B", "Blog", "Realizacje"],
  info:      ["FAQ", "Wysyłka i zwroty", "Regulamin", "Polityka prywatności"],
};

const scrollTo = (id: string) =>
  document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 bg-[#07090E]" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,107,26,0.04), transparent 60%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="py-12 border-b border-white/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B1A] to-[#FF3D00] flex items-center justify-center shadow-[0_0_20px_rgba(255,107,26,0.3)]">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2a8 8 0 0 1 5.56 13.7L6.3 6.44A7.96 7.96 0 0 1 12 4Zm0 16a8 8 0 0 1-5.56-13.7L17.7 17.56A7.96 7.96 0 0 1 12 20Z"/>
                  </svg>
                </div>
                <div>
                  <span className="font-display text-xl tracking-wider text-white leading-none">TURBO</span>
                  <span className="font-display text-xl tracking-wider text-[#FF6B1A] leading-none">-GIT</span>
                </div>
              </div>
              <p className="text-sm text-[#4A5568] leading-relaxed mb-5">
                Regenerowane turbosprężarki z gwarancją 24 miesięcy.
                8&nbsp;000+ modeli w magazynie. Wysyłka w 24h. Od 2012 roku.
              </p>
              <div className="flex flex-col gap-2.5">
                <a href="tel:+48694706140" className="flex items-center gap-2 text-sm text-[#8A9BB0] hover:text-[#FF6B1A] transition-colors">
                  <Phone className="w-4 h-4 text-[#FF6B1A] flex-shrink-0" />
                  +48 694 706 140
                </a>
                <a href="mailto:info@turbo-git.com" className="flex items-center gap-2 text-sm text-[#8A9BB0] hover:text-[#FF6B1A] transition-colors">
                  <Mail className="w-4 h-4 text-[#FF6B1A] flex-shrink-0" />
                  info@turbo-git.com
                </a>
                <div className="flex items-start gap-2 text-sm text-[#8A9BB0]">
                  <MapPin className="w-4 h-4 text-[#FF6B1A] flex-shrink-0 mt-0.5" />
                  ul. Wrocławska 7, 55-095 Januszkowice
                </div>
              </div>
            </div>

            {/* Kategorie */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Kategorie</h4>
              <ul className="flex flex-col gap-2.5">
                {links.kategorie.map((l) => (
                  <li key={l}>
                    <a href="#kategorie" onClick={(e) => { e.preventDefault(); scrollTo("#kategorie"); }}
                      className="text-sm text-[#4A5568] hover:text-[#FF6B1A] transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Firma */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Firma</h4>
              <ul className="flex flex-col gap-2.5">
                {links.firma.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-[#4A5568] hover:text-[#FF6B1A] transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Zadzwoń teraz</h4>
              <p className="text-sm text-[#4A5568] mb-4 leading-relaxed">
                Pn–Pt: 8:00–17:00<br />Sobota: 9:00–13:00
              </p>
              <a href="tel:+48694706140"
                className="btn-primary flex items-center justify-center gap-2 text-sm mb-3"
              >
                <Phone className="w-4 h-4" />
                +48 694 706 140
              </a>
              <a href="#kontakt"
                onClick={(e) => { e.preventDefault(); scrollTo("#kontakt"); }}
                className="btn-secondary flex items-center justify-center text-sm"
              >
                Formularz kontaktowy
              </a>
            </div>
          </div>
        </div>

        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#4A5568]">
            © {new Date().getFullYear()} Turbo-Git. Wszelkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-6">
            {links.info.map((l) => (
              <a key={l} href="#" className="text-xs text-[#4A5568] hover:text-[#8A9BB0] transition-colors">{l}</a>
            ))}
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center hover:border-[#FF6B1A]/40 hover:bg-[#FF6B1A]/10 transition-all"
            aria-label="Do góry"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
