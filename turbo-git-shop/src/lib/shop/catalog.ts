import { products, categories, type Product, type Category } from "@/lib/data";

export type { Product, Category };

export function getAllProducts(): Product[] {
  return products;
}

export function getProductById(id: number): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getByBrand(slug: string): Product[] {
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return [];
  return products.filter((p) => p.brand.toLowerCase() === cat.name.toLowerCase());
}

/** Full-text-ish search across name, OE number, brand and model. */
export function searchProducts(query: string, limit = 40): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = products
    .map((p) => {
      const hay = `${p.name} ${p.oemNumber} ${p.brand} ${p.model} ${p.engineCode}`.toLowerCase();
      const oe = p.oemNumber.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (!hay.includes(t)) return { p, score: -1 };
        if (oe.includes(t)) score += 5; // OE number match is strongest
        if (p.brand.toLowerCase().includes(t)) score += 2;
        score += 1;
      }
      if (p.isBestseller) score += 0.5;
      return { p, score };
    })
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map((s) => s.p);
}

export function relatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.id !== product.id && p.brand === product.brand)
    .slice(0, limit);
}

export function formatPLN(n: number): string {
  return `${n.toLocaleString("pl-PL")} PLN`;
}
