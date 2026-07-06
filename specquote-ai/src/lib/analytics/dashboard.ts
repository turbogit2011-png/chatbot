import { prisma } from "@/lib/db/client";

const MINUTES_SAVED_PER_DOCUMENT = 14;

export interface DashboardMetrics {
  newRfqsThisWeek: number;
  avgQuoteTurnaroundHours: number | null;
  pendingApprovalCount: number;
  pipelineValue: number;
  winRate: number | null;
  lostReasons: Array<{ reason: string; count: number }>;
  topBlockers: Array<{ fieldKey: string; count: number }>;
  hoursSavedThisMonth: number;
  rfqsByStatus: Array<{ status: string; count: number }>;
}

export async function getDashboardMetrics(orgId: string): Promise<DashboardMetrics> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [newRfqsThisWeek, pendingApprovalCount, rfqsByStatusRaw, wonQuotes, lostQuotes, missingInfoRaw, documentsThisMonth] =
    await Promise.all([
      prisma.rfq.count({ where: { orgId, receivedAt: { gte: weekAgo } } }),
      prisma.quote.count({ where: { orgId, status: "NEEDS_APPROVAL" } }),
      prisma.rfq.groupBy({ by: ["status"], where: { orgId }, _count: { _all: true } }),
      prisma.quote.findMany({ where: { orgId, status: "WON" }, select: { total: true, createdAt: true, sentAt: true } }),
      prisma.quote.findMany({ where: { orgId, status: "LOST" }, select: { lostReason: true } }),
      prisma.missingInfoItem.groupBy({
        by: ["fieldKey"],
        where: { rfq: { orgId }, status: "OPEN" },
        _count: { _all: true },
        orderBy: { _count: { fieldKey: "desc" } },
        take: 5,
      }),
      prisma.usageEvent.aggregate({
        where: { orgId, type: "DOCUMENT_PROCESSED", occurredAt: { gte: startOfMonth } },
        _sum: { quantity: true },
      }),
    ]);

  const sentQuotes = await prisma.quote.findMany({
    where: { orgId, sentAt: { not: null } },
    select: { createdAt: true, sentAt: true },
  });
  const turnaroundHours = sentQuotes
    .filter((q) => q.sentAt)
    .map((q) => (q.sentAt!.getTime() - q.createdAt.getTime()) / (1000 * 60 * 60));
  const avgQuoteTurnaroundHours = turnaroundHours.length
    ? Math.round((turnaroundHours.reduce((a, b) => a + b, 0) / turnaroundHours.length) * 10) / 10
    : null;

  const pipelineValue = await prisma.rfq.aggregate({
    where: { orgId, status: { notIn: ["WON", "LOST", "ARCHIVED"] } },
    _sum: { estimatedValue: true },
  });

  const closedCount = wonQuotes.length + lostQuotes.length;
  const winRate = closedCount > 0 ? Math.round((wonQuotes.length / closedCount) * 1000) / 10 : null;

  const lostReasonCounts = new Map<string, number>();
  for (const q of lostQuotes) {
    const reason = q.lostReason ?? "Not specified";
    lostReasonCounts.set(reason, (lostReasonCounts.get(reason) ?? 0) + 1);
  }

  const documentsProcessed = documentsThisMonth._sum.quantity ?? 0;

  return {
    newRfqsThisWeek,
    avgQuoteTurnaroundHours,
    pendingApprovalCount,
    pipelineValue: pipelineValue._sum.estimatedValue ?? 0,
    winRate,
    lostReasons: [...lostReasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    topBlockers: missingInfoRaw.map((m) => ({ fieldKey: m.fieldKey, count: m._count._all })),
    hoursSavedThisMonth: Math.round((documentsProcessed * MINUTES_SAVED_PER_DOCUMENT) / 60),
    rfqsByStatus: rfqsByStatusRaw.map((r) => ({ status: r.status, count: r._count._all })),
  };
}
