import { NextResponse } from "next/server";

/**
 * Clear firetech auth cookie and redirect to main site
 */
export function GET() {
  const mainSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://novafire.co.za";
  const res = NextResponse.redirect(mainSiteUrl);
  res.cookies.set("nf_firetech", "", { maxAge: 0, path: "/" });
  return res;
}
