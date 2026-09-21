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
  enabled: z.boolean(),
  visitThreshold: z.number().int().min(1).max(100),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessId, enabled, visitThreshold } = parsed.data;

  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rule = await prisma.automationRule.upsert({
    where: { businessId },
    update: { enabled, visitThreshold, triggerType: "VISIT_COUNT" },
    create: { businessId, enabled, visitThreshold, triggerType: "VISIT_COUNT" },
  });

  return NextResponse.json({ rule });
}
