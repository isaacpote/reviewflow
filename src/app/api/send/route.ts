import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSendingContext, sendReviewRequestToContact, SendPreconditionError } from "@/lib/send";
import { z } from "zod";

const schema = z.object({
  businessId: z.string(),
  contactIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessId, contactIds } = parsed.data;

  let context;
  try {
    context = await getSendingContext(businessId);
  } catch (err) {
    if (err instanceof SendPreconditionError) {
      return NextResponse.json({ error: err.message }, { status: err.message === "Business not found" ? 404 : 400 });
    }
    throw err;
  }
  const { business, template, verifiedNumber } = context;
  if (business.ownerId !== user.id) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const contacts = await prisma.contact.findMany({
    where: {
      businessId,
      status: { in: ["PENDING", "FAILED"] },
      ...(contactIds ? { id: { in: contactIds } } : {}),
    },
  });

  const results = [];
  for (const contact of contacts) {
    results.push(await sendReviewRequestToContact({ business, template, verifiedNumber, contact }));
  }

  return NextResponse.json({ results, sent: results.filter((r) => r.status === "sent").length });
}
