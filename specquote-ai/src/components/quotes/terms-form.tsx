import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateQuoteTermsAction } from "@/lib/actions/quote";
import type { Quote } from "@prisma/client";

export function TermsForm({ quote, editable }: { quote: Quote; editable: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Commercial terms</CardTitle>
      </CardHeader>
      <CardBody>
        <form action={updateQuoteTermsAction.bind(null, quote.id)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Payment terms</Label>
              <Input name="paymentTerms" defaultValue={quote.paymentTerms} disabled={!editable} />
            </div>
            <div>
              <Label>Delivery terms</Label>
              <Input name="deliveryTerms" defaultValue={quote.deliveryTerms} disabled={!editable} />
            </div>
          </div>
          <div>
            <Label>Valid until</Label>
            <Input
              name="validUntil"
              type="date"
              defaultValue={quote.validUntil?.toISOString().slice(0, 10)}
              disabled={!editable}
            />
          </div>
          <div>
            <Label>Technical notes</Label>
            <Textarea name="notes" rows={3} defaultValue={quote.notes ?? ""} disabled={!editable} />
          </div>
          {editable && (
            <Button type="submit" variant="secondary" size="sm">
              Save terms
            </Button>
          )}
        </form>
      </CardBody>
    </Card>
  );
}
