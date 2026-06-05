"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cpu,
  Eraser,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { usePersistentState, useMounted } from "@/lib/store";

/* ---- Minimal typings for the dynamically loaded WebLLM module ---- */
interface InitProgress {
  progress: number;
  text: string;
}
interface ChatChunk {
  choices: { delta: { content?: string } }[];
}
interface ChatStream {
  [Symbol.asyncIterator](): AsyncIterator<ChatChunk>;
}
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
interface Engine {
  chat: {
    completions: {
      create: (opts: {
        messages: ChatMessage[];
        stream: boolean;
        temperature?: number;
        max_tokens?: number;
      }) => Promise<ChatStream>;
    };
  };
}
interface WebLLMModule {
  CreateMLCEngine: (
    model: string,
    opts: { initProgressCallback: (p: InitProgress) => void }
  ) => Promise<Engine>;
}

const MODELS = [
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    label: "Qwen2.5 0.5B",
    note: "najmniejszy · ~0,5 GB · najszybszy start",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    label: "Llama 3.2 1B",
    note: "zbalansowany · ~1 GB",
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 3B",
    note: "najmądrzejszy · ~2,3 GB · wymaga mocnego GPU",
  },
];

const SYSTEM_PROMPT: ChatMessage = {
  role: "system",
  content:
    "Jesteś Aura — pomocny, rzeczowy asystent AI działający w pełni offline na urządzeniu użytkownika. Odpowiadaj zwięźle i konkretnie. Pisz w języku użytkownika (domyślnie po polsku).",
};

type Status = "idle" | "loading" | "ready" | "error";

export default function LocalAI() {
  const mounted = useMounted();
  const [model, setModel] = usePersistentState<string>("aura.model", MODELS[0].id);
  const [messages, setMessages] = usePersistentState<ChatMessage[]>("aura.chat", []);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);

  const engineRef = useRef<Engine | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasWebGPU =
    mounted && typeof navigator !== "undefined" && "gpu" in navigator;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, generating]);

  async function loadModel() {
    setStatus("loading");
    setError("");
    setProgress(0);
    try {
      const dynImport = new Function("u", "return import(u)") as (
        u: string
      ) => Promise<WebLLMModule>;
      const webllm = await dynImport("https://esm.run/@mlc-ai/web-llm");
      const engine = await webllm.CreateMLCEngine(model, {
        initProgressCallback: (p) => {
          setProgress(p.progress);
          setProgressText(p.text);
        },
      });
      engineRef.current = engine;
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? e.message : "Nie udało się załadować modelu. Sprawdź połączenie i wsparcie WebGPU."
      );
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || generating || status !== "ready" || !engineRef.current) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setGenerating(true);

    try {
      const stream = await engineRef.current.chat.completions.create({
        messages: [SYSTEM_PROMPT, ...history],
        stream: true,
        temperature: 0.7,
        max_tokens: 800,
      });
      const iterator = stream[Symbol.asyncIterator]();
      while (true) {
        const { value, done } = await iterator.next();
        if (done) break;
        const delta = value?.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              next[next.length - 1] = { ...last, content: last.content + delta };
            }
            return next;
          });
        }
      }
    } catch (e) {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        const msg =
          "⚠️ Wystąpił błąd podczas generowania: " +
          (e instanceof Error ? e.message : "nieznany");
        if (last && last.role === "assistant" && last.content === "") {
          next[next.length - 1] = { ...last, content: msg };
        }
        return next;
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10" style={{ background: "var(--glow)" }} aria-hidden />
      <div className="fixed inset-0 -z-10 bg-grid opacity-40" aria-hidden />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors"
          >
            <ArrowLeft size={14} /> Wróć do Momentum
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--grad-brand)", boxShadow: "0 0 22px rgba(139,92,246,0.5)" }}
            >
              <Sparkles size={18} className="text-white" />
            </span>
            <span className="font-display text-3xl tracking-wide">Aura</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold">
            <span className="text-gradient">Prywatna AI</span>{" "}
            <span className="text-[var(--text-muted)] font-normal">
              działająca w 100% na Twoim urządzeniu.
            </span>
          </h1>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="chip" style={{ color: "var(--emerald)" }}>
              <Lock size={12} /> Zero serwerów
            </span>
            <span className="chip" style={{ color: "var(--cyan)" }}>
              <ShieldCheck size={12} /> Rozmowy nie opuszczają urządzenia
            </span>
            <span className="chip" style={{ color: "var(--amber)" }}>
              <Zap size={12} /> Bez API i opłat
            </span>
          </div>
        </header>

        {!mounted ? (
          <div className="card h-[420px] shimmer" aria-hidden />
        ) : !hasWebGPU ? (
          <div
            className="card p-6"
            style={{ borderColor: "rgba(251,113,133,0.35)", background: "rgba(251,113,133,0.06)" }}
          >
            <h2 className="font-semibold text-[var(--rose)] mb-2 flex items-center gap-2">
              <Cpu size={18} /> Ta przeglądarka nie wspiera WebGPU
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Aura uruchamia model AI lokalnie i potrzebuje WebGPU. Użyj najnowszego
              Chrome lub Edge (desktop) albo Chrome na Androidzie z włączonym WebGPU.
              Cała reszta aplikacji Momentum działa normalnie.
            </p>
          </div>
        ) : (
          <>
            {/* Model picker / loader */}
            {status !== "ready" && (
              <div className="card p-6 mb-5">
                <div className="text-sm text-[var(--text-muted)] mb-3">
                  Wybierz model. Pobiera się jednorazowo i zostaje w pamięci
                  przeglądarki — kolejne uruchomienia są błyskawiczne.
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      disabled={status === "loading"}
                      onClick={() => setModel(m.id)}
                      className="card p-3 text-left disabled:opacity-50"
                      style={
                        model === m.id
                          ? { borderColor: "var(--violet)", background: "rgba(139,92,246,0.08)" }
                          : undefined
                      }
                    >
                      <div className="font-semibold text-sm">{m.label}</div>
                      <div className="text-[11px] text-[var(--text-subtle)] mt-1">{m.note}</div>
                    </button>
                  ))}
                </div>

                {status === "loading" ? (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
                      <Loader2 size={16} className="animate-spin" />
                      Ładowanie modelu… {Math.round(progress * 100)}%
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress * 100}%`, background: "var(--grad-brand)" }}
                      />
                    </div>
                    <div className="text-[11px] text-[var(--text-subtle)] mt-2 truncate">{progressText}</div>
                  </div>
                ) : (
                  <button onClick={loadModel} className="btn btn-primary">
                    <Cpu size={16} /> Uruchom AURA (pobierz model)
                  </button>
                )}

                {status === "error" && (
                  <div className="text-sm text-[var(--rose)] mt-3">{error}</div>
                )}
              </div>
            )}

            {/* Chat */}
            {status === "ready" && (
              <div className="card flex flex-col" style={{ height: "min(70vh, 640px)" }}>
                <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--emerald)] animate-pulse-ring" />
                    Gotowa · {MODELS.find((m) => m.id === model)?.label}
                  </span>
                  <button
                    onClick={() => setMessages([])}
                    className="text-xs text-[var(--text-subtle)] hover:text-[var(--rose)] flex items-center gap-1 transition-colors"
                  >
                    <Eraser size={13} /> Wyczyść
                  </button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-[var(--text-subtle)] text-sm py-10">
                      Zadaj pierwsze pytanie. Wszystko dzieje się lokalnie. 🔒
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed"
                        style={
                          m.role === "user"
                            ? { background: "var(--grad-brand)", color: "#fff" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }
                        }
                      >
                        {m.content || (generating && i === messages.length - 1 ? "…" : "")}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder="Napisz wiadomość… (Enter wysyła, Shift+Enter = nowa linia)"
                    className="input-field resize-none max-h-32"
                  />
                  <button
                    onClick={send}
                    disabled={generating || !input.trim()}
                    className="btn btn-primary !px-4"
                    aria-label="Wyślij"
                  >
                    {generating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-[11px] text-[var(--text-subtle)] text-center mt-8 max-w-2xl mx-auto">
          Aura pobiera otwarty model językowy (Qwen / Llama) i uruchamia go w
          przeglądarce przez WebGPU. Pierwsze pobranie waży od ~0,5 do ~2,3 GB i
          jest cache&apos;owane. Model lokalny bywa mniej dokładny niż usługi
          chmurowe — ale Twoje rozmowy zostają wyłącznie u Ciebie.
        </p>
      </main>
    </div>
  );
}
