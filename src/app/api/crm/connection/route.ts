import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { checkAutomationRules } from "@/lib/automation";
import { z } from "zod";
import crypto from "crypto";

const mappingSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string(),
  email: z.string().optional(),
  last_visit_date: z.string().optional(),
  visit_count: z.string().optional(),
});

const schema = z.object({
  businessId: z.string(),
  type: z.enum(["CSV", "WEBHOOK", "HUBSPOT", "GOHIGHLEVEL"]),
  name: z.string().min(1),
  fieldMapping: mappingSchema,
  csvRows: z.array(z.record(z.string(), z.string())).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessId, type, name, fieldMapping, csvRows } = parsed.data;

  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const connection = await prisma.crmConnection.create({
    data: {
      businessId,
      type,
      name,
      fieldMapping: JSON.stringify(fieldMapping),
      webhookToken: type === "WEBHOOK" ? crypto.randomBytes(16).toString("hex") : null,
    },
  });

  let importedCount = 0;
  let updatedCount = 0;
  let autoSent = 0;
  let reactivationsSent = 0;
  if (type === "CSV" && csvRows?.length) {
    const contacts = csvRows
      .map((row) => mapRowToContact(row, fieldMapping))
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // Dedupe by phone within the business — re-uploading an updated export
    // (e.g. with fresh visit counts) updates the same contact instead of
    // creating a duplicate, so visit history and reactivation tracking
    // work for businesses with no live CRM connection at all.
    for (const c of contacts) {
      const existing = await prisma.contact.findFirst({
        where: { businessId, phone: c.phone },
      });
      if (existing) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            connectionId: connection.id,
            firstName: c.firstName ?? existing.firstName,
            lastName: c.lastName ?? existing.lastName,
            email: c.email ?? existing.email,
            visitCount: c.visitCount ?? existing.visitCount,
            lastVisitAt: c.lastVisitAt ?? existing.lastVisitAt,
            raw: JSON.stringify(c.raw),
          },
        });
        updatedCount += 1;
      } else {
        await prisma.contact.create({
          data: {
            businessId,
            connectionId: connection.id,
            firstName: c.firstName,
            lastName: c.lastName,
            phone: c.phone,
            email: c.email,
            visitCount: c.visitCount ?? 0,
            lastVisitAt: c.lastVisitAt,
            raw: JSON.stringify(c.raw),
          },
        });
        importedCount += 1;
      }
    }

    await prisma.crmConnection.update({ where: { id: connection.id }, data: { lastSyncedAt: new Date() } });
    ({ autoSent, reactivationsSent } = await checkAutomationRules(businessId));
  }

  return NextResponse.json({ connection, importedCount, updatedCount, autoSent, reactivationsSent });
}

function mapRowToContact(
  row: Record<string, string>,
  mapping: z.infer<typeof mappingSchema>
) {
  const phone = mapping.phone ? row[mapping.phone] : undefined;
  if (!phone) return null;
  const visitCountRaw = mapping.visit_count ? row[mapping.visit_count] : undefined;
  const lastVisitRaw = mapping.last_visit_date ? row[mapping.last_visit_date] : undefined;
  const lastVisitAt = lastVisitRaw ? new Date(lastVisitRaw) : undefined;
  return {
    firstName: mapping.first_name ? row[mapping.first_name] : undefined,
    lastName: mapping.last_name ? row[mapping.last_name] : undefined,
    phone,
    email: mapping.email ? row[mapping.email] : undefined,
    visitCount: visitCountRaw ? Number(visitCountRaw) : undefined,
    lastVisitAt: lastVisitAt && !isNaN(lastVisitAt.getTime()) ? lastVisitAt : undefined,
    raw: row,
  };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });
  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const connections = await prisma.crmConnection.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      name: true,
      webhookToken: true,
      fieldMapping: true,
      lastSyncedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ connections });
}
