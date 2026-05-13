"use client";
import { Zap, Phone, Mail, MapPin, ArrowUp } from "lucide-react";

const cols = {
  produkty: ["Audi", "BMW", "Ford", "Mercedes", "Volkswagen", "Volvo", "Renault", "Opel"],
  firma: ["O nas", "Program B2B", "Certyfikaty", "Realizacje", "Blog", "Kariera"],
  info: ["FAQ", "Wysyłka i zwroty", "Gwarancja", "Regulamin", "Polityka prywatności"],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5">
      <div className="absolute inset-0 bg-[#06080D]" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,122,0,0.03), transparent 60%)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-10 py-14 border-b border-white/5">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF7A00] to-[#FF3D00] flex items-center justify-center shadow-[0_0_18px_rgba(255,122,0,0.35)]">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <span className="font-display text-xl text-white tracking-wider">TURBO</span>
                <span className="font-display text-xl text-[#FF7A00] tracking-wider">GIT</span>
              </div>
            </div>
            <p className="text-sm text-[#4A6080] leading-relaxed mb-5">
              Profesjonalny sklep z regenerowanymi turbosprężarkami. Gwarancja 24 miesiące. 15 lat na rynku.
            </p>
            <div className="flex flex-col gap-2">
              <a href="tel:+48694706140" className="flex items-center gap-2 text-sm text-[#94A3B8] hover:text-[#FF7A00] transition-colors"><Phone className="w-4 h-4 text-[#FF7A00]" />+48 694 706 140</a>
              <a href="mailto:sklep@turbo-git.com" className="flex items-center gap-2 text-sm text-[#94A3B8] hover:text-[#FF7A00] transition-colors"><Mail className="w-4 h-4 text-[#FF7A00]" />sklep@turbo-git.com</a>
              <div className="flex items-start gap-2 text-sm text-[#94A3B8]"><MapPin className="w-4 h-4 text-[#FF7A00] mt-0.5 flex-shrink-0" />ul. Wrocławska 7,<br />55-095 Januszkowice</div>
            </div>
          </div>

          {/* Produkty */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Marki</h4>
            <ul className="flex flex-col gap-2.5">
              {cols.produkty.map(l => <li key={l}><a href="#" className="text-sm text-[#4A6080] hover:text-[#FF7A00] transition-colors">{l}</a></li>)}
            </ul>
          </div>

          {/* Firma */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Firma</h4>
            <ul className="flex flex-col gap-2.5">
              {cols.firma.map(l => <li key={l}><a href="#" className="text-sm text-[#4A6080] hover:text-[#FF7A00] transition-colors">{l}</a></li>)}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Informacje</h4>
            <ul className="flex flex-col gap-2.5">
              {cols.info.map(l => <li key={l}><a href="#" className="text-sm text-[#4A6080] hover:text-[#FF7A00] transition-colors">{l}</a></li>)}
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Zamów teraz</h4>
            <p className="text-sm text-[#4A6080] mb-4">Pn–Pt: 8:00–17:00<br />Sob: 9:00–13:00</p>
            <a href="tel:+48694706140" className="btn-primary text-sm mb-3 w-full justify-center"><Phone className="w-4 h-4" />Zadzwoń</a>
            <a href="#kontakt" onClick={e => { e.preventDefault(); document.querySelector("#kontakt")?.scrollIntoView({ behavior: "smooth" }); }}
              className="btn-ghost text-sm w-full justify-center">Napisz do nas</a>
          </div>
        </div>

        <div className="py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#4A6080]">© {new Date().getFullYear()} TURBO-GIT · NIP 8961447143 · Wszelkie prawa zastrzeżone.</p>
          <div className="flex items-center gap-5">
            {["Regulamin", "Polityka prywatności", "Cookies"].map(l => <a key={l} href="#" className="text-xs text-[#4A6080] hover:text-[#94A3B8] transition-colors">{l}</a>)}
          </div>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-9 h-9 rounded-lg border border-white/8 flex items-center justify-center hover:border-[#FF7A00]/40 hover:bg-[#FF7A00]/10 transition-all">
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
