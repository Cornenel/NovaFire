import { NextRequest, NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/integrations/zoho/access";
import { readZohoConfig, resolveAccountsServer } from "@/lib/integrations/zoho/config";
import { consumeOAuthState, storeAuthorizedConnection } from "@/lib/integrations/zoho/connection";
import { safeEqual } from "@/lib/integrations/zoho/crypto";
import { listOrganizations } from "@/lib/integrations/zoho/organizations";
import { OAUTH_STATE_COOKIE, exchangeAuthorizationCode } from "@/lib/integrations/zoho/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function finish(request: NextRequest, notice: string) {
  const response = NextResponse.redirect(
    new URL(`/admin/integrations/zoho?notice=${notice}`, request.url)
  );
  response.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/zoho",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const auth = await requireActiveAdmin();
  if (!auth.ok) {
    return NextResponse.redirect(new URL("/tech-login", request.url));
  }

  const config = readZohoConfig();
  if (!config.ok) return finish(request, "config");

  const queryState = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value ?? null;
  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const providerError = request.nextUrl.searchParams.get("error");

  if (!queryState || !cookieState || !safeEqual(queryState, cookieState)) {
    return finish(request, "state");
  }

  const consumed = await consumeOAuthState(queryState, auth.userId);
  if (!consumed.ok) {
    return finish(request, consumed.reason === "expired" ? "expired" : consumed.reason === "replay" ? "replay" : "state");
  }

  if (providerError || !code || code.length > 2048) {
    return finish(request, "denied");
  }

  const accounts = resolveAccountsServer({
    configuredAccountsUrl: config.config.accountsUrl,
    accountsServer: request.nextUrl.searchParams.get("accounts-server"),
    location: request.nextUrl.searchParams.get("location"),
  });
  if (!accounts.ok) return finish(request, "region");

  const token = await exchangeAuthorizationCode({
    config: config.config,
    accountsUrl: accounts.accountsUrl,
    code,
  });
  if (!token.ok) return finish(request, token.error === "region" ? "region" : "token");

  const organizations = await listOrganizations({
    apiDomain: token.token.apiDomain,
    accessToken: token.token.accessToken,
  });

  const stored = await storeAuthorizedConnection({
    actorId: auth.userId,
    accountsUrl: accounts.accountsUrl,
    token: token.token,
    organizations: organizations.ok ? organizations.organizations : [],
    organizationError: organizations.ok ? null : organizations.error,
  });
  if (!stored.ok) return finish(request, "token");
  if (!organizations.ok || organizations.organizations.length === 0) {
    return finish(request, "orgs");
  }
  return finish(request, "connected");
}
