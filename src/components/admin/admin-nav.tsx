"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/jobs", label: "Jobs", exact: false },
  { href: "/admin/customers", label: "Customers", exact: false },
  { href: "/admin/defects", label: "Defects", exact: false },
  { href: "/admin/technicians", label: "Technicians", exact: false },
  { href: "/admin/stock", label: "Stock", exact: false },
  { href: "/admin/imports", label: "Imports", exact: false },
  // Phase 5 additions – flag-gated, removed entirely when disabled
  ...(featureFlags.complianceDashboard
    ? [{ href: "/admin/compliance", label: "Compliance", exact: false }]
    : []),
  ...(featureFlags.executiveDashboard
    ? [{ href: "/admin/executive", label: "Executive", exact: false }]
    : []),
  ...(featureFlags.fireRiskRegister
    ? [{ href: "/admin/fire-risks", label: "Fire Risks", exact: false }]
    : []),
  ...(featureFlags.quotePreparation
    ? [{ href: "/admin/quotes", label: "Quotes", exact: false }]
    : []),
  ...(featureFlags.mandatoryAssetInspections
    ? [{ href: "/admin/checklist-settings", label: "Checklists", exact: false }]
    : []),
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 min-w-max">
      {ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-red-500/10 text-white ring-1 ring-red-500/25"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
