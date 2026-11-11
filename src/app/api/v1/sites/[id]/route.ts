import { requireOpsApiAuth } from "@/lib/api/v1/auth";
import { getSite, updateSiteRecord } from "@/lib/api/v1/sites";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api/v1/http";
import { isUuid } from "@/lib/api/v1/validation";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/sites/:id */
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireOpsApiAuth(request);
  if ("error" in auth) return jsonError(auth.status, auth.error);

  const { id } = await params;
  if (!isUuid(id)) return jsonError(400, "Site id must be a UUID.");

  const { data, error } = await getSite(auth.ctx.supabase, id);
  if (error || !data) return jsonError(404, "Site not found.");
  return jsonOk({ data });
}

/** PATCH /api/v1/sites/:id */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireOpsApiAuth(request);
  if ("error" in auth) return jsonError(auth.status, auth.error);

  const { id } = await params;
  if (!isUuid(id)) return jsonError(400, "Site id must be a UUID.");

  const body = await readJsonBody<Record<string, unknown>>(request);
  if ("error" in body) return jsonError(400, body.error);

  const result = await updateSiteRecord(auth.ctx.supabase, id, body.data);
  if (!result.ok) return jsonError(result.status, result.error);
  return jsonOk({ data: result.site });
}
