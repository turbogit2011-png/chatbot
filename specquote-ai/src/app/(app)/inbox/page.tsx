import Link from "next/link";
import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { Card } from "@/components/ui/card";
import { RfqStatusBadge, RiskBadge } from "@/components/ui/status-badges";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Paperclip, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import type { Prisma } from "@prisma/client";

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function isOverdue(dueDate: Date | null): boolean {
  return Boolean(dueDate && dueDate.getTime() < Date.now());
}

const FILTERS = [
  { key: "urgent", label: "Urgent" },
  { key: "unassigned", label: "Unassigned" },
  { key: "missing_info", label: "Needs data" },
  { key: "awaiting_approval", label: "Awaiting approval" },
  { key: "high_risk", label: "High risk" },
  { key: "high_potential", label: "High potential" },
] as const;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const session = await requireCurrentUser();
  const { filter, q } = await searchParams;

  const where: Prisma.RfqWhereInput = { orgId: session.orgId, status: { not: "ARCHIVED" } };

  if (filter === "urgent") {
    where.dueDate = { lte: daysFromNow(3) };
  } else if (filter === "unassigned") {
    where.assignedToId = null;
  } else if (filter === "missing_info") {
    where.status = "MISSING_INFORMATION";
  } else if (filter === "awaiting_approval") {
    where.status = "AWAITING_APPROVAL";
  } else if (filter === "high_risk") {
    where.riskLevel = "HIGH";
  } else if (filter === "high_potential") {
    where.estimatedValue = { gte: 15000 };
  }

  if (q) {
    where.OR = [
      { subject: { contains: q } },
      { account: { name: { contains: q } } },
    ];
  }

  const rfqs = await prisma.rfq.findMany({
    where,
    include: { account: true, contact: true, assignedTo: true, attachments: true },
    orderBy: [{ dueDate: "asc" }, { receivedAt: "desc" }],
    take: 100,
  });

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">RFQ Inbox</h1>
          <p className="text-sm text-gray-500">{rfqs.length} request{rfqs.length === 1 ? "" : "s"} in view</p>
        </div>
        <LinkButton href="/inbox/new" variant="brand">
          <Plus size={15} /> New RFQ
        </LinkButton>
      </div>

      <form className="mb-4 flex items-center gap-2" action="/inbox">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search customer or subject…"
          className="h-9 w-72 rounded-lg border border-border bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {filter ? <input type="hidden" name="filter" value={filter} /> : null}
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/inbox"
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            !filter ? "border-graphite-900 bg-graphite-900 text-white" : "border-border bg-white text-gray-600 hover:bg-gray-50",
          )}
        >
          All
        </Link>
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/inbox?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              filter === f.key
                ? "border-graphite-900 bg-graphite-900 text-white"
                : "border-border bg-white text-gray-600 hover:bg-gray-50",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Subject</th>
                <th className="px-4 py-2.5">Received</th>
                <th className="px-4 py-2.5">Due</th>
                <th className="px-4 py-2.5 text-center">Files</th>
                <th className="px-4 py-2.5">Completeness</th>
                <th className="px-4 py-2.5">Risk</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Rep</th>
                <th className="px-4 py-2.5 text-right">Potential</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map((rfq) => {
                const overdue = isOverdue(rfq.dueDate);
                return (
                  <tr key={rfq.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/inbox/${rfq.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                        {rfq.account.name}
                      </Link>
                      <p className="text-xs text-gray-500">{rfq.contact?.name ?? "No contact on file"}</p>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <Link href={`/inbox/${rfq.id}`} className="line-clamp-1 text-gray-800 hover:text-brand-600">
                        {rfq.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(rfq.receivedAt)}</td>
                    <td className={cn("px-4 py-3", overdue ? "font-medium text-red-600" : "text-gray-600")}>
                      {rfq.dueDate ? formatDate(rfq.dueDate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Paperclip size={12} /> {rfq.attachments.length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              rfq.completeness >= 80 ? "bg-emerald-500" : rfq.completeness >= 50 ? "bg-amber-500" : "bg-red-500",
                            )}
                            style={{ width: `${rfq.completeness}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{rfq.completeness}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge level={rfq.riskLevel} />
                    </td>
                    <td className="px-4 py-3">
                      <RfqStatusBadge status={rfq.status} />
                    </td>
                    <td className="px-4 py-3">
                      {rfq.assignedTo ? (
                        <Avatar name={rfq.assignedTo.name} color={rfq.assignedTo.avatarColor} size={24} />
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900">
                      {rfq.estimatedValue ? formatMoney(rfq.estimatedValue, "EUR") : "—"}
                    </td>
                  </tr>
                );
              })}
              {rfqs.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-500">
                    No RFQs match this filter.
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
