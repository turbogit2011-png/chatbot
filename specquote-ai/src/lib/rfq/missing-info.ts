import { prisma } from "@/lib/db/client";
import type { MissingInfoSuggestion } from "@/lib/ai/types";

interface LineItemLike {
  id: string;
  productFamily: string | null;
  quantity: number | null;
  material: string | null;
  tolerance: string | null;
  partNumber: string | null;
  matchStatus: string;
}

interface HeaderFieldLike {
  fieldKey: string;
  status: string;
}

/**
 * Rule-based "Missing Information Agent" — decides what a sales rep must
 * still confirm with the customer before a quote can be trusted. Kept
 * separate from the AI provider because these are hard business rules, not
 * probabilistic extraction.
 */
export function detectMissingInfo(
  lineItems: LineItemLike[],
  headerFields: HeaderFieldLike[],
  hasDestinationCountry: boolean,
  hasRequestedDeliveryDate: boolean,
): MissingInfoSuggestion[] {
  const suggestions: MissingInfoSuggestion[] = [];

  for (const [idx, item] of lineItems.entries()) {
    const label = item.productFamily ?? `line item ${idx + 1}`;
    if (!item.quantity) {
      suggestions.push({ fieldKey: "quantity", description: `Required quantity for ${label}` });
    }
    if (!item.material) {
      suggestions.push({ fieldKey: "material", description: `Material specification for ${label}` });
    }
    if (!item.tolerance) {
      suggestions.push({ fieldKey: "tolerance", description: `Manufacturing tolerance for ${label}` });
    }
    if (!item.partNumber && item.matchStatus === "UNMATCHED") {
      suggestions.push({ fieldKey: "part_number", description: `Exact part number / catalog reference for ${label}` });
    }
  }

  const deliveryTerms = headerFields.find((f) => f.fieldKey === "delivery_terms");
  if (!deliveryTerms) {
    suggestions.push({ fieldKey: "delivery_terms", description: "Preferred delivery terms (Incoterms)" });
  }

  if (!hasDestinationCountry) {
    suggestions.push({ fieldKey: "destination_country", description: "Delivery destination / country" });
  }

  if (!hasRequestedDeliveryDate) {
    suggestions.push({ fieldKey: "requested_delivery_date", description: "Requested delivery date" });
  }

  return suggestions;
}

/** Replaces the current OPEN missing-info items for an RFQ with the freshly computed set, preserving any that were manually dismissed/assigned. */
export async function syncMissingInfoItems(rfqId: string, suggestions: MissingInfoSuggestion[]): Promise<void> {
  const existing = await prisma.missingInfoItem.findMany({ where: { rfqId } });
  const existingKeys = new Set(existing.map((e) => e.fieldKey + "::" + e.description));

  const toCreate = suggestions.filter((s) => !existingKeys.has(s.fieldKey + "::" + s.description));

  const stillOpenKeys = new Set(suggestions.map((s) => s.fieldKey + "::" + s.description));
  const toResolve = existing.filter(
    (e) => e.status === "OPEN" && !stillOpenKeys.has(e.fieldKey + "::" + e.description),
  );

  await prisma.$transaction([
    ...toCreate.map((s) =>
      prisma.missingInfoItem.create({
        data: { rfqId, fieldKey: s.fieldKey, description: s.description },
      }),
    ),
    ...toResolve.map((e) => prisma.missingInfoItem.update({ where: { id: e.id }, data: { status: "RESOLVED" } })),
  ]);
}
