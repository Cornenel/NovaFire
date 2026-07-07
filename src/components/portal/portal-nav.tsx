"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/client-portal", label: "Overview", exact: true },
  { href: "/client-portal/sites", label: "Sites", exact: false },
  { href: "/client-portal/assets", label: "Assets", exact: false },
  { href: "/client-portal/compliance", label: "Compliance", exact: false },
  { href: "/client-portal/reports", label: "Reports", exact: false },
  { href: "/client-portal/defects", label: "Defects", exact: false },
  ...(featureFlags.fireRiskRegister
    ? [{ href: "/client-portal/risks", label: "Fire Risks", exact: false }]
    : []),
  ...(featureFlags.quotePreparation
    ? [{ href: "/client-portal/quotes", label: "Quotes", exact: false }]
    : []),
  { href: "/client-portal/profile", label: "Profile", exact: false },
];

export function PortalNav() {
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
                ? "text-white bg-white/[0.07]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
