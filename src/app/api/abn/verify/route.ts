import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { lookupAbn } from "@/lib/abn";
import { z } from "zod";

const schema = z.object({
  businessId: z.string(),
  abn: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessId, abn } = parsed.data;

  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await lookupAbn(abn);
    if (!result.valid) {
      return NextResponse.json({ error: result.error ?? "Invalid ABN" }, { status: 400 });
    }
    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        abn: abn.replace(/\s/g, ""),
        abnVerifiedName: result.entityName,
        abnStatus: result.abnStatus,
      },
    });
    return NextResponse.json({ business, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
