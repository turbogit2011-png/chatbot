import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfidenceChip } from "@/components/ui/status-badges";
import { FIELD_LABELS } from "@/lib/ai/types";
import { reviewFieldAction } from "@/lib/actions/rfq";
import type { ExtractedField } from "@prisma/client";

const STATUS_TONE: Record<string, Parameters<typeof Badge>[0]["tone"]> = {
  SUGGESTED: "amber",
  REVIEWED: "blue",
  APPROVED: "green",
  REJECTED: "red",
};

export function ExtractedFieldsPanel({ rfqId, fields }: { rfqId: string; fields: ExtractedField[] }) {
  if (fields.length === 0) {
    return <p className="text-sm text-gray-400">No header fields extracted yet.</p>;
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {fields.map((field) => (
        <div key={field.id} className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-40 shrink-0">
            <p className="text-xs font-medium text-gray-500">{FIELD_LABELS[field.fieldKey] ?? field.fieldKey}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-900">{field.value}</p>
            <p className="truncate text-[11px] text-gray-400">{field.sourceRef ?? "source unknown"}</p>
          </div>
          <ConfidenceChip value={field.confidence} />
          <Badge tone={STATUS_TONE[field.status]}>{field.status.toLowerCase()}</Badge>
          {field.status === "SUGGESTED" || field.status === "REVIEWED" ? (
            <div className="flex shrink-0 gap-1">
              <form action={reviewFieldAction.bind(null, field.id, rfqId, "APPROVED", undefined)}>
                <button
                  type="submit"
                  title="Approve"
                  className="rounded-md border border-border p-1.5 text-emerald-600 hover:bg-emerald-50"
                >
                  <Check size={13} />
                </button>
              </form>
              <form action={reviewFieldAction.bind(null, field.id, rfqId, "REJECTED", undefined)}>
                <button
                  type="submit"
                  title="Reject"
                  className="rounded-md border border-border p-1.5 text-red-600 hover:bg-red-50"
                >
                  <X size={13} />
                </button>
              </form>
            </div>
          ) : (
            <div className="w-[58px] shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
