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

  const contacts = await prisma.contact.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: { reviewRequests: { orderBy: { sentAt: "desc" }, take: 1 } },
  });
  const totalPaidCents = contacts.reduce((sum, c) => sum + (c.totalPaidCents ?? 0), 0);
  const trackedCount = contacts.filter((c) => c.totalPaidCents !== null).length;
  return NextResponse.json({ contacts, totalPaidCents, trackedCount });
}
