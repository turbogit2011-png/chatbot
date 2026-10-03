/**
 * Snapshot of this repository, measured on 2026-10-03 with `git log` and
 * `wc -l` over the tracked files in `src/`. Powers the /galaktyka page.
 */

export type GalaxyGroup =
  | "ai"
  | "momentum"
  | "wealth"
  | "aura"
  | "flow"
  | "ui"
  | "lib"
  | "app";

export interface GalaxyFile {
  name: string;
  lines: number;
  group: GalaxyGroup;
}

export const GROUP_ORDER: GalaxyGroup[] = [
  "ai",
  "momentum",
  "wealth",
  "aura",
  "flow",
  "ui",
  "lib",
  "app",
];

export const GROUP_LABEL: Record<GalaxyGroup, string> = {
  ai: "Aura AI",
  momentum: "Momentum",
  wealth: "Droga do Miliarda",
  aura: "Landing",
  flow: "FLOW.OS",
  ui: "UI",
  lib: "lib",
  app: "app",
};

export const GROUP_COLOR: Record<GalaxyGroup, string> = {
  ai: "#7fd1ff",
  momentum: "#ffb86b",
  wealth: "#8ef0b4",
  aura: "#d9a7ff",
  flow: "#ff8aa6",
  ui: "#fff3b0",
  lib: "#b9c2d6",
  app: "#6f7a99",
};

export const FILES: GalaxyFile[] = [
  { name: "LocalAI.tsx", lines: 964, group: "ai" },
  { name: "useEngine.ts", lines: 149, group: "ai" },
  { name: "ProModal.tsx", lines: 119, group: "ai" },
  { name: "Markdown.tsx", lines: 72, group: "ai" },
  { name: "types.ts", lines: 56, group: "ai" },
  { name: "ai/page.tsx", lines: 12, group: "ai" },
  { name: "FocusTimer.tsx", lines: 319, group: "momentum" },
  { name: "Dashboard.tsx", lines: 300, group: "momentum" },
  { name: "Tasks.tsx", lines: 199, group: "momentum" },
  { name: "Habits.tsx", lines: 180, group: "momentum" },
  { name: "Insights.tsx", lines: 153, group: "momentum" },
  { name: "Pwa.tsx", lines: 57, group: "momentum" },
  { name: "Notes.tsx", lines: 51, group: "momentum" },
  { name: "WealthPlanner.tsx", lines: 642, group: "wealth" },
  { name: "finance.ts", lines: 159, group: "wealth" },
  { name: "wealth/page.tsx", lines: 12, group: "wealth" },
  { name: "Landing.tsx", lines: 356, group: "aura" },
  { name: "ThankYou.tsx", lines: 117, group: "aura" },
  { name: "dziekujemy/page.tsx", lines: 18, group: "aura" },
  { name: "aura/page.tsx", lines: 12, group: "aura" },
  { name: "FlowOsCommandCenter.tsx", lines: 435, group: "flow" },
  { name: "flow-os/layout.tsx", lines: 11, group: "flow" },
  { name: "flow-os/page.tsx", lines: 5, group: "flow" },
  { name: "CommandPalette.tsx", lines: 230, group: "ui" },
  { name: "Aurora.tsx", lines: 37, group: "ui" },
  { name: "agent.ts", lines: 153, group: "lib" },
  { name: "store.ts", lines: 127, group: "lib" },
  { name: "speech.ts", lines: 113, group: "lib" },
  { name: "confetti.ts", lines: 90, group: "lib" },
  { name: "pro.ts", lines: 74, group: "lib" },
  { name: "utils.ts", lines: 6, group: "lib" },
  { name: "site.ts", lines: 4, group: "lib" },
  { name: "globals.css", lines: 620, group: "app" },
  { name: "layout.tsx", lines: 79, group: "app" },
  { name: "manifest.ts", lines: 36, group: "app" },
  { name: "not-found.tsx", lines: 28, group: "app" },
  { name: "sitemap.ts", lines: 13, group: "app" },
  { name: "robots.ts", lines: 11, group: "app" },
  { name: "page.tsx", lines: 5, group: "app" },
];

/** Commits per calendar day (UTC), first to last commit. */
export const COMMITS_BY_DAY: Record<string, number> = {
  "2026-04-15": 1,
  "2026-05-13": 4,
  "2026-05-14": 2,
  "2026-06-05": 5,
  "2026-06-06": 2,
  "2026-07-03": 1,
  "2026-07-04": 15,
  "2026-07-05": 8,
  "2026-08-21": 1,
};

export const RANGE = {
  start: "2026-04-15",
  end: "2026-08-21",
  days: 129,
  commits: 39,
  measuredOn: "3 października 2026",
};

export interface Fact {
  label: string;
  value: string;
  unit?: string;
  lead: string;
  detail: string;
}

export const FACTS: Fact[] = [
  {
    label: "Idealny remis",
    value: "19",
    unit: ": 19",
    lead: "Turbo Git ma na koncie 19 commitów. Claude też dokładnie 19.",
    detail: "Człowiek i maszyna, pół na pół, co do jednego.",
  },
  {
    label: "Supernowa",
    value: "15",
    unit: "commitów",
    lead: "Tyle wylądowało 4 lipca 2026, w jeden dzień.",
    detail:
      "To 38% całej historii repozytorium. Pozostałe 8 dni pracy razem dały 24.",
  },
  {
    label: "Nocny marek",
    value: "21",
    unit: ":00",
    lead: "Najczęstsza godzina commitów. 10 z 39 trafiło do historii między 21:00 a 22:00.",
    detail: "Przed południem powstało tylko 7.",
  },
  {
    label: "Kod mówi po polsku",
    value: "2 079",
    lead: "Tyle razy w kodzie źródłowym pojawia się ą, ć, ę, ł, ń, ó, ś, ź lub ż.",
    detail: "Średnio jeden polski znak na każde 3 linie.",
  },
  {
    label: "Objętość",
    value: "6 054",
    unit: "linii",
    lead: "Razem 258 236 znaków.",
    detail: "Czytane na głos w tempie lektora zajęłyby prawie pięć godzin.",
  },
  {
    label: "Największa gwiazda",
    value: "964",
    unit: "linie",
    lead: "LocalAI.tsx, serce prywatnej Aury.",
    detail:
      "Sam jeden to 16% całego kodu. Najmniejszy plik, site.ts, ma 4 linie.",
  },
  {
    label: "Równowaga",
    value: "2 016",
    lead: "Otwierających klamer w src.",
    detail:
      "Dokładnie tyle samo zamykających, inaczej nic by się nie zbudowało. Repozytorium jest w równowadze.",
  },
  {
    label: "Rytm",
    value: "9",
    unit: "dni",
    lead: "Tylko w tylu dniach powstały commity, na przestrzeni 129 dni od 15 kwietnia do 21 sierpnia.",
    detail: "Długie cisze, krótkie błyski.",
  },
];

/** Polish plural for "linia". */
export function pluralLines(n: number): string {
  if (n === 1) return "linia";
  const d = n % 10;
  const h = n % 100;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return "linie";
  return "linii";
}

/** Polish plural for "commit". */
export function pluralCommits(n: number): string {
  if (n === 1) return "commit";
  const d = n % 10;
  const h = n % 100;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return "commity";
  return "commitów";
}
