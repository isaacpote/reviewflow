import { prisma } from "@/lib/prisma";
import { getSendingContext, sendReviewRequestToContact, SendPreconditionError } from "@/lib/send";

/**
 * Checks a business's automation rule against its contacts and fires review
 * requests for anyone who just crossed the threshold. Call this after every
 * CRM sync (visit counts only change on sync). Safe to call even with no
 * rule configured, or no verified sending number yet — it just no-ops.
 */
export async function checkAutomationRules(businessId: string): Promise<{ autoSent: number }> {
  const rule = await prisma.automationRule.findUnique({ where: { businessId } });
  if (!rule || !rule.enabled) return { autoSent: 0 };

  // Only VISIT_COUNT exists today, but the switch keeps room for more triggers.
  if (rule.triggerType !== "VISIT_COUNT") return { autoSent: 0 };

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
  if (due.length === 0) return { autoSent: 0 };

  let context;
  try {
    context = await getSendingContext(businessId);
  } catch (err) {
    if (err instanceof SendPreconditionError) return { autoSent: 0 }; // no template/number yet — nothing to do
    throw err;
  }
  const { business, template, verifiedNumber } = context;

  let autoSent = 0;
  for (const contact of due) {
    const result = await sendReviewRequestToContact({ business, template, verifiedNumber, contact });
    await prisma.contact.update({
      where: { id: contact.id },
      data: { autoSentAtVisitCount: contact.visitCount },
    });
    if (result.status === "sent") autoSent += 1;
  }

  return { autoSent };
}
