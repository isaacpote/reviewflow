import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";

const STOP_KEYWORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);
const START_KEYWORDS = new Set(["start", "unstop", "yes"]);

const TWIML_HEADERS = { "Content-Type": "text/xml" };

function twiml(message?: string) {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, { headers: TWIML_HEADERS });
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

/**
 * Twilio calls this on every inbound SMS to one of your numbers — configure
 * it as the "A message comes in" webhook (Console → Phone Numbers → your
 * number → Messaging) once deployed somewhere Twilio can reach. Handles
 * STOP/START keywords; anything else is just acknowledged and ignored.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  const mock = process.env.TWILIO_MOCK !== "false";
  if (!mock) {
    const signature = req.headers.get("x-twilio-signature") ?? "";
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
    const valid = twilio.validateRequest(authToken, signature, req.url, params);
    if (!valid) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const from = params.From;
  const to = params.To;
  const body = (params.Body ?? "").trim().toLowerCase();

  if (!from || !to) return twiml();

  const number = await prisma.phoneNumber.findFirst({ where: { phoneNumber: to } });
  if (!number) return twiml();

  const contact = await prisma.contact.findFirst({
    where: { businessId: number.businessId, phone: from },
  });
  if (!contact) return twiml();

  if (STOP_KEYWORDS.has(body)) {
    await prisma.contact.update({ where: { id: contact.id }, data: { status: "OPTED_OUT" } });
    return twiml("You've been unsubscribed and won't receive further messages. Reply START to opt back in.");
  }

  if (START_KEYWORDS.has(body) && contact.status === "OPTED_OUT") {
    await prisma.contact.update({ where: { id: contact.id }, data: { status: "PENDING" } });
    return twiml("You're re-subscribed. You may receive messages again.");
  }

  return twiml();
}
