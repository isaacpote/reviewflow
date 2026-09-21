import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function ownsBusiness(userId: string, businessId: string): Promise<boolean> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true },
  });
  return business?.ownerId === userId;
}

export async function ownsPhoneNumber(userId: string, phoneNumberId: string): Promise<boolean> {
  const number = await prisma.phoneNumber.findUnique({
    where: { id: phoneNumberId },
    select: { business: { select: { ownerId: true } } },
  });
  return number?.business.ownerId === userId;
}
