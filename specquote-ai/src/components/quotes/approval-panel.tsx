import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { submitQuoteForApprovalAction, decideQuoteApprovalFormAction } from "@/lib/actions/quote";
import type { ApprovalDecision } from "@prisma/client";
import { can, type Permission } from "@/lib/security/rbac";
import type { UserRole } from "@prisma/client";

export function ApprovalPanel({
  quoteId,
  status,
  decisions,
  role,
}: {
  quoteId: string;
  status: string;
  decisions: ApprovalDecision[];
  role: UserRole;
}) {
  const pendingDecisions = decisions.filter((d) => d.status === "PENDING");
  const canApprove = can(role, "quote.approve" as Permission);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Margin & approval guardrails</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {status === "DRAFT" && (
          <form action={submitQuoteForApprovalAction.bind(null, quoteId)}>
            <Button type="submit" variant="brand" className="w-full">
              Run guardrail check
            </Button>
          </form>
        )}

        {status === "NEEDS_APPROVAL" && (
          <>
            <div className="space-y-2">
              {pendingDecisions.map((d) => (
                <div key={d.id} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-900">{d.triggeredReason}</p>
                </div>
              ))}
            </div>
            {canApprove ? (
              <form action={decideQuoteApprovalFormAction.bind(null, quoteId)} className="space-y-2">
                <Textarea name="comment" placeholder="Optional approval comment…" rows={2} />
                <div className="flex gap-2">
                  <Button type="submit" name="decision" value="APPROVED" variant="brand" size="sm" className="flex-1">
                    Approve
                  </Button>
                  <Button type="submit" name="decision" value="REJECTED" variant="danger" size="sm" className="flex-1">
                    Reject
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-gray-500">Waiting on a Sales Manager, Admin or Owner to review.</p>
            )}
          </>
        )}

        {status === "APPROVED" && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <ShieldCheck size={14} /> Cleared — ready to send.
          </div>
        )}

        {status === "REJECTED" && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            Rejected. Adjust pricing and re-submit.
          </div>
        )}

        {decisions.filter((d) => d.status !== "PENDING").length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Decision history</p>
            {decisions
              .filter((d) => d.status !== "PENDING")
              .map((d) => (
                <p key={d.id} className="text-xs text-gray-500">
                  {d.triggeredReason} — <span className="font-medium">{d.status}</span>
                  {d.comment ? ` (${d.comment})` : ""}
                </p>
              ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
