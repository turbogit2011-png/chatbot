export interface AuraMessage {
  role: "system" | "user" | "assistant";
  content: string;
  /** Tokens-per-second for assistant messages (display only). */
  tps?: number;
  /** Agent actions Aura executed for this message. */
  actions?: { ok: boolean; label: string }[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: AuraMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AuraSettings {
  model: string;
  temperature: number;
  systemPrompt: string;
}

export const MODELS = [
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    label: "Qwen2.5 0.5B",
    note: "najmniejszy · ~0,5 GB · najszybszy",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    label: "Llama 3.2 1B",
    note: "zbalansowany · ~1 GB",
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 3B",
    note: "najmądrzejszy · ~2,3 GB · mocne GPU",
  },
] as const;

export const DEFAULT_SYSTEM_PROMPT =
  "Jesteś Aura — pomocny, rzeczowy asystent AI działający w pełni offline na urządzeniu użytkownika. Odpowiadaj zwięźle i konkretnie, formatując odpowiedzi w Markdown. Pisz w języku użytkownika (domyślnie po polsku).";

export const DEFAULT_SETTINGS: AuraSettings = {
  model: MODELS[0].id,
  temperature: 0.7,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

export const STARTER_PROMPTS = [
  "Dodaj zadanie: przygotować prezentację (wysoki priorytet)",
  "Ustaw timer skupienia na 50 minut",
  "Napisz funkcję w JS, która odwraca słowa w zdaniu.",
  "Wyjaśnij procent składany jak dla 10-latka.",
];
