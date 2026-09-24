import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { isStripeMocked } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  businessId: z.string(),
  sessionId: z.string(),
  outcome: z.enum(["verified", "failed"]),
});

export async function POST(req: NextRequest) {
  if (!isStripeMocked) {
    return NextResponse.json({ error: "Only available in mock mode" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessId, sessionId, outcome } = parsed.data;

  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { kycSessionId: true, name: true },
  });
  if (!business || business.kycSessionId !== sessionId) {
    return NextResponse.json({ error: "Session mismatch" }, { status: 400 });
  }

  await prisma.business.update({
    where: { id: businessId },
    data:
      outcome === "verified"
        ? { kycStatus: "VERIFIED", kycVerifiedName: "Sam Wilson (mock)", kycFailureReason: null }
        : { kycStatus: "FAILED", kycFailureReason: "Document image was blurry (mock failure)." },
  });

  return NextResponse.json({ ok: true });
}
