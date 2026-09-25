import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildGoogleAuthUrl, isGoogleSignInConfigured } from "@/lib/google-oauth";

const STATE_COOKIE = "google_oauth_state";

export async function GET() {
  if (!isGoogleSignInConfigured) {
    return NextResponse.json(
      { error: "Google sign-in isn't configured yet." },
      { status: 503 }
    );
  }

  const state = randomBytes(16).toString("base64url");
  const res = NextResponse.redirect(buildGoogleAuthUrl(state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
