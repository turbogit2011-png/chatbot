import type { CatalogProduct, MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";

export interface LineItemMatchInput {
  productFamily?: string | null;
  partNumber?: string | null;
  material?: string | null;
}

export interface MatchResult {
  status: MatchStatus;
  matchedProductId?: string;
  confidence: number;
  alternativeSkus: string[];
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function scoreProduct(input: LineItemMatchInput, product: CatalogProduct): number {
  let score = 0;

  const family = normalize(input.productFamily);
  const productFamily = normalize(product.family);
  if (family && productFamily) {
    if (family === productFamily) score += 0.5;
    else if (productFamily.includes(family) || family.includes(productFamily)) score += 0.3;
  }

  const partNumber = normalize(input.partNumber);
  if (partNumber) {
    const sku = normalize(product.sku);
    const name = normalize(product.name);
    if (sku === partNumber) score += 0.35;
    else if (sku.includes(partNumber) || partNumber.includes(sku)) score += 0.2;
    else if (name.includes(partNumber)) score += 0.1;
  }

  const material = normalize(input.material);
  if (material && product.material) {
    const productMaterial = normalize(product.material);
    if (material === productMaterial) score += 0.15;
    else if (productMaterial.includes(material) || material.includes(productMaterial)) score += 0.08;
  }

  return Math.min(1, score);
}

/** Matches a parsed RFQ line item against the org's demo catalog. Designed so a future ERP/PIM adapter can replace this in-memory scan with a real search index without changing the caller's contract. */
export async function matchLineItemToCatalog(orgId: string, input: LineItemMatchInput): Promise<MatchResult> {
  const candidates = await prisma.catalogProduct.findMany({
    where: { orgId, isActive: true },
  });

  const scored = candidates
    .map((product) => ({ product, score: scoreProduct(input, product) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const alternativeSkus = scored
    .slice(1, 4)
    .filter((s) => s.score > 0.15)
    .map((s) => s.product.sku);

  if (!best || best.score < 0.2) {
    return { status: "UNMATCHED", confidence: 0, alternativeSkus };
  }

  if (best.score >= 0.65) {
    return { status: "MATCHED", matchedProductId: best.product.id, confidence: best.score, alternativeSkus };
  }

  if (best.score >= 0.4) {
    return {
      status: "NEEDS_CONFIRMATION",
      matchedProductId: best.product.id,
      confidence: best.score,
      alternativeSkus,
    };
  }

  return { status: "ALTERNATIVE", matchedProductId: best.product.id, confidence: best.score, alternativeSkus };
}
