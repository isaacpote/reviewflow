import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { getStripe, isStripeMocked } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  businessId: z.string(),
  returnUrl: z.string().url(),
});

/**
 * Starts (or restarts) a business's subscription. In mock mode this skips
 * Stripe entirely and marks the business as trialing directly, same
 * pattern as the mock Twilio/CRM/KYC flows elsewhere in this app.
 */
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

  if (isStripeMocked) {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionStatus: "trialing",
        trialEndsAt,
        stripeCustomerId: business.stripeCustomerId ?? `mock_cus_${businessId}`,
        stripeSubscriptionId: `mock_sub_${businessId}`,
      },
    });
    return NextResponse.json({ mock: true, url: returnUrl });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PRICE_ID is not set — create a subscription Price in Stripe first." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14, metadata: { businessId } },
    payment_method_collection: "always",
    customer: business.stripeCustomerId ?? undefined,
    customer_email: business.stripeCustomerId ? undefined : user.email,
    client_reference_id: businessId,
    metadata: { businessId },
    success_url: `${returnUrl}?billing=success`,
    cancel_url: `${returnUrl}?billing=cancelled`,
  });

  return NextResponse.json({ mock: false, url: session.url });
}
