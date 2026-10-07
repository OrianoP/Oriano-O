import { NextResponse } from "next/server";
import { getConfigFresh, PosError, PREVIEW_MODE } from "@/lib/pos";

export const dynamic = "force-dynamic";

/**
 * Owner diagnostics: open /api/status to see why the site says open or closed.
 * Never returns secrets or the POS address.
 */
export async function GET() {
  const now = new Date().toLocaleString("en-GB", { timeZone: "Asia/Beirut", weekday: "short", hour: "2-digit", minute: "2-digit" });
  const base = {
    beirutTime: now,
    posUrlSet: !!process.env.POS_API_URL,
    secretSet: !!process.env.ONLINE_ORDERS_SECRET,
  };
  if (PREVIEW_MODE) {
    return NextResponse.json({
      ...base,
      connected: false,
      acceptingOrders: false,
      why: "Preview mode: POS_API_URL and/or ONLINE_ORDERS_SECRET are missing on this deployment. Add them in Vercel → Settings → Environment Variables, then Redeploy (new variables only apply after a redeploy).",
    });
  }
  try {
    const c = await getConfigFresh();
    const why = c.open
      ? "Connected — the shop is open and taking online orders."
      : c.reason === "paused"
        ? "Connected — online ordering is paused in the POS (Online Orders → tap 'Paused' to resume)."
        : "Connected — the POS says you're outside opening hours (check POS → Online Setup → Opening hours, Beirut time).";
    return NextResponse.json({
      ...base,
      connected: true,
      acceptingOrders: c.open,
      reason: c.reason,
      todayHours: c.openingHours?.[String(new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Beirut" })).getDay())] ?? null,
      deliveryAreas: c.zones.length,
      why,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const code = e instanceof PosError ? e.code : "error";
    const why: Record<string, string> = {
      unauthorized: "The POS rejected the website's signature: ONLINE_ORDERS_SECRET is not identical on Vercel and on the POS.",
      unreachable: "Can't reach the POS at POS_API_URL. Check the address (https://…, no trailing path) and that the POS is running.",
      pos_outdated: "The POS answered but doesn't have the online-ordering API — deploy the updated POS branch (claude/ecstatic-galileo-7d011n).",
      error: e instanceof Error ? e.message : "Unknown error",
    };
    const status = e instanceof PosError ? e.status : 500;
    return NextResponse.json({
      ...base,
      connected: false,
      acceptingOrders: false,
      posStatus: status,
      why: status === 401 ? why.unauthorized : status === 503 && code !== "unreachable" ? "The POS has no ONLINE_ORDERS_SECRET set (it answered 503)." : why[code] ?? why.error,
    }, { headers: { "Cache-Control": "no-store" } });
  }
}
