"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTransitionRouter } from "next-view-transitions";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  Command as CommandIcon,
  Crown,
  CornerDownLeft,
  LayoutDashboard,
  Plus,
  Search,
  Sparkles,
  Timer,
} from "lucide-react";
import { useMounted } from "@/lib/store";
import { cn } from "@/lib/utils";
import { executeAction } from "@/lib/agent";

interface Cmd {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  keywords?: string;
  run: (router: ReturnType<typeof useTransitionRouter>) => void;
}

const COMMANDS: Cmd[] = [
  {
    id: "home",
    label: "Pulpit — Momentum",
    group: "Nawigacja",
    icon: <LayoutDashboard size={16} />,
    keywords: "dashboard produktywność zadania timer start",
    run: (r) => r.push("/"),
  },
  {
    id: "ai",
    label: "Aura — czat AI",
    group: "Nawigacja",
    icon: <Sparkles size={16} />,
    keywords: "chat asystent gpt model rozmowa",
    run: (r) => r.push("/ai"),
  },
  {
    id: "aura",
    label: "Aura — strona produktu",
    group: "Nawigacja",
    icon: <Crown size={16} />,
    keywords: "landing cennik pricing pro kup",
    run: (r) => r.push("/aura"),
  },
  {
    id: "wealth",
    label: "Droga do Miliarda",
    group: "Nawigacja",
    icon: <Coins size={16} />,
    keywords: "finanse kalkulator procent składany inwestycje",
    run: (r) => r.push("/wealth"),
  },
  {
    id: "quick-task",
    label: "Szybkie zadanie…",
    group: "Akcje",
    icon: <Plus size={16} />,
    keywords: "dodaj zadanie todo task",
    run: (r) => {
      const title = window.prompt("Treść zadania:");
      if (title && title.trim()) {
        executeAction(
          { tool: "add_task", args: { title: title.trim(), priority: "medium" } },
          () => {}
        );
        r.push("/");
      }
    },
  },
  {
    id: "quick-focus",
    label: "Sesja skupienia 25 min",
    group: "Akcje",
    icon: <Timer size={16} />,
    keywords: "pomodoro timer skupienie focus start",
    run: (r) => {
      executeAction({ tool: "set_timer", args: { minutes: 25 } }, () => {});
      r.push("/");
    },
  },
];

export function CommandPalette() {
  const mounted = useMounted();
  const router = useTransitionRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActive(0);
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) =>
      `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q)
    );
  }, [query]);

  function run(c: Cmd | undefined) {
    if (!c) return;
    setOpen(false);
    setQuery("");
    c.run(router);
  }

  if (!mounted) return null;

  return createPortal(
    <>
      {!open && (
        <button
          onClick={() => {
            setActive(0);
            setOpen(true);
          }}
          className="cmdk-trigger"
          aria-label="Otwórz paletę poleceń"
        >
          <CommandIcon size={13} />
          <span>Szukaj</span>
          <kbd>⌘K</kbd>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className="cmdk-overlay"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="cmdk-panel"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="cmdk-input-row">
                <Search size={16} className="text-[var(--text-subtle)]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((x) => Math.min(x + 1, results.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((x) => Math.max(x - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      run(results[active]);
                    }
                  }}
                  placeholder="Dokąd chcesz przejść?"
                  className="cmdk-input"
                />
                <kbd>esc</kbd>
              </div>

              <div className="cmdk-list">
                {results.length === 0 ? (
                  <div className="cmdk-empty">Brak wyników</div>
                ) : (
                  results.map((c, idx) => (
                    <Fragment key={c.id}>
                      {(idx === 0 || results[idx - 1].group !== c.group) && (
                        <div className="cmdk-group">{c.group}</div>
                      )}
                      <button
                        onClick={() => run(c)}
                        onMouseMove={() => setActive(idx)}
                        className={cn("cmdk-item", idx === active && "cmdk-item--active")}
                      >
                        <span className="cmdk-ico">{c.icon}</span>
                        <span className="flex-1 text-left">{c.label}</span>
                        {idx === active && (
                          <CornerDownLeft size={13} className="text-[var(--text-subtle)]" />
                        )}
                      </button>
                    </Fragment>
                  ))
                )}
              </div>

              <div className="cmdk-footer">
                <span><kbd>↑</kbd><kbd>↓</kbd> nawigacja</span>
                <span><kbd>↵</kbd> wybierz</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
