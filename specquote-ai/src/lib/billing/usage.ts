import { prisma } from "@/lib/db/client";
import { PLAN_DEFINITIONS } from "./plans";

export interface UsageSummary {
  rfqsAnalyzed: number;
  documentsProcessed: number;
  quotesGenerated: number;
  activeIntegrations: number;
  rfqsIncludedInPlan: number;
  seatsUsed: number;
  seatsIncludedInPlan: number;
}

/** Usage-based billing abstraction: aggregates raw UsageEvent rows into the counters the pricing model bills against (RFQs analyzed, documents processed, quotes generated, active integrations). Swap this for a real metering/Stripe usage-records call without touching callers. */
export async function getUsageSummary(orgId: string): Promise<UsageSummary> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [rfqsAnalyzed, documentsProcessed, quotesGenerated, activeIntegrations, seatsUsed] = await Promise.all([
    prisma.usageEvent.aggregate({
      where: { orgId, type: "RFQ_ANALYZED", occurredAt: { gte: startOfMonth } },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.aggregate({
      where: { orgId, type: "DOCUMENT_PROCESSED", occurredAt: { gte: startOfMonth } },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.aggregate({
      where: { orgId, type: "QUOTE_GENERATED", occurredAt: { gte: startOfMonth } },
      _sum: { quantity: true },
    }),
    prisma.integration.count({ where: { orgId, status: "CONNECTED" } }),
    prisma.user.count({ where: { orgId, isActive: true } }),
  ]);

  const plan = PLAN_DEFINITIONS[org.plan];

  return {
    rfqsAnalyzed: rfqsAnalyzed._sum.quantity ?? 0,
    documentsProcessed: documentsProcessed._sum.quantity ?? 0,
    quotesGenerated: quotesGenerated._sum.quantity ?? 0,
    activeIntegrations,
    rfqsIncludedInPlan: plan.rfqsPerMonth,
    seatsUsed,
    seatsIncludedInPlan: plan.seats,
  };
}
