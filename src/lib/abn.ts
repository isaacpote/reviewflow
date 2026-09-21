const MOCK = process.env.ABN_LOOKUP_MOCK !== "false";

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

/** The ATO's official ABN checksum algorithm — pure math, no API call. */
export function isValidAbnChecksum(abn: string): boolean {
  const digits = abn.replace(/\s/g, "");
  if (!/^\d{11}$/.test(digits)) return false;

  const adjusted = digits.split("").map((d, i) => (i === 0 ? Number(d) - 1 : Number(d)));
  const sum = adjusted.reduce((acc, d, i) => acc + d * WEIGHTS[i], 0);
  return sum % 89 === 0;
}

export type AbnLookupResult = {
  valid: boolean;
  entityName?: string;
  abnStatus?: "Active" | "Cancelled";
  error?: string;
};

/**
 * Looks up an ABN against the free Australian Business Register web
 * service. Needs a free GUID from https://abr.business.gov.au/Tools/WebServices
 * (instant self-serve signup, no cost) — set ABN_LOOKUP_GUID and
 * ABN_LOOKUP_MOCK=false once you have one.
 */
export async function lookupAbn(abnRaw: string): Promise<AbnLookupResult> {
  const abn = abnRaw.replace(/\s/g, "");
  if (!isValidAbnChecksum(abn)) {
    return { valid: false, error: "That doesn't look like a valid ABN (checksum failed)." };
  }

  if (MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { valid: true, entityName: "Mock Business Pty Ltd", abnStatus: "Active" };
  }

  const guid = process.env.ABN_LOOKUP_GUID;
  if (!guid) throw new Error("ABN_LOOKUP_GUID is not set.");

  const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${guid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ABN Lookup error: ${res.status}`);

  const text = await res.text();
  // The ABR service wraps its JSON in a JSONP-style callback(...) even
  // without an explicit callback param — strip it before parsing.
  const match = text.match(/^[^(]*\(([\s\S]*)\)\s*;?\s*$/);
  const json = JSON.parse(match ? match[1] : text);

  if (json.Message) {
    return { valid: false, error: json.Message };
  }

  return {
    valid: true,
    entityName: json.EntityName,
    abnStatus: json.AbnStatus === "0000000000" ? "Cancelled" : json.AbnStatus,
  };
}
