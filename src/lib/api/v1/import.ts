import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assetCreateSchema, createAssetRecord } from "@/lib/api/v1/assets";
import {
  createCustomerRecord,
  customerCreateSchema,
} from "@/lib/api/v1/customers";
import { createSiteRecord, siteCreateSchema } from "@/lib/api/v1/sites";
import {
  normalizePhoneForMatch,
  normalizeTextForMatch,
} from "@/lib/api/v1/validation";

const importAssetSchema = assetCreateSchema.omit({ site_id: true });
const importSiteSchema = siteCreateSchema
  .omit({ customer_id: true })
  .extend({
    assets: z.array(importAssetSchema).max(500).optional(),
  });

export const bulkImportSchema = z
  .object({
    confirm_duplicates: z.boolean().optional(),
    customers: z
      .array(
        customerCreateSchema.extend({
          sites: z.array(importSiteSchema).max(100).optional(),
        })
      )
      .min(1)
      .max(100),
  })
  .strict();

export type BulkImportInput = z.infer<typeof bulkImportSchema>;

type ImportResult = {
  customers_created: number;
  customers_matched: number;
  sites_created: number;
  sites_matched: number;
  assets_created: number;
  assets_skipped: number;
  errors: Array<{ path: string; error: string }>;
  created: {
    customers: Array<{ id: string; name: string }>;
    sites: Array<{ id: string; customer_id: string; name: string }>;
    assets: Array<{ id: string; site_id: string; asset_code: string }>;
  };
};

async function matchExistingCustomer(
  supabase: SupabaseClient,
  values: { name: string; email?: string | null; phone?: string | null }
) {
  const { data } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .limit(5000);

  const name = normalizeTextForMatch(values.name);
  const email = normalizeTextForMatch(values.email);
  const phone = normalizePhoneForMatch(values.phone);

  return (data ?? []).find((c) => {
    if (name && normalizeTextForMatch(c.name) === name) return true;
    if (email && normalizeTextForMatch(c.email) === email) return true;
    if (phone && normalizePhoneForMatch(c.phone) === phone) return true;
    return false;
  });
}

async function matchExistingSite(
  supabase: SupabaseClient,
  customerId: string,
  values: { name: string; address: string }
) {
  const { data } = await supabase
    .from("sites")
    .select("id, name, address")
    .eq("customer_id", customerId);

  const name = normalizeTextForMatch(values.name);
  const address = normalizeTextForMatch(values.address);

  return (data ?? []).find(
    (s) =>
      normalizeTextForMatch(s.name) === name &&
      normalizeTextForMatch(s.address) === address
  );
}

/**
 * Nested import: customers → sites → assets.
 * Matches existing records where possible to avoid duplicates.
 * Process in batches of <=100 customers per request.
 */
export async function runBulkImport(
  supabase: SupabaseClient,
  raw: unknown,
  options?: { createdBy?: string | null }
): Promise<{ ok: true; result: ImportResult } | { ok: false; status: number; error: string }> {
  const parsed = bulkImportSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }

  const confirmDuplicates = parsed.data.confirm_duplicates === true;
  const result: ImportResult = {
    customers_created: 0,
    customers_matched: 0,
    sites_created: 0,
    sites_matched: 0,
    assets_created: 0,
    assets_skipped: 0,
    errors: [],
    created: { customers: [], sites: [], assets: [] },
  };

  for (let ci = 0; ci < parsed.data.customers.length; ci++) {
    const customerInput = parsed.data.customers[ci];
    const path = `customers[${ci}]`;
    const { sites, ...customerFields } = customerInput;

    let customerId: string | null = null;

    const existing = await matchExistingCustomer(supabase, customerFields);
    if (existing) {
      customerId = existing.id as string;
      result.customers_matched++;
    } else {
      const created = await createCustomerRecord(
        supabase,
        {
          ...customerFields,
          confirm_duplicates: confirmDuplicates || customerFields.confirm_duplicates,
        },
        { createdBy: options?.createdBy ?? null }
      );
      if (!created.ok) {
        result.errors.push({ path, error: created.error });
        continue;
      }
      customerId = String(created.customer.id);
      result.customers_created++;
      result.created.customers.push({
        id: customerId,
        name: String(created.customer.name),
      });
    }

    if (!customerId || !sites?.length) continue;

    for (let si = 0; si < sites.length; si++) {
      const siteInput = sites[si];
      const sitePath = `${path}.sites[${si}]`;
      const { assets, ...siteFields } = siteInput;

      let siteId: string | null = null;
      const existingSite = await matchExistingSite(supabase, customerId, siteFields);
      if (existingSite) {
        siteId = existingSite.id as string;
        result.sites_matched++;
      } else {
        const createdSite = await createSiteRecord(supabase, {
          ...siteFields,
          customer_id: customerId,
        });
        if (!createdSite.ok) {
          result.errors.push({ path: sitePath, error: createdSite.error });
          continue;
        }
        siteId = String(createdSite.site.id);
        result.sites_created++;
        result.created.sites.push({
          id: siteId,
          customer_id: customerId,
          name: String(createdSite.site.name),
        });
      }

      if (!siteId || !assets?.length) continue;

      for (let ai = 0; ai < assets.length; ai++) {
        const assetInput = assets[ai];
        const assetPath = `${sitePath}.assets[${ai}]`;

        if (assetInput.customer_asset_number) {
          const { data: existingAsset } = await supabase
            .from("assets")
            .select("id")
            .eq("site_id", siteId)
            .eq("customer_asset_number", assetInput.customer_asset_number)
            .maybeSingle();
          if (existingAsset) {
            result.assets_skipped++;
            continue;
          }
        }

        const createdAsset = await createAssetRecord(supabase, {
          ...assetInput,
          site_id: siteId,
        });
        if (!createdAsset.ok) {
          result.errors.push({ path: assetPath, error: createdAsset.error });
          continue;
        }
        result.assets_created++;
        result.created.assets.push({
          id: String(createdAsset.asset.id),
          site_id: siteId,
          asset_code: String(createdAsset.asset.asset_code),
        });
      }
    }
  }

  return { ok: true, result };
}
