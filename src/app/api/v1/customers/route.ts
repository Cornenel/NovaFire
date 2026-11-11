import { requireOpsApiAuth } from "@/lib/api/v1/auth";
import {
  createCustomerRecord,
  listCustomers,
} from "@/lib/api/v1/customers";
import { jsonCreated, jsonError, jsonOk, readJsonBody } from "@/lib/api/v1/http";

/** GET /api/v1/customers?q=&limit=&offset= */
export async function GET(request: Request) {
  const auth = await requireOpsApiAuth(request);
  if ("error" in auth) return jsonError(auth.status, auth.error);

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || undefined;
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1),
    200
  );
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  const { data, error } = await listCustomers(auth.ctx.supabase, {
    q,
    limit,
    offset,
  });

  if (error) return jsonError(500, error.message);
  return jsonOk({ data: data ?? [], limit, offset });
}

/** POST /api/v1/customers */
export async function POST(request: Request) {
  const auth = await requireOpsApiAuth(request);
  if ("error" in auth) return jsonError(auth.status, auth.error);

  const body = await readJsonBody<Record<string, unknown>>(request);
  if ("error" in body) return jsonError(400, body.error);

  const result = await createCustomerRecord(auth.ctx.supabase, body.data, {
    createdBy: auth.ctx.user?.id ?? null,
  });
  if (!result.ok) {
    return jsonError(result.status, result.error, {
      duplicates: result.duplicates,
    });
  }
  return jsonCreated({ data: result.customer });
}
