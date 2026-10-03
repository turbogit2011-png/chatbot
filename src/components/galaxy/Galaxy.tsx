"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link } from "next-view-transitions";
import { ArrowLeft, Pause, Play, Volume2 } from "lucide-react";
import {
  COMMITS_BY_DAY,
  FACTS,
  FILES,
  GROUP_COLOR,
  GROUP_LABEL,
  GROUP_ORDER,
  RANGE,
  pluralCommits,
  pluralLines,
  type GalaxyFile,
} from "@/lib/galaxy-data";

interface Star extends GalaxyFile {
  /** Angle on the spiral arm (radians). */
  a: number;
  /** Normalised radius 0..1. */
  r: number;
  /** Rendered radius in CSS px. */
  size: number;
  /** Twinkle phase. */
  tw: number;
  px: number;
  py: number;
}

interface Dust {
  x: number;
  y: number;
  s: number;
  p: number;
}

const PENTA = [0, 2, 4, 7, 9];
const REDUCED_MQ = "(prefers-reduced-motion: reduce)";

function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function reducedSnapshot() {
  return window.matchMedia(REDUCED_MQ).matches;
}
const MONTHS = [
  "sty",
  "lut",
  "mar",
  "kwi",
  "maj",
  "cze",
  "lip",
  "sie",
  "wrz",
  "paź",
  "lis",
  "gru",
];

/** Deterministic pseudo-random so the sky looks the same on every visit. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildStars(): Star[] {
  return FILES.map((f, idx) => {
    const arm = GROUP_ORDER.indexOf(f.group);
    const inGroup = FILES.filter((x) => x.group === f.group);
    const pos = inGroup.indexOf(f) / Math.max(1, inGroup.length - 1);
    const t = 0.18 + pos * 0.72;
    const base = (arm / GROUP_ORDER.length) * Math.PI * 2;
    const angle = base + t * 2.6 + (((idx * 0.618) % 1) - 0.5) * 0.25;
    const radius = 0.12 + t * 0.78 + (((idx * 0.382) % 1) - 0.5) * 0.08;
    return {
      ...f,
      a: angle,
      r: radius,
      size: 1.6 + Math.sqrt(f.lines) * 0.42,
      tw: (idx * 1.7) % (Math.PI * 2),
      px: 0,
      py: 0,
    };
  });
}

function buildDust(): Dust[] {
  const rnd = seeded(2026);
  return Array.from({ length: 260 }, () => ({
    x: rnd(),
    y: rnd(),
    s: rnd() * 1.1 + 0.2,
    p: rnd() * Math.PI * 2,
  }));
}

/** Bigger files sound lower. Pentatonic, so every combination is consonant. */
function freqFor(lines: number): number {
  const v = 1 - Math.log(lines + 1) / Math.log(965);
  const step = Math.round(v * 24);
  const semis = Math.floor(step / 5) * 12 + PENTA[step % 5];
  return 110 * Math.pow(2, semis / 12);
}

function buildDays() {
  const out: { key: string; n: number; label: string }[] = [];
  const start = new Date(`${RANGE.start}T00:00:00Z`);
  const end = new Date(`${RANGE.end}T00:00:00Z`);
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const n = COMMITS_BY_DAY[key] ?? 0;
    out.push({
      key,
      n,
      label: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${n}`,
    });
  }
  return out;
}

export default function Galaxy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const dustRef = useRef<Dust[]>([]);
  const rotRef = useRef(0);
  const spinningRef = useRef(true);
  const hoverRef = useRef<Star | null>(null);
  const flashRef = useRef<Record<string, number>>({});
  const audioRef = useRef<AudioContext | null>(null);
  const timersRef = useRef<number[]>([]);

  const reduced = useSyncExternalStore(
    subscribeReduced,
    reducedSnapshot,
    () => false,
  );
  const [wantSpin, setWantSpin] = useState(true);
  const spinning = wantSpin && !reduced;
  useEffect(() => {
    spinningRef.current = spinning;
  }, [spinning]);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState(
    "Każdy plik ma swoją nutę. Większe pliki brzmią niżej.",
  );
  const [tip, setTip] = useState<{ x: number; y: number; star: Star } | null>(
    null,
  );

  const days = useMemo(() => buildDays(), []);

  // Sky renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    starsRef.current = buildStars();
    dustRef.current = buildDust();
    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const project = (s: Star) => {
      const cx = W / 2;
      const cy = H * 0.5;
      const R = Math.min(W, H) * 0.46;
      const a = s.a + rotRef.current;
      return {
        x: cx + Math.cos(a) * s.r * R * 1.35,
        y: cy + Math.sin(a) * s.r * R * 0.78,
      };
    };

    let raf = 0;
    const draw = (ts: number) => {
      ctx.clearRect(0, 0, W, H);
      const t = ts / 1000;
      if (spinningRef.current) rotRef.current += 0.0009;

      for (const k of dustRef.current) {
        const al = 0.25 + 0.25 * Math.sin(t * 0.8 + k.p);
        ctx.fillStyle = `rgba(236,237,246,${al.toFixed(3)})`;
        ctx.fillRect(k.x * W, k.y * H, k.s, k.s);
      }

      ctx.lineWidth = 1;
      for (const g of GROUP_ORDER) {
        const pts = starsRef.current.filter((s) => s.group === g).map(project);
        ctx.strokeStyle = GROUP_COLOR[g];
        ctx.globalAlpha = 0.14;
        ctx.beginPath();
        for (let j = 0; j < pts.length - 1; j++) {
          ctx.moveTo(pts[j].x, pts[j].y);
          ctx.lineTo(pts[j + 1].x, pts[j + 1].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      for (const s of starsRef.current) {
        const p = project(s);
        s.px = p.x;
        s.py = p.y;
        const fl = flashRef.current[s.name];
        const f = fl ? Math.max(0, 1 - (ts - fl) / 900) : 0;
        const tw = 0.85 + 0.15 * Math.sin(t * 1.7 + s.tw);
        const rad = s.size * tw * (1 + f * 0.9);
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 4);
        glow.addColorStop(0, GROUP_COLOR[s.group]);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.28 + f * 0.5;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = s === hoverRef.current ? "#ffffff" : GROUP_COLOR[s.group];
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.beginPath();
        ctx.arc(p.x - rad * 0.25, p.y - rad * 0.25, rad * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      const h = hoverRef.current;
      if (h) setTip({ x: h.px, y: h.py, star: h });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Clear scheduled playback and close audio on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      audioRef.current?.close().catch(() => {});
    };
  }, []);

  const audio = useCallback(() => {
    if (!audioRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      audioRef.current = new Ctor();
    }
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    return audioRef.current;
  }, []);

  const playNote = useCallback(
    (s: Star, when: number) => {
      const ac = audio();
      if (!ac) return;
      const t0 = ac.currentTime + when;
      const o = ac.createOscillator();
      const o2 = ac.createOscillator();
      const g = ac.createGain();
      const f = ac.createBiquadFilter();
      const fr = freqFor(s.lines);
      const dur = 0.6 + Math.min(1.6, s.lines / 400);
      o.type = "sine";
      o.frequency.value = fr;
      o2.type = "triangle";
      o2.frequency.value = fr * 2;
      f.type = "lowpass";
      f.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      o2.connect(f);
      f.connect(g);
      g.connect(ac.destination);
      o.start(t0);
      o2.start(t0);
      o.stop(t0 + dur + 0.05);
      o2.stop(t0 + dur + 0.05);
      timersRef.current.push(
        window.setTimeout(() => {
          flashRef.current[s.name] = performance.now();
        }, when * 1000),
      );
    },
    [audio],
  );

  const nearest = (x: number, y: number): Star | null => {
    let best: Star | null = null;
    let bd = 18 * 18;
    for (const s of starsRef.current) {
      const dx = s.px - x;
      const dy = s.py - y;
      const dd = dx * dx + dy * dy - s.size * s.size;
      if (dd < bd) {
        bd = dd;
        best = s;
      }
    }
    return best;
  };

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const s = nearest(e.clientX - r.left, e.clientY - r.top);
    hoverRef.current = s;
    if (!s) setTip(null);
  };

  const onLeave = () => {
    hoverRef.current = null;
    setTip(null);
  };

  const onTap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    onPointer(e);
    const s = hoverRef.current;
    if (s) {
      playNote(s, 0);
      setStatus(`${s.name}: ${s.lines} ${pluralLines(s.lines)}, ${GROUP_LABEL[s.group]}`);
    }
  };

  const playAll = () => {
    if (playing) return;
    if (!audio()) {
      setStatus("Ta przeglądarka nie obsługuje Web Audio.");
      return;
    }
    setPlaying(true);
    const seq = GROUP_ORDER.flatMap((g) =>
      starsRef.current.filter((s) => s.group === g),
    );
    const step = 0.22;
    seq.forEach((s, i) => {
      playNote(s, i * step);
      timersRef.current.push(
        window.setTimeout(() => {
          setStatus(`Gra: ${s.name} (${s.lines} ${pluralLines(s.lines)}, ${GROUP_LABEL[s.group]})`);
        }, i * step * 1000),
      );
    });
    timersRef.current.push(
      window.setTimeout(
        () => {
          setPlaying(false);
          setStatus(
            `To było ${seq.length} plików w ${Math.round(seq.length * step)} sekund. Kliknij dowolną gwiazdę, żeby zagrać ją osobno.`,
          );
        },
        seq.length * step * 1000 + 800,
      ),
    );
  };

  const toggleSpin = () => setWantSpin((v) => !v);

  return (
    <main className="galaxy">
      <section className="galaxy-sky" aria-label="Mapa plików repozytorium jako gwiazdy">
        <canvas
          ref={canvasRef}
          onPointerMove={onPointer}
          onPointerLeave={onLeave}
          onPointerDown={onTap}
        />
        {tip && (
          <div
            className="galaxy-tip"
            style={{ left: tip.x, top: tip.y }}
            role="status"
          >
            <b>{tip.star.name}</b>{" "}
            <span>
              {GROUP_LABEL[tip.star.group]} · {tip.star.lines}{" "}
              {pluralLines(tip.star.lines)}
            </span>
          </div>
        )}
        <div className="galaxy-hero">
          <div className="galaxy-wrap">
            <Link href="/" className="galaxy-back">
              <ArrowLeft size={14} /> Momentum
            </Link>
            <p className="galaxy-eyebrow">
              turbogit2011-png / chatbot · {FILES.length} plików · {RANGE.commits}{" "}
              commitów
            </p>
            <h1>
              Twoje repozytorium <em>widziane z góry</em>
            </h1>
            <p className="galaxy-lede">
              Każda gwiazda to jeden plik z katalogu src. Im więcej linii, tym
              jaśniej świeci. Najedź, żeby sprawdzić nazwę. Kliknij, żeby
              usłyszeć jego dźwięk.
            </p>
          </div>
        </div>
      </section>

      <div className="galaxy-wrap">
        <div className="galaxy-bar">
          <button type="button" onClick={playAll} disabled={playing}>
            <Volume2 size={15} />
            {playing ? "Gra…" : "Posłuchaj całego kodu"}
          </button>
          <button type="button" className="ghost" onClick={toggleSpin}>
            {spinning ? <Pause size={15} /> : <Play size={15} />}
            {spinning ? "Zatrzymaj obrót" : "Wznów obrót"}
          </button>
          <span className="galaxy-status" aria-live="polite">
            {status}
          </span>
          <div className="galaxy-legend">
            {GROUP_ORDER.map((g) => (
              <span key={g}>
                <i style={{ color: GROUP_COLOR[g], background: GROUP_COLOR[g] }} />
                {GROUP_LABEL[g]}
              </span>
            ))}
          </div>
        </div>

        <h2>Osiem rzeczy, których o tym kodzie nie wiedziałeś</h2>
        <p className="galaxy-sub">
          Wszystkie liczby policzone prosto z historii gita i zawartości
          katalogu src, stan na {RANGE.measuredOn}.
        </p>

        <div className="galaxy-facts">
          {FACTS.map((f) => (
            <div className="galaxy-fact" key={f.label}>
              <p className="k">{f.label}</p>
              <p className="n">
                {f.value}
                {f.unit && <small>{f.unit}</small>}
              </p>
              <p>
                {f.lead} <span>{f.detail}</span>
              </p>
            </div>
          ))}
        </div>

        <h2>Puls repozytorium</h2>
        <p className="galaxy-sub">
          {RANGE.days} dni, od pierwszego do ostatniego commitu. Każdy słupek to
          jeden dzień. Wysokość to liczba commitów.
        </p>
        <div className="galaxy-pulse-wrap">
          <div
            className="galaxy-pulse"
            role="img"
            aria-label={`Liczba commitów na dzień od 15 kwietnia do 21 sierpnia 2026`}
          >
            {days.map((d) => (
              <div
                key={d.key}
                className={d.n ? "day on" : "day"}
                style={{ height: d.n ? `${12 + (d.n / 15) * 88}%` : "3px" }}
                title={`${d.key}: ${d.n} ${pluralCommits(d.n)}`}
                data-label={d.n ? d.label : undefined}
              />
            ))}
          </div>
          <div className="galaxy-axis">
            <span>15 kwi 2026</span>
            <span>4 lip: 15 commitów</span>
            <span>21 sie 2026</span>
          </div>
        </div>

        <footer className="galaxy-foot">
          Dane: git log i wc -l na gałęzi roboczej, stan na {RANGE.measuredOn}.
        </footer>
      </div>
    </main>
  );
}
