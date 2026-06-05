"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/* ----------------------------- Domain types ----------------------------- */

export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  createdAt: number;
  doneAt?: number;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  /** Set of day keys (YYYY-MM-DD) the habit was completed on. */
  history: string[];
  createdAt: number;
}

/** Minutes of deep focus logged per day, keyed by YYYY-MM-DD. */
export type FocusByDay = Record<string, number>;

/* ------------------------------ Date helpers ----------------------------- */

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns the last `n` day keys, oldest first, ending today. */
export function lastNDays(n: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const cur = new Date(d);
    cur.setDate(d.getDate() - i);
    keys.push(dayKey(cur));
  }
  return keys;
}

/** Consecutive-day streak ending today (today not-yet-done keeps streak alive). */
export function streakFor(history: string[]): number {
  const set = new Set(history);
  const d = new Date();
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (set.has(dayKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

export function isToday(ts?: number): boolean {
  if (!ts) return false;
  return dayKey(new Date(ts)) === dayKey();
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* --------------------------- Persistence hook ---------------------------- */

function readStored<T>(key: string, initial: T): T {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : initial;
  } catch {
    return initial;
  }
}

/**
 * State mirrored to localStorage. The lazy initializer reads storage only on
 * the client; consumers should gate storage-dependent UI behind `useMounted`
 * to keep the static-export markup and first client render in sync.
 */
export function usePersistentState<T>(
  key: string,
  initial: T
): readonly [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => readStored(key, initial));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage full or blocked — ignore */
    }
  }, [key, state]);

  return [state, setState] as const;
}

const emptySubscribe = () => () => {};

/** False during server render / hydration, true once running on the client. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/* ----------------------------- Storage keys ------------------------------ */

export const KEYS = {
  tasks: "momentum.tasks",
  habits: "momentum.habits",
  focus: "momentum.focus",
  notes: "momentum.notes",
  timer: "momentum.timer",
  goal: "momentum.goal",
} as const;
