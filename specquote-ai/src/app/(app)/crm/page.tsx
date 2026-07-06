import Link from "next/link";
import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export default async function CrmAccountsPage() {
  const session = await requireCurrentUser();
  const accounts = await prisma.account.findMany({
    where: { orgId: session.orgId },
    include: {
      _count: { select: { rfqs: true, quotes: true } },
      quotes: { where: { status: "WON" }, select: { total: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-[1300px] px-8 py-8">
      <h1 className="text-xl font-semibold text-gray-900">CRM — Accounts</h1>
      <p className="mb-5 text-sm text-gray-500">{accounts.length} customer accounts</p>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5">Account</th>
                <th className="px-4 py-2.5">Industry</th>
                <th className="px-4 py-2.5">Country</th>
                <th className="px-4 py-2.5 text-right">RFQs</th>
                <th className="px-4 py-2.5 text-right">Quotes</th>
                <th className="px-4 py-2.5 text-right">Won revenue</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/crm/${a.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{a.industry ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{a.country ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{a._count.rfqs}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{a._count.quotes}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-900">
                    {formatMoney(a.quotes.reduce((sum, q) => sum + q.total, 0), "EUR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
