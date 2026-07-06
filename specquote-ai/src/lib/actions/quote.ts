"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireCurrentUser } from "@/lib/security/current-user";
import { assertPermission } from "@/lib/security/rbac";
import { createDraftQuoteFromRfq, recalculateQuoteTotals, submitQuoteForApproval, decideQuoteApproval, markQuoteSent, markQuoteOutcome } from "@/lib/quotes/builder";
import { snapshotQuoteVersion } from "@/lib/quotes/versioning";
import { buildQuoteEmail } from "@/lib/export/quote-email";
import { computeLineTotal } from "@/lib/quotes/margin";

export async function createQuoteFromRfqAction(rfqId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "quote.create");
  const quote = await createDraftQuoteFromRfq(rfqId, session.userId);
  redirect(`/quotes/${quote.id}`);
}

export async function updateQuoteTermsAction(quoteId: string, formData: FormData): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "quote.edit");

  await prisma.quote.update({
    where: { id: quoteId, orgId: session.orgId },
    data: {
      paymentTerms: String(formData.get("paymentTerms") ?? "30 days net"),
      deliveryTerms: String(formData.get("deliveryTerms") ?? "EXW"),
      validUntil: formData.get("validUntil") ? new Date(String(formData.get("validUntil"))) : undefined,
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath(`/quotes/${quoteId}`);
}

export async function updateQuoteLineItemAction(lineItemId: string, quoteId: string, formData: FormData): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "quote.edit");

  const quantity = Number(formData.get("quantity") ?? 1);
  const unitCost = Number(formData.get("unitCost") ?? 0);
  const unitPrice = Number(formData.get("unitPrice") ?? 0);
  const discountPercent = Number(formData.get("discountPercent") ?? 0);
  const leadTimeDays = Number(formData.get("leadTimeDays") ?? 14);

  await prisma.quoteLineItem.update({
    where: { id: lineItemId },
    data: {
      description: String(formData.get("description") ?? ""),
      quantity,
      unit: String(formData.get("unit") ?? "pcs"),
      unitCost,
      unitPrice,
      discountPercent,
      leadTimeDays,
      lineTotal: computeLineTotal({ quantity, unitCost, unitPrice, discountPercent }),
    },
  });

  await recalculateQuoteTotals(quoteId);
  await snapshotQuoteVersion(quoteId, "Line item edited", session.userId);
  revalidatePath(`/quotes/${quoteId}`);
}

export async function addQuoteLineItemAction(quoteId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "quote.edit");

  const count = await prisma.quoteLineItem.count({ where: { quoteId } });
  await prisma.quoteLineItem.create({
    data: {
      quoteId,
      description: "New line item",
      quantity: 1,
      unit: "pcs",
      unitCost: 0,
      unitPrice: 0,
      discountPercent: 0,
      leadTimeDays: 14,
      sortOrder: count,
      lineTotal: 0,
    },
  });

  await recalculateQuoteTotals(quoteId);
  revalidatePath(`/quotes/${quoteId}`);
}

export async function deleteQuoteLineItemAction(lineItemId: string, quoteId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "quote.edit");
  await prisma.quoteLineItem.delete({ where: { id: lineItemId } });
  await recalculateQuoteTotals(quoteId);
  revalidatePath(`/quotes/${quoteId}`);
}

export async function submitQuoteForApprovalAction(quoteId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "quote.edit");
  await submitQuoteForApproval(quoteId, session.userId);
  revalidatePath(`/quotes/${quoteId}`);
}

export async function decideQuoteApprovalAction(quoteId: string, decision: "APPROVED" | "REJECTED", comment?: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "quote.approve");
  await decideQuoteApproval(quoteId, decision, session.userId, comment);
  revalidatePath(`/quotes/${quoteId}`);
}

export async function decideQuoteApprovalFormAction(quoteId: string, formData: FormData): Promise<void> {
  const decision = formData.get("decision") === "REJECTED" ? "REJECTED" : "APPROVED";
  const comment = (formData.get("comment") as string) || undefined;
  await decideQuoteApprovalAction(quoteId, decision, comment);
}

export async function sendQuoteAction(quoteId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "quote.send");

  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId, orgId: session.orgId },
    include: { lineItems: true, account: true, rfq: { include: { contact: true } }, org: true },
  });

  await buildQuoteEmail({
    customerName: quote.account.name,
    contactName: quote.rfq.contact?.name ?? "",
    language: quote.org.language,
    currency: quote.currency,
    quoteNumber: quote.number,
    paymentTerms: quote.paymentTerms,
    deliveryTerms: quote.deliveryTerms,
    validUntilISO: (quote.validUntil ?? new Date()).toISOString(),
    lineItems: quote.lineItems.map((li) => ({
      description: li.description,
      sku: li.sku ?? undefined,
      quantity: li.quantity,
      unit: li.unit,
      unitPrice: li.unitPrice,
      leadTimeDays: li.leadTimeDays,
    })),
  });

  await markQuoteSent(quoteId, session.userId);
  revalidatePath(`/quotes/${quoteId}`);
}

export async function markQuoteOutcomeAction(quoteId: string, outcome: "WON" | "LOST", lostReason?: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "quote.edit");
  await markQuoteOutcome(quoteId, outcome, session.userId, lostReason);
  revalidatePath(`/quotes/${quoteId}`);
}

export async function markQuoteOutcomeFormAction(quoteId: string, formData: FormData): Promise<void> {
  const outcome = formData.get("outcome") === "LOST" ? "LOST" : "WON";
  const lostReason = (formData.get("lostReason") as string) || undefined;
  await markQuoteOutcomeAction(quoteId, outcome, lostReason);
}
