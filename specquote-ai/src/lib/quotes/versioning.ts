import { prisma } from "@/lib/db/client";

/** Snapshots the quote + its line items into an immutable QuoteVersion row before a mutating change, so the workspace can render a version history / diff. */
export async function snapshotQuoteVersion(quoteId: string, note?: string, createdById?: string | null): Promise<void> {
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { lineItems: true },
  });

  const lastVersion = await prisma.quoteVersion.findFirst({
    where: { quoteId },
    orderBy: { versionNumber: "desc" },
  });

  await prisma.quoteVersion.create({
    data: {
      quoteId,
      versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
      snapshotJson: JSON.stringify(quote),
      note: note ?? null,
      createdById: createdById ?? null,
    },
  });
}
