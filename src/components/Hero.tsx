"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight, Shield, Award, Clock, Cpu } from "lucide-react";

/* ── PARTICLE CANVAS ─────────────────────────────────────────────────────── */
function TechParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; decay: number; color: string;
    }

    const particles: Particle[] = [];
    const colors = ["#D4A843", "#E8C264", "#C47832", "#00CFFF", "#D4A843", "#D4A843"];

    const spawn = () => {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 0.4 + Math.random() * 1.1,
        opacity: 0.15 + Math.random() * 0.45,
        decay: 0.0008 + Math.random() * 0.0015,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };

    let animId: number;
    let frame = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      if (frame % 4 === 0 && particles.length < 90) spawn();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.opacity -= p.decay;

        if (p.opacity <= 0) { particles.splice(i, 1); continue; }

        const alpha = Math.floor(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + alpha;
        ctx.fill();
      }

      /* connection lines between nearby particles */
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < Math.min(i + 6, particles.length); j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(212,168,67,${0.055 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    animate();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1, opacity: 0.55 }}
    />
  );
}

/* ── MAGNETIC CTA BUTTON ─────────────────────────────────────────────────── */
function MagneticButton({
  children,
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost";
}) {
  const ref   = useRef<HTMLButtonElement>(null);
  const mx    = useMotionValue(0);
  const my    = useMotionValue(0);
  const smx   = useSpring(mx, { stiffness: 220, damping: 22 });
  const smy   = useSpring(my, { stiffness: 220, damping: 22 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left - r.width  / 2) * 0.38);
    my.set((e.clientY - r.top  - r.height / 2) * 0.38);
  };

  return (
    <motion.button
      ref={ref}
      style={{ x: smx, y: smy }}
      onMouseMove={onMove}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      onClick={onClick}
      className={variant === "primary" ? "btn-gold flex items-center gap-2" : "btn-ghost flex items-center gap-2"}
    >
      {children}
    </motion.button>
  );
}

/* ── TRUST BADGES ────────────────────────────────────────────────────────── */
const badges = [
  { icon: Shield, label: "Gwarancja 12 miesięcy" },
  { icon: Award,  label: "Nowe uszczelki i podzespoły" },
  { icon: Cpu,    label: "Testy laboratoryjne CNC" },
  { icon: Clock,  label: "Realizacja 24-48h" },
];

/* ── TURBO SVG RENDER ────────────────────────────────────────────────────── */
function TurboVisualization() {
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full" fill="none">
      {/* Outer rings */}
      <circle cx="120" cy="120" r="108" stroke="rgba(212,168,67,0.10)" strokeWidth="0.75" />
      <circle cx="120" cy="120" r="92"  stroke="rgba(212,168,67,0.16)" strokeWidth="0.5"  strokeDasharray="4 8" />
      <circle cx="120" cy="120" r="76"  stroke="rgba(212,168,67,0.10)" strokeWidth="0.5"  />
      {/* Compressor blades */}
      {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg, i) => (
        <g key={i} transform={`rotate(${deg} 120 120)`}>
          <path
            d="M120 120 L125 46 Q120 40 115 46 Z"
            fill={`rgba(212,168,67,${0.10 + i * 0.018})`}
            stroke="rgba(212,168,67,0.45)"
            strokeWidth="0.5"
          />
        </g>
      ))}
      {/* Intermediate housing */}
      <circle cx="120" cy="120" r="36"  fill="rgba(13,11,24,0.95)" stroke="rgba(212,168,67,0.35)" strokeWidth="0.75" />
      <circle cx="120" cy="120" r="24"  fill="rgba(8,7,16,0.98)"   stroke="rgba(212,168,67,0.22)" strokeWidth="0.5"  />
      {/* Centre shaft / journal */}
      <circle cx="120" cy="120" r="14"  fill="rgba(212,168,67,0.05)" stroke="rgba(0,207,255,0.5)" strokeWidth="0.75" />
      <circle cx="120" cy="120" r="7"   fill="rgba(212,168,67,0.08)" stroke="rgba(212,168,67,0.7)" strokeWidth="1"   />
      <circle cx="120" cy="120" r="3.5" fill="rgba(212,168,67,0.9)" />
      {/* Neon highlight arc – airflow indicator */}
      <path d="M 36 120 A 84 84 0 0 1 120 36"  stroke="rgba(0,207,255,0.55)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 204 120 A 84 84 0 0 1 120 204" stroke="rgba(212,168,67,0.25)" strokeWidth="0.75" strokeLinecap="round" strokeDasharray="3 7" />
      {/* Spec text */}
      <text x="120" y="218" textAnchor="middle" fill="rgba(212,168,67,0.4)" fontSize="7" fontFamily="monospace" letterSpacing="2">
        CNC BALANCED · PREMIUM REGEN
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Hero() {
  const { scrollY } = useScroll();
  const parallaxY   = useTransform(scrollY, [0, 700], [0, 180]);
  const fadeOut     = useTransform(scrollY, [0, 500], [1, 0]);

  const handleShop    = () => document.querySelector("#bestsellery")?.scrollIntoView({ behavior: "smooth" });
  const handleLearn   = () => document.querySelector("#uslugi")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">

      {/* ── BASE BACKGROUND ───────────────────────────────── */}
      <div className="absolute inset-0 bg-[#080710]" />
      <div className="absolute inset-0 bg-grid-gold" />

      {/*
        ┌─────────────────────────────────────────────────────────────────┐
        │  VIDEO BACKGROUND – podpnij kinematyczne wideo jako tło         │
        │  Odkomentuj poniższy blok i zastąp src ścieżką do pliku:        │
        │                                                                 │
        │  <video                                                         │
        │    autoPlay muted loop playsInline                              │
        │    className="absolute inset-0 w-full h-full object-cover      │
        │               opacity-[0.18] mix-blend-luminosity z-[1]"       │
        │  >                                                              │
        │    <source src="/videos/hero-cinematic.mp4" type="video/mp4"/> │
        │  </video>                                                       │
        │                                                                 │
        │  GSAP ScrollTrigger scroll-effect na wideo:                     │
        │  gsap.to("video", {                                             │
        │    scrollTrigger: { trigger: "section", scrub: true },          │
        │    opacity: 0, scale: 1.08, ease: "none"                        │
        │  });                                                            │
        └─────────────────────────────────────────────────────────────────┘
      */}

      {/* Radial gold glow – cinematic spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 85% 55% at 50% 25%, rgba(212,168,67,0.075) 0%, transparent 65%)",
          zIndex: 1,
        }}
      />

      {/* Left vertical neon accent line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(0,207,255,0.45) 35%, rgba(0,207,255,0.45) 65%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* Atmospheric orbs */}
      <div
        className="absolute top-[-10%] left-[-8%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(212,168,67,0.055) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,207,255,0.04) 0%, transparent 70%)" }}
      />

      {/* Particle field */}
      <TechParticles />

      {/* ── CONTENT LAYER ─────────────────────────────────── */}
      <motion.div
        style={{ y: parallaxY, opacity: fadeOut }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20 w-full"
      >
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* ── LEFT: COPY ────────────────────────────────── */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="badge-gold mb-8 w-fit"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
              Profesjonalna Regeneracja od 2014 · Polska
            </motion.div>

            {/*
              GSAP ScrollTrigger – animate H1 words on scroll:
              gsap.from(".hero-word", {
                scrollTrigger: { trigger: ".hero-headline", start: "top 80%" },
                y: 80, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power4.out"
              });
            */}

            {/* H1 – three staggered lines */}
            <div className="overflow-hidden mb-1">
              <motion.h1
                className="hero-word font-display text-[clamp(2.8rem,8.5vw,7rem)] leading-[1] tracking-widest text-white uppercase"
                initial={{ y: 110, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.85, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                INŻYNIERIA
              </motion.h1>
            </div>
            <div className="overflow-hidden mb-1">
              <motion.h1
                className="hero-word font-display text-[clamp(2.8rem,8.5vw,7rem)] leading-[1] tracking-widest uppercase text-gradient-gold"
                initial={{ y: 110, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.85, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                MOCY.
              </motion.h1>
            </div>
            <div className="overflow-hidden mb-9">
              <motion.h1
                className="hero-word font-display text-[clamp(2.8rem,8.5vw,7rem)] leading-[1] tracking-widest text-white/65 uppercase"
                initial={{ y: 110, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.85, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
              >
                PRECYZJA.
              </motion.h1>
            </div>

            {/* Sub-headline */}
            <motion.p
              className="font-sub text-[var(--text-muted)] text-lg sm:text-xl max-w-lg mb-10 leading-relaxed"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.48 }}
            >
              Każda turbosprężarka regenerowana wyłącznie na{" "}
              <span className="text-[var(--gold)] font-semibold">nowych uszczelkach</span> i
              komponentach klasy premium. Precyzyjna diagnostyka CNC,
              testy laboratoryjne, gwarancja jakości.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              className="flex flex-wrap gap-4 mb-14"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.58 }}
            >
              <MagneticButton onClick={handleShop} variant="primary">
                Przeglądaj Sklep
                <ArrowRight className="w-4 h-4" />
              </MagneticButton>
              <MagneticButton onClick={handleLearn} variant="ghost">
                Nasze Usługi
              </MagneticButton>
            </motion.div>

            {/*
              MIKROINTERAKCJE – Trust badges Parallax on scroll (GSAP):
              gsap.to(".trust-badge", {
                scrollTrigger: { trigger: ".trust-badges", start: "top 90%", scrub: 0.5 },
                y: -12, stagger: 0.08, ease: "none"
              });
            */}

            {/* Trust badges */}
            <motion.div
              className="trust-badges flex flex-wrap gap-5"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.68 }}
            >
              {badges.map((badge, i) => (
                <div key={i} className="trust-badge flex items-center gap-2.5 group">
                  <div className="w-8 h-8 rounded-lg glass-gold flex items-center justify-center flex-shrink-0 group-hover:border-[var(--gold)] transition-colors duration-300">
                    <badge.icon className="w-3.5 h-3.5 text-[var(--gold)]" />
                  </div>
                  <span className="font-sub text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors duration-300">
                    {badge.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT: PRODUCT SHOWCASE ──────────────────── */}
          <motion.div
            className="hidden lg:flex flex-col items-end gap-5"
            initial={{ opacity: 0, x: 70 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.05, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            {/*
              ┌───────────────────────────────────────────────────────────┐
              │  3D TURBO RENDER – zastąp SVG poniżej ultra-realistycznym │
              │  renderem lub zdjęciem turbosprężarki:                    │
              │                                                           │
              │  import Image from "next/image";                          │
              │  <Image                                                   │
              │    src="/images/turbo-hero.png"                           │
              │    alt="Turbosprężarka Premium"                           │
              │    width={580} height={520}                               │
              │    className="object-contain drop-shadow-[0_0_60px_       │
              │               rgba(212,168,67,0.35)]"                     │
              │    priority                                               │
              │  />                                                       │
              │                                                           │
              │  GSAP 3D rotate on scroll (ScrollTrigger):               │
              │  gsap.to(".turbo-3d", {                                   │
              │    scrollTrigger: { trigger: "section", scrub: true },    │
              │    rotateY: 25, rotateX: -8, ease: "none"                 │
              │  });                                                       │
              └───────────────────────────────────────────────────────────┘
            */}

            {/* Turbo showcase card */}
            <div className="relative w-full max-w-[500px]">
              {/* Glow halo */}
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 75% 55% at 50% 50%, rgba(212,168,67,0.18) 0%, transparent 70%)",
                  filter: "blur(20px)",
                }}
              />

              {/* Card */}
              <div className="glass-card-gold rounded-3xl p-8 flex items-center justify-center min-h-[420px] relative overflow-hidden">
                {/* Rotating rings */}
                <div className="absolute inset-6  rounded-full border border-[var(--gold)]/10 animate-spin-slow pointer-events-none" />
                <div
                  className="absolute inset-10 rounded-full border border-[var(--neon)]/8  animate-spin-slow pointer-events-none"
                  style={{ animationDirection: "reverse", animationDuration: "30s" }}
                />

                {/* Turbo SVG */}
                <div className="turbo-3d relative z-10 w-56 h-56">
                  <TurboVisualization />
                </div>

                {/* Corner labels */}
                <div className="absolute top-5 right-5 text-right pointer-events-none">
                  <div className="font-display text-[0.6rem] text-[var(--gold)]/55 tracking-[0.2em]">TURBO-GIT</div>
                  <div className="font-sub   text-[0.65rem] text-[var(--text-muted)]">PREMIUM REGEN</div>
                </div>
                <div className="absolute bottom-5 left-5 pointer-events-none">
                  <div className="font-display text-[0.6rem] text-[var(--neon)]/55 tracking-[0.2em]">TECH-SPEC</div>
                  <div className="font-sub   text-[0.65rem] text-[var(--text-muted)]">CNC BALANCED</div>
                </div>

                {/* Gold shimmer sweep */}
                <div className="absolute inset-0 rounded-3xl animate-shimmer pointer-events-none opacity-60" />
              </div>
            </div>

            {/* Floating stat cards */}
            {[
              { value: "5 000+", label: "Zregenerowanych turbo", variant: "gold" },
              { value: "98%",    label: "Zadowolonych klientów", variant: "neon" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 44 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.85 + i * 0.15, duration: 0.65 }}
                className={`${stat.variant === "gold" ? "glass-card-gold" : "glass-card-neon"} rounded-xl px-6 py-4 min-w-[200px] animate-float`}
                style={{ animationDelay: `${i * 1.8}s` }}
              >
                <div
                  className={`font-display text-3xl tracking-widest mb-0.5 ${
                    stat.variant === "gold" ? "text-gradient-gold" : "text-[var(--neon)]"
                  }`}
                >
                  {stat.value}
                </div>
                <div className="font-sub text-xs text-[var(--text-muted)] font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </motion.div>

      {/* ── BOTTOM FADE ───────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{ background: "linear-gradient(to top, #080710 0%, transparent 100%)" }}
      />

      {/* ── SCROLL INDICATOR ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="font-sub text-[0.65rem] text-[var(--text-subtle)] font-medium tracking-[0.35em] uppercase">
          Przewiń
        </span>
        <div className="w-5 h-8 rounded-full border border-white/10 flex items-start justify-center p-1">
          <motion.div
            animate={{ y: [0, 14, 0] }}
            transition={{ repeat: Infinity, duration: 1.65, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]"
          />
        </div>
      </motion.div>
    </section>
  );
}
