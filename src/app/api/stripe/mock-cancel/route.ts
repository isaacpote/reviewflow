import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { isStripeMocked } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({ businessId: z.string() });

/** Mock-only stand-in for the Stripe Billing Portal's cancel flow. */
export async function POST(req: NextRequest) {
  if (!isStripeMocked) {
    return NextResponse.json({ error: "Not available outside mock mode" }, { status: 400 });
  }

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

  const business = await prisma.business.update({
    where: { id: businessId },
    data: { subscriptionStatus: "canceled" },
  });

  return NextResponse.json({ business });
}
