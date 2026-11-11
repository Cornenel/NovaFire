import { z } from "zod";
import { zohoBooksGet } from "./client";

const organizationSchema = z.object({
  organization_id: z.union([z.string(), z.number()]),
  name: z.string().nullable().optional(),
  currency_code: z.string().nullable().optional(),
  is_default_org: z.boolean().optional(),
});

export type ZohoOrganization = {
  organizationId: string;
  name: string;
  currencyCode: string | null;
  isDefault: boolean;
};

export function parseOrganizations(body: unknown): ZohoOrganization[] {
  if (!body || typeof body !== "object" || !("organizations" in body)) return [];
  const rows = (body as { organizations?: unknown[] }).organizations ?? [];
  const organizations: ZohoOrganization[] = [];
  for (const row of rows) {
    const parsed = organizationSchema.safeParse(row);
    if (!parsed.success) continue;
    const organizationId = String(parsed.data.organization_id).trim();
    if (!organizationId) continue;
    organizations.push({
      organizationId,
      name: parsed.data.name?.trim() || organizationId,
      currencyCode: parsed.data.currency_code?.trim() || null,
      isDefault: parsed.data.is_default_org === true,
    });
  }
  return organizations;
}

export async function listOrganizations(input: {
  apiDomain: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; organizations: ZohoOrganization[] } | { ok: false; error: string }> {
  const result = await zohoBooksGet({
    apiDomain: input.apiDomain,
    accessToken: input.accessToken,
    path: "/organizations",
    fetchImpl: input.fetchImpl,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, organizations: parseOrganizations(result.body) };
}

export async function getOrganization(input: {
  apiDomain: string;
  accessToken: string;
  organizationId: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; organization: ZohoOrganization | null } | { ok: false; error: string }> {
  const result = await zohoBooksGet({
    apiDomain: input.apiDomain,
    accessToken: input.accessToken,
    path: `/organizations/${encodeURIComponent(input.organizationId)}`,
    fetchImpl: input.fetchImpl,
  });
  if (!result.ok) return { ok: false, error: result.error };
  const row =
    result.body && typeof result.body === "object" && "organization" in result.body
      ? (result.body as { organization?: unknown }).organization
      : null;
  const organizations = parseOrganizations({ organizations: row ? [row] : [] });
  return { ok: true, organization: organizations[0] ?? null };
}
