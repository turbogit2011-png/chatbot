import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { RfqStatusBadge, RiskBadge } from "@/components/ui/status-badges";
import { LeftPanel } from "@/components/workspace/left-panel";
import { ExtractedFieldsPanel } from "@/components/workspace/extracted-fields";
import { LineItemsTable } from "@/components/workspace/line-items-table";
import { MissingInfoPanel } from "@/components/workspace/missing-info-panel";
import { ActionsPanel } from "@/components/workspace/actions-panel";
import { formatMoney, formatDate } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";

export default async function RfqWorkspacePage({ params }: { params: Promise<{ rfqId: string }> }) {
  const { rfqId } = await params;
  const session = await requireCurrentUser();

  const rfq = await prisma.rfq.findFirst({
    where: { id: rfqId, orgId: session.orgId },
    include: {
      account: true,
      contact: true,
      attachments: true,
      extractedFields: { orderBy: { fieldKey: "asc" } },
      lineItems: { include: { matchedProduct: true }, orderBy: { createdAt: "asc" } },
      missingInfoItems: { orderBy: { createdAt: "asc" } },
      messageDrafts: { orderBy: { createdAt: "desc" } },
      quotes: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, include: { createdBy: true }, take: 30 },
    },
  });

  if (!rfq) notFound();

  const users = await prisma.user.findMany({ where: { orgId: session.orgId, isActive: true }, orderBy: { name: "asc" } });
  const uncertainties: string[] = rfq.aiUncertaintiesJson ? JSON.parse(rfq.aiUncertaintiesJson) : [];
  const openMissingInfo = rfq.missingInfoItems.filter((m) => m.status === "OPEN").length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-white px-6 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold text-gray-900">{rfq.subject}</h1>
            <RfqStatusBadge status={rfq.status} />
            <RiskBadge level={rfq.riskLevel} />
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {rfq.account.name} {rfq.contact ? `· ${rfq.contact.name}` : ""} · Due{" "}
            {rfq.dueDate ? formatDate(rfq.dueDate) : "no date set"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-6 text-right">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Completeness</p>
            <p className="text-lg font-semibold text-gray-900">{rfq.completeness}%</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Potential value</p>
            <p className="text-lg font-semibold text-gray-900">
              {rfq.estimatedValue ? formatMoney(rfq.estimatedValue, "EUR") : "—"}
            </p>
          </div>
        </div>
      </div>

      {rfq.status === "PARSING" && (
        <div className="flex items-center gap-2 border-b border-border bg-violet-50 px-6 py-2 text-sm text-violet-700">
          <Loader2 size={14} className="animate-spin" /> AI is parsing this request…
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr_320px]">
        <LeftPanel
          orgId={session.orgId}
          subject={rfq.subject}
          sourceEmailRaw={rfq.sourceEmailRaw}
          receivedAt={rfq.receivedAt}
          attachments={rfq.attachments}
        />

        <div className="overflow-y-auto px-6 py-5">
          {rfq.aiSummary ? (
            <div className="mb-5 rounded-lg bg-brand-50 px-4 py-3 text-[13px] text-brand-900">
              <p className="mb-1 font-medium">AI summary</p>
              <p>{rfq.aiSummary}</p>
            </div>
          ) : null}

          {uncertainties.length > 0 && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-amber-900">
                <AlertTriangle size={13} /> AI-flagged uncertainties
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-[13px] text-amber-800">
                {uncertainties.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Extracted header fields
            </h2>
            <ExtractedFieldsPanel rfqId={rfq.id} fields={rfq.extractedFields} />
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Technical line items ({rfq.lineItems.length})
            </h2>
            <LineItemsTable rfqId={rfq.id} lineItems={rfq.lineItems} />
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Missing information {openMissingInfo > 0 ? `(${openMissingInfo} open)` : ""}
            </h2>
            <MissingInfoPanel rfqId={rfq.id} items={rfq.missingInfoItems} drafts={rfq.messageDrafts} />
          </section>
        </div>

        <ActionsPanel
          rfqId={rfq.id}
          users={users}
          assignedToId={rfq.assignedToId}
          quotes={rfq.quotes}
          activities={rfq.activities}
          canCreateQuote={rfq.lineItems.length > 0}
        />
      </div>
    </div>
  );
}
