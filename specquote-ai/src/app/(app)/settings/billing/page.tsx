import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { getUsageSummary } from "@/lib/billing/usage";
import { PLAN_DEFINITIONS, PLAN_ORDER } from "@/lib/billing/plans";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function BillingPage() {
  const session = await requireCurrentUser();
  const [org, usage] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: session.orgId } }),
    getUsageSummary(session.orgId),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usage this month</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <UsageStat label="RFQs analyzed" value={usage.rfqsAnalyzed} limit={usage.rfqsIncludedInPlan} />
          <UsageStat label="Documents processed" value={usage.documentsProcessed} />
          <UsageStat label="Quotes generated" value={usage.quotesGenerated} />
          <UsageStat label="Seats used" value={usage.seatsUsed} limit={usage.seatsIncludedInPlan} />
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Plans</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PLAN_ORDER.map((planId) => {
            const plan = PLAN_DEFINITIONS[planId];
            const isCurrent = org.plan === planId;
            return (
              <Card key={planId} className={cn(isCurrent && "border-brand-500 ring-1 ring-brand-500")}>
                <CardBody>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                    {isCurrent && <Badge tone="brand">Current plan</Badge>}
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">
                    €{plan.priceEurPerMonth.toLocaleString()}
                    <span className="text-sm font-normal text-gray-400">/mo</span>
                  </p>
                  {plan.priceSuffix && <p className="text-xs text-gray-400">{plan.priceSuffix}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    {plan.seats < 999 ? `${plan.seats} users` : "Unlimited users"} ·{" "}
                    {plan.rfqsPerMonth < 999999 ? `${plan.rfqsPerMonth}/mo RFQs` : "Unlimited RFQs"}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-gray-600">
                    {plan.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Demo MVP — plan changes and payment are illustrative only, no live billing is wired up.
        </p>
      </div>
    </div>
  );
}

function UsageStat({ label, value, limit }: { label: string; value: number; limit?: number }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">
        {value}
        {limit ? <span className="text-sm font-normal text-gray-400"> / {limit}</span> : null}
      </p>
    </div>
  );
}
