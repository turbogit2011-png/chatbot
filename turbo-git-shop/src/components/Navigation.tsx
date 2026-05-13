"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingCart,
  PhoneCall,
  Menu,
  X,
  Zap,
  ChevronRight,
} from "lucide-react";

const navLinks = [
  { label: "Sklep", href: "#sklep" },
  { label: "Kategorie", href: "#kategorie" },
  { label: "B2B", href: "#b2b" },
  { label: "O nas", href: "#o-nas" },
  { label: "Kontakt", href: "#kontakt" },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || mobileOpen
          ? "bg-[#06080D]/95 backdrop-blur-xl border-b border-white/8 shadow-2xl shadow-black/40"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF3D00] flex items-center justify-center shadow-[0_0_20px_rgba(255,122,0,0.4)]">
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <span className="font-display text-2xl tracking-wider">
              <span className="text-white">TURBO</span>
              <span className="text-gradient">GIT</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 ml-6">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-[#FF7A00] group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </nav>

          {/* Desktop Search */}
          <div className="flex-1 hidden md:block mx-4 max-w-sm xl:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
              <input
                type="text"
                placeholder="OEM, marka, model..."
                className="input-field w-full pl-10 pr-4 py-2 text-sm"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            <a
              href="tel:+48694706140"
              className="hidden xl:flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-[#FF7A00]" />
              <span>+48 694 706 140</span>
            </a>

            <a
              href="#b2b"
              onClick={(e) => { e.preventDefault(); scrollTo("#b2b"); }}
              className="hidden sm:flex items-center gap-1 badge-gold px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              B2B
            </a>

            <button className="relative p-2 text-[#94A3B8] hover:text-white transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF7A00] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              className="lg:hidden p-2 text-[#94A3B8] hover:text-white transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden border-t border-white/8 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {/* Mobile search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Wyszukaj po OEM, marce, modelu..."
                  className="input-field w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>

              {navLinks.map((link, i) => (
                <motion.button
                  key={link.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-3 px-4 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all text-left"
                  onClick={() => scrollTo(link.href)}
                >
                  <span className="font-medium">{link.label}</span>
                  <ChevronRight className="w-4 h-4 opacity-40" />
                </motion.button>
              ))}

              <div className="pt-3 mt-1 border-t border-white/8 flex items-center justify-between">
                <a href="tel:+48694706140" className="flex items-center gap-2 text-sm text-[#94A3B8] hover:text-[#FF7A00] transition-colors">
                  <PhoneCall className="w-4 h-4 text-[#FF7A00]" />
                  +48 694 706 140
                </a>
                <a href="#b2b" onClick={(e) => { e.preventDefault(); scrollTo("#b2b"); }} className="badge-gold px-3 py-1.5 rounded-full text-xs font-semibold">
                  Program B2B
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
