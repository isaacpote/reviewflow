import { getStripe, isStripeMocked } from "@/lib/stripe";

export type StartResult = { sessionId: string; url: string };
export type StatusResult = {
  status: "PENDING" | "VERIFIED" | "FAILED";
  verifiedName?: string;
  failureReason?: string;
};

export async function startVerification(params: {
  businessId: string;
  returnUrl: string;
}): Promise<StartResult> {
  if (isStripeMocked) {
    const sessionId = `mock_vs_${Math.random().toString(36).slice(2, 10)}`;
    return {
      sessionId,
      url: `/kyc/mock/${sessionId}?businessId=${params.businessId}&return=${encodeURIComponent(params.returnUrl)}`,
    };
  }

  const stripe = getStripe();
  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    return_url: params.returnUrl,
    metadata: { businessId: params.businessId },
  });
  if (!session.url) throw new Error("Stripe didn't return a verification URL.");
  return { sessionId: session.id, url: session.url };
}

export async function checkVerificationStatus(sessionId: string): Promise<StatusResult> {
  if (isStripeMocked) {
    // Mock sessions resolve via /api/kyc/mock-complete, not by polling here.
    return { status: "PENDING" };
  }

  const stripe = getStripe();
  const session = await stripe.identity.verificationSessions.retrieve(sessionId, {
    expand: ["last_verification_report"],
  });

  if (session.status === "verified") {
    const report =
      typeof session.last_verification_report === "object"
        ? session.last_verification_report
        : null;
    const name = report?.document?.first_name
      ? `${report.document.first_name} ${report.document.last_name ?? ""}`.trim()
      : undefined;
    return { status: "VERIFIED", verifiedName: name };
  }
  // "requires_input" is Stripe's status both for a brand-new session
  // (nothing submitted yet) and for one that failed and needs a retry —
  // the only way to tell them apart is whether last_error is populated.
  if (session.status === "requires_input" && session.last_error) {
    return { status: "FAILED", failureReason: session.last_error.reason ?? undefined };
  }
  return { status: "PENDING" };
}
