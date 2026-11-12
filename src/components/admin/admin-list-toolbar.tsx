import { Search } from "lucide-react";

const inputCls =
  "w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";

/**
 * Server-friendly GET search form. Resets to page 1 on submit.
 * Pass `hidden` to preserve other query params (e.g. status filters).
 */
export function AdminListToolbar({
  action,
  q,
  placeholder = "Search…",
  hidden,
}: {
  action: string;
  q?: string;
  placeholder?: string;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} method="get" className="mb-4">
      {hidden &&
        Object.entries(hidden).map(([key, value]) =>
          value ? (
            <input key={key} type="hidden" name={key} value={value} />
          ) : null
        )}
      <input type="hidden" name="page" value="1" />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={placeholder}
          className={inputCls}
          autoComplete="off"
        />
      </div>
    </form>
  );
}
