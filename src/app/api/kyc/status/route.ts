import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { checkVerificationStatus } from "@/lib/kyc";
import { isStripeMocked } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });
  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { kycStatus: true, kycSessionId: true, kycVerifiedName: true, kycFailureReason: true },
  });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mock sessions only resolve via /api/kyc/mock-complete — nothing to poll for.
  if (isStripeMocked || !business.kycSessionId || business.kycStatus !== "PENDING") {
    return NextResponse.json({ business });
  }

  try {
    const result = await checkVerificationStatus(business.kycSessionId);
    if (result.status !== "PENDING") {
      const updated = await prisma.business.update({
        where: { id: businessId },
        data: {
          kycStatus: result.status,
          kycVerifiedName: result.verifiedName,
          kycFailureReason: result.failureReason,
        },
        select: { kycStatus: true, kycSessionId: true, kycVerifiedName: true, kycFailureReason: true },
      });
      return NextResponse.json({ business: updated });
    }
    return NextResponse.json({ business });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
