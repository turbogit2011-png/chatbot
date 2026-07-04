"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Plus, Repeat, Trash2 } from "lucide-react";
import { Habit, dayKey, lastNDays, streakFor, uid } from "@/lib/store";
import { cn } from "@/lib/utils";

const EMOJIS = ["💧", "🏃", "📚", "🧘", "💪", "🥗", "😴", "✍️", "🎯", "🌱"];

export default function Habits({
  habits,
  setHabits,
}: {
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const today = dayKey();
  const week = lastNDays(7);

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setHabits((prev) => [
      ...prev,
      { id: uid(), name: trimmed, emoji, history: [], createdAt: Date.now() },
    ]);
    setName("");
  }

  function toggleToday(id: string) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const has = h.history.includes(today);
        return {
          ...h,
          history: has
            ? h.history.filter((d) => d !== today)
            : [...h.history, today],
        };
      })
    );
  }

  function remove(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  const dayLabels = ["N", "P", "W", "Ś", "C", "P", "S"];

  return (
    <div className="card p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <span className="section-label">
          <Repeat size={14} /> Nawyki
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {habits.filter((h) => h.history.includes(today)).length}/{habits.length}{" "}
          dziś
        </span>
      </div>

      {/* Add */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => {
            const i = EMOJIS.indexOf(emoji);
            setEmoji(EMOJIS[(i + 1) % EMOJIS.length]);
          }}
          className="btn btn-ghost !px-3 text-lg"
          title="Zmień ikonę"
          aria-label="Zmień ikonę"
        >
          {emoji}
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nowy nawyk, np. Pij wodę"
          className="input-field"
        />
        <button onClick={add} className="btn btn-primary !px-4" aria-label="Dodaj nawyk">
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto -mr-2 pr-2 min-h-[120px] max-h-[360px] space-y-2 mt-3">
        <AnimatePresence initial={false}>
          {habits.map((h) => {
            const doneToday = h.history.includes(today);
            const streak = streakFor(h.history);
            const set = new Set(h.history);
            return (
              <motion.div
                key={h.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="group rounded-xl px-3 py-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleToday(h.id)}
                    className={cn(
                      "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all"
                    )}
                    style={{
                      background: doneToday ? "var(--grad-brand)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${doneToday ? "transparent" : "var(--border)"}`,
                      boxShadow: doneToday ? "0 0 18px rgba(139,92,246,0.4)" : "none",
                    }}
                    aria-label="Przełącz nawyk na dziś"
                  >
                    {h.emoji}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{h.name}</div>
                    <div className="flex items-center gap-1 text-[11px] mt-0.5">
                      <Flame
                        size={12}
                        style={{ color: streak > 0 ? "var(--amber)" : "var(--text-subtle)" }}
                      />
                      <span style={{ color: streak > 0 ? "var(--amber)" : "var(--text-subtle)" }}>
                        {streak} {streak === 1 ? "dzień" : "dni"} z rzędu
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {week.map((d, i) => (
                      <div
                        key={d}
                        className="flex flex-col items-center gap-1"
                        title={d}
                      >
                        <span className="text-[9px] text-[var(--text-subtle)]">
                          {dayLabels[new Date(d + "T00:00").getDay()]}
                        </span>
                        <span
                          className="w-3.5 h-3.5 rounded-[4px]"
                          style={{
                            background: set.has(d)
                              ? "var(--violet)"
                              : "rgba(255,255,255,0.06)",
                            outline:
                              i === week.length - 1
                                ? "1px solid var(--border-strong)"
                                : "none",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => remove(h.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-subtle)] hover:text-[var(--rose)] ml-1"
                    aria-label="Usuń nawyk"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {habits.length === 0 && (
          <div className="text-center text-[var(--text-subtle)] text-sm py-10">
            Zbuduj passę — dodaj swój pierwszy nawyk. 🔥
          </div>
        )}
      </div>
    </div>
  );
}
