import Link from "next/link";
import { RefreshCw, Archive } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignRepSelect } from "./assign-rep-select";
import { reparseRfqAction, archiveRfqAction } from "@/lib/actions/rfq";
import { createQuoteFromRfqAction } from "@/lib/actions/quote";
import { formatDateTime } from "@/lib/utils";
import type { Activity, User, Quote } from "@prisma/client";

export function ActionsPanel({
  rfqId,
  users,
  assignedToId,
  quotes,
  activities,
  canCreateQuote,
}: {
  rfqId: string;
  users: User[];
  assignedToId: string | null;
  quotes: Quote[];
  activities: (Activity & { createdBy: User | null })[];
  canCreateQuote: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto border-l border-border bg-white p-4">
      <div>
        <Label>Assigned to</Label>
        <AssignRepSelect rfqId={rfqId} users={users} assignedToId={assignedToId} />
      </div>

      <div className="space-y-2">
        {quotes.length > 0 ? (
          quotes.map((q) => (
            <LinkButton key={q.id} href={`/quotes/${q.id}`} variant="brand" className="w-full">
              Open quote {q.number}
            </LinkButton>
          ))
        ) : canCreateQuote ? (
          <form action={createQuoteFromRfqAction.bind(null, rfqId)}>
            <Button type="submit" variant="brand" className="w-full">
              Create quote draft
            </Button>
          </form>
        ) : (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Resolve open blockers before drafting a quote, or create one anyway once the technical picture is clear.
          </p>
        )}

        <form action={reparseRfqAction.bind(null, rfqId)}>
          <Button type="submit" variant="secondary" size="sm" className="w-full">
            <RefreshCw size={13} /> Re-run AI parsing
          </Button>
        </form>

        <form action={archiveRfqAction.bind(null, rfqId)}>
          <Button type="submit" variant="ghost" size="sm" className="w-full text-gray-500">
            <Archive size={13} /> Archive RFQ
          </Button>
        </form>
      </div>

      <Card className="mt-2 flex-1">
        <CardHeader>
          <CardTitle>Activity & decisions</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {activities.length === 0 && <p className="text-xs text-gray-400">No activity yet.</p>}
          {activities.map((a) => (
            <div key={a.id} className="text-xs">
              <p className="text-gray-700">{a.body}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                {a.createdBy?.name ?? "System"} · {formatDateTime(a.createdAt)}
              </p>
            </div>
          ))}
        </CardBody>
      </Card>

      <Link href="/inbox" className="text-center text-xs text-gray-400 hover:underline">
        ← Back to inbox
      </Link>
    </div>
  );
}
