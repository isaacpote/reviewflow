import { prisma } from "@/lib/prisma";
import {
  getSendingContext,
  sendReviewRequestToContact,
  sendReactivationToContact,
  SendPreconditionError,
} from "@/lib/send";

const DEFAULT_REACTIVATION_MESSAGE =
  "Hey {{first_name}}! It's been a while since we've seen you at {{business_name}} — come back and see us soon.";

/**
 * Checks a business's automation rules against its contacts and fires
 * messages for anyone who just crossed a threshold — review requests on
 * visit count, and reactivation on days-since-last-visit. Call this after
 * every CRM sync. Safe to call even with no rule configured, or no verified
 * sending number yet — it just no-ops.
 */
export async function checkAutomationRules(
  businessId: string
): Promise<{ autoSent: number; reactivationsSent: number }> {
  const rule = await prisma.automationRule.findUnique({ where: { businessId } });
  if (!rule) return { autoSent: 0, reactivationsSent: 0 };

  let context;
  try {
    context = await getSendingContext(businessId);
  } catch (err) {
    if (err instanceof SendPreconditionError) return { autoSent: 0, reactivationsSent: 0 };
    throw err;
  }
  const { business, template, verifiedNumber } = context;

  let autoSent = 0;
  if (rule.enabled) {
    const candidates = await prisma.contact.findMany({
      where: {
        businessId,
        status: { in: ["PENDING", "FAILED"] },
        visitCount: { gte: rule.visitThreshold },
      },
    });
    const due = candidates.filter(
      (c) => c.autoSentAtVisitCount === null || c.autoSentAtVisitCount < rule.visitThreshold
    );
    for (const contact of due) {
      const result = await sendReviewRequestToContact({ business, template, verifiedNumber, contact });
      await prisma.contact.update({
        where: { id: contact.id },
        data: { autoSentAtVisitCount: contact.visitCount },
      });
      if (result.status === "sent") autoSent += 1;
    }
  }

  let reactivationsSent = 0;
  if (rule.reactivationEnabled) {
    const cutoff = new Date(Date.now() - rule.reactivationDays * 24 * 60 * 60 * 1000);
    const candidates = await prisma.contact.findMany({
      where: {
        businessId,
        status: { not: "OPTED_OUT" },
        lastVisitAt: { lte: cutoff },
      },
    });
    // Only fire once per quiet period: skip anyone already reactivated since their last visit.
    const due = candidates.filter(
      (c) => c.autoSentReactivationAt === null || c.autoSentReactivationAt < c.lastVisitAt!
    );
    const messageBody = business.reactivationMessage || DEFAULT_REACTIVATION_MESSAGE;
    for (const contact of due) {
      const result = await sendReactivationToContact({ business, messageBody, verifiedNumber, contact });
      await prisma.contact.update({
        where: { id: contact.id },
        data: { autoSentReactivationAt: new Date() },
      });
      if (result.status === "sent") reactivationsSent += 1;
    }
  }

  return { autoSent, reactivationsSent };
}
