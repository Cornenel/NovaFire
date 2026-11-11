import { requireOpsApiAuth } from "@/lib/api/v1/auth";
import { getAsset, updateAssetRecord } from "@/lib/api/v1/assets";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api/v1/http";
import { isUuid } from "@/lib/api/v1/validation";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/assets/:id */
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireOpsApiAuth(request);
  if ("error" in auth) return jsonError(auth.status, auth.error);

  const { id } = await params;
  if (!isUuid(id)) return jsonError(400, "Asset id must be a UUID.");

  const { data, error } = await getAsset(auth.ctx.supabase, id);
  if (error || !data) return jsonError(404, "Asset not found.");
  return jsonOk({ data });
}

/** PATCH /api/v1/assets/:id */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireOpsApiAuth(request);
  if ("error" in auth) return jsonError(auth.status, auth.error);

  const { id } = await params;
  if (!isUuid(id)) return jsonError(400, "Asset id must be a UUID.");

  const body = await readJsonBody<Record<string, unknown>>(request);
  if ("error" in body) return jsonError(400, body.error);

  const result = await updateAssetRecord(auth.ctx.supabase, id, body.data);
  if (!result.ok) return jsonError(result.status, result.error);
  return jsonOk({ data: result.asset });
}
