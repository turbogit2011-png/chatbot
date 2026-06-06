import type { Metadata } from "next";
import Landing from "@/components/aura/Landing";

export const metadata: Metadata = {
  title: "Aura — Twoja własna AI. Bez chmury. Bez podsłuchu.",
  description:
    "Asystent AI, który uruchamia model językowy w 100% w Twojej przeglądarce. Bez serwerów, bez API, bez opłat — Twoje rozmowy nigdy nie opuszczają urządzenia. Zacznij za darmo.",
};

export default function AuraPage() {
  return <Landing />;
}
