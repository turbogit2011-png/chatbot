"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/security/passwords";
import { setSessionCookie, clearSessionCookie } from "@/lib/security/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { recordAudit } from "@/lib/security/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface AuthFormState {
  error?: string;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid e-mail and password." };

  const ip = await clientIp();
  const rl = checkRateLimit(`login:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) return { error: "Too many attempts. Please wait a minute and try again." };

  const user = await prisma.user.findFirst({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.isActive) return { error: "Invalid e-mail or password." };

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return { error: "Invalid e-mail or password." };

  await setSessionCookie({
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  await recordAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    ipAddress: ip,
  });

  redirect("/dashboard");
}

const registerSchema = z.object({
  companyName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "org"
  );
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    companyName: formData.get("companyName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const ip = await clientIp();
  const rl = checkRateLimit(`register:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.allowed) return { error: "Too many attempts. Please wait a minute and try again." };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) return { error: "An account with this e-mail already exists." };

  let slug = slugify(parsed.data.companyName);
  const slugTaken = await prisma.organization.findUnique({ where: { slug } });
  if (slugTaken) slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;

  const passwordHash = await hashPassword(parsed.data.password);

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.companyName,
      slug,
      users: {
        create: {
          email,
          name: parsed.data.name,
          passwordHash,
          role: "OWNER",
        },
      },
    },
    include: { users: true },
  });

  const owner = org.users[0];

  await setSessionCookie({
    userId: owner.id,
    orgId: org.id,
    role: owner.role,
    name: owner.name,
    email: owner.email,
  });

  await recordAudit({
    orgId: org.id,
    actorId: owner.id,
    action: "org.created",
    entityType: "Organization",
    entityId: org.id,
    ipAddress: ip,
  });

  redirect("/onboarding");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
