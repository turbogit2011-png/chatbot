"use client";

import { useEffect, useState } from "react";
import { Menu, X, Gauge } from "lucide-react";

const LINKS = [
  { href: "#diagnostyka", label: "Diagnostyka AI" },
  { href: "#finder", label: "Turbo Finder" },
  { href: "#proces", label: "Proces" },
  { href: "#explorer", label: "Eksplorator" },
  { href: "#kalkulator", label: "Kalkulator TCO" },
  { href: "#b2b", label: "B2B" },
  { href: "#kontakt", label: "Kontakt" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-[37px] z-40">
      <div
        className={`transition-all duration-300 ${
          scrolled
            ? "border-b border-[var(--line)] bg-[var(--obsidian)]/85 backdrop-blur-xl"
            : "border-b border-transparent"
        }`}
      >
        <nav className="container-pro flex h-16 items-center justify-between">
          <a href="#top" className="group flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bezel">
              <Gauge className="h-5 w-5 text-gold" />
            </span>
            <span className="font-tel text-lg font-bold tracking-[0.14em] text-ink">
              TURBO<span className="text-gold">-GIT</span>
            </span>
          </a>

          <div className="hidden items-center gap-7 lg:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="relative text-[0.82rem] font-medium text-titanium transition-colors hover:text-gold-bright"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:block">
            <a href="#kontakt" className="btn-gold !px-5 !py-2.5 text-sm">
              Wyślij rdzeń
            </a>
          </div>

          <button
            type="button"
            aria-label="Menu"
            className="grid h-10 w-10 place-items-center rounded-lg hairline text-ink lg:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile drawer */}
        {open && (
          <div className="border-t border-[var(--line)] bg-[var(--obsidian)]/97 backdrop-blur-xl lg:hidden">
            <div className="container-pro flex flex-col gap-1 py-4">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-titanium transition-colors hover:bg-white/5 hover:text-gold-bright"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#kontakt"
                onClick={() => setOpen(false)}
                className="btn-gold mt-2 text-sm"
              >
                Wyślij rdzeń
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
