import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/twilio";
import { renderTemplate, appendOptOutNotice } from "@/lib/template";
import type { Business, Contact, MessageTemplate, PhoneNumber } from "@prisma/client";

export type SendResult = { contactId: string; status: "sent" | "failed"; error?: string };

export class SendPreconditionError extends Error {}

/** Loads the business + confirms it has a template and a verified sending number. */
export async function getSendingContext(businessId: string): Promise<{
  business: Business;
  template: MessageTemplate;
  verifiedNumber: PhoneNumber;
}> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { messageTemplate: true, phoneNumbers: true },
  });
  if (!business) throw new SendPreconditionError("Business not found");
  if (!business.messageTemplate) {
    throw new SendPreconditionError("No message template configured yet");
  }
  const verifiedNumber = business.phoneNumbers.find((n) => n.verificationStatus === "VERIFIED");
  if (!verifiedNumber) {
    throw new SendPreconditionError("No verified sending number configured yet");
  }
  return { business, template: business.messageTemplate, verifiedNumber };
}

/** Sends one review request and logs the result — used by both manual and automated sends. */
export async function sendReviewRequestToContact(params: {
  business: Business;
  template: MessageTemplate;
  verifiedNumber: PhoneNumber;
  contact: Contact;
}): Promise<SendResult> {
  const { business, template, verifiedNumber, contact } = params;

  // Defense in depth: callers already filter to PENDING/FAILED, but never
  // send to someone who has opted out, no matter how this got called.
  if (contact.status === "OPTED_OUT") {
    return { contactId: contact.id, status: "failed", error: "Contact has opted out" };
  }

  const from = verifiedNumber.alphaSenderId || verifiedNumber.phoneNumber;
  const messageBody = appendOptOutNotice(
    renderTemplate(template.body, {
      first_name: contact.firstName,
      last_name: contact.lastName,
      business_name: business.name,
      review_link: business.reviewLink,
    })
  );

  try {
    const { sid, status } = await sendSms({ from, to: contact.phone, body: messageBody });
    await prisma.$transaction([
      prisma.reviewRequest.create({
        data: { businessId: business.id, contactId: contact.id, messageBody, status, twilioSid: sid },
      }),
      prisma.contact.update({ where: { id: contact.id }, data: { status: "SENT" } }),
    ]);
    return { contactId: contact.id, status: "sent" };
  } catch (err) {
    const errorMessage = (err as Error).message;
    await prisma.$transaction([
      prisma.reviewRequest.create({
        data: { businessId: business.id, contactId: contact.id, messageBody, status: "failed", errorMessage },
      }),
      prisma.contact.update({ where: { id: contact.id }, data: { status: "FAILED" } }),
    ]);
    return { contactId: contact.id, status: "failed", error: errorMessage };
  }
}
