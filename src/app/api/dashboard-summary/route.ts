import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";

const DAYS = 7;

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

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
  const since = new Date(today.getTime() - (2 * DAYS - 1) * 24 * 60 * 60 * 1000);

  const [contacts, sends] = await Promise.all([
    prisma.contact.findMany({
      where: { businessId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.reviewRequest.findMany({
      where: { businessId, sentAt: { gte: since } },
      select: { sentAt: true },
    }),
  ]);

  function bucket(dates: Date[]): number[] {
    const days: number[] = Array.from({ length: 2 * DAYS }, () => 0);
    for (const d of dates) {
      const dayIndex = Math.floor((d.getTime() - since.getTime()) / (24 * 60 * 60 * 1000));
      if (dayIndex >= 0 && dayIndex < days.length) days[dayIndex] += 1;
    }
    return days;
  }

  const contactsByDay = bucket(contacts.map((c) => c.createdAt));
  const sentByDay = bucket(sends.map((s) => s.sentAt));

  const contactsThisWeek = contactsByDay.slice(DAYS).reduce((a, b) => a + b, 0);
  const contactsLastWeek = contactsByDay.slice(0, DAYS).reduce((a, b) => a + b, 0);
  const sentThisWeek = sentByDay.slice(DAYS).reduce((a, b) => a + b, 0);
  const sentLastWeek = sentByDay.slice(0, DAYS).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    contacts: { sparkline: contactsByDay.slice(DAYS), trendPct: pctChange(contactsThisWeek, contactsLastWeek) },
    sent: { sparkline: sentByDay.slice(DAYS), trendPct: pctChange(sentThisWeek, sentLastWeek) },
  });
}
