import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { startVerification } from "@/lib/kyc";
import { z } from "zod";

const schema = z.object({ businessId: z.string() });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessId } = parsed.data;

  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const returnUrl = `${req.nextUrl.origin}/biz/${businessId}/number?kyc=return`;

  try {
    const { sessionId, url } = await startVerification({ businessId, returnUrl });
    await prisma.business.update({
      where: { id: businessId },
      data: { kycStatus: "PENDING", kycSessionId: sessionId, kycFailureReason: null },
    });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
