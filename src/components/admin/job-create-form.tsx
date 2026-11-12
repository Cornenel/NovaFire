"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createJob,
  getCustomerSites,
  searchCustomers,
  type CustomerSearchOption,
  type CustomerSiteOption,
} from "@/app/admin/actions";
import { JOB_PRIORITY_LABELS, JOB_TYPE_LABELS } from "@/lib/fsm/labels";

interface TechnicianOption {
  id: string;
  full_name: string;
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";
const labelCls = "block text-xs text-zinc-400 mb-1.5";

export function JobCreateForm({
  technicians,
  defaultDate,
}: {
  technicians: TechnicianOption[];
  defaultDate: string;
}) {
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerSearchOption[]>(
    []
  );
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<CustomerSiteOption[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [isSearching, startSearch] = useTransition();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      startSearch(async () => {
        const results = await searchCustomers(customerQuery, 25);
        setCustomerResults(results);
      });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [customerQuery]);

  useEffect(() => {
    if (!customerId) {
      setSites([]);
      setSiteId("");
      return;
    }

    let cancelled = false;
    setSitesLoading(true);

    getCustomerSites(customerId)
      .then((nextSites) => {
        if (cancelled) return;
        setSites(nextSites);
        setSiteId((current) =>
          nextSites.some((site) => site.id === current) ? current : ""
        );
      })
      .finally(() => {
        if (!cancelled) setSitesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const selectedSite = sites.find((site) => site.id === siteId);

  return (
    <form action={createJob} className="space-y-4 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Customer *</label>
          <input type="hidden" name="customer_id" value={customerId} required />
          {customerId ? (
            <div className="flex items-center gap-2">
              <div className={`${inputCls} flex-1 truncate`}>{customerName}</div>
              <button
                type="button"
                onClick={() => {
                  setCustomerId("");
                  setCustomerName("");
                  setCustomerQuery("");
                  setSiteId("");
                }}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-zinc-400 hover:text-white"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="search"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Search customers…"
                className={inputCls}
                autoComplete="off"
              />
              <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
                {isSearching && (
                  <p className="px-3 py-2 text-xs text-zinc-500">Searching…</p>
                )}
                {!isSearching && customerResults.length === 0 && (
                  <p className="px-3 py-2 text-xs text-zinc-500">
                    {customerQuery
                      ? "No customers found."
                      : "Type to search customers."}
                  </p>
                )}
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCustomerId(c.id);
                      setCustomerName(c.name);
                      setCustomerQuery(c.name);
                      setSiteId("");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.04]"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Site *</label>
          <select
            name="site_id"
            required
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            onFocus={() => {
              if (!customerId || sitesLoading) return;
              getCustomerSites(customerId).then(setSites);
            }}
            className={inputCls}
            disabled={!customerId || sitesLoading}
          >
            <option value="">
              {!customerId
                ? "Choose customer first"
                : sitesLoading
                  ? "Loading sites…"
                  : sites.length === 0
                    ? "No sites yet — add one on the customer page"
                    : "Select site…"}
            </option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {customerId && !sitesLoading && sites.length === 0 ? (
            <p className="mt-1.5 text-xs text-amber-400/90">
              Add a site on the customer record, then reopen this dropdown.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Technician</label>
          <select name="assigned_to" className={inputCls}>
            <option value="">Unassigned</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Scheduled date *</label>
          <input
            type="date"
            name="scheduled_date"
            defaultValue={defaultDate}
            required
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Job type</label>
          <select name="job_type" defaultValue="annual_service" className={inputCls}>
            {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select name="priority" defaultValue="medium" className={inputCls}>
            {Object.entries(JOB_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Contact person</label>
          <input
            type="text"
            name="contact_person"
            key={`contact-person-${siteId}`}
            defaultValue={selectedSite?.contact_person ?? ""}
            placeholder="On-site contact"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Contact phone</label>
          <input
            type="tel"
            name="contact_phone"
            key={`contact-phone-${siteId}`}
            defaultValue={selectedSite?.contact_phone ?? ""}
            placeholder="+27 …"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Description / instructions</label>
        <textarea
          name="description"
          rows={3}
          placeholder="Work to be done, special instructions…"
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={!customerId}
        className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
      >
        Create Job
      </button>
    </form>
  );
}
