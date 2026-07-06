export interface QuoteLineItemInput {
  quantity: number;
  unitCost: number;
  unitPrice: number;
  discountPercent: number;
}

export function computeLineTotal(li: QuoteLineItemInput): number {
  const gross = li.quantity * li.unitPrice;
  return Math.round(gross * (1 - li.discountPercent / 100) * 100) / 100;
}

export interface QuoteTotals {
  subtotal: number;
  discountTotal: number;
  totalCost: number;
  total: number;
  marginPercent: number;
}

export function computeQuoteTotals(lineItems: QuoteLineItemInput[]): QuoteTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let totalCost = 0;
  let total = 0;

  for (const li of lineItems) {
    const gross = li.quantity * li.unitPrice;
    const lineTotal = computeLineTotal(li);
    const cost = li.quantity * li.unitCost;

    subtotal += gross;
    discountTotal += gross - lineTotal;
    total += lineTotal;
    totalCost += cost;
  }

  const marginPercent = total > 0 ? Math.round(((total - totalCost) / total) * 1000) / 10 : 0;

  return {
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    totalCost: round2(totalCost),
    total: round2(total),
    marginPercent,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
