import type { Metadata } from "next";
import { Suspense } from "react";
import { ThankYou } from "@/components/aura/ThankYou";

export const metadata: Metadata = {
  title: "Dziękujemy — Aura Pro",
  robots: { index: false },
};

export default function ThankYouPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6">
      <Suspense fallback={<div className="card h-64 w-full max-w-md shimmer" />}>
        <ThankYou />
      </Suspense>
    </div>
  );
}
