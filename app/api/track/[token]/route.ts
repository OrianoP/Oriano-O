import { NextResponse, type NextRequest } from "next/server";
import { trackOrder, PosError } from "@/lib/pos";
import { clientIp, limited } from "@/lib/guard";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/track/[token]">) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (limited(`track:${clientIp(req)}`, 120, 60_000)) return NextResponse.json({ message: "Slow down" }, { status: 429 });
  try {
    const order = await trackOrder(token);
    return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const status = e instanceof PosError ? e.status : 500;
    return NextResponse.json({ message: e instanceof Error ? e.message : "Error" }, { status });
  }
}
