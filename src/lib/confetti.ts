/* Tiny dependency-free confetti burst. Spawns a temporary full-screen canvas,
   animates particles under gravity, and removes itself when they settle. */

const COLORS = ["#6366F1", "#8B5CF6", "#D946EF", "#22D3EE", "#34D399", "#FBBF24"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  color: string;
  life: number;
}

export function fireConfetti(originX = 0.5, originY = 0.4, count = 120): void {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const W = window.innerWidth;
  const H = window.innerHeight;
  const ox = W * originX;
  const oy = H * originY;

  const particles: Particle[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.4,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      life: 1,
    };
  });

  let frame = 0;
  const maxFrames = 180;

  function tick() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    frame++;
    let alive = false;

    for (const p of particles) {
      p.vy += 0.22; // gravity
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (frame > maxFrames - 60) p.life -= 0.02;
      if (p.life > 0 && p.y < H + 40) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    }

    if (alive && frame < maxFrames) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(tick);
}
