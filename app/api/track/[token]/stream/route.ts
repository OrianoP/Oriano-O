import { NextResponse, type NextRequest } from "next/server";
import { openTrackStream, PosError } from "@/lib/pos";
import { clientIp, limited } from "@/lib/guard";

// Relays the POS's server-sent events for one order to the tracking page.
// The POS ends each stream after ~50 s; the browser's EventSource reconnects.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (limited(`stream:${clientIp(req)}`, 30, 60_000)) return NextResponse.json({ message: "Slow down" }, { status: 429 });
  try {
    const upstream = await openTrackStream(token);
    return new Response(upstream.body, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
    });
  } catch (e) {
    const status = e instanceof PosError ? e.status : 500;
    return NextResponse.json({ message: e instanceof Error ? e.message : "Error" }, { status });
  }
}
