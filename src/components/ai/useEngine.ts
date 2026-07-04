"use client";

import { useCallback, useRef, useState } from "react";
import type { AuraMessage } from "./types";

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
interface Engine {
  chat: {
    completions: {
      create: (opts: {
        messages: { role: string; content: string }[];
        stream: boolean;
        temperature?: number;
        max_tokens?: number;
      }) => Promise<ChatStream>;
    };
  };
  interruptGenerate?: () => void;
}
interface WebLLMModule {
  CreateMLCEngine: (
    model: string,
    opts: { initProgressCallback: (p: InitProgress) => void }
  ) => Promise<Engine>;
}

export type EngineStatus = "idle" | "loading" | "ready" | "error";

export function useEngine() {
  const engineRef = useRef<Engine | null>(null);
  const loadedModelRef = useRef<string | null>(null);
  const [status, setStatus] = useState<EngineStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (model: string) => {
    if (loadedModelRef.current === model && engineRef.current) {
      setStatus("ready");
      return;
    }
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
      loadedModelRef.current = model;
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error
          ? e.message
          : "Nie udało się załadować modelu. Sprawdź połączenie i wsparcie WebGPU."
      );
    }
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.interruptGenerate?.();
  }, []);

  /** Drop the current engine so the next load rebuilds it (recovers from a
   *  lost WebGPU device / bad buffer state, common on mobile). */
  const reset = useCallback(() => {
    engineRef.current = null;
    loadedModelRef.current = null;
    setError("");
    setProgress(0);
    setStatus("idle");
  }, []);

  /** Streams a completion, calling `onDelta` for each token. Returns tokens/sec. */
  const generate = useCallback(
    async (
      messages: AuraMessage[],
      temperature: number,
      onDelta: (delta: string) => void
    ): Promise<number> => {
      if (!engineRef.current) return 0;
      const stream = await engineRef.current.chat.completions.create({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        temperature,
        max_tokens: 1024,
      });
      const iterator = stream[Symbol.asyncIterator]();
      let tokens = 0;
      const t0 = performance.now();
      while (true) {
        const { value, done } = await iterator.next();
        if (done) break;
        const delta = value?.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          tokens++;
          onDelta(delta);
        }
      }
      const seconds = (performance.now() - t0) / 1000;
      return seconds > 0 ? tokens / seconds : 0;
    },
    []
  );

  return {
    status,
    setStatus,
    progress,
    progressText,
    error,
    load,
    stop,
    reset,
    generate,
    loadedModelRef,
  };
}
