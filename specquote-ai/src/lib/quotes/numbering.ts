import { prisma } from "@/lib/db/client";

/** Generates the next sequential quote number for an org, scoped per calendar year: Q-2026-0001, Q-2026-0002, ... */
export async function generateQuoteNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;

  const count = await prisma.quote.count({
    where: { orgId, number: { startsWith: prefix } },
  });

  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}
