import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { exchangeCodeForUserInfo } from "@/lib/google-oauth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=google_denied`, url));
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL(`/login?error=google_failed`, url));
  }

  let info;
  try {
    info = await exchangeCodeForUserInfo(code);
  } catch {
    return NextResponse.redirect(new URL(`/login?error=google_failed`, url));
  }
  if (!info.email || !info.email_verified) {
    return NextResponse.redirect(new URL(`/login?error=google_unverified_email`, url));
  }

  let user = await prisma.user.findUnique({
    where: { googleId: info.sub },
    include: { businesses: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: info.email },
      include: { businesses: { orderBy: { createdAt: "asc" }, take: 1 } },
    });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { googleId: info.sub, name: existingByEmail.name ?? info.name },
        include: { businesses: { orderBy: { createdAt: "asc" }, take: 1 } },
      });
    } else {
      user = await prisma.user.create({
        data: { email: info.email, googleId: info.sub, name: info.name },
        include: { businesses: { orderBy: { createdAt: "asc" }, take: 1 } },
      });
    }
  }

  await createSession(user.id);

  const destination = user.businesses[0] ? `/biz/${user.businesses[0].id}/number` : "/signup/complete";
  return NextResponse.redirect(new URL(destination, url));
}
