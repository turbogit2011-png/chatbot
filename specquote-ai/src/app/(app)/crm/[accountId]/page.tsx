import { notFound } from "next/navigation";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { RfqStatusBadge, QuoteStatusBadge } from "@/components/ui/status-badges";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";

export default async function AccountDetailPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const session = await requireCurrentUser();

  const account = await prisma.account.findFirst({
    where: { id: accountId, orgId: session.orgId },
    include: {
      contacts: true,
      rfqs: { orderBy: { receivedAt: "desc" } },
      quotes: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, include: { createdBy: true }, take: 40 },
    },
  });

  if (!account) notFound();

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <p className="mb-2 text-xs text-gray-400">
        <Link href="/crm" className="hover:underline">
          ← All accounts
        </Link>
      </p>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{account.name}</h1>
          <p className="text-sm text-gray-500">
            {account.industry ?? "—"} · {account.country ?? "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>RFQ history</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-border p-0">
              {account.rfqs.map((rfq) => (
                <Link
                  key={rfq.id}
                  href={`/inbox/${rfq.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{rfq.subject}</p>
                    <p className="text-xs text-gray-500">{formatDate(rfq.receivedAt)}</p>
                  </div>
                  <RfqStatusBadge status={rfq.status} />
                </Link>
              ))}
              {account.rfqs.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No RFQs yet.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-border p-0">
              {account.quotes.map((q) => (
                <Link
                  key={q.id}
                  href={`/quotes/${q.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{q.number}</p>
                    <p className="text-xs text-gray-500">{formatMoney(q.total, q.currency)}</p>
                  </div>
                  <QuoteStatusBadge status={q.status} />
                </Link>
              ))}
              {account.quotes.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No quotes yet.</p>}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {account.contacts.map((c) => (
                <div key={c.id} className="text-sm">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.title ?? "—"} · {c.email ?? "no e-mail"}
                  </p>
                </div>
              ))}
              {account.contacts.length === 0 && <p className="text-sm text-gray-400">No contacts on file.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity timeline</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {account.activities.map((a) => (
                <div key={a.id} className="text-xs">
                  <p className="text-gray-700">{a.body}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {a.createdBy?.name ?? "System"} · {formatDateTime(a.createdAt)}
                  </p>
                </div>
              ))}
              {account.activities.length === 0 && <p className="text-sm text-gray-400">No activity yet.</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
