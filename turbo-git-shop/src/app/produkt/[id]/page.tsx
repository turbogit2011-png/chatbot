import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Shield, Star, Truck } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AddToCartButton from "@/components/shop/AddToCartButton";
import {
  formatPLN,
  getAllProducts,
  getProductById,
  relatedProducts,
} from "@/lib/shop/catalog";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ id: String(p.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(Number(id));
  if (!product) return { title: "Produkt nie znaleziony – TURBO-GIT" };
  return {
    title: `${product.name} | TURBO-GIT`,
    description: product.description.slice(0, 160),
    openGraph: { title: product.name, description: product.description.slice(0, 160) },
  };
}

function TurboVisual() {
  return (
    <svg viewBox="0 0 200 200" fill="none" className="w-48 h-48 animate-spin-slow">
      <circle cx="100" cy="100" r="92" stroke="rgba(255,122,0,0.25)" strokeWidth="0.6" />
      <circle cx="100" cy="100" r="78" stroke="rgba(255,122,0,0.14)" strokeWidth="0.6" strokeDasharray="4 8" />
      {Array.from({ length: 12 }).map((_, i) => (
        <g key={i} transform={`rotate(${i * 30} 100 100)`}>
          <path d="M100 100 Q112 48 90 32 Q80 60 100 100" fill="rgba(255,122,0,0.22)" />
        </g>
      ))}
      <circle cx="100" cy="100" r="24" fill="rgba(255,122,0,0.15)" stroke="rgba(255,122,0,0.4)" />
      <circle cx="100" cy="100" r="12" fill="rgba(255,122,0,0.4)" />
      <circle cx="100" cy="100" r="5" fill="rgba(255,122,0,0.9)" />
    </svg>
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProductById(Number(id));
  if (!product) notFound();

  const related = relatedProducts(product);
  const savings = product.price - product.b2bPrice;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.oemNumber,
    brand: { "@type": "Brand", name: product.brand },
    description: product.description,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "PLN",
      availability: product.available
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
    },
    aggregateRating: { "@type": "AggregateRating", ratingValue: 4.9, reviewCount: 37 },
  };

  return (
    <>
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text-3)] mb-6">
          <Link href="/" className="hover:text-[var(--orange-2)]">Sklep</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/marka/${product.brand.toLowerCase()}`} className="hover:text-[var(--orange-2)]">
            {product.brand}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[var(--text-2)] truncate max-w-[50%]">{product.oemNumber}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Visual */}
          <div
            className="rounded-2xl flex items-center justify-center h-80 lg:h-full min-h-[320px] relative overflow-hidden"
            style={{ background: "var(--gradient-card)", border: "1px solid var(--border)" }}
          >
            <div
              className="absolute w-64 h-64 rounded-full animate-breathe"
              style={{ background: "radial-gradient(circle, rgba(255,122,0,0.12), transparent 70%)" }}
            />
            <TurboVisual />
            <div className="absolute top-4 left-4 flex gap-2">
              {product.isBestseller && <span className="badge badge-orange text-[10px]">★ Bestseller</span>}
              {product.isNew && <span className="badge badge-blue text-[10px]">Nowość</span>}
            </div>
          </div>

          {/* Info */}
          <div>
            <p className="text-[11px] font-mono text-[var(--text-3)] tracking-widest mb-2">
              Nr OE / kat.: {product.oemNumber}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-3">
              {product.name}
            </h1>
            <div className="flex items-center gap-3 mb-5 text-sm">
              <span className="text-[var(--text-2)]">{product.brand} · {product.model}</span>
              <span className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[var(--gold)] text-[var(--gold)]" />
                ))}
                <span className="text-[var(--text-3)] ml-1">4.9</span>
              </span>
            </div>

            <div
              className="rounded-xl p-4 mb-5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-end gap-3">
                <span className="text-3xl font-display text-white">{formatPLN(product.price)}</span>
                <span className="text-xs text-[var(--text-3)] mb-1">brutto</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm">
                <span className="text-[var(--text-3)]">B2B netto:</span>
                <span className="text-[var(--orange-2)] font-bold">{formatPLN(product.b2bPrice)}</span>
                {savings > 0 && (
                  <span className="text-[11px] text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded">
                    oszczędzasz {savings} PLN
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-6 text-sm">
              <span className="flex items-center gap-1.5 text-[var(--text-2)]">
                <span className={product.available ? "dot-available" : "dot-limited"} />
                {product.available ? "Na stanie — wysyłka 24h" : "Dostępność 3–5 dni"}
              </span>
              <span className="flex items-center gap-1.5 text-[var(--text-2)]">
                <Shield className="w-4 h-4 text-[var(--orange)]" /> Gwarancja {product.warranty}
              </span>
              <span className="flex items-center gap-1.5 text-[var(--text-2)]">
                <Truck className="w-4 h-4 text-[var(--orange)]" /> Kurier / paczkomat
              </span>
            </div>

            <div className="mb-6">
              <AddToCartButton id={product.id} />
            </div>

            <p className="text-sm text-[var(--text-2)] leading-relaxed mb-5 whitespace-pre-line">
              {product.description}
            </p>

            <div>
              <h2 className="text-sm font-semibold text-white mb-2">Zakres regeneracji / dane</h2>
              <ul className="space-y-1.5">
                {product.specs.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-[var(--text-2)]">
                    <Check className="w-4 h-4 text-[var(--orange)] shrink-0 mt-0.5" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-white mb-5">
              Inne turbo do marki {product.brand}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/produkt/${p.id}`}
                  className="rounded-xl p-4 block transition-colors"
                  style={{ background: "var(--gradient-card)", border: "1px solid var(--border)" }}
                >
                  <p className="text-[10px] font-mono text-[var(--text-3)] tracking-widest mb-1">
                    {p.oemNumber}
                  </p>
                  <p className="text-sm text-white line-clamp-2 mb-2">{p.name}</p>
                  <p className="text-[var(--orange-2)] font-bold text-sm">{formatPLN(p.price)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
