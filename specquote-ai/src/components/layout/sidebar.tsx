"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  LayoutDashboard,
  FileText,
  Package,
  Building2,
  Settings,
  ChevronsLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can, type Permission } from "@/lib/security/rbac";
import type { UserRole } from "@prisma/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { href: "/inbox", label: "RFQ Inbox", icon: Inbox, permission: "rfq.view" as Permission },
  { href: "/quotes", label: "Quotes", icon: FileText, permission: "rfq.view" as Permission },
  { href: "/catalog", label: "Catalog", icon: Package, permission: "rfq.view" as Permission },
  { href: "/crm", label: "CRM", icon: Building2, permission: "rfq.view" as Permission },
];

export function Sidebar({
  orgName,
  role,
  plan,
}: {
  orgName: string;
  role: UserRole;
  plan: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-graphite-950 text-graphite-400">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
          S
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{orgName}</p>
          <p className="text-[11px] uppercase tracking-wide text-graphite-500">{plan} plan</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 px-2">
        {NAV.filter((item) => !item.permission || can(role, item.permission)).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active ? "bg-graphite-800 text-white" : "hover:bg-graphite-900 hover:text-white",
              )}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 px-2 pb-4">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
            pathname.startsWith("/settings") ? "bg-graphite-800 text-white" : "hover:bg-graphite-900 hover:text-white",
          )}
        >
          <Settings size={16} strokeWidth={2} />
          Settings
        </Link>
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-graphite-500">
          <ChevronsLeft size={16} strokeWidth={2} />
          v0.1.0 MVP
        </div>
      </div>
    </aside>
  );
}
