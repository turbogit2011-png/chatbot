"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, Wrench } from "lucide-react";
import { BRAND, CONTACT } from "@/lib/brand";

const navLinks = [
  { label: "Dobór turbo", href: "#dobor-turbo" },
  { label: "Technologia", href: "#technologia" },
  { label: "Proces", href: "#proces" },
  { label: "Sklep", href: "/sklep" },
  { label: "B2B", href: "#b2b" },
  { label: "Opinie", href: "#opinie" },
  { label: "FAQ", href: "#faq" },
  { label: "Kontakt", href: "#kontakt" },
];

/** TURBO-GIT wordmark — typographic logo with stylised turbine glyph. */
function Logo() {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="flex items-center gap-2.5 group"
      aria-label={BRAND.name}
    >
      <div className="relative w-9 h-9 rounded-sm bg-gradient-to-br from-[var(--orange)] to-[var(--red)] flex items-center justify-center shadow-[0_0_24px_rgba(255,90,31,0.4)] group-hover:shadow-[0_0_36px_rgba(255,90,31,0.65)] transition-shadow">
        {/* Stylised turbo wheel — 6 blades */}
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
          <g fill="white">
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
        <div className="font-display text-[1.05rem] tracking-tight text-white">
          TURBO<span className="text-[var(--orange)]">-GIT</span>
        </div>
        <div className="hud-label text-[8px] mt-0.5">PREMIUM TURBO LAB</div>
      </div>
    </a>
  );
}

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.assign(href);
    }
  };

  return (
    <>
      {/* Top info strip — always visible, click-to-call on mobile */}
      <div className="fixed top-0 inset-x-0 z-[51] bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-7 flex items-center justify-between text-[11px] font-medium">
          <a
            href={CONTACT.phoneTel}
            className="flex items-center gap-1.5 text-white"
            aria-label={`Zadzwoń ${CONTACT.phoneDisplay}`}
          >
            <Phone className="w-3 h-3 text-[var(--orange)]" />
            <span className="font-mono-tech">{CONTACT.phoneDisplay}</span>
          </a>
          <span className="hidden sm:flex items-center gap-3 text-[var(--text-muted)]">
            <span>{CONTACT.hours.full}</span>
            <span className="text-[var(--green)]">● Otwarte teraz</span>
          </span>
          <span className="sm:hidden text-[var(--text-muted)]">
            Pn–Pt 8–18 · Sob 9–14
          </span>
        </div>
      </div>

      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-7 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[var(--bg-primary)]/92 backdrop-blur-xl border-b border-white/5 py-3"
            : "bg-transparent py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className="text-sm font-medium text-[var(--text-muted)] hover:text-white transition-colors underline-animate"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-2.5">
            <a
              href="#dobor-turbo"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("#dobor-turbo");
              }}
              className="btn-primary scanline text-sm px-4 py-2.5 inline-flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              Dobierz turbo
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-sm border border-white/10 hover:border-[var(--orange)]/40 transition-colors"
            aria-label="Menu"
            aria-expanded={menuOpen}
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
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[88px] z-40 bg-[var(--bg-primary)]/98 backdrop-blur-xl border-b border-white/5 lg:hidden"
          >
            <nav className="max-w-7xl mx-auto px-4 py-5 flex flex-col gap-1">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="text-base font-medium text-[var(--text)] hover:bg-white/5 px-4 py-3 rounded-sm transition-all flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <span className="text-[var(--steel-light)] text-xs">→</span>
                </motion.a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href="#dobor-turbo"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick("#dobor-turbo");
                  }}
                  className="btn-primary text-center text-sm"
                >
                  Dobierz turbo
                </a>
                <a
                  href={CONTACT.phoneTel}
                  className="btn-secondary text-center text-sm inline-flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4 text-[var(--orange)]" />
                  Zadzwoń
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
