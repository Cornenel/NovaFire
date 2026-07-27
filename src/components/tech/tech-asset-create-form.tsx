"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createAssetFromJob, type TechActionState } from "@/app/tech/actions";
import {
  FIRE_EXTINGUISHER_CAPACITIES,
  FIRE_EXTINGUISHER_MEDIUMS,
  MAIN_ASSET_TYPE_LABELS,
} from "@/lib/fsm/labels";

const initialState: TechActionState = { ok: false };

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";
const labelCls = "block text-xs text-zinc-400 mb-1.5";

export function TechAssetCreateForm({
  jobId,
  siteId,
  defaultOpen = false,
}: {
  jobId: string;
  siteId: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [assetType, setAssetType] = useState("fire_extinguisher");
  const [state, action, pending] = useActionState(createAssetFromJob, initialState);
  const isExtinguisher = assetType === "fire_extinguisher";

  return (
    <div className="rounded-xl border border-white/[0.08] nf-glass-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-white">Add equipment on site</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Register an extinguisher, reel, or other item you find during the visit.
          </p>
        </div>
        <span className="text-xs font-mono text-red-400">{open ? "Hide" : "Add"}</span>
      </button>

      {open ? (
        <form action={action} className="border-t border-white/5 p-4 space-y-3">
          <input type="hidden" name="job_id" value={jobId} />
          <input type="hidden" name="site_id" value={siteId} />

          <div>
            <label className={labelCls}>Type *</label>
            <select
              name="asset_type"
              required
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className={inputCls}
            >
              {Object.entries(MAIN_ASSET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {isExtinguisher ? (
            <>
              <div>
                <label className={labelCls}>Medium *</label>
                <select name="asset_medium" required className={inputCls} defaultValue="">
                  <option value="" disabled>
                    Select medium
                  </option>
                  {FIRE_EXTINGUISHER_MEDIUMS.map((medium) => (
                    <option key={medium} value={medium}>
                      {medium}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Capacity *</label>
                <select name="size_capacity" required className={inputCls} defaultValue="">
                  <option value="" disabled>
                    Select capacity
                  </option>
                  {FIRE_EXTINGUISHER_CAPACITIES.map((capacity) => (
                    <option key={capacity} value={capacity}>
                      {capacity}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <input
              name="size_capacity"
              placeholder="Size / capacity (optional)"
              className={inputCls}
            />
          )}

          <input
            name="location_description"
            placeholder={isExtinguisher ? "Location on site *" : "Location on site"}
            required={isExtinguisher}
            className={inputCls}
          />
          <input
            name="customer_asset_number"
            placeholder="Customer asset number (optional)"
            className={inputCls}
          />
          <input name="serial_number" placeholder="Serial number (optional)" className={inputCls} />

          {state.error ? (
            <p className="text-sm text-red-400" role="alert">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save & add to job register"}
          </button>
          <p className="text-[10px] text-zinc-600 text-center">
            Asset ID and QR code are generated automatically.
          </p>
        </form>
      ) : null}
    </div>
  );
}
