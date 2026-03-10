import { NextRequest, NextResponse } from "next/server";

/**
 * Subdomain routing & maintenance mode
 *
 * maintenance.novafire.co.za → /maintenance
 * firetech.novafire.co.za → /tech (staff/admin only – requires FIRETECH_ACCESS_SECRET)
 * client.novafire.co.za → /client-portal
 * training.novafire.co.za → /training
 *
 * Main domain (novafire.co.za, www): shows maintenance page for all visitors.
 * Bypass: ?bypass=YOUR_SECRET. Set MAINTENANCE_BYPASS_SECRET in env.
 *
 * Firetech: staff/admin only. Visit firetech.novafire.co.za?access=YOUR_SECRET to grant access.
 * Set FIRETECH_ACCESS_SECRET in env – share only with authorised personnel.
 */

const SUBDOMAIN_ROUTES: Record<string, string> = {
  maintenance: "/maintenance",
  firetech: "/tech",
  client: "/client-portal",
  training: "/training",
};

const BYPASS_COOKIE = "nf_bypass";
const FIRETECH_COOKIE = "nf_firetech";

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

  // firetech: staff/admin only – require access token
  const firetechSecret = process.env.FIRETECH_ACCESS_SECRET;
  const firetechAccessParam = url.searchParams.get("access");
  const hasFiretechCookie = request.cookies.get(FIRETECH_COOKIE)?.value === firetechSecret;

  if (subdomain === "firetech" && firetechSecret) {
    if (firetechAccessParam === firetechSecret) {
      const redirectUrl = new URL(request.url);
      redirectUrl.searchParams.delete("access");
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.set(FIRETECH_COOKIE, firetechSecret, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
      return res;
    }
    if (!hasFiretechCookie) {
      const path = url.pathname;
      if (path === "/tech-login" || path.startsWith("/api/tech-auth")) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/tech-login", request.url));
    }
  }

  // Other subdomains: firetech → /tech, client → /client-portal, training → /training
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
