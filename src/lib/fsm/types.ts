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

export type FireRiskType =
  | "fire_hazard"
  | "blocked_exit"
  | "missing_signage"
  | "combustible_storage"
  | "electrical_risk"
  | "emergency_lighting_issue"
  | "evacuation_concern"
  | "access_obstruction"
  | "thatch_fire_spread_risk"
  | "other";

export type FireRiskSeverity = "low" | "medium" | "high" | "critical";

export type FireRiskStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "accepted_risk";

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
  /** Customer portal (migration 00010) */
  customer_id?: string | null;
  portal_site_id?: string | null;
  portal_access_enabled?: boolean;
  last_portal_login_at?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  trading_name?: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  billing_address?: string | null;
  vat_number?: string | null;
  registration_number?: string | null;
  physical_address?: string | null;
  notes?: string | null;
  status?: "active" | "inactive";
  is_sla_client: boolean;
  legacy_zoho_customer_id?: string | null;
  import_source?: string | null;
  import_raw_data?: Record<string, unknown> | null;
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
  /** Customer/client's legacy equipment number, separate from NovaFire asset_code */
  customer_asset_number?: string | null;
  serial_number: string | null;
  location_description: string | null;
  /** Fire extinguisher medium (DCP, CO2, Foam, etc.) – additive migration 00006 */
  asset_medium?: string | null;
  manufacture_date: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  last_pressure_test_date?: string | null;
  /** Phase 5 (additive, nullable) – hydro/pressure test due date */
  hydro_test_due_date?: string | null;
  calculated_compliance_status?: "COMPLIANT" | "NON_COMPLIANT" | "WARNING" | "UNKNOWN" | null;
  compliance_reasons?: string[] | null;
  compliance_next_actions?: string[] | null;
  compliance_source_fields?: string[] | null;
  compliance_calculated_at?: string | null;
  annual_service_due_date?: string | null;
  pressure_test_due_date?: string | null;
  import_raw_data?: Record<string, unknown> | null;
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
  service_category?: string | null;
  import_source?: string | null;
  legacy_zoho_jobcard_id?: string | null;
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

export interface FireRisk {
  id: string;
  customer_id: string;
  site_id: string;
  job_id: string | null;
  asset_id: string | null;
  technician_id: string | null;
  location_description: string | null;
  risk_type: FireRiskType;
  severity: FireRiskSeverity;
  description: string;
  recommended_action: string | null;
  status: FireRiskStatus;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}
