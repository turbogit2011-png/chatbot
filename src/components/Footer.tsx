"use client";

import { Zap, Phone, Mail, MapPin, ArrowUp } from "lucide-react";

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
      <div className="absolute inset-0 bg-[#07090E]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,107,26,0.04), transparent 60%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top strip */}
        <div className="py-12 border-b border-white/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B1A] to-[#FF3D00] flex items-center justify-center shadow-[0_0_20px_rgba(255,107,26,0.3)]">
                  <Zap className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                  <span className="font-display text-xl tracking-wider text-white leading-none">TURBO</span>
                  <span className="font-display text-xl tracking-wider text-[#FF6B1A] leading-none">DIESEL</span>
                </div>
              </div>
              <p className="text-sm text-[#4A5568] leading-relaxed mb-5">
                Profesjonalna regeneracja turbosprężarek i serwis diesel od 2014 roku.
                Gwarancja 12 miesięcy na każdą naprawę.
              </p>
              <div className="flex flex-col gap-2.5">
                <a href="tel:+48000000000" className="flex items-center gap-2 text-sm text-[#8A9BB0] hover:text-[#FF6B1A] transition-colors">
                  <Phone className="w-4 h-4 text-[#FF6B1A] flex-shrink-0" />
                  +48 000 000 000
                </a>
                <a href="mailto:kontakt@turbodiesel.cc" className="flex items-center gap-2 text-sm text-[#8A9BB0] hover:text-[#FF6B1A] transition-colors">
                  <Mail className="w-4 h-4 text-[#FF6B1A] flex-shrink-0" />
                  kontakt@turbodiesel.cc
                </a>
                <div className="flex items-start gap-2 text-sm text-[#8A9BB0]">
                  <MapPin className="w-4 h-4 text-[#FF6B1A] flex-shrink-0 mt-0.5" />
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
                      className="text-sm text-[#4A5568] hover:text-[#FF6B1A] transition-colors">
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
                    <a href="#" className="text-sm text-[#4A5568] hover:text-[#FF6B1A] transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Zadzwoń teraz</h4>
              <p className="text-sm text-[#4A5568] mb-4 leading-relaxed">
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
          <p className="text-xs text-[#4A5568]">
            © {new Date().getFullYear()} TurboDiesel. Wszelkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-6">
            {links.info.map((l) => (
              <a key={l} href="#" className="text-xs text-[#4A5568] hover:text-[#8A9BB0] transition-colors">
                {l}
              </a>
            ))}
          </div>
          <button
            onClick={scrollTop}
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
