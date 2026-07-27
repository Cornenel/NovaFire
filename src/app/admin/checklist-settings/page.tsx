import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { CHECKLIST_VERSION, CHECKLIST_DISCLAIMER } from "@/lib/checklists/version";
import { ChecklistSettingsForm } from "@/components/admin/checklist-settings-form";

export default async function ChecklistSettingsPage() {
  if (!featureFlags.mandatoryAssetInspections) notFound();

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("inspection_checklist_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-1">
        Inspection checklist settings
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Active version: <span className="font-mono text-zinc-400">{CHECKLIST_VERSION}</span>
      </p>
      <p className="text-xs text-zinc-600 mb-6">{CHECKLIST_DISCLAIMER}</p>
      <ChecklistSettingsForm settings={settings} />
    </div>
  );
}
