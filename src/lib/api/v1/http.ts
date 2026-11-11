import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function jsonError(
  status: number,
  error: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    details ? { error, ...details } : { error },
    { status }
  );
}

export async function readJsonBody<T>(
  request: Request
): Promise<{ data: T } | { error: string }> {
  try {
    const data = (await request.json()) as T;
    return { data };
  } catch {
    return { error: "Request body must be valid JSON." };
  }
}
