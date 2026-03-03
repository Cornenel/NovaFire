import { NextRequest, NextResponse } from "next/server";

/**
 * Subdomain routing – maps live subdomains to internal routes.
 * firetech.novafire.co.za → /tech
 * client.novafire.co.za → /client-portal
 *
 * Subdomains are configured in DNS/hosting; this middleware rewrites the path.
 */

const SUBDOMAIN_ROUTES: Record<string, string> = {
  firetech: "/tech",
  client: "/client-portal",
};

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();

  // Parse subdomain: firetech.novafire.co.za → "firetech" (exclude www)
  const parts = hostname.replace(/:\d+$/, "").split(".");
  const subdomain = parts.length >= 3 && parts[0] !== "www" ? parts[0] : null;

  if (subdomain && SUBDOMAIN_ROUTES[subdomain]) {
    const basePath = SUBDOMAIN_ROUTES[subdomain];
    const pathname = url.pathname === "/" ? basePath : `${basePath}${url.pathname}`;
    return NextResponse.rewrite(new URL(pathname, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and api routes.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
