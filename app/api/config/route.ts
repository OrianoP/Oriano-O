import { NextResponse } from "next/server";
import { getConfigFresh, PosError } from "@/lib/pos";

export async function GET() {
  try {
    return NextResponse.json(await getConfigFresh(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Error" }, { status: e instanceof PosError ? e.status : 500 });
  }
}
