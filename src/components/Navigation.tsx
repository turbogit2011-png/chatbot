"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingCart, User } from "lucide-react";

const navLinks = [
  { label: "Sklep",      href: "#bestsellery" },
  { label: "Usługi",     href: "#uslugi" },
  { label: "Jak działamy", href: "#proces" },
  { label: "O nas",      href: "#o-nas" },
  { label: "Kontakt",    href: "#kontakt" },
];

/* ── Inline SVG turbo-blade logo mark ─────────────────── */
function TurboMark() {
  return (
    <svg viewBox="0 0 36 36" className="w-9 h-9" fill="none">
      <circle cx="18" cy="18" r="16" stroke="rgba(212,168,67,0.25)" strokeWidth="0.75" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <g key={i} transform={`rotate(${deg} 18 18)`}>
          <path
            d="M18 18 L20 5 Q18 3.5 16 5 Z"
            fill={`rgba(212,168,67,${0.35 + i * 0.04})`}
            stroke="rgba(212,168,67,0.5)"
            strokeWidth="0.4"
          />
        </g>
      ))}
      <circle cx="18" cy="18" r="5"  fill="#080710" stroke="rgba(212,168,67,0.6)" strokeWidth="0.75" />
      <circle cx="18" cy="18" r="2.2" fill="rgba(212,168,67,0.8)" />
      <path d="M 5 18 A 13 13 0 0 1 18 5" stroke="rgba(0,207,255,0.55)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export default function Navigation() {
  const [scrolled,   setScrolled]   = useState(false);
  const [hidden,     setHidden]     = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [lastScroll, setLastScroll] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 30);
      // hide on scroll-down, show on scroll-up
      if (y > lastScroll && y > 120) setHidden(true);
      else setHidden(false);
      setLastScroll(y);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScroll]);

  const navTo = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: hidden ? -100 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#080710]/88 backdrop-blur-2xl border-b border-white/[0.04] py-3"
            : "bg-transparent py-5"
        }`}
      >
        {/* Gold top-edge accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(212,168,67,0.5) 40%, rgba(212,168,67,0.5) 60%, transparent 100%)",
            opacity: scrolled ? 1 : 0,
            transition: "opacity 0.5s",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">

          {/* ── LOGO ── */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-md bg-[var(--gold)]/20 group-hover:bg-[var(--gold)]/35 transition-all duration-500" />
              <TurboMark />
            </div>
            <div className="leading-none">
              <span className="font-display text-[1.15rem] tracking-[0.14em] text-white uppercase block">
                TURBO
              </span>
              <span
                className="font-display text-[1.15rem] tracking-[0.14em] uppercase block"
                style={{ color: "var(--gold)" }}
              >
                GIT
              </span>
            </div>
          </a>

          {/* ── DESKTOP NAV ── */}
          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); navTo(link.href); }}
                className="font-sub text-sm font-medium tracking-widest uppercase text-[var(--text-muted)] hover:text-white transition-colors underline-animate"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* ── RIGHT ACTIONS ── */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              aria-label="Konto"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/8 text-[var(--text-muted)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition-all"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              aria-label="Koszyk"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/8 text-[var(--text-muted)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition-all relative"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--gold)] text-[#080710] text-[9px] font-bold flex items-center justify-center font-sub">
                0
              </span>
            </button>
            <a
              href="#kontakt"
              onClick={(e) => { e.preventDefault(); navTo("#kontakt"); }}
              className="btn-gold px-5 py-2 text-xs"
            >
              Bezpłatna wycena
            </a>
          </div>

          {/* ── MOBILE HAMBURGER ── */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              aria-label="Koszyk"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/8 text-[var(--text-muted)] relative"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--gold)] text-[#080710] text-[9px] font-bold flex items-center justify-center font-sub">
                0
              </span>
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 hover:border-white/20 transition-colors"
              aria-label="Menu"
            >
              <AnimatePresence mode="wait">
                {menuOpen ? (
                  <motion.div
                    key="x"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.header>

      {/* ── MOBILE MENU ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-x-0 top-[65px] z-40 bg-[#080710]/97 backdrop-blur-2xl border-b border-white/5 lg:hidden"
          >
            <nav className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-1">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); navTo(link.href); }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.2 }}
                  className="font-sub text-base font-medium tracking-widest uppercase text-[var(--text-muted)] hover:text-white hover:bg-white/4 px-4 py-3 rounded-lg transition-all"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.a
                href="#kontakt"
                onClick={(e) => { e.preventDefault(); navTo("#kontakt"); }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navLinks.length * 0.06, duration: 0.2 }}
                className="btn-gold text-center mt-4"
              >
                Bezpłatna wycena
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
