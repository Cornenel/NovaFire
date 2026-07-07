import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { featureFlags } from "@/lib/fsm/feature-flags";

/**
 * Proxy (Next.js 16 middleware)
 *
 * 1. Subdomain routing:
 *    firetech.novafire.co.za → /tech (staff only)
 *    client.novafire.co.za   → /client-portal
 *    training.novafire.co.za → /training
 *
 * 2. Supabase session refresh – keeps auth cookies fresh on every request.
 *
 * 3. Route guards:
 *    /tech/* requires a signed-in user (role check happens in the page,
 *    which redirects non-staff to /tech-restricted).
 */

const SUBDOMAIN_ROUTES: Record<string, string> = {
  firetech: "/tech",
  client: "/client-portal",
  training: "/training",
};

/** Root-level routes that must never be rewritten under a subdomain base path. */
const REWRITE_EXEMPT_PREFIXES = [
  "/api/",
  "/auth/",
  "/admin",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/tech-login",
  "/tech-restricted",
  "/legal",
  "/thank-you",
  "/quote-confirmation",
];

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = (request.headers.get("host") ?? "").replace(/:\d+$/, "");
  const parts = hostname.split(".");
  // co.za: novafire.co.za = apex (3 parts), firetech.novafire.co.za = 4 parts
  const subdomain = parts.length >= 4 ? parts[0] : null;

  // Resolve the effective path (after any subdomain rewrite)
  let rewritePath: string | null = null;
  let effectivePath = url.pathname;

  if (
    subdomain &&
    SUBDOMAIN_ROUTES[subdomain] &&
    !REWRITE_EXEMPT_PREFIXES.some((p) => url.pathname.startsWith(p))
  ) {
    const basePath = SUBDOMAIN_ROUTES[subdomain];
    if (!url.pathname.startsWith(basePath)) {
      rewritePath = url.pathname === "/" ? basePath : `${basePath}${url.pathname}`;
      effectivePath = rewritePath;
    }
  }

  const makeResponse = () =>
    rewritePath
      ? NextResponse.rewrite(new URL(rewritePath, request.url), { request })
      : NextResponse.next({ request });

  let response = makeResponse();

  // Supabase session refresh (skip gracefully if env not configured yet)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = makeResponse();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guard: staff/admin routes require sign-in (role checks happen in layouts)
  const isStaffRoute =
    effectivePath === "/tech" ||
    effectivePath.startsWith("/tech/") ||
    effectivePath === "/admin" ||
    effectivePath.startsWith("/admin/");

  const isPortalRoute =
    effectivePath === "/client-portal" ||
    effectivePath.startsWith("/client-portal/");

  const isPortalLogin = effectivePath === "/client-portal/login";

  if (isStaffRoute && !user) {
    const loginUrl = new URL("/tech-login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (featureFlags.customerPortal && isPortalRoute && !isPortalLogin && !user) {
    const loginUrl = new URL("/client-portal/login", request.url);
    loginUrl.searchParams.set("next", effectivePath);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
