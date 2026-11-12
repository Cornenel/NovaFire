"use client";

import { useEffect, useState, useTransition } from "react";
import {
  searchCustomers,
  type CustomerSearchOption,
} from "@/app/admin/actions";

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-[#171717] border border-white/10 text-white text-sm placeholder-zinc-600 focus:border-red-500/50 focus:outline-none";

/**
 * Searchable customer picker for Zoho review linking.
 * Writes the chosen id into a hidden `customer_id` field for the parent form.
 */
export function ZohoCustomerLinkPicker({
  initialCandidates,
}: {
  initialCandidates: Array<{
    customerId: string;
    customerName?: string;
    reason: string;
    score?: number;
  }>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchOption[]>([]);
  const [selectedId, setSelectedId] = useState(
    initialCandidates[0]?.customerId ?? ""
  );
  const [isSearching, startSearch] = useTransition();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      startSearch(async () => {
        setResults(await searchCustomers(query, 12));
      });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query]);

  return (
    <div className="space-y-2">
      <input type="hidden" name="customer_id" value={selectedId} />

      {initialCandidates.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Suggested matches
          </p>
          {initialCandidates.map((candidate) => (
            <label
              key={candidate.customerId}
              className="flex items-start gap-2 text-xs text-zinc-300"
            >
              <input
                type="radio"
                name="customer_pick"
                value={candidate.customerId}
                checked={selectedId === candidate.customerId}
                onChange={() => setSelectedId(candidate.customerId)}
                className="mt-0.5 accent-red-600"
              />
              <span>
                <span className="text-white">
                  {candidate.customerName ?? candidate.customerId}
                </span>
                <span className="text-zinc-500">
                  {" "}
                  · {candidate.reason}
                  {typeof candidate.score === "number"
                    ? ` · ${Math.round(candidate.score * 100)}%`
                    : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      <div>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">
          Search Nova Fire customers
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a customer name…"
          className={inputCls}
          autoComplete="off"
        />
        {(query.trim() || isSearching) && (
          <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
            {isSearching && (
              <p className="px-3 py-2 text-xs text-zinc-500">Searching…</p>
            )}
            {!isSearching && results.length === 0 && (
              <p className="px-3 py-2 text-xs text-zinc-500">No customers found.</p>
            )}
            {results.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => {
                  setSelectedId(customer.id);
                  setQuery(customer.name);
                }}
                className={`block w-full px-3 py-2 text-left text-xs hover:bg-white/[0.04] ${
                  selectedId === customer.id ? "text-sky-300" : "text-zinc-200"
                }`}
              >
                {customer.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
