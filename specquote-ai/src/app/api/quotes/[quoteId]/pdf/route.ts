import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withAuth } from "@/lib/security/api-handler";
import { renderQuotePdf } from "@/lib/export/quote-pdf";
import { formatDate } from "@/lib/utils";

export const GET = withAuth(async (session, _req: Request, ctx: { params: Promise<{ quoteId: string }> }) => {
  const { quoteId } = await ctx.params;

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, orgId: session.orgId },
    include: { lineItems: { orderBy: { sortOrder: "asc" } }, account: true, org: true, rfq: { include: { contact: true } } },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  }

  const buffer = await renderQuotePdf({
    orgName: quote.org.name,
    brandingFooterText: quote.org.brandingFooterText,
    brandingPrimaryColor: quote.org.brandingPrimaryColor,
    quoteNumber: quote.number,
    version: quote.version,
    status: quote.status,
    currency: quote.currency,
    accountName: quote.account.name,
    contactName: quote.rfq.contact?.name,
    createdAt: formatDate(quote.createdAt),
    validUntil: quote.validUntil ? formatDate(quote.validUntil) : null,
    paymentTerms: quote.paymentTerms,
    deliveryTerms: quote.deliveryTerms,
    notes: quote.notes,
    lineItems: quote.lineItems.map((li) => ({
      description: li.description,
      sku: li.sku,
      quantity: li.quantity,
      unit: li.unit,
      unitPrice: li.unitPrice,
      lineTotal: li.lineTotal,
    })),
    subtotal: quote.subtotal,
    discountTotal: quote.discountTotal,
    total: quote.total,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.number}.pdf"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
});
