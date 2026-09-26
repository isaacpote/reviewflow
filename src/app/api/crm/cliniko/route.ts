import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { encryptJson } from "@/lib/crypto";
import { syncCrmConnection } from "@/lib/crm-sync";
import { extractClinikoShard } from "@/lib/cliniko";
import { z } from "zod";

const schema = z.object({
  businessId: z.string(),
  name: z.string().min(1),
  apiKey: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const shard = extractClinikoShard(apiKey);

  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const connection = await prisma.crmConnection.create({
    data: {
      businessId,
      type: "CLINIKO",
      name,
      credentialsEncrypted: encryptJson({ apiKey, shard }),
    },
    select: { id: true, type: true, name: true, lastSyncedAt: true, createdAt: true },
  });

  try {
    const result = await syncCrmConnection(connection.id);
    return NextResponse.json({ connection, ...result });
  } catch (err) {
    await prisma.crmConnection.delete({ where: { id: connection.id } });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
