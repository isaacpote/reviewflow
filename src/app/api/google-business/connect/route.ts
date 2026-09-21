import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { reviewLinkForPlace } from "@/lib/google-business";
import { z } from "zod";

const schema = z.object({
  businessId: z.string(),
  placeId: z.string().min(1),
  locationName: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessId, placeId, locationName } = parsed.data;

  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      googlePlaceId: placeId,
      googleLocationName: locationName,
      googleConnectedAt: new Date(),
      reviewLink: reviewLinkForPlace(placeId),
    },
  });

  return NextResponse.json({ business });
}

const disconnectSchema = z.object({ businessId: z.string() });

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = disconnectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!(await ownsBusiness(user.id, parsed.data.businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const business = await prisma.business.update({
    where: { id: parsed.data.businessId },
    data: { googlePlaceId: null, googleLocationName: null, googleConnectedAt: null },
  });

  return NextResponse.json({ business });
}
