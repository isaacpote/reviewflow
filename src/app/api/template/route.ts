import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  businessId: z.string(),
  body: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!(await ownsBusiness(user.id, parsed.data.businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const template = await prisma.messageTemplate.upsert({
    where: { businessId: parsed.data.businessId },
    update: { body: parsed.data.body },
    create: { businessId: parsed.data.businessId, body: parsed.data.body },
  });
  return NextResponse.json({ template });
}
