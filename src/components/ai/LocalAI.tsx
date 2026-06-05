"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cpu,
  Download,
  Eraser,
  Gauge,
  Loader2,
  Lock,
  MessageSquarePlus,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { usePersistentState, useMounted, uid } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEngine } from "./useEngine";
import { Markdown } from "./Markdown";
import {
  AuraMessage,
  AuraSettings,
  Conversation,
  DEFAULT_SETTINGS,
  DEFAULT_SYSTEM_PROMPT,
  MODELS,
  STARTER_PROMPTS,
} from "./types";

export default function LocalAI() {
  const mounted = useMounted();
  const [conversations, setConversations] = usePersistentState<Conversation[]>(
    "aura.conversations",
    []
  );
  const [activeId, setActiveId] = usePersistentState<string | null>("aura.activeId", null);
  const [settings, setSettings] = usePersistentState<AuraSettings>(
    "aura.settings",
    DEFAULT_SETTINGS
  );
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const engine = useEngine();
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasWebGPU = mounted && typeof navigator !== "undefined" && "gpu" in navigator;
  const active = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active?.messages, generating]);

  /* --------------------------- conversation ops --------------------------- */

  function newConversation() {
    setActiveId(null);
    setInput("");
    setSidebarOpen(false);
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function renameConversation(id: string) {
    const current = conversations.find((c) => c.id === id);
    const title = window.prompt("Nazwa rozmowy:", current?.title ?? "");
    if (title != null)
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: title.trim() || c.title } : c))
      );
  }

  /* ------------------------------ generation ------------------------------ */

  async function runGeneration(convId: string, history: AuraMessage[]) {
    setGenerating(true);
    try {
      const tps = await engine.generate(history, settings.temperature, (delta) => {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            const m = [...c.messages];
            const last = m[m.length - 1];
            if (last?.role === "assistant")
              m[m.length - 1] = { ...last, content: last.content + delta };
            return { ...c, messages: m, updatedAt: Date.now() };
          })
        );
      });
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const m = [...c.messages];
          const last = m[m.length - 1];
          if (last?.role === "assistant") m[m.length - 1] = { ...last, tps };
          return { ...c, messages: m };
        })
      );
    } catch (e) {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const m = [...c.messages];
          const last = m[m.length - 1];
          const msg =
            "⚠️ Błąd generowania: " + (e instanceof Error ? e.message : "nieznany");
          if (last?.role === "assistant")
            m[m.length - 1] = { ...last, content: last.content || msg };
          return { ...c, messages: m };
        })
      );
    } finally {
      setGenerating(false);
    }
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || generating || engine.status !== "ready") return;

    const existing =
      activeId && conversations.some((c) => c.id === activeId) ? activeId : null;
    const convId = existing ?? uid();
    const userMsg: AuraMessage = { role: "user", content: text };
    const prior = conversations.find((c) => c.id === convId)?.messages ?? [];

    setConversations((prev) => {
      const list = prev.some((c) => c.id === convId)
        ? prev
        : [
            {
              id: convId,
              title: "Nowa rozmowa",
              messages: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            ...prev,
          ];
      return list.map((c) =>
        c.id === convId
          ? {
              ...c,
              title: c.messages.length === 0 ? text.slice(0, 42) : c.title,
              messages: [...c.messages, userMsg, { role: "assistant", content: "" }],
              updatedAt: Date.now(),
            }
          : c
      );
    });
    setActiveId(convId);
    setInput("");

    const history: AuraMessage[] = [
      { role: "system", content: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT },
      ...prior,
      userMsg,
    ];
    await runGeneration(convId, history);
  }

  function regenerate() {
    if (!active || generating || engine.status !== "ready") return;
    const msgs = [...active.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
    if (!msgs.length) return;
    const convId = active.id;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: [...msgs, { role: "assistant", content: "" }] }
          : c
      )
    );
    const history: AuraMessage[] = [
      { role: "system", content: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT },
      ...msgs,
    ];
    runGeneration(convId, history);
  }

  function exportConversation() {
    if (!active) return;
    const md = active.messages
      .map((m) => `## ${m.role === "user" ? "Ty" : "Aura"}\n\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([`# ${active.title}\n\n${md}\n`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-${active.title.slice(0, 24).replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* -------------------------------- render -------------------------------- */

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10" style={{ background: "var(--glow)" }} aria-hidden />
      <div className="fixed inset-0 -z-10 bg-grid opacity-40" aria-hidden />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Header />

        {!mounted ? (
          <div className="card h-[460px] shimmer" aria-hidden />
        ) : !hasWebGPU ? (
          <WebGpuWarning />
        ) : engine.status !== "ready" ? (
          <Loader
            settings={settings}
            setSettings={setSettings}
            engine={engine}
            onOpenSettings={() => setShowSettings(true)}
          />
        ) : (
          <div
            className="card overflow-hidden flex relative"
            style={{ height: "min(76vh, 760px)" }}
          >
            {/* Sidebar */}
            {sidebarOpen && (
              <button
                className="absolute inset-0 bg-black/50 z-10 md:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Zamknij panel"
              />
            )}
            <aside
              className={cn(
                "w-64 shrink-0 flex-col bg-[var(--bg-secondary)]",
                "md:flex md:static md:z-auto",
                sidebarOpen ? "flex absolute inset-y-0 left-0 z-20" : "hidden"
              )}
              style={{ borderRight: "1px solid var(--border)" }}
            >
              <div className="p-3">
                <button onClick={newConversation} className="btn btn-primary w-full text-sm">
                  <MessageSquarePlus size={16} /> Nowa rozmowa
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {conversations.length === 0 && (
                  <p className="text-xs text-[var(--text-subtle)] text-center py-6 px-2">
                    Brak rozmów. Zacznij pisać poniżej.
                  </p>
                )}
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-lg px-2.5 py-2 cursor-pointer text-sm",
                      c.id === activeId ? "bg-white/8" : "hover:bg-white/5"
                    )}
                    onClick={() => {
                      setActiveId(c.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <span className="flex-1 truncate">{c.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        renameConversation(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] hover:text-[var(--text)] transition-opacity"
                      aria-label="Zmień nazwę"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] hover:text-[var(--rose)] transition-opacity"
                      aria-label="Usuń"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => setShowSettings(true)}
                  className="btn btn-ghost w-full text-sm"
                >
                  <Settings2 size={15} /> Ustawienia
                </button>
              </div>
            </aside>

            {/* Chat column */}
            <section className="flex-1 flex flex-col min-w-0">
              <div
                className="flex items-center justify-between px-4 py-2.5 gap-2"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden btn btn-ghost !p-2"
                  aria-label="Rozmowy"
                >
                  <Plus size={16} />
                </button>
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[var(--emerald)] animate-pulse-ring shrink-0" />
                  <span className="truncate">
                    {MODELS.find((m) => m.id === settings.model)?.label} · lokalnie
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={regenerate}
                    disabled={!active || generating}
                    className="btn btn-ghost !p-2 disabled:opacity-40"
                    aria-label="Regeneruj"
                    title="Regeneruj odpowiedź"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    onClick={exportConversation}
                    disabled={!active}
                    className="btn btn-ghost !p-2 disabled:opacity-40"
                    aria-label="Eksportuj"
                    title="Eksportuj rozmowę (.md)"
                  >
                    <Download size={15} />
                  </button>
                  {active && (
                    <button
                      onClick={() => deleteConversation(active.id)}
                      className="btn btn-ghost !p-2"
                      aria-label="Wyczyść rozmowę"
                      title="Usuń rozmowę"
                    >
                      <Eraser size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
                {!active || active.messages.length === 0 ? (
                  <EmptyState onPick={(p) => send(p)} />
                ) : (
                  <div className="space-y-5 max-w-3xl mx-auto">
                    {active.messages.map((m, i) => (
                      <MessageBubble
                        key={i}
                        message={m}
                        streaming={generating && i === active.messages.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>

              <Composer
                input={input}
                setInput={setInput}
                onSend={() => send()}
                onStop={engine.stop}
                generating={generating}
              />
            </section>
          </div>
        )}

        <Footer />
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          setSettings={setSettings}
          engine={engine}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------ subcomponents ----------------------------- */

function Header() {
  return (
    <header className="mb-5">
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
      <div className="flex flex-wrap gap-2">
        <span className="chip" style={{ color: "var(--emerald)" }}>
          <Lock size={12} /> Zero serwerów
        </span>
        <span className="chip" style={{ color: "var(--cyan)" }}>
          <ShieldCheck size={12} /> Rozmowy zostają u Ciebie
        </span>
        <span className="chip" style={{ color: "var(--amber)" }}>
          <Zap size={12} /> Bez API i opłat
        </span>
      </div>
    </header>
  );
}

function WebGpuWarning() {
  return (
    <div
      className="card p-6"
      style={{ borderColor: "rgba(251,113,133,0.35)", background: "rgba(251,113,133,0.06)" }}
    >
      <h2 className="font-semibold text-[var(--rose)] mb-2 flex items-center gap-2">
        <Cpu size={18} /> Ta przeglądarka nie wspiera WebGPU
      </h2>
      <p className="text-sm text-[var(--text-muted)]">
        Aura uruchamia model AI lokalnie i potrzebuje WebGPU. Użyj najnowszego Chrome
        lub Edge (desktop), albo Chrome na Androidzie z włączonym WebGPU. Reszta
        Momentum działa normalnie.
      </p>
    </div>
  );
}

function Loader({
  settings,
  setSettings,
  engine,
  onOpenSettings,
}: {
  settings: AuraSettings;
  setSettings: React.Dispatch<React.SetStateAction<AuraSettings>>;
  engine: ReturnType<typeof useEngine>;
  onOpenSettings: () => void;
}) {
  return (
    <div className="card p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">
        <span className="text-gradient">Prywatna AI</span> w Twojej przeglądarce
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-5">
        Wybierz model. Pobiera się jednorazowo, zostaje w pamięci przeglądarki i potem
        działa nawet offline.
      </p>
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        {MODELS.map((m) => (
          <button
            key={m.id}
            disabled={engine.status === "loading"}
            onClick={() => setSettings((s) => ({ ...s, model: m.id }))}
            className="card p-3 text-left disabled:opacity-50"
            style={
              settings.model === m.id
                ? { borderColor: "var(--violet)", background: "rgba(139,92,246,0.08)" }
                : undefined
            }
          >
            <div className="font-semibold text-sm">{m.label}</div>
            <div className="text-[11px] text-[var(--text-subtle)] mt-1">{m.note}</div>
          </button>
        ))}
      </div>

      {engine.status === "loading" ? (
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
            <Loader2 size={16} className="animate-spin" />
            Ładowanie modelu… {Math.round(engine.progress * 100)}%
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${engine.progress * 100}%`, background: "var(--grad-brand)" }}
            />
          </div>
          <div className="text-[11px] text-[var(--text-subtle)] mt-2 truncate">
            {engine.progressText}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={() => engine.load(settings.model)} className="btn btn-primary">
            <Cpu size={16} /> Uruchom Aurę
          </button>
          <button onClick={onOpenSettings} className="btn btn-ghost">
            <Settings2 size={15} /> Ustawienia
          </button>
        </div>
      )}
      {engine.status === "error" && (
        <div className="text-sm text-[var(--rose)] mt-3">{engine.error}</div>
      )}
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
      <span
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--grad-brand)", boxShadow: "0 0 24px rgba(139,92,246,0.5)" }}
      >
        <Sparkles size={22} className="text-white" />
      </span>
      <h2 className="text-lg font-semibold mb-1">W czym mogę pomóc?</h2>
      <p className="text-sm text-[var(--text-subtle)] mb-6">
        Wszystko dzieje się lokalnie — Twoje słowa nie opuszczają urządzenia. 🔒
      </p>
      <div className="grid sm:grid-cols-2 gap-2 w-full">
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="card p-3 text-left text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  streaming,
}: {
  message: AuraMessage;
  streaming: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed"
          style={{ background: "var(--grad-brand)", color: "#fff" }}
        >
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="group">
      <div
        className="rounded-2xl px-4 py-3 text-sm"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
      >
        {message.content ? (
          <Markdown>{message.content}</Markdown>
        ) : streaming ? (
          <span className="inline-flex gap-1 text-[var(--text-subtle)]">
            <span className="animate-pulse">●</span> myślę…
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3 mt-1.5 px-1 h-4">
        {message.tps ? (
          <span className="text-[10px] text-[var(--text-subtle)] flex items-center gap-1">
            <Gauge size={11} /> {message.tps.toFixed(1)} tok/s
          </span>
        ) : null}
        {message.content && (
          <button
            onClick={() => {
              navigator.clipboard?.writeText(message.content).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
              });
            }}
            className="text-[10px] text-[var(--text-subtle)] hover:text-[var(--text)] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? "skopiowano" : "kopiuj"}
          </button>
        )}
      </div>
    </div>
  );
}

function Composer({
  input,
  setInput,
  onSend,
  onStop,
  generating,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  generating: boolean;
}) {
  return (
    <div className="p-3 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        rows={1}
        placeholder="Napisz wiadomość…  (Enter wysyła, Shift+Enter = nowa linia)"
        className="input-field resize-none max-h-32"
      />
      {generating ? (
        <button onClick={onStop} className="btn btn-ghost !px-4" aria-label="Zatrzymaj">
          <Square size={16} /> Stop
        </button>
      ) : (
        <button
          onClick={onSend}
          disabled={!input.trim()}
          className="btn btn-primary !px-4"
          aria-label="Wyślij"
        >
          <Send size={18} />
        </button>
      )}
    </div>
  );
}

function SettingsModal({
  settings,
  setSettings,
  engine,
  onClose,
}: {
  settings: AuraSettings;
  setSettings: React.Dispatch<React.SetStateAction<AuraSettings>>;
  engine: ReturnType<typeof useEngine>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Zamknij" />
      <div className="card relative z-10 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg">Ustawienia</h2>
          <button onClick={onClose} className="btn btn-ghost !p-2" aria-label="Zamknij">
            <X size={16} />
          </button>
        </div>

        <label className="block mb-4">
          <span className="text-xs text-[var(--text-muted)] mb-1.5 block">Model</span>
          <select
            value={settings.model}
            onChange={(e) => {
              const model = e.target.value;
              setSettings((s) => ({ ...s, model }));
              if (engine.loadedModelRef.current !== model) engine.setStatus("idle");
            }}
            className="input-field"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.note}
              </option>
            ))}
          </select>
        </label>

        <label className="block mb-4">
          <span className="text-xs text-[var(--text-muted)] mb-1.5 flex justify-between">
            <span>Temperatura (kreatywność)</span>
            <span className="text-[var(--violet)]">{settings.temperature.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.1}
            value={settings.temperature}
            onChange={(e) =>
              setSettings((s) => ({ ...s, temperature: Number(e.target.value) }))
            }
            className="w-full accent-[var(--violet)]"
          />
        </label>

        <label className="block mb-5">
          <span className="text-xs text-[var(--text-muted)] mb-1.5 block">
            Prompt systemowy (persona)
          </span>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => setSettings((s) => ({ ...s, systemPrompt: e.target.value }))}
            rows={5}
            className="input-field resize-none text-xs leading-relaxed"
          />
        </label>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className="btn btn-ghost text-sm"
          >
            Przywróć domyślne
          </button>
          <button onClick={onClose} className="btn btn-primary text-sm">
            Gotowe
          </button>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <p className="text-[11px] text-[var(--text-subtle)] text-center mt-6 max-w-2xl mx-auto">
      Aura uruchamia otwarty model (Qwen / Llama) w przeglądarce przez WebGPU.
      Pierwsze pobranie waży ~0,5–2,3 GB i jest cache&apos;owane. Model lokalny bywa
      mniej dokładny niż usługi chmurowe — ale Twoje rozmowy zostają wyłącznie u Ciebie.
    </p>
  );
}
