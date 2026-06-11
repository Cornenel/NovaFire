"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, QrCode, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/tech", label: "Today", icon: Home, exact: true },
  { href: "/tech/jobs", label: "Jobs", icon: ClipboardList, exact: false },
  { href: "/tech/scan", label: "Scan", icon: QrCode, exact: false },
  { href: "/tech/stock", label: "Stock", icon: Package, exact: false },
];

export function TechBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.08] bg-[#0c0c0c]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors",
                isActive ? "text-red-500" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
