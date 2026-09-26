import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });
  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rule = await prisma.automationRule.findUnique({ where: { businessId } });
  return NextResponse.json({ rule });
}

const schema = z.object({
  businessId: z.string(),
  enabled: z.boolean().optional(),
  visitThreshold: z.number().int().min(1).max(100).optional(),
  reactivationEnabled: z.boolean().optional(),
  reactivationDays: z.number().int().min(1).max(365).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessId, enabled, visitThreshold, reactivationEnabled, reactivationDays } = parsed.data;

  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Each field is independently optional — the Reviews page only ever sends
  // enabled/visitThreshold, and the Reactivation page only ever sends
  // reactivationEnabled/reactivationDays, so only the fields present are updated.
  const data = {
    ...(enabled !== undefined ? { enabled } : {}),
    ...(visitThreshold !== undefined ? { visitThreshold } : {}),
    ...(reactivationEnabled !== undefined ? { reactivationEnabled } : {}),
    ...(reactivationDays !== undefined ? { reactivationDays } : {}),
  };

  const rule = await prisma.automationRule.upsert({
    where: { businessId },
    update: data,
    create: { businessId, ...data },
  });

  return NextResponse.json({ rule });
}
