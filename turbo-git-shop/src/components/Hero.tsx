"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, Zap, ArrowRight, ChevronRight, Star } from "lucide-react";

const popularSearches = ["1.9 TDI", "N47D20", "2.0 TFSI", "OM651", "1.5 dCi"];

const marqueeItems = [
  "⚡ VSR 301 CERTIFIED",
  "🛡 GWARANCJA 24 MIESIĄCE",
  "🚚 WYSYŁKA W 24H",
  "🏆 8 000+ TURBOSPRĘŻAREK",
  "⚙️ 15 LAT DOŚWIADCZENIA",
  "🔧 ORYGINALNE CZĘŚCI OEM",
  "📐 BALANSOWANIE CNC",
  "✅ EKSPRESOWA REALIZACJA",
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

  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    type Particle = { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string };
    const colors = ["rgba(255,122,0,", "rgba(255,184,0,", "rgba(255,255,255,"];
    const particles: Particle[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      size: Math.random() * 2.5 + 0.5,
      alpha: Math.random() * 0.3 + 0.05,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

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
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,122,0,${0.05 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const doubled = [...marqueeItems, ...marqueeItems];

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col bg-[#06080D] overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="absolute inset-0 bg-grid-fine" />

      {/* Main orange glow */}
      <div
        className="absolute top-1/2 left-0 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none animate-breathe"
        style={{ background: "radial-gradient(circle, rgba(255,122,0,0.14) 0%, transparent 70%)", filter: "blur(60px)" }}
      />

      {/* Gold glow right */}
      <div
        className="absolute top-1/4 right-0 w-[500px] h-[500px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,184,0,0.06) 0%, transparent 70%)", filter: "blur(80px)" }}
      />

      {/* Rotating rings */}
      <div className="absolute right-[-80px] top-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-20 lg:opacity-30">
        <div className="animate-spin-slow absolute inset-0 rounded-full border border-dashed border-[#FF7A00]/30" />
        <div className="animate-spin-slow-rev absolute inset-[60px] rounded-full border border-[#FFB800]/20" />
        <div className="animate-spin-slow absolute inset-[120px] rounded-full border border-dashed border-[#FF7A00]/40" />
        <div className="absolute inset-[170px] rounded-full bg-gradient-to-br from-[#FF7A00]/20 to-[#FF3D00]/10 flex items-center justify-center">
          <div className="w-full h-full rounded-full animate-breathe flex items-center justify-center">
            <Zap className="w-16 h-16 text-[#FF7A00]/50" />
          </div>
        </div>
        {[0, 45, 90, 135].map((deg) => (
          <div key={deg} className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotate(${deg}deg)` }}>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#FF7A00]/15 to-transparent" />
          </div>
        ))}
      </div>

      {/* Scan beam */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="animate-scan absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF7A00]/60 to-transparent" />
      </div>

      {/* Content */}
      <motion.div
        style={{ y, opacity }}
        className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-24 pb-8 flex items-center"
      >
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-12 items-center w-full">
          {/* Left 3/5 */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/25 text-[#FF9A30] text-xs font-bold uppercase tracking-widest animate-neon">
                <Zap className="w-3 h-3" fill="currentColor" />
                Profesjonalny sklep turbosprężarek
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display leading-none tracking-wide"
              style={{ fontSize: "clamp(3rem, 10vw, 6rem)" }}
            >
              <span className="text-white block">REGENEROWANE</span>
              <span className="text-white block">TURBOSPRĘŻARKI</span>
              <span className="text-gradient-animated block">Z GWARANCJĄ</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-[#94A3B8] text-base sm:text-lg max-w-lg leading-relaxed"
            >
              15 lat doświadczenia · VSR 301 balansowanie ·{" "}
              <span className="text-[#FF9A30] font-semibold">Gwarancja 24 miesiące</span>{" "}
              na każdy produkt.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="flex gap-0 max-w-xl"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Wpisz numer OEM, kod silnika lub model..."
                  className="w-full pl-12 pr-4 py-4 bg-white/[0.05] border border-white/10 border-r-0 rounded-l-xl text-white text-sm placeholder-[#4A6080] focus:outline-none focus:border-[#FF7A00] focus:bg-[#FF7A00]/5 transition-all"
                />
              </div>
              <button className="btn-primary rounded-l-none rounded-r-xl whitespace-nowrap font-display tracking-wider px-5 text-sm">
                SZUKAJ
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="text-[#4A6080] text-xs">Popularne:</span>
              {popularSearches.map((term) => (
                <button
                  key={term}
                  className="px-3 py-1 text-xs rounded-full border border-white/10 text-[#94A3B8] hover:border-[#FF7A00]/50 hover:text-[#FF7A00] hover:bg-[#FF7A00]/5 transition-all"
                >
                  {term}
                </button>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap gap-3"
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

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="glass-warm rounded-xl p-4 max-w-sm"
            >
              <div className="grid grid-cols-3 gap-4 text-center">
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

          {/* Right 2/5 — desktop only */}
          <div className="lg:col-span-2 relative hidden lg:flex flex-col gap-4">
            <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
              <div
                className="w-80 h-80 rounded-full animate-breathe"
                style={{ background: "radial-gradient(circle, rgba(255,122,0,0.2) 0%, transparent 70%)", filter: "blur(30px)" }}
              />
            </div>

            {floatingProducts.map((product, i) => (
              <motion.div
                key={product.oem}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.14 }}
                className={`glass rounded-xl p-4 border border-white/[0.06] hover:border-[#FF7A00]/30 transition-all duration-500 card-shimmer ${
                  i === 1 ? "animate-float ml-8" : i === 0 ? "animate-float" : "animate-float mr-4"
                }`}
                style={{ animationDelay: `${i * 1.2}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF7A00]/20 to-[#FF3D00]/10 flex items-center justify-center shrink-0 border border-[#FF7A00]/20">
                    <Zap className="w-5 h-5 text-[#FF7A00]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs text-[#94A3B8] font-semibold">{product.brand}</span>
                      <span className="text-[10px] text-[#4A6080] font-mono">{product.oem}</span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{product.model}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[#FF7A00] font-bold text-base">{product.price}</span>
                      <span className="flex items-center gap-1 text-[10px] text-[#4ade80] font-medium">
                        <span className="dot-available" />
                        Na stanie
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="glass-warm rounded-xl p-4 border border-[#FF7A00]/15"
            >
              <div className="flex items-center gap-3">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#FFB800] text-[#FFB800]" />
                  ))}
                </div>
                <div>
                  <span className="text-white font-bold text-sm">4.9/5</span>
                  <span className="text-[#4A6080] text-xs ml-2">Google Reviews</span>
                </div>
              </div>
              <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                &quot;Świetna jakość, szybka wysyłka. Turbo działa jak nowa!&quot;
              </p>
              <div className="text-[10px] text-[#4A6080] mt-1">— Marek K., warsztat Wrocław</div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Marquee trust strip */}
      <div className="relative z-10 border-t border-white/8 bg-[#06080D]/80 backdrop-blur-sm py-3">
        <div className="marquee-track">
          <div className="animate-marquee">
            {doubled.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-6 text-xs font-semibold text-[#94A3B8] uppercase tracking-widest whitespace-nowrap">
                {item}
                <span className="text-[#FF7A00]/40 ml-2">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#06080D] to-transparent pointer-events-none" />
    </section>
  );
}
