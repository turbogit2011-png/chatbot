import { prisma } from "@/lib/db/client";
import { recordAudit } from "@/lib/security/audit";
import type { FieldStatus } from "@prisma/client";

/** Records a human review decision on one AI-extracted field. AI is never allowed to move a field straight to APPROVED — only a user action does. */
export async function reviewExtractedField(
  fieldId: string,
  status: Exclude<FieldStatus, "SUGGESTED">,
  reviewerId: string,
  correctedValue?: string,
) {
  const field = await prisma.extractedField.update({
    where: { id: fieldId },
    data: {
      status,
      reviewedById: reviewerId,
      value: correctedValue ?? undefined,
    },
  });

  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: field.rfqId } });
  await recordAudit({
    orgId: rfq.orgId,
    actorId: reviewerId,
    action: "rfq.field_reviewed",
    entityType: "ExtractedField",
    entityId: fieldId,
    metadata: { status, fieldKey: field.fieldKey, corrected: Boolean(correctedValue) },
  });

  return field;
}

export async function updateRfqLineItem(
  lineItemId: string,
  data: Partial<{
    quantity: number | null;
    unit: string | null;
    material: string | null;
    tolerance: string | null;
    dimensions: string | null;
    partNumber: string | null;
    voltage: string | null;
    pressure: string | null;
    temperature: string | null;
    certificationRequirements: string | null;
  }>,
) {
  return prisma.rfqLineItem.update({ where: { id: lineItemId }, data });
}
