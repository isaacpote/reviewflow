import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { getStripe, isStripeMocked } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  businessId: z.string(),
  returnUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessId, returnUrl } = parsed.data;

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || !(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!business.stripeCustomerId) {
    return NextResponse.json({ error: "No subscription to manage yet." }, { status: 400 });
  }

  if (isStripeMocked) {
    return NextResponse.json({ mock: true });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: returnUrl,
    });
    return NextResponse.json({ mock: false, url: session.url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
