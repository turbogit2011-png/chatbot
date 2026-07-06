import type { UserRole } from "@prisma/client";

export type Permission =
  | "org.manage"
  | "users.manage"
  | "billing.manage"
  | "rfq.view"
  | "rfq.edit"
  | "rfq.assign"
  | "rfq.delete"
  | "quote.create"
  | "quote.edit"
  | "quote.approve"
  | "quote.send"
  | "catalog.manage"
  | "integrations.manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "org.manage",
    "users.manage",
    "billing.manage",
    "rfq.view",
    "rfq.edit",
    "rfq.assign",
    "rfq.delete",
    "quote.create",
    "quote.edit",
    "quote.approve",
    "quote.send",
    "catalog.manage",
    "integrations.manage",
  ],
  ADMIN: [
    "org.manage",
    "users.manage",
    "rfq.view",
    "rfq.edit",
    "rfq.assign",
    "rfq.delete",
    "quote.create",
    "quote.edit",
    "quote.approve",
    "quote.send",
    "catalog.manage",
    "integrations.manage",
  ],
  SALES_MANAGER: [
    "rfq.view",
    "rfq.edit",
    "rfq.assign",
    "quote.create",
    "quote.edit",
    "quote.approve",
    "quote.send",
    "catalog.manage",
  ],
  SALES_REP: ["rfq.view", "rfq.edit", "quote.create", "quote.edit", "quote.send"],
  ESTIMATOR: ["rfq.view", "rfq.edit", "quote.create", "quote.edit"],
  VIEWER: ["rfq.view"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new ForbiddenError(`Role ${role} lacks permission ${permission}`);
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  SALES_MANAGER: "Sales Manager",
  SALES_REP: "Sales Representative",
  ESTIMATOR: "Estimator",
  VIEWER: "Viewer",
};
