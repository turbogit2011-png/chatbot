import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateLineItemAction } from "@/lib/actions/rfq";
import type { RfqLineItem, CatalogProduct } from "@prisma/client";

const MATCH_TONE: Record<string, Parameters<typeof Badge>[0]["tone"]> = {
  MATCHED: "green",
  ALTERNATIVE: "blue",
  NEEDS_CONFIRMATION: "amber",
  UNMATCHED: "red",
};

const MATCH_LABEL: Record<string, string> = {
  MATCHED: "Matched",
  ALTERNATIVE: "Alternative",
  NEEDS_CONFIRMATION: "Needs confirmation",
  UNMATCHED: "Unmatched",
};

type LineItemWithProduct = RfqLineItem & { matchedProduct: CatalogProduct | null };

export function LineItemsTable({ rfqId, lineItems }: { rfqId: string; lineItems: LineItemWithProduct[] }) {
  if (lineItems.length === 0) {
    return <p className="text-sm text-gray-400">No technical line items detected yet.</p>;
  }

  return (
    <div className="space-y-3">
      {lineItems.map((li, idx) => {
        const alternatives: string[] = li.alternativeSkusJson ? JSON.parse(li.alternativeSkusJson) : [];
        return (
          <form
            key={li.id}
            action={updateLineItemAction.bind(null, li.id, rfqId)}
            className="rounded-lg border border-border p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {idx + 1}. {li.productFamily ?? "Unclassified item"}
                </p>
                <p className="text-[11px] text-gray-400">{li.rawDescription}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={MATCH_TONE[li.matchStatus]}>{MATCH_LABEL[li.matchStatus]}</Badge>
                {li.matchedProduct ? (
                  <span className="text-xs text-gray-500">
                    {li.matchedProduct.sku} · {li.matchedProduct.name}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <Field label="Part number" name="partNumber" defaultValue={li.partNumber ?? ""} />
              <Field label="Quantity" name="quantity" type="number" defaultValue={li.quantity ?? ""} />
              <Field label="Unit" name="unit" defaultValue={li.unit ?? ""} />
              <Field label="Material" name="material" defaultValue={li.material ?? ""} />
              <Field label="Tolerance" name="tolerance" defaultValue={li.tolerance ?? ""} />
              <Field label="Dimensions" name="dimensions" defaultValue={li.dimensions ?? ""} />
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {li.voltage ? <Badge tone="slate">Voltage: {li.voltage}</Badge> : null}
              {li.pressure ? <Badge tone="slate">Pressure: {li.pressure}</Badge> : null}
              {li.temperature ? <Badge tone="slate">Temp: {li.temperature}</Badge> : null}
              {li.certificationRequirements ? <Badge tone="purple">{li.certificationRequirements}</Badge> : null}
              {alternatives.length > 0 ? (
                <Badge tone="neutral">Alternatives: {alternatives.join(", ")}</Badge>
              ) : null}
            </div>

            <div className="mt-2 flex justify-end">
              <Button type="submit" variant="secondary" size="sm">
                Save correction
              </Button>
            </div>
          </form>
        );
      })}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string | number;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <Input name={name} type={type} defaultValue={defaultValue} className="h-8 text-xs" />
    </label>
  );
}
