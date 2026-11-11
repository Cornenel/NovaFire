import { requireOpsApiAuth } from "@/lib/api/v1/auth";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api/v1/http";
import { runBulkImport } from "@/lib/api/v1/import";

/**
 * POST /api/v1/import
 * Nested bulk create: customers → sites → assets.
 * Max 100 customers per request (paginate your register).
 */
export async function POST(request: Request) {
  const auth = await requireOpsApiAuth(request);
  if ("error" in auth) return jsonError(auth.status, auth.error);

  const body = await readJsonBody<unknown>(request);
  if ("error" in body) return jsonError(400, body.error);

  const result = await runBulkImport(auth.ctx.supabase, body.data, {
    createdBy: auth.ctx.user?.id ?? null,
  });

  if (!result.ok) return jsonError(result.status, result.error);
  return jsonOk({ data: result.result });
}
