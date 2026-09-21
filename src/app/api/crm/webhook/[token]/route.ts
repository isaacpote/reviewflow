import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Generic inbound webhook: point any CRM/automation tool (Zapier, Make, a
// custom script) at this URL with a JSON body. Fields are mapped according
// to the field mapping saved on the connection when it was created.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const connection = await prisma.crmConnection.findUnique({ where: { webhookToken: token } });
  if (!connection) return NextResponse.json({ error: "Unknown webhook" }, { status: 404 });

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!connection.fieldMapping) {
    return NextResponse.json({ error: "This connection has no field mapping configured" }, { status: 400 });
  }

  const mapping = JSON.parse(connection.fieldMapping) as {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  };

  const phoneKey = mapping.phone;
  const phone = phoneKey ? (payload[phoneKey] as string | undefined) : undefined;
  if (!phone) {
    return NextResponse.json(
      { error: `Payload missing mapped phone field "${phoneKey}"` },
      { status: 400 }
    );
  }

  const contact = await prisma.contact.create({
    data: {
      businessId: connection.businessId,
      connectionId: connection.id,
      firstName: mapping.first_name ? (payload[mapping.first_name] as string | undefined) : undefined,
      lastName: mapping.last_name ? (payload[mapping.last_name] as string | undefined) : undefined,
      phone,
      email: mapping.email ? (payload[mapping.email] as string | undefined) : undefined,
      raw: JSON.stringify(payload),
    },
  });

  return NextResponse.json({ contact });
}
