/**
 * Field Service Management – domain types mirroring the Supabase schema
 * (supabase/migrations/00001_field_service_schema.sql)
 */

export type UserRole = "client" | "technician" | "dispatcher" | "admin";

export type JobStatus =
  | "not_started"
  | "travelling"
  | "on_site"
  | "completed"
  | "awaiting_parts"
  | "cancelled";

export type JobPriority = "low" | "medium" | "high" | "emergency";

export type JobType =
  | "annual_service"
  | "inspection"
  | "installation"
  | "repair"
  | "callout"
  | "refill"
  | "pressure_test";

export type AssetType =
  | "fire_extinguisher"
  | "hose_reel"
  | "hydrant"
  | "fire_blanket"
  | "signage"
  | "fire_detection"
  | "co2_unit"
  | "dcp_unit";

export type AssetStatus =
  | "compliant"
  | "defective"
  | "removed"
  | "replaced"
  | "missing";

export type DefectSeverity = "low" | "medium" | "high" | "critical";

export type DefectStatus =
  | "open"
  | "quote_sent"
  | "in_progress"
  | "resolved"
  | "closed";

export type InspectionResult = "pass" | "fail";

export type PhotoStage = "before" | "after" | "general" | "defect";

export type AssetEventType =
  | "installed"
  | "inspected"
  | "defect_reported"
  | "refilled"
  | "replaced"
  | "removed"
  | "marked_missing"
  | "status_changed"
  | "serviced";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  /** Technician management (additive, nullable – migration 00004) */
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  vehicle_number?: string | null;
  saqcc_number?: string | null;
  photo_url?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  is_sla_client: boolean;
}

export interface Site {
  id: string;
  customer_id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  contact_person: string | null;
  contact_phone: string | null;
  access_notes: string | null;
}

export interface Asset {
  id: string;
  site_id: string;
  asset_code: string;
  qr_token: string;
  asset_type: AssetType;
  size_capacity: string | null;
  serial_number: string | null;
  location_description: string | null;
  manufacture_date: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  /** Phase 5 (additive, nullable) – hydro/pressure test due date */
  hydro_test_due_date?: string | null;
  status: AssetStatus;
  notes: string | null;
}

export interface Job {
  id: string;
  job_number: string;
  customer_id: string;
  site_id: string;
  assigned_to: string | null;
  job_type: JobType;
  priority: JobPriority;
  status: JobStatus;
  scheduled_date: string;
  description: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  travel_started_at: string | null;
  checked_in_at: string | null;
  checkin_latitude: number | null;
  checkin_longitude: number | null;
  completed_at: string | null;
}

export interface JobWithRelations extends Job {
  customer: Customer;
  site: Site;
}

export interface Inspection {
  id: string;
  job_id: string;
  asset_id: string;
  technician_id: string;
  asset_type: AssetType;
  checklist: Record<string, boolean | string>;
  result: InspectionResult;
  requires_refill: boolean;
  requires_pressure_test: boolean;
  notes: string | null;
  created_at: string;
}

export interface Defect {
  id: string;
  job_id: string;
  asset_id: string;
  technician_id: string;
  defect_type: string;
  severity: DefectSeverity;
  description: string;
  recommended_action: string | null;
  quote_required: boolean;
  status: DefectStatus;
  created_at: string;
}

export interface AssetEvent {
  id: string;
  asset_id: string;
  job_id: string | null;
  technician_id: string | null;
  event_type: AssetEventType;
  details: Record<string, unknown>;
  created_at: string;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  unit: string;
}

export interface VanStockRow {
  technician_id: string;
  stock_item_id: string;
  quantity: number;
  stock_item: StockItem;
}
