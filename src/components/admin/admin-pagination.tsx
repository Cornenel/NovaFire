import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildAdminListHref,
  totalPages,
} from "@/lib/admin/list-params";
import { cn } from "@/lib/utils";

export function AdminPagination({
  pathname,
  page,
  pageSize,
  totalCount,
  params,
}: {
  pathname: string;
  page: number;
  pageSize: number;
  totalCount: number;
  params?: Record<string, string | undefined | null>;
}) {
  const pages = totalPages(totalCount, pageSize);
  const safePage = Math.min(Math.max(page, 1), pages);
  const from = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalCount);
  const baseParams = {
    ...(params ?? {}),
    q: params?.q || undefined,
  };

  if (totalCount === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-zinc-500">
        Showing {from}–{to} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={buildAdminListHref(pathname, baseParams, {
            page: safePage > 1 ? safePage - 1 : undefined,
          })}
          aria-disabled={safePage <= 1}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-colors",
            safePage <= 1
              ? "pointer-events-none border-white/5 text-zinc-600"
              : "border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </Link>
        <span className="text-xs text-zinc-500">
          Page {safePage} of {pages}
        </span>
        <Link
          href={buildAdminListHref(pathname, baseParams, {
            page: safePage < pages ? safePage + 1 : undefined,
          })}
          aria-disabled={safePage >= pages}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-colors",
            safePage >= pages
              ? "pointer-events-none border-white/5 text-zinc-600"
              : "border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
          )}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
