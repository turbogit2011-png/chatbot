"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ListTodo, Plus, Trash2 } from "lucide-react";
import { Priority, Task, uid, isToday } from "@/lib/store";
import { cn } from "@/lib/utils";

const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  high: { label: "Wysoki", color: "var(--rose)" },
  medium: { label: "Średni", color: "var(--amber)" },
  low: { label: "Niski", color: "var(--cyan)" },
};

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

type Filter = "all" | "active" | "done";

export default function Tasks({
  tasks,
  setTasks,
}: {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    return [...tasks]
      .filter((t) =>
        filter === "active" ? !t.done : filter === "done" ? t.done : true
      )
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.priority !== b.priority)
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        return b.createdAt - a.createdAt;
      });
  }, [tasks, filter]);

  const doneToday = tasks.filter((t) => t.done && isToday(t.doneAt)).length;
  const remaining = tasks.filter((t) => !t.done).length;

  function add() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      {
        id: uid(),
        title: trimmed,
        done: false,
        priority,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setTitle("");
  }

  function toggle(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, doneAt: !t.done ? Date.now() : undefined }
          : t
      )
    );
  }

  function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="card p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <span className="section-label">
          <ListTodo size={14} /> Zadania
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          <span className="text-[var(--emerald)] font-semibold">{doneToday}</span>{" "}
          ukończone · {remaining} aktywne
        </span>
      </div>

      {/* Add */}
      <div className="flex gap-2 mb-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Co masz dziś do zrobienia?"
          className="input-field"
        />
        <button onClick={add} className="btn btn-primary !px-4" aria-label="Dodaj zadanie">
          <Plus size={18} />
        </button>
      </div>

      {/* Priority + filter */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1.5">
          {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
              style={{
                color: priority === p ? "#fff" : "var(--text-muted)",
                background:
                  priority === p ? PRIORITY_META[p].color : "rgba(255,255,255,0.04)",
                border: `1px solid ${
                  priority === p ? PRIORITY_META[p].color : "var(--border)"
                }`,
              }}
            >
              {PRIORITY_META[p].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 text-[11px]">
          {(["all", "active", "done"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2 py-1 rounded-md transition-colors",
                filter === f
                  ? "text-[var(--text)] bg-white/8"
                  : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
              )}
            >
              {f === "all" ? "Wszystkie" : f === "active" ? "Aktywne" : "Zrobione"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto -mr-2 pr-2 min-h-[120px] max-h-[340px] space-y-2">
        <AnimatePresence initial={false}>
          {visible.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
            >
              <button
                onClick={() => toggle(t.id)}
                className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all"
                style={{
                  background: t.done ? "var(--emerald)" : "transparent",
                  border: `1.5px solid ${t.done ? "var(--emerald)" : "var(--border-strong)"}`,
                }}
                aria-label={t.done ? "Oznacz jako niezrobione" : "Oznacz jako zrobione"}
              >
                {t.done && <Check size={13} className="text-black" strokeWidth={3} />}
              </button>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: PRIORITY_META[t.priority].color }}
                title={`Priorytet: ${PRIORITY_META[t.priority].label}`}
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  t.done && "line-through text-[var(--text-subtle)]"
                )}
              >
                {t.title}
              </span>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-subtle)] hover:text-[var(--rose)]"
                aria-label="Usuń zadanie"
              >
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <div className="text-center text-[var(--text-subtle)] text-sm py-10">
            {filter === "done"
              ? "Brak ukończonych zadań."
              : "Brak zadań — dodaj pierwsze powyżej. ✨"}
          </div>
        )}
      </div>
    </div>
  );
}
