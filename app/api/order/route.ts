import { NextResponse, type NextRequest } from "next/server";
import { placeOrder, PosError } from "@/lib/pos";
import { clientIp, limited, sameOrigin, verifyTurnstile } from "@/lib/guard";
import { lebaneseMobileNational } from "@/lib/phone";

const fail = (status: number, code: string, message: string) => NextResponse.json({ code, message }, { status });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "origin", "Please order from the Oriano website.");
  const ip = clientIp(req);
  if (limited(`order:${ip}`, 6, 10 * 60_000)) return fail(429, "rate", "Too many orders. Please wait a few minutes or call us.");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail(400, "invalid", "Invalid request.");
  }

  // Bot traps: a hidden field humans never fill, and a minimum time on the form.
  if (body?.website) return fail(400, "invalid", "Invalid request.");
  if (typeof body?.formMs !== "number" || body.formMs < 2500) return fail(400, "too_fast", "Please review your order and try again.");
  if (!(await verifyTurnstile(body?.turnstileToken, ip))) return fail(400, "captcha", "Please complete the security check.");
  if (!lebaneseMobileNational(String(body?.customer?.phone || ""))) {
    return fail(422, "phone", "Please enter a valid Lebanese mobile number (03, 70, 71, 76, 78, 79 or 81).");
  }

  // Forward only the fields the POS expects; it recalculates every price.
  const order = {
    orderType: body.orderType,
    customer: { name: String(body.customer?.name || ""), phone: String(body.customer?.phone || "") },
    address: body.orderType === "delivery" ? body.address : undefined,
    items: Array.isArray(body.items)
      ? body.items.slice(0, 30).map((i: any) => ({
          productId: Number(i.productId),
          sizeId: i.sizeId ? Number(i.sizeId) : undefined,
          quantity: Number(i.quantity),
          addonIds: Array.isArray(i.addonIds) ? i.addonIds.map(Number) : [],
          notes: typeof i.notes === "string" ? i.notes : "",
        }))
      : [],
    notes: typeof body.notes === "string" ? body.notes : "",
  };

  try {
    const result = await placeOrder(order, ip);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof PosError) return fail(e.status, e.code, e.message);
    return fail(500, "server", "Something went wrong. Please try again or call us.");
  }
}
