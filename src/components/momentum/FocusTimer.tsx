"use client";

import { useEffect, useRef, useState } from "react";
import { Brain, Coffee, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { usePersistentState, KEYS } from "@/lib/store";
import { cn } from "@/lib/utils";

type Mode = "focus" | "short" | "long";

interface TimerConfig {
  focus: number;
  short: number;
  long: number;
}

const DEFAULT_CONFIG: TimerConfig = { focus: 25, short: 5, long: 15 };

const MODE_META: Record<Mode, { label: string; color: string }> = {
  focus: { label: "Skupienie", color: "var(--violet)" },
  short: { label: "Krótka przerwa", color: "var(--cyan)" },
  long: { label: "Długa przerwa", color: "var(--emerald)" },
};

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Short, gentle two-tone chime using the Web Audio API. */
function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const notes = [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  } catch {
    /* audio unavailable — silent fallback */
  }
}

export default function FocusTimer({
  focusToday,
  onLogMinutes,
}: {
  focusToday: number;
  onLogMinutes: (minutes: number) => void;
}) {
  const [config, setConfig] = usePersistentState<TimerConfig>(
    KEYS.timer,
    DEFAULT_CONFIG
  );
  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => config.focus * 60);
  const [sessions, setSessions] = useState(0);

  const total = config[mode] * 60;

  // Mirror the latest mode/sessions into a ref so the ticking effect can read
  // them at completion time without re-subscribing every second.
  const stateRef = useRef({ mode, sessions });
  useEffect(() => {
    stateRef.current = { mode, sessions };
  });

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Session finished.
        playChime();
        const cur = stateRef.current;
        if (cur.mode === "focus") {
          onLogMinutes(config.focus);
          const next = cur.sessions + 1;
          setSessions(next);
          const nextMode: Mode = next % 4 === 0 ? "long" : "short";
          setMode(nextMode);
          setSecondsLeft(config[nextMode] * 60);
        } else {
          setMode("focus");
          setSecondsLeft(config.focus * 60);
        }
        setRunning(false);
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, config, onLogMinutes]);

  const progress = total > 0 ? 1 - secondsLeft / total : 0;
  const R = 130;
  const C = 2 * Math.PI * R;
  const accent = MODE_META[mode].color;

  function reset() {
    setRunning(false);
    setSecondsLeft(config[mode] * 60);
  }

  function skip() {
    setRunning(false);
    const next: Mode = mode === "focus" ? "short" : "focus";
    setMode(next);
    setSecondsLeft(config[next] * 60);
  }

  function updateConfig(key: keyof TimerConfig, value: number) {
    const v = Math.max(1, Math.min(120, Math.round(value) || 1));
    setConfig((c) => ({ ...c, [key]: v }));
    if (!running && key === mode) setSecondsLeft(v * 60);
  }

  return (
    <div className="card card-glow p-6 sm:p-8 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-6">
        <span className="section-label">
          {mode === "focus" ? <Brain size={14} /> : <Coffee size={14} />}
          {MODE_META[mode].label}
        </span>
        <span className="chip" style={{ color: "var(--text-muted)" }}>
          {focusToday} min dzisiaj
        </span>
      </div>

      {/* Mode switch */}
      <div className="flex gap-2 mb-7">
        {(Object.keys(MODE_META) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setRunning(false);
              setMode(m);
              setSecondsLeft(config[m] * 60);
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              mode === m
                ? "text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
            style={
              mode === m
                ? { background: "rgba(255,255,255,0.08)", border: "1px solid var(--border-strong)" }
                : { border: "1px solid transparent" }
            }
          >
            {MODE_META[m].label}
          </button>
        ))}
      </div>

      {/* Ring */}
      <div className="relative" style={{ width: 300, height: 300 }}>
        <svg width="300" height="300" className="-rotate-90">
          <circle
            cx="150"
            cy="150"
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="14"
          />
          <circle
            cx="150"
            cy="150"
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{
              transition: "stroke-dashoffset 0.5s linear, stroke 0.4s ease",
              filter: `drop-shadow(0 0 12px ${accent})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-7xl tabular-nums"
            style={{ textShadow: `0 0 40px ${accent}66` }}
          >
            {format(secondsLeft)}
          </span>
          <span className="text-[var(--text-subtle)] text-sm mt-1">
            sesja #{sessions + 1}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mt-7">
        <button
          onClick={reset}
          className="btn btn-ghost !p-3"
          aria-label="Resetuj"
          title="Resetuj"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={() => setRunning((r) => !r)}
          className="btn btn-primary !px-8 !py-3.5 text-base"
        >
          {running ? <Pause size={20} /> : <Play size={20} />}
          {running ? "Pauza" : "Start"}
        </button>
        <button
          onClick={skip}
          className="btn btn-ghost !p-3"
          aria-label="Pomiń"
          title="Pomiń sesję"
        >
          <SkipForward size={18} />
        </button>
      </div>

      {/* Config */}
      <div className="grid grid-cols-3 gap-3 mt-7 w-full">
        {(Object.keys(MODE_META) as Mode[]).map((m) => (
          <label key={m} className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">
              {MODE_META[m].label.split(" ")[0]}
            </span>
            <input
              type="number"
              min={1}
              max={120}
              value={config[m]}
              onChange={(e) => updateConfig(m, Number(e.target.value))}
              className="input-field text-center !py-2"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
