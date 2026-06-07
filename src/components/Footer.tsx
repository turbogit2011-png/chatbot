import { Gauge, Star, ShieldCheck, MapPin } from "lucide-react";
import { BUSINESS, OEM_BRANDS } from "@/lib/data";

export function Footer() {
  return (
    <footer className="relative border-t border-[var(--line)] bg-[var(--obsidian-2)]">
      <div className="container-pro py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bezel">
                <Gauge className="h-5 w-5 text-gold" />
              </span>
              <span className="font-tel text-lg font-bold tracking-[0.14em] text-ink">
                TURBO<span className="text-gold">-GIT</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-titanium">
              Elitarne laboratorium regeneracji turbosprężarek i DPF. Wyważanie VSR 301,
              kalibracja REA-Master i wyłącznie oryginalne komponenty OEM. Gwarancja{" "}
              {BUSINESS.warrantyMonths} miesięcy bez limitu kilometrów.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {OEM_BRANDS.map((b) => (
                <span key={b} className="chip">
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-tel text-xs uppercase tracking-[0.2em] text-gold">Laboratorium</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-titanium">
              <li><a href="#diagnostyka" className="transition-colors hover:text-gold-bright">Diagnostyka AI</a></li>
              <li><a href="#finder" className="transition-colors hover:text-gold-bright">Turbo Finder 2.0</a></li>
              <li><a href="#proces" className="transition-colors hover:text-gold-bright">Proces 7 etapów</a></li>
              <li><a href="#kalkulator" className="transition-colors hover:text-gold-bright">Kalkulator TCO</a></li>
              <li><a href="#b2b" className="transition-colors hover:text-gold-bright">Program B2B</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-tel text-xs uppercase tracking-[0.2em] text-gold">Kontakt</h4>
            <ul className="mt-4 space-y-3 text-sm text-titanium">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-copper" />
                <span>{BUSINESS.address}<br />{BUSINESS.region}</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-copper" />
                Gwarancja {BUSINESS.warrantyMonths} mc bez limitu km
              </li>
              <li className="flex items-center gap-2">
                <Star className="h-4 w-4 shrink-0 fill-gold text-gold" />
                {BUSINESS.rating} / 5 Google · {BUSINESS.positivePct}% pozytywnych
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--line)] pt-6 text-xs text-titanium sm:flex-row">
          <p>© {new Date().getFullYear()} TURBO-GIT · {BUSINESS.domain}. Wszelkie prawa zastrzeżone.</p>
          <p className="font-tel">Established {BUSINESS.establishedYear} · {BUSINESS.yearsExperience} lat inżynierii doładowania</p>
        </div>
      </div>
    </footer>
  );
}
