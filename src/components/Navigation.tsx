"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone } from "lucide-react";

const navLinks = [
  { label: "Kategorie",   href: "#kategorie" },
  { label: "Dlaczego my", href: "#dlaczego-my" },
  { label: "Jak działamy",href: "#jak-dzialamy" },
  { label: "Cennik",      href: "#cennik" },
  { label: "Kontakt",     href: "#kontakt" },
];

export default function Navigation() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (href: string) => {
    setMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#07090E]/92 backdrop-blur-xl border-b border-white/5 py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B1A] to-[#FF3D00] flex items-center justify-center shadow-[0_0_20px_rgba(255,107,26,0.4)] group-hover:shadow-[0_0_32px_rgba(255,107,26,0.65)] transition-shadow">
              {/* Turbo icon – simplified SVG */}
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2a8 8 0 0 1 5.56 13.7L6.3 6.44A7.96 7.96 0 0 1 12 4Zm0 16a8 8 0 0 1-5.56-13.7L17.7 17.56A7.96 7.96 0 0 1 12 20Z"/>
              </svg>
            </div>
            <div className="leading-none">
              <span className="font-display text-xl tracking-wider text-white">TURBO</span>
              <span className="font-display text-xl tracking-wider text-[#FF6B1A]">-GIT</span>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); go(link.href); }}
                className="text-sm font-medium text-[#8A9BB0] hover:text-white transition-colors underline-animate"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <a href="tel:+48694706140" className="flex items-center gap-2 text-sm font-medium text-[#8A9BB0] hover:text-white transition-colors">
              <Phone className="w-4 h-4 text-[#FF6B1A]" />
              +48 694 706 140
            </a>
            <a
              href="#kontakt"
              onClick={(e) => { e.preventDefault(); go("#kontakt"); }}
              className="btn-primary text-sm px-5 py-2.5"
            >
              Znajdź turbosprężarkę
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 hover:border-white/20 transition-colors"
            aria-label="Menu"
          >
            <AnimatePresence mode="wait">
              {menuOpen ? (
                <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Menu className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-0 top-[65px] z-40 bg-[#07090E]/98 backdrop-blur-xl border-b border-white/5 lg:hidden"
          >
            <nav className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-1">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); go(link.href); }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.2 }}
                  className="text-base font-medium text-[#8A9BB0] hover:text-white hover:bg-white/5 px-4 py-3 rounded-lg transition-all"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.a
                href="#kontakt"
                onClick={(e) => { e.preventDefault(); go("#kontakt"); }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navLinks.length * 0.06, duration: 0.2 }}
                className="btn-primary text-center mt-4"
              >
                Znajdź turbosprężarkę
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
