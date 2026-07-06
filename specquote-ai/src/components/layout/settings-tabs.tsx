"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings", label: "Organization" },
  { href: "/settings/users", label: "Users & roles" },
  { href: "/settings/billing", label: "Billing & usage" },
  { href: "/settings/integrations", label: "Integrations" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b border-border">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              active ? "border-brand-600 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
