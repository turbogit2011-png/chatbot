"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Shield, Award, Clock } from "lucide-react";

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; decay: number; color: string;
    }

    const particles: Particle[] = [];
    const colors = ["#FF6B1A", "#FF8C3A", "#FF3D00", "#FFB347", "#FF6B1A"];

    const spawn = () => {
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      const w = canvas.width, h = canvas.height;
      if (side === 0) { x = Math.random() * w; y = h; }
      else if (side === 1) { x = 0; y = Math.random() * h; }
      else if (side === 2) { x = Math.random() * w; y = 0; }
      else { x = w; y = Math.random() * h; }

      const angle = Math.atan2(h / 2 - y, w / 2 - x) + (Math.random() - 0.5) * 1.2;
      const speed = 0.3 + Math.random() * 0.8;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 0.5 + Math.random() * 1.5,
        opacity: 0.3 + Math.random() * 0.4,
        decay: 0.003 + Math.random() * 0.004,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };

    let animId: number;
    let frame = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      if (frame % 3 === 0 && particles.length < 120) spawn();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.opacity -= p.decay;

        if (p.opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      // Draw connection lines for nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,107,26,${0.04 * (1 - dist / 80)})`;
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
      className="absolute inset-0 pointer-events-none opacity-60"
      style={{ zIndex: 1 }}
    />
  );
}

const badges = [
  { icon: Shield, label: "Gwarancja 12 miesięcy" },
  { icon: Award, label: "10+ lat doświadczenia" },
  { icon: Clock, label: "Czas realizacji 24-48h" },
];

export default function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 150]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  const handleContact = () => {
    document.querySelector("#kontakt")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleServices = () => {
    document.querySelector("#uslugi")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[#07090E]" />
      <div className="absolute inset-0 bg-grid opacity-100" />

      {/* Gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#FF6B1A]/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#FF3D00]/6 blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-[#FF6B1A]/5 blur-[80px] pointer-events-none" />

      {/* Particles */}
      <ParticleCanvas />

      {/* Radial spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,107,26,0.06) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20 w-full"
      >
        <div className="max-w-4xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="badge mb-8 w-fit"
          >
            <span className="w-2 h-2 rounded-full bg-[#FF6B1A] animate-pulse" />
            Profesjonalny serwis turbosprężarek od 2014 roku
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-display text-[clamp(3.5rem,10vw,8rem)] leading-[0.9] tracking-wide text-white mb-6"
          >
            REGENERACJA
            <br />
            <span className="text-gradient glow-text">TURBO</span>
            <br />
            SPRĘŻAREK
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-[#8A9BB0] text-lg sm:text-xl max-w-xl mb-10 leading-relaxed"
          >
            Przywracamy pełną moc Twojego silnika. Precyzyjna diagnostyka,
            regeneracja CNC i testy na specjalistycznych stanowiskach.
            Wszystkie marki i modele.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-wrap gap-4 mb-16"
          >
            <button onClick={handleContact} className="btn-primary flex items-center gap-2 text-base">
              Bezpłatna wycena
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={handleServices} className="btn-secondary flex items-center gap-2 text-base">
              Nasze usługi
            </button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="flex flex-wrap gap-6"
          >
            {badges.map((badge, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg glass-orange flex items-center justify-center flex-shrink-0">
                  <badge.icon className="w-4 h-4 text-[#FF6B1A]" />
                </div>
                <span className="text-sm font-medium text-[#8A9BB0]">{badge.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating stat cards */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="absolute right-4 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-4"
        >
          {[
            { value: "5 000+", label: "Zregenerowanych turbo" },
            { value: "98%", label: "Zadowolonych klientów" },
            { value: "24h", label: "Czas realizacji" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.1, duration: 0.5 }}
              className="glass border-gradient rounded-xl px-6 py-4 min-w-[180px] animate-float"
              style={{ animationDelay: `${i * 2}s` }}
            >
              <div className="font-display text-3xl text-gradient mb-0.5">{stat.value}</div>
              <div className="text-xs text-[#8A9BB0] font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#07090E] to-transparent pointer-events-none z-10" />

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-[#4A5568] font-medium tracking-widest uppercase">Przewiń</span>
        <div className="w-5 h-8 rounded-full border border-white/10 flex items-start justify-center p-1">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A]"
          />
        </div>
      </motion.div>
    </section>
  );
}
