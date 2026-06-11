"use client";

import { useState } from "react";
import { createJob } from "@/app/admin/actions";
import { JOB_PRIORITY_LABELS, JOB_TYPE_LABELS } from "@/lib/fsm/labels";

interface CustomerOption {
  id: string;
  name: string;
  sites: Array<{ id: string; name: string; contact_person: string | null; contact_phone: string | null }>;
}

interface TechnicianOption {
  id: string;
  full_name: string;
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";
const labelCls = "block text-xs text-zinc-400 mb-1.5";

export function JobCreateForm({
  customers,
  technicians,
  defaultDate,
}: {
  customers: CustomerOption[];
  technicians: TechnicianOption[];
  defaultDate: string;
}) {
  const [customerId, setCustomerId] = useState("");
  const customer = customers.find((c) => c.id === customerId);
  const sites = customer?.sites ?? [];

  return (
    <form action={createJob} className="space-y-4 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Customer *</label>
          <select
            name="customer_id"
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className={inputCls}
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Site *</label>
          <select name="site_id" required className={inputCls} disabled={!customerId}>
            <option value="">
              {customerId ? "Select site…" : "Choose customer first"}
            </option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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
            placeholder="On-site contact"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Contact phone</label>
          <input
            type="tel"
            name="contact_phone"
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
        className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
      >
        Create Job
      </button>
    </form>
  );
}
