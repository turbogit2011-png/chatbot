import type { Plan } from "@prisma/client";

export interface PlanDefinition {
  id: Plan;
  name: string;
  priceEurPerMonth: number;
  priceSuffix?: string;
  seats: number;
  rfqsPerMonth: number;
  features: string[];
}

export const PLAN_DEFINITIONS: Record<Plan, PlanDefinition> = {
  TEAM: {
    id: "TEAM",
    name: "Team",
    priceEurPerMonth: 790,
    seats: 3,
    rfqsPerMonth: 500,
    features: ["Multimodal RFQ parsing", "Structured RFQ workspace", "Quote PDF generation", "Basic CRM"],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceEurPerMonth: 1990,
    seats: 10,
    rfqsPerMonth: 2000,
    features: [
      "Everything in Team",
      "Shared inbox",
      "Approval workflow",
      "CRM integrations",
      "Configurable margin rules",
    ],
  },
  SCALE: {
    id: "SCALE",
    name: "Scale",
    priceEurPerMonth: 3990,
    priceSuffix: "and up",
    seats: 999,
    rfqsPerMonth: 999999,
    features: ["Everything in Pro", "ERP connectors", "Custom workflows", "SSO", "SLA", "Multi-brand support"],
  },
};

export const PLAN_ORDER: Plan[] = ["TEAM", "PRO", "SCALE"];
