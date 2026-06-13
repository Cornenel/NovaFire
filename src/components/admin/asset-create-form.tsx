"use client";

import { useState } from "react";
import { createAsset } from "@/app/admin/actions";
import {
  FIRE_EXTINGUISHER_CAPACITIES,
  FIRE_EXTINGUISHER_MEDIUMS,
  MAIN_ASSET_TYPE_LABELS,
} from "@/lib/fsm/labels";
import { featureFlags } from "@/lib/fsm/feature-flags";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";
const labelCls = "block text-xs text-zinc-400 mb-1.5";

export function AssetCreateForm({ siteId }: { siteId: string }) {
  const [assetType, setAssetType] = useState("fire_extinguisher");
  const isExtinguisher = assetType === "fire_extinguisher";

  return (
    <form
      action={createAsset}
      className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-3"
    >
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
            <select name="asset_medium" required className={inputCls}>
              <option value="">Select medium</option>
              {FIRE_EXTINGUISHER_MEDIUMS.map((medium) => (
                <option key={medium} value={medium}>
                  {medium}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Capacity *</label>
            <select name="size_capacity" required className={inputCls}>
              <option value="">Select capacity</option>
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
        name="customer_asset_number"
        placeholder="Customer Asset Number / Client Equipment Number (optional)"
        className={inputCls}
      />
      <input name="serial_number" placeholder="Serial number" className={inputCls} />
      <input
        name="location_description"
        placeholder={isExtinguisher ? "Location on site *" : "Location on site"}
        required={isExtinguisher}
        className={inputCls}
      />
      <div>
        <label className={labelCls}>Last service date</label>
        <input type="date" name="last_service_date" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Next service date</label>
        <input type="date" name="next_service_date" className={inputCls} />
      </div>
      {featureFlags.assetInsights && (
        <div>
          <label className={labelCls}>Hydro test due date (optional)</label>
          <input type="date" name="hydro_test_due_date" className={inputCls} />
        </div>
      )}
      <button
        type="submit"
        className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
      >
        Add Asset
      </button>
      <p className="text-[10px] text-zinc-600">
        An asset ID and QR code are generated automatically.
      </p>
    </form>
  );
}
