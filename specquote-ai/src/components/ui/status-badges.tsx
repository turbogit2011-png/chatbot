import { Badge } from "./badge";
import { RFQ_STATUS_LABELS } from "@/lib/rfq/status";
import type { RfqStatus, QuoteStatus, RiskLevel } from "@prisma/client";

const RFQ_TONES: Record<RfqStatus, Parameters<typeof Badge>[0]["tone"]> = {
  NEW: "blue",
  PARSING: "purple",
  NEEDS_REVIEW: "amber",
  MISSING_INFORMATION: "red",
  READY_FOR_QUOTE: "green",
  AWAITING_APPROVAL: "amber",
  SENT: "brand",
  WON: "green",
  LOST: "neutral",
  ARCHIVED: "slate",
};

export function RfqStatusBadge({ status }: { status: RfqStatus }) {
  return <Badge tone={RFQ_TONES[status]}>{RFQ_STATUS_LABELS[status]}</Badge>;
}

const QUOTE_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  NEEDS_APPROVAL: "Needs Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SENT: "Sent",
  WON: "Won",
  LOST: "Lost",
};

const QUOTE_TONES: Record<QuoteStatus, Parameters<typeof Badge>[0]["tone"]> = {
  DRAFT: "neutral",
  NEEDS_APPROVAL: "amber",
  APPROVED: "green",
  REJECTED: "red",
  SENT: "brand",
  WON: "green",
  LOST: "slate",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge tone={QUOTE_TONES[status]}>{QUOTE_LABELS[status]}</Badge>;
}

const RISK_TONES: Record<RiskLevel, Parameters<typeof Badge>[0]["tone"]> = {
  LOW: "green",
  MEDIUM: "amber",
  HIGH: "red",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge tone={RISK_TONES[level]}>{level === "LOW" ? "Low risk" : level === "MEDIUM" ? "Medium risk" : "High risk"}</Badge>;
}

export function ConfidenceChip({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 80 ? "green" : pct >= 55 ? "amber" : "red";
  return <Badge tone={tone}>{pct}% confidence</Badge>;
}
