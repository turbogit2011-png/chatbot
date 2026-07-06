"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireCurrentUser } from "@/lib/security/current-user";
import { assertPermission } from "@/lib/security/rbac";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createRfq } from "@/lib/intake/create-rfq";
import { uploadRfqAttachment } from "@/lib/intake/upload";
import { runAiParseForRfq } from "@/lib/intake/parse";
import {
  generateMissingInfoDraft,
  markMessageSent,
  updateMessageDraft,
  dismissMissingInfoItem,
  assignMissingInfoItem,
} from "@/lib/rfq/messages";
import { reviewExtractedField, updateRfqLineItem } from "@/lib/rfq/fields";
import type { FormState } from "./org";

const newRfqSchema = z.object({
  accountId: z.string().min(1),
  contactId: z.string().optional(),
  subject: z.string().min(2),
  channel: z.enum(["EMAIL", "UPLOAD", "MANUAL"]),
  destinationCountry: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedValue: z.coerce.number().optional(),
  emailText: z.string().optional(),
});

export async function createRfqAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "rfq.edit");

  const rl = checkRateLimit(`rfq-create:${session.orgId}`, { limit: 30, windowMs: 60_000 });
  if (!rl.allowed) return { error: "Too many RFQs created recently — please slow down." };

  const parsed = newRfqSchema.safeParse({
    accountId: formData.get("accountId"),
    contactId: formData.get("contactId") || undefined,
    subject: formData.get("subject"),
    channel: formData.get("channel"),
    destinationCountry: formData.get("destinationCountry") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    estimatedValue: formData.get("estimatedValue") || undefined,
    emailText: formData.get("emailText") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const rfq = await createRfq({
    orgId: session.orgId,
    accountId: parsed.data.accountId,
    contactId: parsed.data.contactId,
    subject: parsed.data.subject,
    channel: parsed.data.channel,
    sourceEmailRaw: parsed.data.emailText,
    destinationCountry: parsed.data.destinationCountry,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    estimatedValue: parsed.data.estimatedValue,
    createdById: session.userId,
  });

  if (parsed.data.emailText) {
    await uploadRfqAttachment({
      rfqId: rfq.id,
      fileName: "request.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(parsed.data.emailText, "utf8"),
    });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadRfqAttachment({
      rfqId: rfq.id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
    });
    if (!result.ok) return { error: result.error };
  }

  await runAiParseForRfq(rfq.id, session.userId);

  redirect(`/inbox/${rfq.id}`);
}

export async function reparseRfqAction(rfqId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "rfq.edit");
  await runAiParseForRfq(rfqId, session.userId);
  revalidatePath(`/inbox/${rfqId}`);
}

export async function reviewFieldAction(
  fieldId: string,
  rfqId: string,
  status: "APPROVED" | "REJECTED",
  correctedValue?: string,
): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "rfq.edit");
  await reviewExtractedField(fieldId, status, session.userId, correctedValue);
  revalidatePath(`/inbox/${rfqId}`);
}

export async function updateLineItemAction(lineItemId: string, rfqId: string, formData: FormData): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "rfq.edit");

  const quantityRaw = formData.get("quantity");
  await updateRfqLineItem(lineItemId, {
    quantity: quantityRaw ? Number(quantityRaw) : null,
    unit: (formData.get("unit") as string) || null,
    material: (formData.get("material") as string) || null,
    tolerance: (formData.get("tolerance") as string) || null,
    dimensions: (formData.get("dimensions") as string) || null,
    partNumber: (formData.get("partNumber") as string) || null,
  });

  await runAiParseForRfqSkipExtraction(rfqId);
  revalidatePath(`/inbox/${rfqId}`);
}

// Recomputes completeness/risk/missing-info after a manual edit, without re-running the AI extraction (that would wipe the manual correction).
async function runAiParseForRfqSkipExtraction(rfqId: string) {
  const { recomputeRfqDerivedState } = await import("@/lib/rfq/recompute");
  await recomputeRfqDerivedState(rfqId);
}

export async function assignRfqAction(rfqId: string, userId: string | null): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "rfq.assign");
  await prisma.rfq.update({ where: { id: rfqId, orgId: session.orgId }, data: { assignedToId: userId } });
  revalidatePath(`/inbox/${rfqId}`);
  revalidatePath("/inbox");
}

export async function generateMissingInfoDraftAction(rfqId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "rfq.edit");
  await generateMissingInfoDraft(rfqId, session.userId);
  revalidatePath(`/inbox/${rfqId}`);
}

export async function updateMissingInfoDraftAction(draftId: string, rfqId: string, formData: FormData): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "rfq.edit");
  await updateMessageDraft(draftId, String(formData.get("subject") ?? ""), String(formData.get("body") ?? ""));
  revalidatePath(`/inbox/${rfqId}`);
}

export async function sendMissingInfoDraftAction(draftId: string, rfqId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "rfq.edit");
  await markMessageSent(draftId, session.userId);
  revalidatePath(`/inbox/${rfqId}`);
}

export async function dismissMissingInfoAction(itemId: string, rfqId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "rfq.edit");
  await dismissMissingInfoItem(itemId);
  revalidatePath(`/inbox/${rfqId}`);
}

export async function assignMissingInfoAction(itemId: string, rfqId: string, userId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "rfq.edit");
  await assignMissingInfoItem(itemId, userId);
  revalidatePath(`/inbox/${rfqId}`);
}

export async function archiveRfqAction(rfqId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "rfq.delete");
  await prisma.rfq.update({ where: { id: rfqId, orgId: session.orgId }, data: { status: "ARCHIVED" } });
  revalidatePath("/inbox");
  redirect("/inbox");
}
