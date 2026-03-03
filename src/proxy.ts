import { NextRequest, NextResponse } from "next/server";

/**
 * Subdomain routing & maintenance mode
 *
 * maintenance.novafire.co.za → /maintenance
 * firetech.novafire.co.za → /tech
 * client.novafire.co.za → /client-portal
 *
 * Main domain (novafire.co.za, www): shows maintenance page for all visitors.
 * Bypass: Add ?bypass=YOUR_SECRET to any main-domain URL to set cookie and view site.
 * Set MAINTENANCE_BYPASS_SECRET in env (e.g. Vercel) – only you should know this.
 */

const SUBDOMAIN_ROUTES: Record<string, string> = {
  maintenance: "/maintenance",
  firetech: "/tech",
  client: "/client-portal",
};

const BYPASS_COOKIE = "nf_bypass";

function isMainDomain(hostname: string, subdomain: string | null): boolean {
  return !subdomain || subdomain === "www";
}

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();

  const cleanHost = hostname.replace(/:\d+$/, "");
  const parts = cleanHost.split(".");
  // co.za: novafire.co.za = apex (3 parts), www.novafire.co.za = 4 parts
  const subdomain = parts.length >= 4 ? parts[0] : null;

  const bypassSecret = process.env.MAINTENANCE_BYPASS_SECRET;
  const bypassParam = url.searchParams.get("bypass");
  const hasValidCookie = request.cookies.get(BYPASS_COOKIE)?.value === bypassSecret;

  // Bypass: ?bypass=SECRET on main domain → set cookie, redirect to clean URL
  if (bypassSecret && bypassParam === bypassSecret && isMainDomain(cleanHost, subdomain)) {
    const redirectUrl = new URL(url.pathname, request.url);
    redirectUrl.searchParams.delete("bypass");
    const res = NextResponse.redirect(redirectUrl);
    res.cookies.set(BYPASS_COOKIE, bypassSecret, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    return res;
  }

  // maintenance subdomain → always show maintenance page
  if (subdomain === "maintenance") {
    return NextResponse.rewrite(new URL("/maintenance", request.url));
  }

  // Main domain (novafire.co.za, www): maintenance mode unless bypass cookie set
  if (isMainDomain(cleanHost, subdomain) && bypassSecret) {
    if (!hasValidCookie) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }
  }

  // Other subdomains: firetech → /tech, client → /client-portal
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
