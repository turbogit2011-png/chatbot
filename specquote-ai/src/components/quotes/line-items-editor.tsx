import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateQuoteLineItemAction, deleteQuoteLineItemAction, addQuoteLineItemAction } from "@/lib/actions/quote";
import { formatMoney } from "@/lib/utils";
import type { QuoteLineItem } from "@prisma/client";

export function LineItemsEditor({
  quoteId,
  lineItems,
  currency,
  editable,
}: {
  quoteId: string;
  lineItems: QuoteLineItem[];
  currency: string;
  editable: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-gray-50 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2 w-20">Qty</th>
            <th className="px-3 py-2 w-20">Unit</th>
            <th className="px-3 py-2 w-24">Cost</th>
            <th className="px-3 py-2 w-24">Price</th>
            <th className="px-3 py-2 w-20">Disc %</th>
            <th className="px-3 py-2 w-20">Lead (d)</th>
            <th className="px-3 py-2 w-28 text-right">Total</th>
            <th className="px-3 py-2 w-24 text-right">Margin</th>
            {editable ? <th className="w-16" /> : null}
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li) => {
            const margin = li.unitPrice > 0 ? Math.round(((li.unitPrice - li.unitCost) / li.unitPrice) * 100) : 0;
            return editable ? (
              <tr key={li.id} className="border-b border-border last:border-0">
                <td className="px-2 py-1.5" colSpan={9}>
                  <form
                    action={updateQuoteLineItemAction.bind(null, li.id, quoteId)}
                    className="grid grid-cols-[1fr_72px_72px_88px_88px_72px_72px_100px_44px] items-center gap-1.5"
                  >
                    <Input name="description" defaultValue={li.description} className="h-8 text-xs" />
                    <Input name="quantity" type="number" step="1" defaultValue={li.quantity} className="h-8 text-xs" />
                    <Input name="unit" defaultValue={li.unit} className="h-8 text-xs" />
                    <Input name="unitCost" type="number" step="0.01" defaultValue={li.unitCost} className="h-8 text-xs" />
                    <Input name="unitPrice" type="number" step="0.01" defaultValue={li.unitPrice} className="h-8 text-xs" />
                    <Input
                      name="discountPercent"
                      type="number"
                      step="1"
                      defaultValue={li.discountPercent}
                      className="h-8 text-xs"
                    />
                    <Input name="leadTimeDays" type="number" step="1" defaultValue={li.leadTimeDays} className="h-8 text-xs" />
                    <div className="flex items-center justify-end gap-2 px-1">
                      <span className="text-xs font-medium tabular-nums text-gray-900">
                        {formatMoney(li.lineTotal, currency)}
                      </span>
                      <button type="submit" className="text-[11px] font-medium text-brand-600 hover:underline">
                        Save
                      </button>
                    </div>
                    <span
                      className={`text-right text-xs tabular-nums ${margin < 15 ? "font-medium text-red-600" : "text-gray-500"}`}
                    >
                      {margin}%
                    </span>
                  </form>
                </td>
                {editable ? (
                  <td className="px-2 py-1.5 text-right">
                    <form action={deleteQuoteLineItemAction.bind(null, li.id, quoteId)}>
                      <button type="submit" className="text-gray-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </td>
                ) : null}
              </tr>
            ) : (
              <tr key={li.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-gray-800">{li.description}</td>
                <td className="px-3 py-2 text-gray-600">
                  {li.quantity} {li.unit}
                </td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-gray-600">{formatMoney(li.unitPrice, currency)}</td>
                <td className="px-3 py-2 text-gray-600">{li.discountPercent}%</td>
                <td className="px-3 py-2 text-gray-600">{li.leadTimeDays}d</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">{formatMoney(li.lineTotal, currency)}</td>
                <td className="px-3 py-2 text-right text-gray-500">{margin}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {editable && (
        <form action={addQuoteLineItemAction.bind(null, quoteId)} className="border-t border-border px-3 py-2">
          <Button type="submit" variant="ghost" size="sm">
            + Add line item
          </Button>
        </form>
      )}
    </div>
  );
}
