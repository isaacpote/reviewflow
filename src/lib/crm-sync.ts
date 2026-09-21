import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/crypto";
import { fetchClinikoPatients, type ClinikoCredentials } from "@/lib/cliniko";
import { fetchNookalPatients, type NookalCredentials } from "@/lib/nookal";
import type { NormalizedPatient } from "@/lib/cliniko";
import { checkAutomationRules } from "@/lib/automation";

export async function syncCrmConnection(
  connectionId: string
): Promise<{ imported: number; updated: number; skippedNoPhone: number; autoSent: number }> {
  const connection = await prisma.crmConnection.findUnique({ where: { id: connectionId } });
  if (!connection) throw new Error("Connection not found");
  if (!connection.credentialsEncrypted) throw new Error("No credentials stored for this connection");

  let patients: NormalizedPatient[];
  if (connection.type === "CLINIKO") {
    const creds = decryptJson<ClinikoCredentials>(connection.credentialsEncrypted);
    patients = await fetchClinikoPatients(creds);
  } else if (connection.type === "NOOKAL") {
    const creds = decryptJson<NookalCredentials>(connection.credentialsEncrypted);
    patients = await fetchNookalPatients(creds);
  } else {
    throw new Error(`${connection.type} does not support sync`);
  }

  let imported = 0;
  let updated = 0;
  let skippedNoPhone = 0;

  for (const patient of patients) {
    if (!patient.phone) {
      skippedNoPhone += 1;
      continue;
    }

    const existing = await prisma.contact.findFirst({
      where: { connectionId: connection.id, externalId: patient.externalId },
    });

    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone,
          email: patient.email,
          visitCount: patient.visitCount,
          raw: JSON.stringify(patient.raw),
        },
      });
      updated += 1;
    } else {
      await prisma.contact.create({
        data: {
          businessId: connection.businessId,
          connectionId: connection.id,
          externalId: patient.externalId,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone,
          email: patient.email,
          visitCount: patient.visitCount,
          raw: JSON.stringify(patient.raw),
        },
      });
      imported += 1;
    }
  }

  await prisma.crmConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date() },
  });

  const { autoSent } = await checkAutomationRules(connection.businessId);

  return { imported, updated, skippedNoPhone, autoSent };
}
