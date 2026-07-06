import Link from "next/link";
import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { Card } from "@/components/ui/card";
import { QuoteStatusBadge } from "@/components/ui/status-badges";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function QuotesPage() {
  const session = await requireCurrentUser();
  const quotes = await prisma.quote.findMany({
    where: { orgId: session.orgId },
    include: { account: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-[1300px] px-8 py-8">
      <h1 className="text-xl font-semibold text-gray-900">Quotes</h1>
      <p className="mb-5 text-sm text-gray-500">{quotes.length} quote{quotes.length === 1 ? "" : "s"}</p>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5">Number</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Margin</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5">Created</th>
                <th className="px-4 py-2.5">Valid until</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/quotes/${q.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {q.number}
                    </Link>
                    <p className="text-xs text-gray-400">v{q.version}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{q.account.name}</td>
                  <td className="px-4 py-3">
                    <QuoteStatusBadge status={q.status} />
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${q.marginPercent < 15 ? "font-medium text-red-600" : "text-gray-700"}`}
                  >
                    {q.marginPercent}%
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900">
                    {formatMoney(q.total, q.currency)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(q.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{q.validUntil ? formatDate(q.validUntil) : "—"}</td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                    No quotes yet — create one from an RFQ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
