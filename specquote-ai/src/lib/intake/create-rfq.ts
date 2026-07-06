import { prisma } from "@/lib/db/client";
import { recordAudit } from "@/lib/security/audit";
import type { RfqChannel } from "@prisma/client";

export interface CreateRfqInput {
  orgId: string;
  accountId: string;
  contactId?: string | null;
  subject: string;
  channel: RfqChannel;
  sourceEmailRaw?: string | null;
  dueDate?: Date | null;
  destinationCountry?: string | null;
  requestedDeliveryDate?: Date | null;
  estimatedValue?: number | null;
  assignedToId?: string | null;
  createdById?: string | null;
}

/** Creates the RFQ shell (New/Parsing). Attachments are added separately via intake/upload.ts, then runAiParseForRfq (intake/parse.ts) turns it into a structured RFQ. */
export async function createRfq(input: CreateRfqInput) {
  const rfq = await prisma.rfq.create({
    data: {
      orgId: input.orgId,
      accountId: input.accountId,
      contactId: input.contactId ?? undefined,
      subject: input.subject,
      channel: input.channel,
      sourceEmailRaw: input.sourceEmailRaw ?? undefined,
      dueDate: input.dueDate ?? undefined,
      destinationCountry: input.destinationCountry ?? undefined,
      requestedDeliveryDate: input.requestedDeliveryDate ?? undefined,
      estimatedValue: input.estimatedValue ?? undefined,
      assignedToId: input.assignedToId ?? undefined,
      createdById: input.createdById ?? undefined,
      status: "NEW",
    },
  });

  await prisma.activity.create({
    data: {
      orgId: input.orgId,
      accountId: input.accountId,
      rfqId: rfq.id,
      type: "STATUS_CHANGE",
      body: `RFQ "${rfq.subject}" received via ${input.channel.toLowerCase()}.`,
      createdById: input.createdById,
    },
  });

  await recordAudit({
    orgId: input.orgId,
    actorId: input.createdById,
    action: "rfq.created",
    entityType: "Rfq",
    entityId: rfq.id,
    metadata: { channel: input.channel },
  });

  return rfq;
}
