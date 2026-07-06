"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireCurrentUser } from "@/lib/security/current-user";
import { assertPermission } from "@/lib/security/rbac";
import { recordAudit } from "@/lib/security/audit";
import type { UserRole } from "@prisma/client";

export interface FormState {
  error?: string;
  success?: string;
}

const onboardingSchema = z.object({
  currency: z.string().min(3).max(3),
  language: z.string().min(2).max(5),
  defaultMarginPercent: z.coerce.number().min(0).max(90),
  minMarginPercent: z.coerce.number().min(0).max(90),
});

export async function completeOnboardingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireCurrentUser();
  const parsed = onboardingSchema.safeParse({
    currency: formData.get("currency"),
    language: formData.get("language"),
    defaultMarginPercent: formData.get("defaultMarginPercent"),
    minMarginPercent: formData.get("minMarginPercent"),
  });
  if (!parsed.success) return { error: "Please check the values you entered." };

  await prisma.organization.update({
    where: { id: session.orgId },
    data: { ...parsed.data, planStatus: "active" },
  });

  redirect("/dashboard");
}

const orgSettingsSchema = z.object({
  name: z.string().min(2),
  currency: z.string().min(3).max(3),
  language: z.string().min(2).max(5),
  defaultMarginPercent: z.coerce.number().min(0).max(90),
  minMarginPercent: z.coerce.number().min(0).max(90),
  maxDiscountPercent: z.coerce.number().min(0).max(90),
  highValueThreshold: z.coerce.number().min(0),
  brandingPrimaryColor: z.string().min(4),
  brandingFooterText: z.string().optional(),
});

export async function updateOrgSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "org.manage");

  const parsed = orgSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid settings." };

  await prisma.organization.update({ where: { id: session.orgId }, data: parsed.data });
  await recordAudit({
    orgId: session.orgId,
    actorId: session.userId,
    action: "org.settings_updated",
    entityType: "Organization",
    entityId: session.orgId,
  });

  revalidatePath("/settings");
  return { success: "Settings saved." };
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "SALES_MANAGER", "SALES_REP", "ESTIMATOR", "VIEWER"]),
});

export async function inviteUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "users.manage");

  const parsed = inviteSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { error: "Enter a valid e-mail and role." };

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findFirst({ where: { orgId: session.orgId, email } });
  if (existingUser) return { error: "This person is already a member." };

  await prisma.invitation.create({
    data: {
      orgId: session.orgId,
      email,
      role: parsed.data.role as UserRole,
      token: randomUUID(),
      invitedById: session.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await recordAudit({
    orgId: session.orgId,
    actorId: session.userId,
    action: "user.invited",
    entityType: "Invitation",
    entityId: email,
  });

  revalidatePath("/settings/users");
  return { success: `Invitation sent to ${email}.` };
}

export async function removeInvitationAction(invitationId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "users.manage");
  await prisma.invitation.delete({ where: { id: invitationId } });
  revalidatePath("/settings/users");
}

export async function updateUserRoleAction(userId: string, role: UserRole): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "users.manage");
  await prisma.user.update({ where: { id: userId, orgId: session.orgId }, data: { role } });
  await recordAudit({
    orgId: session.orgId,
    actorId: session.userId,
    action: "user.role_updated",
    entityType: "User",
    entityId: userId,
    metadata: { role },
  });
  revalidatePath("/settings/users");
}

export async function toggleUserActiveAction(userId: string, isActive: boolean): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "users.manage");
  await prisma.user.update({ where: { id: userId, orgId: session.orgId }, data: { isActive } });
  revalidatePath("/settings/users");
}
