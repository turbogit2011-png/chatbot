import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/shop/ProductGrid";
import { categories, type Category } from "@/lib/data";
import { getByBrand } from "@/lib/shop/catalog";

export function generateStaticParams() {
  return categories.map((c: Category) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return { title: "Marka nie znaleziona – TURBO-GIT" };
  return {
    title: `Turbosprężarki ${cat.name} – regeneracja z gwarancją | TURBO-GIT`,
    description: `Regenerowane i nowe turbosprężarki do ${cat.name}. ${cat.count} modeli, gwarancja 24 miesiące, wysyłka 24h.`,
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();
  const products = getByBrand(slug);

  return (
    <>
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text-3)] mb-4">
          <Link href="/" className="hover:text-[var(--orange-2)]">Sklep</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[var(--text-2)]">{cat.name}</span>
        </nav>
        <h1 className="font-display text-4xl sm:text-5xl text-white mb-1">
          Turbosprężarki <span className="text-gradient">{cat.name}</span>
        </h1>
        <p className="text-[var(--text-2)] mb-8">
          Regenerowane i nowe turbo do marki {cat.name}. Gwarancja 24 miesiące, wysyłka 24h.
        </p>
        {products.length === 0 ? (
          <p className="text-[var(--text-3)]">Brak produktów w tej kategorii.</p>
        ) : (
          <ProductGrid products={products} />
        )}
      </main>
      <Footer />
    </>
  );
}
