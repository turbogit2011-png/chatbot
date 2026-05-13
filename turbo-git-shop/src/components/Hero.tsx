"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, Shield, Zap, Truck, Award, ArrowRight, ChevronRight } from "lucide-react";

const popularSearches = ["1.9 TDI", "N47D20", "2.0 TFSI", "OM651", "1.5 dCi"];

const trustItems = [
  { icon: Shield, label: "Gwarancja 24M" },
  { icon: Zap, label: "VSR 301" },
  { icon: Truck, label: "Wysyłka 24h" },
  { icon: Award, label: "15 lat" },
];

const floatingProducts = [
  { brand: "BMW", model: "320d N47D20", price: "1 799 PLN", oem: "11657797078", available: true },
  { brand: "Audi", model: "A4 2.0 TDI BRD", price: "1 599 PLN", oem: "03G253014H", available: true },
  { brand: "VW", model: "Golf 2.0 TDI AZV", price: "1 299 PLN", oem: "03G253014F", available: true },
];

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }> = [];

    const colors = ["rgba(255,122,0,", "rgba(255,184,0,", "rgba(255,255,255,"];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.25 + 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center bg-[#06080D] overflow-hidden"
    >
      {/* Canvas particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-fine" />

      {/* Radial glow */}
      <div
        className="absolute left-1/4 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,122,0,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-28 pb-16"
      >
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          {/* Left side - 60% (3/5) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="badge badge-orange">
                <Zap className="w-3 h-3" />
                Profesjonalny sklep turbosprężarek
              </span>
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-6xl sm:text-7xl lg:text-8xl leading-none tracking-wide"
            >
              <span className="text-white block">REGENEROWANE</span>
              <span className="text-white block">TURBOSPRĘŻARKI</span>
              <span className="text-gradient block text-glow">Z GWARANCJĄ</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-[#94A3B8] text-lg max-w-lg leading-relaxed"
            >
              15 lat doświadczenia. VSR 301 balansowanie. Gwarancja 24 miesiące
              na każdy produkt.
            </motion.p>

            {/* OEM Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex gap-0 max-w-xl"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Wpisz numer OEM, kod silnika lub model pojazdu..."
                  className="w-full pl-12 pr-4 py-4 bg-white/[0.06] border border-white/10 border-r-0 rounded-l-xl text-white text-sm placeholder-[#4A6080] focus:outline-none focus:border-[#FF7A00] focus:bg-[#FF7A00]/5 transition-all"
                />
              </div>
              <button className="btn-primary rounded-l-none rounded-r-xl whitespace-nowrap font-display text-base tracking-wider px-6">
                Szukaj
              </button>
            </motion.div>

            {/* Popular searches */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="text-[#94A3B8] text-sm">Popularne wyszukiwania:</span>
              {popularSearches.map((term) => (
                <button
                  key={term}
                  className="px-3 py-1 text-xs rounded-full border border-white/10 text-[#94A3B8] hover:border-[#FF7A00]/50 hover:text-[#FF7A00] transition-all"
                >
                  {term}
                </button>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="flex flex-wrap gap-4"
            >
              <a href="#sklep" className="btn-primary">
                <span>Zobacz produkty</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#b2b" className="btn-ghost">
                Program B2B
                <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="flex flex-wrap gap-4 pt-2"
            >
              {trustItems.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-sm text-[#94A3B8]"
                >
                  <div className="w-7 h-7 rounded-full bg-[#FF7A00]/10 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-[#FF7A00]" />
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right side - 40% (2/5) */}
          <div className="lg:col-span-2 relative hidden lg:flex flex-col gap-4">
            {/* Glow orb */}
            <div
              className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none"
            >
              <div
                className="w-72 h-72 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,122,0,0.25) 0%, transparent 70%)",
                  filter: "blur(30px)",
                }}
              />
            </div>

            {/* Floating product cards */}
            {floatingProducts.map((product, i) => (
              <motion.div
                key={product.oem}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.12 }}
                style={{ animationDelay: `${i * 0.8}s` }}
                className={`glass rounded-xl p-4 border border-white/[0.06] hover:border-[#FF7A00]/30 transition-all ${
                  i === 1 ? "animate-float ml-6" : i === 0 ? "animate-float" : "animate-float mr-4"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FF7A00]/10 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-[#FF7A00]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs text-[#94A3B8] font-medium">{product.brand}</span>
                      <span className="text-xs text-[#4A6080]">{product.oem}</span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{product.model}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[#FF7A00] font-bold text-sm">{product.price}</span>
                      <span className="flex items-center gap-1 text-[10px] text-[#4ade80]">
                        <span className="dot-available" />
                        Na stanie
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Stats mini card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="glass-warm rounded-xl p-4 mt-2"
            >
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="font-display text-2xl text-gradient">8K+</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">turbosprężarek</div>
                </div>
                <div className="border-x border-white/10">
                  <div className="font-display text-2xl text-gradient">24M</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">gwarancja</div>
                </div>
                <div>
                  <div className="font-display text-2xl text-gradient">98%</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">opinii 5★</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#06080D] to-transparent pointer-events-none" />
    </section>
  );
}
