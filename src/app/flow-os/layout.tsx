import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FLOW.OS — Puls Prawdy Fizycznej",
  description:
    "System decyzji operacyjnych dla logistyki 3PL i FMCG: GS1, SSCC, batch, terminy, dowody fizyczne i kontrola wyjątków.",
};

export default function FlowOsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
