import type { NormalizedPatient } from "@/lib/cliniko";

const MOCK = process.env.CRM_MOCK !== "false";

export type NookalCredentials = {
  apiKey: string;
};

// Mock-only: simulates "another visit happened" each time you hit Sync now.
const mockVisitCounts = new Map<string, number>();
function nextMockVisitCount(externalId: string, startAt: number): number {
  const current = mockVisitCounts.get(externalId) ?? startAt - 1;
  const next = current + 1;
  mockVisitCounts.set(externalId, next);
  return next;
}

function mockPatients(): NormalizedPatient[] {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const names: [string, string, number, number][] = [
    ["Taylor", "Brooks", 2, 3],
    ["Morgan", "Diaz", 4, 40], // hasn't visited in 40 days — ready to demo reactivation
    ["Riley", "Nguyen", 1, 1],
  ];
  return names.map(([firstName, lastName, startAt, lastVisitDaysAgo], i) => {
    const externalId = `mock-nookal-${i + 1}`;
    const visitCount = nextMockVisitCount(externalId, startAt);
    return {
      externalId,
      firstName,
      lastName,
      phone: `+61${411111111 + i}`,
      email: `${firstName.toLowerCase()}@example.com`,
      visitCount,
      lastVisitAt: daysAgo(lastVisitDaysAgo),
      raw: { mock: true, firstName, lastName, visitCount },
    };
  });
}

/**
 * NOTE: field names below (mobile_phone, etc.) reflect Nookal's documented
 * v2 API shape as of writing — verify against a real trial account
 * response before depending on this in production.
 *
 * Visit counts come from a second call to getAppointments per patient —
 * one extra request each, same caveat as Cliniko: fine for a small clinic,
 * worth batching for a large one.
 */
export async function fetchNookalPatients(
  credentials: NookalCredentials
): Promise<NormalizedPatient[]> {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    if (!credentials.apiKey) throw new Error("API key is required.");
    return mockPatients();
  }

  const results: NormalizedPatient[] = [];
  let page = 1;
  const pageLength = 200;

  while (true) {
    const url = `https://api.nookal.com/production/v2/getPatients?api_key=${encodeURIComponent(
      credentials.apiKey
    )}&page_length=${pageLength}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Nookal API error: ${res.status}`);
    const data = await res.json();
    if (data.status !== "success") {
      throw new Error(data.message ?? "Nookal rejected that API key.");
    }

    const patients = data.data?.results?.patients ?? [];
    for (const p of patients) {
      const externalId = String(p.ID ?? p.id);
      const { count: visitCount, lastVisitAt } = await fetchNookalVisitStats(credentials, externalId);
      results.push({
        externalId,
        firstName: p.first_name,
        lastName: p.last_name,
        phone: p.mobile_phone || p.home_phone || p.work_phone || undefined,
        email: p.email ?? undefined,
        visitCount,
        lastVisitAt,
        raw: p,
      });
    }

    const totalItems = Number(data.data?.totalItems ?? patients.length);
    if (page * pageLength >= totalItems || patients.length === 0) break;
    page += 1;
  }

  return results;
}

async function fetchNookalVisitStats(
  credentials: NookalCredentials,
  patientId: string
): Promise<{ count: number; lastVisitAt?: Date }> {
  const url = `https://api.nookal.com/production/v2/getAppointments?api_key=${encodeURIComponent(
    credentials.apiKey
  )}&patient_id=${encodeURIComponent(patientId)}&page_length=200`;
  const res = await fetch(url);
  if (!res.ok) return { count: 0 }; // don't fail the whole sync over one patient's visit history
  const data = await res.json();
  const appointments = data.data?.results?.appointments ?? [];
  const now = Date.now();
  const past = appointments.filter((a: { status?: string; appointmentDate?: string }) => {
    const isPast = a.appointmentDate ? new Date(a.appointmentDate).getTime() < now : false;
    return isPast && a.status !== "Cancelled";
  });
  const lastVisitAt = past.reduce((latest: Date | undefined, a: { appointmentDate?: string }) => {
    if (!a.appointmentDate) return latest;
    const d = new Date(a.appointmentDate);
    return !latest || d > latest ? d : latest;
  }, undefined as Date | undefined);
  return { count: past.length, lastVisitAt };
}
