import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAssetTimeline,
  type HistoricalAsset,
  type HistoricalAssetEvent,
  type HistoricalDefect,
  type HistoricalInspection,
  type HistoricalPhoto,
} from "@/lib/fsm/historical-records";

export async function loadAssetTimelineData(
  supabase: SupabaseClient,
  assetId: string
) {
  const [
    { data: asset },
    { data: inspections },
    { data: defects },
    { data: events },
    { data: photos },
  ] = await Promise.all([
    supabase.from("assets").select("*").eq("id", assetId).single(),
    supabase
      .from("inspections")
      .select(
        "id, created_at, result, notes, requires_refill, requires_pressure_test, checklist, import_source, job_id, job:jobs(id, job_number, status, job_type, import_source, scheduled_date, completed_at)"
      )
      .eq("asset_id", assetId)
      .order("created_at", { ascending: true }),
    supabase
      .from("defects")
      .select(
        "id, created_at, updated_at, defect_type, severity, description, status, job_id, quote_group_id"
      )
      .eq("asset_id", assetId)
      .order("created_at", { ascending: true }),
    supabase
      .from("asset_events")
      .select("id, created_at, event_type, job_id, details")
      .eq("asset_id", assetId)
      .order("created_at", { ascending: true }),
    supabase
      .from("photos")
      .select("id, taken_at, stage, job_id")
      .eq("asset_id", assetId)
      .order("taken_at", { ascending: true }),
  ]);

  if (!asset) return null;

  const timeline = buildAssetTimeline({
    asset: asset as HistoricalAsset,
    inspections: (inspections ?? []) as HistoricalInspection[],
    defects: (defects ?? []) as HistoricalDefect[],
    events: (events ?? []) as HistoricalAssetEvent[],
    photos: (photos ?? []) as HistoricalPhoto[],
  });

  return {
    asset,
    timeline,
    inspections: inspections ?? [],
    defects: defects ?? [],
  };
}
