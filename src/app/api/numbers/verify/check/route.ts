import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkVerification } from "@/lib/twilio";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ phoneNumberId: z.string(), code: z.string().min(4) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const record = await prisma.phoneNumber.findUnique({
    where: { id: parsed.data.phoneNumberId },
    include: { business: { select: { ownerId: true } } },
  });
  if (!record || record.business.ownerId !== user.id) {
    return NextResponse.json({ error: "Number not found" }, { status: 404 });
  }

  try {
    const { approved } = await checkVerification(record.phoneNumber, parsed.data.code);
    const updated = await prisma.phoneNumber.update({
      where: { id: record.id },
      data: { verificationStatus: approved ? "VERIFIED" : "PENDING" },
    });
    return NextResponse.json({ approved, number: updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
