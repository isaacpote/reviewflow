const MOCK = process.env.CRM_MOCK !== "false";

export type ClinikoCredentials = {
  apiKey: string;
  shard: string; // e.g. "au1", "au4", "uk1", "us1" — the region Cliniko assigned this account
};

export type NormalizedPatient = {
  externalId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  visitCount: number;
  raw: unknown;
};

const CLINIKO_SHARDS = ["au1", "au2", "au3", "au4", "uk1", "us1", "ca1"] as const;

// Mock-only: simulates "another visit happened" each time you hit Sync now,
// so the automation trigger has something real to demo against.
const mockVisitCounts = new Map<string, number>();
function nextMockVisitCount(externalId: string, startAt: number): number {
  const current = mockVisitCounts.get(externalId) ?? startAt - 1;
  const next = current + 1;
  mockVisitCounts.set(externalId, next);
  return next;
}

function mockPatients(): NormalizedPatient[] {
  const names: [string, string, number][] = [
    ["Sam", "Wilson", 3], // one sync away from crossing a 4-visit threshold
    ["Jamie", "Lee", 1],
    ["Priya", "Singh", 4],
    ["Alex", "Chen", 2],
  ];
  return names.map(([firstName, lastName, startAt], i) => {
    const externalId = `mock-cliniko-${i + 1}`;
    const visitCount = nextMockVisitCount(externalId, startAt);
    return {
      externalId,
      firstName,
      lastName,
      phone: `+61${400000000 + i}`,
      email: `${firstName.toLowerCase()}@example.com`,
      visitCount,
      raw: { mock: true, firstName, lastName, visitCount },
    };
  });
}

/**
 * Verifies the API key + shard are valid by fetching the first page of
 * patients. Cliniko requires a descriptive User-Agent identifying the
 * calling app — swap in your real support email before going live.
 *
 * NOTE: field names below (patient_phone_numbers, etc.) are Cliniko's
 * documented shape as of writing — verify against a real trial account
 * response before depending on this in production; API docs do shift.
 */
export async function fetchClinikoPatients(
  credentials: ClinikoCredentials
): Promise<NormalizedPatient[]> {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    if (!credentials.apiKey) throw new Error("API key is required.");
    return mockPatients();
  }

  const auth = Buffer.from(`${credentials.apiKey}:`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "User-Agent": "ReviewFlow (support@reviewflow.app)",
  };

  const results: NormalizedPatient[] = [];
  let url: string | null =
    `https://api.${credentials.shard}.cliniko.com/v1/patients?per_page=100`;

  while (url) {
    const res: Response = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 401) throw new Error("Cliniko rejected that API key.");
      throw new Error(`Cliniko API error: ${res.status}`);
    }
    const data = await res.json();
    for (const p of data.patients ?? []) {
      const phone = (p.patient_phone_numbers ?? [])[0]?.number as string | undefined;
      const visitCount = await fetchClinikoVisitCount(credentials, p.id, headers);
      results.push({
        externalId: String(p.id),
        firstName: p.first_name,
        lastName: p.last_name,
        phone,
        email: p.email ?? undefined,
        visitCount,
        raw: p,
      });
    }
    url = data.links?.next ?? null;
  }

  return results;
}

/**
 * Counts completed (non-cancelled, in the past) appointments for a patient.
 * This is one extra API call per patient — fine for a small clinic's patient
 * list, but worth batching/caching for larger practices before relying on
 * it in production. Field shape (cancelled_at, appointment_start) is
 * Cliniko's documented shape as of writing, not verified live.
 */
async function fetchClinikoVisitCount(
  credentials: ClinikoCredentials,
  patientId: string | number,
  headers: Record<string, string>
): Promise<number> {
  let count = 0;
  let url: string | null =
    `https://api.${credentials.shard}.cliniko.com/v1/patients/${patientId}/appointments?per_page=100`;

  while (url) {
    const res: Response = await fetch(url, { headers });
    if (!res.ok) return count; // don't fail the whole sync over one patient's visit history
    const data = await res.json();
    for (const appt of data.appointments ?? []) {
      const isPast = new Date(appt.appointment_start).getTime() < Date.now();
      if (!appt.cancelled_at && isPast) count += 1;
    }
    url = data.links?.next ?? null;
  }

  return count;
}

export function isValidClinikoShard(shard: string): boolean {
  return (CLINIKO_SHARDS as readonly string[]).includes(shard);
}

export { CLINIKO_SHARDS };
