import { NextRequest, NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/integrations/zoho/access";
import { readZohoConfig } from "@/lib/integrations/zoho/config";
import { issueOAuthState } from "@/lib/integrations/zoho/connection";
import { createOAuthState } from "@/lib/integrations/zoho/crypto";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE_SECONDS,
  buildAuthorizationUrl,
} from "@/lib/integrations/zoho/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireActiveAdmin();
  if (!auth.ok) {
    const login = new URL("/tech-login", request.url);
    return NextResponse.redirect(login);
  }

  const config = readZohoConfig();
  if (!config.ok) {
    return NextResponse.redirect(new URL("/admin/integrations/zoho?notice=config", request.url));
  }

  try {
    const state = createOAuthState();
    await issueOAuthState(auth.userId, state);
    const response = NextResponse.redirect(buildAuthorizationUrl(config.config, state));
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/integrations/zoho",
      maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/admin/integrations/zoho?notice=state", request.url));
  }
}
