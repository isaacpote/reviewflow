import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      phoneNumbers: { orderBy: { createdAt: "desc" } },
      messageTemplate: true,
      crmConnections: true,
      _count: { select: { contacts: true, reviewRequests: true } },
    },
  });
  if (!business || business.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ business });
}

const patchSchema = z.object({
  reviewLink: z.string().url().optional(),
  name: z.string().min(1).optional(),
  reactivationMessage: z.string().min(1).optional(),
  notifyOnFailure: z.boolean().optional(),
  notifyEmail: z.string().email().or(z.literal("")).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.business.findUnique({ where: { id }, select: { ownerId: true } });
  if (!existing || existing.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const business = await prisma.business.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ business });
}
