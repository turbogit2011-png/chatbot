import { prisma } from "@/lib/db/client";
import { detectMissingInfo, syncMissingInfoItems } from "./missing-info";
import { computeCompleteness, computeRiskLevel } from "./status";
import { RFQ_HEADER_FIELD_KEYS } from "@/lib/ai/types";

const CRITICAL_LINE_ITEM_FIELDS = ["quantity", "material"] as const;

/** Recomputes completeness %, risk level and the Missing Information queue from the RFQ's current line items/fields — used both right after AI parsing and after a manual field/line-item edit (which must NOT re-trigger AI extraction and overwrite the correction). */
export async function recomputeRfqDerivedState(rfqId: string): Promise<void> {
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId }, include: { account: true } });
  const lineItems = await prisma.rfqLineItem.findMany({ where: { rfqId } });
  const headerFields = await prisma.extractedField.findMany({ where: { rfqId } });

  const missingCriticalCount = lineItems.filter((li) =>
    CRITICAL_LINE_ITEM_FIELDS.some((f) => !li[f as keyof typeof li]),
  ).length;

  const suggestions = detectMissingInfo(
    lineItems.map((li) => ({
      id: li.id,
      productFamily: li.productFamily,
      quantity: li.quantity,
      material: li.material,
      tolerance: li.tolerance,
      partNumber: li.partNumber,
      matchStatus: li.matchStatus,
    })),
    headerFields,
    Boolean(rfq.destinationCountry),
    Boolean(rfq.requestedDeliveryDate),
  );
  await syncMissingInfoItems(rfqId, suggestions);

  const openMissingInfoCount = suggestions.length;
  const completeness = computeCompleteness({
    headerFieldCount: headerFields.length,
    headerFieldsExpected: RFQ_HEADER_FIELD_KEYS.length,
    lineItemsMissingCriticalCount: missingCriticalCount,
    totalLineItems: Math.max(lineItems.length, 1),
    openMissingInfoCount,
  });

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: rfq.orgId } });
  const riskLevel = computeRiskLevel({
    completeness,
    estimatedValue: rfq.estimatedValue,
    isNewClient: rfq.account.isNewClient,
    hasUnconfirmedCertifications: lineItems.some((li) => li.certificationRequirements && li.matchStatus !== "MATCHED"),
    highValueThreshold: org.highValueThreshold,
  });

  const nextStatus =
    rfq.status === "NEW" || rfq.status === "PARSING"
      ? openMissingInfoCount > 0
        ? "MISSING_INFORMATION"
        : "NEEDS_REVIEW"
      : rfq.status === "MISSING_INFORMATION" && openMissingInfoCount === 0
        ? "NEEDS_REVIEW"
        : rfq.status === "NEEDS_REVIEW" && openMissingInfoCount > 0
          ? "MISSING_INFORMATION"
          : rfq.status;

  await prisma.rfq.update({
    where: { id: rfqId },
    data: { completeness, riskLevel, status: nextStatus },
  });
}
