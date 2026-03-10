import { NextRequest, NextResponse } from "next/server";

/**
 * Tech portal auth – validates @novafire.co.za email + staff password
 * No Supabase, no DB. Set FIRETECH_STAFF_PASSWORD in env.
 */

const ALLOWED_DOMAIN = "@novafire.co.za";
const COOKIE_NAME = "nf_firetech";

function isValidEmail(email: string): boolean {
  return email.endsWith(ALLOWED_DOMAIN);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalisedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalisedEmail)) {
      return NextResponse.json(
        { error: "Only @novafire.co.za email addresses can access this area" },
        { status: 403 }
      );
    }

    const staffPassword = process.env.FIRETECH_STAFF_PASSWORD;
    if (!staffPassword) {
      return NextResponse.json(
        { error: "Login not configured. Contact administrator." },
        { status: 500 }
      );
    }

    if (password !== staffPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Cookie value must match what proxy expects (FIRETECH_ACCESS_SECRET)
    const cookieValue = process.env.FIRETECH_ACCESS_SECRET || staffPassword;

    const res = NextResponse.json({ success: true });
    res.cookies.set(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
