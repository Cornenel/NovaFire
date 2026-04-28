import { NextRequest, NextResponse } from "next/server";

/**
 * Subdomain routing
 *
 * firetech.novafire.co.za → /tech (staff/admin only – requires FIRETECH_ACCESS_SECRET)
 * client.novafire.co.za → /client-portal
 * training.novafire.co.za → /training
 *
 * Firetech: staff/admin only. Visit firetech.novafire.co.za?access=YOUR_SECRET to grant access.
 * Set FIRETECH_ACCESS_SECRET in env – share only with authorised personnel.
 */

const SUBDOMAIN_ROUTES: Record<string, string> = {
  firetech: "/tech",
  client: "/client-portal",
  training: "/training",
};

const FIRETECH_COOKIE = "nf_firetech";

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();

  const cleanHost = hostname.replace(/:\d+$/, "");
  const parts = cleanHost.split(".");
  // co.za: novafire.co.za = apex (3 parts), www.novafire.co.za = 4 parts
  const subdomain = parts.length >= 4 ? parts[0] : null;

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

  // API routes – never rewrite, pass through to actual /api/* handlers
  if (url.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Subdomains: firetech → /tech, client → /client-portal, training → /training
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
