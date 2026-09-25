import Twilio from "twilio";

const MOCK = process.env.TWILIO_MOCK !== "false";

function fakeSid(prefix: string) {
  const chars = "0123456789abcdef";
  let s = prefix;
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function fakePhoneNumber(country: string, areaCode?: string) {
  const rand = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  if (country === "AU") return `+61${areaCode ?? "4"}${rand(8)}`;
  if (country === "GB") return `+44${areaCode ?? "7"}${rand(9)}`;
  return `+1${areaCode ?? "555"}${rand(7)}`;
}

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error(
      "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set. Set TWILIO_MOCK=true to use mock mode, or provide real credentials."
    );
  }
  return Twilio(sid, token);
}

export type AvailableNumber = {
  phoneNumber: string;
  locality: string;
  region: string;
  country: string;
  monthlyPrice: string;
};

export async function searchAvailableNumbers(
  country: string,
  areaCode?: string
): Promise<AvailableNumber[]> {
  if (MOCK) {
    await delay(400);
    return Array.from({ length: 5 }, () => ({
      phoneNumber: fakePhoneNumber(country, areaCode),
      locality: country === "AU" ? "Sydney" : country === "GB" ? "London" : "New York",
      region: country,
      country,
      monthlyPrice: "1.15",
    }));
  }

  const client = getClient();
  const list =
    country === "AU"
      ? await client.availablePhoneNumbers("AU").local.list({ areaCode: areaCode ? Number(areaCode) : undefined, limit: 10 })
      : country === "GB"
      ? await client.availablePhoneNumbers("GB").local.list({ limit: 10 })
      : await client.availablePhoneNumbers("US").local.list({ areaCode: areaCode ? Number(areaCode) : undefined, limit: 10 });

  return list.map((n) => ({
    phoneNumber: n.phoneNumber,
    locality: n.locality ?? "",
    region: n.region ?? "",
    country,
    monthlyPrice: "1.15",
  }));
}

export async function buyNumber(phoneNumber: string): Promise<{ sid: string; phoneNumber: string }> {
  if (MOCK) {
    await delay(600);
    return { sid: fakeSid("PN"), phoneNumber };
  }
  const client = getClient();
  const purchased = await client.incomingPhoneNumbers.create({ phoneNumber });
  return { sid: purchased.sid, phoneNumber: purchased.phoneNumber };
}

export async function registerAlphaSender(
  alphaSenderId: string
): Promise<{ sid: string; status: "PENDING" | "VERIFIED" }> {
  // Alphanumeric sender IDs are only usable outbound in select countries
  // (not US/CA). This call simulates registering one against a messaging
  // service. In mock mode it's auto-approved.
  if (MOCK) {
    await delay(500);
    return { sid: fakeSid("XE"), status: "VERIFIED" };
  }
  const client = getClient();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!messagingServiceSid) {
    throw new Error("TWILIO_MESSAGING_SERVICE_SID is required to register an alphanumeric sender.");
  }
  const sender = await client.messaging.v1
    .services(messagingServiceSid)
    .alphaSenders.create({ alphaSender: alphaSenderId });
  return { sid: sender.sid, status: "PENDING" };
}

export async function sendSms(params: {
  from: string;
  to: string;
  body: string;
}): Promise<{ sid: string; status: string }> {
  if (MOCK) {
    await delay(300 + Math.random() * 400);
    // Simulate an occasional failure so the UI has something real to show.
    if (Math.random() < 0.05) {
      throw new Error("Mock carrier rejection (simulated failure for realism).");
    }
    return { sid: fakeSid("SM"), status: "sent" };
  }
  const client = getClient();
  const message = await client.messages.create(params);
  return { sid: message.sid, status: message.status };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const isTwilioMocked = MOCK;
