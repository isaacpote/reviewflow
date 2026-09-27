import { createHmac } from "crypto";
import type { NormalizedPatient } from "@/lib/cliniko";

const MOCK = process.env.CRM_MOCK !== "false";

export type DoshiiCredentials = {
  clientId: string;
  clientSecret: string;
};

// Mock-only: simulates "another order happened" each time you hit Sync now.
const mockOrderCounts = new Map<string, number>();
function nextMockOrderCount(externalId: string, startAt: number): number {
  const current = mockOrderCounts.get(externalId) ?? startAt - 1;
  const next = current + 1;
  mockOrderCounts.set(externalId, next);
  return next;
}

function mockDiners(): NormalizedPatient[] {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const names: [string, string, number, number][] = [
    ["Mia", "Tran", 2, 3],
    ["Leo", "Russo", 1, 1],
    ["Zoe", "Campbell", 4, 35], // hasn't ordered in 35 days — ready to demo reactivation
  ];
  return names.map(([firstName, lastName, startAt, lastVisitDaysAgo], i) => {
    const externalId = `mock-doshii-${i + 1}`;
    const visitCount = nextMockOrderCount(externalId, startAt);
    return {
      externalId,
      firstName,
      lastName,
      phone: `+61${455555555 + i}`,
      email: `${firstName.toLowerCase()}@example.com`,
      visitCount,
      lastVisitAt: daysAgo(lastVisitDaysAgo),
      raw: { mock: true, firstName, lastName, visitCount },
    };
  });
}

function base64url(input: Buffer | string): string {
  return (Buffer.isBuffer(input) ? input : Buffer.from(input))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Doshii's App Partner auth is a hand-rolled JWT: header+payload signed
 * HS256 with the Client Secret, payload = { clientId, timestamp }. Confirmed
 * from Doshii's developer docs (support.doshii.com) — no external JWT
 * library needed, just HMAC-SHA256 over base64url(header).base64url(payload).
 */
function buildDoshiiToken(credentials: DoshiiCredentials): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ clientId: credentials.clientId, timestamp: Math.floor(Date.now() / 1000) })
  );
  const signature = base64url(
    createHmac("sha256", credentials.clientSecret).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

/**
 * IMPORTANT CAVEAT: Doshii is a transaction-routing hub between POS systems
 * and hospitality apps — its documented resources center on orders,
 * locations, and menus, not a customer/diner directory with phone numbers.
 * Whether a given venue's connected POS actually surfaces diner contact
 * details through Doshii (vs. just anonymous order payloads) depends on
 * that specific POS's own loyalty/member features and hasn't been
 * confirmed against a live Partner API account. Treat the endpoint below
 * as a starting point to verify with Doshii's partner support before
 * relying on it — it may need to pull contacts from order `customer`
 * fields instead of a dedicated directory endpoint.
 */
export async function fetchDoshiiDiners(
  credentials: DoshiiCredentials
): Promise<NormalizedPatient[]> {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error("Client ID and Secret are required.");
    }
    return mockDiners();
  }

  const token = buildDoshiiToken(credentials);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "User-Agent": "ReviewFlow (support@reviewflow.app)",
  };

  const res = await fetch("https://api.doshii.io/partner/v3/members", { headers });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Doshii rejected that Client ID / Secret.");
    throw new Error(`Doshii API error: ${res.status}`);
  }
  const data = await res.json();
  const members = data.members ?? data.data ?? [];

  return members.map((m: Record<string, unknown>) => ({
    externalId: String(m.id ?? m.uid),
    firstName: m.firstName as string | undefined,
    lastName: m.lastName as string | undefined,
    phone: m.phone as string | undefined,
    email: m.email as string | undefined,
    visitCount: Number(m.orderCount ?? 0),
    lastVisitAt: m.lastOrderAt ? new Date(m.lastOrderAt as string) : undefined,
    raw: m,
  }));
}
