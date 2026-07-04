import type { Metadata } from "next";
import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SearchResults from "@/components/shop/SearchResults";

export const metadata: Metadata = {
  title: "Wyszukiwarka turbosprężarek | TURBO-GIT",
  description: "Znajdź turbosprężarkę po numerze OE, marce lub modelu auta.",
  robots: { index: false },
};

export default function SearchPage() {
  return (
    <>
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">Wyszukiwarka</h1>
        <Suspense
          fallback={<div className="h-40 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />}
        >
          <SearchResults />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
