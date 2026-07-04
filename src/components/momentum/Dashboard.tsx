"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Coins, Download, Sparkles, Trash2, Upload, Zap } from "lucide-react";
import {
  FocusByDay,
  Habit,
  KEYS,
  Task,
  dayKey,
  useMounted,
  usePersistentState,
} from "@/lib/store";
import { fireConfetti } from "@/lib/confetti";
import FocusTimer from "./FocusTimer";
import Tasks from "./Tasks";
import Habits from "./Habits";
import Notes from "./Notes";
import Insights from "./Insights";
import { InstallButton } from "./Pwa";

const DEFAULT_GOAL = 120;

function greeting(hour: number): string {
  if (hour < 5) return "Spokojnej nocy";
  if (hour < 12) return "Dzień dobry";
  if (hour < 18) return "Miłego popołudnia";
  return "Dobry wieczór";
}

function Clock() {
  const mounted = useMounted();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!mounted) {
    // Stable placeholder so server and first client render match.
    return (
      <div className="text-right">
        <div className="font-display text-3xl sm:text-4xl text-[var(--text-subtle)]">
          --:--
        </div>
      </div>
    );
  }

  const date = now.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = now.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="text-right">
      <div className="font-display text-3xl sm:text-4xl tabular-nums leading-none">
        {time}
      </div>
      <div className="text-xs text-[var(--text-muted)] capitalize mt-1">{date}</div>
    </div>
  );
}

export default function Dashboard() {
  const [tasks, setTasks] = usePersistentState<Task[]>(KEYS.tasks, []);
  const [habits, setHabits] = usePersistentState<Habit[]>(KEYS.habits, []);
  const [focusByDay, setFocusByDay] = usePersistentState<FocusByDay>(KEYS.focus, {});
  const [notes, setNotes] = usePersistentState<string>(KEYS.notes, "");
  const [goal, setGoal] = usePersistentState<number>(KEYS.goal, DEFAULT_GOAL);
  const mounted = useMounted();
  const fileRef = useRef<HTMLInputElement>(null);

  const hour = mounted ? new Date().getHours() : 9;
  const focusToday = focusByDay[dayKey()] ?? 0;

  const logMinutes = useCallback(
    (minutes: number) => {
      const key = dayKey();
      setFocusByDay((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + minutes }));
    },
    [setFocusByDay]
  );

  // Celebrate reaching the daily focus goal (skips the initial load).
  const goalMetRef = useRef<boolean | null>(null);
  useEffect(() => {
    const met = goal > 0 && focusToday >= goal;
    if (goalMetRef.current === null) {
      goalMetRef.current = met;
      return;
    }
    if (met && !goalMetRef.current) fireConfetti(0.5, 0.35, 170);
    goalMetRef.current = met;
  }, [focusToday, goal]);

  // Celebrate clearing every task for the day.
  const allDoneRef = useRef<boolean | null>(null);
  useEffect(() => {
    const allDone = tasks.length > 0 && tasks.every((t) => t.done);
    if (allDoneRef.current === null) {
      allDoneRef.current = allDone;
      return;
    }
    if (allDone && !allDoneRef.current) fireConfetti(0.5, 0.4, 140);
    allDoneRef.current = allDone;
  }, [tasks]);

  function exportData() {
    const data = { tasks, habits, focusByDay, notes, exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `momentum-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data.tasks)) setTasks(data.tasks);
        if (Array.isArray(data.habits)) setHabits(data.habits);
        if (data.focusByDay && typeof data.focusByDay === "object")
          setFocusByDay(data.focusByDay);
        if (typeof data.notes === "string") setNotes(data.notes);
      } catch {
        /* ignore invalid file */
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!window.confirm("Na pewno wyczyścić wszystkie dane Momentum? Tego nie można cofnąć.")) return;
    setTasks([]);
    setHabits([]);
    setFocusByDay({});
    setNotes("");
  }

  return (
    <div className="relative min-h-screen">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-start justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--grad-brand)", boxShadow: "0 0 20px rgba(139,92,246,0.5)" }}
              >
                <Zap size={17} className="text-white" />
              </span>
              <span className="font-display text-2xl tracking-wide">Momentum</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold">
              <span className="text-gradient">{greeting(hour)}.</span>{" "}
              <span className="text-[var(--text-muted)] font-normal">
                Zróbmy dziś coś wielkiego.
              </span>
            </h1>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link
                href="/aura"
                className="chip hover:!border-[var(--violet)] transition-colors"
                style={{ color: "var(--violet)" }}
              >
                <Sparkles size={13} /> Aura — prywatna AI w przeglądarce
              </Link>
              <Link
                href="/wealth"
                className="chip hover:!border-[var(--violet)] transition-colors"
                style={{ color: "var(--violet)" }}
              >
                <Coins size={13} /> Droga do Miliarda
              </Link>
            </div>
          </div>
          <Clock />
        </motion.header>

        {!mounted ? (
          <DashboardSkeleton />
        ) : (
          <>
        {/* Insights */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-5"
        >
          <Insights
            tasks={tasks}
            habits={habits}
            focusByDay={focusByDay}
            goal={goal}
          />
        </motion.div>

        {/* Main grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid gap-5 lg:grid-cols-3 items-start"
        >
          <div className="lg:row-span-2">
            <FocusTimer
              focusToday={focusToday}
              goal={goal}
              onGoalChange={setGoal}
              onLogMinutes={logMinutes}
            />
          </div>
          <div className="lg:col-span-2">
            <Tasks tasks={tasks} setTasks={setTasks} />
          </div>
          <Habits habits={habits} setHabits={setHabits} />
          <Notes notes={notes} setNotes={setNotes} />
        </motion.div>

        {/* Footer / data tools */}
        <footer className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-subtle)]">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-[var(--violet)]" />
            <span>
              Wszystkie dane są przechowywane wyłącznie na Twoim urządzeniu — żadnych
              kont, żadnego śledzenia.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <InstallButton />
            <button onClick={exportData} className="btn btn-ghost !py-2 !px-3 text-xs">
              <Download size={14} /> Eksport
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="btn btn-ghost !py-2 !px-3 text-xs"
            >
              <Upload size={14} /> Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={resetAll}
              className="btn btn-ghost !py-2 !px-3 text-xs hover:!text-[var(--rose)]"
            >
              <Trash2 size={14} /> Reset
            </button>
          </div>
        </footer>
          </>
        )}
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="card h-40 shimmer" />
      <div className="grid gap-5 lg:grid-cols-3 items-start">
        <div className="card h-[520px] shimmer lg:row-span-2" />
        <div className="card h-72 shimmer lg:col-span-2" />
        <div className="card h-72 shimmer" />
        <div className="card h-72 shimmer" />
      </div>
    </div>
  );
}
