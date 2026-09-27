import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeMocked } from "@/lib/stripe";
import { checkVerificationStatus } from "@/lib/kyc";
import type Stripe from "stripe";

/**
 * Stripe calls this on verification session and subscription events —
 * configure it in the Stripe Dashboard (Developers → Webhooks) once
 * deployed, pointing at this route, subscribed to
 * identity.verification_session.*, customer.subscription.*, and
 * invoice.payment_failed events.
 */
export async function POST(req: NextRequest) {
  if (isStripeMocked) {
    return NextResponse.json({ error: "Not used in mock mode — see /api/kyc/mock-complete" }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  if (event.type.startsWith("identity.verification_session.")) {
    const session = event.data.object as Stripe.Identity.VerificationSession;
    const businessId = session.metadata?.businessId;
    if (businessId) {
      const result = await checkVerificationStatus(session.id);
      if (result.status !== "PENDING") {
        await prisma.business.update({
          where: { id: businessId },
          data: {
            kycStatus: result.status,
            kycVerifiedName: result.verifiedName,
            kycFailureReason: result.failureReason,
          },
        });
      }
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const businessId = session.metadata?.businessId ?? session.client_reference_id;
    if (businessId && session.customer && session.subscription) {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          stripeCustomerId: String(session.customer),
          stripeSubscriptionId: String(session.subscription),
        },
      });
    }
  }

  if (event.type.startsWith("customer.subscription.")) {
    const subscription = event.data.object as Stripe.Subscription;
    const businessId = subscription.metadata?.businessId;
    if (businessId) {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          subscriptionStatus: subscription.status,
          trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
