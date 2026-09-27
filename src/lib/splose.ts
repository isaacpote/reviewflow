import type { NormalizedPatient } from "@/lib/cliniko";

const MOCK = process.env.CRM_MOCK !== "false";

export type SploseCredentials = {
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
    ["Harry", "Potter", 2, 3],
    ["Ginny", "Weasley", 4, 42], // hasn't visited in 42 days — ready to demo reactivation
    ["Luna", "Lovegood", 1, 1],
  ];
  return names.map(([firstName, lastName, startAt, lastVisitDaysAgo], i) => {
    const externalId = `mock-splose-${i + 1}`;
    const visitCount = nextMockVisitCount(externalId, startAt);
    return {
      externalId,
      firstName,
      lastName,
      phone: `+61${433333333 + i}`,
      email: `${firstName.toLowerCase()}@example.com`,
      visitCount,
      lastVisitAt: daysAgo(lastVisitDaysAgo),
      raw: { mock: true, firstName, lastName, visitCount },
    };
  });
}

/**
 * Splose auth + patient shape confirmed against their published API docs
 * (docs.splose.com) as of writing: Bearer API key, GET /v1/patients returns
 * { firstname, lastname, email, phoneNumbers: [{ code, phoneNumber }] }.
 * Splose doesn't expose a visit/appointment count on the patient record
 * itself — this uses a follow-up call per patient, not yet verified live.
 */
export async function fetchSplosePatients(
  credentials: SploseCredentials
): Promise<NormalizedPatient[]> {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    if (!credentials.apiKey) throw new Error("API key is required.");
    return mockPatients();
  }

  const headers = {
    Authorization: `Bearer ${credentials.apiKey}`,
    Accept: "application/json",
    "User-Agent": "ReviewFlow (support@reviewflow.app)",
  };

  const results: NormalizedPatient[] = [];
  let url: string | null = "https://api.splose.com/v1/patients?limit=100";

  while (url) {
    const res: Response = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 401) throw new Error("Splose rejected that API key.");
      throw new Error(`Splose API error: ${res.status}`);
    }
    const data = await res.json();
    const patients = data.data ?? data.results ?? [];
    for (const p of patients) {
      const phoneEntry = (p.phoneNumbers ?? [])[0];
      results.push({
        externalId: String(p.id),
        firstName: p.firstname,
        lastName: p.lastname,
        phone: phoneEntry ? `${phoneEntry.code ?? ""}${phoneEntry.phoneNumber}` : undefined,
        email: p.email ?? undefined,
        // Splose's appointment/visit-count endpoint hasn't been verified
        // against a live account yet — defaulting to 0 until confirmed.
        visitCount: 0,
        raw: p,
      });
    }
    url = data.nextPage ?? null;
  }

  return results;
}
