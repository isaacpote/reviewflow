import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";

const DAYS = 14;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });
  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since = new Date(today.getTime() - (DAYS - 1) * 24 * 60 * 60 * 1000);

  const requests = await prisma.reviewRequest.findMany({
    where: { businessId, sentAt: { gte: since } },
    select: { kind: true, status: true, sentAt: true },
    orderBy: { sentAt: "asc" },
  });

  const totalReviewRequests = await prisma.reviewRequest.count({
    where: { businessId, kind: "REVIEW_REQUEST" },
  });
  const totalReactivations = await prisma.reviewRequest.count({
    where: { businessId, kind: "REACTIVATION" },
  });

  // "Reactivated" = a contact who was sent a reactivation message and has
  // since visited again (their lastVisitAt moved past when it was sent).
  // Prisma can't express that date comparison in a where clause, so filter in JS.
  const everReactivated = await prisma.contact.findMany({
    where: { businessId, autoSentReactivationAt: { not: null }, lastVisitAt: { not: null } },
    select: { autoSentReactivationAt: true, lastVisitAt: true },
  });
  const reactivatedCount = everReactivated.filter(
    (c) => c.lastVisitAt! > c.autoSentReactivationAt!
  ).length;

  // Bucket sends per day per kind, for the chart.
  const days: { date: string; reviewRequests: number; reactivations: number }[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    days.push({ date: d.toISOString().slice(0, 10), reviewRequests: 0, reactivations: 0 });
  }
  const dayIndex = new Map(days.map((d, i) => [d.date, i]));
  for (const r of requests) {
    const key = r.sentAt.toISOString().slice(0, 10);
    const idx = dayIndex.get(key);
    if (idx === undefined) continue;
    if (r.kind === "REVIEW_REQUEST") days[idx].reviewRequests += 1;
    else days[idx].reactivations += 1;
  }

  return NextResponse.json({
    totalReviewRequests,
    totalReactivations,
    reactivatedCount,
    days,
  });
}
