import type { Metadata } from "next";
import LocalAI from "@/components/ai/LocalAI";

export const metadata: Metadata = {
  title: "Aura – Prywatna AI w przeglądarce | Momentum",
  description:
    "Asystent AI działający w 100% na Twoim urządzeniu przez WebGPU. Bez serwerów, bez API, bez opłat — rozmowy nigdy nie opuszczają przeglądarki.",
};

export default function AiPage() {
  return <LocalAI />;
}
