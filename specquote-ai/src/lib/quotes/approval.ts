import type { ApprovalRuleType } from "@prisma/client";

export interface ApprovalTrigger {
  type: ApprovalRuleType;
  reason: string;
}

export interface ApprovalCheckInput {
  marginPercent: number;
  maxLineDiscountPercent: number;
  total: number;
  isNewClient: boolean;
  hasUnconfirmedTechnical: boolean;
  maxLeadTimeDays: number;
  org: {
    minMarginPercent: number;
    maxDiscountPercent: number;
    highValueThreshold: number;
  };
}

const UNUSUAL_LEAD_TIME_DAYS = 90;

/** Margin/discount/risk guardrails every quote passes through before it can be sent. Returns the list of triggered rules — empty means auto-clear, non-empty means the quote needs manager approval. */
export function evaluateApprovalRules(input: ApprovalCheckInput): ApprovalTrigger[] {
  const triggers: ApprovalTrigger[] = [];

  if (input.marginPercent < input.org.minMarginPercent) {
    triggers.push({
      type: "MIN_MARGIN",
      reason: `Margin ${input.marginPercent}% is below the minimum policy of ${input.org.minMarginPercent}%.`,
    });
  }

  if (input.maxLineDiscountPercent > input.org.maxDiscountPercent) {
    triggers.push({
      type: "MAX_DISCOUNT",
      reason: `A line item discount of ${input.maxLineDiscountPercent}% exceeds the ${input.org.maxDiscountPercent}% policy limit.`,
    });
  }

  if (input.total >= input.org.highValueThreshold) {
    triggers.push({
      type: "HIGH_VALUE",
      reason: `Quote value ${input.total.toLocaleString()} meets or exceeds the high-value review threshold of ${input.org.highValueThreshold.toLocaleString()}.`,
    });
  }

  if (input.isNewClient) {
    triggers.push({ type: "NEW_CLIENT", reason: "This account has no prior won quotes — first-order review." });
  }

  if (input.hasUnconfirmedTechnical) {
    triggers.push({
      type: "UNCONFIRMED_TECHNICAL",
      reason: "One or more line items are unmatched or need technical confirmation before pricing is final.",
    });
  }

  if (input.maxLeadTimeDays > UNUSUAL_LEAD_TIME_DAYS) {
    triggers.push({
      type: "UNUSUAL_LEAD_TIME",
      reason: `A line item lead time of ${input.maxLeadTimeDays} days is unusually long.`,
    });
  }

  return triggers;
}
