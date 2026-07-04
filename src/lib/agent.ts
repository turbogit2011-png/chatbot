/* Agentic tools for Aura. The model emits an ```action``` block; we parse and
   execute it against the Momentum data (localStorage) or navigation. Works with
   any model because it's prompt-driven, and degrades to plain chat if no block. */

import { uid } from "@/lib/store";

export interface ToolAction {
  tool: string;
  args: Record<string, unknown>;
}

export interface ActionResult {
  ok: boolean;
  label: string;
}

export const AGENT_SYSTEM = `Jesteś też agentem aplikacji Momentum i możesz wykonywać akcje. Gdy użytkownik prosi o KONKRETNĄ akcję (dodanie zadania, nawyku, notatki, ustawienie celu skupienia lub długości timera, przejście do sekcji), napisz jedno krótkie zdanie potwierdzenia, a POD nim dołącz blok akcji:

\`\`\`action
{"tool":"add_task","args":{"title":"Kup mleko","priority":"medium"}}
\`\`\`

Dostępne narzędzia:
- add_task {title, priority: "high"|"medium"|"low"}
- add_habit {name, emoji}
- add_note {text}
- set_goal {minutes}      // dzienny cel minut skupienia
- set_timer {minutes}     // długość sesji skupienia (Pomodoro)
- navigate {to: "pulpit"|"aura"|"wealth"}

Zasady: bloku "action" używaj WYŁĄCZNIE dla realnych żądań akcji. Zwykłe pytania i rozmowa → normalna odpowiedź bez bloku. Możesz dołączyć kilka bloków, jeśli użytkownik prosi o kilka rzeczy.`;

const K = {
  tasks: "momentum.tasks",
  habits: "momentum.habits",
  notes: "momentum.notes",
  goal: "momentum.goal",
  timer: "momentum.timer",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

const num = (v: unknown, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

export function parseActions(text: string): ToolAction[] {
  const out: ToolAction[] = [];
  const patterns = [/```action\s*([\s\S]*?)```/g, /<action>\s*([\s\S]*?)<\/action>/g];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      try {
        const obj = JSON.parse(m[1].trim()) as ToolAction;
        if (obj && typeof obj.tool === "string") {
          out.push({ tool: obj.tool, args: obj.args ?? {} });
        }
      } catch {
        /* malformed block — ignore */
      }
    }
  }
  return out;
}

export function stripActions(text: string): string {
  return text
    .replace(/```action[\s\S]*?```/g, "")
    .replace(/<action>[\s\S]*?<\/action>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function executeAction(
  action: ToolAction,
  navigate: (path: string) => void
): ActionResult {
  const a = action.args ?? {};
  switch (action.tool) {
    case "add_task": {
      const title = str(a.title).trim();
      if (!title) return { ok: false, label: "Brak tytułu zadania" };
      const p = str(a.priority);
      const priority = p === "high" || p === "low" ? p : "medium";
      const list = read<unknown[]>(K.tasks, []);
      list.unshift({ id: uid(), title, done: false, priority, createdAt: Date.now() });
      write(K.tasks, list);
      return { ok: true, label: `Dodano zadanie: „${title}”` };
    }
    case "add_habit": {
      const name = str(a.name).trim();
      if (!name) return { ok: false, label: "Brak nazwy nawyku" };
      const emoji = str(a.emoji).slice(0, 4) || "✨";
      const list = read<unknown[]>(K.habits, []);
      list.push({ id: uid(), name, emoji, history: [], createdAt: Date.now() });
      write(K.habits, list);
      return { ok: true, label: `Dodano nawyk: ${emoji} ${name}` };
    }
    case "add_note": {
      const text = str(a.text).trim();
      if (!text) return { ok: false, label: "Brak treści notatki" };
      const cur = read<string>(K.notes, "");
      write(K.notes, cur ? `${cur}\n${text}` : text);
      return { ok: true, label: "Zapisano notatkę" };
    }
    case "set_goal": {
      const minutes = num(a.minutes, 1, 600);
      if (!minutes) return { ok: false, label: "Nieprawidłowy cel" };
      write(K.goal, minutes);
      return { ok: true, label: `Cel dzienny: ${minutes} min skupienia` };
    }
    case "set_timer": {
      const minutes = num(a.minutes, 1, 120);
      if (!minutes) return { ok: false, label: "Nieprawidłowy czas" };
      const cur = read<Record<string, number>>(K.timer, { focus: 25, short: 5, long: 15 });
      write(K.timer, { ...cur, focus: minutes });
      return { ok: true, label: `Sesja skupienia ustawiona na ${minutes} min` };
    }
    case "navigate": {
      const map: Record<string, string> = {
        pulpit: "/",
        dashboard: "/",
        momentum: "/",
        aura: "/aura",
        ai: "/ai",
        czat: "/ai",
        wealth: "/wealth",
        miliard: "/wealth",
        finanse: "/wealth",
      };
      const to = map[str(a.to).toLowerCase()];
      if (!to) return { ok: false, label: "Nieznany cel nawigacji" };
      navigate(to);
      return { ok: true, label: `Przechodzę do: ${to}` };
    }
    default:
      return { ok: false, label: `Nieznane narzędzie: ${action.tool}` };
  }
}
