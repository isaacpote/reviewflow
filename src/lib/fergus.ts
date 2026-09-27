import type { NormalizedPatient } from "@/lib/cliniko";

const MOCK = process.env.CRM_MOCK !== "false";

export type FergusCredentials = {
  accessToken: string; // Fergus Personal Access Token, from account settings
};

// Mock-only: simulates "another job completed" each time you hit Sync now.
const mockJobCounts = new Map<string, number>();
function nextMockJobCount(externalId: string, startAt: number): number {
  const current = mockJobCounts.get(externalId) ?? startAt - 1;
  const next = current + 1;
  mockJobCounts.set(externalId, next);
  return next;
}

function mockCustomers(): NormalizedPatient[] {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const names: [string, string, number, number][] = [
    ["Dave", "Thompson", 2, 5],
    ["Nicole", "Foster", 1, 1],
    ["Steve", "Kelly", 3, 60], // hasn't had a job in 60 days — ready to demo reactivation
  ];
  return names.map(([firstName, lastName, startAt, lastJobDaysAgo], i) => {
    const externalId = `mock-fergus-${i + 1}`;
    const visitCount = nextMockJobCount(externalId, startAt);
    return {
      externalId,
      firstName,
      lastName,
      phone: `+61${444444444 + i}`,
      email: `${firstName.toLowerCase()}@example.com`,
      visitCount,
      lastVisitAt: daysAgo(lastJobDaysAgo),
      raw: { mock: true, firstName, lastName, visitCount },
    };
  });
}

/**
 * Fergus opened its public API in 2025 (Personal Access Token or OAuth2,
 * OpenAPI 3.1 spec at api.fergus.com/docs) — documentation beyond the raw
 * spec is thin and community coverage is limited as of writing. The base
 * URL, /customers and /jobs paths, and field names below are this app's
 * best-effort reading of the OpenAPI spec, NOT verified against a live
 * Fergus account — confirm against a real trial account before depending
 * on this in production.
 */
export async function fetchFergusCustomers(
  credentials: FergusCredentials
): Promise<NormalizedPatient[]> {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    if (!credentials.accessToken) throw new Error("Personal access token is required.");
    return mockCustomers();
  }

  const headers = {
    Authorization: `Bearer ${credentials.accessToken}`,
    Accept: "application/json",
    "User-Agent": "ReviewFlow (support@reviewflow.app)",
  };

  const results: NormalizedPatient[] = [];
  let url: string | null = "https://api.fergus.com/v1/customers?per_page=100";

  while (url) {
    const res: Response = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 401) throw new Error("Fergus rejected that access token.");
      throw new Error(`Fergus API error: ${res.status}`);
    }
    const data = await res.json();
    const customers = data.data ?? data.customers ?? [];
    for (const c of customers) {
      const { count: visitCount, lastVisitAt } = await fetchFergusJobStats(credentials, c.id, headers);
      results.push({
        externalId: String(c.id),
        firstName: c.first_name,
        lastName: c.last_name,
        phone: c.phone ?? c.mobile,
        email: c.email ?? undefined,
        visitCount,
        lastVisitAt,
        raw: c,
      });
    }
    url = data.next_page_url ?? data.links?.next ?? null;
  }

  return results;
}

/**
 * Counts completed jobs for a customer — one extra API call per customer,
 * same tradeoff as the Cliniko/Nookal visit-count lookups. Endpoint shape
 * not yet verified live; see the caveat above.
 */
async function fetchFergusJobStats(
  credentials: FergusCredentials,
  customerId: string | number,
  headers: Record<string, string>
): Promise<{ count: number; lastVisitAt?: Date }> {
  const url = `https://api.fergus.com/v1/customers/${customerId}/jobs?status=completed&per_page=100`;
  const res = await fetch(url, { headers });
  if (!res.ok) return { count: 0 }; // don't fail the whole sync over one customer's job history
  const data = await res.json();
  const jobs = data.data ?? data.jobs ?? [];
  let lastVisitAt: Date | undefined;
  for (const job of jobs) {
    const completedAt = job.completed_at ? new Date(job.completed_at) : undefined;
    if (completedAt && (!lastVisitAt || completedAt > lastVisitAt)) lastVisitAt = completedAt;
  }
  return { count: jobs.length, lastVisitAt };
}
