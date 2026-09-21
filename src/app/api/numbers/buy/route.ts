import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buyNumber, registerAlphaSender, isTwilioMocked } from "@/lib/twilio";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  businessId: z.string(),
  phoneNumber: z.string(),
  country: z.string(),
  friendlyName: z.string().min(1),
  alphaSenderId: z
    .string()
    .max(11)
    .regex(/^[A-Za-z0-9 ]*$/, "Alphanumeric sender IDs can only contain letters, numbers, and spaces")
    .optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessId, phoneNumber, country, friendlyName, alphaSenderId } = parsed.data;

  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const purchased = await buyNumber(phoneNumber);

    let alphaSid: string | undefined;
    if (alphaSenderId) {
      const registered = await registerAlphaSender(alphaSenderId);
      alphaSid = registered.sid;
    }

    const number = await prisma.phoneNumber.create({
      data: {
        businessId,
        phoneNumber: purchased.phoneNumber,
        friendlyName,
        alphaSenderId: alphaSenderId || null,
        country,
        twilioSid: purchased.sid,
        isMock: isTwilioMocked,
      },
    });

    return NextResponse.json({ number, alphaSid });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
