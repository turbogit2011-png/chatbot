import { getAIProvider } from "@/lib/ai";
import type { AttachmentKind } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { matchLineItemToCatalog } from "@/lib/catalog/match";
import { recordAudit } from "@/lib/security/audit";
import { storage } from "@/lib/security/storage";
import { recomputeRfqDerivedState } from "@/lib/rfq/recompute";
import { RFQ_HEADER_FIELD_KEYS } from "@/lib/ai/types";

/**
 * Runs the full multimodal parsing pipeline for one RFQ: reads every
 * attachment, calls the configured AIProvider, persists ExtractedField +
 * RfqLineItem rows, matches line items against the catalog, then hands off
 * to recomputeRfqDerivedState for completeness/risk/missing-info.
 */
export async function runAiParseForRfq(rfqId: string, actorUserId?: string | null): Promise<void> {
  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id: rfqId },
    include: { attachments: true, account: true },
  });

  await prisma.rfq.update({ where: { id: rfqId }, data: { status: "PARSING" } });

  const provider = getAIProvider();
  const uncertainties: string[] = [];
  const summaries: string[] = [];
  let confidenceSum = 0;
  let confidenceCount = 0;

  // Clear previous extraction results so re-running parse is idempotent.
  await prisma.$transaction([
    prisma.extractedField.deleteMany({ where: { rfqId } }),
    prisma.rfqLineItem.deleteMany({ where: { rfqId } }),
  ]);

  for (const attachment of rfq.attachments) {
    let textContent: string | undefined;
    let buffer: Buffer | undefined;
    try {
      buffer = await storage.read(attachment.storageKey);
      if (attachment.kind === "TEXT" || attachment.kind === "CSV" || attachment.kind === "EMAIL") {
        textContent = buffer.toString("utf8");
      }
    } catch {
      // Demo attachments created directly by the seed script may not have a
      // physical file on disk — parsing still proceeds using generated mock
      // content keyed off the attachment id/filename.
    }

    const result = await provider.parseDocument({
      attachmentId: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      kind: attachment.kind as AttachmentKind,
      textContent,
      buffer,
    });

    for (const field of result.headerFields) {
      if (!RFQ_HEADER_FIELD_KEYS.includes(field.fieldKey)) continue;
      await prisma.extractedField.create({
        data: {
          rfqId,
          fieldKey: field.fieldKey,
          value: field.value,
          confidence: field.confidence,
          sourceAttachmentId: attachment.id,
          sourceRef: field.sourceRef,
        },
      });
      confidenceSum += field.confidence;
      confidenceCount++;
    }

    for (const li of result.lineItems) {
      const match = await matchLineItemToCatalog(rfq.orgId, {
        productFamily: li.productFamily,
        partNumber: li.partNumber,
        material: li.material,
      });

      await prisma.rfqLineItem.create({
        data: {
          rfqId,
          rawDescription: li.rawDescription,
          productFamily: li.productFamily,
          partNumber: li.partNumber,
          quantity: li.quantity,
          unit: li.unit,
          dimensions: li.dimensions,
          material: li.material,
          finish: li.finish,
          tolerance: li.tolerance,
          voltage: li.voltage,
          pressure: li.pressure,
          temperature: li.temperature,
          certificationRequirements: li.certificationRequirements,
          extractionConfidence: li.confidence,
          sourceRef: li.sourceRef,
          matchStatus: match.status,
          matchConfidence: match.confidence,
          matchedProductId: match.matchedProductId,
          alternativeSkusJson: JSON.stringify(match.alternativeSkus),
        },
      });
      confidenceSum += li.confidence;
      confidenceCount++;
    }

    uncertainties.push(...result.uncertainties);
    summaries.push(result.attachmentsSummary);
  }

  await prisma.rfq.update({
    where: { id: rfqId },
    data: {
      aiSummary: summaries.join(" "),
      aiUncertaintiesJson: JSON.stringify(uncertainties),
      aiConfidenceOverall: confidenceCount ? Math.round((confidenceSum / confidenceCount) * 100) / 100 : 0,
    },
  });

  await recomputeRfqDerivedState(rfqId);

  await prisma.usageEvent.create({
    data: { orgId: rfq.orgId, type: "RFQ_ANALYZED", quantity: 1 },
  });
  await prisma.usageEvent.create({
    data: { orgId: rfq.orgId, type: "DOCUMENT_PROCESSED", quantity: rfq.attachments.length || 1 },
  });

  const updated = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId } });
  await recordAudit({
    orgId: rfq.orgId,
    actorId: actorUserId,
    action: "rfq.ai_parse",
    entityType: "Rfq",
    entityId: rfqId,
    metadata: { completeness: updated.completeness, riskLevel: updated.riskLevel },
  });
}
