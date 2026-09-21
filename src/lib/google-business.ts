const MOCK = process.env.GOOGLE_BUSINESS_MOCK !== "false";

export type GoogleLocation = {
  placeId: string;
  name: string;
  address: string;
};

/**
 * Real mode is NOT implemented — Google's Business Profile API requires:
 *  1. A Google Cloud project with OAuth consent screen configured.
 *  2. Applying for Business Profile API access (manual review by Google,
 *     historically weeks, not guaranteed for small/new apps).
 *  3. A full OAuth2 authorization-code flow (redirect, callback route,
 *     refresh-token storage) — not just an API key like Twilio/Cliniko.
 * Until that's set up, GOOGLE_BUSINESS_MOCK must stay true.
 */
export async function listOwnedGoogleLocations(
  accessToken: string
): Promise<GoogleLocation[]> {
  if (!MOCK) {
    throw new Error(
      `Real Google Business Profile access isn't wired up yet (token: ${accessToken.slice(0, 4)}…) — needs an OAuth app + Google's API approval first.`
    );
  }
  await new Promise((r) => setTimeout(r, 500));
  return [
    { placeId: "mock-place-1", name: "Northside Physio — Main St", address: "12 Main St, Sydney NSW" },
    { placeId: "mock-place-2", name: "Northside Physio — City Clinic", address: "88 George St, Sydney NSW" },
  ];
}

export function reviewLinkForPlace(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export const isGoogleBusinessMocked = MOCK;
