import { prisma } from "@/lib/db/client";
import { recordAudit } from "@/lib/security/audit";
import { generateQuoteNumber } from "./numbering";
import { computeLineTotal, computeQuoteTotals } from "./margin";
import { evaluateApprovalRules } from "./approval";
import { snapshotQuoteVersion } from "./versioning";

/** Builds a draft quote from a parsed & reviewed RFQ, seeding line items from catalog matches (or blank estimator-fillable rows when unmatched). */
export async function createDraftQuoteFromRfq(rfqId: string, actorUserId?: string | null) {
  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id: rfqId },
    include: { lineItems: { include: { matchedProduct: true } }, account: true, org: true },
  });

  const number = await generateQuoteNumber(rfq.orgId);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const lineItemsData = rfq.lineItems.map((li, idx) => {
    const product = li.matchedProduct;
    const quantity = li.quantity ?? 1;
    const unitCost = product?.baseCost ?? 0;
    const unitPrice = product?.basePrice ?? 0;
    return {
      rfqLineItemId: li.id,
      catalogProductId: product?.id,
      description: product?.name ?? li.rawDescription,
      sku: product?.sku,
      quantity,
      unit: li.unit ?? product?.unit ?? "pcs",
      unitCost,
      unitPrice,
      discountPercent: 0,
      leadTimeDays: product?.leadTimeDays ?? 21,
      sortOrder: idx,
      lineTotal: computeLineTotal({ quantity, unitCost, unitPrice, discountPercent: 0 }),
    };
  });

  const totals = computeQuoteTotals(lineItemsData);

  const quote = await prisma.quote.create({
    data: {
      orgId: rfq.orgId,
      rfqId: rfq.id,
      accountId: rfq.accountId,
      number,
      status: "DRAFT",
      currency: rfq.org.currency,
      paymentTerms: "30 days net",
      deliveryTerms: "EXW",
      validUntil,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      totalCost: totals.totalCost,
      total: totals.total,
      marginPercent: totals.marginPercent,
      createdById: actorUserId,
      lineItems: { create: lineItemsData },
    },
    include: { lineItems: true },
  });

  await snapshotQuoteVersion(quote.id, "Initial draft generated from RFQ", actorUserId);

  if (rfq.status === "NEEDS_REVIEW" || rfq.status === "NEW") {
    await prisma.rfq.update({ where: { id: rfq.id }, data: { status: "READY_FOR_QUOTE" } });
  }

  await prisma.usageEvent.create({ data: { orgId: rfq.orgId, type: "QUOTE_GENERATED", quantity: 1 } });
  await recordAudit({
    orgId: rfq.orgId,
    actorId: actorUserId,
    action: "quote.create_draft",
    entityType: "Quote",
    entityId: quote.id,
    metadata: { number, total: totals.total },
  });

  return quote;
}

/** Recomputes totals from current line items and persists them — call after any line item edit. */
export async function recalculateQuoteTotals(quoteId: string) {
  const lineItems = await prisma.quoteLineItem.findMany({ where: { quoteId } });
  const totals = computeQuoteTotals(lineItems);

  await prisma.$transaction([
    ...lineItems.map((li) =>
      prisma.quoteLineItem.update({
        where: { id: li.id },
        data: { lineTotal: computeLineTotal(li) },
      }),
    ),
    prisma.quote.update({
      where: { id: quoteId },
      data: {
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        totalCost: totals.totalCost,
        total: totals.total,
        marginPercent: totals.marginPercent,
      },
    }),
  ]);

  return totals;
}

/** Submits a quote for the margin/discount/risk guardrail check. Auto-clears to APPROVED when no rule fires, otherwise parks it at NEEDS_APPROVAL with the triggered reasons logged for a manager to review. */
export async function submitQuoteForApproval(quoteId: string, actorUserId?: string | null) {
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { lineItems: true, org: true, account: true, rfq: { include: { lineItems: true } } },
  });

  const maxLineDiscount = Math.max(0, ...quote.lineItems.map((li) => li.discountPercent));
  const maxLeadTime = Math.max(0, ...quote.lineItems.map((li) => li.leadTimeDays));
  const hasUnconfirmedTechnical = quote.rfq.lineItems.some(
    (li) => li.matchStatus === "UNMATCHED" || li.matchStatus === "NEEDS_CONFIRMATION",
  );

  const triggers = evaluateApprovalRules({
    marginPercent: quote.marginPercent,
    maxLineDiscountPercent: maxLineDiscount,
    total: quote.total,
    isNewClient: quote.account.isNewClient,
    hasUnconfirmedTechnical,
    maxLeadTimeDays: maxLeadTime,
    org: {
      minMarginPercent: quote.org.minMarginPercent,
      maxDiscountPercent: quote.org.maxDiscountPercent,
      highValueThreshold: quote.org.highValueThreshold,
    },
  });

  await snapshotQuoteVersion(quoteId, "Submitted for approval", actorUserId);

  if (triggers.length === 0) {
    await prisma.quote.update({ where: { id: quoteId }, data: { status: "APPROVED" } });
    await recordAudit({
      orgId: quote.orgId,
      actorId: actorUserId,
      action: "quote.auto_approved",
      entityType: "Quote",
      entityId: quoteId,
      metadata: {},
    });
    return { needsApproval: false, triggers: [] };
  }

  await prisma.$transaction([
    prisma.quote.update({ where: { id: quoteId }, data: { status: "NEEDS_APPROVAL" } }),
    prisma.rfq.update({ where: { id: quote.rfqId }, data: { status: "AWAITING_APPROVAL" } }),
    ...triggers.map((t) =>
      prisma.approvalDecision.create({
        data: { quoteId, triggeredReason: t.reason, status: "PENDING" },
      }),
    ),
  ]);

  await recordAudit({
    orgId: quote.orgId,
    actorId: actorUserId,
    action: "quote.submitted_for_approval",
    entityType: "Quote",
    entityId: quoteId,
    metadata: { triggers: triggers.map((t) => t.type) },
  });

  return { needsApproval: true, triggers };
}

export async function decideQuoteApproval(
  quoteId: string,
  decision: "APPROVED" | "REJECTED",
  deciderId: string,
  comment?: string,
) {
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } });

  await prisma.$transaction([
    prisma.approvalDecision.updateMany({
      where: { quoteId, status: "PENDING" },
      data: { status: decision, decidedById: deciderId, decidedAt: new Date(), comment },
    }),
    prisma.quote.update({ where: { id: quoteId }, data: { status: decision } }),
    prisma.rfq.update({
      where: { id: quote.rfqId },
      data: { status: decision === "APPROVED" ? "READY_FOR_QUOTE" : "MISSING_INFORMATION" },
    }),
    prisma.activity.create({
      data: {
        orgId: quote.orgId,
        quoteId,
        accountId: quote.accountId,
        type: "APPROVAL",
        body: `Quote ${quote.number} was ${decision.toLowerCase()}${comment ? `: ${comment}` : "."}`,
        createdById: deciderId,
      },
    }),
  ]);

  await recordAudit({
    orgId: quote.orgId,
    actorId: deciderId,
    action: decision === "APPROVED" ? "quote.approved" : "quote.rejected",
    entityType: "Quote",
    entityId: quoteId,
    metadata: { comment },
  });
}

export async function markQuoteSent(quoteId: string, actorUserId?: string | null) {
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } });

  await prisma.$transaction([
    prisma.quote.update({ where: { id: quoteId }, data: { status: "SENT", sentAt: new Date() } }),
    prisma.rfq.update({ where: { id: quote.rfqId }, data: { status: "SENT" } }),
    prisma.activity.create({
      data: {
        orgId: quote.orgId,
        quoteId,
        accountId: quote.accountId,
        type: "EMAIL_SENT",
        body: `Quote ${quote.number} sent to customer.`,
        createdById: actorUserId,
      },
    }),
  ]);

  await recordAudit({
    orgId: quote.orgId,
    actorId: actorUserId,
    action: "quote.sent",
    entityType: "Quote",
    entityId: quoteId,
    metadata: {},
  });
}

export async function markQuoteOutcome(
  quoteId: string,
  outcome: "WON" | "LOST",
  actorUserId?: string | null,
  lostReason?: string,
) {
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } });

  await prisma.$transaction([
    prisma.quote.update({ where: { id: quoteId }, data: { status: outcome, lostReason: lostReason ?? null } }),
    prisma.rfq.update({
      where: { id: quote.rfqId },
      data: { status: outcome, lostReason: outcome === "LOST" ? (lostReason ?? null) : null, stage: outcome === "WON" ? "CLOSED_WON" : "CLOSED_LOST" },
    }),
    prisma.activity.create({
      data: {
        orgId: quote.orgId,
        quoteId,
        accountId: quote.accountId,
        type: "STATUS_CHANGE",
        body: `Quote ${quote.number} marked as ${outcome}${lostReason ? ` (${lostReason})` : ""}.`,
        createdById: actorUserId,
      },
    }),
  ]);

  await recordAudit({
    orgId: quote.orgId,
    actorId: actorUserId,
    action: `quote.${outcome.toLowerCase()}`,
    entityType: "Quote",
    entityId: quoteId,
    metadata: { lostReason },
  });
}
