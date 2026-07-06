import type { RfqStatus, RiskLevel } from "@prisma/client";

/** Allowed forward/backward transitions for the RFQ status machine. Anything not listed is rejected. */
const TRANSITIONS: Record<RfqStatus, RfqStatus[]> = {
  NEW: ["PARSING", "ARCHIVED"],
  PARSING: ["NEEDS_REVIEW", "MISSING_INFORMATION", "READY_FOR_QUOTE", "ARCHIVED"],
  NEEDS_REVIEW: ["MISSING_INFORMATION", "READY_FOR_QUOTE", "ARCHIVED"],
  MISSING_INFORMATION: ["NEEDS_REVIEW", "READY_FOR_QUOTE", "ARCHIVED"],
  READY_FOR_QUOTE: ["AWAITING_APPROVAL", "MISSING_INFORMATION", "SENT", "ARCHIVED"],
  AWAITING_APPROVAL: ["READY_FOR_QUOTE", "SENT", "ARCHIVED"],
  SENT: ["WON", "LOST", "ARCHIVED"],
  WON: ["ARCHIVED"],
  LOST: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: RfqStatus, to: RfqStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const RFQ_STATUS_LABELS: Record<RfqStatus, string> = {
  NEW: "New",
  PARSING: "Parsing",
  NEEDS_REVIEW: "Needs Review",
  MISSING_INFORMATION: "Missing Information",
  READY_FOR_QUOTE: "Ready for Quote",
  AWAITING_APPROVAL: "Awaiting Approval",
  SENT: "Sent",
  WON: "Won",
  LOST: "Lost",
  ARCHIVED: "Archived",
};

interface CompletenessInput {
  headerFieldCount: number;
  headerFieldsExpected: number;
  lineItemsMissingCriticalCount: number;
  totalLineItems: number;
  openMissingInfoCount: number;
}

export function computeCompleteness(input: CompletenessInput): number {
  if (input.totalLineItems === 0) return 0;
  const headerScore = input.headerFieldsExpected === 0 ? 1 : input.headerFieldCount / input.headerFieldsExpected;
  const lineItemScore = 1 - input.lineItemsMissingCriticalCount / Math.max(1, input.totalLineItems);
  const missingPenalty = Math.max(0, 1 - input.openMissingInfoCount * 0.12);
  const score = headerScore * 0.3 + lineItemScore * 0.5 + missingPenalty * 0.2;
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

interface RiskInput {
  completeness: number;
  estimatedValue: number | null | undefined;
  isNewClient: boolean;
  hasUnconfirmedCertifications: boolean;
  highValueThreshold: number;
}

export function computeRiskLevel(input: RiskInput): RiskLevel {
  let score = 0;
  if (input.completeness < 50) score += 2;
  else if (input.completeness < 80) score += 1;

  if (input.isNewClient) score += 1;
  if (input.hasUnconfirmedCertifications) score += 1;
  if ((input.estimatedValue ?? 0) >= input.highValueThreshold) score += 1;

  if (score >= 3) return "HIGH";
  if (score >= 1) return "MEDIUM";
  return "LOW";
}
