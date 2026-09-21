import { NextRequest, NextResponse } from "next/server";
import { searchAvailableNumbers } from "@/lib/twilio";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const country = req.nextUrl.searchParams.get("country") ?? "US";
  const areaCode = req.nextUrl.searchParams.get("areaCode") ?? undefined;
  try {
    const numbers = await searchAvailableNumbers(country, areaCode);
    return NextResponse.json({ numbers });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
