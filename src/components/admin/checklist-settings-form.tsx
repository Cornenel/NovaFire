"use client";

import { useActionState } from "react";
import { updateChecklistSettings, type SettingsActionState } from "@/app/admin/checklist-settings-actions";

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-[#171717] border border-white/10 text-white text-sm";

export function ChecklistSettingsForm({
  settings,
}: {
  settings: {
    id: string;
    photos_required_for_all_failures: boolean;
    customer_acknowledgement_required: boolean;
    detailed_annexure_enabled: boolean;
    allow_unable_to_test: boolean;
    pressure_unit: string;
    flow_unit: string;
    asset_types_requiring_checklist: string[];
  } | null;
}) {
  const [state, action, pending] = useActionState(updateChecklistSettings, {
    ok: false,
  } satisfies SettingsActionState);

  const s = settings ?? {
    id: "00000000-0000-4000-8000-000000000001",
    photos_required_for_all_failures: true,
    customer_acknowledgement_required: false,
    detailed_annexure_enabled: false,
    allow_unable_to_test: true,
    pressure_unit: "kPa",
    flow_unit: "L/min",
    asset_types_requiring_checklist: [
      "fire_extinguisher",
      "hose_reel",
      "hydrant",
      "signage",
    ],
  };

  return (
    <form action={action} className="space-y-4 rounded-xl border border-white/[0.08] nf-glass-panel p-5">
      <input type="hidden" name="settings_id" value={s.id} />
      <label className="flex items-center justify-between gap-3 text-sm text-zinc-300">
        Photos required for all failures
        <input
          type="checkbox"
          name="photos_required_for_all_failures"
          defaultChecked={s.photos_required_for_all_failures}
          className="w-5 h-5 accent-red-600"
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm text-zinc-300">
        Customer acknowledgement required
        <input
          type="checkbox"
          name="customer_acknowledgement_required"
          defaultChecked={s.customer_acknowledgement_required}
          className="w-5 h-5 accent-red-600"
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm text-zinc-300">
        Detailed annexure on reports
        <input
          type="checkbox"
          name="detailed_annexure_enabled"
          defaultChecked={s.detailed_annexure_enabled}
          className="w-5 h-5 accent-red-600"
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm text-zinc-300">
        Allow &quot;Unable to test&quot;
        <input
          type="checkbox"
          name="allow_unable_to_test"
          defaultChecked={s.allow_unable_to_test}
          className="w-5 h-5 accent-red-600"
        />
      </label>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Pressure unit</label>
        <input name="pressure_unit" defaultValue={s.pressure_unit} className={inputCls} />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Flow unit</label>
        <input name="flow_unit" defaultValue={s.flow_unit} className={inputCls} />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">
          Asset types requiring checklist (comma-separated)
        </label>
        <input
          name="asset_types_requiring_checklist"
          defaultValue={s.asset_types_requiring_checklist.join(", ")}
          className={inputCls}
        />
      </div>
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-emerald-400">Settings saved.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
