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
  ChevronDown,
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [cartCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-white/10 shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16 lg:h-18">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <span className="font-display text-2xl tracking-wider">
              <span className="text-white">TURBO</span>
              <span className="text-gradient">GIT</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 ml-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-[#FF7A00] group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="flex-1 hidden md:block mx-4">
            <motion.div
              animate={{ width: searchFocused ? "100%" : "100%" }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
              <input
                type="text"
                placeholder="Wyszukaj po OEM, kodzie silnika lub marce..."
                className="input-field w-full pl-10 pr-4 py-2 text-sm"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </motion.div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 ml-auto lg:ml-0">
            {/* Phone */}
            <a
              href="tel:+48694706140"
              className="hidden xl:flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-[#FF7A00]" />
              <span>+48 694 706 140</span>
            </a>

            {/* B2B Badge Button */}
            <a
              href="#b2b"
              className="hidden sm:flex items-center gap-1 badge-gold px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              B2B
            </a>

            {/* Cart */}
            <button className="relative p-2 text-[#94A3B8] hover:text-white transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF7A00] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger */}
            <button
              className="lg:hidden p-2 text-[#94A3B8] hover:text-white transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
            <input
              type="text"
              placeholder="Wyszukaj po OEM, marce..."
              className="input-field w-full pl-10 pr-4 py-2 text-sm"
            />
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
            transition={{ duration: 0.3 }}
            className="lg:hidden glass border-t border-white/10 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between py-3 px-4 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all"
                  onClick={() => setMobileOpen(false)}
                >
                  <span>{link.label}</span>
                  <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                </motion.a>
              ))}
              <div className="pt-3 border-t border-white/10 flex items-center gap-3">
                <a
                  href="tel:+48694706140"
                  className="flex items-center gap-2 text-sm text-[#94A3B8]"
                >
                  <PhoneCall className="w-4 h-4 text-[#FF7A00]" />
                  +48 694 706 140
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
