import { requireOpsApiAuth } from "@/lib/api/v1/auth";
import { listAssets } from "@/lib/api/v1/assets";
import { jsonError, jsonOk } from "@/lib/api/v1/http";
import { isUuid } from "@/lib/api/v1/validation";

/** GET /api/v1/assets?site_id=&customer_id=&limit=&offset= */
export async function GET(request: Request) {
  const auth = await requireOpsApiAuth(request);
  if ("error" in auth) return jsonError(auth.status, auth.error);

  const url = new URL(request.url);
  const siteId = url.searchParams.get("site_id")?.trim() || undefined;
  const customerId = url.searchParams.get("customer_id")?.trim() || undefined;

  if (siteId && !isUuid(siteId)) {
    return jsonError(400, "site_id must be a UUID.");
  }
  if (customerId && !isUuid(customerId)) {
    return jsonError(400, "customer_id must be a UUID.");
  }

  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1),
    200
  );
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  const { data, error } = await listAssets(auth.ctx.supabase, {
    siteId,
    customerId,
    limit,
    offset,
  });

  if (error) return jsonError(500, error.message);
  return jsonOk({ data: data ?? [], limit, offset });
}
