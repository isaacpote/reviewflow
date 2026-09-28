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

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { avgCustomerValue: true },
  });

  const contacts = await prisma.contact.findMany({
    where: { businessId, autoSentReactivationAt: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      autoSentReactivationAt: true,
      lastVisitAt: true,
    },
    orderBy: { autoSentReactivationAt: "desc" },
  });

  const avgCustomerValue = business?.avgCustomerValue ?? null;

  const results = contacts.map((c) => {
    const returned = Boolean(c.lastVisitAt && c.autoSentReactivationAt && c.lastVisitAt > c.autoSentReactivationAt);
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      sentAt: c.autoSentReactivationAt,
      returned,
      returnedAt: returned ? c.lastVisitAt : null,
      value: returned && avgCustomerValue !== null ? avgCustomerValue : null,
    };
  });

  const returnedCount = results.filter((r) => r.returned).length;
  const totalValue =
    avgCustomerValue !== null ? returnedCount * avgCustomerValue : null;

  return NextResponse.json({
    avgCustomerValue,
    totalSent: results.length,
    returnedCount,
    totalValue,
    results,
  });
}
