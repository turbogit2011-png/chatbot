import type { Metadata } from "next";
import WealthPlanner from "@/components/wealth/WealthPlanner";

export const metadata: Metadata = {
  title: "Droga do Miliarda – Planer bogactwa | Momentum",
  description:
    "Kalkulator procentu składanego: oblicz ile lat zajmie osiągnięcie celu finansowego, ile musisz odkładać miesięcznie albo jakiego zwrotu potrzebujesz. Działa offline.",
};

export default function WealthPage() {
  return <WealthPlanner />;
}
