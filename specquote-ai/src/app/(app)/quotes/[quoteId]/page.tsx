import { notFound } from "next/navigation";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { QuoteStatusBadge } from "@/components/ui/status-badges";
import { LineItemsEditor } from "@/components/quotes/line-items-editor";
import { TermsForm } from "@/components/quotes/terms-form";
import { ApprovalPanel } from "@/components/quotes/approval-panel";
import { SendOutcomePanel } from "@/components/quotes/send-outcome-panel";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default async function QuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const session = await requireCurrentUser();

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, orgId: session.orgId },
    include: {
      account: true,
      rfq: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      versions: { orderBy: { versionNumber: "desc" } },
      approvalDecisions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!quote) notFound();

  const editable = quote.status === "DRAFT" || quote.status === "REJECTED";

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400">
            <Link href={`/inbox/${quote.rfqId}`} className="hover:underline">
              ← Back to RFQ
            </Link>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">Quote {quote.number}</h1>
            <span className="text-sm text-gray-400">v{quote.version}</span>
            <QuoteStatusBadge status={quote.status} />
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{quote.account.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
          <p className="text-2xl font-semibold text-gray-900">{formatMoney(quote.total, quote.currency)}</p>
          <p className={`text-xs ${quote.marginPercent < 15 ? "font-medium text-red-600" : "text-gray-500"}`}>
            {quote.marginPercent}% margin
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardBody>
              <LineItemsEditor
                quoteId={quote.id}
                lineItems={quote.lineItems}
                currency={quote.currency}
                editable={editable}
              />
              <div className="mt-3 flex justify-end gap-6 text-sm">
                <span className="text-gray-500">Subtotal: {formatMoney(quote.subtotal, quote.currency)}</span>
                {quote.discountTotal > 0 && (
                  <span className="text-gray-500">Discount: -{formatMoney(quote.discountTotal, quote.currency)}</span>
                )}
                <span className="font-semibold text-gray-900">Total: {formatMoney(quote.total, quote.currency)}</span>
              </div>
            </CardBody>
          </Card>

          <TermsForm quote={quote} editable={editable} />

          {quote.versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Version history</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {quote.versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">
                      v{v.versionNumber} — {v.note ?? "Updated"}
                    </span>
                    <span className="text-gray-400">{formatDateTime(v.createdAt)}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <ApprovalPanel
            quoteId={quote.id}
            status={quote.status}
            decisions={quote.approvalDecisions}
            role={session.role}
          />
          <SendOutcomePanel quoteId={quote.id} status={quote.status} />
        </div>
      </div>
    </div>
  );
}
