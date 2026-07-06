import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea, Input } from "@/components/ui/input";
import {
  generateMissingInfoDraftAction,
  dismissMissingInfoAction,
  updateMissingInfoDraftAction,
  sendMissingInfoDraftAction,
} from "@/lib/actions/rfq";
import type { MissingInfoItem, ClientMessageDraft } from "@prisma/client";

export function MissingInfoPanel({
  rfqId,
  items,
  drafts,
}: {
  rfqId: string;
  items: MissingInfoItem[];
  drafts: ClientMessageDraft[];
}) {
  const open = items.filter((i) => i.status === "OPEN");

  return (
    <div className="space-y-4">
      {open.length > 0 ? (
        <div className="space-y-1.5">
          {open.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                <p className="text-[13px] text-amber-900">{item.description}</p>
              </div>
              <form action={dismissMissingInfoAction.bind(null, item.id, rfqId)}>
                <button type="submit" className="shrink-0 text-[11px] font-medium text-amber-700 hover:underline">
                  Mark not relevant
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-emerald-700">All required information has been confirmed.</p>
      )}

      {open.length > 0 && (
        <form action={generateMissingInfoDraftAction.bind(null, rfqId)}>
          <Button type="submit" variant="secondary" size="sm" className="w-full">
            Draft e-mail asking for missing details
          </Button>
        </form>
      )}

      {drafts.length > 0 && (
        <div className="space-y-3 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer message drafts</p>
          {drafts.map((draft) => (
            <div key={draft.id} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <Badge tone={draft.status === "SENT" ? "green" : "neutral"}>{draft.status}</Badge>
              </div>
              {draft.status === "DRAFT" ? (
                <form action={updateMissingInfoDraftAction.bind(null, draft.id, rfqId)} className="space-y-2">
                  <Input name="subject" defaultValue={draft.subject} className="text-xs font-medium" />
                  <Textarea name="body" defaultValue={draft.body} rows={7} className="text-xs" />
                  <div className="flex gap-2">
                    <Button type="submit" variant="secondary" size="sm">
                      Save edits
                    </Button>
                    <Button
                      type="submit"
                      formAction={sendMissingInfoDraftAction.bind(null, draft.id, rfqId)}
                      variant="brand"
                      size="sm"
                    >
                      Send to customer
                    </Button>
                  </div>
                </form>
              ) : (
                <div>
                  <p className="text-xs font-medium text-gray-700">{draft.subject}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-gray-500">{draft.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
