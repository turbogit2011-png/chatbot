import { requireCurrentUser } from "@/lib/security/current-user";
import { getDashboardMetrics } from "@/lib/analytics/dashboard";
import { prisma } from "@/lib/db/client";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { RfqStatusBadge } from "@/components/ui/status-badges";
import { RFQ_STATUS_LABELS } from "@/lib/rfq/status";
import { FIELD_LABELS } from "@/lib/ai/types";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";
import type { RfqStatus } from "@prisma/client";

export default async function DashboardPage() {
  const session = await requireCurrentUser();
  const [metrics, org, recentRfqs] = await Promise.all([
    getDashboardMetrics(session.orgId),
    prisma.organization.findUniqueOrThrow({ where: { id: session.orgId } }),
    prisma.rfq.findMany({
      where: { orgId: session.orgId },
      orderBy: { receivedAt: "desc" },
      take: 6,
      include: { account: true },
    }),
  ]);

  const statusOrder: RfqStatus[] = [
    "NEW",
    "PARSING",
    "NEEDS_REVIEW",
    "MISSING_INFORMATION",
    "READY_FOR_QUOTE",
    "AWAITING_APPROVAL",
    "SENT",
    "WON",
    "LOST",
  ];
  const statusCounts = new Map(metrics.rfqsByStatus.map((s) => [s.status, s.count]));
  const maxStatusCount = Math.max(1, ...statusOrder.map((s) => statusCounts.get(s) ?? 0));

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Operational overview for {org.name}.</p>
        </div>
        <Link href="/inbox" className="text-sm font-medium text-brand-600 hover:underline">
          Go to RFQ Inbox →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="New RFQs (7 days)" value={String(metrics.newRfqsThisWeek)} />
        <StatTile
          label="Avg. quote turnaround"
          value={metrics.avgQuoteTurnaroundHours != null ? `${metrics.avgQuoteTurnaroundHours} h` : "—"}
        />
        <StatTile
          label="Quotes awaiting approval"
          value={String(metrics.pendingApprovalCount)}
          tone={metrics.pendingApprovalCount > 0 ? "bad" : "neutral"}
        />
        <StatTile label="Pipeline value" value={formatMoney(metrics.pipelineValue, org.currency)} />
        <StatTile label="Win rate" value={metrics.winRate != null ? `${metrics.winRate}%` : "—"} tone="good" />
        <StatTile
          label="Hours saved by AI (this month)"
          value={`${metrics.hoursSavedThisMonth} h`}
          hint="Estimated from documents auto-parsed"
        />
        <StatTile label="Currency" value={org.currency} />
        <StatTile label="Plan" value={org.plan} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>RFQ pipeline by stage</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2.5">
            {statusOrder.map((status) => {
              const count = statusCounts.get(status) ?? 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs font-medium text-gray-600">{RFQ_STATUS_LABELS[status]}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(count / maxStatusCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs tabular-nums text-gray-500">{count}</span>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Biggest blockers</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {metrics.topBlockers.length === 0 && <p className="text-sm text-gray-500">No open blockers right now.</p>}
            {metrics.topBlockers.map((b) => (
              <div key={b.fieldKey} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{FIELD_LABELS[b.fieldKey] ?? b.fieldKey}</span>
                <span className="font-medium tabular-nums text-gray-900">{b.count}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent RFQs</CardTitle>
          </CardHeader>
          <CardBody className="divide-y divide-border p-0">
            {recentRfqs.map((rfq) => (
              <Link
                key={rfq.id}
                href={`/inbox/${rfq.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{rfq.subject}</p>
                  <p className="truncate text-xs text-gray-500">{rfq.account.name}</p>
                </div>
                <RfqStatusBadge status={rfq.status} />
              </Link>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lost reasons</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {metrics.lostReasons.length === 0 && <p className="text-sm text-gray-500">No lost quotes yet.</p>}
            {metrics.lostReasons.map((r) => (
              <div key={r.reason} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{r.reason}</span>
                <span className="font-medium tabular-nums text-gray-900">{r.count}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
