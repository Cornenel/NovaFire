import { requireOpsApiAuth } from "@/lib/api/v1/auth";
import { createSiteRecord, listSites } from "@/lib/api/v1/sites";
import { jsonCreated, jsonError, jsonOk, readJsonBody } from "@/lib/api/v1/http";
import { isUuid } from "@/lib/api/v1/validation";

/** GET /api/v1/sites?customer_id=&limit=&offset= */
export async function GET(request: Request) {
  const auth = await requireOpsApiAuth(request);
  if ("error" in auth) return jsonError(auth.status, auth.error);

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customer_id")?.trim() || undefined;
  if (customerId && !isUuid(customerId)) {
    return jsonError(400, "customer_id must be a UUID.");
  }

  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1),
    200
  );
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  const { data, error } = await listSites(auth.ctx.supabase, {
    customerId,
    limit,
    offset,
  });

  if (error) return jsonError(500, error.message);
  return jsonOk({ data: data ?? [], limit, offset });
}

/** POST /api/v1/sites */
export async function POST(request: Request) {
  const auth = await requireOpsApiAuth(request);
  if ("error" in auth) return jsonError(auth.status, auth.error);

  const body = await readJsonBody<Record<string, unknown>>(request);
  if ("error" in body) return jsonError(400, body.error);

  const result = await createSiteRecord(auth.ctx.supabase, body.data);
  if (!result.ok) return jsonError(result.status, result.error);
  return jsonCreated({ data: result.site });
}
