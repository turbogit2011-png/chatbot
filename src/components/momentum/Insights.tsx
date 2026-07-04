"use client";

import { useMemo } from "react";
import { Award, Clock3, Flame, TrendingUp } from "lucide-react";
import {
  FocusByDay,
  Habit,
  Task,
  dayKey,
  isToday,
  lastNDays,
  streakFor,
} from "@/lib/store";

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  progress?: number;
}) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="font-display text-4xl leading-none mt-1" style={{ color }}>
        {value}
      </div>
      <div className="text-[11px] text-[var(--text-subtle)]">{sub}</div>
      {progress !== undefined && (
        <div
          className="h-1.5 w-full rounded-full overflow-hidden mt-2"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progress * 100)}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}

export default function Insights({
  tasks,
  habits,
  focusByDay,
  goal,
}: {
  tasks: Task[];
  habits: Habit[];
  focusByDay: FocusByDay;
  goal: number;
}) {
  const week = useMemo(() => lastNDays(7), []);
  const today = dayKey();

  const focusToday = focusByDay[today] ?? 0;
  const focusWeek = week.reduce((sum, d) => sum + (focusByDay[d] ?? 0), 0);
  const tasksDoneToday = tasks.filter((t) => t.done && isToday(t.doneAt)).length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, streakFor(h.history)), 0);

  const max = Math.max(60, ...week.map((d) => focusByDay[d] ?? 0));
  const dayShort = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <span className="section-label">
          <TrendingUp size={14} /> Twój dzień
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<Clock3 size={15} />}
          label="Skupienie dziś"
          value={`${focusToday}`}
          sub={`z ${goal} min celu`}
          color="var(--violet)"
          progress={goal > 0 ? focusToday / goal : 0}
        />
        <StatCard
          icon={<Award size={15} />}
          label="Zadania dziś"
          value={`${tasksDoneToday}`}
          sub="ukończone"
          color="var(--emerald)"
        />
        <StatCard
          icon={<Flame size={15} />}
          label="Najlepsza passa"
          value={`${bestStreak}`}
          sub={bestStreak === 1 ? "dzień z rzędu" : "dni z rzędu"}
          color="var(--amber)"
        />
        <StatCard
          icon={<TrendingUp size={15} />}
          label="Tydzień"
          value={`${Math.round((focusWeek / 60) * 10) / 10}`}
          sub="godzin skupienia"
          color="var(--cyan)"
        />
      </div>

      {/* Weekly focus chart */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-[var(--text-subtle)] mb-3">
          Skupienie · ostatnie 7 dni
        </div>
        <div className="flex items-end justify-between gap-2 h-32">
          {week.map((d) => {
            const v = focusByDay[d] ?? 0;
            const h = Math.max(4, (v / max) * 100);
            const isCur = d === today;
            return (
              <div key={d} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                  {v > 0 ? v : ""}
                </span>
                <div
                  className="w-full rounded-md transition-all"
                  style={{
                    height: `${h}%`,
                    background: isCur
                      ? "var(--grad-brand)"
                      : "rgba(139,92,246,0.28)",
                    boxShadow: isCur ? "0 0 16px rgba(139,92,246,0.5)" : "none",
                  }}
                  title={`${d}: ${v} min`}
                />
                <span className="text-[10px] text-[var(--text-subtle)]">
                  {dayShort[new Date(d + "T00:00").getDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
