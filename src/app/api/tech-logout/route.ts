import { NextRequest, NextResponse } from "next/server";

/**
 * Clear firetech auth cookie and redirect to login
 */
export function GET(request: NextRequest) {
  const base = new URL(request.url);
  const res = NextResponse.redirect(new URL("/tech-login", base.origin));
  res.cookies.set("nf_firetech", "", { maxAge: 0, path: "/" });
  return res;
}
