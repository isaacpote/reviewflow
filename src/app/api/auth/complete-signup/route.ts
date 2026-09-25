import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  businessName: z.string().min(1),
  businessType: z.enum(["PHYSIO_OSTEO", "RESTAURANT", "TRADIE"]),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessName, businessType } = parsed.data;

  const business = await prisma.business.create({
    data: { name: businessName, type: businessType, ownerId: user.id },
  });

  return NextResponse.json({ business });
}
