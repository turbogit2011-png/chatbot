import { GeminiProvider } from "./gemini-provider";
import { MockAIProvider } from "./mock-provider";
import type { AIProvider } from "./types";

let cached: AIProvider | null = null;

/** Single entry point for the rest of the app — never import a concrete provider directly. */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const configured = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  const apiKey = process.env.GEMINI_API_KEY;

  if (configured === "gemini" && apiKey) {
    cached = new GeminiProvider(apiKey, process.env.GEMINI_MODEL);
  } else {
    cached = new MockAIProvider();
  }

  return cached;
}

export * from "./types";
