"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ZOHO_IMPORT_SOURCE,
  jobTypeForImportedEquipment,
  normalizeEmail,
  normalizePhone,
  normalizeText,
  parseZohoJobcardCsv,
  type ZohoMappedEquipment,
  type ZohoParseResult,
  type ZohoWarning,
} from "@/lib/imports/zoho-jobcard";

export interface ZohoImportActionState {
  ok: boolean;
  error?: string;
  filename?: string;
  preview?: ZohoParseResult;
  result?: ImportResult;
}

interface ImportResult {
  sessionId: string;
  customersCreated: number;
  customersMatched: number;
  jobsCreated: number;
  jobsMatched: number;
  assetsCreated: number;
  assetsMatched: number;
  inspectionsCreated: number;
  defectsCreated: number;
  skippedRows: number;
  warningRows: number;
  duplicateRows: number;
}

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type SiteRow = {
  id: string;
  customer_id: string;
  name: string;
  address: string;
  access_notes: string | null;
};

type AssetRow = {
  id: string;
  site_id: string;
  asset_type: string;
  size_capacity: string | null;
  asset_medium?: string | null;
  location_description: string | null;
  legacy_description?: string | null;
  import_idempotency_key?: string | null;
};

type TechRow = {
  id: string;
  full_name: string;
  saqcc_number?: string | null;
  is_active: boolean;
};

async function requireDispatcher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !profile.is_active ||
    !["dispatcher", "admin"].includes(profile.role)
  ) {
    throw new Error("You do not have permission to import Zoho jobcards.");
  }

  return user;
}

export async function previewZohoJobcardImport(
  _prevState: ZohoImportActionState,
  formData: FormData
): Promise<ZohoImportActionState> {
  try {
    await requireDispatcher();
    const file = formData.get("csv");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Upload a Zoho Jobcard CSV file first." };
    }

    const text = await file.text();
    const preview = parseZohoJobcardCsv(text);
    return { ok: true, filename: file.name, preview };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not preview CSV.",
    };
  }
}

export async function confirmZohoJobcardImport(
  _prevState: ZohoImportActionState,
  formData: FormData
): Promise<ZohoImportActionState> {
  let sessionId: string | null = null;

  try {
    const user = await requireDispatcher();
    const admin = createAdminClient();
    const payload = formData.get("payload");
    const filename = String(formData.get("filename") ?? "zoho-jobcard.csv");

    if (typeof payload !== "string" || !payload) {
      return { ok: false, error: "Missing validated import preview." };
    }

    const preview = JSON.parse(payload) as ZohoParseResult;
    if (!preview.equipment?.length) {
      return { ok: false, error: "No importable equipment rows found." };
    }

    const { data: session, error: sessionError } = await admin
      .from("import_sessions")
      .insert({
        import_type: "zoho_jobcard",
        filename,
        mode: "create_only",
        status: "importing",
        total_rows: preview.totalCsvRows,
        valid_rows: preview.equipment.length,
        skipped_rows: preview.skippedRows,
        warning_rows: preview.warningRows,
        duplicate_rows: preview.duplicateRows,
        created_by: user.id,
        summary: preview.summary,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      throw new Error(sessionError?.message ?? "Could not create import session.");
    }
    const sessionIdValue = session.id as string;
    sessionId = sessionIdValue;

    const context = await loadImportContext(admin);
    const result: ImportResult = {
      sessionId: sessionIdValue,
      customersCreated: 0,
      customersMatched: 0,
      jobsCreated: 0,
      jobsMatched: 0,
      assetsCreated: 0,
      assetsMatched: 0,
      inspectionsCreated: 0,
      defectsCreated: 0,
      skippedRows: preview.skippedRows,
      warningRows: preview.warningRows,
      duplicateRows: preview.duplicateRows,
    };

    const byJob = groupByJob(preview.equipment);
    const jobCache = new Map<string, string>();

    for (const [legacyJobId, equipment] of byJob) {
      const first = equipment[0];
      const customer = await findOrCreateCustomer(admin, context, first, result);
      const site = await findOrCreateSite(admin, context, customer.id, first);
      const technician = matchTechnician(context.technicians, first);
      const jobId = await findOrCreateJob(
        admin,
        legacyJobId,
        equipment,
        customer.id,
        site.id,
        technician?.id ?? null,
        user.id,
        result
      );
      jobCache.set(legacyJobId, jobId);

      for (const item of equipment) {
        const importWarnings = warningsToJson(item.warnings);
        const asset = await findOrCreateAsset(admin, context, site.id, item, result);
        const fallbackTechnicianId = technician?.id ?? user.id;
        const duplicateInspection = await rowExists(
          admin,
          "inspections",
          item.idempotencyKey
        );

        let inspectionId: string | null = null;
        if (duplicateInspection) {
          result.duplicateRows++;
        } else {
          const { data: inspection, error } = await admin
            .from("inspections")
            .insert({
              job_id: jobId,
              asset_id: asset.id,
              technician_id: fallbackTechnicianId,
              asset_type: item.inspection.assetType,
              checklist: item.inspection.checklist,
              result: item.inspection.result,
              requires_refill: item.inspection.requiresRefill,
              requires_pressure_test: item.inspection.requiresPressureTest,
              notes: item.inspection.notes,
              legacy_zoho_jobcard_id: item.legacyZohoJobcardId,
              import_source: ZOHO_IMPORT_SOURCE,
              import_raw_data: item.rawRow,
              import_warnings: importWarnings,
              import_idempotency_key: item.idempotencyKey,
              csv_row_number: item.csvRowNumber,
              site_id: site.id,
              customer_id: customer.id,
            })
            .select("id")
            .single();

          if (error || !inspection) throw new Error(error?.message ?? "Inspection import failed.");
          inspectionId = inspection.id;
          result.inspectionsCreated++;
        }

        let defectId: string | null = null;
        if (item.defect?.shouldCreate) {
          const defectKey = `${item.idempotencyKey}|defect`;
          const duplicateDefect = await rowExists(admin, "defects", defectKey);
          if (!duplicateDefect) {
            const { data: defect, error } = await admin
              .from("defects")
              .insert({
                job_id: jobId,
                asset_id: asset.id,
                technician_id: fallbackTechnicianId,
                defect_type: "Zoho Import Finding",
                severity: item.defect.severity,
                description: item.defect.description,
                recommended_action: item.defect.recommendedAction,
                quote_required: true,
                status: "open",
                legacy_zoho_jobcard_id: item.legacyZohoJobcardId,
                import_source: ZOHO_IMPORT_SOURCE,
                import_raw_data: item.rawRow,
                import_warnings: importWarnings,
                import_idempotency_key: defectKey,
                csv_row_number: item.csvRowNumber,
              })
              .select("id")
              .single();

            if (error || !defect) throw new Error(error?.message ?? "Defect import failed.");
            defectId = defect.id;
            result.defectsCreated++;
          }
        }

        await admin.from("import_rows").insert({
          session_id: sessionIdValue,
          import_type: "zoho_jobcard",
          csv_row_number: item.csvRowNumber,
          legacy_zoho_jobcard_id: item.legacyZohoJobcardId,
          equipment_section: item.section,
          idempotency_key: item.idempotencyKey,
          status: duplicateInspection ? "duplicate" : item.warnings.length ? "warning" : "imported",
          raw_data: item.rawRow,
          mapped_data: item,
          import_warnings: importWarnings,
          customer_id: customer.id,
          site_id: site.id,
          job_id: jobId,
          asset_id: asset.id,
          inspection_id: inspectionId,
          defect_id: defectId,
        });
      }
    }

    await admin
      .from("import_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        summary: result,
        duplicate_rows: result.duplicateRows,
        warning_rows: result.warningRows,
      })
      .eq("id", sessionIdValue);

    return { ok: true, filename, preview, result };
  } catch (error) {
    if (sessionId) {
      try {
        const admin = createAdminClient();
        await admin
          .from("import_sessions")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message:
              error instanceof Error ? error.message : "Unknown import error",
          })
          .eq("id", sessionId);
      } catch {
        // Keep the original import error for the UI.
      }
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not import CSV.",
    };
  }
}

async function loadImportContext(admin: ReturnType<typeof createAdminClient>) {
  const [{ data: customers }, { data: sites }, { data: assets }, { data: technicians }] =
    await Promise.all([
      admin.from("customers").select("id, name, email, phone"),
      admin.from("sites").select("id, customer_id, name, address, access_notes"),
      admin.from("assets").select(
        "id, site_id, asset_type, size_capacity, asset_medium, location_description, legacy_description, import_idempotency_key"
      ),
      admin
        .from("profiles")
        .select("id, full_name, saqcc_number, is_active")
        .in("role", ["technician", "dispatcher", "admin"]),
    ]);

  return {
    customers: (customers ?? []) as CustomerRow[],
    sites: (sites ?? []) as SiteRow[],
    assets: (assets ?? []) as AssetRow[],
    technicians: (technicians ?? []) as TechRow[],
  };
}

function groupByJob(equipment: ZohoMappedEquipment[]) {
  const map = new Map<string, ZohoMappedEquipment[]>();
  for (const item of equipment) {
    const list = map.get(item.legacyZohoJobcardId) ?? [];
    list.push(item);
    map.set(item.legacyZohoJobcardId, list);
  }
  return map;
}

async function findOrCreateCustomer(
  admin: ReturnType<typeof createAdminClient>,
  context: Awaited<ReturnType<typeof loadImportContext>>,
  item: ZohoMappedEquipment,
  result: ImportResult
): Promise<CustomerRow> {
  const email = normalizeEmail(item.job.email);
  const phone = normalizePhone(item.job.phone);
  const name = item.job.customerName ?? "Imported Zoho Customer";
  const normalizedName = normalizeText(name);

  let match =
    (email && context.customers.find((c) => normalizeEmail(c.email) === email)) ||
    context.customers.find((c) => normalizeText(c.name) === normalizedName) ||
    (phone && context.customers.find((c) => normalizePhone(c.phone) === phone));

  if (match) {
    result.customersMatched++;
    return match;
  }

  const { data, error } = await admin
    .from("customers")
    .insert({
      name,
      contact_person: item.job.contactName,
      email,
      phone: item.job.phone,
      notes: "Imported from Zoho Jobcard CSV. Existing records were not overwritten.",
    })
    .select("id, name, email, phone")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Customer import failed.");
  match = data as CustomerRow;
  context.customers.push(match);
  result.customersCreated++;
  return match;
}

async function findOrCreateSite(
  admin: ReturnType<typeof createAdminClient>,
  context: Awaited<ReturnType<typeof loadImportContext>>,
  customerId: string,
  item: ZohoMappedEquipment
): Promise<SiteRow> {
  const location =
    item.job.submittersLocation ||
    item.asset.locationDescription ||
    "Imported from Zoho";
  const normalizedLocation = normalizeText(location);
  const customerSites = context.sites.filter((s) => s.customer_id === customerId);
  const match =
    customerSites.find((s) => normalizeText(s.address).includes(normalizedLocation)) ||
    customerSites.find((s) => normalizeText(s.access_notes).includes(normalizedLocation)) ||
    customerSites.find((s) => normalizeText(s.name) === "imported zoho site");

  if (match) return match;

  const { data, error } = await admin
    .from("sites")
    .insert({
      customer_id: customerId,
      name: "Imported Zoho Site",
      address: location,
      access_notes: item.job.submittersLocation,
      contact_person: item.job.contactName,
      contact_phone: item.job.phone,
    })
    .select("id, customer_id, name, address, access_notes")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Site import failed.");
  const site = data as SiteRow;
  context.sites.push(site);
  return site;
}

function matchTechnician(technicians: TechRow[], item: ZohoMappedEquipment) {
  const bySaqcc =
    item.job.saqccNumber &&
    technicians.find(
      (t) =>
        t.is_active &&
        normalizeText(t.saqcc_number) === normalizeText(item.job.saqccNumber)
    );
  if (bySaqcc) return bySaqcc;

  return technicians.find(
    (t) =>
      t.is_active &&
      normalizeText(t.full_name) === normalizeText(item.job.technicianName)
  );
}

async function findOrCreateJob(
  admin: ReturnType<typeof createAdminClient>,
  legacyJobId: string,
  equipment: ZohoMappedEquipment[],
  customerId: string,
  siteId: string,
  technicianId: string | null,
  importedBy: string,
  result: ImportResult
) {
  const existing = await admin
    .from("jobs")
    .select("id")
    .eq("legacy_zoho_jobcard_id", legacyJobId)
    .eq("import_source", ZOHO_IMPORT_SOURCE)
    .maybeSingle();

  if (existing.data?.id) {
    result.jobsMatched++;
    return existing.data.id as string;
  }

  const first = equipment[0];
  const { data, error } = await admin
    .from("jobs")
    .insert({
      customer_id: customerId,
      site_id: siteId,
      assigned_to: technicianId,
      created_by: importedBy,
      job_type: jobTypeForImportedEquipment(equipment),
      priority: "medium",
      status: "completed",
      scheduled_date: first.job.date ?? new Date().toISOString().slice(0, 10),
      description: first.job.technicianReport,
      contact_person: first.job.contactName,
      contact_phone: first.job.phone,
      completed_at: first.job.addedTime,
      legacy_zoho_jobcard_id: legacyJobId,
      import_source: ZOHO_IMPORT_SOURCE,
      import_raw_data: { equipment },
      import_warnings: warningsToJson(equipment.flatMap((e) => e.warnings)),
      legacy_technician_name: first.job.technicianName,
      legacy_technician_saqcc: first.job.saqccNumber,
      legacy_submitters_location: first.job.submittersLocation,
      next_service_due_date: first.job.nextServiceDate,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Job import failed.");
  result.jobsCreated++;
  return data.id as string;
}

async function findOrCreateAsset(
  admin: ReturnType<typeof createAdminClient>,
  context: Awaited<ReturnType<typeof loadImportContext>>,
  siteId: string,
  item: ZohoMappedEquipment,
  result: ImportResult
): Promise<AssetRow> {
  const assetKey = [
    "zoho-asset",
    siteId,
    item.section,
    normalizeText(item.asset.assetType),
    normalizeText(item.asset.sizeCapacity),
    normalizeText(item.asset.medium),
    normalizeText(item.asset.locationDescription),
    normalizeText(item.asset.originalDescription),
  ].join("|");

  let match =
    context.assets.find((a) => a.import_idempotency_key === assetKey) ||
    context.assets.find(
      (a) =>
        a.site_id === siteId &&
        a.asset_type === item.asset.assetType &&
        normalizeText(a.size_capacity) === normalizeText(item.asset.sizeCapacity) &&
        normalizeText(a.asset_medium) === normalizeText(item.asset.medium) &&
        normalizeText(a.location_description) ===
          normalizeText(item.asset.locationDescription) &&
        normalizeText(a.legacy_description) ===
          normalizeText(item.asset.originalDescription)
    );

  if (match) {
    result.assetsMatched++;
    return match;
  }

  const { data, error } = await admin
    .from("assets")
    .insert({
      site_id: siteId,
      asset_type: item.asset.assetType,
      size_capacity: item.asset.sizeCapacity,
      asset_medium: item.asset.medium,
      location_description: item.asset.locationDescription,
      last_service_date: item.asset.lastServiceDate ?? item.job.date,
      next_service_date: item.job.nextServiceDate,
      status: item.inspection.result === "pass" ? "compliant" : "defective",
      notes: item.asset.medium ? `Imported medium: ${item.asset.medium}` : null,
      legacy_zoho_jobcard_id: item.legacyZohoJobcardId,
      import_source: ZOHO_IMPORT_SOURCE,
      import_raw_data: item.rawRow,
      import_warnings: warningsToJson(item.warnings),
      import_idempotency_key: assetKey,
      legacy_description: item.asset.originalDescription,
      imported_unverified: item.asset.importedUnverified,
    })
    .select(
      "id, site_id, asset_type, size_capacity, asset_medium, location_description, legacy_description, import_idempotency_key"
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? "Asset import failed.");
  match = data as AssetRow;
  context.assets.push(match);
  result.assetsCreated++;
  return match;
}

async function rowExists(
  admin: ReturnType<typeof createAdminClient>,
  table: "inspections" | "defects",
  importIdempotencyKey: string
): Promise<boolean> {
  const { data } = await admin
    .from(table)
    .select("id")
    .eq("import_idempotency_key", importIdempotencyKey)
    .eq("import_source", ZOHO_IMPORT_SOURCE)
    .maybeSingle();
  return Boolean(data?.id);
}

function warningsToJson(warnings: ZohoWarning[]) {
  return warnings.map(({ code, message, csvRowNumber, severity }) => ({
    code,
    message,
    csvRowNumber,
    severity: severity ?? "warning",
  }));
}
