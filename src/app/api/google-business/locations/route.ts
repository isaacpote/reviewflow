import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, ownsBusiness } from "@/lib/auth";
import { listOwnedGoogleLocations } from "@/lib/google-business";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });
  if (!(await ownsBusiness(user.id, businessId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Real mode would exchange a stored OAuth token here; mock mode ignores it.
    const locations = await listOwnedGoogleLocations("mock-token");
    return NextResponse.json({ locations });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
