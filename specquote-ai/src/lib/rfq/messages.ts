import { prisma } from "@/lib/db/client";
import { getAIProvider } from "@/lib/ai";
import { recordAudit } from "@/lib/security/audit";

/** Generates (and persists as a draft) the "please confirm these details" e-mail for an RFQ's currently open missing-information items. */
export async function generateMissingInfoDraft(rfqId: string, actorUserId?: string | null) {
  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id: rfqId },
    include: { account: true, contact: true, org: true, missingInfoItems: true },
  });

  const open = rfq.missingInfoItems.filter((m) => m.status === "OPEN");
  const provider = getAIProvider();
  const draft = await provider.draftMissingInfoMessage(
    rfq.account.name,
    rfq.contact?.name ?? "",
    open.map((m) => ({ fieldKey: m.fieldKey, description: m.description })),
    rfq.org.language,
  );

  const messageDraft = await prisma.clientMessageDraft.create({
    data: {
      rfqId,
      subject: draft.subject,
      body: draft.body,
      createdById: actorUserId,
    },
  });

  return messageDraft;
}

export async function updateMessageDraft(draftId: string, subject: string, body: string) {
  return prisma.clientMessageDraft.update({ where: { id: draftId }, data: { subject, body } });
}

export async function markMessageSent(draftId: string, actorUserId?: string | null) {
  const draft = await prisma.clientMessageDraft.update({
    where: { id: draftId },
    data: { status: "SENT", sentAt: new Date() },
  });

  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: draft.rfqId } });

  await prisma.activity.create({
    data: {
      orgId: rfq.orgId,
      rfqId: rfq.id,
      accountId: rfq.accountId,
      type: "EMAIL_SENT",
      body: `Sent "${draft.subject}" to customer.`,
      createdById: actorUserId,
    },
  });

  await recordAudit({
    orgId: rfq.orgId,
    actorId: actorUserId,
    action: "rfq.missing_info_message_sent",
    entityType: "Rfq",
    entityId: rfq.id,
    metadata: { draftId },
  });

  return draft;
}

export async function dismissMissingInfoItem(itemId: string) {
  return prisma.missingInfoItem.update({ where: { id: itemId }, data: { status: "DISMISSED" } });
}

export async function assignMissingInfoItem(itemId: string, userId: string) {
  return prisma.missingInfoItem.update({ where: { id: itemId }, data: { status: "ASSIGNED", assignedToId: userId } });
}
