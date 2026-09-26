import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });
  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const kind = req.nextUrl.searchParams.get("kind");
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 8);

  const events = await prisma.reviewRequest.findMany({
    where: { businessId, ...(kind === "REVIEW_REQUEST" || kind === "REACTIVATION" ? { kind } : {}) },
    orderBy: { sentAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
    select: {
      id: true,
      kind: true,
      status: true,
      sentAt: true,
      contact: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ events });
}
