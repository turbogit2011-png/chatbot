import { FileDown, Send } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendQuoteAction, markQuoteOutcomeFormAction } from "@/lib/actions/quote";
import type { QuoteStatus } from "@prisma/client";

export function SendOutcomePanel({ quoteId, status }: { quoteId: string; status: QuoteStatus }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deliver to customer</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <a href={`/api/quotes/${quoteId}/pdf`} target="_blank" rel="noreferrer">
          <Button type="button" variant="secondary" className="w-full">
            <FileDown size={14} /> Preview / download PDF
          </Button>
        </a>

        {status === "APPROVED" && (
          <form action={sendQuoteAction.bind(null, quoteId)}>
            <Button type="submit" variant="brand" className="w-full">
              <Send size={14} /> Send quote e-mail
            </Button>
          </form>
        )}

        {status === "SENT" && (
          <form action={markQuoteOutcomeFormAction.bind(null, quoteId)} className="space-y-2">
            <Input name="lostReason" placeholder="If lost, reason (e.g. price, lead time)…" />
            <div className="flex gap-2">
              <Button type="submit" name="outcome" value="WON" variant="brand" size="sm" className="flex-1">
                Mark Won
              </Button>
              <Button type="submit" name="outcome" value="LOST" variant="danger" size="sm" className="flex-1">
                Mark Lost
              </Button>
            </div>
          </form>
        )}

        {(status === "WON" || status === "LOST") && (
          <p className={`text-center text-sm font-medium ${status === "WON" ? "text-emerald-700" : "text-gray-500"}`}>
            Quote closed as {status}.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
