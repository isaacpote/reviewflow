import type { NormalizedPatient } from "@/lib/cliniko";

const MOCK = process.env.CRM_MOCK !== "false";

export type HalaxyCredentials = {
  clientId: string;
  clientSecret: string;
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
    ["Chris", "Ng", 3, 4],
    ["Emma", "Baker", 1, 2],
    ["Noah", "Ali", 5, 50], // hasn't visited in 50 days — ready to demo reactivation
  ];
  return names.map(([firstName, lastName, startAt, lastVisitDaysAgo], i) => {
    const externalId = `mock-halaxy-${i + 1}`;
    const visitCount = nextMockVisitCount(externalId, startAt);
    return {
      externalId,
      firstName,
      lastName,
      phone: `+61${422222222 + i}`,
      email: `${firstName.toLowerCase()}@example.com`,
      visitCount,
      lastVisitAt: daysAgo(lastVisitDaysAgo),
      raw: { mock: true, firstName, lastName, visitCount },
    };
  });
}

/**
 * Halaxy's API is OAuth2 client-credentials — no user-facing consent screen,
 * just a Client ID + Secret exchanged for a short-lived (15 min) bearer token.
 * See https://developers.halaxy.com/docs/authentication.
 */
async function fetchHalaxyAccessToken(credentials: HalaxyCredentials): Promise<string> {
  const res = await fetch("https://au-api.halaxy.com/main/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/fhir+json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  });
  if (!res.ok) throw new Error("Halaxy rejected that Client ID / Secret.");
  const data = await res.json();
  if (!data.access_token) throw new Error("Halaxy didn't return an access token.");
  return data.access_token as string;
}

/**
 * Halaxy's API returns FHIR (HL7) resources, not a Halaxy-specific shape.
 * The Patient resource fields below (name[].family/given, telecom[]) follow
 * the public FHIR spec — verify against a real trial account response
 * before depending on this in production, since Halaxy may nest things
 * differently than the FHIR spec's minimal example.
 */
export async function fetchHalaxyPatients(
  credentials: HalaxyCredentials
): Promise<NormalizedPatient[]> {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error("Client ID and Secret are required.");
    }
    return mockPatients();
  }

  const token = await fetchHalaxyAccessToken(credentials);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/fhir+json",
    "User-Agent": "ReviewFlow (support@reviewflow.app)",
  };

  const results: NormalizedPatient[] = [];
  let url: string | null = "https://au-api.halaxy.com/main/Patient?_count=100";

  while (url) {
    const res: Response = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 401) throw new Error("Halaxy rejected that access token.");
      throw new Error(`Halaxy API error: ${res.status}`);
    }
    const bundle = await res.json();
    for (const entry of bundle.entry ?? []) {
      const p = entry.resource;
      const name = (p.name ?? [])[0];
      const phoneEntry = (p.telecom ?? []).find((t: { system?: string }) => t.system === "phone");
      const emailEntry = (p.telecom ?? []).find((t: { system?: string }) => t.system === "email");
      results.push({
        externalId: String(p.id),
        firstName: (name?.given ?? [])[0],
        lastName: name?.family,
        phone: phoneEntry?.value,
        email: emailEntry?.value,
        // Halaxy's FHIR API doesn't expose a single "visit count" field —
        // this needs a follow-up Appointment search per patient, same
        // pattern as Cliniko/Nookal, once real endpoint shapes are verified.
        visitCount: 0,
        raw: p,
      });
    }
    const next = (bundle.link ?? []).find((l: { relation?: string }) => l.relation === "next");
    url = next?.url ?? null;
  }

  return results;
}
